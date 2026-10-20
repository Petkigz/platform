import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Where the videos live.
 *
 * lesson_resources permits exactly one of `external_url` or `media_asset_id`.
 * The URL path was the only usable one until media_assets had a writer, which
 * meant every video on the platform had to be hotlinked from elsewhere — the
 * opposite of D8, where the masters belong in our own storage and Cloudflare
 * Stream is delivery only.
 *
 * WHAT IS AND IS NOT WIRED HERE
 * -----------------------------
 * Registering an upload target is wired: the database returns the bucket and
 * the object key, and the key is derived server-side so a caller cannot point
 * an asset at somebody else's object.
 *
 * Two things are deliberately NOT wired:
 *
 *   * Transferring the bytes. D8 chose Cloudflare R2 on 2026-10-20, and the
 *     signing lives in `lib/media-r2.ts`; `POST /api/media` puts the two
 *     together. This library still moves no bytes itself.
 *   * Confirmation. `confirm_media_upload()` is staff-only by design — letting
 *     the uploader confirm their own file is the hole this closes. The intended
 *     caller is the storage webhook or a worker that has verified the object
 *     exists and its digest matches.
 *
 * So an upload reaches `pending` and stops there until something trustworthy
 * says otherwise. `attachMediaAsset()` therefore refuses anything that is not
 * `available`, because the database does not: nothing in the schema stops a
 * pending asset from being attached, and a lesson pointing at a file that was
 * never uploaded is worse than a lesson with no file.
 */

export type MediaUploadTarget = {
  assetId: string;
  masterBucket: string;
  masterKey: string;
};

export type RegisterUploadInput = {
  /**
   * What the teacher calls this file. Required by the database since
   * 20261211000100: an unnamed row in a media library cannot be identified
   * later, and nobody remembers what the file was.
   */
  displayName: string;
  mimeType: string;
  byteSize: number;
  checksum: string;
  durationSeconds?: number | null;
  storageBackend?: 'r2' | 'supabase' | 's3' | 'local';
};

export type RegisterUploadResult =
  | { ok: true; target: MediaUploadTarget }
  | { ok: false; message: string };

/** The column CHECK is a 64-char lowercase hex SHA-256 digest. */
const SHA256_HEX = /^[a-f0-9]{64}$/;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 * 1024; // 8 GiB

/** The column's own limit, so the caller is told here rather than by Postgres. */
export const MAX_DISPLAY_NAME_LENGTH = 200;

/**
 * A size a person can read. Binary units, because the ceilings in this file are
 * binary too: 512 MiB is what a browser can hash, and calling it 512 MB would
 * overstate it by 24 megabytes of somebody's lesson.
 */
