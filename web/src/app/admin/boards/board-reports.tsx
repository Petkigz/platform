'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { TranslateButton } from '@/components/translate-button';
import type { TranslateWords } from '@/lib/translate';
import { BOARD_ENGLISH, LOOK_REASON_MIN, boardOutcomeOf, type PostAuthor, type ReportedPost } from '@/lib/boards';

type Said = { tone: 'error' | 'warn' | 'info'; text: string };

const when = (value: string): string =>
  new Date(value).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

/**
 * The reported posts, each with what can be done about it.
 *
 * Every act takes a written reason and is audited by the database: taking a
 * post down, deciding it stays, stopping a username from writing, and opening
 * the account behind a post. The last asks for a longer reason and says, on
 * the button and beside it, that the look is recorded.
 *
 * The account is kept in this component's memory only. Reading the page
 * again forgets it, and looking again is another audit entry.
 */
export function BoardReports({ reports, translate = null }: { reports: ReportedPost[]; translate?: TranslateWords | null }) {
  const router = useRouter();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<Record<string, Said>>({});
  const [authors, setAuthors] = useState<Record<string, PostAuthor>>({});

  const keyOf = (row: ReportedPost) => row.replyId ?? row.threadId;

  async function act(row: ReportedPost, name: 'remove' | 'keep' | 'block' | 'author') {
    const key = keyOf(row);
    if (busy) return;
    const reason = (reasons[key] ?? '').trim();
    if (reason.length < (name === 'author' ? LOOK_REASON_MIN : 4)) {
      setSaid((now) => ({
        ...now,
        [key]: {
          tone: 'error',
          text:
            name === 'author'
              ? `Write why you need to know who wrote this, in at least ${LOOK_REASON_MIN} characters. It is kept in the audit log.`
              : BOARD_ENGLISH.reason_required,
        },
      }));
      return;
    }
    setBusy(`${key}:${name}`);
    const payload =
      name === 'block'
        ? { action: 'block', handleId: row.handleId, block: !row.blocked, reason }
        : name === 'author'
          ? { action: 'author', threadId: row.threadId, replyId: row.replyId, reason }
          : { action: 'moderate', threadId: row.threadId, replyId: row.replyId, remove: name === 'remove', reason };
    let res: Response;
    try {
      res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      setBusy(null);
      setSaid((now) => ({ ...now, [key]: { tone: 'warn', text: 'The server could not be reached. Nothing was sent.' } }));
      return;
    }
    const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown; author?: PostAuthor } | null;
    setBusy(null);
    if (!res.ok || json?.ok !== true) {
      const named = res.ok ? 'unconfirmed' : boardOutcomeOf(res.status, json?.code);
      setSaid((now) => ({ ...now, [key]: { tone: named === 'unconfirmed' ? 'warn' : 'error', text: BOARD_ENGLISH[named] } }));
      if (named === 'unconfirmed' || named === 'not_found') router.refresh();
      return;
    }
    if (name === 'author' && json.author) {
      setAuthors((now) => ({ ...now, [key]: json.author! }));
      setSaid((now) => ({ ...now, [key]: { tone: 'info', text: 'Opened. This look is in the audit log, with your reason.' } }));
      return;
    }
    setSaid((now) => ({
      ...now,
      [key]: {
        tone: 'info',
        text:
          name === 'remove'
            ? 'Taken down. Its reports are closed.'
            : name === 'keep'
              ? 'Left up. Its reports are closed.'
              : row.blocked
                ? 'This username can write again.'
                : 'This username can no longer write. It can still read.',
      },
    }));
    router.refresh();
  }

  if (reports.length === 0) {
    return <div className="empty">No post has an open report.</div>;
  }

  return (
    <div className="stack" style={{ gap: '1rem', marginTop: '1rem' }}>
      {reports.map((row) => {
        const key = keyOf(row);
        const working = busy?.startsWith(`${key}:`) ?? false;
        const author = authors[key];
        const note = said[key];
        return (
          <section key={key} className="card" data-board-report={key}>
            <div className="outline-h" style={{ marginTop: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', overflowWrap: 'anywhere' }} dir="auto">
                {row.title}
              </h2>
              <span className="badge neutral">
                {row.board === 'students' ? 'Students’ board' : 'Teachers’ board'} · {row.replyId ? 'a reply' : 'the first post'}
              </span>
            </div>
            <p className="meta">
              Written as <strong dir="auto">{row.handle}</strong> ({row.kind}) on {when(row.postedAt)} UTC ·{' '}
              {row.reports} {row.reports === 1 ? 'report' : 'reports'}, the first on {when(row.firstReportedAt)} UTC
              {row.blocked ? ' · this username is stopped from writing' : ''}
            </p>
            <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} dir="auto">
              {row.body}
            </p>
            <TranslateButton text={`${row.title}\n\n${row.body}`} words={translate} />
            <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>
              What the reporters wrote
            </p>
            <ul style={{ marginTop: 0 }}>
              {row.reasons.map((reason, index) => (
                <li key={index} dir="auto" style={{ overflowWrap: 'anywhere' }}>
                  {reason}
                </li>
              ))}
            </ul>
            <TranslateButton text={row.reasons.join('\n\n')} words={translate} />

            <label htmlFor={`reason-${key}`}>Your reason (kept in the audit log)</label>
            <textarea
              id={`reason-${key}`}
              rows={2}
              maxLength={1000}
              value={reasons[key] ?? ''}
              onChange={(event) => setReasons((now) => ({ ...now, [key]: event.target.value }))}
              disabled={working}
            />

            <p style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn" disabled={working} onClick={() => act(row, 'remove')}>
                {busy === `${key}:remove` ? 'Taking down…' : 'Take it down'}
              </button>
              <button type="button" className="btn secondary" disabled={working} onClick={() => act(row, 'keep')}>
                {busy === `${key}:keep` ? 'Closing…' : 'Leave it up'}
              </button>
              <button type="button" className="btn secondary" disabled={working} onClick={() => act(row, 'block')}>
                {busy === `${key}:block` ? 'Working…' : row.blocked ? 'Let this username write again' : 'Stop this username writing'}
              </button>
              <button type="button" className="btn ghost" disabled={working} onClick={() => act(row, 'author')}>
                {busy === `${key}:author` ? 'Opening…' : 'See who wrote it (recorded)'}
              </button>
            </p>
            <p className="muted">
              Seeing who wrote a post is for a report that needs a person, or when somebody may be at
              risk. Each look is written to the audit log with your name and your reason.
            </p>

            {author ? (
              <div className="notice warn" data-board-author>
                <strong dir="auto">{row.handle}</strong> is{' '}
                {author.userId ? (
                  <>
                    <strong>{author.name ?? 'an account with no name'}</strong>, account <code>{author.userId}</code>.
                  </>
                ) : (
                  'an account that has since been erased.'
                )}
              </div>
            ) : null}
            {note ? (
              <div className={`notice ${note.tone}`} role={note.tone === 'error' ? 'alert' : 'status'}>
                {note.text}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
