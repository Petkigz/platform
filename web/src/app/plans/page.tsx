import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { format, fromMinor } from '@/lib/money';
import { PlanStorefront } from './plan-storefront';

export const dynamic = 'force-dynamic';

type RawPlan = { id: string; code: string; name: string; description: string | null; tier: string };
type RawVersion = { id: string; plan_id: string; version_number: number; billing_interval: string; adult_allowance: number; child_allowance: number };
type RawPrice = { id: string; plan_version_id: string; amount_minor: string | number; currency_code: string; billing_interval: string; market: string | null };
type RawEntitlement = {
  plan_version_id: string;
  scope_type: string;
  feature_code: string | null;
  subject_areas: { name: string } | null;
  products: { name: string } | null;
};

export default async function PlansPage() {
  if (!isSupabaseConfigured()) {
    return <div className="container section"><h1>Subscription plans</h1><p className="notice warn">Payments are not configured on this deployment.</p></div>;
  }
  const supabase = await createClient();

  // commerce.subscriptions ships off, and the writer refuses while it is off.
  // Reading the catalogue anyway would offer a plan the platform will not sell,
  // so the page says that instead of showing prices it cannot honour.
  if (!(await isFlagEnabled(supabase, 'commerce.subscriptions'))) {
    return (
      <div className="container section">
        <p className="eyebrow">AyahSpring subscriptions</p>
        <h1>Choose a learning plan</h1>
        <p className="notice warn">
          Subscriptions are not open yet. When they open, the plans and their prices
          will be listed here; nothing can be bought before then.
        </p>
      </div>
    );
  }

  const [{ data: plansData, error: plansError }, { data: userResult }] = await Promise.all([
    supabase.from('plans').select('id,code,name,description,tier').eq('status','active').is('deleted_at',null).order('tier').order('name'),
    supabase.auth.getUser(),
  ]);
  if (plansError) throw new Error(plansError.message);
  const plans = (plansData ?? []) as RawPlan[];
  const planIds = plans.map((p) => p.id);

  let versions: RawVersion[] = [];
  if (planIds.length) {
    const { data, error } = await supabase.from('plan_versions')
      .select('id,plan_id,version_number,billing_interval,adult_allowance,child_allowance')
      .in('plan_id',planIds).eq('status','active').order('version_number',{ascending:false});
    if (error) throw new Error(error.message);
    versions = (data ?? []) as RawVersion[];
  }
  const versionIds = versions.map((v) => v.id);
  let prices: RawPrice[] = [];
  let entitlements: RawEntitlement[] = [];
  if (versionIds.length) {
    const [priceResult, entitlementResult] = await Promise.all([
      supabase.from('prices').select('id,plan_version_id,amount_minor,currency_code,billing_interval,market')
        .in('plan_version_id',versionIds).eq('status','active').is('effective_until',null),
      supabase.from('plan_entitlements')
        .select('plan_version_id,scope_type,feature_code,subject_areas(name),products(name)')
        .in('plan_version_id',versionIds),
    ]);
    if (priceResult.error) throw new Error(priceResult.error.message);
    if (entitlementResult.error) throw new Error(entitlementResult.error.message);
    prices = (priceResult.data ?? []) as unknown as RawPrice[];
    entitlements = (entitlementResult.data ?? []) as unknown as RawEntitlement[];
  }

  let learners: { id: string; name: string; type: string; ageBand: string | null }[] = [];
  if (userResult.user) {
    const { data, error } = await supabase.from('learner_profiles')
      .select('id,display_name,learner_type,age_band').eq('status','active').is('deleted_at',null)
      .order('display_name');
    if (error) throw new Error(error.message);
    learners = (data ?? []).map((row) => ({
      id: row.id,
      name: row.display_name,
      type: row.learner_type,
      ageBand: row.age_band,
    }));
  }

  const mapped = plans.map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    tier: plan.tier,
    versions: versions.filter((v) => v.plan_id === plan.id).map((version) => ({
      id: version.id,
      versionNumber: version.version_number,
      interval: version.billing_interval,
      adultAllowance: version.adult_allowance,
      childAllowance: version.child_allowance,
      prices: prices.filter((p) => p.plan_version_id === version.id).map((price) => ({
        id: price.id,
        amountLabel: format(fromMinor(String(price.amount_minor), price.currency_code)),
        currency: price.currency_code,
        interval: price.billing_interval,
        market: price.market,
      })),
      entitlements: entitlements.filter((e) => e.plan_version_id === version.id).map((e) =>
        e.scope_type === 'catalogue' ? `Subject catalogue: ${e.subject_areas?.name ?? 'subject area'}`
          : e.scope_type === 'feature' ? `Feature: ${e.feature_code}`
            : `Product: ${e.products?.name ?? 'included product'}`),
    })),
  }));

  return (
    <div className="container section">
      <p className="eyebrow">AyahSpring subscriptions</p>
      <h1>Choose a learning plan</h1>
      <p className="lede">
        Basic is the course itself. Plus is the VIP package: the same lessons plus benefits such as
        watching them inside the app with no connection. Select who will learn. A subscription starts only when payment is verified; the amount comes from the published plan price, not this page.</p>
      <PlanStorefront plans={mapped} learners={learners} />
    </div>
  );
}
