/**
 * The browser's half of a multipart upload: PUT the parts, direct to storage.
 *
 * This module is client-safe on purpose — no `node:crypto`, no server imports —
 * because it runs in the tab, and the tab is the only place that has the bytes.
 * Everything that needs credentials is a POST to `/api/media`, which opens the
 * upload, signs a batch of part URLs, assembles the parts and, if this gives up,
 * throws them away. The browser never sees an XML body, never learns how a
 * signature is made, and never holds a URL that could complete or cancel an
 * upload: it holds URLs that can each write one slice of one key, for fifteen
 * minutes.
 *
 * SEQUENTIAL, NOT PARALLEL
 * ------------------------
 * Parts go one at a time. Storage allows several at once and a parallel uploader
 * would finish sooner on a fast link, but the cost is a different shape of
 * failure: four parts in flight on a connection that drops means four retries,
 * four progress numbers moving at once, and a teacher watching a bar that goes
 * backwards. One part at a time gives a progress bar that only moves forwards and
 * a retry that is easy to reason about, on the connection profile this platform
 * is actually used on. It also makes this module testable without a scheduler.
 *
 * WHY PARTS ARE SIGNED IN SMALL BATCHES
 * -------------------------------------
 * Each part URL lives 900 seconds, so signing all 512 of an 8 GiB upload at the
 * start would hand out credentials that outlive the upload and expire before they
 * are used, depending on the connection. Batches of eight are signed as they are
 * needed, which keeps the live credentials small and means a multi-hour transfer
 * never runs into the one-hour window a single presigned PUT is limited to.
 *
 * RESUMING
 * --------
 * A reload used to cost the whole file, because the upload id is storage's and
 * this page had no way back to it. `/api/media` now answers `resume_upload` for a
 * checksum and a size — the only two facts about a file that survive a closed tab
 * — and reads back the parts storage already holds, so the transfer continues from
 * the part it stopped at and the bar starts part-way instead of at zero. The ETags
 * come from the bucket rather than from memory, which is the difference between
 * resuming a transfer and assembling a file out of guesses.
 *
 * WHAT A FAILURE COSTS
 * --------------------
 * A part that fails is retried, up to three times, with a freshly signed URL each
 * time — the most common cause is that the URL expired or the connection dropped,
 * and neither is fixed by sending the same request again. If all attempts fail, or
 * the teacher stops the upload, this asks the server to abort, which deletes the
 * parts already stored. That call is best effort: if it fails, storage aborts an
 * incomplete multipart upload on its own lifecycle after seven days, so the worst
 * case is paying for bytes nobody will assemble for a week.
 *
 * Still not here: nothing about an in-flight upload is written to the database, so
 * the way back to one is always a question to the bucket, and resuming needs the
 * same file to be chosen again — the checksum is what recognises it, and a browser
 * cannot produce it from nothing. An upload whose parts do not fit the plan this
 * deployment makes is left to storage's own seven-day cleanup and started again,
 * because completing it would assemble an object the row cannot describe.
 *
 * DEPLOYMENT REQUIREMENT
 * ----------------------
 * The masters bucket needs a CORS rule allowing PUT from this app's origin and
 * `Access-Control-Expose-Headers: ETag`. Every part uploads fine without it and
 * the upload then fails at the first ETag read, which is why the error below
 * names the header rather than reporting a mystery.
 */

/** Parts signed per request to `/api/media`. See MAX_PARTS_PER_BATCH server-side. */
export const PARTS_PER_SIGNATURE_BATCH = 8;

/** Attempts at one part before the upload gives up. */
export const MAX_PART_ATTEMPTS = 3;

/** Pause before a retry, multiplied by the attempt: 750ms, then 1500ms. */
export const RETRY_DELAY_MS = 750;

export type PartPhase = 'opening' | 'resuming' | 'signing' | 'uploading' | 'assembling' | 'abandoned';

export type MultipartProgress = {
  phase: PartPhase;
  partNumber: number;
  partCount: number;
  /** Bytes storage has accepted, which only ever increases. */
  uploadedBytes: number;
  totalBytes: number;
};

export type MultipartUploadValue = {
  assetId: string;
  uploadId: string;
  etag: string;
  byteSize: number;
};

export type MultipartUploadOutcome =
  | { ok: true; value: MultipartUploadValue }
  | { ok: false; message: string; abandoned: boolean };

export type SignedPartFromServer = {
  partNumber: number;
  url: string;
  method: 'PUT';
  start: number;
  end: number;
  expiresInSeconds: number;
};

/** A part storage already holds, read back from the bucket by the server. */
export type ResumedPart = {
  partNumber: number;
  etag: string;
  size: number;
};

