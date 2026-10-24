import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchMyCourses } from '@/lib/authoring';
import { fetchCampaigns } from '@/lib/promotions';
import { PromotionManager } from '@/components/promotion-manager';

export const metadata = { title: 'My promotions' };
export const dynamic = 'force-dynamic';

/**
 * A teacher's own promotions.
 *
 * The list is filtered to campaigns this teacher owns, and the course choices
 * are their own courses — but neither of those is the control. The writer
 * derives the owner from the session, refuses somebody else's course by name,
 * and refuses an empty course list for a teacher, so this page could be wrong in
 * every way and still not hand out a platform-wide discount.
 */
export default async function TeachPromotionsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/teach/promotions');

  const [{ data: instructor }, { data: owner }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'instructor' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (instructor !== true && owner !== true) {
    return (
      <div className="page">
        <nav className="crumbs">
          <Link href="/learn">My learning</Link>
          <span aria-hidden>›</span>
          <span>Promotions</span>
        </nav>
        <div className="page-head">
          <p className="eyebrow">Teaching</p>
          <h1>Promotions</h1>
        </div>
        <div className="notice warn">
          <strong>This is the teaching area.</strong> Teaching is by appointment, so a
          teacher account is created by the platform owner. If you would like to teach here,
          the owner can add you from the admin console.
        </div>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/learn" className="btn">Back to my learning</Link>
        </p>
      </div>
    );
  }

  const [authored, allCampaigns, { data: marketRows }, promotionsOn] = await Promise.all([
    fetchMyCourses(supabase, user.id),
    fetchCampaigns(supabase),
    supabase.rpc('promotion_market_options'),
    isFlagEnabled(supabase, 'commerce.promotions').catch(() => false),
  ]);

  // RLS already limits a teacher to their own campaigns; this keeps the page
  // honest for an owner who is also a teacher, who would otherwise see platform
  // campaigns here and try to manage them from the wrong place.
  const mine = allCampaigns.filter((campaign) => campaign.ownerType === 'teacher');
  const markets = ((marketRows ?? []) as { market: string }[]).map((row) => row.market);

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/teach">Teach</Link>
        <span aria-hidden>›</span>
        <span>Promotions</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Teaching</p>
        <h1>My promotions</h1>
        <p className="muted">
          An offer on your own courses, in the countries you choose. You switch it on and off
          yourself, and the discount is shared with the platform at the same rate as the
          course itself.
        </p>
      </div>

      {!promotionsOn && (
        <div className="notice warn">
          Promotions are switched off on the platform right now, so no code can be used yet.
          You can prepare a campaign; it becomes usable when the owner enables promotions.
        </div>
      )}

      <PromotionManager
        campaigns={mine}
        courses={authored.map((course) => ({ id: course.id, title: course.title }))}
        markets={markets}
        scope="teacher"
        canCreate
      />
    </div>
  );
}
