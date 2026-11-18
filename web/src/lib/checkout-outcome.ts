/**
 * What the course checkout and its price check were answered with, as names.
 *
 * `/api/checkout` and `/api/checkout/quote` answer a refusal with a sentence,
 * and the form on the buy page printed it. The sentence was English on a page
 * written in the reader's language, and for a refusal nobody had anticipated
 * it was the database's own.
 *
 * `lib/checkout.ts` already matched the writer's refusals by key rather than
 * by prose (`checkout:<key>`, `promotion:<key>`), and then threw the key away,
 * keeping a coarser code for the status. This file keeps it: the routes send
 * the key as `reason`, and the form says its own sentence for each.
 *
 * Three decisions live here because they are easy to get wrong:
 *
 * 1. **Which database errors are an answer.** A refusal carries a
 *    five-character SQLSTATE and was rolled back with it. An error without
 *    one, or in class 08 (the connection), is not the database's answer: the
 *    order may exist. That is `unconfirmed`.
 * 2. **Which replies the form may call a refusal.** One that names a reason
 *    in this file **and arrives with that reason's own status**. This is
 *    stricter than "anything in the four hundreds": this route answers 503
 *    for a closed checkout and 502 for a provider that would not start, on
 *    purpose, so the status alone cannot separate our answer from a page
 *    sent by something in front of the site. The pair can.
 * 3. **What "unconfirmed" tells a buyer to do.** Look in their orders before
 *    pressing again. An order is written before the provider is called, so a
 *    reply that never came can leave one behind.
 *
 * Kept apart from `checkout.ts` so a browser can import it without the
 * queries.
 */

/** Reasons the order writer and the price check name (`checkout:<key>`, `promotion:<key>`). */
const WRITER_REASONS = [
  'not_signed_in',
  'disabled',
  'course_not_available',
  'price_not_available',
  'not_one_time',
  'no_price_for_country',
  'price_ambiguous',
  'already_owned',
  'learner_required',
  'learner_not_yours',
  'unknown_code',
  'not_active',
  'not_running',
  'not_in_market',
  'not_for_this_course',
  'self_referral',
  'new_customers_only',
  'limit_reached_total',
  'limit_reached_person',
  'limit_reached_family',
  'would_be_free',
  'currency_mismatch',
  'nothing_off',
] as const;

/** Reasons the route itself decides, before or after the writer. */
const ROUTE_REASONS = [
  'malformed',
  'free_course',
  'withdrawal_not_recorded',
  'provider_unavailable',
  'phone_invalid',
  'provider_failed',
  'refused',
  'unconfirmed',
] as const;

export type CheckoutReason = (typeof WRITER_REASONS)[number] | (typeof ROUTE_REASONS)[number];

export const CHECKOUT_REASONS: readonly CheckoutReason[] = [...WRITER_REASONS, ...ROUTE_REASONS];

const isReason = (value: unknown): value is CheckoutReason =>
  typeof value === 'string' && (CHECKOUT_REASONS as readonly string[]).includes(value);

/** A key from `checkout:<key>` or `promotion:<key>` that the form has a sentence for. */
export function writerReasonOf(key: string | null | undefined): CheckoutReason | null {
  return typeof key === 'string' && (WRITER_REASONS as readonly string[]).includes(key)
    ? (key as CheckoutReason)
    : null;
}

/**
 * The status each reason is answered with.
 *
 * These are the statuses the two routes already used, kept, with two
 * corrections: the writer's own "nobody is signed in" and "no learner named"
 * were both answered 500, as though the site had broken.
 */
export function checkoutStatusOf(reason: CheckoutReason): number {
  switch (reason) {
    case 'not_signed_in': return 401;
    case 'malformed':
    case 'learner_required':
    case 'phone_invalid': return 400;
    case 'learner_not_yours': return 403;
    case 'course_not_available': return 404;
    // The platform is closed, or has nobody to take the money. Not the
    // buyer's mistake (400) and not a fault (500).
    case 'disabled':
    case 'provider_unavailable': return 503;
    case 'provider_failed':
    case 'unconfirmed': return 502;
    // A refusal nobody anticipated stays loud.
    case 'refused': return 500;
    default: return 409;
  }
}

/**
 * What the form says about a reply that was not a success.
 *
 * `unconfirmed` is the answer for everything that is not plainly ours.
 */
export function checkoutOutcomeOf(status: number, reason: unknown): CheckoutReason {
  if (!isReason(reason) || checkoutStatusOf(reason) !== status) return 'unconfirmed';
  return reason;
}

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * The reason behind a database error from the order writer or the price check.
 *
 * A named key the form knows is that reason. A key it does not know, or no
 * key, is `refused` when the database answered and `unconfirmed` when it did
 * not.
 */
export function checkoutReasonOf(error: DatabaseError): CheckoutReason {
  const state = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(state) || state.startsWith('08')) return 'unconfirmed';
  const key = /(?:checkout|promotion):([a-z_]+)/iu.exec(error.message ?? '')?.[1]?.toLowerCase();
  return writerReasonOf(key) ?? 'refused';
}

/**
 * The English the routes send beside a reason nobody wrote a sentence for.
 * The database's own sentence stays on the server.
 */
export const CHECKOUT_REFUSED_SENTENCE = 'The order could not be placed. Nothing has been charged.';
export const CHECKOUT_UNCONFIRMED_SENTENCE =
  'We could not confirm whether your order was placed. Look at your orders before trying again.';
export const QUOTE_FAILED_SENTENCE = 'That price could not be worked out. Try again.';

/**
 * The labels `quoteCourseOrder()` fills in when the database names no tax or
 * fee. The form says its own word for these two and shows any other label as
 * the database wrote it.
 */
export const QUOTE_TAX_LABEL = 'Tax';
export const QUOTE_FEE_LABEL = 'Fee';
