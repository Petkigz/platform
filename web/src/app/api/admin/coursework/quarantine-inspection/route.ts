import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { readR2Config } from '@/lib/media-r2';
import { inspectQuarantinedObject, parseQuarantineTarget, sameQuarantineTarget } from '@/lib/quarantine-inspection';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { 'cache-control': 'private, no-store' };
const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status, headers });

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return fail('Storage is not configured.', 503);
  const asset = new URL(request.url).searchParams.get('asset')?.trim() ?? '';
  if (!UUID.test(asset)) return fail('Choose a valid quarantined file.', 400);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to review this file.', 401);
  const result = await supabase.rpc('coursework_quarantine_inspection_target', { p_asset_id: asset });
  if (result.error) return fail('This quarantine cannot be inspected by this account.', 403);
  const target = parseQuarantineTarget(result.data, asset);
  if (!target) return fail('This quarantined file is not available for inspection.', 404);
  const config = readR2Config();
  if (!config) return fail('Storage is not configured for this check.', 503);
  const outcome = await inspectQuarantinedObject(target, config);
  // Recheck both authorization and the file record after contacting storage.
  // This cannot prevent a later change to the object or record.
  const checked = await supabase.rpc('coursework_quarantine_inspection_target', { p_asset_id: asset });
  const current = checked.error ? null : parseQuarantineTarget(checked.data, asset);
  if (!current || !sameQuarantineTarget(target, current))
    return fail('The file or permission changed during the check. Refresh and try again.', 409);
  if (!outcome.ok) return fail(outcome.message, outcome.status);
  return NextResponse.json({ ok: true, matches: outcome.matches, declaredBytes: outcome.declaredBytes,
    reportedBytes: outcome.reportedBytes, contentVerified: false, malwareScanned: false }, { headers });
}
