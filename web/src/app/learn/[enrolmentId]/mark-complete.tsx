'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The mark-complete control for one lesson.
 *
 * Optimistic, because a progress tick that waits on a round trip feels broken
 * on a slow connection. A lost or ambiguous response is not proof that the
 * write failed: show the last confirmed state and require a fresh page read.
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
  const [uncertain, setUncertain] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);

  async function send(status: 'completed' | 'in_progress') {
    if (inFlight.current || uncertain || pending) return;
    inFlight.current = true;
    setSaving(true);
    const previous = done;
    setDone(status === 'completed');

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enrolmentId, lessonId, status }),
      });
      const reply = await res.json().catch(() => null) as { ok?: unknown; status?: unknown } | null;
      if (!res.ok || reply?.ok !== true || reply.status !== status) throw new Error('Unconfirmed progress');

      // Re-read the summary so the bar and the counts move together.
      startTransition(() => router.refresh());
    } catch {
      // The server may have committed even when the reply is lost. A retry in
      // the opposite direction could overwrite it, so require a fresh read.
      setDone(previous);
      setUncertain(true);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <span className={`tick ${done ? 'done' : ''}`} aria-hidden="true">✓</span>
      {done ? (
        <button
          type="button"
          className="btn ghost tiny"
          onClick={() => send('in_progress')}
          disabled={saving || pending || uncertain}
        >
          {saving ? 'Saving…' : 'Undo'}
        </button>
      ) : (
        <button
          type="button"
          className="btn tiny"
          onClick={() => send('completed')}
          disabled={saving || pending || uncertain}
        >
          {saving || pending ? 'Saving…' : 'Mark complete'}
        </button>
      )}
      {uncertain && (
        <span className="danger" style={{ fontSize: '0.8rem' }} role="alert">
          Could not confirm whether progress was saved. Reload this page to check before trying again.{' '}
          <button type="button" className="btn ghost tiny" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </span>
      )}
    </span>
  );
}