export function readableByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${String(Math.max(0, Math.round(bytes)))} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit] ?? 'KiB'}`;
}

export function validateRegisterUpload(
  input: RegisterUploadInput,
): RegisterUploadResult {
  if (input.displayName.trim().length === 0)
    return { ok: false, message: 'A file needs a name you will recognise later.' };

  if (input.displayName.trim().length > MAX_DISPLAY_NAME_LENGTH)
    return {
      ok: false,
      message: `A file name cannot be longer than ${MAX_DISPLAY_NAME_LENGTH} characters.`,
    };

  if (input.mimeType.trim().length === 0)
    return { ok: false, message: 'A file needs a type.' };

  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0)
    return { ok: false, message: 'A file needs a size in bytes.' };

  if (input.byteSize > MAX_UPLOAD_BYTES)
    return { ok: false, message: 'That file is larger than 8 GiB.' };

  // Reported here so the uploader reads a sentence rather than a constraint
  // name, and so we never hand the database a digest it will reject.
  if (!SHA256_HEX.test(input.checksum))
    return {
      ok: false,
      message: 'The checksum must be a 64-character lowercase hex SHA-256 digest.',
    };

  if (input.durationSeconds !== undefined && input.durationSeconds !== null) {
    if (!Number.isFinite(input.durationSeconds) || input.durationSeconds < 0)
      return { ok: false, message: 'A duration cannot be negative.' };

    // The column is `integer`, so a fractional value would be silently rounded
    // on the way in. Refusing it here means the caller is told rather than
    // having their number quietly rewritten.
    if (!Number.isInteger(input.durationSeconds))
      return { ok: false, message: 'A duration must be a whole number of seconds.' };
  }

  return { ok: true, target: { assetId: '', masterBucket: '', masterKey: '' } };
}

/**
 * Ask the database for somewhere to put a file.
 *
 * This does not upload anything. It creates a `pending` row and returns the
 * bucket and key the bytes should go to.
 */
export async function registerMediaUpload(
  client: SupabaseClient,
  input: RegisterUploadInput,
): Promise<RegisterUploadResult> {
  const check = validateRegisterUpload(input);
  if (!check.ok) return check;

  const { data, error } = await client.rpc('register_media_upload', {
    p_mime_type: input.mimeType.trim(),
    p_byte_size: input.byteSize,
    p_checksum: input.checksum,
    p_display_name: input.displayName.trim(),
    p_duration_seconds: input.durationSeconds ?? null,
    p_storage_backend: input.storageBackend ?? 'r2',
  });

  if (error) {
    const m = error.message;
    if (/unsupported storage backend/i.test(m))
      return { ok: false, message: 'That storage location is not supported.' };
    if (/SHA-256/i.test(m))
      return {
        ok: false,
        message: 'The checksum must be a 64-character lowercase hex SHA-256 digest.',
      };
    if (/needs a size/i.test(m))
      return { ok: false, message: 'A file needs a size in bytes.' };
    if (/needs a type/i.test(m))
      return { ok: false, message: 'A file needs a type.' };
    if (/needs a name/i.test(m))
      return { ok: false, message: 'A file needs a name you will recognise later.' };
    if (/longer than 200 characters/i.test(m))
      return {
        ok: false,
        message: `A file name cannot be longer than ${MAX_DISPLAY_NAME_LENGTH} characters.`,
      };
    if (/duration cannot be negative/i.test(m))
      return { ok: false, message: 'A duration cannot be negative.' };
    return { ok: false, message: m };
  }

  // The function returns a composite: media_upload_target(asset_id,
  // master_bucket, master_key). PostgREST hands that back as an object.
  const row = data as
    | { asset_id?: string; master_bucket?: string; master_key?: string }
    | null;

  if (!row?.asset_id || !row.master_bucket || !row.master_key)
    return { ok: false, message: 'The upload target came back incomplete.' };

  return {
    ok: true,
    target: {
      assetId: String(row.asset_id),
      masterBucket: String(row.master_bucket),
      masterKey: String(row.master_key),
    },
  };
}

export type MediaAsset = {
  id: string;
  displayName: string;
  mimeType: string;
  byteSize: number;
  durationSeconds: number | null;
  status: 'pending' | 'available' | 'quarantined' | 'deleted';
};

export const MEDIA_STATUS_LABEL: Record<MediaAsset['status'], string> = {
  pending: 'Waiting for confirmation',
  available: 'Ready to use',
  quarantined: 'Quarantined',
  deleted: 'Deleted',
};

/**
 * The caller's own uploads.
 *
 * The SELECT policy is `uploaded_by = current_user_id() OR is_privileged()`, so
 * this returns what the caller is allowed to see and nothing else — no filter
 * here, because that would be deciding something RLS already decided.
 */
export async function fetchMediaAssets(
  client: SupabaseClient,
): Promise<MediaAsset[]> {
  const { data, error } = await client
    .from('media_assets')
    .select('id, display_name, mime_type, byte_size, duration_seconds, status')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((a) => {
    const row = a as Record<string, unknown>;
    const stored = row.display_name;
    return {
    id: String(row.id),
    // Rows written before display_name existed have no name, and saying
    // "video/mp4" is more useful than saying nothing.
    displayName: stored ? String(stored) : String(row.mime_type),
    mimeType: String(row.mime_type),
    byteSize: Number(row.byte_size),
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    status: row.status as MediaAsset['status'],
    };
  });
}

export type AttachMediaInput = {
  lessonId: string;
  assetId: string;
  name: string;
  resourceType?: 'video' | 'audio' | 'document' | 'worksheet' | 'other';
};

export type AttachMediaResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Attach an uploaded file to a lesson.
 *
 * The status check lives here and not in the database: nothing in the schema
 * stops a `pending` asset from being attached. Without this, a teacher could
 * attach a file whose upload never completed, and the learner would get a
 * lesson with a dead source.
 */
export async function attachMediaAsset(
  client: SupabaseClient,
  input: AttachMediaInput,
): Promise<AttachMediaResult> {
  if (!input.lessonId) return { ok: false, message: 'That lesson is missing.' };
  if (!input.assetId) return { ok: false, message: 'Pick a file to attach.' };

  const name = input.name.trim();
  if (name.length === 0)
    return { ok: false, message: 'Give it a name learners will see.' };
  if (name.length > 200)
    return { ok: false, message: 'Keep the name under 200 characters.' };

  const { data, error } = await client
    .from('media_assets')
    .select('status')
    .eq('id', input.assetId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };

  if (!data) return { ok: false, message: 'That file is not one of yours.' };

  const status = String(data.status);
  if (status !== 'available') {
    return {
      ok: false,
      message:
        status === 'pending'
          ? 'That upload has not been confirmed yet, so there is nothing to attach.'
          : status === 'quarantined'
            ? 'That upload was quarantined and cannot be used.'
            : 'That upload has been deleted.',
    };
  }

  // lesson_resources has no RPC for the media path: it is a plain insert under
  // the authorship policy, with the single-source CHECK enforcing that exactly
  // one of media_asset_id and external_url is set.
  const { error: insertError } = await client.from('lesson_resources').insert({
    lesson_id: input.lessonId,
    resource_type: input.resourceType ?? 'video',
    media_asset_id: input.assetId,
    display_name: name,
    access_classification: 'enrolled',
  });

  if (insertError) {
    const m = insertError.message;
    if (/locked \(D5\)/i.test(m))
      return {
        ok: false,
        message:
          'That version is published and frozen. Create a new version to change it.',
      };
    if (/row-level security/i.test(m))
      return { ok: false, message: 'Only the author can change this lesson.' };
    if (/single_source/i.test(m))
      return { ok: false, message: 'A resource is either a file or a link, not both.' };
    if (/position/i.test(m))
      return { ok: false, message: 'That lesson already has content at this position.' };
    return { ok: false, message: m };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Moderation: holding and withdrawing a master
// ---------------------------------------------------------------------------

export type ModerationAsset = {
  id: string;
  /** Null for a row registered before names were required. */
  displayName: string | null;
  mimeType: string;
  byteSize: number;
  durationSeconds: number | null;
  status: MediaAsset['status'];
  createdAt: string;
  uploader: string | null;
  /**
   * Every copy derived from this master, with the reason a failed one carries.
   *
   * The reason is here because the person who decides whether to retry has to
   * read it: "encode crashed" and "the codec is not supported" call for
   * different answers, and only one of them is worth a second attempt.
   */
  renditions: {
    id: string;
    profile: string;
    status: string;
    failureReason: string | null;
  }[];
};

/**
 * Every upload a staff member may see, newest first.
 *
 * No filter on who uploaded it: the SELECT policy is
 * `uploaded_by = current_user_id() OR is_privileged()`, so on a moderation
 * screen this is everything. Deciding that in a query as well would be deciding
 * it twice, and the second decision is the one that drifts.
 */
export async function fetchMediaModerationQueue(
  client: SupabaseClient,
): Promise<ModerationAsset[]> {
  const { data, error } = await client
    .from('media_assets')
    .select(`id, display_name, mime_type, byte_size, duration_seconds, status, created_at,
             user_profiles ( display_name ),
             media_renditions ( id, profile, status, failure_reason )`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const uploader = r.user_profiles as { display_name?: string } | null;
    const renditions =
      (r.media_renditions as
        | { id?: string; profile?: string; status?: string; failure_reason?: string | null }[]
        | null) ?? [];
    return {
      id: String(r.id),
      displayName: r.display_name ? String(r.display_name) : null,
      mimeType: String(r.mime_type),
      byteSize: Number(r.byte_size),
      durationSeconds: r.duration_seconds === null ? null : Number(r.duration_seconds),
      status: r.status as MediaAsset['status'],
      createdAt: String(r.created_at),
      uploader: uploader?.display_name ? String(uploader.display_name) : null,
      renditions: renditions.map((x) => ({
        id: String(x.id ?? ''),
        profile: String(x.profile ?? ''),
        status: String(x.status ?? ''),
        failureReason: x.failure_reason ? String(x.failure_reason) : null,
      })),
    };
  });
}

export type ModerationResult = { ok: true } | { ok: false; message: string };

/** Both actions end access to a file, so both need a reason in writing. */
function requireReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return 'Say why in writing. A takedown with no reason cannot be defended later.';
  if (trimmed.length > 2000) return 'Keep the reason under 2000 characters.';
  return null;
}

function mapModerationError(message: string): string {
  if (/only staff may|only platform staff/i.test(message))
    return 'Only platform staff can do that.';
  if (/reason is required/i.test(message))
    return 'Say why in writing. A takedown with no reason cannot be defended later.';
  if (/only delete your own uploads/i.test(message))
    return 'That file belongs to somebody else.';
  if (/no media asset|not found/i.test(message)) return 'That upload is gone.';
  if (/cannot be quarantined|already/i.test(message))
    return 'That upload has already been dealt with.';
  return message;
}

/**
 * Hold a master for review. It stops being servable immediately, and every
 * rendition derived from it stops with it — `may_play_rendition()` requires the
 * master to be available, so quarantining the master withdraws the copies.
 */
export async function quarantineMediaAsset(
  client: SupabaseClient,
  assetId: string,
  reason: string,
): Promise<ModerationResult> {
  const refusal = requireReason(reason);
  if (refusal) return { ok: false, message: refusal };
  if (!assetId) return { ok: false, message: 'That upload is gone.' };

  const { error } = await client.rpc('quarantine_media_upload', {
    p_asset_id: assetId,
    p_reason: reason.trim(),
  });
  if (error) return { ok: false, message: mapModerationError(error.message) };
  return { ok: true };
}

/**
 * Withdraw a master. Soft delete per D7: the object survives and the row is
 * tombstoned, because a rights request may have to be matched to it afterwards.
 */
export async function withdrawMediaAsset(
  client: SupabaseClient,
  assetId: string,
  reason: string,
): Promise<ModerationResult> {
  const refusal = requireReason(reason);
  if (refusal) return { ok: false, message: refusal };
  if (!assetId) return { ok: false, message: 'That upload is gone.' };

  const { data, error } = await client.rpc('delete_media_asset', {
    p_asset_id: assetId,
    p_reason: reason.trim(),
  });
  if (error) return { ok: false, message: mapModerationError(error.message) };
  if (data === false) return { ok: false, message: 'That upload has already been withdrawn.' };
  return { ok: true };
}

/**
 * Why a rendition failed, translated into something a person can act on.
 *
 * The database refuses a retry in five different ways and each refusal means a
 * different next step, so they do not collapse into one sentence.
 */
function mapRetryError(message: string): string {
  if (/only platform staff/i.test(message)) return 'Only platform staff can do that.';
  if (/needs a written reason/i.test(message))
    return 'Say why a second attempt will work. A retry with no reason is a guess.';
  if (/no rendition/i.test(message)) return 'That rendition is gone.';
  if (/has been withdrawn/i.test(message))
    return 'The master has been withdrawn, so there is nothing to encode from.';
  if (/nothing to encode from yet/i.test(message))
    return 'The master is held for review, so there is nothing to encode from yet.';
  if (/is not waiting for a retry/i.test(message))
    return 'Only a rendition that failed can be retried.';
  return message;
}

/**
 * Put a failed rendition back in the queue.
 *
 * A reason is required, in writing, for the same reason a takedown needs one:
 * this is the record of somebody deciding that the failure was not the master's
 * fault. It is also what stops a retry becoming a loop — a worker that retried
 * on its own would spend encode time forever on a file that genuinely cannot be
 * encoded, and nobody would ever read the reason.
 *
 * The row keeps its id and its derived object key, so the next encode overwrites
 * the file that was never confirmed rather than orphaning it.
 */
export async function retryMediaRendition(
  client: SupabaseClient,
  renditionId: string,
  reason: string,
): Promise<ModerationResult> {
  const trimmed = reason.trim();
  if (trimmed.length === 0)
    return { ok: false, message: 'Say why a second attempt will work. A retry with no reason is a guess.' };
  if (trimmed.length > 2000) return { ok: false, message: 'Keep the reason under 2000 characters.' };
  if (!renditionId) return { ok: false, message: 'That rendition is gone.' };

  const { error } = await client.rpc('retry_media_rendition', {
    p_rendition_id: renditionId,
    p_reason: trimmed,
  });
  if (error) return { ok: false, message: mapRetryError(error.message) };
  return { ok: true };
}
