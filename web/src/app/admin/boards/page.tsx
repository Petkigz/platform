import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { parseReportQueue } from '@/lib/boards';
import { translateFor } from '@/lib/translate-reader';
import { BoardReports } from './board-reports';

export const metadata = { title: 'Discussion reports' };
export const dynamic = 'force-dynamic';

/**
 * The reports from the two discussion boards.
 *
 * A post on a board is shown the moment it is sent (owner decision,
 * 2026-11-24), so this queue is the only thing between a post that should not
 * be there and the people reading it. It lists every post with an open
 * report, oldest report first, with what each reporter wrote.
 *
 * **It shows a username, never an account.** The queue the database sends
 * carries neither the writer's account nor a reporter's. Opening the account
 * behind a post is a separate act on this page: it asks for a reason, the
 * database writes the look to the audit log before it answers, and the
 * answer is shown once, on this screen, and stored nowhere by it.
 *
 * Owner or governance only, which is who `can_moderate_boards()` lets act.
 */
export default async function AdminBoardsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/boards');

  const { data: allowed } = await supabase.rpc('can_moderate_boards', { p_actor: user.id });
  if (allowed !== true) redirect('/admin');

  const { data, error } = await supabase.rpc('board_report_queue');
  const queue = error ? null : parseReportQueue(data);
  // Null when translation is off: then no button is drawn.
  const translate = await translateFor(supabase);

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Discussion reports</span>
      </nav>
      <div className="page-head">
        <h1>Discussion reports</h1>
        <p className="muted">
          Posts on the two boards that somebody has reported. Nothing is held before it is shown, so
          this page is where a post is taken down. Nobody is sent a message when a post is
          reported: the number waiting is on the owner&rsquo;s dashboard, and on nobody else&rsquo;s.
        </p>
      </div>

      {!queue ? (
        <div className="notice error" role="alert">
          The reports could not be read{error ? `: ${error.message}` : '.'} Nothing was changed.
        </div>
      ) : (
        <>
          <div className="notice">
            The students&rsquo; board is <strong>{queue.students ? 'on' : 'off'}</strong>{' '}
            (<code>community.student_board</code>) and the teachers&rsquo; board is{' '}
            <strong>{queue.teachers ? 'on' : 'off'}</strong> (<code>community.teacher_board</code>).
            Both switches are on <Link href="/admin">the dashboard</Link>. Switching a board off
            hides it from its members and deletes nothing; you can still read and clear it here.{' '}
            <Link href="/discuss">Open the boards</Link>.
          </div>
          <BoardReports reports={queue.reports} translate={translate} />
        </>
      )}
    </div>
  );
}
