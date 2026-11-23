import { cookies, headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

import { planBillingAccount } from '@/lib/checkout';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, languageShownFor } from '@/lib/i18n';
import { storefrontOf, type PlanCard } from '@/lib/plans';

/** The language these pages are written in for this reader, and whether that is the one they chose. */
export async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'plans');
  return { locale, shown };
}

export type Storefront =
  /** `commerce.subscriptions` is off: nothing is on sale, and nothing was read. */
  | { state: 'closed' }
  /** Something could not be read. Not the same as nothing being on sale. */
  | { state: 'unread' }
  | { state: 'open'; cards: PlanCard[]; accountId: string | null };

/**
 * Whether plans are on sale: the switch, or null when it could not be read.
 * Each page asks this itself, before anything else, and reads no catalogue
 * while the answer is no: a price shown is a price somebody expects to pay.
 */
export const SUBSCRIPTIONS_FLAG = 'commerce.subscriptions';

/**
 * The plans on sale, for this visitor, or why they cannot be said.
 *
 * Both pages read through here so the list and the page a plan is paid for
 * on cannot disagree about a price: `planId` narrows the same reads to one
 * plan. Every read that fails makes the answer `unread`; none throws. The
 * list page used to throw on any of five reads, which showed the "this page
 * broke" screen to somebody who had only asked what a plan costs.
 *
 * The caller has already read the switch (`SUBSCRIPTIONS_FLAG`) and found
 * it on.
 */
export async function readStorefront(
  supabase: SupabaseClient,
  userId: string | null,
  only?: { planId: string },
): Promise<Exclude<Storefront, { state: 'closed' }>> {
  let plansQuery = supabase
    .from('plans')
    .select('id,name,description,tier')
    .eq('status', 'active')
    .is('deleted_at', null);
  if (only) plansQuery = plansQuery.eq('id', only.planId);
  // Basic above Plus, then by name: the order the shelves are spoken of in.
  const plans = await plansQuery.order('tier').order('name');
  if (plans.error || !Array.isArray(plans.data)) return { state: 'unread' };
  const planIds = (plans.data as { id?: unknown }[]).map((p) => p.id).filter((id): id is string => typeof id === 'string');

  // The buyer's account decides which market's price is theirs.
  let accountId: string | null = null;
  let country: string | null = null;
  if (userId) {
    const account = await planBillingAccount(supabase, userId);
    if (!account.read) return { state: 'unread' };
    accountId = account.id;
    country = account.country;
  }

  if (planIds.length === 0) return { state: 'open', cards: [], accountId };

  const versions = await supabase
    .from('plan_versions')
    .select('id,plan_id,version_number,billing_interval,adult_allowance,child_allowance')
    .in('plan_id', planIds)
    .eq('status', 'active');
  if (versions.error || !Array.isArray(versions.data)) return { state: 'unread' };
  const versionIds = (versions.data as { id?: unknown }[]).map((v) => v.id).filter((id): id is string => typeof id === 'string');
  if (versionIds.length === 0) return { state: 'open', cards: [], accountId };

  const [prices, entitlements, offline] = await Promise.all([
    supabase
      .from('prices')
      .select('id,plan_version_id,amount_minor,currency_code,billing_interval,market,status,effective_from,effective_until')
      .in('plan_version_id', versionIds)
      .eq('status', 'active'),
    supabase
      .from('plan_entitlements')
      .select('plan_version_id,scope_type,feature_code,subject_areas(name),products(name)')
      .in('plan_version_id', versionIds),
    // Not knowing is treated as off: the page then does not promise it.
    isFlagEnabled(supabase, 'learning.offline').catch(() => false),
  ]);
  if (prices.error || entitlements.error) return { state: 'unread' };

  const cards = storefrontOf(
    { plans: plans.data, versions: versions.data, prices: prices.data, entitlements: entitlements.data },
    { country, offlineOn: offline, now: Date.now() },
  );
  return cards === null ? { state: 'unread' } : { state: 'open', cards, accountId };
}
