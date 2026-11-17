'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The mark-complete control for one lesson.
 *
 * Optimistic, because a progress tick that waits on a round trip feels broken
 * on a slow connection. A lost or ambiguous response is not proof that the
 * write failed: show the last confirmed state and require a fresh page read.
 *
 * The words can be handed in by a page written in the reader's language (the
 * course page does); without them it is the English it always was, which is
 * what the lesson page still gets.
 */
export type MarkCompleteWords = {
  mark: string;
  undo: string;
  saving: string;
  /** The response was lost: the write may or may not have happened. */
  unconfirmed: string;
  reload: string;
};

const ENGLISH: MarkCompleteWords = {
  mark: 'Mark complete',
  undo: 'Undo',
  saving: 'Saving…',
  unconfirmed:
    'Could not confirm whether progress was saved. Reload this page to check before trying again.',
  reload: 'Reload page',
};

export function MarkComplete({
  enrolmentId,
  lessonId,
  initiallyDone,
  words,
}: {
  enrolmentId: string;
  lessonId: string;
  initiallyDone: boolean;
  words?: MarkCompleteWords;
}) {
  const say = words ?? ENGLISH;
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
          {saving ? say.saving : say.undo}
        </button>
      ) : (
        <button
          type="button"
          className="btn tiny"
          onClick={() => send('completed')}
          disabled={saving || pending || uncertain}
        >
          {saving || pending ? say.saving : say.mark}
        </button>
      )}
      {uncertain && (
        <span className="danger" style={{ fontSize: '0.8rem' }} role="alert">
          {say.unconfirmed}{' '}
          <button type="button" className="btn ghost tiny" onClick={() => window.location.reload()}>
            {say.reload}
          </button>
        </span>
      )}
    </span>
  );
}
