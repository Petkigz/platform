import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Hold a file from deletion, release a hold, or record that a tombstoned object
 * was deleted from storage.
 *
 * Three actions, one route, because they are three answers to the same question
 * and splitting them into three routes would be three places to forget the guard.
 * The guard itself is in the database: `hold_coursework_file()` and
 * `release_coursework_hold()` take governance staff or the owner,
 * `record_coursework_purge()` takes the owner. This route never sends an actor —
 * every one of those functions reads the session — so the audit trail names who
 * really did it.
 *
 * A "delete" here means "recorded", and the database refuses to record one for a
 * file that is still readable. That refusal is the whole design: a screen that
 * said "deleted" while the bytes were still in the bucket is the failure this
 * queue exists to prevent.
 */
const ACTIONS = new Set(['hold', 'release', 'purge']);

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown = null;
  try {
    raw = await request.json();
  } catch {
    raw = null;
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const action = typeof body.action === 'string' ? body.action : '';
  const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!ACTIONS.has(action)) return fail('Unknown action.', 400);
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return fail('That is not a file reference.', 400);
  if (action !== 'purge' && reason.length < 3) {
    return fail('holding a file back needs a written reason', 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  const { error } = await (action === 'hold'
    ? supabase.rpc('hold_coursework_file', { p_asset_id: assetId, p_reason: reason })
    : action === 'release'
      ? supabase.rpc('release_coursework_hold', { p_asset_id: assetId, p_reason: reason })
      : supabase.rpc('record_coursework_purge', { p_asset_id: assetId }));

  if (error) return fail(error.message, 422);
  return NextResponse.json({ ok: true });
}
