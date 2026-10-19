'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AssignmentSubmission } from '@/lib/course-assignments';

export function AssignmentWork({
  assignmentId,
  learnerProfileId,
  assignmentStatus,
  pointsPossible,
  acceptLate,
  deadline,
  initialSubmission,
  fileCount,
}: {
  assignmentId: string;
  learnerProfileId: string;
  assignmentStatus: string;
  pointsPossible: number | null;
  acceptLate: boolean;
  deadline: string | null;
  initialSubmission: AssignmentSubmission | null;
  fileCount: number;
}) {
  const router = useRouter();
  const [submissionId, setSubmissionId] = useState(initialSubmission?.id ?? '');
  const [status, setStatus] = useState<AssignmentSubmission['status'] | null>(initialSubmission?.status ?? null);
  const [bodyText, setBodyText] = useState(initialSubmission?.bodyText ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const due = deadline ? new Date(deadline) : null;
  const pastDue = due !== null && due.getTime() < Date.now();
  const locked = status === 'submitted' || status === 'graded' || assignmentStatus !== 'open';

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
        ok?: boolean; id?: string | null; message?: string;
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
    setMessage('Submitted. Your work is now with the course author for marking.');
    router.refresh();
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '.75rem' }}>
      <h2 style={{ margin: 0 }}>Your work</h2>

      {due && (
        <p className="muted" style={{ margin: 0 }}>
          Due {due.toLocaleString()}
          {pastDue && acceptLate ? ' · late work is accepted' : ''}
        </p>
      )}
      {pastDue && !acceptLate && status !== 'submitted' && status !== 'graded' && (
        <div className="notice warn">The deadline has passed and late work is not accepted.</div>
      )}

      {status === 'graded' && initialSubmission?.bodyText && (
        <div className="card" style={{ background: 'var(--surface, #f8faf8)' }}>
          <h3 style={{ marginTop: 0 }}>Your submitted response</h3>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{initialSubmission.bodyText}</div>
        </div>
      )}

      {status === 'graded' && initialSubmission && (
        <div className="notice">
          <strong>Marked</strong>
          {initialSubmission.scoreEarned !== null && (
            <p style={{ margin: '.25rem 0 0' }}>
              Score: {initialSubmission.scoreEarned}
              {pointsPossible ? ` / ${pointsPossible}` : ''}
            </p>
          )}
          {initialSubmission.feedback && (
            <p style={{ margin: '.5rem 0 0', whiteSpace: 'pre-wrap' }}>{initialSubmission.feedback}</p>
          )}
        </div>
      )}

      {status === 'submitted' && (
        <div className="notice">Submitted and waiting for marking.</div>
      )}

      {status !== 'graded' && (
        <>
          <label htmlFor="assignment-answer">Written response</label>
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
                {busy ? 'Submitting…' : 'Submit assignment'}
              </button>
            </div>
          )}
        </>
      )}

      {assignmentStatus !== 'open' && status !== 'graded' && status !== 'submitted' && (
        <div className="notice warn">This assignment is closed; a saved draft can no longer be submitted.</div>
      )}
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
    </section>
  );
}
