import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatMinor } from '@/lib/currency';

export const dynamic = 'force-dynamic';

type Total = {
  currency: string;
  entries: number | string;
  owedMinor: string;
  grossMinor: string;
  paidMinor: string;
  reversedMinor: string;
};

type Entry = {
  id: string;
  accruedAt: string;
  currency: string;
  grossMinor: string;
  sharePercent: number | string;
  netMinor: string;
  status: string;
  orderId: string | null;
  courseTitle: string | null;
};

type Statement = {
  payoutsEnabled: boolean;
  sharePercent: number | string;
  byCurrency: Total[];
  entries: Entry[];
  nothingPaidYet: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  accrued: 'Earned',
  payable: 'Ready to pay',
  paid: 'Paid',
  reversed: 'Reversed by a refund',
};

function money(minor: string, currency: string): string {
  return formatMinor(String(minor), currency);
}

function day(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
}

/**
 * What a teacher has earned.
 *
 * The revenue split has been recorded per sale since the accrual writer was
 * built and nothing showed the person it belongs to. This page is the
 * statement: per currency, the entries behind it, and the plain fact that
 * payouts are not switched on.
 *
 * It deliberately does not say "balance". A balance is a number somebody can
 * withdraw; `teaching.payouts` ships off, there is no provider and no
 * destination, and a figure presented as a balance would be the most damaging
 * lie this product could tell.
 */
export default async function EarningsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/teach/earnings');

  const { data, error } = await supabase.rpc('my_earnings', { p_limit: 50 });
  if (error) throw new Error(error.message);
  const statement = (data ?? null) as Statement | null;

  const totals = statement?.byCurrency ?? [];
  const entries = statement?.entries ?? [];

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/teach">Teaching</Link>
        <span aria-hidden>›</span>
        <span>Earnings</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Teaching</p>
        <h1>What you have earned</h1>
        <p className="muted">
          Every paid sale of your course records your share at the rate in force that day —
          currently {String(statement?.sharePercent ?? 50)}%. The rate is written on each entry, so a
          later change cannot re-price a past sale.
        </p>
      </div>

      {!statement?.payoutsEnabled && (
        <div className="notice warn" style={{ marginBottom: '1.5rem' }}>
          <strong>Nothing has been paid out yet, and this page cannot pay you.</strong> These are the
          amounts the platform has recorded as earned. Sending money needs a payout method, a
          provider and a tax treatment — none of which exist yet — so there is no balance to
          withdraw and no button here that pretends otherwise.
        </div>
      )}

      {totals.length === 0 ? (
        <p className="empty">No sales recorded yet.</p>
      ) : (
        <>
          <div className="grid cols-2">
            {totals.map((total) => (
              <article className="card" key={total.currency}>
                <p className="eyebrow">{total.currency}</p>
                <p style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.25rem 0' }}>
                  {money(total.owedMinor, total.currency)}
                </p>
                <p className="muted" style={{ marginTop: 0 }}>
                  earned and not reversed · {String(total.entries)} sale(s)
                </p>
                <p className="muted" style={{ fontSize: '0.9rem' }}>
                  From {money(total.grossMinor, total.currency)} of course sales.
                  {Number(total.reversedMinor) > 0 && (
                    <> {money(total.reversedMinor, total.currency)} was reversed by refunds.</>
                  )}
                  {Number(total.paidMinor) > 0 && (
                    <> {money(total.paidMinor, total.currency)} has been paid.</>
                  )}
                </p>
              </article>
            ))}
          </div>

          <p className="muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            Currencies are never added together. Two markets pay in two currencies and a combined
            figure would be an exchange rate nobody recorded; converting is the platform
            report&apos;s job, at a rate the owner enters.
          </p>

          <div className="outline-h" style={{ marginTop: '2rem' }}>
            <h3>The sales behind it</h3>
          </div>
          <div className="card">
            <ul className="lessons">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <span>
                      <strong>{entry.courseTitle ?? 'A course sale'}</strong>
                      <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                        {day(entry.accruedAt)} · {String(entry.sharePercent)}% of{' '}
                        {money(entry.grossMinor, entry.currency)}
                      </span>
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <strong>{money(entry.netMinor, entry.currency)}</strong>
                      <span
                        className={`badge ${entry.status === 'reversed' ? 'warn' : 'neutral'}`}
                        style={{ display: 'block', marginTop: '0.25rem' }}
                      >
                        {STATUS_LABEL[entry.status] ?? entry.status}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/teach/payouts">Ask to be paid</Link> — what is out of its refund hold, and
        where every earlier request stands.
        {' · '}
        <Link href="/teach">Back to teaching</Link>
      </p>
    </div>
  );
}
