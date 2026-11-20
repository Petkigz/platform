import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDateTime } from '@/lib/i18n';
import { ZAKAT_HONESTY, parseOverview } from '@/lib/sponsorship';
import {
  PLEDGE_SINCE_WORDS,
  UNAPPLIED_ACTION,
  describeUnapplied,
  parseUnapplied,
  pledgeSince,
} from '@/lib/sponsorship-unapplied';
import { SponsorshipDesk } from './sponsorship-desk';

export const dynamic = 'force-dynamic';

/**
 * The sponsorship desk: decide a request, record money that arrived.
 *
 * Gated on exactly the pair the database enforces — platform or finance — so a
 * support agent is turned away here rather than shown buttons that would fail.
 * The same `can_decide_sponsorship()` gates every writer behind this page.
 *
 * The page's most important sentence is the one about what it is not: a
 * seat recorded here is not a sale, so nothing on this page creates an
 * order, charges tax, or accrues a teacher earning.
 *
 * **Money that arrived and bought no seat is shown first.** A sponsor can pay
 * a pledge at checkout, and a payment can be confirmed for a pledge that can
 * no longer be honoured. The database records that in the audit trail and
 * grants nothing. This page reads those lines (staff may read them; a
 * sponsor and a learner may not) and says, for each, why and what there is to
 * do. It cannot tell whether an order has since been refunded, and says so.
 */
export default async function AdminSponsorshipsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/sponsorships');

  // The same pair the database checks in `can_decide_sponsorship()`: the owner
  // or finance. A support agent is sent back to the dashboard rather than shown
  // a screen whose buttons would each fail.
  const [{ data: finance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (finance !== true && platform !== true) redirect('/admin');

  const { data, error } = await supabase.rpc('sponsorship_overview');
  const overview = parseOverview(data);

  // Payments confirmed for a pledge that could no longer be honoured. Newest
  // first; fifty is far more than there should ever be.
  const late = await supabase
    .from('governance_audit_events')
    .select('target_id, detail, occurred_at')
    .eq('action', UNAPPLIED_ACTION)
    .eq('target_type', 'sponsorship')
    .order('occurred_at', { ascending: false })
    .limit(50);
  const unapplied = late.error ? null : parseUnapplied(late.data);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Sponsored seats</h1>
      <p className="lede">
        A learner asks, you decide, a sponsor covers the course. The sponsor never learns who they
        helped and the learner never learns who paid.
      </p>

      {error && (
        <div className="notice error">
          The desk could not be read: {error.message}
        </div>
      )}

      {overview && (
        <>
          <div className="notice" style={{ marginTop: '1rem' }}>
            <strong>
              {overview.enabled
                ? 'Open for requests and sponsorships.'
                : 'Closed: nobody can ask and no seat can be pledged.'}
            </strong>{' '}
            The switch is `commerce.sponsorship` on <Link href="/admin">the dashboard</Link>.
            Turning it off stops new requests; it does not take away a seat somebody already paid
            for.
          </div>

          <div className="stats" style={{ marginTop: '1.25rem' }}>
            <div>
              <div className="n">{overview.counts.waiting}</div>
              <div className="l">waiting for a decision</div>
            </div>
            <div>
              <div className="n">{overview.counts.approved}</div>
              <div className="l">approved, no sponsor yet</div>
            </div>
            <div>
              <div className="n">{overview.counts.funded}</div>
              <div className="l">seats covered</div>
            </div>
            <div>
              <div className="n">{overview.counts.pledged}</div>
              <div className="l">pledged, money not recorded</div>
            </div>
            <div>
              <div className="n">{overview.counts.paid}</div>
              <div className="l">paid</div>
            </div>
            <div>
              <div className="n">{overview.counts.declined}</div>
              <div className="l">declined</div>
            </div>
          </div>

          {unapplied === null && (
            <div className="notice error" role="alert" style={{ marginTop: '1.25rem' }}>
              Payments that arrived and opened no seat could not be read just now. That is not the
              same as there being none: reload before relying on this page.
            </div>
          )}

          {unapplied !== null && unapplied.length > 0 && (
            <section className="card" style={{ marginTop: '1.25rem' }} data-unapplied={unapplied.length}>
              <h2 style={{ marginTop: 0 }}>Money that arrived and opened no seat</h2>
              <p className="muted">
                A sponsor paid at checkout and the pledge could not be honoured when the payment
                was confirmed. The order is paid and nothing was granted. Each of these is
                somebody’s money, held for a seat that did not open.
              </p>
              <ul className="lessons stacked">
                {unapplied.map((payment, index) => {
                  const said = describeUnapplied(payment.reason);
                  const since = pledgeSince(payment, overview.seats);
                  const seat = overview.seats.find((s) => s.id.toLowerCase() === payment.sponsorshipId);
                  return (
                    <li key={`${payment.sponsorshipId}-${index}`} data-reason={payment.reason}>
                      <strong>
                        {payment.amount ? <bdi dir="ltr">{payment.amount}</bdi> : 'An amount this page cannot read'}
                        {seat?.seatCode ? (
                          <>
                            {' · seat '}
                            <bdi dir="ltr">{seat.seatCode}</bdi>
                          </>
                        ) : null}
                      </strong>
                      <p style={{ margin: '0.25rem 0 0' }}>{said.why}</p>
                      <p style={{ margin: '0.25rem 0 0' }}>{said.next}</p>
                      <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                        {PLEDGE_SINCE_WORDS[since]}
                      </p>
                      <p className="meta" style={{ margin: '0.25rem 0 0', overflowWrap: 'anywhere' }}>
                        {payment.at ? `Confirmed ${formatDateTime('en', payment.at, 'UTC')}. ` : ''}
                        {payment.orderId ? (
                          <>
                            Order <bdi dir="ltr">{payment.orderId}</bdi>.
                          </>
                        ) : (
                          'The record names no order.'
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <p className="muted" style={{ marginBottom: 0 }}>
                This page cannot tell whether an order has since been refunded: it reads the audit
                trail and the open pledges, and neither says. Look the order up under{' '}
                <Link href="/admin/orders">Orders</Link> before refunding, so nobody is refunded
                twice. A line stays here after it has been dealt with.
              </p>
            </section>
          )}

          <SponsorshipDesk overview={overview} />

          <div className="notice" style={{ marginTop: '1.5rem' }}>
            A seat recorded here by hand creates <strong>no order</strong> and charges{' '}
            <strong>no tax</strong>. A pledge paid at checkout has an order, for exactly the amount
            pledged and nothing added. Neither accrues a <strong>teacher earning</strong>: nobody
            sold anything. The grant is recorded with source <code>scholarship</code> so a revenue
            report cannot mistake it for a sale.
          </div>

          <p className="muted">{ZAKAT_HONESTY}</p>
        </>
      )}

      {!overview && !error && (
        <div className="notice warn">
          The desk came back unreadable. Nothing has changed — this page only reads until you press
          a button.
        </div>
      )}
    </div>
  );
}
