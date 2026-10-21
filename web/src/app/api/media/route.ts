import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  MAX_PART_UPLOAD_SECONDS,
  R2NotConfiguredError,
  R2RequestError,
  presignMasterUpload,
  readR2Config,
} from '@/lib/media-r2';
import {
  MAX_PARTS_PER_BATCH,
  abortMasterMultipart,
  completeMasterMultipart,
  initiateMasterMultipart,
  signMasterPartUploads,
} from '@/lib/media-multipart';
import { registerMediaUpload } from '@/lib/media';
import { confirmMediaUpload } from '@/lib/media-verify';

export const dynamic = 'force-dynamic';

type Payload = {
  action?: unknown;
  /** What the teacher calls the file; required by the database. */
  displayName?: unknown;
  mimeType?: unknown;
  byteSize?: unknown;
  checksum?: unknown;
  durationSeconds?: unknown;
  assetId?: unknown;
  /**
   * How the browser intends to send the bytes. 'multipart' registers the row
   * without signing a single-PUT URL, which the browser would never use.
   */
  transport?: unknown;
  /** Echoed back by the browser; minted by storage, never invented here. */
  uploadId?: unknown;
  partNumbers?: unknown;
  parts?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status });

/** Every action this route answers. Anything else is a 400, not a guess. */
const ACTIONS = [
  'request_upload',
  'confirm_upload',
  'initiate_multipart',
  'sign_parts',
  'complete_multipart',
  'abort_multipart',
] as const;

const MULTIPART_ACTIONS = ['initiate_multipart', 'sign_parts', 'complete_multipart', 'abort_multipart'];

