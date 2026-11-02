import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  describeRate,
  describeRateSource,
  fetchMoneyReport,
  formatMinor,
  formatRate,
  validateWindowInput,
  type MoneyReport,
} from '@/lib/currency';

export const dynamic = 'force-dynamic';

/**
 * What the platform took in, in the one currency the owner reads.
 *
 * The platform charges in whatever currency a family has. A total across those
 * currencies is not a number until every part of it is converted, and a converted
 * total is only as good as the rate under it — so this page shows the rate beside
 * every figure, and lists separately the money it could not convert.
 *
 * What it does now that it did not before.
 *
 * It nets. The three questions the page used to refuse to answer — whether a
 * chargeback offsets the capture it came from, whether a provider fee comes off
 * here or off a teacher's payout, and whether a reversal belongs to the period it
 * happened in — are decisions about the business rather than about arithmetic, and
 * the owner made all three on 2026-11-01. They are printed beside the figures they
 * produced, in the order they are applied, so nobody has to read a commit message
 * to check a total.
 *
 * It produces two net figures rather than one, because one would have been a lie by
 * omission: a teacher's share is not a ledger row, and money owed to a teacher is
 * not money the platform made. One line says what the platform handled; the other
 * says what it kept.
 *
 * It does not convert a stored amount. D4 keeps the original currency
 * authoritative; conversion happens on the way to being read, and the same order
 * read tomorrow at a different rate is still the same order.
 *
 * Gated on `finance_admin` or `platform_admin`. This is the one screen that shows
 * what the platform earned across every currency at once, which is not an answer
 * to a question about one order.
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

function DirectionTotal({ report, direction }: { report: MoneyReport; direction: 'credit' | 'debit' }) {
  const total = report.byDirection.find((row) => row.direction === direction);
  return (
    <div>
      <div className="n">
        {total ? formatMinor(total.reportingAmountMinor, report.reportingCurrency) : '—'}
      </div>
      <div className="l">
        {direction === 'credit' ? 'Money in' : 'Money back'}
        {total ? ` · ${total.count} transactions` : ''}
      </div>
    </div>
  );
}

export default async function AdminMoneyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/money-report');

  const [{ data: finance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (finance !== true && platform !== true) redirect('/admin');

  const params = await searchParams;
  const fromDate = params.from?.trim() || monthStart();
  const toDate = params.to?.trim() || today();

  const window = validateWindowInput({ from: fromDate, to: toDate });
  const report = window.ok ? await fetchMoneyReport(supabase, window.value) : null;

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Money report</h1>
      <p className="lede">
        What moved in a period, converted into the one currency the platform is
        read in, and what was left when everything that came back out was taken off
        again. Every converted figure names the rate that produced it, and money in
        a currency nobody has quoted is listed as a gap rather than guessed at.
      </p>

      <div className="card" style={{ padding: '1.25rem' }}>
        <form method="get" action="/admin/money-report" className="row"
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

      {window.ok && report && !report.ok && (
        <div className="notice error" style={{ marginTop: '1.5rem' }} role="alert">
          The report could not be read: {report.message}
        </div>
      )}

      {window.ok && report?.ok && (
        <Report report={report.value} />
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin/exchange-rates">Exchange rates</Link>
        {' · '}
        <Link href="/admin/financial-adjustments">Financial adjustments</Link>
        {' · '}
        <Link href="/admin/reconciliation">Payment reconciliation</Link>
        {' · '}
        <Link href="/admin">Back to administration</Link>
      </p>
    </div>
  );
}

/**
 * The net figure, with its arithmetic on its face.
 *
 * The rules travel with the report rather than living here, so this component
 * cannot state a rule the database does not apply — and the page shows the rule the
 * database sent, not a paraphrase of it.
 */
function Netting({ report }: { report: MoneyReport }) {
  const netting = report.netting;
  const figure = (value: string | null) =>
    value === null ? '—' : formatMinor(value, netting.currency);

  return (
    <section className="section">
      <h2>What netted, and what was left</h2>
      <p className="muted">{netting.note}</p>

      {!netting.complete && (
        <div className="notice warn" style={{ marginTop: '1rem' }} role="alert">
          The two figures are withheld, not zero.{' '}
          {netting.missingRates.join(', ')} has no rate into {netting.currency} for
          this period, and a total missing a market is a wrong total rather than a
          smaller one. Record the rate on{' '}
          <Link href="/admin/exchange-rates">the rate shelf</Link> and it will
          appear.
        </div>
      )}

      <div className="stats">
        <div>
          <div className="n">{figure(netting.platformNetMinor)}</div>
          <div className="l">The platform handled</div>
        </div>
        <div>
          <div className="n">{figure(netting.platformRetainedMinor)}</div>
          <div className="l">The platform kept</div>
        </div>
      </div>

      <div className="card" style={{ padding: '0.5rem 1.25rem', marginTop: '1.25rem' }}>
        {netting.lines.map((line) => (
          <div
            key={line.code}
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              padding: '0.6rem 0',
              borderBottom: '1px solid var(--border-soft)',
            }}
          >
            <div style={{ flex: '1 1 16rem' }}>
              <strong>{line.label}</strong>
              <div className="muted" style={{ fontSize: '0.82rem' }}>{line.rule}</div>
            </div>
            <div style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {line.sign === 'add' ? '+ ' : '− '}
              {formatMinor(line.amountMinor, netting.currency)}
            </div>
          </div>
        ))}
      </div>

      <p className="muted" style={{ marginTop: '0.75rem' }}>
        &ldquo;Handled&rdquo; is captures less refunds, chargebacks, reversals and
        provider fees. &ldquo;Kept&rdquo; is that less the teacher share that
        accrued in the same period — which is not a row in the money ledger at all,
        which is why it needs its own line and its own figure.
      </p>
    </section>
  );
}

