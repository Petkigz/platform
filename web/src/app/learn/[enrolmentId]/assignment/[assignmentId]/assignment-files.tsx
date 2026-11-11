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
  parseCourseworkFilePage,
  parseFirstCourseworkFilePage,
  appendCourseworkFilePage,
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
  const retryInputRef = useRef<HTMLInputElement | null>(null);
  const retryAssetRef = useRef<string | null>(null);
  const [filePage, setFilePage] = useState(() => parseFirstCourseworkFilePage(initialFiles));
  const files = filePage?.files ?? null;
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { setFilePage(parseFirstCourseworkFilePage(initialFiles)); }, [initialFiles]);
  const attachedCount = filePage?.attachedCount ?? null;
  const pendingCount = filePage?.pendingCount ?? null;
  const remaining = attachedCount === null ? null : Math.max(0, COURSEWORK_MAX_FILES - attachedCount);

  async function fetchPage(target: string, after: string | null = null) {
    const query = new URLSearchParams({submission: target, page: '1'});
    if (after) query.set('after', after);
    const response = await fetch(`/api/assignments?${query}`, {cache:'no-store'}).catch(() => null);
    if (!response?.ok) return null;
    const body = await response.json().catch(() => null) as {ok?: unknown; page?: unknown} | null;
    return body?.ok === true ? (after ? parseCourseworkFilePage(body.page) : parseFirstCourseworkFilePage(body.page)) : null;
  }

  async function loadMore() {
    if (!filePage?.nextCursor || !submissionId) return;
    setBusy(true); setError('');
    try {
      const next=await fetchPage(submissionId,filePage.nextCursor);
      const combined=next && appendCourseworkFilePage(filePage,next);
      if (!combined) setError('The file list changed or could not be checked. Refresh it before relying on it.');
      else setFilePage(combined);
    } finally { setBusy(false); }
  }

  async function choose(chosen: File | null, retryAssetId?: string) {
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
      if (retryInputRef.current) retryInputRef.current.value = '';
      return;
    }

    setBusy(true);
    try {
      const target = submissionId || (retryAssetId ? null : await ensureDraft());
      if (!target) {
        setError('The draft could not be confirmed, so this file was not sent. Check the current work before trying again.');
        return;
      }

      const outcome = await uploadCourseworkFile(chosen, {
        submissionId: target,
        retryAssetId,
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
      const refreshed = await fetchPage(target);
      setFilePage(refreshed);
      if (!refreshed) setError('The file was attached, but the list could not be checked. Refresh before relying on it.');
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
      if (retryInputRef.current) retryInputRef.current.value = '';
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
        const refreshed = await fetchPage(submissionId);
        setFilePage(refreshed);
        setNotice('Removed from this hand-in. The stored object is not deleted by this action.');
        if (!refreshed) setError('The removal was acknowledged, but the file list could not be checked. Refresh before relying on it.');
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
          {attachedCount === null ? 'File count unavailable' : `${attachedCount} attached${pendingCount ? ` · ${pendingCount} not attached` : ''}`}
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
                <div className="row">
                  <button type="button" className="btn ghost tiny" disabled={busy} onClick={() => void retryConfirmation(file.assetId)}>
                    Check upload again
                  </button>
                  <button type="button" className="btn ghost tiny" disabled={busy} onClick={() => { retryAssetRef.current = file.assetId; retryInputRef.current?.click(); }}>
                    Resend same file
                  </button>
                </div>
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

      {filePage?.nextCursor && <div>
        <p className="muted">Showing {filePage.files.length} of {filePage.attachedCount + filePage.pendingCount}. The list can change between pages; refresh to check again.</p>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => void loadMore()}>Show more files</button>
      </div>}

      {!locked && (
        <div style={{ display: 'grid', gap: '.4rem' }}>
          <label htmlFor="assignment-file" className="muted" style={{ fontSize: '.85rem' }}>
            A photo of each page, a PDF, or a recording — up to{' '}
            {describeFileSize(COURSEWORK_MAX_BYTES)} each{remaining === null ? '. The current file count is unavailable.' : `, up to ${remaining} more; the server checks the limit.`}
          </label>
          <p className="muted">Pending files do not count as attached. The original uploader can check whether a pending file arrived. If it did not, they can select the same file to resend it to the existing entry. Check first and avoid resending while the original transfer is still running.</p>
          <input ref={retryInputRef} type="file" accept={COURSEWORK_ACCEPT} hidden aria-label="Select the same file to resend" disabled={busy}
            onChange={(event) => { const id = retryAssetRef.current; retryAssetRef.current = null; if (id) void choose(event.target.files?.[0] ?? null, id); }} />
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

      {locked && files !== null && files.length === 0 && !filePage?.nextCursor && (
        <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
          No files were handed in with this work.
        </p>
      )}

      {error && <p className="notice error" style={{ margin: 0 }}>{error}</p>}
      {notice && <p className="notice" style={{ margin: 0 }}>{notice}</p>}
    </div>
  );
}
