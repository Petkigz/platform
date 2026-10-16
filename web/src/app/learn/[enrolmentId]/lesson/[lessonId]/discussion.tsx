'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DiscussionPost } from '@/lib/discussion';

/**
 * A lesson thread.
 *
 * The rule shown here has to match what the database actually does, because a
 * learner's post is held until a person approves it and the interface has to
 * say so. Promising "posted!" for something sitting in a review queue is how
 * someone decides the site is broken and posts it three more times.
 */
export function Discussion({
  lessonId,
  posts,
  enabled,
  canPost,
}: {
  lessonId: string;
  posts: DiscussionPost[];
  enabled: boolean;
  canPost: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function send(parentId: string | null) {
    setMessage(null);
    const res = await fetch('/api/discussion', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lessonId, body: draft, parentId }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      held?: boolean;
    };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'Could not post that.');
      return;
    }

    setDraft('');
    setReplyTo(null);
    setTone('info');
    setMessage(
      json.held
        ? 'Sent. It will appear once a person has reviewed it.'
        : 'Posted.',
    );
    startTransition(() => router.refresh());
  }

  if (!enabled) {
    return (
      <section className="card">
        <h2>Discussion</h2>
        <p className="muted">
          Discussion is not open on this lesson.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Discussion</h2>
      <p className="muted">
        Ask about this lesson, or answer someone else. Anything you write is
        reviewed before it appears — questions and answers alike.
      </p>

      {posts.length === 0 && (
        <p className="muted">No questions yet. Ask the first one.</p>
      )}

      <ul className="lessons" style={{ alignItems: 'flex-start' }}>
        {posts.map((p) => (
          <li key={p.id} style={{ display: 'grid', gap: '0.5rem', width: '100%' }}>
            <div>
              <span className="t">
                {p.body}
              </span>
              <div className="row" style={{ gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className="muted">
                  {p.authorName}
                  {p.isAuthority && ' · teacher'}
                </span>
                {p.visibilityState === 'pending' && (
                  <span className="badge neutral">Awaiting review</span>
                )}
                {p.visibilityState === 'hidden' && (
                  <span className="badge neutral">Withdrawn</span>
                )}
                {canPost && p.visibilityState === 'visible' && (
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ width: 'auto', margin: 0, padding: 0, fontSize: 'inherit' }}
                    onClick={() => setReplyTo(replyTo === p.id ? null : p.id)}
                  >
                    Reply
                  </button>
                )}
              </div>
            </div>

            {p.replies.length > 0 && (
              <ul className="lessons" style={{ marginLeft: '1rem' }}>
                {p.replies.map((r) => (
                  <li key={r.id}>
                    <span className="t">{r.body}</span>
                    <span className="muted">
                      {r.authorName}
                      {r.isAuthority && ' · teacher'}
                    </span>
                    {r.visibilityState === 'pending' && (
                      <span className="badge neutral">Awaiting review</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {replyTo === p.id && canPost && (
              <div className="row">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Reply to ${p.authorName}`}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn"
                  disabled={pending}
                  onClick={() => send(p.id)}
                >
                  Send
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
            value={replyTo ? '' : draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question about this lesson"
            disabled={replyTo !== null}
          />
          <div className="row">
            <button
              type="button"
              className="btn"
              disabled={pending || replyTo !== null}
              onClick={() => send(null)}
            >
              {pending ? 'Sending…' : 'Ask a question'}
            </button>
            {replyTo !== null && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => setReplyTo(null)}
              >
                Cancel reply
              </button>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
    </section>
  );
}
