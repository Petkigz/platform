import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatMinor, validateWindowInput } from '@/lib/currency';
import {
  courseLabel,
  currenciesIn,
  describePeriod,
  forCurrency,
  isEmptyPeriod,
  parseRevenueReport,
  revenueReconciliation,
  type RevenueReport,
} from '@/lib/revenue';

export const dynamic = 'force-dynamic';

/**
 * What sold, to whom, and how much of it came back.
 *
 * Three things this page does not do, each of which is a decision:
 *
 * **It does not add currencies together.** A course can sell in shillings and in
 * dollars in the same month. There is a figure for each and no total, because a
 * total across them would be an exchange rate nobody recorded. The money report
 * is the screen that converts, at a rate the owner entered, and this page links
 * to it rather than quietly doing the same job twice.
 *
 * **It does not net a refund into a sale.** Gross, refunded and net sit side by
 * side as three columns. A refund is a thing that happened to a customer's money
 * and the report keeps it visible; a single net figure is how a platform finds
 * out a year later that it has been refunding more than it sells.
 *
 * **It does not recompute what a teacher earned.** That figure comes from the
 * accrual, where the revenue share was snapshotted on the day of the sale. The
 * same sale read at today's rate is a different number, and the platform's own
 * record is the one that will be paid out.
 *
 * Gated on `finance_admin` or `platform_admin`, the same pair as every money
 * screen. A teacher's view of their own work is `/teach/earnings`.
 */

function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Outcome =
  | { ok: true; report: RevenueReport }
  | { ok: false; reason: 'forbidden' }
  | { ok: false; reason: 'failed'; message: string };

async function readReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string,
): Promise<Outcome> {
  // The window the person picked is inclusive of its last day; the function
  // compares against instants, so the end is the last instant of that day. The
  // start stays at midnight, which is what makes the two ends symmetrical.
  const { data, error } = await supabase.rpc('revenue_breakdown', {
    p_from: `${from}T00:00:00.000Z`,
    p_to: `${to}T23:59:59.999Z`,
  });

  if (error) {
    if (/finance admin or platform admin/i.test(error.message)) {
      return { ok: false, reason: 'forbidden' };
    }
    return { ok: false, reason: 'failed', message: error.message };
  }

  const report = parseRevenueReport(data);
  if (!report) {
    return {
      ok: false,
      reason: 'failed',
      message: 'The report came back in a shape this page does not know how to read.',
    };
  }
  return { ok: true, report };
}

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/revenue');

  const [{ data: finance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (finance !== true && platform !== true) redirect('/admin');

  const params = await searchParams;
  const fromDate = params.from?.trim() || monthStart();
  const toDate = params.to?.trim() || today();

  const window = validateWindowInput({ from: fromDate, to: toDate });
  const outcome = window.ok ? await readReport(supabase, fromDate, toDate) : null;

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
        {' · '}
        <Link href="/admin/money-report">Money report</Link>
      </p>
      <h1>Revenue analytics</h1>
      <p className="lede">
        What sold in a period — by currency, by course, by plan and by teacher —
        with what was refunded shown beside it rather than subtracted out of sight.
        Every figure is the currency it was paid in; nothing here is converted, and
        no two currencies are added.
      </p>

      <div className="card" style={{ padding: '1.25rem' }}>
        <form method="get" action="/admin/revenue" className="row"
              style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label>
            From
            <input name="from" type="date" defaultValue={fromDate} required />
          </label>
          <label>
            To (included)
            <input name="to" type="date" defaultValue={toDate} required />
          </label>
          <button className="btn" type="submit">Show the period</button>
        </form>
      </div>

      {!window.ok && (
        <div className="notice error" style={{ marginTop: '1.5rem' }} role="alert">
          {window.message}
        </div>
      )}

      {window.ok && outcome && !outcome.ok && outcome.reason === 'failed' && (
        <div className="notice error" style={{ marginTop: '1.5rem' }} role="alert">
          The report could not be read: {outcome.message}
        </div>
      )}

      {window.ok && outcome?.ok && <Report report={outcome.report} />}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        Reading a total across currencies, at a rate somebody recorded, is the{' '}
        <Link href="/admin/money-report">money report</Link>. What one teacher is owed
        is on <Link href="/teach/earnings">their own earnings page</Link>, which reads
        the same accrual this report does.
      </p>
    </div>
  );
}

