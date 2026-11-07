import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { readR2Config } from '@/lib/media-r2';
import { inspectQuarantinedObject, type QuarantineInspectionTarget } from '@/lib/quarantine-inspection';
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
  const rows = result.data as QuarantineInspectionTarget[] | null;
  if (!Array.isArray(rows) || rows.length !== 1) return fail('This quarantined file is not available for inspection.', 404);
  const target = rows[0];
  if (!target) return fail('This quarantined file is not available for inspection.', 404);
  const config = readR2Config();
  if (!config) return fail('Storage is not configured for this check.', 503);
  const outcome = await inspectQuarantinedObject(target, config);
  // The owner could have been removed while storage was being contacted.
  const owner = await supabase.rpc('safeguarding_owner_status');
  if (owner.error || owner.data?.is_owner !== true) return fail('This quarantine cannot be inspected by this account.', 403);
  if (!outcome.ok) return fail(outcome.message, outcome.status);
  return NextResponse.json({ ok: true, matches: outcome.matches, declaredBytes: outcome.declaredBytes,
    reportedBytes: outcome.reportedBytes, contentVerified: false, malwareScanned: false }, { headers });
}
