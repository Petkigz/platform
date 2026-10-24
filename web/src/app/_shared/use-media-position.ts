'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { clampPosition, resumeLabel, shouldResume } from '@/lib/resume';

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
 * a write on every tick would be 14 000 requests for an hour of recitation. Ten
 * seconds of drift is invisible to a person and one write every ten seconds to a
 * database. Pause, the end of the media, and leaving the page are the moments
 * that matter, so those are forced.
 *
 * **Never let saving break playback.** A refused write is a lost bookmark, not a
 * broken lesson; the player says so quietly and says it once.
 */
export function useMediaPosition({ enrolmentId, lessonId, resumeAt }: Options) {
  const ref = useRef<HTMLMediaElement | null>(null);
  const resumed = useRef(false);
  const lastSent = useRef<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = useCallback(
    async (seconds: number, force: boolean) => {
      if (!enrolmentId) return;
      const whole = clampPosition(seconds);
      if (!force && lastSent.current !== null && Math.abs(whole - lastSent.current) < 10) return;
      lastSent.current = whole;
      try {
        const response = await fetch('/api/learn/position', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ enrolmentId, lessonId, seconds: whole }),
        });
        if (!response.ok) {
          const result = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(result.error ?? 'That place was not kept.');
        }
        setSaveError(null);
      } catch (cause) {
        // Said once, quietly. A learner who sees an error mid-recitation should
        // be able to keep listening.
        setSaveError(cause instanceof Error ? cause.message : 'That place was not kept.');
      }
    },
    [enrolmentId, lessonId],
  );

  // Leaving the page is the most common way a lesson ends, and `beforeunload` is
  // the only hook that runs then. `sendBeacon` would be tidier but cannot carry
  // the auth cookie the same way under every browser, so the fetch is fired and
  // left to settle.
  useEffect(() => {
    const flush = () => {
      const element = ref.current;
      if (element && element.currentTime > 0) void save(element.currentTime, true);
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
      if (!element || resumed.current) return;
      resumed.current = true;
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
