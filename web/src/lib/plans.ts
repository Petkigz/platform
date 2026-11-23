/**
 * What the plans page may show, as rules a test can hold.
 *
 * `/plans` read four tables and printed what came back: every market's price
 * for everybody, a price as a bare number beside its currency, the stored
 * word for a period, and "version 3". This file decides what a reader is
 * shown instead. No queries here; the page asks and hands the rows over.
 *
 * **A price is offered only if the writer would take it.**
 * `create_plan_order()` accepts a price that is active, has started, has no
 * end, is for the version's own period, and is either for no market or for
 * the country on the buyer's billing account. The page offers the same and
 * nothing else, so nobody is shown a price and then refused it. Where the
 * account's country has a price of its own, that is the price and the
 * default one is not offered beside it.
 *
 * **What is not known here.** What happens when a period ends. Nothing
 * renews a subscription yet, so nothing on the page says one renews.
 */

import { pledgeMoneyOf, amountOf } from './sponsorship-outcome.ts';
import type { Money } from './money.ts';

export const PLAN_PERIODS = ['week', 'month', 'quarter', 'year', 'one_time'] as const;
export type PlanPeriod = (typeof PLAN_PERIODS)[number];

/** The sentence a price is said in, by its period. The amount comes last, after a colon. */
export const PERIOD_KEY = {
  week: 'plans.forWeek',
  month: 'plans.forMonth',
  quarter: 'plans.forQuarter',
  year: 'plans.forYear',
  one_time: 'plans.forOnce',
} as const satisfies Record<PlanPeriod, string>;

export type PlanOffer = {
  priceId: string;
  /** As it is said: `UGX 30000`, `USD 19.99`. */
  amount: string;
  money: Money;
};

export type PlanInclusion =
  | { kind: 'subject'; name: string }
  | { kind: 'product'; name: string }
  | { kind: 'offline' };

export type PlanCard = {
  /** The plan version: what is bought, and what the pay page is addressed by. */
  versionId: string;
  planId: string;
  name: string;
  description: string | null;
  /**
   * The shelf the plan is sold on, or null when the row names neither. The
   * shelves' names are names (`Basic`, `Plus`), shown as written.
   */
  tier: 'basic' | 'plus' | null;
  period: PlanPeriod;
  adults: number;
  children: number;
  includes: PlanInclusion[];
  offers: PlanOffer[];
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

/**
 * The prices of one version this buyer could be charged.
 *
 * `country` is the country on the buyer's billing account, or null when
 * there is no account yet or it has none: then only a price for no market
 * can be taken. A price whose amount cannot be said is not offered.
 */
export function offersFor(
  prices: readonly Row[],
  version: { id: string; period: PlanPeriod },
  country: string | null,
  now: number,
): PlanOffer[] {
  const usable = prices.filter((price) => {
    if (price.plan_version_id !== version.id) return false;
    if (price.status !== 'active' || price.billing_interval !== version.period) return false;
    if (price.effective_until !== null && price.effective_until !== undefined) return false;
    if (price.effective_from !== null && price.effective_from !== undefined) {
      const from = typeof price.effective_from === 'string' ? Date.parse(price.effective_from) : Number.NaN;
      if (Number.isNaN(from) || from > now) return false;
    }
    return price.market === null || price.market === undefined || (country !== null && price.market === country);
  });
  const own = usable.filter((price) => price.market === country && country !== null);
  const offers: PlanOffer[] = [];
  for (const price of own.length > 0 ? own : usable) {
    const amount = amountOf(String(price.amount_minor ?? ''), price.currency_code);
    const money = pledgeMoneyOf(String(price.amount_minor ?? ''), price.currency_code);
    if (typeof price.id !== 'string' || amount === null || money === null) continue;
    offers.push({ priceId: price.id, amount, money });
  }
  // One per currency, in a steady order: two prices in one currency for one
  // buyer is a catalogue mistake, and the page does not ask a buyer to pick
  // between them. The lower is not chosen for them either; neither is offered.
  const byCurrency = new Map<string, PlanOffer[]>();
  for (const offer of offers) byCurrency.set(offer.money.currency, [...(byCurrency.get(offer.money.currency) ?? []), offer]);
  return [...byCurrency.entries()]
    .filter(([, list]) => list.length === 1)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, list]) => list[0]!);
}

/**
 * The plans on sale, as cards, or null when what was read cannot be trusted.
 *
 * Null is "not read", which the page says as that. A card is one plan for
 * one period; a plan with no version on sale has none. A version whose period or allowances make no sense is
 * not left out quietly: it makes the whole reply unread, because the next
 * thing a reader does with a card is pay for it.
 */
