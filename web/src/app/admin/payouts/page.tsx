import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatMinor } from '@/lib/currency';
import { describePayoutStatus } from '@/lib/payouts';
import { PayoutPolicyForm, PayoutQueue, type QueueRow } from './payout-queue';

export const dynamic = 'force-dynamic';

type Queue = {
  payoutsEnabled: boolean;
  holdDays: number;
  payouts: {
    id: string;
    teacherName: string | null;
    currency: string;
    amountMinor: string;
    eligibleNowMinor: string;
    status: string;
    requestedAt: string;
    destination: string | null;
    provider: string | null;
    providerReference: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    failureReason: string | null;
  }[];
};

function day(value: string | null): string | null {
  return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)) : null;
}

/**
 * Finance's payout queue, and the one policy number that decides when a
 * teacher may ask.
 *
 * The page states what is missing rather than implying a working rail: payouts
 * are recorded here, not sent. Completing one is the only thing that marks an
 * earning paid, so it demands a provider reference.
 */
export default async function AdminPayoutsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/payouts');

  const [{ data: finance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (finance !== true && platform !== true) redirect('/admin');

  const { data, error } = await supabase.rpc('instructor_payout_queue', { p_limit: 100 });
  if (error) throw new Error(error.message);
  const queue = data as Queue | null;

  const rows: QueueRow[] = (queue?.payouts ?? []).map((p) => {
    const stale =
      (p.status === 'scheduled' || p.status === 'processing') &&
      Number(p.eligibleNowMinor) < Number(p.amountMinor);
    return {
      id: p.id,
      teacherName: p.teacherName,
      currency: p.currency,
      amountLabel: formatMinor(p.amountMinor, p.currency),
      eligibleNowLabel: formatMinor(p.eligibleNowMinor, p.currency),
      stale,
      status: p.status,
      statusLabel: describePayoutStatus(p.status),
      requestedLabel: day(p.requestedAt),
      destination: p.destination,
      providerReference: p.providerReference,
      failureReason: p.failureReason,
    };
  });

  const waiting = rows.filter((r) => r.status === 'scheduled' || r.status === 'processing').length;

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Teacher payouts</h1>
      <p className="lede">
        What teachers have asked to be paid and what the ledger owes them today. Recording a payout marks the
        earnings paid and stores the provider reference — nothing here sends money, and no provider is connected.
      </p>

      {!queue?.payoutsEnabled && (
        <div className="notice warn">
          <strong>Payouts are switched off, so no teacher can request one.</strong> This queue still works: when
          a provider, destination details and a tax treatment exist, the owner enables the flag and requests
          start arriving here.
        </div>
      )}

      <div className="stats" style={{ marginBottom: '1.25rem' }}>
        <div>
          <span className="n">{waiting}</span>
          <span className="l">Waiting</span>
        </div>
        <div>
          <span className="n">{queue?.holdDays ?? 14}</span>
          <span className="l">Day refund hold</span>
        </div>
      </div>

      <PayoutQueue rows={rows} />

      <div style={{ marginTop: '1.75rem' }}>
        <PayoutPolicyForm holdDays={Number(queue?.holdDays ?? 14)} />
      </div>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin/money-report">Money report</Link>
        {' · '}
        <Link href="/admin/refunds">Refunds</Link>
        {' · '}
        <Link href="/admin">Back to administration</Link>
      </p>
    </div>
  );
}
