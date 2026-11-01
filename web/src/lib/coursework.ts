/**
 * Handing in a file, from the side that has the file.
 *
 * Three steps, and the order matters:
 *
 *   1. **Declare.** The database opens a `pending` row and records which draft
 *      the file is for, before a byte moves. That is what lets the uploader
 *      confirm their own file later without opening the staff-only door the
 *      media library depends on — a coursework file is not "any file its uploader
 *      may promote", it is *this* file, for *this* submission, declared first.
 *   2. **Send.** One presigned PUT straight to storage. Never through the server,
 *      so a 20 MB page of handwriting does not become a 20 MB request body.
 *   3. **Confirm.** The server HEADs the object, compares its size with what was
 *      declared, and only then calls the database. Confirming without looking is
 *      how a submission ends up pointing at a file that never arrived.
 *
 * WHAT IS CHECKED HERE, AND WHY IT IS ALSO CHECKED THERE
 * ------------------------------------------------------
 * The size cap, the type list and the ten-file limit all live in the database and
 * are enforced there. This file repeats them for one reason: a limit discovered
 * after a two-minute upload on a metered connection is a limit that was enforced
 * too late. The sentence the person sees comes from the same rule, so the two
 * cannot say different things.
 *
 * No `node:crypto` and no server imports: this runs in the tab, because the tab is
 * the only place the bytes are.
 */

import { sha256OfFile } from './browser-upload.ts';
import { readableByteSize } from './media.ts';

import type { DigestProgress } from './digest.ts';

/**
 * 25 MiB, matching `coursework_max_bytes()` in the database.
 *
 * A database test drives both this number and the staff-attach path to the same
 * boundary, so a change on one side without the other fails the suite rather than
 * quietly allowing on one screen what the other refuses.
 */
export const COURSEWORK_MAX_BYTES = 26_214_400;

/** Ten per submission, matching `coursework_max_files()`. */
export const COURSEWORK_MAX_FILES = 10;

/**
 * What may be handed in. Documents, images and audio — no video, because 25 MiB
 * is too small for a video to be anything but a disappointment, and a learner who
 * records a recitation should send the audio.
 */
export const COURSEWORK_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/aac',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/opus',
  'audio/wav',
  'audio/x-m4a',
  'audio/x-wav',
] as const;

/** The `accept` attribute for the file picker, so the dialog filters too. */
export const COURSEWORK_ACCEPT = COURSEWORK_MIME_TYPES.join(',');

export function courseworkMimeAllowed(mime: string): boolean {
  return (COURSEWORK_MIME_TYPES as readonly string[]).includes(mime.toLowerCase());
}

export type FileFacts = { name: string; size: number; type: string };
export type FileCheck = { ok: true } | { ok: false; message: string };

/**
 * Whether this file can be handed in at all.
 *
 * Checked before the checksum, because hashing is the expensive step and there is
 * nothing to gain by spending ten seconds on a file that will be refused.
 */
export function validateCourseworkFile(file: FileFacts, alreadyAttached = 0): FileCheck {
  if (!file.name.trim()) return { ok: false, message: 'That file has no name.' };
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, message: 'That file is empty, so there is nothing to hand in.' };
  }
  if (file.size > COURSEWORK_MAX_BYTES) {
    return {
      ok: false,
      message:
        `That file is ${readableByteSize(file.size)} and the cap is ` +
        `${readableByteSize(COURSEWORK_MAX_BYTES)}. A photo of each page, or a scan, is usually ` +
        'smaller than a photograph of the whole page with the room in it.',
    };
  }
  if (!courseworkMimeAllowed(file.type)) {
    return {
      ok: false,
      message:
        'That kind of file cannot be handed in. A PDF, a photo (JPEG, PNG or WebP) or an audio ' +
        'recording works.',
    };
  }
  if (alreadyAttached >= COURSEWORK_MAX_FILES) {
    return {
      ok: false,
      message: `An assignment takes ${COURSEWORK_MAX_FILES} files, and this one already has that many.`,
    };
  }
  return { ok: true };
}

