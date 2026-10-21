import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  convertAmount,
  describeRate,
  describeRateSource,
  fetchRecentRates,
  formatMinor,
  formatRate,
  type RateRow,
} from '@/lib/currency';
import { RateForm } from './rate-form';

export const dynamic = 'force-dynamic';

/**
 * The rate shelf.
 *
 * Every figure the money report converts is converted with a row from here, so
 * this page is where a wrong total gets fixed: not by editing a total, but by
 * recording the rate that should have been in force. Nothing on it changes an
 * amount already stored — D4 keeps the original currency authoritative, and a
 * conversion is something that happens on the way to being read.
 *
 * There is no feed behind it. A rate is a fact a finance admin looked up, and
 * `source` is where they say so. When a provider integration exists it will be a
 * second writer of the same table under the same requirement, which is why the
 * field is a sentence and not a dropdown of integrations.
 *
 * Gated on `finance_admin` or `platform_admin`, the pair that guards every other
 * money writer, and not on `is_privileged()`: a support agent may refund an order
 * and should not be able to change the number every total is converted with.
 */
export default async function AdminExchangeRatesPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string; currency?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/exchange-rates');

  const [{ data: finance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (finance !== true && platform !== true) redirect('/admin');

  const { amount, currency } = await searchParams;

  const [rates, reporting, factor, probe] = await Promise.all([
    fetchRecentRates(supabase, 200),
    supabase.rpc('setting_text', {
      p_key: 'finance.reporting_currency',
      p_default: 'USD',
    }),
    supabase.rpc('setting_int', { p_key: 'finance.rate_sanity_factor', p_default: 10 }),
    amount || currency
      ? convertAmount(supabase, { amountMinor: amount ?? '', currency: currency ?? '' })
      : Promise.resolve(null),
  ]);

  const reportingCurrency = typeof reporting.data === 'string' ? reporting.data.trim() : 'USD';
  const sanityFactor = typeof factor.data === 'number' ? factor.data : 10;

  const list: RateRow[] = rates.ok ? rates.value : [];
  const pairs = new Map<string, RateRow[]>();
  for (const row of list) {
    const key = `${row.base}→${row.quote}`;
    const existing = pairs.get(key);
    if (existing) existing.push(row);
    else pairs.set(key, [row]);
  }

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Exchange rates</h1>
      <p className="lede">
        What one currency was worth in another, when, and who said so. Every total
        in <Link href="/admin/money-report">the money report</Link> is converted with
        one of these, and a pair nobody has recorded is reported as a gap rather
        than guessed at.
      </p>

      <div className="stats">
        <div>
          <div className="n">{list.length}</div>
          <div className="l">Rates recorded</div>
        </div>
        <div>
          <div className="n">{pairs.size}</div>
          <div className="l">Currency pairs</div>
        </div>
        <div>
          <div className="n">{reportingCurrency}</div>
          <div className="l">Everything is reported in</div>
        </div>
        <div>
          <div className="n">{sanityFactor > 0 ? `${sanityFactor}×` : 'off'}</div>
          <div className="l">Move that needs a reason</div>
        </div>
      </div>

      {!rates.ok && (
        <div className="notice error" style={{ marginTop: '1.5rem' }} role="alert">
          The rate list could not be read: {rates.message}
        </div>
      )}

      {rates.ok && list.length === 0 && (
        <div className="notice warn" style={{ marginTop: '1.5rem' }}>
          No rate has ever been recorded, so nothing can be converted. The money
          report will list every currency it was asked about as one it could not
          convert, which is the honest answer until somebody records a rate here.
        </div>
      )}

      <section className="section">
        <h2>Check one amount</h2>
        <p className="muted">
          What a single figure converts to right now, and with which recorded rate.
          This is how a total that looks wrong is checked: if the rate beside it is
          not the one you expected, the fix is a recorded rate, not an edited number.
        </p>
        <div className="card" style={{ padding: '1.25rem' }}>
          <form method="get" action="/admin/exchange-rates" className="row">
            <label>
              Amount, in minor units
              <input name="amount" inputMode="numeric" placeholder="500000"
                     defaultValue={amount ?? ''} />
            </label>
            <label>
              Currency
              <input name="currency" minLength={3} maxLength={3} placeholder="UGX"
                     defaultValue={currency ?? ''} style={{ textTransform: 'uppercase' }} />
            </label>
            <button className="btn secondary" type="submit">Convert</button>
          </form>

          {probe && !probe.ok && (
            <div className="notice error" role="alert">{probe.message}</div>
          )}
          {probe && probe.ok && (
            <div style={{ marginTop: '1rem' }}>
              <dl className="facts">
                <div>
                  <dt>Asked</dt>
                  <dd>{formatMinor(probe.value.asked.amountMinor, probe.value.asked.currency)}</dd>
                </div>
                <div>
                  <dt>In {reportingCurrency}</dt>
                  <dd>
                    {probe.value.converted
                      ? formatMinor(probe.value.converted.amountMinor, probe.value.converted.currency)
                      : 'Nothing — no rate is recorded for this pair'}
                  </dd>
                </div>
                {probe.value.converted && (
                  <>
                    <div>
                      <dt>Rate used</dt>
                      <dd>
                        {describeRate(probe.value.converted)}
                        {probe.value.converted.derived && (
                          <span className="badge warn" style={{ marginLeft: '0.5rem' }}>inverted</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Provenance</dt>
                      <dd>{describeRateSource(probe.value.converted)}</dd>
                    </div>
                  </>
                )}
              </dl>
              {!probe.value.converted && (
                <p className="muted">
                  An amount in a currency nobody has quoted cannot be converted, and
                  the report shows it as a gap rather than folding a made-up figure
                  into a total.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <RateForm />

      <section className="section">
        <h2>What has been recorded</h2>
        <p className="muted">
          Newest first within each pair, and the top of each list is the rate in
          force. Nothing here is editable: a rate that was wrong is corrected by
          recording the right one, so the trail of what the platform was told, and
          when, stays intact.
        </p>
        {pairs.size === 0 ? (
          <p className="empty">No rates yet.</p>
        ) : (
          <div className="grid">
            {[...pairs.entries()].map(([pair, rows]) => (
              <article className="card" key={pair}>
                <div className="outline-h">
                  <h3>{pair}</h3>
                  <span className="badge neutral">{rows.length} recorded</span>
                </div>
                <p className="meta">
                  In force: 1 {rows[0]?.base} = {formatRate(rows[0]?.rate ?? null)}{' '}
                  {rows[0]?.quote}
                </p>
                <ul className="lessons">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <strong>{formatRate(row.rate)}</strong>
                      <span className="muted"> · {row.source}</span>
                      <span className="muted" style={{ display: 'block' }}>
                        observed {row.observedAt
                          ? new Date(row.observedAt).toISOString().slice(0, 10)
                          : 'no date recorded'}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin/money-report">Money report</Link>
        {' · '}
        <Link href="/admin/reconciliation">Payment reconciliation</Link>
        {' · '}
        <Link href="/admin">Back to administration</Link>
      </p>
    </div>
  );
}
