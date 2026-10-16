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
 *   * Transferring the bytes. That needs storage credentials and a backend
 *     choice (D8 is settled on "our own storage" but not on which), and
 *     inventing it here would commit to a layout before that decision is made.
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

export function validateRegisterUpload(
  input: RegisterUploadInput,
): RegisterUploadResult {
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
    .select('id, mime_type, byte_size, duration_seconds, status')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((a) => ({
    id: String(a.id),
    displayName: String(a.mime_type),
    mimeType: String(a.mime_type),
    byteSize: Number(a.byte_size),
    durationSeconds: a.duration_seconds === null ? null : Number(a.duration_seconds),
    status: a.status as MediaAsset['status'],
  }));
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
