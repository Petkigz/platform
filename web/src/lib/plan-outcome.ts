/**
 * What asking to pay for a plan was answered with, as names.
 *
 * `/api/checkout` answered a plan with whatever sentence `create_plan_order()`
 * raised, and the plans page printed it: English, for every reader, and the
 * database's own. A course and a pledge already had names
 * (`lib/checkout-outcome.ts`); this is the same for a plan.
 *
 * **The writer names nothing.** A course order refuses with a key
 * (`checkout:<key>`); `create_plan_order()` refuses in prose, except for
 * `checkout:disabled`. So a refusal is recognised by the words the function
 * raises, and a test reads every `raise exception` out of the migration and
 * requires each to be recognised here: a sentence added to the function
 * without a name is a failing test, not an English sentence on somebody's
 * screen.
 *
 * Kept free of queries and of the catalogue, so the form in the browser can
 * import it.
 */

import { checkoutStatusOf } from './checkout-outcome.ts';

/** Refusals that are about the plan, its price or who it is for. */
export const PLAN_REASONS = [
  'plan_not_available',
  'price_not_available',
  'no_slot',
  'already_subscribed',
  'account_not_yours',
  'learner_not_yours',
] as const;
export type PlanReason = (typeof PLAN_REASONS)[number];

/** Every reason the route can answer a plan with. */
export type PlanOutcome =
  | PlanReason
  | 'not_signed_in'
  | 'disabled'
  | 'malformed'
  | 'learner_required'
  | 'phone_invalid'
  | 'provider_unavailable'
  | 'provider_failed'
  | 'refused'
  | 'unconfirmed';

export const PLAN_OUTCOMES: readonly PlanOutcome[] = [
  ...PLAN_REASONS,
  'not_signed_in',
  'disabled',
  'malformed',
  'learner_required',
  'phone_invalid',
  'provider_unavailable',
  'provider_failed',
  'refused',
  'unconfirmed',
];

export function planStatusOf(reason: PlanOutcome): number {
  switch (reason) {
    case 'plan_not_available': return 404;
    case 'account_not_yours':
    case 'learner_not_yours': return 403;
    case 'price_not_available':
    case 'no_slot':
    case 'already_subscribed': return 409;
    default: return checkoutStatusOf(reason);
  }
}

/**
 * The words `create_plan_order()` raises, and the name for each.
 *
 * In the function's own order. "That learner profile is not available" and
 * the two refusals of somebody else's learner are one name: a page that told
 * them apart would be telling a stranger that a profile with that id exists.
 */
const WRITER_SENTENCES: readonly (readonly [RegExp, PlanOutcome])[] = [
  [/sign in to start a subscription/iu, 'not_signed_in'],
  [/checkout:disabled/iu, 'disabled'],
  [/cannot pay from that billing account/iu, 'account_not_yours'],
  [/plan version is not currently available/iu, 'plan_not_available'],
  [/price is not currently available for this plan version/iu, 'price_not_available'],
  [/price is not available in the billing account country/iu, 'price_not_available'],
  [/learner profile is not available/iu, 'learner_not_yours'],
  [/plan has no adult learner slots/iu, 'no_slot'],
  [/adult subscription slot may only be assigned to your own learner profile/iu, 'learner_not_yours'],
  [/plan has no child learner slots/iu, 'no_slot'],
  [/only an active family member may select this child/iu, 'learner_not_yours'],
  [/already has a pending or unexpired subscription to that plan/iu, 'already_subscribed'],
];

/** The name for one sentence the writer raised, or null when it has none. */
export function planSentenceReason(message: string | null | undefined): PlanOutcome | null {
  for (const [pattern, reason] of WRITER_SENTENCES) if (pattern.test(message ?? '')) return reason;
  return null;
}

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * The reason behind a database error from `create_plan_order()`.
 *
 * The same rule as for a course and a pledge: a five-character SQLSTATE
 * outside class 08 is the database's answer, and the order was rolled back
 * with it. Anything else is not an answer, and an order may exist.
 */
export function planReasonOf(error: DatabaseError): PlanOutcome {
  const state = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(state) || state.startsWith('08')) return 'unconfirmed';
  return planSentenceReason(error.message) ?? 'refused';
}

/**
 * What the form says about a reply that was not a success: a reason it
 * knows, arriving with that reason's own status, or `unconfirmed`.
 */
export function planOutcomeOf(status: number, reason: unknown): PlanOutcome {
  const known = typeof reason === 'string' && (PLAN_OUTCOMES as readonly string[]).includes(reason);
  if (!known || planStatusOf(reason as PlanOutcome) !== status) return 'unconfirmed';
  return reason as PlanOutcome;
}

/**
 * Whether an order for the plan is left behind by this outcome.
 *
 * `create_plan_order()` writes the order and a **pending subscription**
 * together, and refuses a second one for the same plan while the first is
 * pending. So after the order is written, a payment that could not be started
 * cannot simply be tried again: the pending subscription has to be cancelled
 * first, on the subscriptions page. The form says so. (A course order has no
 * such thing behind it.)
 */
export function leavesPlanWaiting(reason: PlanOutcome, orderId: unknown): boolean {
  return typeof orderId === 'string' && orderId !== '' && reason !== 'unconfirmed';
}

/** The English the route sends beside each reason, for a caller with no words of its own. */
export const PLAN_ENGLISH: Record<PlanOutcome, string> = {
  plan_not_available: 'This plan is not on sale any more.',
  price_not_available: 'That price is not available to you any more.',
  no_slot: 'This plan does not cover that learner.',
  already_subscribed: 'This account already has this plan, or an unpaid order for it.',
  account_not_yours: 'Your place on this billing account does not allow you to pay from it.',
  learner_not_yours: 'That learner is not on your account.',
  not_signed_in: 'Sign in to check out.',
  disabled: 'Subscriptions are not open on this platform yet.',
  malformed: 'Malformed request body.',
  learner_required: 'Choose the learner who will use this subscription.',
  phone_invalid: 'That phone number is not valid.',
  provider_unavailable: 'No payment provider can take this payment yet.',
  provider_failed: 'The payment provider could not start this payment.',
  refused: 'The order could not be placed. Nothing has been charged.',
  unconfirmed: 'We could not confirm whether your order was placed. Look at your orders before trying again.',
};
