import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, formatDateTime, languageShownFor, translator, type MessageKey } from '@/lib/i18n';
import {
  adjustmentKindOf,
  isSettled,
  orderLinesOf,
  orderStateOf,
  type AdjustmentKind,
  type OrderLineKind,
  type OrderState,
} from '@/lib/orders-outcome';
import { providerNameOf } from '@/lib/payments/registry';
import { minorOf, paidThroughOf, receiptRefundsOf, returnedMinorOf, type ReceiptRefund } from '@/lib/receipt';
import { amountOf } from '@/lib/sponsorship-outcome';

import { BrandMark } from '../../../_shared/brand-mark';
import { Ending } from '../../../_shared/ending';
import { PrintReceiptButton } from './print-button';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Adjustment = {
  id: string;
  adjustment_type: string;
  direction: 'debit' | 'credit';
  amount_minor: string | number;
  currency_code: string;
  description: string | null;
  voided_at: string | null;
};

type OrderRow = {
  id: string;
  order_number: string | number | null;
  status: string;
  currency_code: string;
  subtotal_minor: string | number;
  discount_minor: string | number;
  tax_minor: string | number;
  fee_minor: string | number;
  total_minor: string | number;
  created_at: string;
  paid_at: string | null;
  learner_profile_id: string | null;
  billing_account_id: string;
  order_items:
    | {
        id: string;
        quantity: number;
        unit_price_minor: string | number;
        line_total_minor: string | number;
        item_snapshot: { title?: string } | null;
      }[]
    | null;
  order_adjustments: Adjustment[] | null;
  payment_attempts: unknown;
};

const STATE: Record<OrderState, MessageKey> = {
  draft: 'orders.stDraft',
  pending_payment: 'orders.stPending',
  awaiting_confirmation: 'orders.stConfirming',
  paid: 'orders.stPaid',
  partially_refunded: 'orders.stPartRefunded',
  refunded: 'orders.stRefunded',
  cancelled: 'orders.stCancelled',
  failed: 'orders.stFailed',
  expired: 'orders.stExpired',
};

const LINE: Record<OrderLineKind, MessageKey> = {
  subtotal: 'orders.lnSubtotal',
  discount: 'orders.lnDiscount',
  tax: 'orders.lnTax',
  fee: 'orders.lnFee',
};

const ADJUSTMENT: Record<AdjustmentKind, MessageKey> = {
  discount: 'orders.lnDiscount',
  tax: 'orders.lnTax',
  fee: 'orders.lnFee',
  other: 'orders.adjOther',
};

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'receipt');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('orders.receipt') };
}

/** One line a customer bought, with every figure already as it will be said. */
type Line = { id: string; title: string | null; quantity: number; total: string; unit: string };

/** Everything the sheet prints, or null when any of it cannot be said correctly. */
type Sheet = {
  number: string | null;
  state: OrderState;
  settled: boolean;
  placed: string | null;
  paid: string | null;
  lines: Line[];
  parts: { kind: OrderLineKind; value: string }[];
  adjustments: { id: string; kind: AdjustmentKind; value: string; note: string | null }[];
  total: string;
  refunds: ReceiptRefund[];
  returned: string | null;
  through: { name: string | null; reference: string | null } | null;
};

