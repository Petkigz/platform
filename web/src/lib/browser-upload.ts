/**
 * The half of uploading that only a browser can do.
 *
 * WHERE THE CEILING IS NOW, AND WHAT MOVED IT
 * -------------------------------------------
 * This used to stop at 512 MiB while the database accepted 8 GiB, because
 * `register_media_upload()` requires a SHA-256 digest of the file and WebCrypto
 * has no streaming one: `crypto.subtle.digest` takes a whole `ArrayBuffer`, so
 * hashing meant holding the entire file in memory and a large recording crashed
 * the tab before it reached the network.
 *
 * `lib/digest.ts` removed that ceiling — the same algorithm fed a slice at a
 * time, so memory is bounded by the chunk and not by the file. What binds now is
 * the transport, and it is not ours to raise: the upload is one presigned PUT,
 * and storage refuses a single request above 5 GiB less 5 MiB. Past that a
 * multipart upload is required, which is resumable and parallel and is the next
 * thing to build; until it exists the gap between this ceiling and the
 * database's 8 GiB is stated to the teacher rather than discovered by them.
 *
 * Two consequences of staying on one request are worth saying out loud. A single
 * PUT cannot be resumed, so a failure at 90% of a 4 GiB recording starts again
 * from zero. And the presigned URL is signed for at most an hour
 * (`MAX_UPLOAD_SECONDS`), which at this ceiling means a sustained 1.5 MiB/s or
 * the URL expires mid-transfer — a reason to keep the multipart work near the
 * top of the list rather than a reason to lower the number here.
 */

import { sha256OfBlob, type DigestProgress } from './digest.ts';
import { readableByteSize } from './media.ts';

/**
 * The largest file one presigned PUT can carry: storage's single-request limit,
 * 5 GiB less 5 MiB. Not a number chosen here, so not a number to negotiate.
 */
export const MAX_BROWSER_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024 - 5 * 1024 * 1024;

/** The column allows 200 characters; the form should not let a teacher hit it. */
export const MAX_DISPLAY_NAME_LENGTH = 200;

export type BrowserFileFacts = {
  name: string;
  size: number;
  type: string;
};

export type BrowserFileCheck = { ok: true } | { ok: false; message: string };

/**
 * Whether this file can be uploaded from a browser at all.
 *
 * Checked before any hashing, because hashing is the expensive step and there is
 * no point spending thirty seconds on a file that will be refused.
 */
export function validateBrowserFile(file: BrowserFileFacts): BrowserFileCheck {
  if (!file.name.trim()) return { ok: false, message: 'That file has no name.' };

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, message: 'That file is empty.' };
  }

  if (file.size > MAX_BROWSER_UPLOAD_BYTES) {
    return {
      ok: false,
      message:
        `That file is ${readableByteSize(file.size)}. One request to storage carries at most ` +
        '5 GiB less 5 MiB, and an upload that fails part-way cannot be resumed, so there is no ' +
        'point starting one that cannot finish. Split the recording into parts.',
    };
  }

  if (!file.type.trim()) {
    return {
      ok: false,
      message: 'That file has no type, so nothing would know how to play it back.',
    };
  }

  return { ok: true };
}

/**
 * A name a teacher will recognise in a list of their own uploads.
 *
 * The browser hands over whatever the file was called on somebody's desktop,
 * which is usually a useful name with an extension on the end and sometimes a
 * trail of `(final) (2)`. The extension goes, because the list already says what
 * kind of file each row is, and everything else is kept — including a name in
 * Arabic, which is the common case here and the reason nothing transliterates.
 */
export function normalizeDisplayName(rawName: string, mimeType: string): string {
  const withoutExtension = rawName
    .trim()
    .replace(/\.[a-z0-9]{1,5}$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .trim();

  const capped = withoutExtension.slice(0, MAX_DISPLAY_NAME_LENGTH).trim();
  return capped || fallbackName(mimeType);
}

export function fallbackName(mimeType: string): string {
  const type = mimeType.trim().toLowerCase();
  if (type.startsWith('video/')) return 'Video recording';
  if (type.startsWith('audio/')) return 'Audio recording';
  if (type === 'application/pdf') return 'PDF document';
  if (type.startsWith('image/')) return 'Image';
  return 'Uploaded file';
}

/**
 * The SHA-256 digest the database requires, as 64 lowercase hex characters.
 *
 * Read a slice at a time by `lib/digest.ts`, so the cost in memory is one chunk
 * whatever the size of the file, and the cost in time is reported rather than
 * endured: hashing a multi-gigabyte recording takes about a minute, and a
 * teacher watching a frozen button cannot tell that from a hung tab.
 *
 * No WebCrypto here any more. It would be faster on a small file and it cannot
 * be fed incrementally, so using it below some threshold would mean two digest
 * implementations — and the one exercised least would be the large-file path,
 * which is where a wrong digest does the most damage and makes the least noise.
 */
export async function sha256OfFile(
  file: Blob,
  onProgress?: (progress: DigestProgress) => void,
): Promise<string> {
  return sha256OfBlob(file, { onProgress });
}
