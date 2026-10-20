/**
 * The half of uploading that only a browser can do.
 *
 * WHY THERE IS A SECOND, LOWER CEILING
 * ------------------------------------
 * `register_media_upload()` requires a SHA-256 digest of the file, and that is
 * the right requirement: the digest is what proves the platform still holds the
 * exact original somebody uploaded, and what lets a takedown request be matched
 * to every copy. But WebCrypto has no streaming digest — `crypto.subtle.digest`
 * takes a whole buffer — so hashing in a browser means holding the entire file
 * in memory at once. An 8 GiB lesson recording, which the database would accept,
 * would crash the tab before it ever reached the network.
 *
 * So the browser path is capped well below the database's ceiling, and the
 * difference is stated to the teacher rather than discovered by them. Lifting it
 * needs either a chunked SHA-256 in the browser or an uploader that runs
 * somewhere with a filesystem; neither exists yet, and neither is implied by
 * anything here.
 */

import { readableByteSize } from './media.ts';

/** 512 MiB: large enough for a real lesson, small enough to hash in a tab. */
export const MAX_BROWSER_UPLOAD_BYTES = 512 * 1024 * 1024;

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
        `That file is ${readableByteSize(file.size)}, and a browser can only upload up to ` +
        `${readableByteSize(MAX_BROWSER_UPLOAD_BYTES)}. The limit is the checksum: a browser has to ` +
        'hold the whole file in memory to digest it. Split the recording, or wait for the desktop uploader.',
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
 * `file.arrayBuffer()` is the part that costs: the whole file lands in memory,
 * which is why `MAX_BROWSER_UPLOAD_BYTES` is what it is.
 */
export async function sha256OfFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      'This browser cannot compute a checksum, so the file cannot be uploaded. ' +
        'A secure context (HTTPS) is required.',
    );
  }
  const digest = await subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
