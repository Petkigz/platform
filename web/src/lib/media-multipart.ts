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
  masterBucketTarget,
  masterRequestTarget,
  multipartPartRange,
  parseMultipartUploadListing,
  parsePartListing,
  planMultipartParts,
  presignMasterPartUpload,
  r2Endpoint,
  sha256Hex,
  signRequest,
  xmlElementText,
  type ListedMultipartUpload,
  type MultipartPlan,
  type R2Config,
} from './media-r2.ts';
import { abandonMediaUpload } from './media.ts';

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
/**
 * Where an asset's master lives, if the caller may see the row at all.
 *
 * No state check: ending an unfinished upload is legitimate for an asset that is
 * still pending (the usual case) and for one that is `available` because a later
 * attempt succeeded and these are the parts of an earlier one.
 */
async function readMasterLocation(
  client: SupabaseClient,
  assetId: string,
  config: R2Config,
): Promise<{ row: MasterUploadRow } | Refusal> {
  const { data, error } = await client
    .from('media_assets')
    .select(READ_COLUMNS)
    .eq('id', assetId)
    .maybeSingle();

  if (error) return failure(error.message, 500);
  const row = data as unknown as MasterUploadRow | null;
  if (!row) return failure('That upload does not exist.', 404);

  if (row.master_bucket !== config.mastersBucket) {
    return failure(
      `Storage is misconfigured: the row records '${row.master_bucket}' but this deployment ` +
        `signs for '${config.mastersBucket}'.`,
      503,
    );
  }
  return { row };
}

