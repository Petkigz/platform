'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  MAX_BROWSER_UPLOAD_BYTES,
  MULTIPART_THRESHOLD_BYTES,
  normalizeDisplayName,
  sha256OfFile,
  shouldUploadInParts,
  validateBrowserFile,
} from '@/lib/browser-upload';
import { readableByteSize } from '@/lib/media';
import { uploadInParts } from '@/lib/multipart-upload';

type Phase = 'idle' | 'reading' | 'hashing' | 'registering' | 'uploading' | 'done';

type ResumedPart = { partNumber: number; etag: string; size: number };

type ResumeUploadResponse = {
  ok?: boolean;
  message?: string;
  data?: {
    found: boolean;
    assetId: string;
    transport: 'single' | 'multipart';
    /** Multipart: the upload storage is holding, or null when none is. */
    uploadId?: string | null;
    partCount?: number;
    uploadedParts?: ResumedPart[];
    uploadedBytes?: number;
    /** Why an upload that was found is not being continued. */
    note?: string | null;
    /** Single: the URL to send the whole file to. */
    uploadUrl?: string;
    requiredHeaders?: Record<string, string>;
  };
};

/** Where the bytes are going: an existing record to continue, or a new one. */
type UploadTarget =
  | {
      assetId: string;
      transport: 'multipart';
      resume?: { uploadId: string; partCount: number; parts: ResumedPart[] };
    }
  | { assetId: string; transport: 'single'; uploadUrl: string; requiredHeaders: Record<string, string> };

type RequestUploadResponse = {
  ok?: boolean;
  message?: string;
  data?: {
    assetId: string;
    /** Absent when the file was registered for a multipart upload. */
    uploadUrl?: string;
    requiredHeaders?: Record<string, string>;
    expiresInSeconds?: number;
    transport?: 'single' | 'multipart';
  };
};

const PHASE_LABEL: Record<Phase, string> = {
  idle: '',
  reading: 'Reading the file…',
  hashing: 'Computing the checksum…',
  registering: 'Asking for somewhere to put it…',
  uploading: 'Uploading…',
  done: 'Uploaded',
};

/**
 * The teacher's end of the byte path D8 chose.
 *
 * The file goes from the browser straight to Cloudflare R2 on a presigned PUT,
 * so the bytes never pass through the web server. What the server does is decide
 * where they go — `register_media_upload()` derives the object key from the new
 * row's own id, so a caller cannot aim an upload at somebody else's object — and
 * sign a short-lived URL for exactly that key.
 *
 * The checksum is computed here, in the browser, because the database requires
 * one and nothing else can produce it: it is what proves the platform still holds
 * the exact original somebody uploaded, and what lets a rights request be matched
 * to every copy. It is hashed a slice at a time by `lib/digest.ts`, so a
 * multi-gigabyte recording costs one chunk of memory rather than the whole file —
 * which is what lifted this form's ceiling from 512 MiB.
 *
 * Above 32 MiB the transfer itself changes shape. One presigned PUT is capped by
 * storage at 5 GiB less 5 MiB and cannot be resumed, so a big recording now goes
 * up in parts (`lib/multipart-upload.ts`): a part that fails is retried on its
 * own, and the ceiling is the database's 8 GiB rather than the transport's. The
 * parts still travel straight to storage; what the server keeps is the opening,
 * the assembling and the abandoning of the upload.
 *
 * Hashing at that size takes about a minute, so it reports progress like the
 * upload does. A teacher watching a button that says only "Computing the
 * checksum…" for sixty seconds closes the tab.
 *
 * Uploading does not publish anything. The row is `pending` until a staff member
 * verifies the object arrived, and a `pending` file cannot be attached to a
 * lesson. Letting an uploader confirm their own file is the hole
 * `confirm_media_upload()` was written to close.
 */
