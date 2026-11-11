// Watching a master: the archive path, for the people who have a reason to look.
//
// Lesson playback normally uses renditions. Coursework and other authorized
// master access use the same database gate, including learner and verified
// guardian access where the coursework rules permit it.
//
// WHO MAY WATCH IS NOT DECIDED HERE. `master_preview_target()` is SECURITY
// DEFINER and is gated by `may_watch_master()`, so this module asks and shapes.
// It must not invent an authorization rule; it only validates the returned
// coordinates and their association with the requested asset before signing.
//
// Type-only Supabase import and no signing code, so this stays testable and safe
// to import from anywhere. The route does the signing, with `media-r2.ts`.

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * How long a master preview URL lives.
 *
 * Fifteen minutes, against the six hours a learner's playback URL gets. A
 * learner watches a lesson; this is somebody checking that a file arrived and is
 * the file they meant, which is a minute of work. The short window matters more
 * here than it does for playback, because a master URL is a bearer token for the
 * archive copy — the one thing nothing else in the system hands out.
 *
 * It must stay under MAX_WORKER_SECONDS in `media-r2.ts`, which is the ceiling
 * `presignMasterDownload()` enforces; `master-preview.test.ts` holds that.
 */
export const MASTER_PREVIEW_SECONDS = 900;

export type MasterPreviewTarget = {
  assetId: string;
  bucket: string;
  objectKey: string;
  mimeType: string;
  byteSize: number;
  displayName: string | null;
  /** Current status; access is decided by the database, not this field. */
  status: string;
};

export type MasterPreviewResult =
  /** `target` is null when the asset does not exist or is not this caller's. */
  | { ok: true; target: MasterPreviewTarget | null }
  | { ok: false; status: number; message: string };

/** What `master_preview_target()` returns, before mapping. */
type MasterPreviewRow = {
  asset_id: string;
  master_bucket: string;
  master_key: string;
  mime_type: string | null;
  byte_size: number | string | null;
  display_name: string | null;
  status: string;
};

export function toMasterPreviewTarget(row: MasterPreviewRow): MasterPreviewTarget {
  const byteSize = Number(row.byte_size ?? 0);
  return {
    assetId: String(row.asset_id),
    bucket: String(row.master_bucket),
    objectKey: String(row.master_key),
    mimeType: String(row.mime_type ?? 'application/octet-stream'),
    byteSize: Number.isFinite(byteSize) ? byteSize : 0,
    displayName: row.display_name === null || row.display_name === undefined
      ? null
      : String(row.display_name),
    status: String(row.status),
  };
}

/**
 * Which element a browser needs, or null when it needs neither.
 *
 * This does not reuse `isVideoRendition()` from `playback.ts`, which also asks
 * for a height: a master has no dimensions until the worker probes it, and a
 * master is exactly what somebody watches before any worker has run.
 */
export function playerKindFor(mimeType: string): 'video' | 'audio' | null {
  const type = mimeType.trim().toLowerCase();
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return null;
}

/**
 * The message for a refusal, and the status that goes with it.
 *
 * A row this caller may not watch and a row that does not exist are the same
 * answer on purpose — `master_preview_target()` returns no rows for both — so
 * neither is distinguished here either.
 */
export function describeMasterPreviewError(error: {
  message?: string | null;
  code?: string | null;
}): { status: number; message: string } {
  const message = String(error.message ?? '');
  if (/permission denied|insufficient privilege|row-level security/i.test(message)) {
    return { status: 403, message: 'That file is not yours to watch.' };
  }
  if (/sign in/i.test(message)) {
    return { status: 401, message: 'Sign in to watch a file.' };
  }
  return { status: 500, message: 'That file could not be opened. Try again in a moment.' };
}

export async function fetchMasterPreviewTarget(
  client: SupabaseClient,
  assetId: string,
): Promise<MasterPreviewResult> {
  const unavailable: MasterPreviewResult = {
    ok: false, status: 502, message: 'That file could not be checked. Try again in a moment.',
  };
  try {
    const { data, error } = await client.rpc('master_preview_target', { p_asset_id: assetId });
    if (error) return { ok: false, ...describeMasterPreviewError(error) };
    if (!Array.isArray(data) || data.length > 1) return unavailable;
    if (data.length === 0) return { ok: true, target: null };
    const row: unknown = data[0];
    if (!row || typeof row !== 'object' || Array.isArray(row)) return unavailable;
    const r = row as Record<string, unknown>;
    // Never sign coordinates that did not come back for the requested asset.
    // The RPC is still the authority; these checks only reject malformed replies.
    if (typeof r.asset_id !== 'string' || r.asset_id.toLowerCase() !== assetId.toLowerCase() ||
        typeof r.master_bucket !== 'string' || !r.master_bucket.trim() ||
        typeof r.master_key !== 'string' || !r.master_key.trim() ||
        (typeof r.status !== 'string' || !['pending', 'available', 'quarantined'].includes(r.status)) ||
        !(r.mime_type === null || typeof r.mime_type === 'string') ||
        !(r.display_name === null || typeof r.display_name === 'string') ||
        !(r.byte_size === null || (typeof r.byte_size === 'number' && Number.isSafeInteger(r.byte_size) && r.byte_size >= 0) ||
          (typeof r.byte_size === 'string' && /^(0|[1-9][0-9]*)$/.test(r.byte_size)))) return unavailable;
    return { ok: true, target: toMasterPreviewTarget(r as MasterPreviewRow) };
  } catch {
    return unavailable;
  }
}
