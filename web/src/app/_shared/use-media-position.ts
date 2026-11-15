'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { clampPosition, resumeLabel, shouldResume } from '@/lib/resume';
import { createPositionWriter } from '@/lib/position-writer';

type Options = {
  /** The enrolment the position belongs to. Null means "do not save". */
  enrolmentId?: string | null;
  lessonId: string;
  /** Where the database says this learner stopped, read on the server. */
  resumeAt?: number | null;
};

/**
 * Keeps one media element's place.
 *
 * Three behaviours, and each exists because the obvious version fails.
 *
 * **Resume once, on the first load.** A quality switch re-fires `loadedmetadata`
 * on the same element, and resuming again mid-session would throw the learner
 * back to a position the database still holds from ten minutes ago.
 *
 * **Save on a timer and at the edges.** `timeupdate` fires four times a second;
 * a write on every tick could be thousands of requests per hour. Normal writes
 * are spaced by ten seconds of playback; pause, the end and leaving the page
 * request a save too. Page exit remains best effort and can lose the last place.
 *
 * **Never let saving break playback.** A refused write is a lost bookmark, not a
 * broken lesson; the player says so quietly and says it once.
 */
export function useMediaPosition({ enrolmentId, lessonId, resumeAt }: Options) {
  const ref = useRef<HTMLMediaElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const writer = useMemo(() => createPositionWriter({
    write: async (seconds) => {
      const response = await fetch('/api/learn/position', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enrolmentId, lessonId, seconds }),
        // Best effort only: browsers can still stop the request when leaving.
        keepalive: true,
      });
      const result = await response.json().catch(() => null) as { ok?: unknown; seconds?: unknown } | null;
      if (!response.ok || result?.ok !== true || result.seconds !== seconds) {
        throw new Error('Position not confirmed');
      }
    },
    onUnconfirmed: () => setSaveError('Could not confirm your saved place. Reload the lesson to check before continuing to save.'),
  }), [enrolmentId, lessonId]);

  const resumedFor = useRef<typeof writer | null>(null);
  const save = useCallback((seconds: number, force: boolean) => {
    if (enrolmentId) writer.enqueue(seconds, force);
  }, [enrolmentId, writer]);

  useEffect(() => {
    setNotice(null);
    setSaveError(null);
  }, [writer]);

  // Page exit is a best-effort flush, not a durability guarantee. If an earlier
  // request is still in flight, the queued final position may never be sent
  // before the browser suspends or terminates this page.
  useEffect(() => {
    const element = ref.current;
    const flush = () => {
      if (element && element.currentTime > 0) save(element.currentTime, true);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [save]);

  const handlers = {
    onLoadedMetadata: () => {
      const element = ref.current;
      if (!element || resumedFor.current === writer) return;
      resumedFor.current = writer;
      const duration = Number.isFinite(element.duration) ? element.duration : null;
      if (resumeAt !== null && resumeAt !== undefined && shouldResume(resumeAt, duration)) {
        element.currentTime = clampPosition(resumeAt);
        setNotice(resumeLabel(resumeAt));
      }
    },
    onTimeUpdate: () => {
      const element = ref.current;
      if (element) void save(element.currentTime, false);
    },
    onPause: () => {
      const element = ref.current;
      if (element) void save(element.currentTime, true);
    },
    onEnded: () => {
      const element = ref.current;
      if (element) void save(element.currentTime, true);
    },
  };

  return { ref, notice, saveError, handlers };
}
