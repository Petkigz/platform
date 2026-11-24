import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { translator } from '@/lib/i18n';
import { BOARDS, mayEnter, parseStanding, type Board } from '@/lib/boards';
import { READ_FAILED, boardName, readerLanguage } from './reader';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('board.title') };
}

/**
 * The two discussion boards, and which of them this reader can open.
 *
 * Whether somebody is let in is asked of the database (`my_board()`), for
 * each board, every time this page is drawn: a class that ended an hour ago
 * is a board that does not open now. Somebody who is not let in is told why
 * and what would open it, not shown a page that is missing.
 *
 * A board that could not be read says so. It is not drawn as closed, which
 * would tell a student with a paid class that they have none.
 */
export default async function DiscussPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const user = await supabase.auth.getUser().then(
    (r) => r.data.user,
    () => null,
  );
  if (!user) redirect('/sign-in?next=/discuss');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const read = await Promise.all(
    BOARDS.map((board) =>
      supabase.rpc('my_board', { p_board: board }).then(
        (r) => r,
        () => READ_FAILED,
      ),
    ),
  );
  const standings = BOARDS.map((board, index) => {
    const reply = read[index]!;
    const standing = reply.error ? null : parseStanding(reply.data);
    if (!standing) {
      console.error(`discuss: the ${board} board could not be read:`, reply.error?.message ?? 'an unreadable reply');
    }
    return { board, standing };
  });

  const lead = (board: Board) => t(board === 'students' ? 'board.studentsLead' : 'board.teachersLead');
  const whyNot = (board: Board) => t(board === 'students' ? 'board.notStudent' : 'board.notTeacher');

  return (
    <div className="page board-page" {...frame}>
      <nav className="crumbs">
        <Link href="/learn">{t('nav.learn')}</Link>
        <span aria-hidden>›</span>
        <span>{t('board.title')}</span>
      </nav>
      <div className="page-head">
        <h1>{t('board.title')}</h1>
        <p className="board-lede">{t('board.lede')}</p>
      </div>

      {standings.map(({ board, standing }) => (
        <section
          key={board}
          className="card board-card"
          data-board={board}
          data-board-state={!standing ? 'unread' : mayEnter(standing) ? 'in' : standing.kind === null ? 'out' : 'closed'}
        >
          <h2>{boardName(t, board)}</h2>
          <p>{lead(board)}</p>
          {!standing ? (
            <div className="notice error" role="alert">
              {t('board.unread')}
            </div>
          ) : mayEnter(standing) ? (
            <p className="board-go">
              <Link href={`/discuss/${board}`} className="btn">
                {t('board.enter')}
              </Link>
            </p>
          ) : standing.kind === null ? (
            <div className="notice">{whyNot(board)}</div>
          ) : (
            <div className="notice">{t('board.closed')}</div>
          )}
        </section>
      ))}
    </div>
  );
}
