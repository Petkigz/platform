import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  R2NotConfiguredError,
  R2RequestError,
  presignMasterUpload,
  readR2Config,
  validateUploadRequest,
} from '@/lib/media-r2';

export const dynamic = 'force-dynamic';

type Payload = {
  action?: unknown;
  mimeType?: unknown;
  byteSize?: unknown;
  checksum?: unknown;
  durationSeconds?: unknown;
  assetId?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status });

/**
 * The ingest half of the byte path D8 chose: a teacher declares what they are
 * about to send, the database opens a `pending` row and derives the object key,
 * and this route turns that key into a short-lived URL the browser uploads to
 * directly. Bytes never pass through the web server, and nothing becomes
 * `available` until a privileged confirmation says the object really arrived.
 *
 * What is NOT here, deliberately:
 * - No playback or download URL. Serving a learner means a rendition, and the
 *   renditions register and transcode worker do not exist yet. Masters are
 *   never served to a learner, so there is nothing honest to mint.
 * - No ceiling on size and no allowlist of types. Neither exists in SQL, and
 *   the ceiling is an open decision under `platform.cost_controls`.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Storage is not configured on this deployment.', 503);

  const body = (await request.json().catch(() => null)) as Payload | null;
  const action = body?.action;
  if (action !== 'request_upload' && action !== 'confirm_upload') {
    return fail('Unknown media action.', 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to upload media.', 401);

  if (action === 'confirm_upload') {
    const assetId = typeof body?.assetId === 'string' ? body.assetId.trim() : '';
    if (!UUID.test(assetId)) return fail('That is not a media asset.', 400);
    const { data, error } = await supabase.rpc('confirm_media_upload', { p_asset_id: assetId });
    if (error) {
      const message = error.message;
      // Only platform staff may declare an upload verified; that is the whole
      // point of the pending/available split, so the refusal is passed through
      // rather than softened.
      const status = /only platform staff|privileged/i.test(message) ? 403
        : /not found|no media asset/i.test(message) ? 404
        : 409;
      return fail(message, status);
    }
    return NextResponse.json({ ok: true, data: { assetId, available: data === true } }, { status: 200 });
  }

  const config = readR2Config();
  if (!config) {
    // Not a 500: this deployment has no R2 credentials, which is the expected
    // state until they are issued. The message says what is missing.
    return fail(new R2NotConfiguredError().message, 503);
  }

  const validated = validateUploadRequest(body);
  if (!validated.ok) return fail(validated.message, 400);
  const { mimeType, byteSize, checksum, durationSeconds } = validated.value;

  const { data, error } = await supabase.rpc('register_media_upload', {
    p_mime_type: mimeType,
    p_byte_size: byteSize,
    p_checksum: checksum,
    p_duration_seconds: durationSeconds,
    // 'r2' is the function's own default and the backend D8 chose. Named
    // explicitly so a change of default in SQL cannot silently move uploads.
    p_storage_backend: 'r2',
  });
  if (error) {
    const message = error.message;
    const status = /sign in to upload/i.test(message) ? 401
      : /unsupported storage backend|invalid|needs|must be/i.test(message) ? 400
      : 409;
    return fail(message, status);
  }

  const target = data as { asset_id?: string; master_bucket?: string; master_key?: string } | null;
  const assetId = target?.asset_id;
  const bucket = target?.master_bucket;
  const key = target?.master_key;
  if (!assetId || !bucket || !key) {
    return fail('The upload could not be registered.', 502);
  }
  if (bucket !== config.mastersBucket) {
    // Two places name this bucket. Refusing is better than signing a URL for a
    // bucket the database will never record the object in.
    return fail(
      `Storage is misconfigured: the database derived "${bucket}" but this deployment signs for "${config.mastersBucket}".`,
      503,
    );
  }

  try {
    const signed = presignMasterUpload(config, key, { contentType: mimeType });
    return NextResponse.json({
      ok: true,
      data: {
        assetId,
        key,
        bucket,
        method: signed.method,
        uploadUrl: signed.url,
        // The signature covers the content type, so the upload fails unless the
        // browser sends exactly this. That is how the type the teacher declared
        // stays the type that arrives.
        requiredHeaders: signed.requiredHeaders,
        expiresInSeconds: signed.expiresInSeconds,
        expiresAt: signed.expiresAt,
      },
    }, { status: 200 });
  } catch (error) {
    if (error instanceof R2RequestError) return fail(error.message, 400);
    throw error;
  }
}
