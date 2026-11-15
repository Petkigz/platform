import { clampPosition } from './resume.ts';

export type PositionSnapshot = { seconds: number | null; revision: string | null };
export type PositionWriteResult = PositionSnapshot & { ok: boolean };

/** Serialize/coalesce one player's requests. A conflict always requires an
 * explicit choice; an unknown outcome stops sending rather than guessing. */
export function createVersionedPositionWriter(options: {
  revision: string | null;
  write: (seconds: number, revision: string | null) => Promise<PositionWriteResult>;
  onConfirmed: (seconds: number, queued: number | null, revision: string) => void;
  onConflict: (server: PositionSnapshot, local: number) => void;
  onUnconfirmed: (local: number) => void;
}) {
  let revision = options.revision;
  let running = false;
  let disposed = false;
  let uncertain = false;
  let conflict: PositionSnapshot | null = null;
  let queued: number | null = null;
  let lastScheduled: number | null = null;

  async function drain() {
    if (running || disposed || uncertain || conflict || queued === null) return;
    const seconds = queued;
    queued = null;
    running = true;
    try {
      const result = await options.write(seconds, revision);
      if (disposed) return;
      if (!result.ok) {
        queued ??= seconds;
        conflict = { seconds: result.seconds, revision: result.revision };
        options.onConflict(conflict, queued);
      } else {
        if (result.seconds !== seconds || result.revision === null) throw new Error('Invalid confirmation');
        revision = result.revision;
        options.onConfirmed(seconds, queued, revision);
      }
    } catch {
      if (disposed) return;
      queued ??= seconds;
      uncertain = true;
      options.onUnconfirmed(queued);
    } finally {
      running = false;
    }
    if (!disposed && !uncertain && !conflict && queued !== null) void drain();
  }

  return {
    enqueue(value: number, force: boolean) {
      if (disposed) return;
      const seconds = clampPosition(value);
      if (!force && lastScheduled !== null && Math.abs(seconds - lastScheduled) < 10 && !conflict && !uncertain) return;
      lastScheduled = seconds;
      queued = seconds;
      if (conflict) options.onConflict(conflict, seconds);
      else if (uncertain) options.onUnconfirmed(seconds);
      else void drain();
    },
    /** A manual choice must not replace a write already in flight or a pending choice. */
    canChallenge() { return !disposed && !running && !uncertain && !conflict && queued === null; },
    /** Playback began before the initial snapshot arrived; require a choice. */
    challenge(server: PositionSnapshot, value: number) {
      if (disposed || running || uncertain || conflict) return;
      conflict = server;
      queued = clampPosition(value);
      options.onConflict(server, queued);
    },
    /** Keep the server value shown to the learner; later saves compare with it. */
    useServer() {
      if (!conflict || disposed) return null;
      const chosen = conflict;
      revision = chosen.revision;
      conflict = null;
      queued = null;
      lastScheduled = chosen.seconds;
      return chosen;
    },
    /** Replace only the exact server revision shown. Another change conflicts again. */
    useLocal() {
      if (!conflict || disposed) return;
      revision = conflict.revision;
      conflict = null;
      void drain();
    },
    dispose() { disposed = true; },
  };
}
