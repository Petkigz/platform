import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { SubscriptionManager, type PlanContents } from './subscription-manager';

type PlanSummaryRow = {
  subscriptionId: string;
  tier: string;
  planName: string;
  interval: string;
  currentPeriodEnd: string | null;
  features: Array<{ code: string; label: string }>;
  subjects: string[];
};

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/subscriptions');

  // No client-side user filter. The subscriptions RLS policy decides which
  // billing accounts the current session may see; learner profile RLS decides
  // which adult/family learners the allocation picker may offer.
  const [subsResult, learnersResult] = await Promise.all([
    supabase.from('subscriptions').select(`
      id,status,current_period_start,current_period_end,cancelled_at,
      plans ( name, code ),
      plan_versions ( billing_interval, adult_allowance, child_allowance ),
      family_plan_allocations (
        id, learner_profile_id, slot_type, status,
        learner_profiles ( display_name, learner_type )
      )
    `).order('created_at',{ascending:false}),
    supabase.from('learner_profiles').select('id,display_name,learner_type,age_band')
      .eq('status','active').is('deleted_at',null).order('display_name'),
  ]);
  if (subsResult.error) throw new Error(subsResult.error.message);
  if (learnersResult.error) throw new Error(learnersResult.error.message);

  // What each plan actually gives, in words. Read from a function rather than
  // joined here, because the shelf and the contents are one answer and the
  // storefront and this page must not be able to disagree about them.
  const { data: summaryData } = await supabase.rpc('my_plan_summary');
  const contents: Record<string, PlanContents> = {};
  for (const row of (summaryData ?? []) as PlanSummaryRow[]) {
    contents[row.subscriptionId] = {
      tier: row.tier,
      features: row.features ?? [],
      subjects: row.subjects ?? [],
    };
  }

  return (
    <div className="container section">
      <p className="eyebrow">Your account</p>
      <h1>My subscriptions</h1>
      <p className="lede">
        What your plan includes, who is using it, and what happens when it ends. Cancelling stops
        the next period; access already paid for remains until the period ends.
      </p>
      <SubscriptionManager
        subscriptions={(subsResult.data ?? []) as never[]}
        learners={(learnersResult.data ?? []) as never[]}
        contents={contents}
      />
      <p style={{ marginTop: '1.5rem' }}><Link href="/plans">Browse subscription plans</Link></p>
    </div>
  );
}
