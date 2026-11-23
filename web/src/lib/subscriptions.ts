/**
 * What an account holds of each plan, worked out from what the page read.
 *
 * Kept free of queries and of the catalogue, so it can be tested with plain
 * rows and imported by anything.
 *
 * **A subscription's stored status is not what the page says.** The database
 * has seven words for it and writes three: `pending` when the order is
 * placed, `active` when it is paid, `cancelled` when somebody cancels.
 * Nothing sets `expired`: a plan whose period is over is still `active` in
 * its row. So what the page says comes from the status **and the date**:
 *
 * - `waiting`    ordered, not paid. Nothing has started.
 * - `running`    paid, and the period has not ended.
 * - `stopped`    cancelled after it was paid, and the period has not ended.
 *                Cancelling revokes nothing: what was paid for is dated to
 *                the end of the period and stays.
 * - `ended`      the period is over, whatever the row's word is.
 * - `withdrawn`  cancelled before it was ever paid.
 * - `unknown`    a row with a word for a paid plan and no dates. Shown with
 *                no sentence about its state: the page does not guess one.
 *
 * **Who can be added is the writer's rule**, as on the page a plan is paid
 * for: the caller's own adult profile for an adult place, a child for a
 * child's, and only while the row says `active` and the period has not
 * ended, which is what `allocate_subscription_learner()` requires. A plan
 * that was cancelled takes nobody else.
 */

import type { PlanInclusion, PlanLearner } from './plans.ts';

export const SUB_STATUSES = ['pending', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired'] as const;
export type SubStatus = (typeof SUB_STATUSES)[number];

export type SubStanding = 'waiting' | 'running' | 'stopped' | 'ended' | 'withdrawn' | 'unknown';

export type SubLearner = {
  /** The learner's profile. */
  id: string;
  /** Null when the row policy does not show this reader the learner's name. */
  name: string | null;
  type: 'adult' | 'child';
};

export type SubCard = {
  id: string;
  standing: SubStanding;
  /** The end of the paid period, as stored, when there is one. */
  until: string | null;
  /** The plan's own name, or null when nothing the page read holds it. */
  name: string | null;
  tier: 'basic' | 'plus' | null;
  /** Places of each kind, or null when nothing the page read holds them. */
  places: { adult: number; child: number } | null;
  /** What the plan opens, or null when that was not read. */
  includes: PlanInclusion[] | null;
  /** Who is on it now. */
  learners: SubLearner[];
  /** Places not taken, or null when the places are not known. */
  left: { adult: number; child: number } | null;
  /** Whether the writer would put another learner on it. */
  takesLearners: boolean;
  /** Whether cancelling is offered, and which kind. */
  cancel: 'order' | 'plan' | null;
};

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] | null =>
  Array.isArray(value) && value.every((row) => row && typeof row === 'object') ? (value as Row[]) : null;
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
/** A joined row arrives as an object, or as a list of one. */
const one = (value: unknown): Row | null => {
  const found = Array.isArray(value) ? value[0] : value;
  return found && typeof found === 'object' ? (found as Row) : null;
};
const tierOf = (value: unknown): 'basic' | 'plus' | null => (value === 'basic' || value === 'plus' ? value : null);

/** What the page says about one subscription, from its status and its date. */
export function standingOfSubscription(status: SubStatus, periodEnd: string | null, now: number): SubStanding {
  if (status === 'pending') return 'waiting';
  const end = periodEnd === null ? Number.NaN : Date.parse(periodEnd);
  if (Number.isNaN(end)) return status === 'cancelled' || status === 'expired' ? 'withdrawn' : 'unknown';
  if (end <= now) return 'ended';
  return status === 'cancelled' || status === 'expired' ? 'stopped' : 'running';
}

/**
 * The cards for the page, newest first as the rows arrive.
 *
 * `subscriptions` is the list itself: null is returned when it, or any row
 * of it, cannot be made sense of, and the page says it could not be read.
 * `summary` is `my_plan_summary()`, which knows the name, shelf and places
 * of a plan that is no longer on sale (the row policy hides those from a
 * plain read); `entitlements` is what each plan version opens. Either may be
 * null, and the cards are then drawn without what it would have held.
 */
