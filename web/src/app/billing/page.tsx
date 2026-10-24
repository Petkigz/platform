import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { format, fromMinor } from '@/lib/money';
import {
  isQuiet,
  parseStatement,
  waitingCount,
  type CurrencySection,
  type Movement,
  type StatementAccount,
  type WaitingItem,
} from '@/lib/statement';

export const dynamic = 'force-dynamic';

function date(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function money(amount: string, currency: string): string {
  return format(fromMinor(amount, currency));
}

/** What a movement was, in a person's words rather than a table's. */
function describeMovement(row: Movement): string {
  if (row.kind === 'charge') return row.description ?? 'Payment';
  if (row.kind === 'refund') return `Refund — ${row.description ?? 'order'}`;
  // An unknown kind still renders. A statement that dropped a row because the
  // screen had not learned its name would understate what a family paid.
  return row.description ?? row.kind;
}

function describeWaiting(row: WaitingItem): string {
  if (row.says) return row.says;
  if (row.kind === 'dispute') return 'A case with your bank. Nothing has moved in this record.';
  if (row.kind === 'refund_request') return 'Asked for. Not decided yet.';
  return 'Not counted yet.';
}

function kindLabel(row: WaitingItem): string {
  if (row.kind === 'dispute') return 'Bank case';
  if (row.kind === 'refund') return 'Refund';
  if (row.kind === 'refund_request') return 'Refund asked for';
  return row.kind;
}

function CurrencyCard({ section }: { section: CurrencySection }) {
  const code = section.currencyCode;
  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="stats" style={{ marginTop: 0 }}>
        <div>
          <div className="n">{money(section.chargedMinor, code)}</div>
          <div className="l">Paid</div>
        </div>
        <div>
          <div className="n">{money(section.refundedMinor, code)}</div>
          <div className="l">Returned</div>
        </div>
        <div>
          <div className="n">{money(section.netMinor, code)}</div>
          <div className="l">Net paid</div>
        </div>
      </div>

      {section.moved.length === 0 ? (
        <p className="empty">Nothing has moved in {code}.</p>
      ) : (
        <div className="scroll-x">
        <table style={{ width: '100%', marginTop: '1.25rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <th style={{ padding: '0.35rem 0', fontWeight: 600 }}>Date</th>
              <th style={{ padding: '0.35rem 0', fontWeight: 600 }}>What</th>
              <th style={{ padding: '0.35rem 0', fontWeight: 600, textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '0.35rem 0', fontWeight: 600, textAlign: 'right' }}>Net after</th>
            </tr>
          </thead>
          <tbody>
            {section.moved.map((row, i) => (
              <tr
                key={`${row.kind}-${row.orderId ?? 'none'}-${row.occurredAt}-${i}`}
                style={{ borderTop: '1px solid var(--border-soft)' }}
              >
                <td style={{ padding: '0.5rem 0', whiteSpace: 'nowrap' }}>{date(row.occurredAt)}</td>
                <td style={{ padding: '0.5rem 0' }}>
                  {describeMovement(row)}
                  {row.orderId ? (
                    <>
                      {' · '}
                      <Link href={`/orders/${row.orderId}/receipt`}>
                        {row.orderNumber ?? 'receipt'}
                      </Link>
                    </>
                  ) : null}
                </td>
                <td
                  style={{
                    padding: '0.5rem 0',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    color: row.direction === 'in' ? 'var(--green-700)' : undefined,
                  }}
                >
                  {row.direction === 'in' ? '− ' : ''}
                  {money(row.amountMinor, code)}
                </td>
                <td style={{ padding: '0.5rem 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {money(row.runningMinor, code)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {section.notYetMoney.length > 0 ? (
        <>
          <h3 style={{ marginTop: '1.5rem', fontSize: '1rem' }}>Not counted yet</h3>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            None of this has moved money, so none of it changes the net paid figure
            above.
          </p>
          <ul className="lessons">
            {section.notYetMoney.map((row, i) => (
              <li key={`${row.kind}-${row.occurredAt}-${i}`}>
                <span className="t">
                  {kindLabel(row)} — {money(row.amountMinor, code)}
                  <span className="muted" style={{ display: 'block' }}>
                    {describeWaiting(row)}
                  </span>
                  {row.reason ? (
                    <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                      You said: “{row.reason}”
                    </span>
                  ) : null}
                </span>
                <span className="badge neutral">{row.status ?? 'waiting'}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function AccountCard({ account }: { account: StatementAccount }) {
  const waiting = waitingCount(account);
  return (
    <section style={{ marginTop: '2rem' }}>
      <div className="outline-h">
        <h2 style={{ margin: 0 }}>{account.displayName}</h2>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          {account.billingCountry ? `${account.billingCountry} · ` : ''}
          billed in {account.billingCurrency}
        </span>
      </div>

      {isQuiet(account) ? (
        <p className="empty">
          Nothing has been paid on this account yet.{' '}
          <Link href="/catalogue">Browse the catalogue</Link>.
        </p>
      ) : (
        account.currencies.map((section) => (
          <CurrencyCard key={section.currencyCode} section={section} />
        ))
      )}

      {waiting > 0 ? (
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          {waiting === 1 ? 'One thing is' : `${waiting} things are`} waiting to move on
          this account. Asking for a refund does not return money; a completed refund
          does.
        </p>
      ) : null}
    </section>
  );
}

/**
 * What you have paid.
 *
 * The question this page answers is the one a parent asks after a refund: what
 * has gone out of my account, and what has come back? `/orders` answers "what
 * is this order" and the receipt is the document; neither is a statement.
 *
 * The page exists to keep four sentences honest.
 *
 * **Only money that moved is in the balance.** A refund asked for, approved,
 * or sent to a provider is listed under "not counted yet", with the state it
 * has reached, and it does not touch the net figure. The database enforces that
 * (`my_statement()` counts only completed refunds); this page's job is not to
 * undo it by adding a "pending refunds" line to a total.
 *
 * **Currencies are never added together.** A family that paid in shillings gets
 * one section in shillings. Converting would need an exchange rate, and a page
 * that invented one would be the only screen in the product that did.
 *
 * **The running total is checkable.** The last row equals the net figure, so a
 * reader can add the column up and get the same number — which is the only
 * reason to show it.
 *
 * **This is the platform's record, not your bank's.** A refund the platform has
 * sent may take days to appear on a statement; a fee a bank charges, or what it
 * does to a currency, is the bank's and never appears here. The note at the
 * bottom says that rather than leaving a reader to discover it.
 *
 * No flag. Reading what you paid is not a feature to be switched on, and
 * `FLAGS.md` settled the same question for the data export: a right behind a
 * switch that ships off is not a right.
 */
export default async function BillingPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/billing');

  const { data, error } = await supabase.rpc('my_statement');
  if (error) throw new Error(error.message);
  const statement = parseStatement(data);

  return (
    <div className="container section">
      <p className="eyebrow">Your account</p>
      <h1>What you have paid</h1>
      <p className="lede">
        Money that has moved, and money that has not yet. Only the first kind changes
        the net figure.
      </p>

      {statement.accounts.length === 0 ? (
        <p className="muted">
          You are not on a billing account yet. One is created for you the first time
          you buy something, and everything you pay appears here afterwards.{' '}
          <Link href="/catalogue">Browse the catalogue</Link>.
        </p>
      ) : (
        statement.accounts.map((account) => (
          <AccountCard key={account.billingAccountId} account={account} />
        ))
      )}

      <div className="notice" style={{ marginTop: '2rem' }}>
        <strong>This is the platform&rsquo;s record, not your bank&rsquo;s.</strong> A
        refund shown here as completed may take a few days to appear on your
        statement, and a fee your bank charges for receiving it is theirs rather than
        this platform&rsquo;s — neither will ever appear on this page. Amounts are shown
        in the currency you were charged; nothing here is converted into another one.
      </div>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/orders">My orders</Link> · <Link href="/subscriptions">My
        subscriptions</Link> · <Link href="/support">Help</Link>
      </p>
    </div>
  );
}
