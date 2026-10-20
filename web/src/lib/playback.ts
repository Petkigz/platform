/**
 * Serving a rendition to a learner.
 *
 * THE DATABASE IS THE ONLY AUTHORITY ON WHO MAY PLAY WHAT
 * --------------------------------------------------------
 * `media_renditions_read` is `may_play_rendition(id) or is_privileged(...)`, and
 * `may_play_rendition()` already walks rendition → master → `lesson_resources` →
 * `lessons` and asks `can_access_lesson_now()`. So `fetchPlayableRenditions`
 * below does a plain select and does no entitlement check of its own. A second
 * check here would be a second authority, and two authorities that can disagree
 * is the failure this repository keeps finding — `add_child_to_family()`, the
 * duplicated upload validator, and a preview gate that would have given away a
 * paid feature were all that shape.
 *
 * What this file does decide is which of the renditions a learner *may* play is
 * the one to put in front of them, and that is a product decision rather than a
 * security one.
 *
 * STREAMING DEFAULTS DOWN, DOWNLOADING DEFAULTS UP
 * ------------------------------------------------
 * A streamed lesson costs the learner data every time it is watched, and most of
 * this platform's learners are on metered mobile connections, so the default
 * rung is 480p and the player offers the rest. A saved lesson costs data once,
 * and is then watched offline, so saving defaults to the best rung that exists.
 * Both are overridable by the learner, and neither changes what the database
 * allowed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { RenditionProfile } from './transcode.ts';

export type { RenditionProfile };

/** The vocabulary lives in `transcode.ts` and the table's check constraint. */
export const PLAYABLE_PROFILES: readonly RenditionProfile[] = [
  '1080p',
  '720p',
  '480p',
  '360p',
  'audio',
];

export const PROFILE_LABEL: Record<RenditionProfile, string> = {
  '1080p': '1080p — full HD',
  '720p': '720p — HD',
  '480p': '480p — standard',
  '360p': '360p — small',
  audio: 'Audio only',
  poster: 'Poster image',
  manifest: 'Manifest',
};

/**
 * The rung a streamed lesson starts on. 480p is legible for a talking teacher
 * and a slide, and is roughly a third of the bytes of 720p.
 */
export const DEFAULT_STREAM_HEIGHT = 480;

export type PlayableRendition = {
  id: string;
  assetId: string;
  profile: RenditionProfile;
  mimeType: string;
  bucket: string;
  objectKey: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
};

type RenditionRow = {
  id: string;
  asset_id: string;
  profile: string;
  mime_type: string;
  bucket: string;
  object_key: string;
  /** A bigint can arrive as a string, which is why `toPlayable` coerces it. */
  byte_size: number | string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
};

export function isVideoRendition(rendition: PlayableRendition): boolean {
  return rendition.height !== null && rendition.mimeType.startsWith('video/');
}

export function isAudioRendition(rendition: PlayableRendition): boolean {
  return rendition.mimeType.startsWith('audio/');
}

/**
 * Whether the playback route may hand this out. Everything but a manifest, which
 * no worker produces: an HLS manifest is thousands of segment objects and a URL
 * to one row would be a URL to nothing.
 */
export function isServable(rendition: PlayableRendition): boolean {
  return rendition.profile !== 'manifest';
}

/** A poster is a rendition and is not something you press play on. */
export function isPlayable(rendition: PlayableRendition): boolean {
  return PLAYABLE_PROFILES.includes(rendition.profile) &&
    (isVideoRendition(rendition) || isAudioRendition(rendition));
}

export function posterFor(renditions: readonly PlayableRendition[]): PlayableRendition | null {
  return renditions.find((r) => r.profile === 'poster' && r.mimeType.startsWith('image/')) ?? null;
}

export function renditionChoices(
  renditions: readonly PlayableRendition[],
): PlayableRendition[] {
  // Tallest first, then largest file, so the list a learner reads is ordered by
  // quality rather than by whatever the database returned.
  return renditions
    .filter(isPlayable)
    .slice()
    .sort((a, b) => {
      const byHeight = (b.height ?? 0) - (a.height ?? 0);
      return byHeight !== 0 ? byHeight : b.byteSize - a.byteSize;
    });
}

/**
 * Which rendition to start playing.
 *
 * An explicit request wins when it exists — that is the learner using the
 * quality selector. Otherwise: the tallest rung at or below
 * `DEFAULT_STREAM_HEIGHT`, and if every rung is taller than that (because the
 * smaller ones failed to encode) the shortest one there is, since forcing a big
 * file on a metered connection to preserve a preference is the wrong trade.
 */
