/**
 * What a receipt may say, as rules a test can hold.
 *
 * `/orders/<id>/receipt` is the document a payer keeps. It was English for
 * every reader and printed four things as the database stores them: an
 * order's state it had no label for, an adjustment's type, a refund's state
 * (`Refund pending`) and the payment service's identifier with its
 * underscores taken out (`mtn momo ug`). It also printed, after "Confirmed
 * by", whatever a member of staff typed when recording a payment by hand,
 * which was written for a colleague and not for the customer.
 *
 * The page now says its own words for each (`messages/receipt.ts`, and the
 * words of my orders and of the statement). This file is the part of that
 * with a rule in it.
 *
 * Kept free of queries, so a test can import it.
 */

import { amountOf } from './sponsorship-outcome.ts';

/** What `refund_transactions.status` allows. */
export const REFUND_STATES = ['pending', 'completed', 'failed'] as const;
export type RefundState = (typeof REFUND_STATES)[number];

/** A refund's state when the page has a sentence for it, or null: the stored word is never printed. */
export function refundStateOf(status: unknown): RefundState | null {
  return typeof status === 'string' && (REFUND_STATES as readonly string[]).includes(status) ? (status as RefundState) : null;
}

/** A whole, non-negative number of minor units as the database sends it (a JSON number or a string), or null. */
export function minorOf(value: unknown): string | null {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  if (typeof value !== 'string') return null;
  const digits = value.trim();
  return /^\d{1,18}$/u.test(digits) ? digits : null;
}

export type ReceiptRefund = {
  id: string;
  amountMinor: string;
  currencyCode: string;
  state: RefundState;
  refundedAt: string | null;
};

/**
 * The refunds on an order, or null when one of them cannot be shown.
 *
 * Null is "not read". A receipt that left out a refund it could not show
 * would say more was kept than was, so the page says the whole order could
 * not be read instead.
 *
 * A refund in a state this code has no sentence for is one it cannot show. It
 * used to be listed with its amount and nothing beside it, which reads as
 * money returned on a sheet whose "returned" total had left it out. A
 * completed refund with no date it completed on is refused the same way: the
 * table does not allow one (`rt_completed_agrees`), so one arriving means
 * this is not the row the page thinks it is.
 */
export function receiptRefundsOf(rows: unknown): ReceiptRefund[] | null {
  if (!Array.isArray(rows)) return null;
  const out: ReceiptRefund[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    const amountMinor = minorOf(r.amount_minor);
    if (typeof r.id !== 'string' || amountMinor === null || typeof r.currency_code !== 'string') return null;
    if (amountOf(amountMinor, r.currency_code) === null) return null;
    const state = refundStateOf(r.status);
    if (state === null) return null;
    const refundedAt = typeof r.refunded_at === 'string' && !Number.isNaN(Date.parse(r.refunded_at)) ? r.refunded_at : null;
    if ((state === 'completed') !== (refundedAt !== null)) return null;
    out.push({
      id: r.id,
      amountMinor,
      currencyCode: r.currency_code,
      state,
      refundedAt,
    });
  }
  return out;
}

/**
 * What has gone back on an order, in minor units of the order's currency.
 *
 * Only a completed refund counts: one that was asked for, is being sent or
 * was refused has returned nothing. Null when a completed refund is in
 * another currency than the order, because two currencies cannot be added
 * and a total that left one out would be wrong.
 */
export function returnedMinorOf(refunds: readonly ReceiptRefund[], orderCurrency: string): string | null {
  let sum = 0n;
  for (const refund of refunds) {
    if (refund.state !== 'completed') continue;
    if (refund.currencyCode !== orderCurrency) return null;
    sum += BigInt(refund.amountMinor);
  }
  return sum.toString();
}

export type PaymentAttempt = { provider: string; providerReference: string | null };

/**
 * The attempt that paid, or null.
 *
 * An order can have several attempts (a number mistyped, a prompt left to
 * expire) and only one of them moved money. With none marked as succeeded
 * the payment was recorded another way, and the receipt says only that it
 * was confirmed.
 */
export function paidThroughOf(attempts: unknown): PaymentAttempt | null {
  if (!Array.isArray(attempts)) return null;
  for (const row of attempts) {
    if (!row || typeof row !== 'object') continue;
    const a = row as Record<string, unknown>;
    if (a.status !== 'succeeded' || typeof a.provider !== 'string') continue;
    const reference = typeof a.provider_reference === 'string' ? a.provider_reference.trim() : '';
    return { provider: a.provider, providerReference: reference || null };
  }
  return null;
}