function Report({ report }: { report: MoneyReport }) {
  const missing = report.totals.missingRates;
  const unconvertedCount = report.unconverted.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <div className="stats">
        <div>
          <div className="n">{report.totals.transactions}</div>
          <div className="l">Transactions in the period</div>
        </div>
        <DirectionTotal report={report} direction="credit" />
        <DirectionTotal report={report} direction="debit" />
        <div>
          <div className="n">{missing.length}</div>
          <div className="l">Currencies with no rate</div>
        </div>
      </div>

      <p className="muted" style={{ marginTop: '1rem' }}>{report.note}</p>

      <Netting report={report} />

      {missing.length > 0 && (
        <div className="notice warn" style={{ marginTop: '1rem' }}>
          {unconvertedCount} record{unconvertedCount === 1 ? '' : 's'} in{' '}
          {missing.join(', ')} could not be converted, because no rate is recorded
          into {report.reportingCurrency} for {missing.length === 1 ? 'it' : 'them'}.
          They are excluded from the figures above and listed below — the total is
          smaller than the truth until a rate exists on{' '}
          <Link href="/admin/exchange-rates">the rate shelf</Link>.
        </div>
      )}

      {report.outliers.length > 0 && (
        <div className="notice warn" style={{ marginTop: '1rem' }}>
          A rate behind this report moved a long way from the one before it. It was
          recorded with a written reason, and it is doing most of the work in the
          figures below, so it is worth reading again:
          <ul style={{ margin: '0.5rem 0 0' }}>
            {report.outliers.map((outlier) => (
              <li key={`${outlier.base}-${outlier.quote}-${outlier.observedAt ?? 'none'}`}>
                <bdi>{outlier.base}→{outlier.quote}</bdi> went from{' '}
                {formatRate(outlier.previousRate)} to{' '}
                {formatRate(outlier.rate)}, more than {outlier.factor}× — {outlier.source}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="section">
        <h2>Money that moved</h2>
        {report.rows.length === 0 ? (
          <p className="empty">Nothing was recorded in this period.</p>
        ) : (
          <ul className="lessons">
            {report.rows.map((row) => (
              <li key={`${row.transactionType}-${row.direction}-${row.currency}`}>
                <span className="n">{row.count}</span>
                <span className="t">
                  {row.transactionType}
                  <span className="muted"> · {row.direction === 'credit' ? 'in' : 'back'}</span>
                  <br />
                  {formatMinor(row.amountMinor, row.currency)}
                  {row.reportingAmountMinor !== null ? (
                    <>
                      {' = '}
                      <strong>
                        {formatMinor(row.reportingAmountMinor, report.reportingCurrency)}
                      </strong>
                    </>
                  ) : (
                    <span className="badge warn" style={{ marginInlineStart: '0.5rem' }}>
                      no rate for {row.currency}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h2>What teachers are owed</h2>
        <p className="muted">
          The teacher's share as it accrued, converted at the same rate as everything
          else in this period, and the line that turns &ldquo;what the platform
          handled&rdquo; into &ldquo;what it kept&rdquo;. A provider fee never comes
          off this: it is the platform's cost, not a teacher's. What is shown is what
          is owed, not what has been paid — <code>teaching.payouts</code> is still
          gated and nothing here moves money.
        </p>
        {report.earnings.length === 0 ? (
          <p className="empty">No earnings accrued in this period.</p>
        ) : (
          <ul className="lessons">
            {report.earnings.map((row) => (
              <li key={`${row.status}-${row.currency}`}>
                <span className="n">{row.count}</span>
                <span className="t">
                  {row.status}
                  <br />
                  {formatMinor(row.netAmountMinor, row.currency)}
                  {row.reportingNetMinor !== null ? (
                    <>
                      {' of '}
                      {formatMinor(row.grossAmountMinor, row.currency)}
                      {' = '}
                      <strong>
                        {formatMinor(row.reportingNetMinor, report.reportingCurrency)}
                      </strong>
                    </>
                  ) : (
                    <span className="badge warn" style={{ marginInlineStart: '0.5rem' }}>
                      no rate for {row.currency}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h2>The rates these figures used</h2>
        <p className="muted">
          One rate per currency for the whole period, taken at the moment the window
          closes, so two rows in the same currency cannot have been converted at two
          different rates and then added together.
        </p>
        {report.ratesUsed.length === 0 ? (
          <p className="empty">Nothing was converted in this period.</p>
        ) : (
          <div className="grid cols-2">
            {report.ratesUsed.map((rate) => (
              <article className="card" key={`${rate.base}-${rate.quote}-${rate.rateId ?? 'identity'}`}>
                <div className="outline-h">
                  <h3>{describeRate(rate)}</h3>
                  {rate.derived
                    ? <span className="badge warn">inverted</span>
                    : <span className="badge neutral">{rate.source === 'identity' ? 'same currency' : 'recorded'}</span>}
                </div>
                <p className="meta">{describeRateSource(rate)}</p>
                <p className="muted">
                  One group in {rate.base} came to{' '}
                  {formatMinor(rate.amountMinor, rate.currency)} at this rate.
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
