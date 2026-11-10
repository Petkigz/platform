import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { privateNoStore } from '@/lib/private-response';

export const dynamic = 'force-dynamic';

/** The database restricts these actions to the configured safeguarding owner.
 * Recording storage deletion is an owner's statement, not verification: this
 * route does not contact storage. A tombstone alone does not prove deletion. */
const ACTIONS = new Set(['hold', 'release', 'purge']);

const privateJson = (body: unknown, init?: ResponseInit) => privateNoStore(NextResponse.json(body, init));
function fail(message: string, status = 400) {
  return privateJson({ ok: false, error: message }, { status });
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

  const { data, error } = await (action === 'hold'
    ? supabase.rpc('hold_coursework_file', { p_asset_id: assetId, p_reason: reason })
    : action === 'release'
      ? supabase.rpc('release_coursework_hold', { p_asset_id: assetId, p_reason: reason })
      : supabase.rpc('record_coursework_purge', { p_asset_id: assetId }));

  if (error) return fail(error.message, 422);
  if (action === 'purge' && data !== true) return fail('A deletion statement was already recorded.', 409);
  return privateJson({ ok: true });
}