export type MultipartUploadInput = {
  /** The file's bytes. A browser `File` is a `Blob`, and `slice` is all this needs. */
  file: Blob;
  assetId: string;
  /**
   * An upload storage is already holding parts of, from `resume_upload`.
   *
   * The parts and their ETags come from the bucket rather than from this page's
   * memory, which is what makes them trustworthy after a reload: nothing here has
   * to believe a browser that says it sent something.
   */
  resume?: { uploadId: string; partCount: number; parts: ResumedPart[] };
  onProgress?: (progress: MultipartProgress) => void;
  /** Injectable so the uploader can be tested without a bucket or a browser. */
  fetchImpl?: typeof fetch;
  /** Stopping mid-upload abandons the parts and asks the server to delete them. */
  signal?: { aborted: boolean };
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; message: string };

const failure = (message: string, abandoned: boolean): MultipartUploadOutcome => ({
  ok: false,
  message,
  abandoned,
});

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One POST to `/api/media`, answered as JSON.
 *
 * The route returns a sentence meant for the teacher on failure, so it is passed
 * through rather than replaced: a refusal that says "this upload is 512 parts and
 * 511 arrived" is worth more than "upload failed".
 */
async function callApi<T>(
  fetchImpl: typeof fetch,
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  let response: Response;
  try {
    response = await fetchImpl('/api/media', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, message: 'The server could not be reached. Nothing was uploaded.' };
  }

  const parsed = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!parsed) {
    return {
      ok: false,
      message: `The server answered ${String(response.status)} without saying why.`,
    };
  }
  if (!parsed.ok) return { ok: false, message: parsed.message };
  return { ok: true, data: parsed.data };
}

/**
 * Upload one master in parts.
 *
 * The plan comes from the server — part size and part count are read from the row
 * the database opened — and so do the byte ranges each part covers. This function
 * does not work out an offset of its own, because a browser and a server that
 * disagree about where a part starts produce an object that is the right size and
 * the wrong bytes.
 */
export async function uploadInParts(input: MultipartUploadInput): Promise<MultipartUploadOutcome> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const sleep = input.sleep ?? defaultSleep;
  const retryDelayMs = input.retryDelayMs ?? RETRY_DELAY_MS;
  const totalBytes = input.file.size;

  const report = (phase: PartPhase, partNumber: number, partCount: number, uploadedBytes: number) =>
    input.onProgress?.({ phase, partNumber, partCount, uploadedBytes, totalBytes });

  const etags: { partNumber: number; etag: string }[] = [];
  /** The parts storage already holds, which are not sent again. */
  const arrived = new Set<number>();
  let uploadId: string;
  let partCount: number;
  let uploadedBytes = 0;

  if (input.resume) {
    uploadId = input.resume.uploadId;
    partCount = input.resume.partCount;
    report('resuming', 0, partCount, 0);
    for (const part of input.resume.parts) {
      // A part outside the plan belongs to some other upload of the same key, and
      // completing with it would assemble an object the row cannot describe.
      if (!Number.isInteger(part.partNumber) || part.partNumber < 1 || part.partNumber > partCount) {
        continue;
      }
      if (arrived.has(part.partNumber)) continue;
      arrived.add(part.partNumber);
      etags.push({ partNumber: part.partNumber, etag: part.etag });
      uploadedBytes += part.size;
    }
    // The bar starts part-way, which is the point: the bytes are already there.
    report('resuming', arrived.size, partCount, uploadedBytes);
  } else {
    report('opening', 0, 0, 0);
    const opened = await callApi<{ uploadId: string; partBytes: number; partCount: number }>(
      fetchImpl,
      { action: 'initiate_multipart', assetId: input.assetId },
    );
    if (!opened.ok) return failure(opened.message, false);
    uploadId = opened.data.uploadId;
    partCount = opened.data.partCount;
  }

  if (!uploadId?.trim() || !Number.isInteger(partCount) || partCount < 1) {
    return failure('The server did not say how many parts this file needs.', false);
  }

  for (let first = 1; first <= partCount; first += PARTS_PER_SIGNATURE_BATCH) {
    if (input.signal?.aborted) return abandon(fetchImpl, input.assetId, uploadId);

    const wanted: number[] = [];
    for (let part = first; part < first + PARTS_PER_SIGNATURE_BATCH && part <= partCount; part += 1) {
      if (!arrived.has(part)) wanted.push(part);
    }
    // A batch storage already holds costs no request at all: nothing to sign, and
    // nothing to send.
    if (wanted.length === 0) continue;

    report('signing', wanted[0] ?? first, partCount, uploadedBytes);
    const signed = await callApi<{ parts: SignedPartFromServer[] }>(fetchImpl, {
      action: 'sign_parts',
      assetId: input.assetId,
      uploadId,
      partNumbers: wanted,
    });
    if (!signed.ok) return abandon(fetchImpl, input.assetId, uploadId, signed.message);

    for (const part of signed.data.parts) {
      if (input.signal?.aborted) return abandon(fetchImpl, input.assetId, uploadId);

      // Reported before the PUT so the screen can say which part is travelling;
      // progress is per part rather than per byte, which at 16 MiB a part is
      // smooth enough to watch and needs no XHR to achieve.
      report('uploading', part.partNumber, partCount, uploadedBytes);
      const sent = await sendPart(fetchImpl, input.file, part, {
        assetId: input.assetId,
        uploadId,
        partCount,
        retryDelayMs,
        sleep,
        onRetry: () => report('signing', part.partNumber, partCount, uploadedBytes),
      });
      if (!sent.ok) return abandon(fetchImpl, input.assetId, uploadId, sent.message);

      etags.push({ partNumber: part.partNumber, etag: sent.etag });
      uploadedBytes += part.end - part.start;
      report('uploading', part.partNumber, partCount, uploadedBytes);
    }
  }

  report('assembling', partCount, partCount, uploadedBytes);
  const completed = await callApi<{ etag: string; byteSize: number }>(fetchImpl, {
    action: 'complete_multipart',
    assetId: input.assetId,
    uploadId,
    // Resumed parts come first and new ones are appended as they land, so the list
    // is sorted here rather than assumed: the server refuses one that is out of
    // order, and it is right to.
    parts: [...etags].sort((a, b) => a.partNumber - b.partNumber),
  });
  // A refusal here is not an abandoned upload: the parts are all in storage and
  // the object may even exist. Deleting them would throw away the transfer to
  // spare a week of storage, and the teacher would have to start again.
  if (!completed.ok) return failure(completed.message, false);

  return {
    ok: true,
    value: {
      assetId: input.assetId,
      uploadId,
      etag: completed.data.etag,
      byteSize: completed.data.byteSize,
    },
  };
}