/** "1.8 MB" — the size as a person reads it, never as a raw number. */
export function describeFileSize(bytes: number | string): string {
  const size = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!Number.isFinite(size) || size <= 0) return 'empty';
  return readableByteSize(size);
}

/** A file's kind, in words, for the sentence beside it. */
export function describeFileKind(mime: string): string {
  const type = mime.toLowerCase();
  if (type === 'application/pdf') return 'PDF';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  return 'file';
}

export type CourseworkFile = {
  /** Null while the file is still arriving. */
  attachmentId: string | null;
  assetId: string;
  name: string | null;
  mimeType: string;
  byteSize: string;
  status: string;
  uploadedAt: string;
  /**
   * The last review, present only for a caller who may review — the course author
   * and staff. The household's own list has no such key, because "concern" on a
   * child's own hand-in is a message with no context and no adult beside it.
   */
  review: 'none' | 'clear' | 'concern';
  reviewedAt: string | null;
};

/**
 * The list as `assignment_submission_files()` returns it, without trusting it.
 *
 * A row with no asset id cannot be opened, linked or removed, so it is dropped
 * rather than rendered as a broken entry.
 */
export function parseCourseworkFiles(value: unknown): CourseworkFile[] {
  if (!Array.isArray(value)) return [];
  const files: CourseworkFile[] = [];
  for (const entry of value) {
    const raw = (entry ?? {}) as Record<string, unknown>;
    const assetId = typeof raw.assetId === 'string' ? raw.assetId : '';
    if (!assetId) continue;
    files.push({
      attachmentId: typeof raw.attachmentId === 'string' ? raw.attachmentId : null,
      assetId,
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : null,
      mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : 'application/octet-stream',
      byteSize: typeof raw.byteSize === 'string' ? raw.byteSize : String(raw.byteSize ?? ''),
      status: typeof raw.status === 'string' ? raw.status : 'unknown',
      uploadedAt: typeof raw.uploadedAt === 'string' ? raw.uploadedAt : '',
      review:
        raw.review === 'clear' || raw.review === 'concern'
          ? raw.review
          : 'none',
      reviewedAt: typeof raw.reviewedAt === 'string' ? raw.reviewedAt : null,
    });
  }
  return files;
}

/** What one file's line says: it arrived, it is on its way, or it cannot be read. */
export function describeCourseworkFile(file: CourseworkFile): string {
  const size = describeFileSize(file.byteSize);
  const kind = describeFileKind(file.mimeType);
  if (file.status === 'pending') return `${kind} · ${size} · still arriving`;
  if (file.status === 'quarantined') return `${kind} · ${size} · held for review`;
  if (file.status !== 'available') return `${kind} · ${size} · ${file.status}`;
  return `${kind} · ${size}`;
}

export type UploadPhase =
  | 'hashing'
  | 'registering'
  | 'uploading'
  | 'confirming'
  | 'done';

export const PHASE_LABEL: Record<UploadPhase, string> = {
  hashing: 'Reading the file…',
  registering: 'Asking where to put it…',
  uploading: 'Sending…',
  confirming: 'Checking it arrived…',
  done: 'Handed in',
};

export type UploadOutcome =
  | { ok: true; assetId: string; attachmentId: string | null }
  | { ok: false; message: string };

export type UploadOptions = {
  submissionId: string;
  /** Zero to a hundred, for a bar that only moves forwards. */
  onProgress?: (phase: UploadPhase, percent: number) => void;
  /** Injectable, so the sequence can be checked without a bucket to talk to. */
  fetchImpl?: typeof fetch;
  /** Injectable for the same reason: no XMLHttpRequest in a test. */
  putImpl?: (
    url: string,
    headers: Record<string, string>,
    body: Blob,
    onPercent: (percent: number) => void,
  ) => Promise<void>;
};

const json = async (response: Response): Promise<Record<string, unknown>> =>
  ((await response.json().catch(() => ({}))) as Record<string, unknown>) ?? {};

