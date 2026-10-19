'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Publish or withdraw one held review.
 *
 * Two buttons and one field. The reason is required to withdraw and is the
 * sentence the learner reads, so the label says that out loud — a withdrawal
 * with no explanation looks like a bug from the other side, and the person who
 * wrote it has no way to ask what happened except through the support desk.
 */
export function ModerateForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function decide(state: 'visible' | 'withdrawn') {
    setMessage(null);

    if (state === 'withdrawn' && !note.trim()) {
      setTone('error');
      setMessage('Withdrawing a review needs a written reason.');
      return;
    }

    const res = await fetch('/api/admin/course-reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reviewId, state, note: note.trim() || undefined }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The decision was not recorded.');
      return;
    }

    setTone('info');
    setMessage(
      state === 'visible'
        ? 'Published. It now counts towards the course rating.'
        : 'Withdrawn. It no longer counts, and the author can see why.',
    );
    setNote('');
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div>
        <label className="eyebrow" htmlFor={`note-${reviewId}`}>
          Reason — required to withdraw, and the author reads it
        </label>
        <input
          id={`note-${reviewId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example: names another learner, or advertises another service"
          disabled={pending}
        />
      </div>

      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() => decide('visible')}
        >
          Publish
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={pending}
          onClick={() => decide('withdrawn')}
        >
          Withdraw
        </button>
      </div>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
