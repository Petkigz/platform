import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDateTime, formatNumber, translator } from '@/lib/i18n';
import { boardOf, mayEnter, parseStanding, parseThreadPage } from '@/lib/boards';
import { translateButtonOn } from '@/lib/translate-server';
import { AgreeForm, HandleForm, ThreadForm } from '../board-forms';
import { READ_FAILED, agreeWords, boardName, boardWords, kindName, readerLanguage } from '../reader';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ board: string }> }): Promise<Metadata> {
  const { shown } = await readerLanguage();
  const board = boardOf((await params).board);
  const t = translator(shown.code);
  return { title: board ? boardName(t, board) : t('board.title') };
}

/**
 * One board: its rules, your username, a box to ask in, and the threads.
 *
 * **Who is let in is the database's answer, asked now.** `my_board()` says
 * what this account is on this board; `board_threads_page()` refuses anybody
 * it would not let in, so a page drawn from an old answer still shows
 * nothing. A student is told when their access ends.
 *
 * **Nobody's name is on this page.** Each thread carries the username its
 * author chose, whether they were a student, a teacher or staff when they
 * wrote it, and whether it is this reader's own. The reply holds nothing
 * else and nothing else is asked for.
 *
 * **What is said before the first post** is on the page, not behind a link:
 * that others see a username, that staff can find out who wrote a post and
 * that each look is recorded, that what you write can still identify you,
 * and that a post is shown at once.
 *
 * **Nobody writes before agreeing** (the owner, 2026-11-26). While this
 * account has not agreed to the terms and the privacy notice in force, the
 * page lists them, each a link to the document with its version, above a box
 * to tick. Until then there is no field for a username and no box to ask in;
 * reading is as before. The database refuses the writing whatever this page
 * draws.
 *
 * What people wrote is shown as they wrote it, in whatever language and
 * direction it was typed (`dir="auto"`), and is not translated.
 */