export function subscriptionCards(
  read: { subscriptions: unknown; summary: unknown; entitlements: unknown },
  options: { offlineOn: boolean; now: number },
): SubCard[] | null {
  const list = rows(read.subscriptions);
  if (!list) return null;
  const summary = new Map<string, Row>();
  for (const row of rows(read.summary) ?? []) {
    const id = text(row.subscriptionId);
    if (id) summary.set(id, row);
  }
  const entitlements = rows(read.entitlements);

  const cards: SubCard[] = [];
  for (const row of list) {
    const id = text(row.id);
    const status = (SUB_STATUSES as readonly unknown[]).includes(row.status) ? (row.status as SubStatus) : null;
    if (id === null || status === null) return null;
    const periodEnd = row.current_period_end === null || row.current_period_end === undefined ? null : text(row.current_period_end);
    if (periodEnd !== null && Number.isNaN(Date.parse(periodEnd))) return null;
    const standing = standingOfSubscription(status, periodEnd, options.now);

    const plan = one(row.plans);
    const version = one(row.plan_versions);
    const known = summary.get(id);
    const adult = count(version?.adult_allowance) ?? count(known?.adultAllowance);
    const child = count(version?.child_allowance) ?? count(known?.childAllowance);
    const places = adult === null || child === null ? null : { adult, child };

    const allocations = rows(row.family_plan_allocations);
    if (!allocations) return null;
    const learners: SubLearner[] = [];
    for (const allocation of allocations) {
      if (allocation.status !== 'active') continue;
      const learnerId = text(allocation.learner_profile_id);
      if (learnerId === null || (allocation.slot_type !== 'adult' && allocation.slot_type !== 'child')) return null;
      learners.push({ id: learnerId, name: text(one(allocation.learner_profiles)?.display_name), type: allocation.slot_type });
    }

    let includes: PlanInclusion[] | null = null;
    const versionId = text(row.plan_version_id);
    if (entitlements && versionId) {
      includes = [];
      for (const entry of entitlements.filter((e) => e.plan_version_id === versionId)) {
        if (entry.scope_type === 'catalogue') {
          const subject = text(one(entry.subject_areas)?.name);
          if (subject) includes.push({ kind: 'subject', name: subject });
        } else if (entry.scope_type === 'product') {
          const product = text(one(entry.products)?.name);
          if (product) includes.push({ kind: 'product', name: product });
        } else if (entry.scope_type === 'feature' && entry.feature_code === 'offline_downloads' && options.offlineOn) {
          includes.push({ kind: 'offline' });
        }
        // A feature this page has no sentence for is left out: its stored code is not a sentence.
      }
    }

    const left = places === null
      ? null
      : {
          adult: Math.max(0, places.adult - learners.filter((l) => l.type === 'adult').length),
          child: Math.max(0, places.child - learners.filter((l) => l.type === 'child').length),
        };

    cards.push({
      id,
      standing,
      until: periodEnd,
      name: text(plan?.name) ?? text(known?.planName),
      tier: tierOf(plan?.tier) ?? tierOf(known?.tier),
      places,
      includes,
      learners,
      left,
      // `allocate_subscription_learner()`: the row says active and the period has not ended.
      takesLearners: status === 'active' && standing === 'running',
      // `cancel_subscription()` does nothing to one already cancelled. One
      // whose period is over has nothing left to cancel.
      cancel: standing === 'waiting' ? 'order' : standing === 'running' ? 'plan' : null,
    });
  }
  return cards;
}

/**
 * The learners who could be put on this plan now: the caller's own adult
 * profile while an adult place is free, a child while a child's is, and
 * nobody who is on it already. Null when the learners could not be read or
 * the places are not known: the page then offers no form and says part of it
 * is missing.
 */
export function addableLearners(card: SubCard, learners: unknown, userId: string): PlanLearner[] | null {
  const list = rows(learners);
  if (!list || card.left === null) return null;
  if (!card.takesLearners) return [];
  const on = new Set(card.learners.map((l) => l.id));
  const fits: PlanLearner[] = [];
  for (const learner of list) {
    const id = text(learner.id);
    const name = text(learner.display_name);
    if (id === null || name === null) return null;
    if (learner.learner_type !== 'adult' && learner.learner_type !== 'child') return null;
    if (on.has(id)) continue;
    if (learner.learner_type === 'adult') {
      if (card.left.adult > 0 && learner.linked_user_id === userId) fits.push({ id, name, type: 'adult' });
    } else if (card.left.child > 0) {
      fits.push({ id, name, type: 'child' });
    }
  }
  return fits;
}
