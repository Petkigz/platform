'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  type AssignmentRevision,
  type AssignmentSubmission,
  revisionsRemaining,
} from '@/lib/course-assignments';

export function AssignmentWork({
  assignmentId,
  learnerProfileId,
  assignmentStatus,
  pointsPossible,
  acceptLate,
  deadline,
  initialSubmission,
  fileCount,
  revisionsAllowed,
  revisionLimit,
  history,
}: {
  assignmentId: string;
  learnerProfileId: string;
  assignmentStatus: string;
  pointsPossible: number | null;
  acceptLate: boolean;
  deadline: string | null;
  initialSubmission: AssignmentSubmission | null;
  fileCount: number;
  revisionsAllowed: boolean;
  revisionLimit: number | null;
  history: AssignmentRevision[];
}) {
  const router = useRouter();
  const [submissionId, setSubmissionId] = useState(initialSubmission?.id ?? '');
  const [status, setStatus] = useState<AssignmentSubmission['status'] | null>(initialSubmission?.status ?? null);
  const [bodyText, setBodyText] = useState(initialSubmission?.bodyText ?? '');
  const [revisionNumber, setRevisionNumber] = useState(initialSubmission?.revisionNumber ?? 1);
  // The mark on screen, cleared the moment the work is reopened. Kept in state
  // rather than read from the prop so a revision does not keep showing a score
  // that no longer exists.
  const [mark, setMark] = useState<{ scoreEarned: number | null; feedback: string | null } | null>(
    initialSubmission?.status === 'graded'
      ? { scoreEarned: initialSubmission.scoreEarned, feedback: initialSubmission.feedback }
      : null,
  );
  const [versions, setVersions] = useState<AssignmentRevision[]>(history);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // The server owns this list; take its version whenever the page refreshes.
  useEffect(() => { setVersions(history); }, [history]);

  const due = deadline ? new Date(deadline) : null;
  const pastDue = due !== null && due.getTime() < Date.now();
  const locked = status === 'submitted' || status === 'graded' || assignmentStatus !== 'open';
  const revision = revisionsRemaining(
    { revisionsAllowed, revisionLimit },
    { revisionNumber, status: status ?? 'draft' },
  );
  // Revising gives up a mark, so the button has to be honest about why it is
  // unavailable rather than letting the database refuse after a click.
  const revisionBlocked = assignmentStatus !== 'open'
    ? 'This assignment is closed.'
    : pastDue && !acceptLate
      ? 'The deadline has passed, so this mark stands.'
      : !revisionsAllowed
        ? 'This work is marked once; the teacher has not allowed revisions.'
        : revision.remaining === 0
          ? `This task allows ${revisionLimit} version${revisionLimit === 1 ? '' : 's'} and this was the last one.`
          : '';

  async function post(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({})) as {
        ok?: boolean; id?: string | null; revisionNumber?: number; message?: string;
      };
      if (!response.ok || !result.ok) throw new Error(result.message ?? 'That could not be saved.');
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That could not be saved.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    const result = await post({
      action: 'save_draft',
      assignmentId,
      learnerProfileId,
      bodyText,
    });
    if (!result?.id) return null;
    setSubmissionId(result.id);
    setStatus('draft');
    setMessage('Draft saved privately.');
    router.refresh();
    return result.id;
  }

  async function submit() {
    // Save the latest text first so a learner cannot submit an older version by
    // clicking quickly after editing.
    const id = await saveDraft();
    if (!id) return;
    const result = await post({ action: 'submit', submissionId: id });
    if (!result) return;
    setStatus('submitted');
    setMessage(
      revisionNumber > 1
        ? `Version ${revisionNumber} submitted. Your work is with the course author for marking.`
        : 'Submitted. Your work is now with the course author for marking.',
    );
    router.refresh();
  }

  async function revise() {
    if (!submissionId) return;
    const current = mark;
    const result = await post({ action: 'reopen', submissionId });
    if (!result?.revisionNumber) return;
    // Show the version that was just recorded straight away; the refresh below
    // replaces it with the server's copy.
    if (current) {
      setVersions((previous) => [...previous, {
        id: `pending-${result.revisionNumber}`,
        submissionId,
        revisionNumber: result.revisionNumber! - 1,
        bodyText,
        assetIds: [],
        scoreEarned: current.scoreEarned,
        feedback: current.feedback,
        submittedAt: null,
        isLate: null,
        markedAt: null,
        reopenedAt: new Date().toISOString(),
      }]);
    }
    setRevisionNumber(result.revisionNumber);
    setMark(null);
    setStatus('draft');
    setMessage(
      `Your marked version is saved below. Edit your work and submit it again as version ${result.revisionNumber}.`,
    );
    router.refresh();
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '.75rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0 }}>Your work</h2>
        {revisionNumber > 1 && <span className="badge neutral">Version {revisionNumber}</span>}
      </div>

      {due && (
        <p className="muted" style={{ margin: 0 }}>
          Due {due.toLocaleString()}
          {pastDue && acceptLate ? ' · late work is accepted' : ''}
        </p>
      )}
      {pastDue && !acceptLate && status !== 'submitted' && status !== 'graded' && (
        <div className="notice warn">The deadline has passed and late work is not accepted.</div>
      )}

      {status === 'graded' && bodyText && (
        <div className="card" style={{ background: 'var(--surface, #f8faf8)' }}>
          <h3 style={{ marginTop: 0 }}>Your submitted response</h3>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{bodyText}</div>
        </div>
      )}

      {status === 'graded' && mark && (
        <div className="notice">
          <strong>Marked</strong>
          {mark.scoreEarned !== null && (
            <p style={{ margin: '.25rem 0 0' }}>
              Score: {mark.scoreEarned}
              {pointsPossible ? ` / ${pointsPossible}` : ''}
            </p>
          )}
          {mark.feedback && (
            <p style={{ margin: '.5rem 0 0', whiteSpace: 'pre-wrap' }}>{mark.feedback}</p>
          )}
        </div>
      )}

      {status === 'submitted' && (
        <div className="notice">Submitted and waiting for marking.</div>
      )}

      {status !== 'graded' && (
        <>
          <label htmlFor="assignment-answer">
            {revisionNumber > 1 ? `Written response · version ${revisionNumber}` : 'Written response'}
          </label>
          <textarea
            id="assignment-answer"
            rows={8}
            maxLength={10000}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            disabled={locked || busy}
            placeholder="Write your answer here…"
          />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{bodyText.length}/10000</span>
            {status === 'draft' && <span className="badge neutral">Draft saved</span>}
          </div>

          {fileCount > 0 ? (
            <div className="notice warn">
              {fileCount} file reference{fileCount === 1 ? '' : 's'} are attached to this submission.
              Secure viewing is not connected yet.
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
              File, photo and audio uploads will appear here once private upload
              and verified delivery are connected. For now, submit written work.
            </p>
          )}

          {!locked && (
            <div className="row" style={{ gap: '.5rem' }}>
              <button type="button" className="btn secondary" disabled={busy} onClick={saveDraft}>
                {busy ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" className="btn" disabled={busy || (pastDue && !acceptLate)} onClick={submit}>
                {busy ? 'Submitting…' : revisionNumber > 1 ? 'Submit revision' : 'Submit assignment'}
              </button>
            </div>
          )}
        </>
      )}

      {status === 'graded' && (
        <div style={{ display: 'grid', gap: '.35rem' }}>
          <button
            type="button"
            className="btn secondary"
            disabled={busy || !revision.allowed || Boolean(revisionBlocked)}
            onClick={revise}
          >
            {busy ? 'Working…' : 'Revise this work'}
          </button>
          {revision.allowed && !revisionBlocked ? (
            <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
              Revising clears this mark so you can hand the work in again. The version you
              were marked on is kept below.
              {revision.remaining !== null
                ? ` You have ${revision.remaining} revision${revision.remaining === 1 ? '' : 's'} left.`
                : ''}
            </p>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>{revisionBlocked}</p>
          )}
        </div>
      )}

      {versions.length > 0 && (
        <div style={{ display: 'grid', gap: '.5rem' }}>
          <h3 style={{ margin: 0 }}>
            {versions.length === 1 ? 'Earlier version' : 'Earlier versions'}
          </h3>
          {versions.map((version) => (
            <div key={version.id} className="card" style={{ background: 'var(--surface, #f8faf8)' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong>Version {version.revisionNumber}</strong>
                <span className="muted" style={{ fontSize: '.8rem' }}>
                  {version.markedAt ? `Marked ${new Date(version.markedAt).toLocaleString()}` : ''}
                  {version.isLate ? ' · late' : ''}
                </span>
              </div>
              {version.scoreEarned !== null && (
                <p className="muted" style={{ margin: '.25rem 0 0' }}>
                  Score: {version.scoreEarned}{pointsPossible ? ` / ${pointsPossible}` : ''}
                </p>
              )}
              {version.feedback && (
                <p style={{ margin: '.35rem 0 0', whiteSpace: 'pre-wrap' }}>{version.feedback}</p>
              )}
              {version.assetIds.length > 0 && (
                <p className="muted" style={{ margin: '.35rem 0 0', fontSize: '.8rem' }}>
                  {version.assetIds.length} file reference{version.assetIds.length === 1 ? '' : 's'} accompanied this version.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {assignmentStatus !== 'open' && status !== 'graded' && status !== 'submitted' && (
        <div className="notice warn">This assignment is closed; a saved draft can no longer be submitted.</div>
      )}
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
    </section>
  );
}
