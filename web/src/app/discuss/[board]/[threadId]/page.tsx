import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDateTime, translator } from '@/lib/i18n';
import { boardOf, boardReasonOf, isId, mayEnter, parseStanding, parseThread } from '@/lib/boards';
import { PostActions, ReplyForm } from '../../board-forms';
import { READ_FAILED, boardName, boardWords, kindName, readerLanguage } from '../../reader';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ board: string }> }): Promise<Metadata> {
  const { shown } = await readerLanguage();
  const board = boardOf((await params).board);
  const t = translator(shown.code);
  return { title: board ? boardName(t, board) : t('board.title') };
}

/**
 * One thread and its replies.
 *
 * `board_thread()` answers only somebody let in to the thread's board, so a
 * student who has the address of a teachers' thread is sent back to the
 * board's page, which says the board is not theirs. A thread that is gone
 * says it is gone.
 *
 * **A reply that was taken back or taken down keeps its place** and says
 * only that: the replies after it still make sense, and neither its words
 * nor its username are in what the database sent. Its author still sees
 * their own, marked.
 *
 * Under each post there is one action: take it back if it is yours, report
 * it if it is not.
 */
export default async function ThreadPage({ params }: { params: Promise<{ board: string; threadId: string }> }) {
  if (!isSupabaseConfigured()) redirect('/');
  const { board: boardParam, threadId } = await params;
  const board = boardOf(boardParam);
  if (!board || !isId(threadId)) notFound();

  const supabase = await createClient();
  const user = await supabase.auth.getUser().then(
    (r) => r.data.user,
    () => null,
  );
  if (!user) redirect(`/sign-in?next=/discuss/${board}/${threadId}`);

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const [mine, asked] = await Promise.all([
    supabase.rpc('my_board', { p_board: board }).then(
      (r) => r,
      () => READ_FAILED,
    ),
    supabase.rpc('board_thread', { p_thread: threadId }).then(
      (r) => r,
      () => READ_FAILED,
    ),
  ]);
  const standing = mine.error ? null : parseStanding(mine.data);
  // Not let in, or the board is closed: the board's own page says which and why.
  if (standing && !mayEnter(standing)) redirect(`/discuss/${board}`);

  const refusal = asked.error ? boardReasonOf(asked.error) : null;
  if (refusal === 'not_allowed' || refusal === 'closed') redirect(`/discuss/${board}`);
  const thread = asked.error ? null : parseThread(asked.data);
  // A thread opened under the other board's address: there is no such page.
  if (thread && thread.board !== board) notFound();
  if (!thread && refusal !== 'not_found') {
    console.error('discuss: a thread could not be read:', asked.error?.message ?? 'an unreadable reply');
  }

  const crumbs = (
    <nav className="crumbs">
      <Link href="/discuss">{t('board.title')}</Link>
      <span aria-hidden>›</span>
      <Link href={`/discuss/${board}`}>{boardName(t, board)}</Link>
    </nav>
  );

  if (!thread || !standing) {
    return (
      <div className="page board-page" {...frame}>
        {crumbs}
        <div
          className={refusal === 'not_found' ? 'notice' : 'notice error'}
          role={refusal === 'not_found' ? undefined : 'alert'}
          data-board-state={refusal === 'not_found' ? 'gone' : 'unread'}
        >
          {refusal === 'not_found' ? t('board.whyGone') : t('board.unread')}
        </div>
        <p className="board-go">
          <Link href={`/discuss/${board}`} className="btn secondary">
            {boardName(t, board)}
          </Link>
        </p>
      </div>
    );
  }

  const words = boardWords(t);
  const written = { dir: 'auto', lang: '' } as const;
  const goneWords = (state: 'withdrawn' | 'removed') => t(state === 'removed' ? 'board.removed' : 'board.takenBack');
  const canWrite = standing.handle !== null && !standing.blocked && thread.state === 'visible';

  return (
    <div className="page board-page" {...frame} data-board={board} data-board-thread-state={thread.state}>
      {crumbs}

      <article className="card board-post" data-board-post="thread">
        <h1 className="board-post-title">
          <bdi {...written}>{thread.title}</bdi>
        </h1>
        <p className="board-by">
          <bdi {...written}>{thread.handle}</bdi>
          <span className="badge neutral">{kindName(t, thread.kind)}</span>
          {thread.mine ? <span className="badge ok">{t('board.yours')}</span> : null}
          <bdi>{formatDateTime(locale, thread.createdAt)}</bdi>
        </p>
        {thread.state !== 'visible' ? (
          <div className="notice warn" data-board-gone={thread.state}>
            {goneWords(thread.state)}
          </div>
        ) : null}
        <div className="board-written" {...written}>
          {thread.body}
        </div>
        {thread.state === 'visible' ? (
          <PostActions threadId={thread.id} replyId={null} mine={thread.mine} words={words} />
        ) : null}
      </article>

      <h2 className="board-replies-head">{t('board.replies')}</h2>
      {thread.replies.length === 0 ? (
        <p className="muted" data-board-empty>
          {t('board.empty')}
        </p>
      ) : (
        <ol className="board-replies">
          {thread.replies.map((reply) => (
            <li key={reply.id} className="card board-post" data-board-post={reply.id} data-board-post-state={reply.state}>
              {reply.handle && reply.kind ? (
                <p className="board-by">
                  <bdi {...written}>{reply.handle}</bdi>
                  <span className="badge neutral">{kindName(t, reply.kind)}</span>
                  {reply.mine ? <span className="badge ok">{t('board.yours')}</span> : null}
                  <bdi>{formatDateTime(locale, reply.createdAt)}</bdi>
                </p>
              ) : null}
              {reply.state !== 'visible' ? (
                <p className="muted" data-board-gone={reply.state}>
                  {goneWords(reply.state)}
                </p>
              ) : null}
              {reply.body ? (
                <div className="board-written" {...written}>
                  {reply.body}
                </div>
              ) : null}
              {reply.state === 'visible' && thread.state === 'visible' ? (
                <PostActions threadId={thread.id} replyId={reply.id} mine={reply.mine} words={words} />
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {canWrite ? (
        <section className="card board-card" data-board-reply>
          <h2>{t('board.replyTitle')}</h2>
          <ReplyForm threadId={thread.id} words={words} />
        </section>
      ) : thread.state === 'visible' ? (
        <div className={standing.blocked ? 'notice warn' : 'notice'} data-board-reply="no">
          {standing.blocked ? t('board.whyBlocked') : t('board.nameLead')}{' '}
          {standing.blocked ? null : <Link href={`/discuss/${board}`}>{t('board.nameTitle')}</Link>}
        </div>
      ) : null}
      <p className="muted">{t('board.asWritten')}</p>
    </div>
  );
}