/**
 * PUT one part, retrying with a freshly signed URL.
 *
 * Re-signing on retry is not a flourish. The usual reasons a part fails are a
 * dropped connection and an expired URL, and the second is not fixed by sending
 * the same request again — it fails identically, three times, and the upload
 * reports a network problem that was really a clock.
 */
async function sendPart(
  fetchImpl: typeof fetch,
  file: Blob,
  part: SignedPartFromServer,
  options: {
    assetId: string;
    uploadId: string;
    partCount: number;
    retryDelayMs: number;
    sleep: (ms: number) => Promise<void>;
    onRetry: () => void;
  },
): Promise<{ ok: true; etag: string } | { ok: false; message: string }> {
  let current = part;

  for (let attempt = 1; attempt <= MAX_PART_ATTEMPTS; attempt += 1) {
    let response: Response | null = null;
    try {
      // The URL was signed without a content type, so the one fetch adds from the
      // slice is ignored by storage. That is a real difference from the single-PUT
      // path, where the content type is signed and has to be sent exactly.
      response = await fetchImpl(current.url, {
        method: current.method,
        body: file.slice(current.start, current.end),
      });
    } catch {
      // No response at all: the connection failed before storage answered.
      response = null;
    }

    if (response?.ok) {
      const etag = response.headers.get('etag');
      if (!etag) {
        // Every byte arrived and none of it can be used. Naming the header is the
        // difference between a five-minute deployment fix and an evening.
        return {
          ok: false,
          message:
            `Part ${String(current.partNumber)} uploaded but its ETag could not be read, so the ` +
            'file cannot be assembled. The storage bucket has to expose the ETag header to this ' +
            'site (Access-Control-Expose-Headers: ETag).',
        };
      }
      return { ok: true, etag };
    }

    if (attempt === MAX_PART_ATTEMPTS) {
      const status = response ? ` (storage answered ${String(response.status)})` : '';
      return {
        ok: false,
        message:
          `Part ${String(current.partNumber)} of ${String(options.partCount)} failed after ` +
          `${String(MAX_PART_ATTEMPTS)} attempts${status}. The upload was stopped and the parts ` +
          'already sent were deleted, so nothing is being stored for a file that is not there.',
      };
    }

    await options.sleep(options.retryDelayMs * attempt);
    options.onRetry();
    const resigned = await callApi<{ parts: SignedPartFromServer[] }>(fetchImpl, {
      action: 'sign_parts',
      assetId: options.assetId,
      uploadId: options.uploadId,
      partNumbers: [current.partNumber],
    });
    if (!resigned.ok) return { ok: false, message: resigned.message };
    const fresh = resigned.data.parts.find((candidate) => candidate.partNumber === current.partNumber);
    if (!fresh) return { ok: false, message: `The server did not sign part ${String(current.partNumber)} again.` };
    current = fresh;
  }

  return { ok: false, message: `Part ${String(part.partNumber)} was not uploaded.` };
}

/**
 * Give up: tell the server to delete the parts, then report.
 *
 * The abort is best effort and its own failure is not added to the message,
 * because the teacher's problem is the upload that failed, not the cleanup that
 * may or may not have run — and storage cleans up an incomplete upload after
 * seven days regardless.
 */
async function abandon(
  fetchImpl: typeof fetch,
  assetId: string,
  uploadId: string,
  message?: string,
): Promise<MultipartUploadOutcome> {
  await callApi(fetchImpl, { action: 'abort_multipart', assetId, uploadId });
  return failure(message ?? 'The upload was stopped.', true);
}
