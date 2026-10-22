import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatMinor } from '@/lib/currency';
import { describePayoutStatus } from '@/lib/payouts';
import { PayoutPolicyForm, PayoutQueue, type QueueRow } from './payout-queue';

export const dynamic = 'force-dynamic';

type Liability = {
  asOf: string;
  holdDays: number;
  payoutsEnabled: boolean;
  reportingCurrency: string;
  byCurrency: {
    currency: string;
    owedMinor: string;
    inHoldMinor: string;
    payableNowMinor: string;
    requestedMinor: string;
    openRequests: number | string;
    paidMinor: string;
    reversedMinor: string;
    teachers: number | string;
    reportingAmountMinor: string | null;
  }[];
  convertedTotalMinor: string | null;
  unconverted: string[];
};

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

  const [{ data, error }, { data: liabilityData }] = await Promise.all([
    supabase.rpc('instructor_payout_queue', { p_limit: 100 }),
    supabase.rpc('platform_teacher_liability'),
  ]);
  if (error) throw new Error(error.message);
  const queue = data as Queue | null;
  const liability = (liabilityData ?? null) as Liability | null;

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

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3>Owed to teachers right now</h3>
          {liability?.convertedTotalMinor && (
            <span className="badge">
              ≈ {formatMinor(liability.convertedTotalMinor, liability.reportingCurrency)}
            </span>
          )}
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          A balance, not a window of movement: what has accrued and not been reversed or paid, and how much of
          it is still inside the refund hold. A request is shown beside the balance because it is the same money
          seen from the other side — asking does not change what is owed.
        </p>
        {(liability?.byCurrency ?? []).length === 0 ? (
          <p className="empty">Nothing is owed to any teacher.</p>
        ) : (
          <ul className="lessons">
            {(liability?.byCurrency ?? []).map((c) => (
              <li key={c.currency}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span>
                    <strong>
                      {c.currency}: {formatMinor(c.owedMinor, c.currency)} owed
                    </strong>
                    <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                      {formatMinor(c.payableNowMinor, c.currency)} payable now ·{' '}
                      {formatMinor(c.inHoldMinor, c.currency)} inside the refund hold ·{' '}
                      {String(c.teachers)} teacher(s)
                    </span>
                    <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                      {Number(c.requestedMinor) > 0
                        ? `${formatMinor(c.requestedMinor, c.currency)} requested, not yet sent`
                        : 'no open request'}
                      {Number(c.paidMinor) > 0 && (
                        <> · {formatMinor(c.paidMinor, c.currency)} paid to date</>
                      )}
                      {Number(c.reversedMinor) > 0 && (
                        <> · {formatMinor(c.reversedMinor, c.currency)} reversed</>
                      )}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {liability && liability.unconverted.length > 0 && (
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
            No total is shown: {liability.unconverted.join(', ')} have no recorded rate into{' '}
            {liability.reportingCurrency}. <Link href="/admin/exchange-rates">Record a rate</Link> and the total
            appears; adding the rest anyway would be a number with a currency it does not have.
          </p>
        )}
        {liability && liability.unconverted.length === 0 && liability.convertedTotalMinor !== null && (
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
            Converted at the rates recorded on {day(liability.asOf) ?? 'the report date'}; each rate is kept with
            its source and observation time.
          </p>
        )}
      </div>

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
