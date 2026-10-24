import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchCampaigns } from '@/lib/promotions';
import { PromotionManager } from '@/components/promotion-manager';

export const metadata = { title: 'Promotions' };
export const dynamic = 'force-dynamic';

/**
 * The platform's promotions console.
 *
 * Every control a campaign needs is a button or a field: create, switch on,
 * pause, archive, change the limits. The owner asked for that explicitly — the
 * people who run this platform do not write SQL, so a writer with no screen is
 * not a finished feature.
 *
 * Viewing is staff-wide because usage and limits are things finance and support
 * need to answer questions about; opening a campaign is the platform owner's,
 * and the database enforces that even if this page did not hide the form.
 */
export default async function AdminPromotionsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/promotions');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/admin');

  const [{ data: isOwner }, { data: courseRows }, { data: marketRows }, campaigns, promotionsOn] =
    await Promise.all([
      supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
      supabase
        .from('courses')
        .select('id,title')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('title'),
      supabase.rpc('promotion_market_options'),
      fetchCampaigns(supabase),
      isFlagEnabled(supabase, 'commerce.promotions').catch(() => false),
    ]);

  const courses = ((courseRows ?? []) as { id: string; title: string }[]).map((row) => ({
    id: row.id,
    title: row.title,
  }));
  const markets = ((marketRows ?? []) as { market: string }[]).map((row) => row.market);

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Promotions</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Money</p>
        <h1>Promotions</h1>
        <p className="muted">
          Codes and offers. A percentage follows each country&apos;s price, so it means the
          same thing everywhere; a fixed amount is written in one currency and can only be
          used where the course is priced in it. A campaign does nothing until it is switched
          on.
        </p>
      </div>

      {!promotionsOn && (
        <div className="notice warn">
          Promotions are switched off (<code>commerce.promotions</code>), so no code can be
          redeemed yet. You can prepare campaigns here; switching the flag on is what makes
          them usable at checkout.
        </div>
      )}

      <PromotionManager
        campaigns={campaigns}
        courses={courses}
        markets={markets}
        scope="platform"
        canCreate={isOwner === true}
      />
    </div>
  );
}