/** Storage's ids are short; this only stops a request body from being a payload. */
const MAX_UPLOAD_ID_LENGTH = 512;

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * The ingest half of the byte path D8 chose: a teacher declares what they are
 * about to send, the database opens a `pending` row and derives the object key,
 * and this route turns that key into a short-lived URL the browser uploads to
 * directly. Bytes never pass through the web server, and nothing becomes
 * `available` until a privileged confirmation says the object really arrived.
 *
 * The same route also carries the multipart half of the upload, for a file too
 * big for one presigned PUT — storage caps a single PUT at 5 GiB less 5 MiB and
 * the database accepts 8 GiB, so without it the browser path refused files the
 * schema would take. The browser still PUTs the bytes direct to storage; what
 * changes is that opening, assembling and abandoning the upload are server calls,
 * so the XML and any URL that could finish or cancel an upload stay here. See
 * `lib/media-multipart.ts` for the reasoning and for what is deliberately not
 * here yet (an in-flight upload is not recorded on the row, so a reload starts
 * again).
 *
 * What is NOT here, deliberately:
 * - No playback or download URL. A learner is served a rendition and never a
 *   master, so those live in `/api/media/playback` and `/api/media/download`
 *   and read `media_renditions`, not this table.
 * - No path to `available`. Completing a multipart upload makes the object exist;
 *   the row is still `pending` until a privileged confirmation has looked at the
 *   object in storage, exactly as for a single PUT.
 *
 * The per-file ceiling is enforced by `registerMediaUpload` in `lib/media.ts`
 * (`MAX_UPLOAD_BYTES`, 8 GiB). What still does not exist is a cumulative
 * per-teacher quota, which is the open decision under `platform.cost_controls`.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Storage is not configured on this deployment.', 503);

  const body = (await request.json().catch(() => null)) as Payload | null;
  const action = typeof body?.action === 'string' ? body.action : '';
  if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) {
    return fail('Unknown media action.', 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to upload media.', 401);

  // Every action needs storage configured: one registers and signs an upload URL,
  // one has to look at the object before it may confirm it, and the multipart
  // actions sign or send requests to storage themselves.
  const config = readR2Config();
  if (!config) {
    // Not a 500: this deployment has no R2 credentials, which is the expected
    // state until they are issued. The message says what is missing.
    return fail(new R2NotConfiguredError().message, 503);
  }

  if (MULTIPART_ACTIONS.includes(action)) {
    return multipart(action, asText(body?.assetId), body, supabase, config);
  }

  if (action === 'confirm_upload') {
    const assetId = typeof body?.assetId === 'string' ? body.assetId.trim() : '';
    if (!UUID.test(assetId)) return fail('That is not a media asset.', 400);

    // Through lib/media-verify.ts rather than a bare rpc here: confirming means
    // having seen the object in storage, and a second path that skipped the
    // looking would be a second, laxer rule for the same outcome. (The bare call
    // also mapped the SQL's "only staff may confirm an upload" to a 409, because
    // the regex it tested against was a different sentence.)
    const outcome = await confirmMediaUpload(supabase, assetId, { config });
    if (!outcome.ok) return fail(outcome.message, outcome.status);

    return NextResponse.json(
      {
        ok: true,
        data: {
          assetId: outcome.assetId,
          available: true,
          verifiedBytes: outcome.verifiedBytes,
        },
      },
      { status: 200 },
    );
  }

  // Checked before the row is opened: an unknown transport would otherwise leave
  // a `pending` row behind for a request that was never going to upload anything.
  const transport = typeof body?.transport === 'string' ? body.transport.trim().toLowerCase() : 'single';
  if (transport !== 'single' && transport !== 'multipart') {
    return fail('Unknown upload transport.', 400);
  }

  // Through lib/media.ts rather than a second validator here: that library
  // already refuses a fractional duration and anything over MAX_UPLOAD_BYTES,
  // and a rule that exists in two places is a rule enforced in one of them.
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
  const registered = await registerMediaUpload(supabase, {
    displayName: typeof body?.displayName === 'string' ? body.displayName : '',
    mimeType,
    byteSize: typeof body?.byteSize === 'number' ? body.byteSize : Number(body?.byteSize),
    checksum: typeof body?.checksum === 'string' ? body.checksum : '',
    durationSeconds:
      body?.durationSeconds === null || body?.durationSeconds === undefined || body?.durationSeconds === ''
        ? null
        : Number(body.durationSeconds),
    // 'r2' is the backend D8 chose on 2026-10-20. Named explicitly so a change
    // of default in SQL cannot silently move uploads somewhere else.
    storageBackend: 'r2',
  });
  if (!registered.ok) return fail(registered.message, 400);

  const { assetId, masterBucket: bucket, masterKey: key } = registered.target;
  if (bucket !== config.mastersBucket) {
    // Two places name this bucket. Refusing is better than signing a URL for a
    // bucket the database will never record the object in.
    return fail(
      `Storage is misconfigured: the database derived "${bucket}" but this deployment signs for "${config.mastersBucket}".`,
      503,
    );
  }

  if (transport === 'multipart') {
    // No presigned PUT is minted. The browser will ask for part URLs instead, and
    // a single-PUT URL nobody uses is still a live credential for an hour that can
    // write the whole file to that key.
    return NextResponse.json(
      { ok: true, data: { assetId, key, bucket, transport: 'multipart' } },
      { status: 200 },
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
        transport: 'single',
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

/**
 * The four multipart actions, in one place because they share their checks: a
 * real asset id, an upload id that came from storage, and a row the caller may
 * still see. Each delegates to `lib/media-multipart.ts`, which reads the row on
 * the caller's own client and maps storage's answers to statuses; this function
 * only decides what a request body may say.
 */
async function multipart(
  action: string,
  assetId: string,
  body: Payload | null,
  supabase: Awaited<ReturnType<typeof createClient>>,
  config: NonNullable<ReturnType<typeof readR2Config>>,
) {
  if (!UUID.test(assetId)) return fail('That is not a media asset.', 400);

  // `initiate` is the one action with no upload yet: it is the call that mints it.
  const uploadId = action === 'initiate_multipart' ? '' : asText(body?.uploadId);
  if (action !== 'initiate_multipart') {
    if (!uploadId) return fail('That upload has no id, so it cannot be continued.', 400);
    if (uploadId.length > MAX_UPLOAD_ID_LENGTH) {
      return fail('That is not an upload id this deployment issued.', 400);
    }
  }

  if (action === 'initiate_multipart') {
    const outcome = await initiateMasterMultipart(supabase, assetId, { config });
    if (!outcome.ok) return fail(outcome.message, outcome.status);
    return NextResponse.json({
      ok: true,
      data: {
        assetId,
        uploadId: outcome.value.uploadId,
        partBytes: outcome.value.partBytes,
        partCount: outcome.value.partCount,
        // So the browser signs the next batch before this one expires rather than
        // working out a window of its own.
        partUrlSeconds: MAX_PART_UPLOAD_SECONDS,
      },
    });
  }

  if (action === 'sign_parts') {
    const requested = body?.partNumbers;
    if (!Array.isArray(requested) || requested.length === 0) {
      return fail('Say which parts to sign.', 400);
    }
    if (requested.length > MAX_PARTS_PER_BATCH) {
      return fail(
        `At most ${String(MAX_PARTS_PER_BATCH)} part URLs at a time; an upload signs more as it goes.`,
        400,
      );
    }
    if (!requested.every((part) => typeof part === 'number' && Number.isInteger(part) && part > 0)) {
      return fail('Parts are numbered from one, in whole numbers.', 400);
    }
    const outcome = await signMasterPartUploads(
      supabase,
      assetId,
      uploadId,
      requested as number[],
      { config },
    );
    if (!outcome.ok) return fail(outcome.message, outcome.status);
    return NextResponse.json({ ok: true, data: { assetId, uploadId, parts: outcome.value.parts } });
  }

  if (action === 'complete_multipart') {
    const sent = body?.parts;
    if (!Array.isArray(sent) || sent.length === 0) {
      return fail('Say which parts arrived, and the ETag storage gave each one.', 400);
    }
    const parts: { partNumber: number; etag: string }[] = [];
    for (const part of sent) {
      const record = part as { partNumber?: unknown; etag?: unknown };
      if (
        typeof record?.partNumber !== 'number' ||
        !Number.isInteger(record.partNumber) ||
        typeof record?.etag !== 'string' ||
        !record.etag.trim()
      ) {
        return fail('Each part needs its number and the ETag storage returned for it.', 400);
      }
      parts.push({ partNumber: record.partNumber, etag: record.etag });
    }
    const outcome = await completeMasterMultipart(supabase, assetId, uploadId, parts, { config });
    if (!outcome.ok) return fail(outcome.message, outcome.status);
    return NextResponse.json({
      ok: true,
      data: {
        assetId,
        uploadId,
        etag: outcome.value.etag,
        byteSize: outcome.value.byteSize,
        // Assembled, not published. A privileged confirmation still has to look
        // at the object before the row leaves `pending`.
        available: false,
      },
    });
  }

  const outcome = await abortMasterMultipart(supabase, assetId, uploadId, { config });
  if (!outcome.ok) return fail(outcome.message, outcome.status);
  return NextResponse.json({ ok: true, data: { assetId, uploadId, aborted: true } });
}
