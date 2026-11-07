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
 * whether storage reports an object with the declared size at that moment, for
 * the cost of a single request rather than transferring up to 8 GiB.
 *
 * It does **not** recompute the SHA-256 digest, and this is the honest limit of
 * it: the digest in the row is the one the uploader's browser declared. Checking
 * it needs the bytes, and the only place the bytes are already on a local disk is
 * the transcode worker, which downloads the master to encode it. That is where a
 * digest check belongs, and it is noted in `NEXT.md` rather than quietly skipped.
 *
 * This check applies to this server path, not every database RPC. In particular,
 * an authorized coursework uploader can call the database confirmation directly.
 * The HEAD does not verify the content, scan for malware, or prevent replacement
 * after the check. It must not be described as proof of those things.
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
  | { ok: true; verifiedBytes: number; assetId: string; attachmentId?: string }
  | { ok: false; message: string; status: number };

export type ConfirmOptions = {
  config: R2Config;
  /** Injectable so the checks can be tested without a bucket to talk to. */
  fetchImpl?: typeof fetch;
  now?: Date;
  /**
   * Which door this is.
   *
   * 'library' is the teacher's media library, and the only function that can
   * confirm it is staff-only — that is the rule which stops an unuploaded file
   * being published to strangers.
   *
   * 'coursework' is a learner's hand-in. It is private to one submission, it can
   * never be attached to a lesson (a trigger refuses it), and the person who can
   * vouch for a child's homework arriving is the household that sent it. So the
   * database's narrower function may promote it — but only for a file that was
   * declared for that submission before the bytes moved.
   *
   * What does NOT change between them is this module: the object is still looked
   * at, and its size still compared, before anything is called.
   */
  mode?: 'library' | 'coursework';
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

  const coursework = options.mode === 'coursework';
  // A previous request may have committed while its HTTP response was lost.
  // Recheck the object, then let the database validate the available attachment.
  if (row.status !== 'pending' && !(coursework && row.status === 'available')) {
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
      message: 'Storage could not be reached to check the file. Its confirmation could not be verified.',
      status: 503,
    };
  }

  if (response.status === 404 || response.status === 403) {
    return {
      ok: false,
      message:
        'Storage did not confirm that the file is present. The confirmation could not be verified.',
      status: 409,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: `Storage answered ${String(response.status)} when asked whether the file exists. The confirmation was not made by this request.`,
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
        'declared. The confirmation was not made by this request.',
      status: 502,
    };
  }

  if (reportedBytes !== declaredBytes) {
    return {
      ok: false,
      message:
        `Storage holds ${String(reportedBytes)} bytes but the upload declared ${String(declaredBytes)}. ` +
        'The sizes differ, so this request did not confirm the file. A size check cannot detect a same-size replacement.',
      status: 409,
    };
  }

  // A coursework confirmation returns the attachment id; the library one returns
  // a boolean. Both are asked of the database, never assumed here.
  const { data: confirmed, error: confirmError } = await client.rpc(
    coursework ? 'confirm_coursework_upload' : 'confirm_media_upload',
    { p_asset_id: assetId },
  );

  if (confirmError) {
    const message = confirmError.message;
    // Both phrasings exist in the schema's history, and a permissions refusal
    // reported as a conflict sends somebody looking in the wrong place.
    const status = /only staff may confirm|only platform staff|only the uploader|verified guardian|privileg/i.test(message)
      ? 403
      : /not found|no media asset/i.test(message)
        ? 404
        : 409;
    return { ok: false, message, status };
  }

  // The library door answers `true`; the coursework door answers with the new
  // attachment's id. Anything else — false, null, an empty string — means the
  // database did not do it, and a caller must not be told it did.
  const done = coursework
    ? typeof confirmed === 'string' && confirmed !== ''
    : confirmed === true;

  if (!done) {
    return {
      ok: false,
      message: 'The file was seen in storage but the database did not confirm it.',
      status: 409,
    };
  }

  return {
    ok: true,
    verifiedBytes: reportedBytes,
    assetId,
    ...(coursework ? { attachmentId: String(confirmed) } : {}),
  };
}
