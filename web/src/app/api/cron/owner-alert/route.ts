import { NextResponse } from 'next/server';
import { checkScheduler } from '@/lib/cron';
import { isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { ownerAlertSchedulerStatus, runOwnerAlert } from '@/lib/owner-alert';
import { siteOrigin } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * One run of the owner's email alert: at most one email.
 *
 * Called by a scheduler with the shared secret. The scheduler is not the
 * owner, so the answer says only whether email is set up: never whether an
 * alert existed, went or failed.
 */
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const gate = checkScheduler(request.headers.get('authorization'), process.env.CRON_SECRET);
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status, headers });
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, result: 'not_configured' }, { status: 503, headers });
  }
  const service = createAdminClient();
  const outcome = await runOwnerAlert({
    env: process.env,
    origin: siteOrigin(),
    ports: {
      async claim() {
        const { data, error } = await service.rpc('claim_owner_alert');
        if (error) throw new Error('claim failed');
        return data;
      },
      async owner(id) {
        const { data, error } = await service.auth.admin.getUserById(id);
        if (error) throw new Error('owner lookup failed');
        return data.user ? { id: data.user.id, email: data.user.email ?? null, verified: !!data.user.email_confirmed_at } : null;
      },
      async allowed(lease) {
        const { data, error } = await service.rpc('owner_alert_send_allowed', { p_alert: lease.alertId, p_token: lease.token, p_owner: lease.ownerId });
        if (error) throw new Error('pre-send check failed');
        return data === true;
      },
      async settle(lease, result, provider, reference) {
        const { data, error } = await service.rpc('settle_owner_alert', {
          p_alert: lease.alertId, p_token: lease.token, p_outcome: result, p_provider: provider ?? null, p_reference: reference ?? null,
        });
        if (error) throw new Error('settlement failed');
        return data === true;
      },
    },
  });
  if (ownerAlertSchedulerStatus(outcome) === 503) return NextResponse.json({ ok: false }, { status: 503, headers });
  return NextResponse.json({ ok: true }, { status: 200, headers });
}
