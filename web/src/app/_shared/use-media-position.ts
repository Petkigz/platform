'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clampPosition, resumeLabel, shouldResume } from '@/lib/resume';
import { createVersionedPositionWriter, type PositionSnapshot } from '@/lib/versioned-position-writer';

type Options = { enrolmentId?: string | null; lessonId: string; resumeAt?: number | null };
type Conflict = { server: PositionSnapshot; local: number };
type Writer = ReturnType<typeof createVersionedPositionWriter>;
const validRevision = (value: unknown): value is string | null => value === null || (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
function validSnapshot(value: unknown): value is PositionSnapshot {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return validRevision(row.revision) && (row.seconds === null || (Number.isInteger(row.seconds) && (row.seconds as number) >= 0 && (row.seconds as number) <= 2147483647)) && (row.revision !== null || row.seconds === null);
}

/** One player's version-checked writes. Playback remains available on failure;
 * a failed initialization or an ambiguous write disables saving until reload. */
export function useMediaPosition({ enrolmentId, lessonId, resumeAt }: Options) {
  const ref = useRef<HTMLMediaElement | null>(null);
  const writerRef = useRef<Writer | null>(null);
  const initial = useRef<number | null>(null);
  const metadata = useRef(false);
  const snapshotReady = useRef(false);
  const resumed = useRef(false);
  const touched = useRef(false);
  const [ready, setReady] = useState(!enrolmentId);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);

  const applyResume = useCallback(() => {
    const element = ref.current;
    if (!element || !metadata.current || !snapshotReady.current || resumed.current || touched.current) return;
    resumed.current = true;
    const position = initial.current;
    const duration = Number.isFinite(element.duration) ? element.duration : null;
    if (position !== null && shouldResume(position, duration)) {
      element.currentTime = clampPosition(position);
      setNotice(resumeLabel(position));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    writerRef.current = null;
    resumed.current = false;
    touched.current = false;
    snapshotReady.current = !enrolmentId;
    initial.current = enrolmentId ? null : (resumeAt ?? null);
    setReady(!enrolmentId); setConflict(null); setNotice(null); setSaveError(null);
    if (!enrolmentId) {
      applyResume();
      return () => controller.abort();
    }
    // A stalled connection must not leave native playback controls hidden.
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    void (async () => {
      try {
        const query = new URLSearchParams({ enrolmentId, lessonId });
        const response = await fetch(`/api/learn/position-v2?${query}`, { cache: 'no-store', signal: controller.signal });
        const data: unknown = await response.json();
        if (!response.ok || !validSnapshot(data) || (data as { ok?: unknown }).ok !== true) throw new Error('Invalid snapshot');
        if (cancelled) return;
        const server: PositionSnapshot = { seconds: data.seconds, revision: data.revision };
        initial.current = server.seconds;
        snapshotReady.current = true;
        const writer = createVersionedPositionWriter({
          revision: server.revision,
          write: async (seconds, revision) => {
            const requestController = new AbortController();
            const deadline = window.setTimeout(() => requestController.abort(), 15000);
            try {
              const result = await fetch('/api/learn/position-v2', {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ enrolmentId, lessonId, seconds, revision }),
                keepalive: true, signal: requestController.signal,
              });
              const value: unknown = await result.json();
              if (!validSnapshot(value) || typeof (value as { ok?: unknown }).ok !== 'boolean') throw new Error('Invalid response');
              const ok = (value as PositionSnapshot & { ok: boolean }).ok;
              if ((ok && (!result.ok || value.seconds !== seconds || value.revision === null)) || (!ok && result.status !== 409)) throw new Error('Unconfirmed response');
              return { ok, seconds: value.seconds, revision: value.revision };
            } finally {
              window.clearTimeout(deadline);
            }
          },
          onConfirmed: () => setSaveError(null),
          onConflict: (snapshot, local) => setConflict({ server: snapshot, local }),
          onUnconfirmed: () => setSaveError('Could not confirm your saved place. Reload the lesson to check before continuing to save.'),
        });
        writerRef.current = writer;
        if (touched.current && ref.current) writer.challenge(server, ref.current.currentTime);
        else applyResume();
        setReady(true);
      } catch {
        if (!cancelled) {
          setSaveError('Could not load your saved place. You can play this lesson, but saving is unavailable until you reload.');
          setReady(true);
        }
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
      if (ref.current && ref.current.currentTime > 0) writerRef.current?.enqueue(ref.current.currentTime, true);
      writerRef.current?.dispose();
      writerRef.current = null;
    };
  }, [enrolmentId, lessonId, resumeAt, applyResume]);

  const save = useCallback((seconds: number, force: boolean) => {
    if (!enrolmentId) return;
    if (!writerRef.current) { if (seconds > 0) touched.current = true; return; }
    writerRef.current.enqueue(seconds, force);
  }, [enrolmentId]);

  useEffect(() => {
    const flush = () => { if (ref.current && ref.current.currentTime > 0) save(ref.current.currentTime, true); };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [save]);

  const useServer = () => {
    const selected = writerRef.current?.useServer();
    if (!selected) return;
    setConflict(null); setNotice(null);
    if (ref.current) ref.current.currentTime = clampPosition(selected.seconds ?? 0);
  };
  const useLocal = () => {
    if (!writerRef.current) return;
    setConflict(null);
    writerRef.current.useLocal();
  };
  const handlers = {
    onLoadedMetadata: () => { metadata.current = true; applyResume(); },
    onTimeUpdate: () => { if (ref.current) save(ref.current.currentTime, false); },
    onPause: () => { if (ref.current) save(ref.current.currentTime, true); },
    onEnded: () => { if (ref.current) save(ref.current.currentTime, true); },
  };
  return { ref, ready, notice, saveError, conflict, useServer, useLocal, handlers };
}
