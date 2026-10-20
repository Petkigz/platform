'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  MAX_BROWSER_UPLOAD_BYTES,
  normalizeDisplayName,
  sha256OfFile,
  validateBrowserFile,
} from '@/lib/browser-upload';
import { readableByteSize } from '@/lib/media';

type Phase = 'idle' | 'reading' | 'hashing' | 'registering' | 'uploading' | 'done';

type RequestUploadResponse = {
  ok?: boolean;
  message?: string;
  data?: {
    assetId: string;
    uploadUrl: string;
    requiredHeaders: Record<string, string>;
    expiresInSeconds: number;
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
 * to every copy. That requirement is also why the browser ceiling is lower than
 * the database's — WebCrypto has no streaming digest, so the whole file has to
 * fit in memory to be hashed.
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

  const busy = phase !== 'idle' && phase !== 'done';

  function choose(next: File | null) {
    setMessage('');
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
    setMessage('');
    setPercent(0);

    try {
      setPhase('reading');
      const durationSeconds = await readDurationSeconds(file);

      setPhase('hashing');
      const checksum = await sha256OfFile(file);

      setPhase('registering');
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'request_upload',
          displayName: name.trim(),
          mimeType: file.type,
          byteSize: file.size,
          checksum,
          durationSeconds,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as RequestUploadResponse;
      if (!response.ok || !result.data) {
        throw new Error(
          result.message ?? 'The upload could not be started. Storage may not be configured.',
        );
      }

      setPhase('uploading');
      await putWithProgress(result.data.uploadUrl, result.data.requiredHeaders, file, setPercent);

      setPhase('done');
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
        what lets a rights request be matched to every copy later.
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
            {phase === 'uploading' && (
              <span className="muted" style={{ marginLeft: '0.6rem' }}>
                {String(percent)}%
              </span>
            )}
          </div>
        )}

        {phase === 'uploading' && (
          <progress value={percent} max={100} style={{ width: '100%' }} aria-label="Upload progress" />
        )}

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
