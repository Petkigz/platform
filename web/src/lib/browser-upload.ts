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
 * time, so memory is bounded by the chunk and not by the file.
 *
 * The transport ceiling moved too, and that is the newer change. One presigned
 * PUT is capped by storage at 5 GiB less 5 MiB and cannot be resumed, so a
 * failure at 90% of a 4 GiB recording started again from zero, and a file above
 * the cap could not be sent at all even though the database would have taken it.
 * Above `MULTIPART_THRESHOLD_BYTES` the browser now uploads in parts
 * (`lib/multipart-upload.ts`), which storage assembles into one object and which
 * retries a failed part instead of the whole file. What binds here is therefore
 * the database's own ceiling, `MAX_UPLOAD_BYTES`, and the two now agree.
 *
 * One consequence of the single-PUT path still applies below the threshold and is
 * worth saying out loud: a presigned PUT is signed for at most an hour
 * (`MAX_UPLOAD_SECONDS`). Under 32 MiB that is generous. It is also why the
 * multipart path signs part URLs for fifteen minutes at a time and renews them as
 * the upload goes, rather than asking for one long-lived URL to cover a
 * multi-hour transfer — a longer window is a standing bearer credential.
 */

import { sha256OfBlob, type DigestProgress } from './digest.ts';
import { MAX_UPLOAD_BYTES, readableByteSize } from './media.ts';

/**
 * The largest file a browser may send: the database's ceiling, 8 GiB.
 *
 * This used to be storage's single-request limit (5 GiB less 5 MiB) because that
 * was the smaller of the two and the gap could only be stated, not closed. With
 * parts, the transport is no longer the binding number, so the browser and the
 * row now refuse the same file for the same reason.
 */
export const MAX_BROWSER_UPLOAD_BYTES = MAX_UPLOAD_BYTES;

/**
 * Above this, upload in parts.
 *
 * Storage suggests a single request under roughly 100 MB. The number here is
 * lower — 32 MiB, two parts — because what parts buy is not throughput but that
 * a failed part is retried on its own, and a 40 MiB recording on a phone
 * connection is already long enough for a restart to cost something. Below it,
 * one PUT is one request, with no XML and nothing to assemble.
 */
export const MULTIPART_THRESHOLD_BYTES = 32 * 1024 * 1024;

export function shouldUploadInParts(byteSize: number): boolean {
  return Number.isFinite(byteSize) && byteSize > MULTIPART_THRESHOLD_BYTES;
}

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
        `That file is ${readableByteSize(file.size)}. The most one lesson may be is ` +
        `${readableByteSize(MAX_BROWSER_UPLOAD_BYTES)}, which is a limit on the record and not on ` +
        'the network — a larger file cannot be described to the database at all. Split the ' +
        'recording into two lessons.',
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
