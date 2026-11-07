'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  COURSEWORK_ACCEPT,
  COURSEWORK_MAX_BYTES,
  COURSEWORK_MAX_FILES,
  courseworkFileHref,
  countAttachedCourseworkFiles,
  confirmCourseworkFile,
  describeCourseworkFile,
  describeFileSize,
  parseCourseworkFilesStrict,
  removeCourseworkFile,
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
  const [files, setFiles] = useState(() => parseCourseworkFilesStrict(initialFiles));
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { setFiles(parseCourseworkFilesStrict(initialFiles)); }, [initialFiles]);
  const attachedCount = files === null ? null : countAttachedCourseworkFiles(files);
  const pendingCount = files === null || attachedCount === null ? null : files.length - attachedCount;
  const remaining = attachedCount === null ? null : Math.max(0, COURSEWORK_MAX_FILES - attachedCount);

  async function choose(chosen: File | null) {
    if (!chosen) return;
    setError('');
    setNotice('');

    // Refused before the checksum, with the reason and the size — a learner on
    // metered data should not learn the cap after sending the file.
    const check = validateCourseworkFile(
      { name: chosen.name, size: chosen.size, type: chosen.type },
      attachedCount ?? 0,
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
        setError('The draft could not be confirmed, so this file was not sent. Check the current work before trying again.');
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
      const parsed = parseCourseworkFilesStrict(
        (refreshed as { files?: unknown } | null)?.files ?? null,
      );
      if (parsed !== null) setFiles(parsed);
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
      if (result.ok) setNotice('Storage reported the expected size and the file was attached. Its contents have not been scanned for malware.');
      else setError(result.message);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function remove(assetId: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await removeCourseworkFile(submissionId, assetId);
      if (result.ok) {
        setFiles((previous) => previous?.filter((file) => file.assetId !== assetId) ?? null);
        setNotice('Removed from this hand-in. The stored object is not deleted by this action.');
      } else {
        setError(result.message);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '.5rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>Files</h3>
        <span className="muted" style={{ fontSize: '.85rem' }}>
          {attachedCount === null ? 'File count unavailable' : `${attachedCount} attached shown${pendingCount ? ` · ${pendingCount} not attached` : ''}`}
        </span>
      </div>

      {files === null && <p className="notice warn">The file list could not be checked. Refresh before relying on it; do not assume there are no files.</p>}
      {files !== null && files.length > 0 && (
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
            {describeFileSize(COURSEWORK_MAX_BYTES)} each{remaining === null ? '. The current file count is unavailable.' : `, up to ${remaining} more; the server checks the limit.`}
          </label>
          <p className="muted">Pending files do not count as attached. The original uploader can check whether a pending file arrived without sending it twice. If it never arrived, the pending entry may need individual review.</p>
          <input
            ref={inputRef}
            id="assignment-file"
            type="file"
            accept={COURSEWORK_ACCEPT}
            disabled={busy || (remaining !== null && remaining <= 0)}
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

      {locked && files !== null && files.length === 0 && (
        <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
          No files were handed in with this work.
        </p>
      )}

      {error && <p className="notice error" style={{ margin: 0 }}>{error}</p>}
      {notice && <p className="notice" style={{ margin: 0 }}>{notice}</p>}
    </div>
  );
}
