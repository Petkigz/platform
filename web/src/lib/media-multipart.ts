/**
 * Multipart upload of a master: the server's half.
 *
 * WHY THIS EXISTS
 * ---------------
 * One presigned PUT is capped by storage itself at 5 GiB less 5 MiB, and it cannot
 * be resumed: a failure near the end of a 4 GiB recording starts again from zero.
 * The database accepts 8 GiB, so the browser path was refusing files the schema
 * would take, and refusing them in the most expensive way possible — after most of
 * the bytes had already been transferred.
 *
 * WHAT THE SERVER DOES AND WHAT THE BROWSER DOES
 * ----------------------------------------------
 * The browser PUTs the parts, direct to storage, so the bytes never pass through
 * the web server; that is unchanged from the single-PUT path and is the reason D8
 * could afford direct uploads at all. Everything else is a server call with its
 * own credentials: initiating (which mints the upload id), completing (which
 * assembles the parts into the object) and aborting (which throws them away).
 *
 * That split is not a convenience. Three things stay out of the browser: the XML,
 * the provenance of the upload id — the server learns it from storage rather than
 * being told it by a client — and any URL that could finish or cancel an upload.
 * A presigned complete URL handed to a browser is a credential that assembles
 * whatever parts it is pointed at.
 *
 * WHAT IS NOT HERE YET
 * --------------------
 * The upload id and the finished parts live in the page, not in the database, so a
 * reload loses them: a part that fails is retried, which is the common case and
 * the expensive one to get wrong, but a tab that closes mid-upload starts again.
 * Storage's own lifecycle aborts an incomplete multipart upload after seven days,
 * so an abandoned one costs storage for a week and then cleans itself up; an
 * explicit abort on failure does not even wait that long. Recording the in-flight
 * upload on the row, so a later visit can resume it or an operator can abort it,
 * is the next unit and is written down in NEXT.md rather than quietly skipped.
 *
 * DEPLOYMENT REQUIREMENT THIS ADDS
 * --------------------------------
 * The bucket needs a CORS rule allowing PUT from the app's origin and — new, and
 * the part that is easy to miss — `Access-Control-Expose-Headers: ETag`. The
 * browser has to read each part's ETag to complete the upload, and a browser may
 * not read a response header the server did not expose. Without that header the
 * parts all upload successfully and the complete step has nothing to say about
 * them.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  R2RequestError,
  R2_REGION,
  R2_SERVICE,
  canonicalQuery,
  completeMultipartUploadBody,
  masterRequestTarget,
  multipartPartRange,
  planMultipartParts,
  presignMasterPartUpload,
  r2Endpoint,
  sha256Hex,
  signRequest,
  xmlElementText,
  type MultipartPlan,
  type R2Config,
} from './media-r2.ts';

/** Columns needed to sign for one master, and nothing else. */
const READ_COLUMNS = 'id, master_bucket, master_key, byte_size, mime_type, status';

/** The most part URLs signed in one batch, so a call cannot ask for five hundred. */
export const MAX_PARTS_PER_BATCH = 32;

export type MasterUploadRow = {
  id: string;
  master_bucket: string;
  master_key: string;
  byte_size: number | string;
  mime_type: string;
  status: string;
};

export type MultipartOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; status: number };

export type MultipartOptions = {
  config: R2Config;
  /** Injectable, so the requests are tested without a bucket to talk to. */
  fetchImpl?: typeof fetch;
  now?: Date;
};

export type SignedPart = {
  partNumber: number;
  url: string;
  method: 'PUT';
  start: number;
  end: number;
  expiresInSeconds: number;
};

/**
 * A refusal. Not generic: `MultipartOutcome<T>` is the public shape, and an
 * internal helper that returned it would also be able to return `{ok: true}`,
 * which is how a successful branch ends up in a type that cannot be narrowed.
 */
const failure = (message: string, status: number) =>
  ({ ok: false as const, message, status });

type Refusal = ReturnType<typeof failure>;

/**
 * The row, if it is one this caller may upload to, and the plan that follows from
 * its declared size.
 *
 * Read on every call rather than once at the start, which is a deliberate cost: a
 * master quarantined or withdrawn while its parts are in flight stops being
 * uploadable at the next batch instead of at the end. The SELECT policy hides a
 * master belonging to somebody else, so a missing row and somebody else's row
 * produce the same answer.
 */
