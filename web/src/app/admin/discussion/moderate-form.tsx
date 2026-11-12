'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DiscussionContext } from '@/lib/discussion-context';

/**
 * Approve, hide or remove one held post.
 *
 * A reason is required before withdrawing anything, and the database enforces
 * that too — so the prompt here is a convenience, not the rule. If it were only
 * enforced in the form, a second caller would quietly bypass it.
 */
export function ModerateForm({ postId, reviewedBody, reviewedState, parent }: { postId: string; reviewedBody: string; reviewedState: string; parent: DiscussionContext | null }) {
  const router = useRouter();
  const noteId = useId();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function decide(state: 'visible' | 'hidden' | 'removed') {
    setMessage(null);

    if (state !== 'visible' && note.trim().length === 0) {
      setTone('error');
      setMessage('Withdrawing a post needs a written reason.');
      return;
    }

    const res = await fetch('/api/admin/discussion', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId, state, note: note || undefined, reviewedBody, reviewedState, parent }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The decision was not recorded.');
      return;
    }

    setTone('info');
    setNote('');
    setMessage(
      state === 'visible'
        ? 'Published.'
        : state === 'hidden'
          ? 'Withdrawn. The author can no longer see it as published.'
          : 'Removed and kept in the abuse record.',
    );
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div>
        <label className="eyebrow" htmlFor={noteId}>
          Note (required to withdraw)
        </label>
        <input
          id={noteId}
          aria-label="Moderation note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why, if you are hiding or removing it"
        />
      </div>

      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          disabled={pending || (parent !== null && parent.state !== 'visible')}
          onClick={() => decide('visible')}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={pending}
          onClick={() => decide('hidden')}
        >
          Hide
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={pending}
          onClick={() => decide('removed')}
        >
          Remove
        </button>
      </div>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}

      <p className="muted">
        Every decision here is written to the governance audit trail with who
        made it and when.
      </p>
    </div>
  );
}