async function readUploadableMaster(
  client: SupabaseClient,
  assetId: string,
  config: R2Config,
): Promise<{ row: MasterUploadRow; plan: MultipartPlan } | Refusal> {
  const located = await readMasterLocation(client, assetId, config);
  if (!('row' in located)) return located;
  const { row } = located;

  if (row.status !== 'pending') {
    return failure(
      `That file is already ${row.status}, so there is nothing left to upload.`,
      409,
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
  init: {
    method: string;
    query: Record<string, string>;
    contentType?: string;
    body?: string;
    /** A 404 is the answer wanted, not a refusal: "already gone" is the outcome. */
    allowMissing?: boolean;
  },
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

  if (response.status === 404 && init.allowMissing) return { ok: true, response };
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

// ---------------------------------------------------------------------------
// Finding an upload nobody finished
//
// The upload id is storage's and nothing here records it, so the only way back to
// a stalled transfer is to ask the bucket what it is holding. That is what makes
// a resume honest: the parts and their ETags come from storage rather than from a
// browser's memory of what it sent, so a teacher who closes the tab at part 300
// and comes back tomorrow continues from part 301 instead of starting again.
// ---------------------------------------------------------------------------

/** Pages read before giving up: ten pages of storage's own thousand entries. */
export const MAX_LISTING_PAGES = 10;

/** Storage's page size for both listings. */
const LISTING_PAGE_SIZE = 1000;

export type ResumablePart = {
  partNumber: number;
  etag: string;
  size: number;
};

export type ResumeValue = {
  /** Null when nothing is in flight for this key, so a new upload is opened. */
  uploadId: string | null;
  partBytes: number;
  partCount: number;
  uploadedParts: ResumablePart[];
  uploadedBytes: number;
  /** Why an upload that was found is not being used, when one was found. */
  note: string | null;
};

export type AbandonValue = {
  assetId: string;
  uploadId: string;
  /** The decision is in the audit trail whatever storage then said. */
  recorded: true;
  deleted: boolean;
  note: string | null;
};

function parseOrRefuse<T>(xml: string, parse: (xml: string) => T, what: string): { ok: true; value: T } | Refusal {
  try {
    return { ok: true, value: parse(xml) };
  } catch (cause) {
    return failure(
      cause instanceof R2RequestError
        ? `Storage listed ${what} in a form this could not read: ${cause.message}`
        : `Storage listed ${what} in a form this could not read.`,
      502,
    );
  }
}

/**
 * The uploads storage is holding, optionally for one key.
 *
 * Paginated because a bucket-wide listing is capped at a thousand entries and a
 * platform with a thousand unfinished uploads is exactly the platform that needs
 * to see the rest. `capped` says when reading stopped early, so a caller shows
 * "the first ten thousand" rather than "all of them".
 */
async function listUploads(
  options: MultipartOptions,
  prefix?: string,
): Promise<{ ok: true; value: { uploads: ListedMultipartUpload[]; capped: boolean } } | Refusal> {
  const target = masterBucketTarget(options.config);
  const uploads: ListedMultipartUpload[] = [];
  let keyMarker: string | null = null;
  let uploadIdMarker: string | null = null;

  for (let page = 0; page < MAX_LISTING_PAGES; page += 1) {
    const query: Record<string, string> = {
      uploads: '',
      'max-uploads': String(LISTING_PAGE_SIZE),
    };
    if (prefix !== undefined) query.prefix = prefix;
    if (keyMarker) query['key-marker'] = keyMarker;
    if (uploadIdMarker) query['upload-id-marker'] = uploadIdMarker;

    const called = await callStorage(options, target, { method: 'GET', query });
    if (!called.ok) return called;

    const parsed = parseOrRefuse(await called.response.text(), parseMultipartUploadListing, 'unfinished uploads');
    if (!parsed.ok) return parsed;

    // The prefix is matched by storage as a prefix, so a key that merely starts
    // with the wanted one can arrive. Exact comparison keeps a resume from
    // continuing somebody else's transfer.
    uploads.push(...parsed.value.uploads.filter((upload) => prefix === undefined || upload.key === prefix));

    if (!parsed.value.truncated) return { ok: true, value: { uploads, capped: false } };
    keyMarker = parsed.value.nextKeyMarker;
    uploadIdMarker = parsed.value.nextUploadIdMarker;
    if (!keyMarker && !uploadIdMarker) return { ok: true, value: { uploads, capped: true } };
  }

  return { ok: true, value: { uploads, capped: true } };
}

/** The parts storage already holds for one upload, in ascending part order. */
async function listParts(
  options: MultipartOptions,
  key: string,
  uploadId: string,
): Promise<{ ok: true; value: ResumablePart[] } | Refusal> {
  const target = masterRequestTarget(options.config, key);
  const parts: ResumablePart[] = [];
  let marker: number | null = null;

  for (let page = 0; page < MAX_LISTING_PAGES; page += 1) {
    const query: Record<string, string> = { uploadId, 'max-parts': String(LISTING_PAGE_SIZE) };
    if (marker !== null) query['part-number-marker'] = String(marker);

    const called = await callStorage(options, target, { method: 'GET', query });
    if (!called.ok) return called;

    const parsed = parseOrRefuse(await called.response.text(), parsePartListing, 'parts');
    if (!parsed.ok) return parsed;

    parts.push(...parsed.value.parts);
    if (!parsed.value.truncated) {
      return { ok: true, value: parts.sort((a, b) => a.partNumber - b.partNumber) };
    }
    marker = parsed.value.nextPartNumberMarker;
    // Truncated with no marker is a listing that cannot be continued. Saying so
    // beats resuming from half a list, which would re-send parts that arrived.
    if (marker === null) {
      return failure(
        'Storage said there were more parts but not where to continue reading, so this will not ' +
          'guess which ones arrived.',
        502,
      );
    }
  }

  return failure(
    `Storage listed more than ${String(MAX_LISTING_PAGES * LISTING_PAGE_SIZE)} parts of one upload, ` +
      'which is more than an upload this platform opens can have.',
    502,
  );
}

/**
 * Whether the parts storage holds still fit the plan this deployment makes.
 *
 * A part size that differs means the upload was opened by different code — a
 * changed part size, or a file whose declared size has since changed — and
 * completing it would assemble an object whose bytes do not line up with the row.
 * The answer is a sentence rather than a boolean because the caller reports it.
 */
function partsAgainstPlan(parts: ResumablePart[], plan: MultipartPlan): string | null {
  const seen = new Set<number>();
  const lastPartBytes = plan.byteSize - (plan.partCount - 1) * plan.partBytes;

  for (const part of parts) {
    if (seen.has(part.partNumber)) {
      return `storage listed part ${String(part.partNumber)} twice`;
    }
    seen.add(part.partNumber);

    if (part.partNumber > plan.partCount) {
      return `storage holds a part ${String(part.partNumber)} of an upload this file divides into ` +
        `${String(plan.partCount)}`;
    }
    const expected = part.partNumber === plan.partCount ? lastPartBytes : plan.partBytes;
    if (part.size !== expected) {
      return `part ${String(part.partNumber)} is ${String(part.size)} bytes and this plan makes it ` +
        `${String(expected)}`;
    }
  }
  return null;
}

/** The most recently opened of several uploads, or null when there are none. */
function newestUpload(uploads: ListedMultipartUpload[]): ListedMultipartUpload | null {
  if (uploads.length === 0) return null;
  // ISO timestamps compare as strings. A missing date sorts last rather than
  // winning: an upload nobody can date is not the one to prefer.
  const sorted = [...uploads].sort((a, b) => (b.initiated ?? '').localeCompare(a.initiated ?? ''));
  return sorted[0] ?? null;
}

/**
 * What a stalled upload of this asset looks like now.
 *
 * Answered for a `pending` row the caller may see, so a teacher asking about
 * their own file gets their own upload and nothing else. Three outcomes, all of
 * them usable by the caller: an upload with parts (continue from where it
 * stopped), an upload whose parts do not fit the plan (start again, and say why),
 * and no upload at all (start again — the row is still worth reusing, which is
 * what stops a second attempt from leaving a duplicate `pending` file in the
 * teacher's library).
 */
export async function resumeMasterMultipart(
  client: SupabaseClient,
  assetId: string,
  options: MultipartOptions,
): Promise<MultipartOutcome<ResumeValue>> {
  const read = await readUploadableMaster(client, assetId, options.config);
  if (!('row' in read)) return read;
  const { row, plan } = read;

  const empty: ResumeValue = {
    uploadId: null,
    partBytes: plan.partBytes,
    partCount: plan.partCount,
    uploadedParts: [],
    uploadedBytes: 0,
    note: null,
  };

  const listed = await listUploads(options, row.master_key);
  if (!listed.ok) return listed;

  const found = newestUpload(listed.value.uploads);
  if (!found) return { ok: true, value: empty };

  const parts = await listParts(options, row.master_key, found.uploadId);
  if (!parts.ok) return parts;

  const problem = partsAgainstPlan(parts.value, plan);
  if (problem) {
    return {
      ok: true,
      value: {
        ...empty,
        note:
          `An unfinished upload of this file is in storage but ${problem}, so a new one will start. ` +
          'The old parts are left to the cleanup that runs on unfinished uploads.',
      },
    };
  }

  return {
    ok: true,
    value: {
      uploadId: found.uploadId,
      partBytes: plan.partBytes,
      partCount: plan.partCount,
      uploadedParts: parts.value,
      uploadedBytes: parts.value.reduce((total, part) => total + part.size, 0),
      note: null,
    },
  };
}

/**
 * Every unfinished upload in the masters bucket, for staff.
 *
 * These are bytes being paid for that no row in the schema mentions: an upload
 * was opened, some parts arrived, and nobody completed or abandoned it. Storage
 * ends them on its own lifecycle after seven days, so this is not a leak — it is
 * a week of storage per abandoned transfer, and a list nobody could read.
 */
export async function listUnfinishedMasterUploads(
  options: MultipartOptions,
): Promise<MultipartOutcome<{ uploads: ListedMultipartUpload[]; capped: boolean }>> {
  const listed = await listUploads(options);
  if (!listed.ok) return listed;
  // Newest first: the question an operator asks is what has been sitting there.
  const uploads = [...listed.value.uploads].sort((a, b) =>
    (a.initiated ?? '').localeCompare(b.initiated ?? ''),
  );
  return { ok: true, value: { uploads, capped: listed.value.capped } };
}

/**
 * End an unfinished upload: record the decision, then delete the parts.
 *
 * The audit entry is written before storage is asked, so a refusal leaves a
 * record of what was decided and why, while the opposite order would leave a
 * deletion unrecorded whenever the write failed. The response says which of the
 * two happened, because "recorded and deleted" and "recorded, storage refused"
 * are different facts and only one of them needs a second look.
 */
export async function abandonUnfinishedUpload(
  client: SupabaseClient,
  input: { assetId: string; uploadId: string; reason: string },
  options: MultipartOptions,
): Promise<MultipartOutcome<AbandonValue>> {
  const recorded = await abandonMediaUpload(client, input.assetId, input.uploadId, input.reason);
  if (!recorded.ok) {
    const status = /Only platform staff/i.test(recorded.message)
      ? 403
      : /That upload is gone/i.test(recorded.message)
        ? 404
        : 400;
    return failure(recorded.message, status);
  }

  const located = await readMasterLocation(client, input.assetId, options.config);
  if (!('row' in located)) return located;

  const target = masterRequestTarget(options.config, located.row.master_key);
  const called = await callStorage(options, target, {
    method: 'DELETE',
    query: { uploadId: input.uploadId.trim() },
    allowMissing: true,
  });

  if (!called.ok) {
    return {
      ok: true,
      value: {
        assetId: input.assetId,
        uploadId: input.uploadId.trim(),
        recorded: true,
        deleted: false,
        note:
          `${called.message} The decision is recorded, and storage ends an unfinished upload on ` +
          'its own after seven days.',
      },
    };
  }

  const missing = called.response.status === 404;
  return {
    ok: true,
    value: {
      assetId: input.assetId,
      uploadId: input.uploadId.trim(),
      recorded: true,
      deleted: true,
      note: missing ? 'Storage had no record of that upload, so there was nothing to delete.' : null,
    },
  };
}
