/**
 * What "My orders" is told, as names.
 *
 * `/orders` was English for every reader. Its refund form printed whatever
 * sentence `/api/refunds` sent back, which for a closed window was the
 * database's own with the first letter raised, and for a refusal nobody had
 * anticipated was the database's own untouched. Its code form printed
 * `/api/orders/promotion`'s. This file is the names: each route sends one as
 * `reason` with a status of its own, and each form says its own sentence for
 * it, in the reader's language (`messages/orders.ts`).
 *
 * The same three rules as the checkout's names (`checkout-outcome.ts`):
 *
 * 1. A database error with a five-character SQLSTATE outside class 08 is the
 *    database's answer. Anything else is not, and something may have been
 *    written: that is `unconfirmed`, and the reader is sent to reload before
 *    trying again.
 * 2. A form believes a reason only when it arrives with that reason's own
 *    status.
 * 3. A refusal nobody named is `failed`. The database's sentence stays in
 *    the server's log.
 *
 * `not_yours` is one name for an order on somebody else's account and an id
 * that names no order. The reader can do the same thing about both, and
 * saying which would tell a stranger that an order with that id exists.
 *
 * Kept free of queries so a browser can import it.
 */

// ---------------------------------------------------------------------------
// An order's state
// ---------------------------------------------------------------------------

/** Every state `orders.status` allows. */
export const ORDER_STATES = [
  'draft', 'pending_payment', 'awaiting_confirmation', 'paid', 'partially_refunded', 'refunded', 'cancelled', 'failed', 'expired',
] as const;
export type OrderState = (typeof ORDER_STATES)[number];

/** A state this page has a word for, or null: the database's word is never printed. */
export function orderStateOf(value: unknown): OrderState | null {
  return typeof value === 'string' && (ORDER_STATES as readonly string[]).includes(value) ? (value as OrderState) : null;
}

/** Money has moved on this order, so a receipt exists. A refund is a line on it, not a reason to withdraw it. */
export function isSettled(state: OrderState | null): boolean {
  return state === 'paid' || state === 'partially_refunded' || state === 'refunded';
}

/** A refund could conceivably be asked for: something was paid and not all of it has gone back. */
export function mayAskRefund(state: OrderState | null): boolean {
  return state === 'paid' || state === 'partially_refunded';
}

// ---------------------------------------------------------------------------
// What a total is made of
// ---------------------------------------------------------------------------

export type OrderLineKind = 'subtotal' | 'discount' | 'tax' | 'fee';
export type OrderLine = { kind: OrderLineKind; minor: string; sign: '' | '−' | '+' };

const isZero = (minor: string) => /^-?0*$/u.test(minor.trim());

/**
 * How the total is made up, or nothing when the total is the whole story,
 * which it is for nearly every order. The parts have to be visible for a
 * total with a fee in it to be checkable; a breakdown that repeats the total
 * is noise.
 */
export function orderLinesOf(totals: { subtotalMinor: string; discountMinor: string; taxMinor: string; feeMinor: string }): OrderLine[] {
  const { subtotalMinor, discountMinor, taxMinor, feeMinor } = totals;
  if (isZero(discountMinor) && isZero(taxMinor) && isZero(feeMinor)) return [];
  const lines: OrderLine[] = [{ kind: 'subtotal', minor: subtotalMinor, sign: '' }];
  if (!isZero(discountMinor)) lines.push({ kind: 'discount', minor: discountMinor, sign: '−' });
  if (!isZero(taxMinor)) lines.push({ kind: 'tax', minor: taxMinor, sign: '+' });
  if (!isZero(feeMinor)) lines.push({ kind: 'fee', minor: feeMinor, sign: '+' });
  return lines;
}

export type AdjustmentKind = 'discount' | 'tax' | 'fee' | 'other';

/** The word an adjustment is named by. A kind this page has no word for is "an adjustment". */
export function adjustmentKindOf(type: unknown): AdjustmentKind {
  switch (type) {
    case 'manual_discount':
    case 'promotion': return 'discount';
    case 'tax': return 'tax';
    case 'fee': return 'fee';
    default: return 'other';
  }
}