export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ board: string }>;
  searchParams: Promise<{ before?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');
  const board = boardOf((await params).board);
  if (!board) notFound();

  const supabase = await createClient();
  const user = await supabase.auth.getUser().then(
    (r) => r.data.user,
    () => null,
  );
  if (!user) redirect(`/sign-in?next=/discuss/${board}`);

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const mine = await supabase.rpc('my_board', { p_board: board }).then(
    (r) => r,
    () => READ_FAILED,
  );
  const standing = mine.error ? null : parseStanding(mine.data);
  if (!standing) {
    console.error(`discuss: the ${board} board could not be read:`, mine.error?.message ?? 'an unreadable reply');
  }

  const head = (
    <>
      <nav className="crumbs">
        <Link href="/discuss">{t('board.title')}</Link>
        <span aria-hidden>›</span>
        <span>{boardName(t, board)}</span>
      </nav>
      <div className="page-head">
        <h1>{boardName(t, board)}</h1>
        <p className="board-lede">{t(board === 'students' ? 'board.studentsLead' : 'board.teachersLead')}</p>
      </div>
    </>
  );

  if (!standing) {
    return (
      <div className="page board-page" {...frame}>
        {head}
        <div className="notice error" role="alert" data-board-state="unread">
          {t('board.unread')}
        </div>
      </div>
    );
  }

  if (!mayEnter(standing)) {
    return (
      <div className="page board-page" {...frame}>
        {head}
        <div className="notice" data-board-state={standing.kind === null ? 'out' : 'closed'}>
          {standing.kind !== null
            ? t('board.closed')
            : t(board === 'students' ? 'board.notStudent' : 'board.notTeacher')}
        </div>
        <p className="board-go">
          <Link href="/catalogue" className="btn secondary">
            {t('nav.catalogue')}
          </Link>
        </p>
      </div>
    );
  }

  const { before } = await searchParams;
  const cursor = typeof before === 'string' && !Number.isNaN(Date.parse(before)) ? new Date(before).toISOString() : null;
  const listed = await supabase.rpc('board_threads_page', { p_board: board, p_before: cursor, p_limit: 30 }).then(
    (r) => r,
    () => READ_FAILED,
  );
  const page = listed.error ? null : parseThreadPage(listed.data);
  if (!page) {
    console.error(`discuss: the ${board} threads could not be read:`, listed.error?.message ?? 'an unreadable reply');
  }

  const words = boardWords(t);
  const written = { dir: 'auto', lang: '' } as const;
  const last = page?.threads[page.threads.length - 1];
  // What this account has still to agree to before it writes. Empty: no box.
  const owed = standing.agreements;

  // Whether a reader can ask for a translation of a post, which changes the last line.
  const translateOn = await translateButtonOn(supabase);

  return (
    <div className="page board-page" {...frame} data-board={board} data-board-state="in">
      {head}

      {standing.until ? (
        <div className="notice info" data-board-until>
          <Say text={t('board.until')} parts={{ date: <bdi>{formatDateTime(locale, standing.until)}</bdi> }} />
        </div>
      ) : null}

      <section className="card board-card" data-board-rules>
        <h2>{t('board.rulesTitle')}</h2>
        <ul className="board-rules">
          <li>{t('board.ruleName')}</li>
          <li>{t('board.ruleStaff')}</li>
          <li>{t('board.ruleCare')}</li>
          <li>{t('board.ruleShown')}</li>
        </ul>
      </section>

      {owed.length > 0 ? (
        <section className="card board-card" data-board-agree={owed.map((document) => document.slug).join(' ')}>
          <h2>{t('board.agreeTitle')}</h2>
          <p>{t('board.agreeLead')}</p>
          <ul className="board-rules">
            {owed.map((document) => (
              <li key={document.slug}>
                {/* The owner's title, as written; the documents are not translated. */}
                <Link href={`/policies/${document.slug}`} lang="en" dir="ltr">
                  {document.title}
                </Link>
                {' · '}
                <Say text={t('policy.versionNo')} parts={{ number: <bdi>{formatNumber(locale, document.version)}</bdi> }} />
              </li>
            ))}
          </ul>
          <AgreeForm documents={owed} words={agreeWords(t)} />
        </section>
      ) : null}

      <section className="card board-card" data-board-handle={standing.handle ? 'chosen' : 'none'}>
        <h2>{t('board.nameTitle')}</h2>
        {standing.handle ? (
          <p>
            <Say
              text={t('board.nameNow')}
              parts={{
                name: (
                  <strong>
                    <bdi {...written}>{standing.handle}</bdi>
                  </strong>
                ),
              }}
            />
          </p>
        ) : null}
        {standing.blocked ? (
          <div className="notice warn" data-board-blocked>
            {t('board.whyBlocked')}
          </div>
        ) : standing.handle && standing.handleFixed ? (
          <p className="muted">{t('board.nameFixed')}</p>
        ) : owed.length > 0 ? (
          <p className="muted" data-board-handle-waits>
            {t('board.whyAgree')}
          </p>
        ) : (
          <>
            <p className="muted">{t('board.nameLead')}</p>
            <HandleForm board={board} current={standing.handle} words={words} />
          </>
        )}
      </section>

      {standing.handle && !standing.blocked && owed.length === 0 ? (
        <section className="card board-card" data-board-ask>
          <h2>{t('board.newTitle')}</h2>
          <ThreadForm board={board} words={words} />
        </section>
      ) : null}

      <section className="board-list" data-board-list>
        {!page ? (
          <div className="notice error" role="alert">
            {t('board.unread')}
          </div>
        ) : page.threads.length === 0 ? (
          <p className="muted" data-board-empty>
            {t('board.empty')}
          </p>
        ) : (
          <ul className="board-threads">
            {page.threads.map((thread) => (
              <li key={thread.id} data-board-thread={thread.id}>
                <Link href={`/discuss/${board}/${thread.id}`} className="board-thread-title">
                  <bdi {...written}>{thread.title}</bdi>
                </Link>
                <p className="board-by">
                  <bdi {...written}>{thread.handle}</bdi>
                  <span className="badge neutral">{kindName(t, thread.kind)}</span>
                  {thread.mine ? <span className="badge ok">{t('board.yours')}</span> : null}
                  <span>
                    {t('board.replies')}: <bdi>{formatNumber(locale, thread.replies)}</bdi>
                  </span>
                  <bdi>{formatDateTime(locale, thread.lastActivityAt)}</bdi>
                </p>
              </li>
            ))}
          </ul>
        )}
        {page?.more && last ? (
          <p className="board-go">
            <Link href={`/discuss/${board}?before=${encodeURIComponent(last.lastActivityAt)}`} className="btn secondary">
              {t('board.older')}
            </Link>
          </p>
        ) : null}
        <p className="muted">{translateOn ? t('translate.offered') : t('board.asWritten')}</p>
      </section>
    </div>
  );
}
