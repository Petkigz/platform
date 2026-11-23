import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { countryNameIn } from '@/lib/geo';
import { LOCALE_COOKIE, chooseLocale, formatDateTime, languageShownFor, translator, type MessageKey, type Translate } from '@/lib/i18n';
import { amountOf } from '@/lib/sponsorship-outcome';
import {
  isQuiet,
  movementKindOf,
  movementTitleOf,
  parseStatement,
  waitingCount,
  waitingKindOf,
  waitingStateOf,
  type CurrencySection,
  type Statement,
  type StatementAccount,
  type WaitingKind,
  type WaitingState,
} from '@/lib/statement';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'billing');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('orders.billing') };
}

const WAITING_KIND: Record<WaitingKind, MessageKey> = {
  refund_request: 'billing.wtRequest',
  refund: 'billing.wtRefund',
  dispute: 'billing.wtDispute',
};

const WAITING_STATE: Record<WaitingState, MessageKey> = {
  rqRequested: 'billing.rqRequested',
  rqApproved: 'billing.rqApproved',
  rqRejected: 'billing.rqRejected',
  rqWithdrawn: 'billing.rqWithdrawn',
  rfPending: 'billing.rfPending',
  rfFailed: 'billing.rfFailed',
  dpOpen: 'billing.dpOpen',
  dpWon: 'billing.dpWon',
  dpLost: 'billing.dpLost',
  dpWithdrawn: 'billing.dpWithdrawn',
};

/**
 * A sentence that ends in what is put into it, with that set apart.
 *
 * Every sentence on this page that carries an amount, a code, a title or
 * something the payer typed ends with it, after a colon, so no language has
 * to inflect it. The value is isolated; an amount or a code is read left to
 * right whatever the page's direction, and anything else finds its own.
 */
function Ending({ words, gap, value, ltr }: { words: string; gap: string; value: string; ltr?: boolean }) {
  const lead = words.split(`{${gap}}`)[0] ?? '';
  return (
    <>
      {lead}
      {ltr ? <bdi dir="ltr">{value}</bdi> : <bdi>{value}</bdi>}
    </>
  );
}

/**
 * True when every amount in the statement can be said correctly.
 *
 * A statement with one figure left out is worse than no statement: the sums
 * would no longer add up to what is printed. So an amount this page cannot
 * say (a currency `money.ts` has never heard of) makes the whole statement
 * unread, and the page says that.
 */
function sayable(statement: Statement): boolean {
  for (const account of statement.accounts) {
    for (const c of account.currencies) {
      const amounts = [
        c.chargedMinor, c.refundedMinor, c.netMinor,
        ...c.moved.flatMap((m) => [m.amountMinor, m.runningMinor]),
        ...c.notYetMoney.map((w) => w.amountMinor),
      ];
      if (amounts.some((minor) => amountOf(minor, c.currencyCode) === null)) return false;
    }
  }
  return true;
}

type Said = { t: Translate; when: (iso: string) => string | null };

/** The order a line belongs to: its number when it has one, as a link to the receipt. */
function OrderLink({ orderId, orderNumber, t }: { orderId: string | null; orderNumber: string | null; t: Translate }) {
  if (!orderId) return orderNumber ? <bdi dir="ltr">{orderNumber}</bdi> : null;
  return (
    <Link href={`/orders/${orderId}/receipt`}>
      {orderNumber ? <bdi dir="ltr">{orderNumber}</bdi> : t('orders.receipt')}
    </Link>
  );
}

