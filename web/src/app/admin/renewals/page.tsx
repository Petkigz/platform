import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatMinor } from '@/lib/currency';

export const dynamic = 'force-dynamic';

type Month = {
  month: string;
  chargeCount: number | string;
  atRisk: number | string;
  byCurrency: { currency: string; amountMinor: string; count: number | string }[];
  convertedMinor: string | null;
};

type Projection = {
  months: number;
  from: string;
  to: string;
  reportingCurrency: string;
  automaticRenewal: boolean;
  monthly: Month[];
  totalByCurrency: { currency: string; amountMinor: string; count: number | string }[];
  unconverted: string[];
};

function monthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year ?? 1970, (mon ?? 1) - 1, 1)));
}

/**
 * What renews, when, and for how much.
 *
 * The figure is a projection of committed terms: each subscription expanded at
 * its own interval and at the price pinned to the version it bought. It is not
 * a forecast of income, because **nothing charges these renewals** — there is
 * no renewal engine and no merchant account — and the page says that above the
 * numbers rather than below them.
 */
export default async function AdminRenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/renewals');

  const [{ data: finance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (finance !== true && platform !== true) redirect('/admin');

  const params = await searchParams;
  const requested = Number(params.months ?? 6);
  const months = [3, 6, 12].includes(requested) ? requested : 6;

  const { data, error } = await supabase.rpc('platform_renewal_projection', { p_months: months });
  if (error) throw new Error(error.message);
  const projection = (data ?? null) as Projection | null;

  const rows = projection?.monthly ?? [];
  const totals = projection?.totalByCurrency ?? [];
  const totalCharges = rows.reduce((sum, m) => sum + Number(m.chargeCount), 0);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Renewals</h1>
      <p className="lede">
        Every live subscription expanded forward at its own interval, at the price pinned to the version it
        bought, bucketed by the month it falls due.
      </p>

      <div className="notice warn" style={{ marginBottom: '1.5rem' }}>
        <strong>This is not income, and nothing here charges anybody.</strong> There is no renewal engine and no
        merchant account, so every figure below is what would fall due <em>if</em> each subscription renewed exactly
        as written. It answers &ldquo;what have we committed to, and when&rdquo; — not &ldquo;what will arrive&rdquo;.
      </div>

      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted">Window</span>
          {[3, 6, 12].map((option) => (
            <Link
              key={option}
              href={`/admin/renewals?months=${option}`}
              className={option === months ? 'btn' : 'outline-h'}
              style={{ padding: '0.3rem 0.8rem' }}
            >
              {option} months
            </Link>
          ))}
        </div>
      </div>

      <div className="stats" style={{ margin: '1.5rem 0' }}>
        <div>
          <span className="n">{totalCharges}</span>
          <span className="l">Charges due</span>
        </div>
        <div>
          <span className="n">{totals.length}</span>
          <span className="l">Currencies</span>
        </div>
      </div>

      {totals.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="outline-h" style={{ marginTop: 0 }}>
            <h3>Across the whole window</h3>
          </div>
          <ul className="lessons">
            {totals.map((t) => (
              <li key={t.currency}>
                <strong>
                  {t.currency}: {formatMinor(t.amountMinor, t.currency)}
                </strong>
                <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                  {String(t.count)} charge(s)
                </span>
              </li>
            ))}
          </ul>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
            Currencies are not added together. A combined total needs a rate for every one of them, and the money
            report is where rates live.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="empty">
          No live subscription renews in the next {months} months. If plans have been sold, check that the plan
          versions they bought still carry an active price.
        </p>
      ) : (
        <div className="card">
          <ul className="lessons">
            {rows.map((m) => (
              <li key={m.month}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <span>
                    <strong>{monthLabel(m.month)}</strong>
                    <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                      {String(m.chargeCount)} charge(s)
                      {Number(m.atRisk) > 0 && ` · ${String(m.atRisk)} past due`}
                    </span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    {m.byCurrency.map((c) => (
                      <strong key={c.currency} style={{ display: 'block' }}>
                        {formatMinor(c.amountMinor, c.currency)}
                      </strong>
                    ))}
                    {m.convertedMinor && (
                      <span className="muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                        ≈ {formatMinor(m.convertedMinor, projection?.reportingCurrency ?? 'USD')}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
        Where a plan version carries several market prices, the default one is used: a subscription does not
        record which market it was sold in, and inventing one would put a wrong number in a table that looks
        exact.
      </p>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin/money-report">Money report</Link>
        {' · '}
        <Link href="/admin/plans">Plans and prices</Link>
        {' · '}
        <Link href="/admin">Back to administration</Link>
      </p>
    </div>
  );
}