/**
 * Send one file and attach it to the draft.
 *
 * A failure at any step leaves the row `pending` and says what to do about it.
 * Nothing here retries blindly: re-sending the same bytes would leave a second
 * pending row, and the database's own declaration is what decides what the file
 * is, not this page's memory of it.
 */
export async function uploadCourseworkFile(file: File, options: UploadOptions): Promise<UploadOutcome> {
  const doFetch = options.fetchImpl ?? fetch;
  const put = options.putImpl;
  const progress = options.onProgress ?? (() => {});

  const check = validateCourseworkFile({ name: file.name, size: file.size, type: file.type });
  if (!check.ok) return { ok: false, message: check.message };

  let checksum: string;
  try {
    progress('hashing', 0);
    checksum = await sha256OfFile(file, (p: DigestProgress) => {
      progress(
        'hashing',
        p.totalBytes > 0 ? Math.floor((p.hashedBytes / p.totalBytes) * 100) : 0,
      );
    });
  } catch {
    return {
      ok: false,
      message: 'The file could not be read. If it is on a removable drive, copy it first and try again.',
    };
  }

  progress('registering', 0);
  const registered = await doFetch('/api/media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'request_coursework_upload',
      submissionId: options.submissionId,
      displayName: file.name.slice(0, 200),
      mimeType: file.type,
      byteSize: file.size,
      checksum,
    }),
  });
  const registeredBody = await json(registered);
  const registeredData = (registeredBody.data ?? {}) as Record<string, unknown>;
  if (!registered.ok || registeredBody.ok !== true) {
    return {
      ok: false,
      message:
        typeof registeredBody.message === 'string'
          ? registeredBody.message
          : 'That file could not be started. Try again in a moment.',
    };
  }

  const assetId = typeof registeredData.assetId === 'string' ? registeredData.assetId : '';
  const uploadUrl = typeof registeredData.uploadUrl === 'string' ? registeredData.uploadUrl : '';
  const requiredHeaders = (registeredData.requiredHeaders ?? {}) as Record<string, string>;
  if (!assetId || !uploadUrl) {
    return { ok: false, message: 'The upload could not be started. Storage may not be configured.' };
  }

  progress('uploading', 0);
  try {
    if (put) await put(uploadUrl, requiredHeaders, file, (percent) => progress('uploading', percent));
    else {
      const { putWithProgress } = await import('./upload-progress.ts');
      await putWithProgress(uploadUrl, requiredHeaders, file, (percent) =>
        progress('uploading', percent),
      );
    }
  } catch (cause) {
    return {
      ok: false,
      message:
        cause instanceof Error
          ? cause.message
          : 'The file did not finish sending. It can be tried again.',
    };
  }

  progress('confirming', 0);
  const confirmed = await doFetch('/api/media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'confirm_coursework_upload', assetId }),
  });
  const confirmedBody = await json(confirmed);
  if (!confirmed.ok || confirmedBody.ok !== true) {
    return {
      ok: false,
      message:
        typeof confirmedBody.message === 'string'
          ? confirmedBody.message
          : 'The file was sent but could not be confirmed. Nothing was attached.',
    };
  }

  const confirmedData = (confirmedBody.data ?? {}) as Record<string, unknown>;
  progress('done', 100);
  return {
    ok: true,
    assetId,
    attachmentId: typeof confirmedData.attachmentId === 'string' ? confirmedData.attachmentId : null,
  };
}

/**
 * The address a file is opened at.
 *
 * Not a storage URL: `/api/media/open` re-decides permission on every request
 * against `may_watch_master()` — the household that sent it, the course author
 * marking it, and staff — and then redirects to a URL that expires in fifteen
 * minutes. A storage address in the page would be a bearer token sitting in the
 * history of every device that ever opened it, which is a worse thing to leave
 * behind for a child's homework than for a lesson recording.
 */
export function courseworkFileHref(assetId: string): string {
  return `/api/media/open?asset=${encodeURIComponent(assetId)}`;
}
