import { NextResponse } from 'next/server';
import { checkScheduler } from '@/lib/cron';
import { isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { runSafeguardingAlert, safeguardingSchedulerStatus } from '@/lib/safeguarding-alert';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const gate = checkScheduler(request.headers.get('authorization'), process.env.CRON_SECRET);
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status, headers });
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) return NextResponse.json({ ok: false, result: 'not_configured' }, { status: 503, headers });
  const service = createAdminClient();
  const outcome = await runSafeguardingAlert({ env: process.env, ports: {
    async claim() {
      const { data, error } = await service.rpc('claim_safeguarding_alert');
      if (error) throw new Error('claim failed');
      return data;
    },
    async owner(id) {
      const { data, error } = await service.auth.admin.getUserById(id);
      if (error) throw new Error('owner lookup failed');
      return data.user ? { id: data.user.id, email: data.user.email ?? null, verified: !!data.user.email_confirmed_at } : null;
    },
    async allowed(lease) {
      const { data, error } = await service.rpc('safeguarding_alert_send_allowed', { p_review_id: lease.reviewId, p_token: lease.token, p_owner: lease.ownerId });
      if (error) throw new Error('pre-send check failed');
      return data === true;
    },
    async settle(lease, outcome, provider, reference) {
      const { data, error } = await service.rpc('settle_safeguarding_alert', { p_review_id: lease.reviewId, p_token: lease.token, p_outcome: outcome, p_provider: provider ?? null, p_reference: reference ?? null });
      if (error) throw new Error('settlement failed');
      return data === true;
    },
  } });
  // The scheduler can hold this shared secret without being the safeguarding
  // owner. Do not reveal whether any concern exists, was sent, or failed.
  if (safeguardingSchedulerStatus(outcome) === 503) {
    // Provider setup is independent of whether a concern exists. The scheduler
    // can alert on this configuration failure without receiving queue details.
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
  return NextResponse.json({ ok: true }, { status: 200, headers });
}
