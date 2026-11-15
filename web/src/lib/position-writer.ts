import { clampPosition } from './resume.ts';

/** One player's best-effort queue. It does not coordinate with other players,
 * tabs, devices or a server request that commits after a lost response. */
export function createPositionWriter(options: {
  write: (seconds: number) => Promise<void>;
  onUnconfirmed: () => void;
}) {
  let running = false;
  let blocked = false;
  let queued: number | null = null;
  let lastScheduled: number | null = null;

  async function drain() {
    if (running || blocked || queued === null) return;
    const seconds = queued;
    queued = null;
    running = true;
    try {
      await options.write(seconds);
    } catch {
      // A lost reply can mean the server committed. Do not send a later value
      // from this player after an ambiguous response; it could be reordered.
      blocked = true;
      queued = null;
      options.onUnconfirmed();
    } finally {
      running = false;
    }
    if (!blocked && queued !== null) void drain();
  }

  return {
    enqueue(seconds: number, force: boolean) {
      if (blocked) return;
      const whole = clampPosition(seconds);
      if (!force && lastScheduled !== null && Math.abs(whole - lastScheduled) < 10) return;
      lastScheduled = whole;
      // Keep only the newest requested position, including deliberate rewinds.
      queued = whole;
      void drain();
    },
  };
}
