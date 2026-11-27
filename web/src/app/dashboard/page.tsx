import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { askRole, homeFor } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your area' };

/**
 * Where a signed-in person belongs.
 *
 * The owner's rule is that each role's power ends where its work does, which
 * includes the first screen after signing in: a teacher lands in the teaching
 * area, a scholar in the review queue, the platform owner in the console — not
 * on the marketing page a visitor sees.
 *
 * A redirect rather than a dashboard of its own. A dashboard repeating the first
 * three links of every area is a fourth place to keep correct, and each area
 * already says what is waiting. It also keeps the masthead auth-agnostic: no page
 * has to read the session to paint the header, and only this one and the pages
 * that genuinely need a session are dynamic.
 */
export default async function DashboardPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/dashboard');

  // A question that fails is asked again, and is never read as "no": see
  // `askRole()`. An unanswered one ends on the error page, not on `/learn`.
  const role = (code: string) =>
    askRole(() => supabase.rpc('has_role', { p_user_id: user.id, p_role_code: code }));

  const [platformAdmin, governanceAdmin, financeAdmin, supportAgent, boardMember, instructor, reviewer] =
    await Promise.all([
      role('platform_admin'),
      role('governance_admin'),
      role('finance_admin'),
      role('support_agent'),
      role('scholarly_panel_member'),
      role('instructor'),
      role('reviewer'),
    ]);

  // Asked only when it can matter: the board question is a setting read.
  const boardActive = boardMember
    ? await askRole(() => supabase.rpc('setting_bool', {
        p_key: 'governance.scholar_board_active',
        p_default: false,
      }))
    : false;

  redirect(homeFor({
    platformAdmin,
    governanceAdmin,
    financeAdmin,
    supportAgent,
    boardMember,
    boardActive,
    instructor,
    reviewer,
  }));
}