// ---------------------------------------------------------------------------
// Why a refund can or cannot be asked for
// ---------------------------------------------------------------------------

/**
 * What `refund_standing()` said, as the page draws it.
 *
 * `unread` is every answer the page cannot stand behind: no answer, a reason
 * it does not know, "allowed" with no closing date. It is said as unread and
 * is never drawn as a closed window, which is a different fact.
 */
export type RefundStandingShown =
  | { kind: 'open'; closesAt: string; rule: RefundRule; refundableMinor: string; currencyCode: string }
  | { kind: 'closed'; closedAt: string | null; rule: RefundRule }
  | { kind: 'nothing_left' }
  | { kind: 'unread' };

/** Which clock the order is on, when the database said. */
export type RefundRule = 'law' | 'waived' | null;

export function refundRuleOf(rule: unknown): RefundRule {
  return rule === 'statutory_14_days' ? 'law' : rule === 'waived_policy_window' ? 'waived' : null;
}

type StandingRead = {
  reason: string;
  allowed: boolean;
  asStaff: boolean;
  closesAt: string | null;
  refundableMinor: string;
  currencyCode: string;
  withdrawalRule: string | null;
};

export function refundStandingShownOf(standing: StandingRead | null): RefundStandingShown {
  if (!standing) return { kind: 'unread' };
  const rule = refundRuleOf(standing.withdrawalRule);
  if (standing.reason === 'nothing_left') return { kind: 'nothing_left' };
  if (standing.reason === 'window_closed') return { kind: 'closed', closedAt: standing.closesAt, rule };
  if (standing.reason === 'allowed' && standing.allowed) {
    // Whole minor units, more than none, and a date to say. Staff are
    // allowed whatever the clock says, so for them a date that has passed
    // is not a closing date and is not said as one.
    const closes = standing.closesAt ? Date.parse(standing.closesAt) : Number.NaN;
    if (!/^[1-9]\d*$/u.test(standing.refundableMinor) || !/^[A-Z]{3}$/u.test(standing.currencyCode)) return { kind: 'unread' };
    if (Number.isNaN(closes) || standing.asStaff) return { kind: 'unread' };
    return { kind: 'open', closesAt: standing.closesAt as string, rule, refundableMinor: standing.refundableMinor, currencyCode: standing.currencyCode };
  }
  return { kind: 'unread' };
}

// ---------------------------------------------------------------------------
// Asking for a refund
// ---------------------------------------------------------------------------

export const REFUND_ASK_REASONS = [
  'reason_required', 'too_long', 'not_yours', 'not_paid', 'too_much', 'window_closed', 'not_signed_in', 'malformed', 'failed', 'unconfirmed',
] as const;
export type RefundAskReason = (typeof REFUND_ASK_REASONS)[number];

/** How long a reason may be. */
export const REFUND_REASON_MAX = 1000;

type DatabaseError = { code?: string | null; message?: string | null };

const answered = (error: DatabaseError): boolean => {
  const state = error.code ?? '';
  return /^[0-9A-Z]{5}$/u.test(state) && !state.startsWith('08');
};

/**
 * The words `request_refund()` and the trigger behind it refuse with. They
 * are prose, not keys, so they are matched here in one place, and a test
 * reads them out of the migrations so that a reworded refusal fails there
 * rather than turning into "could not be sent" for a customer.
 */
export const REFUND_REFUSAL_WORDS: readonly (readonly [string, RefundAskReason])[] = [
  ['sign in to request a refund', 'not_signed_in'],
  ['order not found', 'not_yours'],
  ['you are not on the billing account for this order', 'not_yours'],
  ['so there is nothing to refund', 'not_paid'],
  ['exceeds the refundable balance', 'too_much'],
  ['the refund window closed on', 'window_closed'],
  ['say what the refund is for', 'reason_required'],
];

/** The reason behind a database error from `request_refund()`. */
export function refundAskReasonOf(error: DatabaseError): RefundAskReason {
  if (!answered(error)) return 'unconfirmed';
  const said = (error.message ?? '').toLowerCase();
  return REFUND_REFUSAL_WORDS.find(([words]) => said.includes(words))?.[1] ?? 'failed';
}

