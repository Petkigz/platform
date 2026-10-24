/**
 * Where you were in a lesson.
 *
 * The database has kept `last_video_position` since the first progress migration
 * and nothing wrote it, so every player started at zero. These are the small
 * decisions that make resuming feel right rather than merely work: when a saved
 * place is worth honouring, how a time is spoken, and the speeds a recitation
 * player offers.
 *
 * Pure, so each of those can be tested without a browser or a video file.
 */

const DAY_SECONDS = 86400;

/** A player reports -0.4 seconds and a broken one reports Infinity. Both exist. */
export function clampPosition(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), DAY_SECONDS);
}

/**
 * Was this lesson actually left part-way through?
 *
 * Ten seconds in is not "where you stopped", it is the beginning, and jumping
 * somebody 10 seconds forward every time they open a lesson is worse than not
 * resuming at all. Twenty seconds from the end is the same argument in reverse:
 * a player that resumes there starts, ends, and looks broken.
 */
export function shouldResume(position: number | null | undefined, duration?: number | null): boolean {
  if (position === null || position === undefined) return false;
  const at = clampPosition(position);
  if (at < 15) return false;
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    if (duration - at <= 20) return false;
  }
  return true;
}

/** 75 → "1:15"; 3725 → "1:02:05". */
export function formatPosition(seconds: number | null | undefined): string {
  const total = clampPosition(seconds ?? 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${two(minutes)}:${two(rest)}` : `${minutes}:${two(rest)}`;
}

/** The sentence a player shows for one moment before it starts. */
export function resumeLabel(position: number | null | undefined): string | null {
  if (position === null || position === undefined || !shouldResume(position)) return null;
  return `Resuming at ${formatPosition(position)}.`;
}

/**
 * The speeds a recitation player offers.
 *
 * Slower is the point: a learner repeating after a reciter needs the reciter to
 * wait. Faster is for revision of something already known. Nothing here goes
 * below half speed, because past that a recitation stops sounding like words.
 */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const;

export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export function stepSpeed(current: number, direction: 1 | -1): PlaybackSpeed {
  const index = PLAYBACK_SPEEDS.indexOf(current as PlaybackSpeed);
  const from = index === -1 ? PLAYBACK_SPEEDS.indexOf(1) : index;
  const next = Math.min(PLAYBACK_SPEEDS.length - 1, Math.max(0, from + direction));
  return PLAYBACK_SPEEDS[next]!;
}

export type Loop = { from: number | null; to: number | null };

/**
 * What to say about a marked passage, or nothing when nothing is marked.
 *
 * A loop with only its start is a real state — the learner has marked where the
 * passage begins and is still listening for where it ends — so it says so
 * instead of looking broken.
 */
export function loopLabel(loop: Loop): string | null {
  const { from, to } = loop;
  if (from === null && to === null) return null;
  if (from !== null && to === null) return `Repeating from ${formatPosition(from)} — mark where it ends.`;
  if (from === null && to !== null) return `Repeating up to ${formatPosition(to)} — mark where it starts.`;
  if (from! >= to!) return 'That passage ends before it starts. Mark it again.';
  return `Repeating ${formatPosition(from!)} – ${formatPosition(to!)}.`;
}

/** Whether a player should jump back to the start of the marked passage. */
export function shouldLoopBack(loop: Loop, currentTime: number): boolean {
  const { from, to } = loop;
  if (from === null || to === null) return false;
  if (from >= to) return false;
  return currentTime >= to;
}