async function readUploadableMaster(
  client: SupabaseClient,
  assetId: string,
  config: R2Config,
): Promise<{ row: MasterUploadRow; plan: MultipartPlan } | Refusal> {
  const { data, error } = await client
    .from('media_assets')
    .select(READ_COLUMNS)
    .eq('id', assetId)
    .maybeSingle();

  if (error) return failure(error.message, 500);
  const row = data as unknown as MasterUploadRow | null;
  if (!row) return failure('That upload does not exist.', 404);

  if (row.status !== 'pending') {
    return failure(
      `That file is already ${row.status}, so there is nothing left to upload.`,
      409,
    );
  }

  if (row.master_bucket !== config.mastersBucket) {
    return failure(
      `Storage is misconfigured: the row records '${row.master_bucket}' but this deployment ` +
        `signs for '${config.mastersBucket}'.`,
      503,
    );
  }

  const byteSize = Number(row.byte_size);
  if (!Number.isInteger(byteSize) || byteSize < 1) {
    return failure(
      'That row does not record a usable size, so it cannot be divided into parts.',
      409,
    );
  }

  try {
    return { row, plan: planMultipartParts(byteSize) };
  } catch (cause) {
    return failure(
      cause instanceof R2RequestError ? cause.message : 'That size cannot be divided into parts.',
      409,
    );
  }
}

/** A server-side signed request to storage: header signing, not a presigned URL. */
async function callStorage(
  options: MultipartOptions,
  target: { host: string; path: string },
  init: { method: string; query: Record<string, string>; contentType?: string; body?: string },
): Promise<{ ok: true; response: Response } | Refusal> {
  const payloadHash = sha256Hex(init.body ?? '');
  const signed = signRequest({
    method: init.method,
    host: target.host,
    path: target.path,
    query: init.query,
    headers: {
      ...(init.contentType ? { 'content-type': init.contentType } : {}),
      'x-amz-content-sha256': payloadHash,
    },
    payloadHash,
    credentials: options.config.credentials,
    region: R2_REGION,
    service: R2_SERVICE,
    now: options.now,
  });

  // The query on the wire is built the same way the signed canonical query was,
  // so what storage receives is byte-identical to what was hashed. A URL encoder
  // that escaped `~` in an upload id differently would still work — storage
  // re-canonicalises — but "still works because the server decodes it" is not
  // something to rely on for a signature.
  const search = canonicalQuery(init.query);
  const url = `${r2Endpoint(options.config.accountId)}${target.path}${search ? `?${search}` : ''}`;

  // `host` is signed — SigV4 requires it — but not sent: the fetch client sets it
  // from the URL, and setting it twice would be a different header than the one
  // that was signed.
  const headers: Record<string, string> = { authorization: signed.authorization };
  for (const [name, value] of Object.entries(signed.headers)) {
    if (name.toLowerCase() !== 'host') headers[name] = value;
  }

  const doFetch = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await doFetch(url, { method: init.method, headers, body: init.body });
  } catch {
    return failure('Storage could not be reached. Nothing was published and the row is still pending.', 503);
  }

  if (response.status === 403 || response.status === 404) {
    return failure(
      `Storage refused the ${init.method} (${String(response.status)}). The row is still pending.`,
      409,
    );
  }
  if (!response.ok) {
    return failure(
      `Storage answered ${String(response.status)} to the ${init.method}. The row is still pending.`,
      502,
    );
  }
  return { ok: true, response };
}

/**
 * Opens a multipart upload for one master and returns how it divides.
 *
 * The upload id comes from storage, in storage's own XML, and goes no further than
 * the caller's own asset: the row is read through the caller's client, so RLS has
 * already decided whether they may see it.
 */
export async function initiateMasterMultipart(
  client: SupabaseClient,
  assetId: string,
  options: MultipartOptions,
): Promise<MultipartOutcome<{ uploadId: string; partBytes: number; partCount: number }>> {
  const read = await readUploadableMaster(client, assetId, options.config);
  if (!('row' in read)) return read;
  const { row, plan } = read;

  const target = masterRequestTarget(options.config, row.master_key);
  // The content type on the initiate call is the object's content type: parts
  // carry bytes, and this is where the declared type is recorded.
  const called = await callStorage(options, target, {
    method: 'POST',
    query: { uploads: '' },
    contentType: row.mime_type,
  });
  if (!called.ok) return called;

  const xml = await called.response.text();
  let uploadId: string;
  try {
    uploadId = xmlElementText(xml, 'UploadId');
  } catch (cause) {
    return failure(
      cause instanceof R2RequestError
        ? `Storage opened the upload but did not return an id: ${cause.message}`
        : 'Storage opened the upload but did not return an id.',
      502,
    );
  }

  return {
    ok: true,
    value: { uploadId, partBytes: plan.partBytes, partCount: plan.partCount },
  };
}

/**
 * Signs one batch of part uploads.
 *
 * Batched rather than signed all at once for two reasons: each URL is a live
 * credential and hundreds of them would exist for the whole upload, and a part
 * signed at the start of a two-hour upload would expire before it was sent. A
 * short window that is renewed as the upload progresses beats a long one.
 */
