import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatMinor } from '@/lib/currency';
import { describePayoutStatus } from '@/lib/payouts';
import { CancelPayoutButton, PayoutRequestForm, type PayoutCurrency } from './payout-request-form';

export const dynamic = 'force-dynamic';

type Options = {
  payoutsEnabled: boolean;
  holdDays: number;
  taxAcknowledgedAt: string | null;
  currencies: {
    currency: string;
    eligibleMinor: string;
    eligibleEntries: number;
    heldMinor: string;
    heldEntries: number;
    nextEligibleAt: string | null;
    openPayout: { id: string; status: string; amountMinor: string; requestedAt: string } | null;
  }[];
};

type Payout = {
  id: string;
  currency: string;
  amountMinor: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  failureReason: string | null;
  destination: string | null;
  providerReference: string | null;
  itemCount: number | string;
};

function day(value: string | null): string | null {
  return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)) : null;
}

/**
 * Asking to be paid, and seeing what happened to every earlier request.
 *
 * The page exists before the mechanism it drives does. Payouts are off, and it
 * says so in the same place a teacher would look for a button — rather than
 * hiding the area and leaving "how do I get paid?" unanswered.
 */
export default async function TeacherPayoutsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/teach/payouts');

  const [{ data: instructor }, { data: owner }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'instructor' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (instructor !== true && owner !== true) {
    return (
      <div className="page">
        <h1>Payouts</h1>
        <p className="notice warn">
          Only a teacher has payouts. Teaching here is by appointment — ask the platform owner for the
          instructor role.
        </p>
        <p>
          <Link href="/teach">Back to teaching</Link>
        </p>
      </div>
    );
  }

  const [{ data: optionsData, error: optionsError }, { data: payoutsData, error: payoutsError }] =
    await Promise.all([
      supabase.rpc('my_payout_options'),
      supabase.rpc('my_payouts', { p_limit: 20 }),
    ]);
  if (optionsError) throw new Error(optionsError.message);
  if (payoutsError) throw new Error(payoutsError.message);

  const options = optionsData as Options | null;
  const payouts = (payoutsData ?? []) as Payout[];

  const currencies: PayoutCurrency[] = (options?.currencies ?? []).map((c) => ({
    currency: c.currency,
    eligibleLabel: formatMinor(c.eligibleMinor, c.currency),
    eligibleEntries: Number(c.eligibleEntries),
    heldLabel: formatMinor(c.heldMinor, c.currency),
    heldEntries: Number(c.heldEntries),
    nextEligibleLabel: day(c.nextEligibleAt),
    openPayoutLabel: c.openPayout
      ? `${formatMinor(c.openPayout.amountMinor, c.currency)} requested ${day(c.openPayout.requestedAt) ?? ''}`
      : null,
  }));

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/teach">Teaching</Link>
        <span aria-hidden>›</span>
        <span>Payouts</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Teaching</p>
        <h1>Getting paid</h1>
        <p className="muted">
          Ask for the money your courses have earned, and see what happened to every earlier request. Earnings
          wait {options?.holdDays ?? 14} day(s) before they can be requested so a refund can land first. What is
          paid is whatever the ledger owes on the day it is sent, not the estimate on the request.
        </p>
      </div>

      {!options?.payoutsEnabled && (
        <div className="notice warn" style={{ marginBottom: '1.5rem' }}>
          <strong>No money has ever been sent from this platform, and this page cannot send any.</strong>{' '}
          The request, the queue and the hold period work; the payout provider, per-teacher destination details
          and a tax treatment per country do not exist yet. When they do, the owner switches payouts on and this
          form becomes live.
        </div>
      )}

      {currencies.length === 0 ? (
        <p className="empty">
          No earnings recorded yet. <Link href="/teach/earnings">See what you have earned</Link> once a sale is
          confirmed.
        </p>
      ) : (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="outline-h" style={{ marginTop: 0 }}>
            <h3>What is payable</h3>
          </div>
          <ul className="lessons">
            {currencies.map((c) => (
              <li key={c.currency}>
                <strong>
                  {c.currency}: {c.eligibleLabel}
                </strong>
                <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                  {c.eligibleEntries > 0 ? `${c.eligibleEntries} earning(s) out of hold` : 'Nothing out of hold yet'}
                  {c.heldEntries > 0 && (
                    <>
                      {' · '}
                      {c.heldLabel} from {c.heldEntries} earning(s) still inside the refund hold
                      {c.nextEligibleLabel ? ` (next ${c.nextEligibleLabel})` : ''}
                    </>
                  )}
                  {c.openPayoutLabel && <> · {c.openPayoutLabel}</>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PayoutRequestForm
        currencies={currencies}
        enabled={options?.payoutsEnabled === true}
        holdDays={Number(options?.holdDays ?? 14)}
      />

      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>Your requests</h3>
      </div>
      {payouts.length === 0 ? (
        <p className="empty">No payout has been requested yet.</p>
      ) : (
        <div className="card">
          <ul className="lessons">
            {payouts.map((p) => {
              const amount = formatMinor(p.amountMinor, p.currency);
              const when = day(p.requestedAt);
              return (
                <li key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <span>
                      <strong>{amount}</strong>
                      <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                        Requested {when ?? '—'}
                        {p.destination ? ` · to ${p.destination}` : ''}
                        {p.itemCount ? ` · ${p.itemCount} earning(s)` : ''}
                      </span>
                      {p.providerReference && (
                        <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                          Sent under reference {p.providerReference}
                          {p.completedAt ? ` on ${day(p.completedAt)}` : ''}
                        </span>
                      )}
                      {p.failureReason && (
                        <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                          {p.failureReason}
                        </span>
                      )}
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <span
                        className={`badge ${p.status === 'completed' ? '' : p.status === 'failed' ? 'warn' : 'neutral'}`}
                      >
                        {describePayoutStatus(p.status)}
                      </span>
                      {p.status === 'scheduled' && (
                        <span style={{ display: 'block', marginTop: '0.4rem' }}>
                          <CancelPayoutButton payoutId={p.id} />
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="muted" style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
        The figures here are recorded earnings. <Link href="/teach/earnings">The earnings statement</Link> shows
        the sales behind them; <Link href="/admin/payouts">finance</Link> works the queue.
      </p>
    </div>
  );
}
