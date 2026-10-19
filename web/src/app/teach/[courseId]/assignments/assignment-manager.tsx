'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AssignmentSubmission, CourseAssignment } from '@/lib/course-assignments';

export type AssignmentVersionOption = { id: string; versionNumber: number; status: string };
export type AssignmentCohortOption = {
  id: string;
  title: string;
  courseVersionId: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
};

function dateLabel(value: string | null) {
  if (!value) return 'No deadline';
  return new Date(value).toLocaleString();
}

function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function AssignmentManager({
  enabled,
  cohortsEnabled,
  versions,
  cohorts,
  assignments,
  submissions,
  fileCounts,
}: {
  enabled: boolean;
  cohortsEnabled: boolean;
  versions: AssignmentVersionOption[];
  cohorts: AssignmentCohortOption[];
  assignments: CourseAssignment[];
  submissions: AssignmentSubmission[];
  fileCounts: Record<string, number>;
}) {
  const router = useRouter();
  const publishedVersions = versions.filter((v) => v.status === 'published');
  const [versionId, setVersionId] = useState(publishedVersions[0]?.id ?? '');
  const [cohortId, setCohortId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueAfterDays, setDueAfterDays] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [pointsPossible, setPointsPossible] = useState('');
  const [acceptLate, setAcceptLate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const versionCohorts = cohortsEnabled
    ? cohorts.filter((c) => c.courseVersionId === versionId && c.status === 'open')
    : [];
  const submissionsByAssignment = new Map<string, AssignmentSubmission[]>();
  for (const submission of submissions) {
    const group = submissionsByAssignment.get(submission.assignmentId) ?? [];
    group.push(submission);
    submissionsByAssignment.set(submission.assignmentId, group);
  }

  async function send(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; id?: string | null; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? 'That assignment change did not work.');
      setMessage('Saved.');
      router.refresh();
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That assignment change did not work.');
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const selectedCohort = cohortId || null;
    const result = await send({
      action: editingId ? 'update_draft' : 'create',
      ...(editingId ? { assignmentId: editingId } : {}),
      courseVersionId: versionId,
      cohortId: selectedCohort,
      title,
      instructions,
      dueAfterDays: selectedCohort ? null : dueAfterDays || null,
      dueAt: selectedCohort && dueAt ? new Date(dueAt).toISOString() : null,
      acceptLate,
      pointsPossible: pointsPossible || null,
    }, 'create');
    if (result) {
      setTitle('');
      setInstructions('');
      setDueAfterDays('');
      setDueAt('');
      setPointsPossible('');
      setAcceptLate(false);
      setEditingId(null);
      setMessage(editingId ? 'Draft assignment updated.' : 'Draft assignment created. Review it below, then open it when ready.');
    }
  }

  function editDraft(assignment: CourseAssignment) {
    setEditingId(assignment.id);
    setVersionId(assignment.courseVersionId);
    setCohortId(assignment.cohortId ?? '');
    setTitle(assignment.title);
    setInstructions(assignment.instructions);
    setDueAfterDays(assignment.dueAfterDays?.toString() ?? '');
    setDueAt(toLocalInput(assignment.dueAt));
    setPointsPossible(assignment.pointsPossible?.toString() ?? '');
    setAcceptLate(assignment.acceptLate);
    document.getElementById('assignment-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function setStatus(assignment: CourseAssignment, status: 'open' | 'closed' | 'cancelled') {
    await send({ action: 'set_status', assignmentId: assignment.id, status }, `${assignment.id}-${status}`);
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {!enabled && (
        <div className="notice warn">
          New assignments are switched off. Existing open work remains available
          to learners and can still be marked.
        </div>
      )}

      {enabled && (
        <form id="assignment-form" className="card" onSubmit={create} style={{ display: 'grid', gap: '.65rem' }}>
          <h2 style={{ margin: 0 }}>{editingId ? 'Edit draft assignment' : 'Create an assignment'}</h2>
          <p className="muted" style={{ margin: 0 }}>
            This is standalone work, not a quiz question. It can be added after a
            course version is published. The learner deadline is measured from
            their enrolment; a cohort deadline is a shared date.
          </p>

          <label htmlFor="assignment-version">Published course version</label>
          <select id="assignment-version" value={versionId} disabled={Boolean(editingId)} onChange={(e) => {
            setVersionId(e.target.value);
            setCohortId('');
          }} required>
            {publishedVersions.map((v) => <option key={v.id} value={v.id}>Version {v.versionNumber}</option>)}
          </select>

          <label htmlFor="assignment-cohort">Who is this for?</label>
          <select id="assignment-cohort" value={cohortId} disabled={Boolean(editingId)} onChange={(e) => {
            setCohortId(e.target.value);
            setDueAfterDays('');
            setDueAt('');
          }}>
            <option value="">Everyone enrolled in this version (self-paced)</option>
            {versionCohorts.map((c) => <option key={c.id} value={c.id}>{c.title} · cohort</option>)}
          </select>
          {cohortId ? (
            <>
              <label htmlFor="assignment-due-at">Shared due date and time (optional)</label>
              <input id="assignment-due-at" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </>
          ) : (
            <>
              <label htmlFor="assignment-due-days">Due how many days after each learner enrols? (optional)</label>
              <input
                id="assignment-due-days"
                type="number"
                min={1}
                step={1}
                value={dueAfterDays}
                onChange={(e) => setDueAfterDays(e.target.value)}
                placeholder="No deadline"
              />
            </>
          )}

          <label htmlFor="assignment-title">Assignment title</label>
          <input id="assignment-title" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label htmlFor="assignment-instructions">Instructions</label>
          <textarea id="assignment-instructions" maxLength={10000} rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />

          <label htmlFor="assignment-points">Points possible (leave blank for feedback only)</label>
          <input id="assignment-points" type="number" min="0.01" step="0.01" value={pointsPossible} onChange={(e) => setPointsPossible(e.target.value)} />

          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <input type="checkbox" checked={acceptLate} onChange={(e) => setAcceptLate(e.target.checked)} style={{ width: 'auto' }} />
            Accept and mark late submissions
          </label>

          <div className="row" style={{ gap: '.5rem' }}>
            <button type="submit" className="btn" disabled={Boolean(busy) || publishedVersions.length === 0}>
              {busy === 'create' ? 'Saving…' : editingId ? 'Save draft changes' : 'Create draft'}
            </button>
            {editingId && (
              <button type="button" className="btn ghost" disabled={Boolean(busy)} onClick={() => setEditingId(null)}>
                Cancel editing
              </button>
            )}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
            Late work is rejected by default. The media upload and secure file-viewer
            path is not connected yet; for now, learners can hand in written work.
          </p>
        </form>
      )}

      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}

      <section style={{ display: 'grid', gap: '.75rem' }}>
        <h2 style={{ margin: 0 }}>Assignments</h2>
        {assignments.length === 0 ? (
          <div className="card"><p className="empty">No assignments yet.</p></div>
        ) : assignments.map((assignment) => {
          const cohort = cohorts.find((c) => c.id === assignment.cohortId);
          const rows = submissionsByAssignment.get(assignment.id) ?? [];
          return (
            <article className="card" key={assignment.id} style={{ display: 'grid', gap: '.65rem' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{assignment.title}</h3>
                  <p className="muted" style={{ margin: '.25rem 0' }}>
                    Version {versions.find((v) => v.id === assignment.courseVersionId)?.versionNumber ?? '?'}
                    {' · '}{cohort ? cohort.title : 'Self-paced'}
                    {' · '}{cohort ? dateLabel(assignment.dueAt) : assignment.dueAfterDays ? `${assignment.dueAfterDays} days after enrolment` : 'No deadline'}
                    {' · '}{assignment.acceptLate ? 'Late work accepted' : 'Late work rejected'}
                  </p>
                </div>
                <span className={`badge ${assignment.status === 'open' ? '' : 'neutral'}`}>{assignment.status}</span>
              </div>
              {assignment.instructions && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{assignment.instructions}</p>}
              <div className="row" style={{ gap: '.5rem' }}>
                {assignment.status === 'draft' && (
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={Boolean(busy) || (Boolean(assignment.cohortId) && (!cohortsEnabled || cohort?.status !== 'open'))}
                    onClick={() => editDraft(assignment)}
                  >
                    Edit draft
                  </button>
                )}
                {assignment.status === 'draft' && (
                  <button type="button" className="btn" disabled={!enabled || Boolean(busy)} onClick={() => setStatus(assignment, 'open')}>
                    {busy === `${assignment.id}-open` ? 'Opening…' : 'Open to learners'}
                  </button>
                )}
                {assignment.status === 'open' && (
                  <button type="button" className="btn secondary" disabled={Boolean(busy)} onClick={() => setStatus(assignment, 'closed')}>
                    {busy === `${assignment.id}-closed` ? 'Closing…' : 'Close submissions'}
                  </button>
                )}
                {(assignment.status === 'draft' || assignment.status === 'open') && (
                  <button type="button" className="btn ghost" disabled={Boolean(busy)} onClick={() => setStatus(assignment, 'cancelled')}>
                    Cancel assignment
                  </button>
                )}
              </div>

              <div className="outline-h" style={{ marginTop: '.35rem' }}><h4>Submissions ({rows.length})</h4></div>
              {rows.length === 0 ? <p className="muted" style={{ margin: 0 }}>None received yet.</p> : rows.map((submission) => (
                <SubmissionForMarking
                  key={submission.id}
                  assignment={assignment}
                  submission={submission}
                  fileCount={fileCounts[submission.id] ?? 0}
                  onSend={send}
                  busy={busy}
                />
              ))}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function SubmissionForMarking({
  assignment,
  submission,
  fileCount,
  onSend,
  busy,
}: {
  assignment: CourseAssignment;
  submission: AssignmentSubmission;
  fileCount: number;
  onSend: (payload: Record<string, unknown>, key: string) => Promise<unknown>;
  busy: string | null;
}) {
  const [score, setScore] = useState(submission.scoreEarned?.toString() ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const key = `mark-${submission.id}`;

  async function mark() {
    const numericScore = score.trim() === '' ? null : Number(score);
    if (numericScore !== null && !Number.isFinite(numericScore)) return;
    await onSend({ action: 'mark', submissionId: submission.id, score: numericScore, feedback }, key);
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '.5rem', background: 'var(--surface, #f8faf8)' }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        Submission {submission.id.slice(0, 8)} · {submission.status}
        {submission.isLate ? ' · late' : ''}
        {submission.submittedAt ? ` · ${new Date(submission.submittedAt).toLocaleString()}` : ''}
      </p>
      {submission.bodyText && <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{submission.bodyText}</div>}
      {fileCount > 0 && (
        <p className="notice warn" style={{ margin: 0 }}>
          {fileCount} private file reference{fileCount === 1 ? '' : 's'} attached. Secure viewing is not connected yet.
        </p>
      )}
      {submission.status === 'graded' ? (
        <div className="notice">
          {submission.scoreEarned !== null && <strong>{submission.scoreEarned}{assignment.pointsPossible ? ` / ${assignment.pointsPossible}` : ''}</strong>}
          {submission.feedback && <p style={{ margin: '.25rem 0 0' }}>{submission.feedback}</p>}
        </div>
      ) : submission.status === 'submitted' ? (
        <div style={{ display: 'grid', gap: '.5rem' }}>
          {assignment.pointsPossible !== null && (
            <label>
              Score (out of {assignment.pointsPossible})
              <input type="number" min="0" max={assignment.pointsPossible} step="0.01" value={score} onChange={(e) => setScore(e.target.value)} />
            </label>
          )}
          <label>
            Private feedback for this learner
            <textarea rows={3} maxLength={5000} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </label>
          <button type="button" className="btn" disabled={Boolean(busy)} onClick={mark}>
            {busy === key ? 'Saving mark…' : 'Mark and return feedback'}
          </button>
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>The learner is still drafting.</p>
      )}
    </div>
  );
}
