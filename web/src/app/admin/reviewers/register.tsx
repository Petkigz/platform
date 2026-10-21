'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AUTHORIZATION_STATUS_LABEL,
  AUTHORIZATION_STATUSES,
  BARRING_CONFLICT_STATUSES,
  CONFLICT_ASSESSMENTS,
  CONFLICT_STATUS_LABEL,
  CONFLICT_TYPE_LABEL,
  QUALIFICATION_DECISIONS,
  QUALIFICATION_STATUS_LABEL,
  QUALIFICATION_TYPE_LABEL,
  REVIEWER_STATUS_LABEL,
  SCOPE_LABEL,
  SETTABLE_REVIEWER_STATUSES,
  validateAssessmentInput,
  validateAuthorizationInput,
  validateQualificationDecision,
  validateReviewerStatusInput,
  type ReviewScope,
  type ReviewerRegisterEntry,
  type SubjectAreaOption,
} from '@/lib/review';

/**
 * Deciding who may review.
 *
 * Every control here calls a function that takes no actor: the caller is the session,
 * and the gate is `governance_admin` or `platform_admin`, in the route and again in
 * the database. Nothing on this page can be done by a support agent, who is
 * privileged for everything else and must not be able to appoint the people who sign
 * off on what the platform teaches.
 *
 * Three things the page does not offer, because the database does not allow them:
 *
 *   * Setting somebody back to `applicant` or `pending_verification`. Registration is
 *     the only route to those states, so an admin cannot quietly un-verify a
 *     reviewer — they can suspend them, which leaves the record of who checked them
 *     intact.
 *   * Checking a qualification whose validity window has already closed.
 *   * Granting a subject to somebody who is not yet verified. Verify first; the
 *     refusal says as much.
 *
 * And one thing it cannot show: the document behind a qualification. `evidence_reference`
 * is deliberately not readable by any client, so checking a qualification here is a
 * judgement made from a document held outside the platform. That is stated on the
 * card rather than hidden behind a button that looks like it saw something.
 */

type Filter = 'all' | 'awaiting' | 'active' | 'closed';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Everybody' },
  { id: 'awaiting', label: 'Waiting to be checked' },
  { id: 'active', label: 'Verified' },
  { id: 'closed', label: 'Suspended or retired' },
];

function matches(entry: ReviewerRegisterEntry, filter: Filter): boolean {
  const status = entry.reviewer.status;
  if (filter === 'awaiting') return status === 'applicant' || status === 'pending_verification';
  if (filter === 'active') return status === 'active';
  if (filter === 'closed') return status === 'suspended' || status === 'inactive';
  return true;
}

