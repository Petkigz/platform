import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PlanManager, type FeatureRuleView, type PlanView, type SubjectView } from './plan-manager';

export const dynamic = 'force-dynamic';

export default async function AdminPlansPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/plans');
  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const [plansResult, subjectsResult, featureResult, rulesResult] = await Promise.all([
    supabase
      .from('plans')
      .select(`id, code, name, status, tier, description,
        plan_versions (
          id, version_number, status, billing_interval, child_allowance, adult_allowance,
          plan_entitlements ( id, scope_type, feature_code, subject_area_id, product_id ),
          prices ( id, amount_minor, currency_code, status, market, effective_until )
        )`)
      .order('created_at', { ascending: false }),
    supabase.from('subject_areas').select('id, code, name').eq('status', 'active').order('name'),
    // The vocabulary is closed in SQL (pe_feature_vocabulary), so the form offers
    // exactly what the schema will accept rather than free text.
    supabase.rpc('plan_feature_codes'),
    // Which shelf each feature needs, and which Basic plans would block moving
    // one up. Read in one call so the panel can explain a refusal before the
    // click rather than after it.
    supabase.rpc('plan_feature_tier_rules'),
  ]);
  if (plansResult.error) throw new Error(plansResult.error.message);
  if (subjectsResult.error) throw new Error(subjectsResult.error.message);
  if (featureResult.error) throw new Error(featureResult.error.message);
  if (rulesResult.error) throw new Error(rulesResult.error.message);

  const featureCodes = (featureResult.data ?? []) as unknown as string[];

  const featureRules = ((rulesResult.data ?? []) as unknown as {
    feature_code: string;
    min_tier: string;
    blocking_plans: string | null;
  }[]).map((r): FeatureRuleView => ({
    featureCode: r.feature_code,
    minTier: r.min_tier === 'plus' ? 'plus' : 'basic',
    blockingPlans: r.blocking_plans ?? null,
  }));

  const plans = (plansResult.data ?? []) as unknown as PlanView[];
  const subjects = (subjectsResult.data ?? []) as unknown as SubjectView[];

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/admin">Administration</Link></p>
      <h1>Subscription plans</h1>
      <p className="lede">
        Define plan identity, versioned household allowances, access entitlements and recurring prices.
        Activation requires both an entitlement and a live price. This configures offers only; it does
        not create a paid subscription or substitute for provider confirmation.
      </p>
      <PlanManager
        plans={plans}
        subjects={subjects}
        featureCodes={featureCodes}
        featureRules={featureRules}
      />
      <p style={{ marginTop: '1.5rem' }}><Link href="/admin">Back to administration</Link></p>
    </div>
  );
}