/**
 * A receipt, in the reader's language.
 *
 * The order list could say "paid" and nothing more, so a family had no document and no
 * reference — the only identifier was a UUID, which is not something anyone reads down
 * a phone. `order_number` is assigned by the database and cannot be rewritten, so the
 * number on this page is the number on the order.
 *
 * Every figure is read from the order, never recomputed here: a receipt that did its
 * own arithmetic could disagree with the bill. If the order has not been paid, the page
 * says so plainly and is not a receipt — that is the same honesty the rest of the money
 * path keeps about confirmation. What it says is that no payment has been confirmed,
 * which is what the platform knows. It used to say nothing had been charged, which a
 * payer who has just approved a prompt on a handset knows better than this page does.
 *
 * Since it was put into the reader's language:
 *
 * **The parts add up to the total.** The sheet listed the subtotal and the
 * discounts and then the total, and left tax and fees out, so a receipt with
 * a transfer fee on it did not add up. The parts are now the order's own
 * four figures (`orderLinesOf`), the same ones my orders prints, and each
 * line is the line's own total, where it was the price of one.
 *
 * **Nothing is printed as the database stores it.** An order's state, an
 * adjustment's kind and a refund's state are words from the catalogue. An
 * order or a refund in a state the page has no word for is not drawn at all:
 * whether money moved is what that state would have said, so the page can
 * call the order neither a receipt nor unpaid, and a refund listed with an
 * amount and nothing beside it would read as money returned. The payment service is named by
 * its own name (`MTN MoMo`), where the sheet printed its identifier with the
 * underscores taken out; a service this code has never heard of is not
 * named. What staff type when they record a payment by hand was printed
 * after "Confirmed by"; it is written for a colleague, and is not printed.
 *
 * **Unread is said.** An order that could not be read, a refund that could
 * not, or a figure that cannot be said correctly makes the page say that it
 * could not be read and that this changes nothing about what was paid. It
 * used to throw. A receipt with a line missing is not shown: it would not
 * add up, and somebody will hand it to somebody else.
 *
 * **An order that is not there and one that is not yours are the same
 * page**, the site's "not found", as before.
 *
 * **The sheet follows the reader's direction.** It was held left to right
 * because its words were English. Amounts, numbers and references are still
 * read left to right; a name, a title and a note find their own direction.
 *
 * Eighteen sentences in twenty-seven languages (`messages/receipt.ts`),
 * unreviewed, and the rest borrowed from my orders and the statement; a
 * language held for review reads the page in English, whole, under
 * `lang="en"`. The words "tax invoice" are a claim about a document's legal
 * standing and no lawyer has read them in any language.
 */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { id: raw } = await params;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    notFound();
  }
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/orders/${id}/receipt`)}`);

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const when = (iso: string | null) => (iso ? formatDateTime(shown.code, iso, 'UTC') || null : null);

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, currency_code, subtotal_minor, discount_minor, ' +
        'tax_minor, fee_minor, total_minor, created_at, paid_at, learner_profile_id, ' +
        'billing_account_id, ' +
        'order_items ( id, quantity, unit_price_minor, line_total_minor, item_snapshot ), ' +
        'order_adjustments ( id, adjustment_type, direction, amount_minor, ' +
        'currency_code, description, voided_at ), ' +
        'payment_attempts ( id, provider, provider_reference, status )',
    )
    .eq('id', id)
    .maybeSingle();

  // Read, and nothing there: not yours, or not an order. The same page for both.
  if (!error && !data) notFound();

  const order = error ? null : (data as unknown as OrderRow);

  // Read through the caller's own policies: a guardian sees the learner's name, a
  // billing manager who pays for a family they do not parent does not — and the
  // receipt is still complete without it. So a name that did not come is left
  // out; a refund that did not come is not, because the total depends on it.
  let accountName: string | null = null;
  let learnerName: string | null = null;
  let sheet: Sheet | null = null;
  let why = error?.message ?? null;

  if (order) {
    const [account, learner, refunds] = await Promise.all([
      supabase.from('billing_accounts').select('display_name').eq('id', order.billing_account_id).maybeSingle(),
      order.learner_profile_id
        ? supabase.from('learner_profiles').select('display_name').eq('id', order.learner_profile_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('refund_transactions').select('id, amount_minor, currency_code, status, refunded_at').eq('order_id', order.id),
    ]);
    accountName = (account.data as { display_name?: string } | null)?.display_name?.trim() || null;
    learnerName = (learner.data as { display_name?: string } | null)?.display_name?.trim() || null;

    const built = refunds.error ? null : sheetOf(order, refunds.data, when);
    if (built) sheet = built;
    else why = refunds.error?.message ?? 'a figure or the state of the order cannot be shown';
  }

  if (!sheet) {
    // The reason goes to the log. The reader is told what it means for them.
    console.error('[receipt] order unread:', why);
    return (
      <div className="page receipt-page" {...frame}>
        <p className="eyebrow no-print">
          <Link href="/orders">{t('orders.title')}</Link>
        </p>
        <div className="notice error" role="alert" data-receipt="unread">
          {t('receipt.unread')}
        </div>
        <p className="receipt-links no-print">
          <Link href="/billing">{t('orders.billing')}</Link>
          {' · '}
          <Link href="/support">{t('footer.help')}</Link>
        </p>
      </div>
    );
  }

  const { settled, state } = sheet;

  return (
    <div className="page receipt-page" {...frame}>
      <div className="receipt-bar no-print">
        <p className="eyebrow">
          <Link href="/orders">{t('orders.title')}</Link>
        </p>
        <PrintReceiptButton label={t('receipt.print')} />
      </div>

      {/* Printed too. It used to be left off the paper, where it matters most:
          a sheet somebody is handed is the one that must say what it is not. */}
      {!settled && (
        <div className="notice warn" role="status" data-receipt="not-a-receipt">
          <strong>{t('receipt.notLead')}</strong> {t('receipt.notBody')}
        </div>
      )}

      <article className="receipt-sheet" data-receipt={settled ? 'receipt' : 'order'} data-state={state}>
        <header className="receipt-head">
          <div>
            <p className="receipt-brand">
              <BrandMark className="certificate-mark" size={16} /> <bdi dir="ltr">AyahSpring</bdi>
            </p>
            <h1>{settled ? t('orders.receipt') : t('orders.anOrder')}</h1>
            <p className="receipt-state"><span className={`badge ${state === 'paid' ? 'ok' : 'neutral'}`}>{t(STATE[state])}</span></p>
          </div>
          <div className="receipt-number">
            {sheet.number && (
              <strong data-number>
                <Ending words={t('receipt.number')} gap="number" value={sheet.number} ltr />
              </strong>
            )}
            {sheet.placed && (
              <span className="receipt-meta">
                <Ending words={t('orders.placedOn')} gap="date" value={sheet.placed} />
              </span>
            )}
            {settled && sheet.paid && (
              <span className="receipt-meta" data-paid-on>
                <Ending words={t('receipt.paidOn')} gap="date" value={sheet.paid} />
              </span>
            )}
          </div>
        </header>

        {(accountName || learnerName) && (
          <div className="receipt-people">
            {accountName && (
              <p data-billed-to>
                <Ending words={t('receipt.billedTo')} gap="name" value={accountName} />
              </p>
            )}
            {learnerName && (
              <p data-for>
                <Ending words={t('receipt.forLearner')} gap="name" value={learnerName} />
              </p>
            )}
          </div>
        )}

        {/* A list, not a table: three columns do not fit a phone, and the
            one that went off the side was the amount. */}
        {sheet.lines.length === 0 ? (
          <p className="muted receipt-none" data-lines="none">{t('receipt.noLines')}</p>
        ) : (
          <ul className="receipt-lines" data-lines="list">
            {sheet.lines.map((line) => (
              <li key={line.id}>
                <div className="receipt-line">
                  {/* What was sold is the teacher's own text, as it was at checkout. */}
                  <span>{line.title ? <bdi>{line.title}</bdi> : t('receipt.anItem')}</span>
                  <strong><bdi dir="ltr">{line.total}</bdi></strong>
                </div>
                {line.quantity > 1 && (
                  <p className="receipt-meta">
                    <Ending words={t('receipt.qty')} gap="count" value={String(line.quantity)} ltr />
                    {' · '}
                    <Ending words={t('receipt.unit')} gap="amount" value={line.unit} ltr />
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="receipt-total" data-total>
          {sheet.parts.map((part) => (
            <p key={part.kind} data-part={part.kind}>
              <Ending words={t(LINE[part.kind])} gap="amount" value={part.value} ltr />
            </p>
          ))}
          {sheet.adjustments.map((a) => (
            <p key={a.id} className="receipt-meta receipt-adjustment" data-adjustment>
              <Ending words={t(ADJUSTMENT[a.kind])} gap="amount" value={a.value} ltr />
              {/* Whoever wrote the note wrote it in their own language. The
                  space before it is the line's, not the note's. */}
              {a.note && <> <bdi dir="auto" className="order-note">{a.note}</bdi></>}
            </p>
          ))}
          <p className="receipt-due" data-due={settled ? 'paid' : 'to-pay'}>
            <strong>
              <Ending words={t(settled ? 'receipt.totalPaid' : 'receipt.totalDue')} gap="amount" value={sheet.total} ltr />
            </strong>
          </p>
          {sheet.returned && (
            <p data-returned>
              <Ending words={t('billing.mvReturned')} gap="amount" value={sheet.returned} ltr />
            </p>
          )}
        </div>

        {settled && (
          <section className="receipt-payment" data-payment>
            <h2>{t('billing.mvPayment')}</h2>
            {sheet.through?.name ? (
              <p data-through>
                <Ending words={t('receipt.through')} gap="provider" value={sheet.through.name} ltr />
              </p>
            ) : (
              // Recorded another way, or through a service this code cannot
              // name: confirmed is what is known, and it is all that is said.
              <p data-through="unnamed">{t('orders.paidLead')}</p>
            )}
            {sheet.through?.reference && (
              <p data-reference>
                <Ending words={t('receipt.reference')} gap="reference" value={sheet.through.reference} ltr />
              </p>
            )}
            {sheet.refunds.length > 0 && (
              <ul className="receipt-refunds">
                {sheet.refunds.map((refund) => {
                  const done = refund.state === 'completed' ? when(refund.refundedAt) : null;
                  return (
                    <li key={refund.id} data-refund={refund.state}>
                      <Ending words={t('billing.wtRefund')} gap="amount" value={amountOf(refund.amountMinor, refund.currencyCode) ?? ''} ltr />
                      {/* Only a completed refund has returned anything, and only it is given a date. */}
                      {done && <span className="order-rule"><Ending words={t('receipt.rfDoneOn')} gap="date" value={done} /></span>}
                      {refund.state === 'pending' && <span className="order-rule">{t('billing.rfPending')}</span>}
                      {refund.state === 'failed' && <span className="order-rule">{t('billing.rfFailed')}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <footer className="receipt-foot">
          <p>{t('receipt.record')}</p>
        </footer>
      </article>

      <p className="receipt-links no-print">
        <Link href="/orders">{t('orders.title')}</Link>
        {' · '}
        <Link href="/billing">{t('orders.billing')}</Link>
      </p>
    </div>
  );
}

/**
 * The order as the sheet will print it, or null.
 *
 * Every figure is made sayable here, before anything is drawn, so that the
 * page is either a whole receipt or the sentence that says it could not be
 * read. Nothing is added up except what has been returned, which the order
 * does not carry.
 */
function sheetOf(order: OrderRow, refundRows: unknown, when: (iso: string | null) => string | null): Sheet | null {
  const currency = order.currency_code;
  const money = (value: unknown) => {
    const minor = minorOf(value);
    return minor === null ? null : amountOf(minor, currency);
  };

  const total = money(order.total_minor);
  const figures = {
    subtotalMinor: minorOf(order.subtotal_minor),
    discountMinor: minorOf(order.discount_minor ?? 0),
    taxMinor: minorOf(order.tax_minor ?? 0),
    feeMinor: minorOf(order.fee_minor ?? 0),
  };
  if (total === null || figures.subtotalMinor === null || figures.discountMinor === null || figures.taxMinor === null || figures.feeMinor === null) return null;

  const parts: Sheet['parts'] = [];
  for (const part of orderLinesOf(figures as { subtotalMinor: string; discountMinor: string; taxMinor: string; feeMinor: string })) {
    const amount = amountOf(part.minor, currency);
    if (amount === null) return null;
    parts.push({ kind: part.kind, value: `${part.sign}${amount}` });
  }

  const lines: Line[] = [];
  for (const item of order.order_items ?? []) {
    const lineTotal = money(item.line_total_minor);
    const unit = money(item.unit_price_minor);
    if (lineTotal === null || unit === null || !Number.isSafeInteger(item.quantity) || item.quantity < 1) return null;
    lines.push({ id: item.id, title: item.item_snapshot?.title?.trim() || null, quantity: item.quantity, total: lineTotal, unit });
  }

  // What was withdrawn is history, and my orders shows it. A receipt carries
  // what the total is made of now.
  const adjustments: Sheet['adjustments'] = [];
  for (const a of order.order_adjustments ?? []) {
    if (a.voided_at) continue;
    const minor = minorOf(a.amount_minor);
    const amount = minor === null ? null : amountOf(minor, a.currency_code);
    if (amount === null) return null;
    adjustments.push({ id: a.id, kind: adjustmentKindOf(a.adjustment_type), value: `${a.direction === 'credit' ? '−' : '+'}${amount}`, note: a.description?.trim() || null });
  }

  const refunds = receiptRefundsOf(refundRows);
  if (refunds === null) return null;
  const returnedMinor = returnedMinorOf(refunds, currency);
  if (returnedMinor === null) return null;
  const returned = /^0*$/u.test(returnedMinor) ? null : amountOf(returnedMinor, currency);
  if (returned === null && !/^0*$/u.test(returnedMinor)) return null;

  // A state this page has never heard of. Whether it means money moved is
  // exactly what is not known, so the page calls it neither a receipt nor an
  // unpaid order: it says the order could not be read.
  const state = orderStateOf(order.status);
  if (state === null) return null;
  const settled = isSettled(state);
  const paidThrough = settled ? paidThroughOf(order.payment_attempts) : null;
  const number = order.order_number === null || order.order_number === undefined ? '' : String(order.order_number).trim();

  return {
    number: number || null,
    state,
    settled,
    placed: when(order.created_at),
    paid: when(order.paid_at),
    lines,
    parts,
    adjustments,
    total,
    refunds,
    returned,
    through: paidThrough ? { name: providerNameOf(paidThrough.provider), reference: paidThrough.providerReference } : null,
  };
}
