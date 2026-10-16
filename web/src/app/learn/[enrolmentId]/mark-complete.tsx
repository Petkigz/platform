'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The mark-complete control for one lesson.
 *
 * Optimistic, because a progress tick that waits on a round trip feels broken
 * on a slow connection — and this is a product whose first design constraint
 * is ease of use. On failure it reverts and says why.
 */
export function MarkComplete({
  enrolmentId,
  lessonId,
  initiallyDone,
}: {
  enrolmentId: string;
  lessonId: string;
  initiallyDone: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initiallyDone);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function send(status: 'completed' | 'in_progress') {
    const previous = done;
    setError(null);
    setDone(status === 'completed');

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enrolmentId, lessonId, status }),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      setDone(previous);
      setError(json?.message ?? 'Could not save your progress.');
      return;
    }

    // Re-read the summary so the bar and the counts move together.
    startTransition(() => router.refresh());
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <span className={`tick ${done ? 'done' : ''}`} aria-hidden="true">✓</span>
      {done ? (
        <button
          type="button"
          className="btn ghost tiny"
          onClick={() => send('in_progress')}
          disabled={pending}
        >
          Undo
        </button>
      ) : (
        <button
          type="button"
          className="btn tiny"
          onClick={() => send('completed')}
          disabled={pending}
        >
          {pending ? 'Saving…' : 'Mark complete'}
        </button>
      )}
      {error && (
        <span className="danger" style={{ fontSize: '0.8rem' }} role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