function CurrencyCard({ section, t, when }: { section: CurrencySection } & Said) {
  const code = section.currencyCode;
  // `sayable()` has already established that each of these is an amount.
  const money = (minor: string) => amountOf(minor, code) ?? '';
  return (
    <div className="card statement-card" data-currency={code}>
      <div className="stats statement-sums">
        <div data-sum="paid">
          <div className="n"><bdi dir="ltr">{money(section.chargedMinor)}</bdi></div>
          <div className="l">{t('billing.sumPaid')}</div>
        </div>
        <div data-sum="returned">
          <div className="n"><bdi dir="ltr">{money(section.refundedMinor)}</bdi></div>
          <div className="l">{t('billing.sumReturned')}</div>
        </div>
        <div data-sum="net">
          <div className="n"><bdi dir="ltr">{money(section.netMinor)}</bdi></div>
          <div className="l">{t('billing.sumNet')}</div>
        </div>
      </div>

      {section.moved.length === 0 ? (
        <p className="empty" data-moved-list="none">{t('billing.noneMoved')}</p>
      ) : (
        // A list, not a table: four columns do not fit a phone, and a
        // statement that has to be scrolled sideways hides its last column,
        // which is the one that lets a reader check the sum.
        <ul className="lessons stacked" data-moved-list="list">
          {section.moved.map((row, i) => {
            const kind = movementKindOf(row.kind);
            const title = movementTitleOf(row);
            const date = when(row.occurredAt);
            return (
              <li
                key={`${row.kind}-${row.orderId ?? 'none'}-${row.occurredAt}-${i}`}
                className="statement-row"
                // An unknown kind still renders. A statement that dropped a
                // row because the screen had not learned its name would
                // understate what a family paid.
                data-moved={kind ?? 'other'}
                data-direction={row.direction}
              >
                <div className="order-head">
                  <strong>
                    {kind === 'charge' && (title ? <Ending words={t('billing.mvPaymentFor')} gap="what" value={title} /> : t('billing.mvPayment'))}
                    {kind === 'refund' && (title ? <Ending words={t('billing.mvRefundFor')} gap="what" value={title} /> : t('billing.mvRefund'))}
                    {kind === null && (title ? <bdi>{title}</bdi> : t('orders.anOrder'))}
                  </strong>
                </div>
                {(date || row.orderId || row.orderNumber) && (
                  <p className="meta statement-when">
                    {date && <bdi>{date}</bdi>}
                    <OrderLink orderId={row.orderId} orderNumber={row.orderNumber} t={t} />
                  </p>
                )}
                <p className="meta" data-amount>
                  <Ending
                    words={t(row.direction === 'in' ? 'billing.mvReturned' : 'billing.mvPaid')}
                    gap="amount"
                    value={money(row.amountMinor)}
                    ltr
                  />
                </p>
                {/* The last of these equals the net figure above, so the
                    column can be added up and checked. */}
                <p className="muted order-line" data-after>
                  <Ending words={t('billing.mvAfter')} gap="amount" value={money(row.runningMinor)} ltr />
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {section.notYetMoney.length > 0 && (
        <div className="statement-waiting" data-waiting-list>
          <h3>{t('billing.waitTitle')}</h3>
          <p className="muted">{t('billing.waitBody')}</p>
          <ul className="lessons stacked">
            {section.notYetMoney.map((row, i) => {
              const kind = waitingKindOf(row.kind);
              // The database's own sentence (`row.says`) is English and is
              // not printed. A state with no name here gets no sentence.
              const state = waitingStateOf(row.kind, row.status);
              const date = when(row.occurredAt);
              return (
                <li
                  key={`${row.kind}-${row.occurredAt}-${i}`}
                  className="statement-row"
                  data-waiting={kind ?? 'other'}
                  data-state={state ?? 'unknown'}
                >
                  <div className="order-head">
                    <strong>
                      <Ending
                        words={t(kind ? WAITING_KIND[kind] : 'billing.wtOther')}
                        gap="amount"
                        value={money(row.amountMinor)}
                        ltr
                      />
                    </strong>
                  </div>
                  {state && <p className="meta">{t(WAITING_STATE[state])}</p>}
                  {(date || row.orderId || row.orderNumber) && (
                    <p className="muted order-line statement-when">
                      {date && <bdi>{date}</bdi>}
                      <OrderLink orderId={row.orderId} orderNumber={row.orderNumber} t={t} />
                    </p>
                  )}
                  {/* What the payer typed is theirs, in whatever language they typed it. */}
                  {row.reason && (
                    <p className="muted order-line" data-reason>
                      <Ending words={t('billing.youWrote')} gap="reason" value={row.reason} />
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function AccountSection({ account, language, t, when }: { account: StatementAccount; language: string } & Said) {
  const waiting = waitingCount(account);
  const country = countryNameIn(account.billingCountry, language);
  return (
    <section className="statement-account" data-account>
      <div className="statement-head">
        <h2><bdi>{account.displayName}</bdi></h2>
        <p className="muted">
          {country && <><bdi>{country}</bdi>{' · '}</>}
          <Ending words={t('billing.billedIn')} gap="currency" value={account.billingCurrency} ltr />
        </p>
      </div>

      {isQuiet(account) ? (
        <p className="empty" data-account-quiet>
          {t('billing.quiet')} <Link href="/catalogue">{t('refer.lnBrowse')}</Link>
        </p>
      ) : (
        account.currencies.map((section) => (
          <CurrencyCard key={section.currencyCode} section={section} t={t} when={when} />
        ))
      )}

      {waiting > 0 && (
        <p className="muted statement-foot" data-waiting-count={waiting}>
          {/* A count is safe across currencies where a total is not. */}
          <Ending words={t('billing.waiting')} gap="count" value={String(waiting)} ltr />
          <span className="order-rule">{t('billing.askNote')}</span>
        </p>
      )}
    </section>
  );
}

/**
 * What you have paid, in the reader's language.
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
 * sent may take days to arrive; a fee charged for receiving it, or what is
 * done to a currency, is somebody else's and never appears here. The note at
 * the bottom says that rather than leaving a reader to discover it.
 *
 * And, since it was put into the reader's language:
 *
 * **Unread is not empty.** A statement that could not be read, or that came
 * back in a shape this page cannot trust, or that holds an amount it cannot
 * say, is said as "could not be read", aloud, and as "not the same as having
 * paid nothing". It used to throw, which drew the site's broken-page screen:
 * true, but it said nothing about money to somebody looking for theirs.
 *
 * **Nothing the database wrote in English is printed as the page's own.**
 * `my_statement()` sends a sentence with each thing that is waiting; the page
 * says its own, chosen by the kind and the state (`lib/statement.ts`), and a
 * state it has no word for gets its amount and no sentence. The state's
 * stored name (`under_review`) was printed in a badge and is not now: the
 * sentence says what the badge said. With no title the database writes
 * `Order <number>`; the page says "payment" or "refund" and prints the number.
 *
 * **Amounts are major units** (`UGX 50000`, `USD 19.99`), read left to right.
 * Dates are said with their zone, in UTC, because a server does not know the
 * reader's clock. A country is named in the reader's language.
 *
 * Thirty-seven sentences in twenty-seven languages (`messages/billing.ts`),
 * unreviewed; a language held for review reads the page in English, whole,
 * under `lang="en"`.
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

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const when = (iso: string) => formatDateTime(shown.code, iso, 'UTC') || null;

  // null: not read. Never drawn as "nothing paid".
  let statement: Statement | null = null;
  try {
    const { data, error } = await supabase.rpc('my_statement');
    if (error) throw new Error(error.message);
    const parsed = parseStatement(data);
    if (!sayable(parsed)) throw new Error('an amount in the statement cannot be shown');
    statement = parsed;
  } catch (error) {
    // The reason goes to the log. The reader is told what it means for them.
    console.error('[billing] statement unread:', error instanceof Error ? error.message : error);
  }

  return (
    <div className="page" {...frame}>
      <div className="page-head">
        <p className="eyebrow">
          <Link href="/account">{t('merge.back')}</Link>
        </p>
        <h1>{t('orders.billing')}</h1>
        <p className="lede">{t('billing.lede')}</p>
      </div>

      {statement === null && (
        <div className="notice error" role="alert" data-statement="unread">
          {t('billing.unread')}
        </div>
      )}

      {statement !== null && statement.accounts.length === 0 && (
        <p className="empty" data-statement="none">
          {t('billing.noAccount')} <Link href="/catalogue">{t('refer.lnBrowse')}</Link>
        </p>
      )}

      {statement !== null && statement.accounts.length > 0 && (
        <div data-statement="read">
          {statement.accounts.map((account) => (
            <AccountSection key={account.billingAccountId} account={account} language={shown.code} t={t} when={when} />
          ))}
        </div>
      )}

      <div className="notice statement-note">
        <strong>{t('billing.recLead')}</strong> {t('billing.recBody')}
      </div>

      <p className="statement-links">
        <Link href="/orders">{t('orders.title')}</Link>
        {' · '}
        <Link href="/subscriptions">{t('nav.subscriptions')}</Link>
        {' · '}
        <Link href="/support">{t('footer.help')}</Link>
      </p>
    </div>
  );
}
