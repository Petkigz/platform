import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { quarantineMediaAsset, withdrawMediaAsset } from '@/lib/media';

export const dynamic = 'force-dynamic';

type Payload = {
  action?: unknown;
  assetId?: unknown;
  reason?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, status: number) =>
  NextResponse.json({ ok: false, error: message }, { status });

/**
 * Holding and withdrawing an uploaded master.
 *
 * These are the two powers a rights complaint or a safeguarding report about a
 * file needs, and until this route existed they were SQL functions with no way
 * to reach them: `quarantine_media_upload()` and `delete_media_asset()` were
 * built and tested and nothing called them.
 *
 * Both are staff-only in the database as well as here. Checking only in the
 * route would mean one forgotten import away from anybody calling the function.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Storage is not configured on this deployment.', 503);

  const body = (await request.json().catch(() => null)) as Payload | null;
  const action = body?.action;
  if (action !== 'quarantine' && action !== 'withdraw') {
    return fail('Unknown moderation action.', 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) return fail('Only platform staff can moderate uploads.', 403);

  const assetId = typeof body?.assetId === 'string' ? body.assetId.trim() : '';
  if (!UUID.test(assetId)) return fail('That is not an upload.', 400);

  const reason = typeof body?.reason === 'string' ? body.reason : '';
  const result =
    action === 'quarantine'
      ? await quarantineMediaAsset(supabase, assetId, reason)
      : await withdrawMediaAsset(supabase, assetId, reason);

  if (!result.ok) {
    const status = /Only platform staff/.test(result.message) ? 403
      : /gone|already/.test(result.message) ? 409
      : 400;
    return fail(result.message, status);
  }

  return NextResponse.json({ ok: true, data: { assetId, action } }, { status: 200 });
}
