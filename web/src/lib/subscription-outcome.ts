/**
 * What asking to change a subscription was answered with, as names.
 *
 * `/api/subscriptions` answered with whatever sentence the database raised,
 * picked its status by searching that sentence for words, and the page
 * printed it: English, for every reader, and the database's own, with a plan
 * version's id inside when a place was full. A course, a pledge and a plan
 * order already had names; this is the same for the two things a subscriber
 * can do: put a learner on a plan, and cancel.
 *
 * **The writers name nothing.** `cancel_subscription()` and
 * `allocate_subscription_learner()` refuse in prose, and so do the function
 * and the trigger they call. A refusal is recognised by its words, and a test
 * reads every `raise exception` out of the migrations and requires each to be
 * recognised here.
 *
 * Kept free of queries and of the catalogue, so the forms in the browser can
 * import it.
 */

export const SUBSCRIPTION_OUTCOMES = [
  'not_signed_in',
  'malformed',
  'reason_required',
  'not_yours',
  'learner_not_yours',
  'not_running',
  'no_slot',
  'refused',
  'unconfirmed',
] as const;
export type SubscriptionOutcome = (typeof SUBSCRIPTION_OUTCOMES)[number];

export function subscriptionStatusOf(reason: SubscriptionOutcome): number {
  switch (reason) {
    case 'not_signed_in': return 401;
    case 'malformed':
    case 'reason_required': return 400;
    case 'not_yours':
    case 'learner_not_yours': return 403;
    case 'not_running':
    case 'no_slot': return 409;
    case 'refused': return 500;
    case 'unconfirmed': return 502;
  }
}

/**
 * The words the two writers raise, and the name for each.
 *
 * A subscription that does not exist and one the caller may not cancel are
 * one name, and so are a learner profile that does not exist and one that is
 * somebody else's: a reply that told them apart would be telling a stranger
 * that something with that id exists.
 */
const WRITER_SENTENCES: readonly (readonly [RegExp, SubscriptionOutcome])[] = [
  // cancel_subscription()
  [/sign in to cancel a subscription/iu, 'not_signed_in'],
  [/written cancellation reason is required/iu, 'reason_required'],
  [/subscription \S+ not found/iu, 'not_yours'],
  [/do not have permission to cancel this subscription/iu, 'not_yours'],
  // allocate_subscription_learner()
  [/sign in to allocate a learner/iu, 'not_signed_in'],
  [/that subscription is not active/iu, 'not_running'],
  [/not a member of this billing account/iu, 'not_yours'],
  [/learner profile is not available/iu, 'learner_not_yours'],
  [/adult slot may only be assigned to your own learner profile/iu, 'learner_not_yours'],
  [/only an active family member may select this child/iu, 'learner_not_yours'],
  // grant_subscription_plan_entitlements(), which the allocation calls
  [/only an active subscription can grant plan access/iu, 'not_running'],
  // enforce_family_slot_capacity(), the trigger on an allocation
  [/allows \S+ \S+ slot\(s\); \S+ already allocated/iu, 'no_slot'],
];

/** The name for one sentence a writer raised, or null when it has none. */
export function subscriptionSentenceReason(message: string | null | undefined): SubscriptionOutcome | null {
  for (const [pattern, reason] of WRITER_SENTENCES) if (pattern.test(message ?? '')) return reason;
  return null;
}

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * The reason behind a database error from either writer.
 *
 * A five-character SQLSTATE outside class 08 is the database's answer, and
 * whatever was being written was rolled back with it. Anything else is not
 * an answer, and the change may have been made.
 */
export function subscriptionReasonOf(error: DatabaseError): SubscriptionOutcome {
  const state = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(state) || state.startsWith('08')) return 'unconfirmed';
  return subscriptionSentenceReason(error.message) ?? 'refused';
}

/**
 * What a form says about a reply that was not a success: a reason it knows,
 * arriving with that reason's own status, or `unconfirmed`.
 */
export function subscriptionOutcomeOf(status: number, reason: unknown): SubscriptionOutcome {
  const known = typeof reason === 'string' && (SUBSCRIPTION_OUTCOMES as readonly string[]).includes(reason);
  if (!known || subscriptionStatusOf(reason as SubscriptionOutcome) !== status) return 'unconfirmed';
  return reason as SubscriptionOutcome;
}

/**
 * The reason recorded when an order that was never paid is cancelled.
 *
 * `cancel_subscription()` requires a written reason for every cancellation.
 * Somebody cancelling an order they have not paid is on that page because
 * the plans page sent them there to start again, and is not asked to write
 * one: this sentence is recorded instead, and says that nobody was asked.
 */
export const UNPAID_CANCEL_REASON = 'Cancelled by the buyer before payment. No reason was asked for.';

/** The English the route sends beside each reason, for a caller with no words of its own. */
export const SUBSCRIPTION_ENGLISH: Record<SubscriptionOutcome, string> = {
  not_signed_in: 'Sign in first.',
  malformed: 'Malformed request.',
  reason_required: 'Write why you are cancelling, in under 500 characters.',
  not_yours: 'This plan cannot be changed from your account.',
  learner_not_yours: 'That learner cannot be put on this plan from your account.',
  not_running: 'This plan is not running, so nobody can be added to it.',
  no_slot: 'That place has been taken. Nobody was added.',
  refused: 'That could not be done. Nothing was changed.',
  unconfirmed: 'We could not confirm that this was done. Look at your subscriptions before trying again.',
};
