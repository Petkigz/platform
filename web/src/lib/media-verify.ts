/**
 * Verifying that an uploaded master really arrived, and only then making it
 * available.
 *
 * WHY THIS IS A SEPARATE MODULE
 * -----------------------------
 * It imports `media-r2.ts`, which uses `node:crypto` to sign requests.
 * `lib/media.ts` is imported by a client component — the teacher's upload form
 * reads `readableByteSize` from it — and a runtime import of `node:crypto` in
 * that graph would fail the browser build. So the ingest and moderation library
 * stays free of signing code, and verification lives here, where it belongs
 * anyway: it is a server act with an outbound request and a privileged call in
 * it.
 *
 * WHAT VERIFICATION MEANS, AND WHAT IT DOES NOT
 * ---------------------------------------------
 * One HEAD request against the master's own object, comparing the size storage
 * reports with the size the uploader declared. That answers the question
 * `confirm_media_upload()` exists to answer — did the file arrive — for the cost
 * of a single request rather than a transfer of something that can be 8 GiB.
 *
 * It does **not** recompute the SHA-256 digest, and this is the honest limit of
 * it: the digest in the row is the one the uploader's browser declared. Checking
 * it needs the bytes, and the only place the bytes are already on a local disk is
 * the transcode worker, which downloads the master to encode it. That is where a
 * digest check belongs, and it is noted in `NEXT.md` rather than quietly skipped.
 *
 * Confirming without looking is the failure this prevents. `confirm_media_upload`
 * is staff-only precisely so an uploader cannot mark their own file ready, but a
 * staff member clicking "confirm" on a file that never finished uploading would
 * publish a row pointing at nothing — and every rendition encoded from it would
 * be a rendition of a hole.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { R2RequestError, presignMasterHead, type R2Config } from './media-r2.ts';

export type MasterRow = {
  id: string;
  master_bucket: string;
  master_key: string;
  byte_size: number | string;
  checksum: string;
  status: string;
};

export type ConfirmOutcome =
  | { ok: true; verifiedBytes: number; assetId: string }
  | { ok: false; message: string; status: number };

export type ConfirmOptions = {
  config: R2Config;
  /** Injectable so the checks can be tested without a bucket to talk to. */
  fetchImpl?: typeof fetch;
  now?: Date;
};

/**
 * Confirms one upload, having first seen the object in storage.
 *
 * The status codes matter: a caller has to be able to tell "you may not do this"
 * from "the file is not there" from "storage is misconfigured", because the
 * first is a permissions problem, the second is a teacher's problem, and the
 * third is ours.
 */
export async function confirmMediaUpload(
  client: SupabaseClient,
  assetId: string,
  options: ConfirmOptions,
): Promise<ConfirmOutcome> {
  const doFetch = options.fetchImpl ?? fetch;

  const { data, error } = await client
    .from('media_assets')
    .select('id, master_bucket, master_key, byte_size, checksum, status')
    .eq('id', assetId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message, status: 500 };

  const row = data as unknown as MasterRow | null;
  if (!row) {
    // Not distinguished from "exists but you may not see it": the SELECT policy
    // hides a master belonging to somebody else, and saying which would tell a
    // caller what to try next.
    return { ok: false, message: 'That upload does not exist.', status: 404 };
  }

  if (row.status !== 'pending') {
    return {
      ok: false,
      message: `That file is already ${row.status}, so there is nothing to confirm.`,
      status: 409,
    };
  }

  const declaredBytes = Number(row.byte_size);
  if (!Number.isFinite(declaredBytes) || declaredBytes <= 0) {
    return {
      ok: false,
      message: 'That row does not record a usable size, so the object cannot be checked against it.',
      status: 409,
    };
  }

  if (row.master_bucket !== options.config.mastersBucket) {
    // Two places name this bucket. Signing a HEAD for ours would "verify" an
    // object in a bucket the row does not point at.
    return {
      ok: false,
      message:
        `Storage is misconfigured: the row records '${row.master_bucket}' but this deployment ` +
        `signs for '${options.config.mastersBucket}'.`,
      status: 503,
    };
  }

  let signedUrl: string;
  try {
    signedUrl = presignMasterHead(options.config, row.master_key, { now: options.now }).url;
  } catch (cause) {
    return {
      ok: false,
      message:
        cause instanceof R2RequestError
          ? cause.message
          : 'The verification request could not be signed.',
      status: 503,
    };
  }

  let response: Response;
  try {
    response = await doFetch(signedUrl, { method: 'HEAD' });
  } catch {
    return {
      ok: false,
      message: 'Storage could not be reached to check the file. The row is still pending.',
      status: 503,
    };
  }

  if (response.status === 404 || response.status === 403) {
    return {
      ok: false,
      message:
        'The file never arrived in storage, so it cannot be made available. The row is still ' +
        'pending and the teacher can upload it again.',
      status: 409,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: `Storage answered ${String(response.status)} when asked whether the file exists. The row is still pending.`,
      status: 502,
    };
  }

  const reported = response.headers.get('content-length');
  const reportedBytes = reported === null ? null : Number(reported);
  if (reportedBytes === null || !Number.isFinite(reportedBytes)) {
    return {
      ok: false,
      message:
        'Storage did not report a size for the file, so it could not be compared with what was ' +
        'declared. The row is still pending.',
      status: 502,
    };
  }

  if (reportedBytes !== declaredBytes) {
    return {
      ok: false,
      message:
        `Storage holds ${String(reportedBytes)} bytes but the upload declared ${String(declaredBytes)}. ` +
        'A partial or replaced file must not become available. The row is still pending.',
      status: 409,
    };
  }

  const { data: confirmed, error: confirmError } = await client.rpc('confirm_media_upload', {
    p_asset_id: assetId,
  });

  if (confirmError) {
    const message = confirmError.message;
    // Both phrasings exist in the schema's history, and a permissions refusal
    // reported as a conflict sends somebody looking in the wrong place.
    const status = /only staff may confirm|only platform staff|privileg/i.test(message)
      ? 403
      : /not found|no media asset/i.test(message)
        ? 404
        : 409;
    return { ok: false, message, status };
  }

  if (confirmed !== true) {
    return {
      ok: false,
      message: 'The file was seen in storage but the database did not confirm it.',
      status: 409,
    };
  }

  return { ok: true, verifiedBytes: reportedBytes, assetId };
}
