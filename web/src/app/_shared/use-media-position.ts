'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clampPosition, resumeLabel, shouldResume } from '@/lib/resume';
import { useT } from '@/lib/i18n/client';
import { createVersionedPositionWriter, type PositionSnapshot } from '@/lib/versioned-position-writer';
import { positionRecovery, type RecoveryRecord } from '@/lib/position-recovery';
import { resourcePositionRecovery } from '@/lib/resource-position-recovery';

type Options = { enrolmentId?: string | null; lessonId: string; resourceId?: string; legacyActorId?: string; resumeAt?: number | null };

// The resource mode is prepared for integration but is not enabled by current
// lesson pages. Never treat a missing resource identity as a resource bookmark.
function recoveryStore(storage: Storage, resourceId?: string): ReturnType<typeof positionRecovery> {
  if (resourceId === undefined) return positionRecovery(storage);
  const store = resourcePositionRecovery(storage);
  return {
    enabled: store.enabled, enable: store.enable, disable: store.disable,
    save: (record) => store.save({ ...record, resourceId }),
    list: (scope) => store.list({ ...scope, resourceId }),
    remove: (record) => store.remove({ ...record, resourceId }),
  };
}
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
export function useMediaPosition({ enrolmentId, lessonId, resourceId, legacyActorId, resumeAt }: Options) {
  const ref = useRef<HTMLMediaElement | null>(null);
  // The sentences this hook sets are asked for in the language of the page the
  // player is on. Through a ref, never as a dependency: outside a provider
  // `useT()` is a new function on every render, and an effect that reran for
  // it would read the saved place again in the middle of a lesson.
  const t = useT();
  const say = useRef(t);
  say.current = t;
  const writerRef = useRef<Writer | null>(null);
  const initial = useRef<number | null>(null);
  const metadata = useRef(false);
  const snapshotReady = useRef(false);
  const resumed = useRef(false);
  const touched = useRef(false);
  const storageRef = useRef<ReturnType<typeof positionRecovery> | null>(null);
  const recovery = useRef<{ store: ReturnType<typeof positionRecovery>; actorId: string; enrolmentId: string; lessonId: string; sessionId: string } | null>(null);
  const ownRecord = useRef<RecoveryRecord | null>(null);
  const selectedRecord = useRef<RecoveryRecord | null>(null);
  const selectedLegacyRecovery = useRef<RecoveryRecord | null>(null);
  const legacyRecoveryStore = useRef<ReturnType<typeof positionRecovery> | null>(null);
  const recoveryGate = useRef(false);
  const pendingPlayback = useRef<number | null>(null);
  const serverSnapshot = useRef<PositionSnapshot | null>(null);
  const [recoveryEnabled, setRecoveryEnabled] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveries, setRecoveries] = useState<RecoveryRecord[]>([]);
  const [legacyRecoveries, setLegacyRecoveries] = useState<RecoveryRecord[]>([]);
  const [ready, setReady] = useState(!enrolmentId);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [legacyPlace, setLegacyPlace] = useState<number | null>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);

  const forget = useCallback((record: RecoveryRecord | null) => {
    if (!record || !recovery.current) return;
    try { recovery.current.store.remove(record); }
    catch { setRecoveryError(say.current('player.storeClearFailed')); }
  }, []);

  const persist = useCallback((seconds: number) => {
    const context = recovery.current;
    if (!context) return;
    const whole = clampPosition(seconds);
    try {
      if (!context.store.enabled()) return;
      if (ownRecord.current?.seconds === whole) return;
      const record: RecoveryRecord = { actorId: context.actorId, enrolmentId: context.enrolmentId,
        lessonId: context.lessonId, sessionId: context.sessionId, seconds: whole, updatedAt: Date.now() };
      if (context.store.save(record)) ownRecord.current = record;
    } catch { setRecoveryError(say.current('player.storeSaveFailed')); }
  }, []);

  const applyResume = useCallback(() => {
    const element = ref.current;
    if (!element || !metadata.current || !snapshotReady.current || resumed.current || touched.current) return;
    resumed.current = true;
    const position = initial.current;
    const duration = Number.isFinite(element.duration) ? element.duration : null;
    if (position !== null && shouldResume(position, duration)) {
      element.currentTime = clampPosition(position);
      setNotice(resumeLabel(position, say.current));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    writerRef.current = null;
    storageRef.current = null; recovery.current = null; ownRecord.current = null; selectedRecord.current = null;
    legacyRecoveryStore.current = null; selectedLegacyRecovery.current = null;
    recoveryGate.current = false; pendingPlayback.current = null; serverSnapshot.current = null;
    setRecoveries([]); setLegacyRecoveries([]); setRecoveryEnabled(false); setRecoveryAvailable(false); setRecoveryError(null);
    resumed.current = false;
    touched.current = false;
    snapshotReady.current = !enrolmentId;
    initial.current = enrolmentId ? null : (resumeAt ?? null);
    setReady(!enrolmentId); setConflict(null); setNotice(null); setSaveError(null);
    setLegacyPlace(null); setLegacyError(null);
    if (!enrolmentId) {
      applyResume();
      return () => controller.abort();
    }
    // The device opt-out must remain available even if the network is down.
    try {
      const store = recoveryStore(window.localStorage, resourceId);
      const enabled = store.enabled();
      storageRef.current = store;
      setRecoveryEnabled(enabled); setRecoveryAvailable(true);
    } catch { setRecoveryError(say.current('player.storeUnavailable')); }
    // A stalled connection must not leave native playback controls hidden.
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    void (async () => {
      try {
        const query = new URLSearchParams({ enrolmentId, lessonId, ...(resourceId !== undefined ? { resourceId } : {}) });
        const endpoint = resourceId !== undefined ? '/api/learn/position-v3' : '/api/learn/position-v2';
        const response = await fetch(`${endpoint}?${query}`, { cache: 'no-store', signal: controller.signal });
        const data: unknown = await response.json();
        if (!response.ok || !validSnapshot(data) || (data as { ok?: unknown }).ok !== true) throw new Error('Invalid snapshot');
        const actorId = (data as PositionSnapshot & { actorId?: unknown }).actorId;
        if (typeof actorId !== 'string' || !validRevision(actorId)) throw new Error('Invalid actor');
        if (cancelled) return;
        const server: PositionSnapshot = { seconds: data.seconds, revision: data.revision };
        serverSnapshot.current = server;
        // The old value belongs to the lesson, not necessarily this recording.
        // Offer it only as a voluntary review, never as the initial resource place.
        if (resourceId !== undefined && legacyActorId === actorId && typeof resumeAt === 'number' && Number.isFinite(resumeAt) && resumeAt > 0) {
          setLegacyPlace(resumeAt);
        }
        try {
          const store = storageRef.current;
          if (store) {
            const sessionId = window.crypto.randomUUID();
            const scope = { actorId, enrolmentId, lessonId };
            recovery.current = { store, ...scope, sessionId };
            const enabled = store.enabled();
            const records = enabled ? store.list(scope) : [];
            recoveryGate.current = records.length > 0;
            setRecoveries(records); setRecoveryEnabled(enabled); setRecoveryError(null);
            if (resourceId !== undefined) {
              try {
                const oldStore = positionRecovery(window.localStorage);
                legacyRecoveryStore.current = oldStore;
                setLegacyRecoveries(enabled ? oldStore.list(scope) : []);
              } catch {
                legacyRecoveryStore.current = null;
                setRecoveryError(say.current('player.storeReadFailed'));
              }
            }
          }
        } catch {
          recovery.current = null;
          setRecoveryError(say.current('player.storeUnavailable'));
        }
        initial.current = server.seconds;
        snapshotReady.current = true;
        const writer = createVersionedPositionWriter({
          revision: server.revision,
          write: async (seconds, revision) => {
            const requestController = new AbortController();
            const deadline = window.setTimeout(() => requestController.abort(), 15000);
            try {
              const result = await fetch(endpoint, {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ enrolmentId, lessonId, ...(resourceId !== undefined ? { resourceId } : {}), actorId, seconds, revision }),
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
          onConfirmed: (seconds, queued, revision) => {
            serverSnapshot.current = { seconds, revision };
            setSaveError(null);
            if (selectedRecord.current) { forget(selectedRecord.current); selectedRecord.current = null; }
            if (selectedLegacyRecovery.current && legacyRecoveryStore.current) {
              try {
                legacyRecoveryStore.current.remove(selectedLegacyRecovery.current);
                setLegacyRecoveries(legacyRecoveryStore.current.list({ actorId, enrolmentId, lessonId }));
                selectedLegacyRecovery.current = null;
              } catch { setRecoveryError(say.current('player.earlierClearFailed')); }
            }
            if (queued === null && ownRecord.current?.seconds === seconds) {
              forget(ownRecord.current); ownRecord.current = null;
            }
          },
          onConflict: (snapshot, local) => { serverSnapshot.current = snapshot; setConflict({ server: snapshot, local }); },
          onUnconfirmed: () => setSaveError(say.current('player.unconfirmed')),
        });
        writerRef.current = writer;
        if (touched.current && ref.current) {
          if (recoveryGate.current) {
            pendingPlayback.current = clampPosition(ref.current.currentTime);
            persist(ref.current.currentTime);
          } else writer.challenge(server, ref.current.currentTime);
        } else applyResume();
        setReady(true);
      } catch {
        if (!cancelled) {
          setSaveError(say.current('player.loadFailed'));
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
      if (ref.current && ref.current.currentTime > 0) {
        // Cleanup can run on a prop change while the element is still mounted.
        // Preserve the local place, but never bypass a pending recovery choice.
        persist(ref.current.currentTime);
        if (!recoveryGate.current) writerRef.current?.enqueue(ref.current.currentTime, true);
      }
      writerRef.current?.dispose();
      writerRef.current = null;
    };
  }, [enrolmentId, lessonId, resourceId, legacyActorId, resumeAt, applyResume, forget, persist]);

  const save = useCallback((seconds: number, force: boolean) => {
    if (!enrolmentId) return;
    if (!writerRef.current) { if (seconds > 0) touched.current = true; return; }
    persist(seconds);
    if (recoveryGate.current) { pendingPlayback.current = clampPosition(seconds); return; }
    writerRef.current.enqueue(seconds, force);
  }, [enrolmentId, persist]);

  useEffect(() => {
    const flush = () => { if (ref.current && ref.current.currentTime > 0) save(ref.current.currentTime, true); };
    const syncConsent = () => {
      const store = storageRef.current;
      if (!store) return;
      try {
        const enabled = store.enabled();
        setRecoveryEnabled(enabled);
        if (!enabled) {
          ownRecord.current = null; selectedRecord.current = null; selectedLegacyRecovery.current = null;
          setLegacyRecoveries([]); setRecoveries([]); recoveryGate.current = false;
          if (pendingPlayback.current !== null) writerRef.current?.enqueue(pendingPlayback.current, true);
          pendingPlayback.current = null;
          setRecoveryError(say.current('player.turnedOff'));
        }
      } catch { setRecoveryError(say.current('player.storeCheckFailed')); }
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === null || event.key === 'ayahspring:resume-recovery:v1:enabled') syncConsent();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('storage', storageChanged);
    window.addEventListener('ayahspring-resume-consent', syncConsent);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('storage', storageChanged);
      window.removeEventListener('ayahspring-resume-consent', syncConsent);
      flush();
    };
  }, [save]);

  const useServer = () => {
    const selected = writerRef.current?.useServer();
    if (!selected) return;
    forget(selectedRecord.current); selectedRecord.current = null;
    selectedLegacyRecovery.current = null; // Choosing the account place does not discard the old device record.
    forget(ownRecord.current); ownRecord.current = null;
    serverSnapshot.current = selected;
    setConflict(null); setNotice(null);
    if (ref.current) ref.current.currentTime = clampPosition(selected.seconds ?? 0);
  };
  const useLocal = () => {
    if (!writerRef.current) return;
    setConflict(null);
    writerRef.current.useLocal();
  };
  const reviewLegacyPlace = () => {
    const writer = writerRef.current; const element = ref.current; const server = serverSnapshot.current;
    if (legacyPlace === null || !writer || !element || !server || recoveryGate.current || !writer.canChallenge()) {
      setLegacyError(say.current('player.legacyBusy'));
      return;
    }
    if (!metadata.current) { setLegacyError(say.current('player.legacyWait')); return; }
    const target = clampPosition(legacyPlace);
    if (Number.isFinite(element.duration) && element.duration > 0 && target >= element.duration) {
      setLegacyError(say.current('player.legacyBeyond'));
      return;
    }
    // Install the conflict gate before seeking: a timeupdate cannot silently
    // write the ambiguous lesson-wide value to this recording.
    writer.challenge(server, target);
    try {
      element.currentTime = target;
      setLegacyPlace(null); setLegacyError(null);
    } catch {
      writer.useServer(); setConflict(null);
      setLegacyError(say.current('player.legacySeekFailed'));
    }
  };
  const dismissLegacyPlace = () => { setLegacyPlace(null); setLegacyError(null); };
  const refreshLegacyRecoveries = () => {
    const store = legacyRecoveryStore.current; const context = recovery.current;
    if (!store || !context) return;
    setLegacyRecoveries(store.list(context));
  };
  const discardLegacyRecovery = (record: RecoveryRecord) => {
    const store = legacyRecoveryStore.current;
    if (!store) return;
    try { store.remove(record); refreshLegacyRecoveries(); }
    catch { setRecoveryError(say.current('player.earlierRemoveFailed')); }
  };
  const reviewLegacyRecovery = (record: RecoveryRecord) => {
    const store = legacyRecoveryStore.current; const context = recovery.current;
    const writer = writerRef.current; const element = ref.current; const server = serverSnapshot.current;
    if (!store || !context || !writer || !element || !server || recoveryGate.current || !writer.canChallenge()) {
      setRecoveryError(say.current('player.earlierBusy')); return;
    }
    if (!metadata.current) { setRecoveryError(say.current('player.earlierWait')); return; }
    try {
      const current = store.list(context).find((item) => item.sessionId === record.sessionId);
      if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
        refreshLegacyRecoveries(); setRecoveryError(say.current('player.earlierChanged')); return;
      }
      if (Number.isFinite(element.duration) && element.duration > 0 && record.seconds >= element.duration) {
        setRecoveryError(say.current('player.earlierBeyond')); return;
      }
      writer.challenge(server, record.seconds);
      try { element.currentTime = record.seconds; }
      catch { writer.useServer(); setConflict(null); setRecoveryError(say.current('player.earlierSeekFailed')); return; }
      selectedLegacyRecovery.current = record;
      setRecoveryError(null);
    } catch { setRecoveryError(say.current('player.earlierReadFailed')); }
  };

  const toggleRecovery = (enabled: boolean) => {
    const store = storageRef.current;
    if (!store) return;
    try {
      if (enabled) {
        store.enable();
        window.dispatchEvent(new Event('ayahspring-resume-consent'));
        setRecoveryEnabled(true);
        setRecoveryError(recovery.current ? null : say.current('player.needConfirmed'));
        if (ref.current && ref.current.currentTime > 0) persist(ref.current.currentTime);
      } else {
        store.disable();
        window.dispatchEvent(new Event('ayahspring-resume-consent'));
        ownRecord.current = null; selectedRecord.current = null; selectedLegacyRecovery.current = null;
        setRecoveryEnabled(false); setRecoveryError(null); setRecoveries([]); setLegacyRecoveries([]);
        recoveryGate.current = false;
        if (pendingPlayback.current !== null) writerRef.current?.enqueue(pendingPlayback.current, true);
        pendingPlayback.current = null;
      }
    } catch {
      // A failed cleanup may already have removed consent. Synchronize other
      // players, but warn that some records may still need manual deletion.
      window.dispatchEvent(new Event('ayahspring-resume-consent'));
      setRecoveryError(say.current('player.storeChangeFailed'));
    }
  };

  const discardRecovery = (record: RecoveryRecord) => {
    const context = recovery.current;
    if (!context) return;
    try {
      context.store.remove(record);
      const remaining = context.store.list(context).filter((item) => item.sessionId !== context.sessionId);
      setRecoveries(remaining);
      if (!remaining.length) {
        recoveryGate.current = false;
        if (pendingPlayback.current !== null) writerRef.current?.enqueue(pendingPlayback.current, true);
        pendingPlayback.current = null;
      }
    } catch { setRecoveryError(say.current('player.deviceRemoveFailed')); }
  };

  const useRecovery = (record: RecoveryRecord) => {
    const context = recovery.current; const writer = writerRef.current; const element = ref.current;
    const server = serverSnapshot.current;
    if (!context || !writer || !element || !server || conflict || !recoveryGate.current) return;
    try {
      const current = context.store.list(context).find((item) => item.sessionId === record.sessionId);
      if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
        const remaining = context.store.list(context).filter((item) => item.sessionId !== context.sessionId);
        setRecoveries(remaining);
        if (!remaining.length) {
          recoveryGate.current = false;
          if (pendingPlayback.current !== null) writer.enqueue(pendingPlayback.current, true);
          pendingPlayback.current = null;
        }
        setRecoveryError(say.current('player.deviceChanged'));
        return;
      }
      element.currentTime = clampPosition(record.seconds);
      // The learner chose this recovered place instead of this session's
      // tentative playback; retain the chosen record until a confirmed save.
      forget(ownRecord.current); ownRecord.current = null;
      selectedRecord.current = record;
      recoveryGate.current = false; pendingPlayback.current = null;
      setRecoveries([]); setRecoveryError(null);
      setNotice(say.current('player.othersRemain'));
      writer.challenge(server, element.currentTime);
    } catch { setRecoveryError(say.current('player.deviceUseFailed')); }
  };

  const handlers = {
    onLoadedMetadata: () => { metadata.current = true; applyResume(); },
    onTimeUpdate: () => { if (ref.current) save(ref.current.currentTime, false); },
    onPause: () => { if (ref.current) save(ref.current.currentTime, true); },
    onEnded: () => { if (ref.current) save(ref.current.currentTime, true); },
  };
  return { ref, ready, notice, saveError, conflict, useServer, useLocal, handlers,
    legacyPlace, legacyError, reviewLegacyPlace, dismissLegacyPlace,
    legacyRecoveries, reviewLegacyRecovery, discardLegacyRecovery,
    recoveryEnabled, recoveryAvailable, recoveryError, recoveries, toggleRecovery, discardRecovery, useRecovery };
}
