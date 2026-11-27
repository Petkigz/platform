'use client';

import { useState } from 'react';

import { TranslateButton } from '@/components/translate-button';
import type { TranslateWords } from '@/lib/translate';
import { BOARD_ENGLISH, LOOK_REASON_MIN, boardOutcomeOf, isId, threadIdOf, type KeptWords as Kept } from '@/lib/boards';

type Said = { tone: 'error' | 'warn'; text: string };

const when = (value: string): string =>
  new Date(value).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

/**
 * Reading what a closed account had written in one post.
 *
 * When an account closes, its board posts are taken off the boards and say
 * `[erased]`; the words are kept, without the account or the username
 * (`20261281158000`). `board_kept_post()` is the one way to read them, for
 * the owner or governance, with a written reason, and it writes the audit
 * entry before it answers. It had no page: the words could be read only by
 * calling the function by hand.
 *
 * The post is named by its thread and, for a reply, the reply. A moderator
 * comes here from the thread, where a post that says `[erased]` carries a
 * link with both filled in.
 *
 * What is read stays in this component's memory. Reading the page again
 * forgets it, and reading the post again is another audit entry.
 */
export function KeptWords({
  threadId = '',
  replyId = '',
  translate = null,
}: {
  threadId?: string;
  replyId?: string;
  translate?: TranslateWords | null;
}) {
  const [thread, setThread] = useState(threadId);
  const [reply, setReply] = useState(replyId);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [kept, setKept] = useState<Kept | null>(null);

  async function read() {
    if (busy) return;
    setKept(null);
    const threadNamed = threadIdOf(thread);
    const replyNamed = reply.trim();
    if (!threadNamed) {
      setSaid({ tone: 'error', text: 'Give the thread: its address, as copied from the page, or its id.' });
      return;
    }
    if (replyNamed !== '' && !isId(replyNamed)) {
      setSaid({ tone: 'error', text: 'That is not a reply’s id. Leave it empty for the first post of the thread.' });
      return;
    }
    if ([...reason.trim()].length < LOOK_REASON_MIN) {
      setSaid({
        tone: 'error',
        text: `Write why you need to read this, in at least ${LOOK_REASON_MIN} characters. It is kept in the audit log.`,
      });
      return;
    }
    setBusy(true);
    setSaid(null);
    let res: Response;
    try {
      res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'kept',
          threadId: threadNamed,
          replyId: replyNamed === '' ? null : replyNamed.toLowerCase(),
          reason: reason.trim(),
        }),
      });
    } catch {
      setBusy(false);
      setSaid({ tone: 'warn', text: 'The server could not be reached. Nothing was sent, and nothing was recorded.' });
      return;
    }
    const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown; kept?: Kept } | null;
    setBusy(false);
    if (!res.ok || json?.ok !== true || !json.kept) {
      const named = res.ok ? 'unconfirmed' : boardOutcomeOf(res.status, json?.code);
      setSaid({
        tone: named === 'unconfirmed' ? 'warn' : 'error',
        text:
          named === 'not_found'
            ? 'Nothing is kept for that post. Either there is no such post, or its writer’s account has not been closed: a post that was only taken back or taken down still has its words in the thread.'
            : named === 'unconfirmed'
              ? 'No answer came back that could be read. The look may have been recorded in the audit log all the same.'
              : BOARD_ENGLISH[named],
      });
      return;
    }
    setKept(json.kept);
  }

  return (
    <section className="card" id="kept" data-board-kept>
      <h2 style={{ marginTop: 0 }}>What a closed account had written</h2>
      <p className="muted">
        When an account is closed, what it wrote on a board comes off the board and reads{' '}
        <code>[erased]</code>. The words are kept, without the account or its username. Reading
        them is for a report that is still open, or when somebody may be at risk. Each look is
        written to the audit log with your name and your reason.
      </p>

      <label htmlFor="kept-thread">The thread (its address or its id)</label>
      <input
        id="kept-thread"
        type="text"
        dir="ltr"
        value={thread}
        onChange={(event) => setThread(event.target.value)}
        disabled={busy}
        autoComplete="off"
      />
      <label htmlFor="kept-reply">The reply’s id (leave empty for the first post)</label>
      <input
        id="kept-reply"
        type="text"
        dir="ltr"
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        disabled={busy}
        autoComplete="off"
      />
      <label htmlFor="kept-reason">Your reason (kept in the audit log)</label>
      <textarea
        id="kept-reason"
        rows={2}
        maxLength={1000}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        disabled={busy}
      />
      <p>
        <button type="button" className="btn" disabled={busy} onClick={read}>
          {busy ? 'Opening…' : 'Read what was written (recorded)'}
        </button>
      </p>

      {said ? (
        <div className={`notice ${said.tone}`} role={said.tone === 'error' ? 'alert' : 'status'}>
          {said.text}
        </div>
      ) : null}

      {kept ? (
        <div className="notice warn" data-board-kept-words>
          <p className="meta" style={{ marginTop: 0 }}>
            Written on {when(kept.writtenAt)} UTC. Kept on {when(kept.keptAt)} UTC, when the account
            closed. It is not recorded here whose it was. This look is in the audit log, with your
            reason.
          </p>
          {kept.title ? (
            <h3 style={{ overflowWrap: 'anywhere' }} dir="auto">
              {kept.title}
            </h3>
          ) : null}
          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginBottom: 0 }} dir="auto">
            {kept.body}
          </p>
          <TranslateButton text={kept.title ? `${kept.title}\n\n${kept.body}` : kept.body} words={translate} />
        </div>
      ) : null}
    </section>
  );
}
