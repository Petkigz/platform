'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DiscussionPost } from '@/lib/discussion';
import { DISCUSSION_BODY_MAX, discussionOutcomeOf } from '@/lib/discussion-outcome';
import { fill, formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';
import { ReportForm, type ReportFormWords } from './report-form';

/**
 * A lesson thread.
 *
 * The rule shown here has to match what the database actually does, because a
 * learner's post is held until a person approves it and the interface has to
 * say so. Promising "posted!" for something sitting in a review queue is how
 * someone decides the site is broken and posts it three more times.
 *
 * **The words can be handed in.** The lesson page passes `words` in the
 * reader's language, and the report form's words with them; a caller that
 * passes nothing gets the English below. They arrive as props from the server,
 * so these sentences are in no catalogue that every page carries.
 *
 * **When a post does not go through.** A page with `words` reads the reply's
 * code, never its English sentence. A refusal says which refusal it was. A
 * reply that never came, or a server error, says the post could not be
 * confirmed and to reload and look before sending again: a learner is shown
 * their own held posts, and nothing stops the same question being held twice.
 *
 * **What people wrote keeps its own direction.** A question, a reply and a
 * name are the writer's, not the page's.
 */
export type DiscussionWords = {
  heading: string;
  closed: string;
  intro: string;
  /** No questions, for somebody who cannot ask one. */
  empty: string;
  /** No questions, for somebody who can. */
  emptyAsk: string;
  /** After a name: the course author or staff. */
  teacher: string;
  /** In place of a name the profile does not have. */
  someone: string;
  awaiting: string;
  /** On a post a moderator took down, shown to its writer alone. */
  withdrawn: string;
  reply: string;
  reportPost: string;
  reportReply: string;
  /** Carries `{name}`. The reply box's label and the hint inside it. */
  replyTo: string;
  send: string;
  sending: string;
  ask: string;
  askPlaceholder: string;
  cancelReply: string;
  held: string;
  posted: string;
  writeFirst: string;
  /** Carries `{max}`. */
  tooLong: string;
  closedNow: string;
  replyGone: string;
  signIn: string;
  refused: string;
  uncertain: string;
};

const ENGLISH: DiscussionWords = {
  heading: 'Discussion',
  closed: 'Discussion is not open on this lesson.',
  intro:
    'Ask about this lesson, or answer someone else. Learner questions and replies are reviewed before they appear. Course author and staff posts appear immediately.',
  empty: 'No questions yet.',
  emptyAsk: 'No questions yet. Ask the first one.',
  teacher: 'teacher',
  someone: 'Someone',
  awaiting: 'Awaiting review',
  withdrawn: 'Not shown after review',
  reply: 'Reply',
  reportPost: 'Report this post',
  reportReply: 'Report this reply',
  replyTo: 'Reply to {name}',
  send: 'Send',
  sending: 'Sending…',
  ask: 'Ask a question',
  askPlaceholder: 'Ask a question about this lesson',
  cancelReply: 'Cancel reply',
  held: 'Sent. It will appear once a person has reviewed it.',
  posted: 'Posted.',
  writeFirst: 'Write something first.',
  tooLong: 'Please keep it under {max} characters.',
  closedNow: 'Discussion is not open on this lesson right now.',
  replyGone: 'That question is no longer open for replies.',
  signIn: 'Sign in to join the discussion.',
  refused: 'That could not be posted. Reload the page and try again.',
  uncertain: 'We could not confirm that this was posted. Reload the page to check before sending it again.',
};

export function Discussion({
  lessonId,
  posts,
  enabled,
  canPost,
  words,
  reportWords,
  locale = 'en',
}: {
  lessonId: string;
  posts: DiscussionPost[];
  enabled: boolean;
  canPost: boolean;
  words?: DiscussionWords;
  /** The report form under each post, in the same language as `words`. */
  reportWords?: ReportFormWords;
  /** The language `words` is in, for the number in "under 4,000 characters". */
  locale?: LocaleCode;
}) {
  const say = words ?? ENGLISH;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Two drafts. With one, a question half written turned up in the reply box
  // of whichever post was answered next, and was sent as a reply to it.
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');
  const [sending, setSending] = useState(false);

  function refuse(text: string) {
    setTone('error');
    setMessage(text);
  }

  function failure(status: number, code: unknown): string {
    const outcome = discussionOutcomeOf(status, code);
    if (outcome === 'sign_in') return say.signIn;
    if (outcome === 'closed') return say.closedNow;
    if (outcome === 'empty') return say.writeFirst;
    if (outcome === 'too_long') return tooLong();
    if (outcome === 'reply_unavailable') return say.replyGone;
    return outcome === 'refused' ? say.refused : say.uncertain;
  }

  function tooLong(): string {
    return fill(say.tooLong, { max: formatNumber(locale, DISCUSSION_BODY_MAX) });
  }

  async function send(parentId: string | null) {
    const body = parentId === null ? question : reply;
    setMessage(null);
    // Two refusals that need no request to know.
    if (body.trim() === '') return refuse(say.writeFirst);
    if (body.length > DISCUSSION_BODY_MAX) return refuse(tooLong());

    setSending(true);
    try {
      const res = await fetch('/api/discussion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lessonId, body, parentId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: unknown;
        held?: boolean;
      };

      if (!res.ok) {
        // The server's sentence is English. A page in another language gets
        // its own; an English one keeps the server's.
        const ours = failure(res.status, json.code);
        refuse(words || typeof json.error !== 'string' ? ours : json.error);
        return;
      }

      if (parentId === null) setQuestion('');
      else setReply('');
      setReplyTo(null);
      setTone('info');
      setMessage(json.held ? say.held : say.posted);
      startTransition(() => router.refresh());
    } catch {
      // No reply at all: it may have arrived.
      refuse(say.uncertain);
    } finally {
      setSending(false);
    }
  }

  const busy = pending || sending;

  if (!enabled) {
    return (
      <section className="card">
        <h2>{say.heading}</h2>
        <p className="muted">{say.closed}</p>
      </section>
    );
  }

  const nameOf = (post: DiscussionPost) => (post.authorIsNamed ? post.authorName : say.someone);
  const author = (post: DiscussionPost) => (
    <span className="muted">
      <bdi>{nameOf(post)}</bdi>
      {post.isAuthority && ` · ${say.teacher}`}
    </span>
  );
  // What the writer of a post sees on it when nobody else can see it. Only a
  // moderator's decision makes a post `hidden` or `removed`, and its writer
  // can still read either, so both say so: with no badge the writer of a
  // withdrawn reply took it for published.
  const standing = (post: DiscussionPost) =>
    post.visibilityState === 'pending' ? (
      <span className="badge neutral">{say.awaiting}</span>
    ) : post.visibilityState === 'hidden' || post.visibilityState === 'removed' ? (
      <span className="badge neutral">{say.withdrawn}</span>
    ) : null;
  // What somebody wrote reads in its own direction and sits where the page
  // starts. As a block it was the full width of the card, so an English
  // question on an Arabic page was at the far left and its writer's name at
  // the far right.
  const written = {
    display: 'inline-block',
    justifySelf: 'start',
    maxWidth: '100%',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  } as const;
  // Not `.row`: that class gives its first child a fixed width, which cut a
  // long name short.
  const meta = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.25rem 0.75rem' } as const;

  return (
    <section className="card">
      <h2>{say.heading}</h2>
      <p className="muted">{say.intro}</p>

      {posts.length === 0 && <p className="muted">{canPost ? say.emptyAsk : say.empty}</p>}

      <ul className="lessons" style={{ alignItems: 'flex-start' }}>
        {posts.map((p) => (
          <li key={p.id} style={{ display: 'grid', gap: '0.5rem', width: '100%' }}>
            <div>
              <span className="t" dir="auto" style={written}>
                {p.body}
              </span>
              <div style={{ ...meta, marginTop: '0.25rem' }}>
                {author(p)}
                {standing(p)}
                {canPost && p.visibilityState === 'visible' && (
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ width: 'auto', margin: 0, padding: 0, fontSize: 'inherit' }}
                    aria-expanded={replyTo === p.id}
                    onClick={() => {
                      setReply('');
                      setReplyTo(replyTo === p.id ? null : p.id);
                    }}
                  >
                    {say.reply}
                  </button>
                )}
              </div>
              {/* Under the line, not in it: opened, the form is a card. */}
              {canPost && p.visibilityState === 'visible' && (
                <ReportForm lessonId={lessonId} postId={p.id} label={say.reportPost} words={reportWords} locale={locale} />
              )}
            </div>

            {p.replies.length > 0 && (
              <ul className="lessons" style={{ marginInlineStart: '1rem' }}>
                {p.replies.map((r) => (
                  <li key={r.id} style={{ display: 'grid', gap: '0.25rem' }}>
                    <span className="t" dir="auto" style={written}>
                      {r.body}
                    </span>
                    <div style={meta}>
                      {author(r)}
                      {standing(r)}
                    </div>
                    {/* In a block of its own: as an item of this grid the link
                        was stretched across the row and sat in its middle. */}
                    {canPost && r.visibilityState === 'visible' && (
                      <div>
                        <ReportForm lessonId={lessonId} postId={r.id} label={say.reportReply} words={reportWords} locale={locale} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {replyTo === p.id && canPost && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={fill(say.replyTo, { name: nameOf(p) })}
                  aria-label={fill(say.replyTo, { name: nameOf(p) })}
                  dir="auto"
                  maxLength={DISCUSSION_BODY_MAX}
                  style={{ flex: '1 1 12rem', minWidth: 0 }}
                />
                <button
                  type="button"
                  className="btn"
                  style={{ width: 'auto', margin: 0 }}
                  disabled={busy}
                  onClick={() => send(p.id)}
                >
                  {busy ? say.sending : say.send}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {canPost && (
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={say.askPlaceholder}
            aria-label={say.askPlaceholder}
            dir="auto"
            maxLength={DISCUSSION_BODY_MAX}
            disabled={replyTo !== null}
          />
          <div className="page-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn"
              disabled={busy || replyTo !== null}
              onClick={() => send(null)}
            >
              {busy && replyTo === null ? say.sending : say.ask}
            </button>
            {replyTo !== null && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setReply('');
                  setReplyTo(null);
                }}
              >
                {say.cancelReply}
              </button>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status" style={{ marginTop: '0.75rem' }}>
          {message}
        </div>
      )}
    </section>
  );
}