export async function signMasterPartUploads(
  client: SupabaseClient,
  assetId: string,
  uploadId: string,
  partNumbers: number[],
  options: { config: R2Config; now?: Date },
): Promise<MultipartOutcome<{ parts: SignedPart[] }>> {
  if (!uploadId.trim()) return failure('That upload has no id, so it cannot take parts.', 400);
  if (partNumbers.length === 0) return failure('Ask for at least one part.', 400);
  if (partNumbers.length > MAX_PARTS_PER_BATCH) {
    return failure(
      `At most ${String(MAX_PARTS_PER_BATCH)} part URLs at a time; an upload signs more as it goes.`,
      400,
    );
  }
  if (new Set(partNumbers).size !== partNumbers.length) {
    return failure('The same part was asked for twice.', 400);
  }

  const read = await readUploadableMaster(client, assetId, options.config);
  if (!('row' in read)) return read;
  const { row, plan } = read;

  try {
    const parts = partNumbers.map((partNumber) => {
      const signed = presignMasterPartUpload(options.config, row.master_key, {
        uploadId,
        partNumber,
        plan,
        now: options.now,
      });
      const range = multipartPartRange(plan, partNumber);
      return {
        partNumber,
        url: signed.url,
        method: 'PUT' as const,
        start: range.start,
        end: range.end,
        expiresInSeconds: signed.expiresInSeconds,
      };
    });
    return { ok: true, value: { parts } };
  } catch (cause) {
    return failure(
      cause instanceof R2RequestError ? cause.message : 'Those parts could not be signed.',
      400,
    );
  }
}

/**
 * Assembles the parts into the object.
 *
 * The part list has to be the whole plan. Completing with fewer parts is accepted
 * by storage and produces a shorter object, while the row still declares the size
 * the whole file would have been — a truncated lesson that looks uploaded, caught
 * only later by a staff member verifying the size. Refusing here is cheaper than
 * that conversation.
 */
export async function completeMasterMultipart(
  client: SupabaseClient,
  assetId: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
  options: MultipartOptions,
): Promise<MultipartOutcome<{ etag: string; byteSize: number }>> {
  if (!uploadId.trim()) return failure('That upload has no id, so it cannot be completed.', 400);

  const read = await readUploadableMaster(client, assetId, options.config);
  if (!('row' in read)) return read;
  const { row, plan } = read;

  if (parts.length !== plan.partCount) {
    return failure(
      `This upload is ${String(plan.partCount)} parts and ${String(parts.length)} arrived, so the ` +
        'file would be assembled short. The row is still pending.',
      409,
    );
  }

  let body: string;
  try {
    body = completeMultipartUploadBody(parts);
  } catch (cause) {
    return failure(
      cause instanceof R2RequestError ? cause.message : 'Those parts cannot be assembled.',
      400,
    );
  }

  const target = masterRequestTarget(options.config, row.master_key);
  const called = await callStorage(options, target, {
    method: 'POST',
    query: { uploadId },
    contentType: 'application/xml',
    body,
  });
  if (!called.ok) return called;

  const xml = await called.response.text();
  try {
    // Storage returns the object ETag quoted, the way an HTTP header carries it.
    // Unquoted here so the value is an identifier rather than a header fragment.
    return {
      ok: true,
      value: {
        etag: xmlElementText(xml, 'ETag').replace(/^\"|\"$/g, ''),
        byteSize: plan.byteSize,
      },
    };
  } catch {
    // The object exists whether or not the response is readable; saying otherwise
    // would send the teacher back to upload 8 GiB again.
    return { ok: true, value: { etag: '', byteSize: plan.byteSize } };
  }
}

/**
 * Throws the parts away.
 *
 * Best effort and called when an upload has already failed, so a refusal here is
 * not worth a second failure: storage aborts an incomplete multipart upload on its
 * own lifecycle after seven days, and this saves a week of paying for bytes
 * nobody will ever assemble.
 */
export async function abortMasterMultipart(
  client: SupabaseClient,
  assetId: string,
  uploadId: string,
  options: MultipartOptions,
): Promise<MultipartOutcome<{ aborted: true }>> {
  if (!uploadId.trim()) return failure('That upload has no id, so there is nothing to abort.', 400);

  const read = await readUploadableMaster(client, assetId, options.config);
  if (!('row' in read)) return read;

  const target = masterRequestTarget(options.config, read.row.master_key);
  const called = await callStorage(options, target, {
    method: 'DELETE',
    query: { uploadId },
  });
  if (!called.ok) return called;
  return { ok: true, value: { aborted: true } };
}
