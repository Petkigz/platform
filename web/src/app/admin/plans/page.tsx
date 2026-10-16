import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PlanManager, type PlanView, type SubjectView } from './plan-manager';

export const dynamic = 'force-dynamic';

export default async function AdminPlansPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/plans');
  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const [plansResult, subjectsResult] = await Promise.all([
    supabase
      .from('plans')
      .select(`id, code, name, status, description,
        plan_versions (
          id, version_number, status, billing_interval, child_allowance, adult_allowance,
          plan_entitlements ( id, scope_type, feature_code, subject_area_id, product_id ),
          prices ( id, amount_minor, currency_code, status, market, effective_until )
        )`)
      .order('created_at', { ascending: false }),
    supabase.from('subject_areas').select('id, code, name').eq('status', 'active').order('name'),
  ]);
  if (plansResult.error) throw new Error(plansResult.error.message);
  if (subjectsResult.error) throw new Error(subjectsResult.error.message);

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
      <PlanManager plans={plans} subjects={subjects} />
      <p style={{ marginTop: '1.5rem' }}><Link href="/admin">Back to administration</Link></p>
    </div>
  );
}
