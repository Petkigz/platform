import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { homeFor } from '@/lib/auth';

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

  const role = async (code: string) => {
    const { data } = await supabase.rpc('has_role', { p_user_id: user.id, p_role_code: code });
    return data === true;
  };

  const [platformAdmin, governanceAdmin, boardMember, instructor, reviewer] = await Promise.all([
    role('platform_admin'),
    role('governance_admin'),
    role('scholarly_panel_member'),
    role('instructor'),
    role('reviewer'),
  ]);

  // Asked only when it can matter: the board question is a setting read.
  const boardActive = boardMember
    ? (await supabase.rpc('setting_bool', {
        p_key: 'governance.scholar_board_active',
        p_default: false,
      })).data === true
    : false;

  redirect(homeFor({ platformAdmin, governanceAdmin, boardMember, boardActive, instructor, reviewer }));
}
