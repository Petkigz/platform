'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  COURSEWORK_ACCEPT,
  COURSEWORK_MAX_BYTES,
  COURSEWORK_MAX_FILES,
  courseworkFileHref,
  confirmCourseworkFile,
  describeCourseworkFile,
  describeFileSize,
  parseCourseworkFiles,
  PHASE_LABEL,
  uploadCourseworkFile,
  validateCourseworkFile,
  type UploadPhase,
} from '@/lib/coursework';

/**
 * The files on one hand-in.
 *
 * A photograph of a page of handwriting is the most likely thing a learner has to
 * give a teacher who is not in the room, and until now there was nowhere to put
 * one: the assignment page said files would appear "once private upload is
 * connected", and the teacher's queue counted a number nobody could produce.
 *
 * The upload is three steps and each one is named while it happens, because
 * hashing then transferring a page on a phone connection takes long enough that a
 * silent button reads as a broken one.
 *
 * Nothing is removed after the work is submitted — `remove_assignment_asset()` is
 * draft-only by design, so a marked submission cannot have its evidence taken out
 * from under it — and the button says so rather than failing after a click.
 */
export function AssignmentFiles({
  submissionId,
  files: initialFiles,
  locked,
  ensureDraft,
}: {
  /** Empty until the learner has a draft; the first upload creates one. */
  submissionId: string;
  files: unknown;
  /** True once the work is submitted or the task is closed. */
  locked: boolean;
  /** Saves a draft and returns its id, so a file can be attached to something. */
  ensureDraft: () => Promise<string | null>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState(() => parseCourseworkFiles(initialFiles));
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { setFiles(parseCourseworkFiles(initialFiles)); }, [initialFiles]);
  const remaining = COURSEWORK_MAX_FILES - files.length;

  async function choose(chosen: File | null) {
    if (!chosen) return;
    setError('');
    setNotice('');

    // Refused before the checksum, with the reason and the size — a learner on
    // metered data should not learn the cap after sending the file.
    const check = validateCourseworkFile(
      { name: chosen.name, size: chosen.size, type: chosen.type },
      files.length,
    );
    if (!check.ok) {
      setError(check.message);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setBusy(true);
    try {
      const target = submissionId || (await ensureDraft());
      if (!target) {
        setError('The draft could not be saved, so the file was not sent.');
        return;
      }

      const outcome = await uploadCourseworkFile(chosen, {
        submissionId: target,
        onProgress: (next, value) => {
          setPhase(next);
          setPercent(value);
        },
      });

      if (!outcome.ok) {
        setError(outcome.message);
        router.refresh();
        return;
      }

      // Read back from the database rather than appended by hand: the server's
      // list is the one that will still be there after a refresh.
      const refreshed = await fetch(`/api/assignments?submission=${target}`)
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);
      const parsed = parseCourseworkFiles(
        (refreshed as { files?: unknown } | null)?.files ?? null,
      );
      if (parsed.length > 0) setFiles(parsed);
      setNotice(
        `File attached. ${describeFileSize(chosen.size)} — access remains subject to permissions and review.`,
      );
      router.refresh();
    } catch {
      setError('The upload response was lost. Refresh the file list before trying again; a file may have been registered or attached.');
      router.refresh();
    } finally {
      setBusy(false);
      setPhase(null);
      setPercent(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function retryConfirmation(assetId: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await confirmCourseworkFile(assetId);
      if (result.ok) setNotice('The file was checked and attached.');
      else setError(result.message);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function remove(assetId: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'remove_file', submissionId, mediaAssetId: assetId }),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? 'That file could not be removed.');
      }
      setFiles((previous) => previous.filter((file) => file.assetId !== assetId));
      setNotice('Removed. The file is no longer part of your hand-in.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That file could not be removed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '.5rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>Files</h3>
        <span className="muted" style={{ fontSize: '.85rem' }}>
          {files.length} of {COURSEWORK_MAX_FILES}
        </span>
      </div>

      {files.length > 0 && (
        <ul className="lessons">
          {files.map((file) => (
            <li key={file.assetId}>
              <span className="t">
                {file.attachmentId ? (
                  <a href={courseworkFileHref(file.assetId)} target="_blank" rel="noreferrer">
                    {file.name ?? 'Handed-in file'}
                  </a>
                ) : (
                  (file.name ?? 'Handed-in file')
                )}
                <span className="muted"> · {describeCourseworkFile(file)}</span>
              </span>
              {!locked && file.status === 'pending' && (
                <button type="button" className="btn ghost tiny" disabled={busy} onClick={() => void retryConfirmation(file.assetId)}>
                  Check upload again
                </button>
              )}
              {!locked && file.status === 'available' && (
                <button
                  type="button"
                  className="btn ghost tiny"
                  disabled={busy}
                  onClick={() => void remove(file.assetId)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!locked && (
        <div style={{ display: 'grid', gap: '.4rem' }}>
          <label htmlFor="assignment-file" className="muted" style={{ fontSize: '.85rem' }}>
            A photo of each page, a PDF, or a recording — up to{' '}
            {describeFileSize(COURSEWORK_MAX_BYTES)} each, {remaining} more allowed on this hand-in.
          </label>
          <p className="muted">If an upload is still arriving, the original uploader can check it again without sending it twice.</p>
          <input
            ref={inputRef}
            id="assignment-file"
            type="file"
            accept={COURSEWORK_ACCEPT}
            disabled={busy || remaining <= 0}
            onChange={(event) => void choose(event.target.files?.[0] ?? null)}
          />
          {busy && phase && (
            <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
              {PHASE_LABEL[phase]}
              {phase === 'hashing' || phase === 'uploading' ? ` ${String(percent)}%` : ''}
            </p>
          )}
        </div>
      )}

      {locked && files.length === 0 && (
        <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
          No files were handed in with this work.
        </p>
      )}

      {error && <p className="notice error" style={{ margin: 0 }}>{error}</p>}
      {notice && <p className="notice" style={{ margin: 0 }}>{notice}</p>}
    </div>
  );
}