export function refundAskStatusOf(reason: RefundAskReason): number {
  switch (reason) {
    case 'not_signed_in': return 401;
    case 'malformed':
    case 'reason_required':
    case 'too_long': return 400;
    case 'not_yours': return 403;
    case 'failed': return 500;
    case 'unconfirmed': return 502;
    // The order's own state, or the clock: not a mistake in what was sent.
    default: return 409;
  }
}

/** What the form says about a reply that was not a success. */
export function refundAskOutcomeOf(status: number, reason: unknown): RefundAskReason {
  const known = typeof reason === 'string' && (REFUND_ASK_REASONS as readonly string[]).includes(reason);
  return known && refundAskStatusOf(reason as RefundAskReason) === status ? (reason as RefundAskReason) : 'unconfirmed';
}

/**
 * The English a route sends beside a reason, for a caller that is not the
 * form. Ours, one for each reason; never the database's.
 */
export const REFUND_ASK_ENGLISH: Record<RefundAskReason, string> = {
  reason_required: 'Say what the refund is for.',
  too_long: `Please keep it under ${REFUND_REASON_MAX} characters.`,
  not_yours: 'That order is not on your billing account.',
  not_paid: 'That order has not been paid, so there is nothing to refund.',
  too_much: 'That is more than is left to refund on this order.',
  window_closed: 'The time for asking for a refund on this order has ended.',
  not_signed_in: 'Sign in to request a refund.',
  malformed: 'That request could not be read.',
  failed: 'The request could not be sent. Nothing was changed.',
  unconfirmed: 'We could not confirm whether that was recorded. Reload the page before trying again.',
};

// ---------------------------------------------------------------------------
// A code on an unpaid order
// ---------------------------------------------------------------------------

/** What the code itself can be refused for. The buy page's names, and its sentences. */
export const CODE_REFUSALS = [
  'unknown_code', 'not_active', 'not_running', 'not_in_market', 'not_for_this_course', 'self_referral', 'new_customers_only',
  'limit_reached_total', 'limit_reached_person', 'limit_reached_family', 'would_be_free', 'currency_mismatch', 'nothing_off',
] as const;

export const ORDER_CODE_REASONS = [
  ...CODE_REFUSALS,
  'order_not_pending', 'already_applied', 'none_applied', 'not_yours', 'not_signed_in', 'malformed', 'failed', 'unconfirmed',
] as const;
export type OrderCodeReason = (typeof ORDER_CODE_REASONS)[number];

/** The reason behind a database error from `apply_promotion_to_order()` or `remove_promotion_from_order()`. */
export function orderCodeReasonOf(error: DatabaseError): OrderCodeReason {
  if (!answered(error)) return 'unconfirmed';
  const key = /promotion:([a-z_]+)/iu.exec(error.message ?? '')?.[1]?.toLowerCase();
  switch (key) {
    case 'order_not_found':
    case 'not_your_order': return 'not_yours';
    case 'code_required': return 'malformed';
    case 'order_not_pending':
    case 'already_applied':
    case 'none_applied':
    case 'not_signed_in': return key;
    default:
      return key && (CODE_REFUSALS as readonly string[]).includes(key) ? (key as OrderCodeReason) : 'failed';
  }
}

export function orderCodeStatusOf(reason: OrderCodeReason): number {
  switch (reason) {
    case 'not_signed_in': return 401;
    case 'malformed': return 400;
    case 'not_yours': return 403;
    case 'failed': return 500;
    case 'unconfirmed': return 502;
    default: return 409;
  }
}

export function orderCodeOutcomeOf(status: number, reason: unknown): OrderCodeReason {
  const known = typeof reason === 'string' && (ORDER_CODE_REASONS as readonly string[]).includes(reason);
  return known && orderCodeStatusOf(reason as OrderCodeReason) === status ? (reason as OrderCodeReason) : 'unconfirmed';
}

/** One English sentence beside any code refusal, for a caller that is not the form. */
export const ORDER_CODE_ENGLISH = 'That could not be changed. Nothing was charged.';