export function UploadMedia() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'muted' | 'error' | 'ok'>('muted');
  /** Which part is travelling, on a file big enough to be sent in pieces. */
  const [partLabel, setPartLabel] = useState('');
  /** What the server found before the transfer started, worth saying out loud. */
  const [notice, setNotice] = useState('');

  const busy = phase !== 'idle' && phase !== 'done';
  /** The two phases that can take a minute on a large file, and so get a bar. */
  const counted = phase === 'hashing' || phase === 'uploading';

  function choose(next: File | null) {
    setMessage('');
    setNotice('');
    setPercent(0);
    setPhase('idle');

    if (!next) {
      setFile(null);
      setName('');
      return;
    }

    const check = validateBrowserFile({ name: next.name, size: next.size, type: next.type });
    if (!check.ok) {
      setFile(null);
      setName('');
      setMessage(check.message);
      setTone('error');
      return;
    }

    setFile(next);
    setName(normalizeDisplayName(next.name, next.type));
    setTone('muted');
    setMessage(
      `${readableByteSize(next.size)} · ${next.type}. Uploading does not publish it: a staff ` +
        'member verifies the file before it can be attached to a lesson.',
    );
  }

  /**
   * Reads the duration out of the file itself, best effort. A wrong duration is
   * worse than no duration, so anything that does not produce a positive finite
   * number is dropped rather than guessed.
   */
  function readDurationSeconds(next: File): Promise<number | null> {
    if (!/^(video|audio)\//.test(next.type)) return Promise.resolve(null);
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(next);
      const element = document.createElement('video');
      const finish = (value: number | null) => {
        URL.revokeObjectURL(objectUrl);
        resolve(value);
      };
      element.onloadedmetadata = () => {
        const seconds = element.duration;
        finish(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null);
      };
      element.onerror = () => finish(null);
      element.preload = 'metadata';
      element.src = objectUrl;
    });
  }

  async function upload() {
    if (!file) return;
    // Held in a const because the two helpers below are closures, and a narrowing
    // that applies to this block does not travel into one.
    const chosen: File = file;
    setMessage('');
    setNotice('');
    setPercent(0);

    try {
      setPhase('reading');
      const durationSeconds = await readDurationSeconds(file);

      setPhase('hashing');
      setPercent(0);
      const checksum = await sha256OfFile(file, (progress) => {
        setPercent(Math.floor((progress.hashedBytes / progress.totalBytes) * 100));
      });

      setPhase('registering');
      const inParts = shouldUploadInParts(file.size);

      /**
       * The unfinished upload of this very file, if there is one.
       *
       * Found by checksum and size, which are the only two facts about a file that
       * survive a closed tab. Continuing it is what stops a second attempt from
       * leaving a duplicate `pending` file in the library and the first attempt's
       * parts in the bucket, and the parts are read back from storage rather than
       * remembered, so nothing here has to trust this page's account of what it
       * sent.
       */
      async function findUnfinished(digest: string, size: number): Promise<UploadTarget | null> {
        const response = await fetch('/api/media', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'resume_upload', checksum: digest, byteSize: size }),
        });
        const result = (await response.json().catch(() => null)) as ResumeUploadResponse | null;
        // A lookup that fails is not worth failing an upload over: the cost is a
        // second pending row, which is what every attempt used to leave behind.
        if (!response.ok || !result?.ok || !result.data?.found) return null;

        const data = result.data;
        if (data.transport !== 'multipart') {
          if (!data.uploadUrl) return null;
          setNotice('This file was already registered, so the same record is being used.');
          return {
            assetId: data.assetId,
            transport: 'single',
            uploadUrl: data.uploadUrl,
            requiredHeaders: data.requiredHeaders ?? {},
          };
        }

        const parts = data.uploadedParts ?? [];
        const partCount = data.partCount ?? 0;
        if (!data.uploadId || !Number.isInteger(partCount) || partCount < 1) {
          // Either nothing is in flight, or what is in flight does not fit the plan
          // this deployment makes. Either way the record is reused and the
          // transfer starts again — and the reason is said rather than hidden.
          setNotice(data.note ?? 'This file was already registered, so the same record is being used.');
          return { assetId: data.assetId, transport: 'multipart' };
        }

        setNotice(
          `An upload of this file stopped part-way: ${String(parts.length)} of ${String(partCount)} ` +
            `parts — ${readableByteSize(data.uploadedBytes ?? 0)} — are already in storage, so ` +
            'this continues from there.',
        );
        return { assetId: data.assetId, transport: 'multipart', resume: { uploadId: data.uploadId, partCount, parts } };
      }

      /** A new record for the file, and a URL to send it to if it goes in one piece. */
      async function openNew(): Promise<UploadTarget> {
        const response = await fetch('/api/media', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'request_upload',
            displayName: name.trim(),
            mimeType: chosen.type,
            byteSize: chosen.size,
            checksum,
            durationSeconds,
            // Told to the server so it does not sign a single-PUT URL this browser
            // is never going to use: an unused presigned PUT is still a live
            // credential for an hour.
            transport: inParts ? 'multipart' : 'single',
          }),
        });
        const result = (await response.json().catch(() => ({}))) as RequestUploadResponse;
        if (!response.ok || !result.data) {
          throw new Error(
            result.message ?? 'The upload could not be started. Storage may not be configured.',
          );
        }
        if (inParts) return { assetId: result.data.assetId, transport: 'multipart' };
        const uploadUrl = result.data.uploadUrl;
        if (!uploadUrl) throw new Error('The server did not sign an upload URL. Try again.');
        return {
          assetId: result.data.assetId,
          transport: 'single',
          uploadUrl,
          requiredHeaders: result.data.requiredHeaders ?? {},
        };
      }

      const target = (await findUnfinished(checksum, file.size)) ?? (await openNew());

      setPhase('uploading');
      if (target.transport === 'multipart') {
        const outcome = await uploadInParts({
          file,
          assetId: target.assetId,
          resume: target.resume,
          onProgress: (progress) => {
            setPercent(
              progress.totalBytes > 0
                ? Math.floor((progress.uploadedBytes / progress.totalBytes) * 100)
                : 0,
            );
            setPartLabel(
              progress.partCount > 0
                ? progress.phase === 'assembling'
                  ? 'Putting the parts together…'
                  : progress.phase === 'resuming'
                    ? 'Picking up where it stopped…'
                    : `Part ${String(progress.partNumber)} of ${String(progress.partCount)}`
                : '',
            );
          },
        });
        // The message came from the server or from storage and was written for a
        // teacher, so it is shown as it is rather than summarised.
        if (!outcome.ok) throw new Error(outcome.message);
      } else {
        await putWithProgress(target.uploadUrl, target.requiredHeaders, file, setPercent);
      }

      setPhase('done');
      setPartLabel('');
      setNotice('');
      setTone('ok');
      setMessage(
        'Uploaded. It is waiting for verification, and can be attached to a lesson once a ' +
          'staff member has confirmed the file arrived.',
      );
      setFile(null);
      setName('');
      setPercent(0);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch (cause) {
      setPhase('idle');
      setPartLabel('');
      setNotice('');
      setTone('error');
      setMessage(cause instanceof Error ? cause.message : 'The upload did not complete.');
    }
  }

  return (
    <section className="card">
      <h2>Upload a file</h2>
      <p className="muted">
        Video, audio or a document, up to {readableByteSize(MAX_BROWSER_UPLOAD_BYTES)}. The file
        travels straight to storage; the checksum is worked out in your browser first, which is
        what lets a rights request be matched to every copy later. On a large recording the
        checksum takes about a minute before the transfer starts, and it says how far along it is.
        Anything over {readableByteSize(MULTIPART_THRESHOLD_BYTES)} is sent in parts, so a
        connection that drops costs one part rather than the whole file — and if you
        close the tab and choose the same file again, the parts already sent are
        found in storage and the upload continues from there.
      </p>

      <div style={{ display: 'grid', gap: '0.6rem' }}>
        <input
          ref={inputRef}
          type="file"
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
          disabled={busy}
        />

        {file && (
          <label style={{ display: 'grid', gap: '0.3rem' }}>
            <span className="muted">What you will call it in your library</span>
            <input
              type="text"
              value={name}
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
            />
          </label>
        )}

        {file && (
          <div>
            <button type="button" onClick={() => void upload()} disabled={busy}>
              {busy ? PHASE_LABEL[phase] : 'Upload'}
            </button>
            {counted && (
              <span className="muted" style={{ marginLeft: '0.6rem' }}>
                {String(percent)}%{partLabel ? ` · ${partLabel}` : ''}
              </span>
            )}
          </div>
        )}

        {counted && (
          <progress
            value={percent}
            max={100}
            style={{ width: '100%' }}
            aria-label={phase === 'hashing' ? 'Checksum progress' : 'Upload progress'}
          />
        )}

        {notice && <p className="muted">{notice}</p>}

        {message && <p className={tone === 'error' ? 'error' : 'muted'}>{message}</p>}
      </div>
    </section>
  );
}

/**
 * A presigned PUT with progress.
 *
 * `fetch` cannot report upload progress, and a teacher on a slow connection
 * watching a 400 MB lesson recording go up with no feedback would reasonably
 * assume it had stalled and close the tab. XMLHttpRequest can, so this is the one
 * place it is worth the older API.
 */
function putWithProgress(
  url: string,
  headers: Record<string, string>,
  body: Blob,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    for (const [header, value] of Object.entries(headers)) {
      request.setRequestHeader(header, value);
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else
        reject(
          new Error(
            `Storage refused the upload (HTTP ${String(request.status)}). The row is still pending ` +
              'and nothing was published.',
          ),
        );
    };
    request.onerror = () =>
      reject(new Error('The upload could not reach storage. Check the connection and try again.'));
    request.ontimeout = () => reject(new Error('The upload timed out.'));
    request.send(body);
  });
}