function Report({ report }: { report: RevenueReport }) {
  const issues = revenueReconciliation(report);
  const currencies = currenciesIn(report);

  return (
    <>
      <div className="stats">
        <div>
          <div className="n">{report.orders}</div>
          <div className="l">Paid orders in the period</div>
        </div>
        <div>
          <div className="n">{report.households}</div>
          <div className="l">Households behind them</div>
        </div>
        <div>
          <div className="n">{currencies.length}</div>
          <div className="l">Currencies, kept apart</div>
        </div>
        <div>
          <div className="n">{report.refunds.length}</div>
          <div className="l">Refunds in the period</div>
        </div>
      </div>

      <p className="muted" style={{ marginTop: '1rem' }}>
        The window is {describePeriod(report)}. An order is in it by the day it was
        paid, not by when it was recorded; a refund is in it by the day it was
        refunded, so a sale and its reversal can land in different months and both
        are true.
      </p>

      {issues.length > 0 && (
        <div className="notice warn" style={{ marginTop: '1rem' }} role="alert">
          This report does not agree with itself, so the figures below should not be
          trusted until somebody looks:
          <ul style={{ margin: '0.5rem 0 0' }}>
            {issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      )}

      {isEmptyPeriod(report) ? (
        <p className="empty section">
          No paid order was recorded in this period. That is an answer, not a
          missing report — the window is the one above.
        </p>
      ) : (
        <>
          <section className="section">
            <h2>By currency</h2>
            <p className="muted">
              Three figures per currency: what was charged, what came back, and what
              that leaves. A refunded order still counts as a sale, because it was
              one.
            </p>
            <div className="grid cols-2">
              {report.byCurrency.map((row) => (
                <article className="card" key={row.currency}>
                  <div className="outline-h">
                    <h3>{row.currency}</h3>
                    <span className="badge neutral">
                      {row.orders} order{row.orders === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ul className="lessons">
                    <li>
                      <span className="n">{formatMinor(row.grossMinor, row.currency)}</span>
                      <span className="t">Charged</span>
                    </li>
                    <li>
                      <span className="n">{formatMinor(row.discountMinor, row.currency)}</span>
                      <span className="t">
                        Discounted
                        <span className="muted">
                          {' '}· promotions taken off the price, already inside the figure above
                        </span>
                      </span>
                    </li>
                    <li>
                      <span className="n">{formatMinor(row.refundedMinor, row.currency)}</span>
                      <span className="t">Refunded</span>
                    </li>
                    <li>
                      <span className="n">{formatMinor(row.netMinor, row.currency)}</span>
                      <span className="t">Left after refunds</span>
                    </li>
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="section">
            <h2>By course</h2>
            <p className="muted">
              A sale is attributed to a course only when its product maps to exactly
              one. A bundle of two courses is listed under its product instead of
              being split by guesswork.
            </p>
            {report.byCourse.length === 0 ? (
              <p className="empty">No course was sold in this period.</p>
            ) : (
              currencies.map((currency) => {
                const rows = forCurrency(report.byCourse, currency);
                if (rows.length === 0) return null;
                return (
                  <div key={currency} style={{ marginTop: '1rem' }}>
                    <h3>{currency}</h3>
                    <ul className="lessons">
                      {rows.map((row) => (
                        <li key={`${row.courseId ?? 'unattributed'}-${row.currency}`}>
                          <span className="n">{row.sales}</span>
                          <span className="t">
                            {row.courseSlug ? (
                              <Link href={`/courses/${row.courseSlug}`}>{courseLabel(row)}</Link>
                            ) : (
                              courseLabel(row)
                            )}
                            <br />
                            {formatMinor(row.grossMinor, row.currency)} sold
                            {Number(row.discountMinor) > 0 && (
                              <> less {formatMinor(row.discountMinor, row.currency)} discounted</>
                            )}
                            {Number(row.refundedMinor) > 0 && (
                              <> · {formatMinor(row.refundedMinor, row.currency)} refunded</>
                            )}
                            {' = '}
                            <strong>{formatMinor(row.netMinor, row.currency)}</strong>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </section>

          <section className="section">
            <h2>By plan</h2>
            <p className="muted">
              Subscriptions are reported away from courses. A plan is a different
              promise from a course, and a month of it is not a course sale that
              happened to recur.
            </p>
            {report.byPlan.length === 0 ? (
              <p className="empty">No plan was sold in this period.</p>
            ) : (
              <ul className="lessons">
                {report.byPlan.map((row) => (
                  <li key={`${row.planCode}-${row.currency}`}>
                    <span className="n">{row.sales}</span>
                    <span className="t">
                      {row.planName} <span className="muted">· {row.planCode}</span>
                      <br />
                      {formatMinor(row.grossMinor, row.currency)} sold
                      {Number(row.discountMinor) > 0 && (
                        <> less {formatMinor(row.discountMinor, row.currency)} discounted</>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="section">
            <h2>What teachers earned</h2>
            <p className="muted">
              Read from the accrual — the platform's own record, with the revenue
              share fixed on the day of the sale — never recomputed at today's rate.
              An entry reversed by a refund is listed separately rather than
              subtracted, so the reversal is still visible as something that
              happened. This is what accrued in the period; what was paid out is on{' '}
              <Link href="/admin/payouts">teacher payouts</Link>.
            </p>
            {report.byTeacher.length === 0 ? (
              <p className="empty">No earnings accrued in this period.</p>
            ) : (
              <ul className="lessons">
                {report.byTeacher.map((row) => (
                  <li key={`${row.userId}-${row.currency}`}>
                    <span className="n">{formatMinor(row.netMinor, row.currency)}</span>
                    <span className="t">
                      {row.displayName ?? 'A teacher with no profile name yet'}
                      <span className="muted">
                        {' '}· {row.entries} entr{row.entries === 1 ? 'y' : 'ies'} in{' '}
                        {row.currency}
                      </span>
                      <br />
                      {formatMinor(row.grossMinor, row.currency)} of sales
                      {Number(row.reversedMinor) > 0 && (
                        <span className="badge warn" style={{ marginLeft: '0.5rem' }}>
                          {formatMinor(row.reversedMinor, row.currency)} reversed
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="section">
            <h2>Refunds in the period</h2>
            {report.refunds.length === 0 ? (
              <p className="empty">Nothing was refunded in this period.</p>
            ) : (
              <>
                <ul className="lessons">
                  {report.refunds.map((row) => (
                    <li key={`${row.orderId}-${row.refundedAt}-${row.amountMinor}`}>
                      <span className="n">{formatMinor(row.amountMinor, row.currency)}</span>
                      <span className="t">
                        {row.refundedAt}
                        <span className="muted"> · order {row.orderId.slice(0, 8)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {report.refunds.length >= 50 && (
                  <p className="muted">
                    The fifty most recent are listed. The figures above count every
                    refund in the period, not only these.
                  </p>
                )}
              </>
            )}
            <p className="muted">
              Where a refund goes next — who approves it, and what a provider does
              with it — is on <Link href="/admin/refunds">refund requests</Link>.
            </p>
          </section>
        </>
      )}
    </>
  );
}