export function storefrontOf(
  read: { plans: unknown; versions: unknown; prices: unknown; entitlements: unknown },
  buyer: { country: string | null; offlineOn: boolean; now: number },
): PlanCard[] | null {
  const plans = rows(read.plans);
  const versions = rows(read.versions);
  const prices = rows(read.prices);
  const entitlements = rows(read.entitlements);
  if (!plans || !versions || !prices || !entitlements) return null;

  const cards: PlanCard[] = [];
  for (const plan of plans) {
    const planId = text(plan.id);
    const name = text(plan.name);
    if (planId === null || name === null) return null;
    // A plan can be on sale for more than one period at once (a month and a
    // year are two versions), and each is a card. Within one period the
    // newest version on sale is the one sold: an older one still marked
    // active is the terms somebody already has, and nothing on a card could
    // tell the two apart.
    const newest = new Map<PlanPeriod, Row>();
    for (const version of versions.filter((v) => v.plan_id === planId)) {
      const period = (PLAN_PERIODS as readonly unknown[]).includes(version.billing_interval)
        ? (version.billing_interval as PlanPeriod)
        : null;
      const number = count(version.version_number);
      if (period === null || number === null) return null;
      const held = newest.get(period);
      if (!held || number > (held.version_number as number)) newest.set(period, version);
    }
    for (const period of PLAN_PERIODS) {
      const version = newest.get(period);
      if (!version) continue;
      const versionId = text(version.id);
      const adults = count(version.adult_allowance);
      const children = count(version.child_allowance);
      if (versionId === null || adults === null || children === null) return null;

      const includes: PlanInclusion[] = [];
      for (const entry of entitlements.filter((e) => e.plan_version_id === versionId)) {
        if (entry.scope_type === 'catalogue') {
          const subject = text(one(entry.subject_areas)?.name);
          if (subject) includes.push({ kind: 'subject', name: subject });
        } else if (entry.scope_type === 'product') {
          const product = text(one(entry.products)?.name);
          if (product) includes.push({ kind: 'product', name: product });
        } else if (entry.scope_type === 'feature' && entry.feature_code === 'offline_downloads' && buyer.offlineOn) {
          // Said only while saving a lesson is switched on: a plan that carries
          // the feature on a platform that has it off gives nobody anything.
          includes.push({ kind: 'offline' });
        }
        // A feature this page has no sentence for is left out: its stored code is not a sentence.
      }

      cards.push({
        versionId,
        planId,
        name,
        description: text(plan.description),
        tier: plan.tier === 'basic' || plan.tier === 'plus' ? plan.tier : null,
        period,
        adults,
        children,
        includes,
        offers: offersFor(prices, { id: versionId, period }, buyer.country, buyer.now),
      });
    }
  }
  return cards;
}

export type PlanLearner = { id: string; name: string; type: 'adult' | 'child' };

/**
 * The learners a buyer may name on this plan, by the writer's own rule: the
 * buyer's own adult profile when the plan has an adult place, and a child
 * when it has a child's. (Whether a child is in the buyer's family is the
 * row policy's to decide; the list the page reads holds no others.)
 */
export function learnersFor(
  learners: unknown,
  plan: { adults: number; children: number },
  userId: string,
): PlanLearner[] | null {
  const list = rows(learners);
  if (!list) return null;
  const fits: PlanLearner[] = [];
  for (const learner of list) {
    const id = text(learner.id);
    const name = text(learner.display_name);
    if (id === null || name === null) return null;
    if (learner.learner_type === 'adult') {
      if (plan.adults > 0 && learner.linked_user_id === userId) fits.push({ id, name, type: 'adult' });
    } else if (learner.learner_type === 'child') {
      if (plan.children > 0) fits.push({ id, name, type: 'child' });
    } else {
      return null;
    }
  }
  return fits;
}

/**
 * What this account already has of one plan, by the writer's own rule.
 *
 * `create_plan_order()` refuses a second subscription to a plan while one is
 * pending or its paid period has not ended. The pay page reads the account's
 * subscriptions and says which, in place of a form that would be refused.
 * A pending one wins: it is the one that can be cancelled.
 */
export function standingOf(
  subscriptions: unknown,
  planId: string,
  now: number,
): { kind: 'waiting' } | { kind: 'live'; until: string } | null {
  const list = rows(subscriptions);
  if (!list) return null;
  let live: string | null = null;
  for (const row of list) {
    if (row.plan_id !== planId) continue;
    if (row.status === 'pending') return { kind: 'waiting' };
    const end = typeof row.current_period_end === 'string' ? Date.parse(row.current_period_end) : Number.NaN;
    if (!Number.isNaN(end) && end > now && (live === null || end > Date.parse(live))) {
      live = row.current_period_end as string;
    }
  }
  return live === null ? null : { kind: 'live', until: live };
}
