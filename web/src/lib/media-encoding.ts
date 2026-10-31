/**
 * Is the file a teacher uploaded actually playable?
 *
 * The platform has two kinds of media and only one of them is a video. A master
 * in `media_assets` is the archive: it is what a teacher uploaded, what the
 * storage meter counts, and what `media_assets.status` describes. A **delivery
 * copy** in `media_renditions` is what a browser is ever served. A verified
 * master with no copies is a lesson that plays nothing, and every screen in the
 * product used to describe only the master.
 *
 * `lesson_delivery_state()` and `my_media_delivery()` (see the migration) return
 * the counts. This module turns them into one of six answers, because the counts
 * are not the point: **which of the six is true decides who has to do what.**
 *
 *   plays     a learner gets a player. Nothing to do.
 *   encoding  the copies are being made. Wait; if it stays like this, staff.
 *   failed    the encode died and it will not retry itself. Staff, with a reason.
 *   silent    the file is verified and nothing has ever been encoded from it —
 *             usually the worker has never run. Staff.
 *   unverified  the file itself has not been checked yet. Staff verification.
 *   held      quarantined, and every copy is withdrawn with it. Moderation.
 *
 * Three of those look identical to a learner — a sentence where the player should
 * be — and need three different people to act. That is why the answer is a state
 * and not a boolean, and why this file exists rather than a `length > 0` check on
 * a page.
 */

import type { MediaAsset } from './media.ts';

export type CopyState = {
  available: number;
  pending: number;
  failed: number;
  /** A delivery copy a browser can play as video (1080p … 360p). */
  videoReady: boolean;
  /** A delivery copy a browser can play as audio. */
  audioReady: boolean;
  /** Why the most recent encode failed, from the worker, verbatim. */
  failureReason: string | null;
};

export type Delivery = CopyState & {
  assetId: string;
  assetStatus: MediaAsset['status'];
};

/**
 * Whatever the RPC returned, as the shape above.
 *
 * PostgREST hands back integers, but a `bigint` arrives as a string and a count
 * can arrive as `null` from a `left join`, so both are coerced here. A page that
 * did `count > 0` on a null would render "0 copies" for a file with three, which
 * is the exact lie this feature exists to stop.
 */
export function parseDelivery(rows: unknown): Delivery[] {
  if (!Array.isArray(rows)) return [];
  const parsed: Delivery[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const assetId = row.asset_id ?? row.assetId;
    if (!assetId) continue;
    parsed.push({
      assetId: String(assetId),
      // `lesson_delivery_state` names it `asset_status`; `my_media_delivery`
      // leaves it out because its rows all come from the same library. A missing
      // status is `available`: both functions filter tombstoned masters out, and
      // claiming anything else would invent a quarantine nobody applied.
      assetStatus: (row.asset_status ?? row.assetStatus ?? 'available') as MediaAsset['status'],
      available: count(row.available_copies ?? row.available),
      pending: count(row.pending_copies ?? row.pending),
      failed: count(row.failed_copies ?? row.failed),
      videoReady: row.video_ready === true || row.videoReady === true,
      audioReady: row.audio_ready === true || row.audioReady === true,
      failureReason: trimmedOrNull(row.failure_reason),
    });
  }
  return parsed;
}

/** A reason of only spaces is no reason: it must not become an empty clause. */
function trimmedOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function count(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

/** One row per asset, for a screen that renders a list of files. */
export function byAsset(rows: readonly Delivery[]): Map<string, Delivery> {
  const map = new Map<string, Delivery>();
  for (const row of rows) map.set(row.assetId, row);
  return map;
}

export type Verdict = 'plays' | 'encoding' | 'failed' | 'silent' | 'unverified' | 'held';

export type DeliveryVerdict = {
  kind: Verdict;
  /** Can a learner watch it right now? The only field a page should branch on. */
  ready: boolean;
  /** One sentence, in the teacher's terms, about what is true and who acts. */
  sentence: string;
};

const REASON_MAX = 160;

/** A worker's reason, kept verbatim but bounded — it goes in a sentence. */
function reason(raw: string | null): string {
  if (!raw) return 'the worker reported no reason';
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) return 'the worker reported no reason';
  return trimmed.length > REASON_MAX ? `${trimmed.slice(0, REASON_MAX - 1)}…` : trimmed;
}

/**
 * What is true of this file, and who has to act.
 *
 * The order is the order of precedence, and it is not arbitrary: a quarantined
 * master beats everything (its copies exist and must not be served), and a
 * master still awaiting verification beats any copy, because nothing is encoded
 * from an unverified file in the first place.
 *
 * `null` — no row at all — means "not an uploaded file", which is not a verdict:
 * an external address has no encoding state and the caller should render nothing.
 */
export function deliveryOf(row: CopyState & { assetStatus?: MediaAsset['status'] } | null | undefined): DeliveryVerdict | null {
  if (!row) return null;

  if (row.assetStatus === 'quarantined') {
    return {
      kind: 'held',
      ready: false,
      sentence:
        'Held for review. Every copy made from it is withdrawn until staff release it, so a learner gets a sentence where the player should be.',
    };
  }

  if (row.assetStatus === 'deleted') {
    return {
      kind: 'held',
      ready: false,
      sentence: 'Withdrawn. The file is gone from every path, including the players.',
    };
  }

  if (row.assetStatus === 'pending') {
    return {
      kind: 'unverified',
      ready: false,
      sentence:
        'The file is waiting to be checked by a staff member, and nothing is encoded from it until it is. Attaching it now gives a learner no player at all.',
    };
  }

  if (row.videoReady || row.audioReady) {
    return {
      kind: 'plays',
      ready: true,
      sentence: row.videoReady
        ? 'A learner gets a player for this from the copies on our own server — no third-party site can take it down.'
        : 'Only a sound copy is ready, so a learner gets the audio and no picture. If this is meant to be a video, another profile still has to encode.',
    };
  }

  if (row.failed > 0 && row.pending === 0) {
    return {
      kind: 'failed',
      ready: false,
      sentence: `Encoding failed: ${reason(row.failureReason)}. Nothing from this file will play until staff start it again, and it does not retry by itself.`,
    };
  }

  if (row.pending > 0) {
    return {
      kind: 'encoding',
      ready: false,
      sentence:
        'The delivery copies are still being made. A learner who opens this now gets a sentence where the player should be — worth checking again before you submit.',
    };
  }

  // Verified, and nothing has ever been encoded from it. The state a file sits
  // in before any worker has touched it, which used to be invisible everywhere.
  return {
    kind: 'silent',
    ready: false,
    sentence:
      'Verified, but no delivery copy has been made from it yet, so there is no player to give anyone. This is the one case that looks finished and does not play.',
  };
}

/** How many copies exist at all — for a screen that prints a number. */
export function copyCount(row: CopyState): number {
  return row.available + row.pending + row.failed;
}