export function pickStreamRendition(
  renditions: readonly PlayableRendition[],
  requested?: string | null,
): PlayableRendition | null {
  const choices = renditionChoices(renditions);
  if (choices.length === 0) return null;

  if (requested) {
    const wanted = choices.find((r) => r.profile === requested.trim().toLowerCase());
    if (wanted) return wanted;
  }

  const video = choices.filter(isVideoRendition);
  if (video.length === 0) return choices[0] ?? null;

  const atOrBelow = video.filter((r) => (r.height ?? 0) <= DEFAULT_STREAM_HEIGHT);
  if (atOrBelow.length > 0) return atOrBelow[0] ?? null;
  return video.at(-1) ?? null;
}

/**
 * Which rendition to save for offline use. The opposite default to streaming:
 * the bytes are paid for once, so the learner should get the best picture that
 * exists rather than the cheapest.
 */
export function pickDownloadRendition(
  renditions: readonly PlayableRendition[],
  requested?: string | null,
): PlayableRendition | null {
  const choices = renditionChoices(renditions);
  if (choices.length === 0) return null;

  if (requested) {
    const wanted = choices.find((r) => r.profile === requested.trim().toLowerCase());
    if (wanted) return wanted;
  }

  const video = choices.filter(isVideoRendition);
  return video[0] ?? choices[0] ?? null;
}

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 10) return `${mb.toFixed(1)} MB`;
  return `${Math.round(mb)} MB`;
}

/**
 * A filename a learner can live with, built from a display name that may be
 * Arabic, may contain a slash, may contain a quote, and may be empty.
 *
 * Separators and quotes are removed rather than escaped: this string ends up in
 * a `Content-Disposition` header, and a name that could close the quoted string
 * or introduce a path is a name that chooses where somebody else's file lands.
 * Unicode is kept — a learner should see their own lesson's name, not a
 * transliteration of it.
 */
export function downloadFilename(
  displayName: string,
  profile: RenditionProfile,
  mimeType: string,
): string {
  const extension = extensionFor(mimeType);
  // Trim before stripping leading dots, and again after: `.. / ..` collapses to
  // a string whose first characters are dots only once the spaces are gone.
  const cleaned = displayName
    .replace(/[\\/"';:|?*<>\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 80)
    .trim()
    .replace(/^\.+/, '')
    .trim();
  const base = cleaned || 'lesson';
  return `${base}-${profile}.${extension}`;
}

export function extensionFor(mimeType: string): string {
  const type = mimeType.trim().toLowerCase();
  if (type === 'video/mp4') return 'mp4';
  if (type === 'video/webm') return 'webm';
  if (type === 'audio/mp4' || type === 'audio/x-m4a') return 'm4a';
  if (type === 'audio/mpeg') return 'mp3';
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'application/x-mpegurl') return 'm3u8';
  return 'bin';
}

export function toPlayable(row: RenditionRow): PlayableRendition {
  return {
    id: row.id,
    assetId: row.asset_id,
    profile: row.profile as RenditionProfile,
    mimeType: row.mime_type,
    bucket: row.bucket,
    objectKey: row.object_key,
    byteSize: Number(row.byte_size ?? 0),
    width: row.width,
    height: row.height,
    durationSeconds: row.duration_seconds,
  };
}

/**
 * Every delivery copy of these masters that this caller may play.
 *
 * Row-level security decides the answer, so a caller who is not entitled gets an
 * empty list rather than an error — which is also why the lesson page can ask
 * for the renditions of a whole lesson without first working out who is allowed.
 */
export async function fetchPlayableRenditions(
  supabase: SupabaseClient,
  assetIds: readonly string[],
): Promise<PlayableRendition[]> {
  const ids = [...new Set(assetIds.filter((id) => id.trim().length > 0))];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('media_renditions')
    .select(
      'id, asset_id, profile, mime_type, bucket, object_key, byte_size, width, height, duration_seconds',
    )
    .eq('status', 'available')
    .in('asset_id', ids)
    .order('byte_size', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RenditionRow[]).map(toPlayable);
}

/** Renditions grouped by the master they came from, for a lesson's resource list. */
export function groupByAsset(
  renditions: readonly PlayableRendition[],
): Map<string, PlayableRendition[]> {
  const map = new Map<string, PlayableRendition[]>();
  for (const rendition of renditions) {
    const list = map.get(rendition.assetId) ?? [];
    list.push(rendition);
    map.set(rendition.assetId, list);
  }
  return map;
}