export function ReviewerRegister({
  register,
  subjects,
}: {
  register: ReviewerRegisterEntry[];
  subjects: SubjectAreaOption[];
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = register.filter((entry) => matches(entry, filter));

  if (register.length === 0) {
    return (
      <div className="empty">
        Nobody has applied to review yet. An application is made by the person
        themselves on <span className="muted">/review</span> — staff cannot create a
        reviewer profile for somebody else.
      </div>
    );
  }

  return (
    <>
      <div className="tabs" style={{ marginTop: '1.5rem' }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn tiny ${filter === f.id ? '' : 'ghost'}`}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty" style={{ marginTop: '1rem' }}>Nobody in this group.</div>
      ) : (
        <div className="stack" style={{ marginTop: '1rem' }}>
          {shown.map((entry) => (
            <ReviewerCard key={entry.reviewer.reviewerProfileId} entry={entry} subjects={subjects} />
          ))}
        </div>
      )}
    </>
  );
}

function ReviewerCard({
  entry,
  subjects,
}: {
  entry: ReviewerRegisterEntry;
  subjects: SubjectAreaOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reviewer = entry.reviewer;
  const [status, setStatus] = useState<string>(
    (SETTABLE_REVIEWER_STATUSES as readonly string[]).includes(reviewer.status)
      ? reviewer.status
      : 'active',
  );
  const [note, setNote] = useState('');
  const [scope, setScope] = useState<ReviewScope>('scholarly');
  const [authorizationSubject, setAuthorizationSubject] = useState(subjects[0]?.id ?? '');
  const [authorizationStatus, setAuthorizationStatus] = useState<string>('active');
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [validUntil, setValidUntil] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState<Record<string, { status: string; notes: string }>>({});

  async function post(payload: Record<string, unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/reviewers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; message?: string; note?: string | null }
      | null;
    setBusy(false);

    if (!json?.ok) {
      setError(json?.message ?? fallback);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function decideStatus() {
    const checked = validateReviewerStatusInput({ status, note });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    const done = await post({
      action: 'status',
      reviewerProfileId: reviewer.reviewerProfileId,
      ...checked.value,
    }, 'Could not record that decision.');
    if (done) setNote('');
  }

  async function decideQualification(qualificationId: string, decision: string) {
    const checked = validateQualificationDecision({ decision, validUntil: validUntil[qualificationId] });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    await post({
      action: 'verify-qualification',
      qualificationId,
      ...checked.value,
    }, 'Could not record that decision.');
  }

  async function decideAuthorization() {
    const checked = validateAuthorizationInput({
      subjectAreaId: authorizationSubject,
      scope,
      status: authorizationStatus,
      effectiveUntil,
    });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    const done = await post({
      action: 'authorization',
      reviewerProfileId: reviewer.reviewerProfileId,
      ...checked.value,
    }, 'Could not record that authorisation.');
    if (done) setEffectiveUntil('');
  }

  async function decideConflict(declarationId: string) {
    const current = assessment[declarationId] ?? { status: 'under_assessment', notes: '' };
    const checked = validateAssessmentInput(current);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    await post({
      action: 'assess-conflict',
      declarationId,
      ...checked.value,
    }, 'Could not record that assessment.');
  }

  const barring = entry.conflicts.filter((c) => BARRING_CONFLICT_STATUSES.includes(c.status));

  return (
    <div className="card">
      <div className="outline-h" style={{ marginTop: 0 }}>
        <h3 style={{ margin: 0 }}>{reviewer.displayName ?? 'Unnamed reviewer'}</h3>
        <span className={`badge ${reviewer.status === 'active' ? 'ok' : 'warn'}`}>
          {REVIEWER_STATUS_LABEL[reviewer.status]}
        </span>
      </div>

      <dl className="facts">
        <div>
          <dt>Applied</dt>
          <dd>{reviewer.createdAt ? new Date(reviewer.createdAt).toLocaleDateString() : '—'}</dd>
        </div>
        <div>
          <dt>Checked</dt>
          <dd>
            {reviewer.verifiedAt
              ? `${new Date(reviewer.verifiedAt).toLocaleDateString()}${
                  reviewer.verifiedByName ? ` by ${reviewer.verifiedByName}` : ''
                }`
              : 'Never'}
          </dd>
        </div>
        <div>
          <dt>May review</dt>
          <dd>
            {entry.authorizations.filter((a) => a.status === 'active').length === 0
              ? 'Nothing yet'
              : entry.authorizations
                  .filter((a) => a.status === 'active')
                  .map((a) => `${a.subjectName ?? 'a subject'} (${SCOPE_LABEL[a.reviewScope].toLowerCase()})`)
                  .join(', ')}
          </dd>
        </div>
      </dl>

      {reviewer.publicBio && (
        <p className="meta" style={{ fontStyle: 'italic' }}>{reviewer.publicBio}</p>
      )}

      {barring.length > 0 && (
        <div className="notice warn">
          {barring.length === 1 ? 'A declaration is' : `${barring.length} declarations are`} barring
          this reviewer from an assignment until it is heard below.
        </div>
      )}

      <details open={reviewer.status !== 'active'}>
        <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
          Decide their status
        </summary>
        <div className="row" style={{ flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Reviewer status"
          >
            {SETTABLE_REVIEWER_STATUSES.map((s) => (
              <option key={s} value={s}>{REVIEWER_STATUS_LABEL[s]}</option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={status === 'active' ? 'A note, if you want one (optional)' : 'Why, in writing'}
            aria-label="Reason for the status"
            maxLength={1000}
          />
          <button type="button" className="btn" disabled={busy} onClick={decideStatus}>
            {busy ? 'Recording…' : 'Record the decision'}
          </button>
        </div>
        <p className="meta">
          Setting somebody to “{REVIEWER_STATUS_LABEL.active}” is what checking them
          means: it records that you did it, and the first time only — a later
          reinstatement does not rewrite who verified them. Suspending or retiring
          them needs a written reason, and nothing here can set a person back to
          applicant.
        </p>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
          Qualifications ({entry.qualifications.length})
        </summary>
        <div className="stack" style={{ marginTop: '0.75rem' }}>
          {entry.qualifications.length === 0 ? (
            <p className="empty">Nothing recorded.</p>
          ) : (
            entry.qualifications.map((q) => (
              <div key={q.id} className="card" style={{ padding: '0.75rem' }}>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <span>
                    {QUALIFICATION_TYPE_LABEL[q.qualificationType as keyof typeof QUALIFICATION_TYPE_LABEL]
                      ?? q.qualificationType}{' '}
                    · {q.title ?? 'untitled'}
                    {q.institution ? ` · ${q.institution}` : ''}
                    {q.subjectName ? ` · ${q.subjectName}` : ''}
                  </span>
                  <span className={`badge ${q.verificationStatus === 'verified' ? 'ok' : q.verificationStatus === 'pending' ? 'warn' : 'neutral'}`}>
                    {QUALIFICATION_STATUS_LABEL[q.verificationStatus]}
                    {q.verifiedByName ? ` · ${q.verifiedByName}` : ''}
                    {q.validUntil ? ` · until ${new Date(q.validUntil).toLocaleDateString()}` : ''}
                  </span>
                </div>

                {q.verificationStatus === 'pending' && (
                  <div className="row" style={{ flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <input
                      type="date"
                      value={validUntil[q.id] ?? ''}
                      onChange={(e) => setValidUntil({ ...validUntil, [q.id]: e.target.value })}
                      aria-label="Valid until"
                    />
                    {QUALIFICATION_DECISIONS.map((decision) => (
                      <button
                        key={decision}
                        type="button"
                        className={`btn ${decision === 'verified' ? '' : 'secondary'}`}
                        disabled={busy}
                        onClick={() => decideQualification(q.id, decision)}
                      >
                        {decision === 'verified' ? 'Check it' : 'Not accepted'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          <p className="meta">
            The document behind a qualification is not served to any screen —{' '}
            <code>evidence_reference</code> is not readable by a client, and a storage
            key is not a document. Checking one here is a judgement made from a
            document held outside the platform.
          </p>
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
          What they may review ({entry.authorizations.filter((a) => a.status === 'active').length} active)
        </summary>
        <div className="stack" style={{ marginTop: '0.75rem' }}>
          {entry.authorizations.length === 0 ? (
            <p className="empty">
              No subject granted. Until one is, this reviewer can be assigned only
              where no subject requirement has been written down — and an assignment
              against a requirement they are not granted is refused.
            </p>
          ) : (
            <ul className="lessons">
              {entry.authorizations.map((a) => (
                <li key={a.id}>
                  <span>
                    {a.subjectName ?? 'a subject'} · {SCOPE_LABEL[a.reviewScope]}
                    {a.approverName ? ` · granted by ${a.approverName}` : ''}
                    {a.effectiveUntil ? ` · until ${new Date(a.effectiveUntil).toLocaleDateString()}` : ''}
                  </span>
                  <span className={`badge ${a.status === 'active' ? 'ok' : 'neutral'}`}>
                    {AUTHORIZATION_STATUS_LABEL[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <select
              value={authorizationSubject}
              onChange={(e) => setAuthorizationSubject(e.target.value)}
              aria-label="Subject to grant"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ReviewScope)}
              aria-label="Review scope"
            >
              <option value="scholarly">{SCOPE_LABEL.scholarly}</option>
              <option value="technical">{SCOPE_LABEL.technical}</option>
            </select>
            <select
              value={authorizationStatus}
              onChange={(e) => setAuthorizationStatus(e.target.value)}
              aria-label="Authorisation status"
            >
              {AUTHORIZATION_STATUSES.map((s) => (
                <option key={s} value={s}>{AUTHORIZATION_STATUS_LABEL[s]}</option>
              ))}
            </select>
            <input
              type="date"
              value={effectiveUntil}
              onChange={(e) => setEffectiveUntil(e.target.value)}
              aria-label="Effective until"
            />
            <button type="button" className="btn secondary" disabled={busy} onClick={decideAuthorization}>
              {busy ? 'Recording…' : 'Record it'}
            </button>
          </div>

          <p className="meta">
            Granting a subject to somebody who is not verified yet is refused: check
            them first. Changing an existing grant updates it in place; revoking keeps
            the row and granting again writes a new one beside it, so the record of
            what was taken away is not overwritten.
          </p>
        </div>
      </details>

      <details open={barring.length > 0}>
        <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
          Conflicts ({entry.conflicts.length})
        </summary>
        <div className="stack" style={{ marginTop: '0.75rem' }}>
          {entry.conflicts.length === 0 ? (
            <p className="empty">Nothing declared.</p>
          ) : (
            entry.conflicts.map((c) => (
              <div key={c.id} className="card" style={{ padding: '0.75rem' }}>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <span>
                    {CONFLICT_TYPE_LABEL[c.conflictType as keyof typeof CONFLICT_TYPE_LABEL] ?? c.conflictType}
                    {' · '}{c.description}
                    {c.courseVersionId ? ' · about one course version' : ' · standing'}
                  </span>
                  <span className={`badge ${BARRING_CONFLICT_STATUSES.includes(c.status) ? 'warn' : 'ok'}`}>
                    {CONFLICT_STATUS_LABEL[c.status]}
                  </span>
                </div>

                {c.status !== 'resolved' && c.status !== 'disqualifying' && (
                  <div className="stack" style={{ marginTop: '0.5rem' }}>
                    <div className="row" style={{ flexWrap: 'wrap' }}>
                      <select
                        value={assessment[c.id]?.status ?? 'under_assessment'}
                        onChange={(e) => setAssessment({
                          ...assessment,
                          [c.id]: { status: e.target.value, notes: assessment[c.id]?.notes ?? '' },
                        })}
                        aria-label="Assessment"
                      >
                        {CONFLICT_ASSESSMENTS.map((s) => (
                          <option key={s} value={s}>{CONFLICT_STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy}
                        onClick={() => decideConflict(c.id)}
                      >
                        Record the assessment
                      </button>
                    </div>
                    <input
                      value={assessment[c.id]?.notes ?? ''}
                      onChange={(e) => setAssessment({
                        ...assessment,
                        [c.id]: { status: assessment[c.id]?.status ?? 'under_assessment', notes: e.target.value },
                      })}
                      placeholder="Why — required to hear it or to bar them"
                      aria-label="Assessment notes"
                      maxLength={2000}
                    />
                  </div>
                )}
              </div>
            ))
          )}

          <p className="meta">
            “{CONFLICT_STATUS_LABEL.accepted}” and “{CONFLICT_STATUS_LABEL.resolved}” are
            the two answers that let this reviewer work again. Both need the reason in
            writing, because either one ends a bar that was protecting a course.
          </p>
        </div>
      </details>

      {error && (
        <p className="danger" style={{ fontSize: '0.9rem' }} role="alert">{error}</p>
      )}
    </div>
  );
}
