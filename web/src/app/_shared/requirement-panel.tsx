'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SCOPE_LABEL, type ReviewScope, type SubjectAreaOption } from '@/lib/review';
import {
  MAX_APPROVALS,
  REQUIREMENT_STATUS_LABEL,
  SCOPES,
  validateRequirementInput,
  validateWaiverInput,
  type ReviewRequirement,
} from '@/lib/review-requirements';

/**
 * What this version needs before it can publish.
 *
 * One component, three seats: the author on `/teach/[courseId]` may write
 * requirements and read the rest; governance staff on `/admin/reviews` may also waive
 * one; a reviewer on `/review/[assignmentId]` may only read, because what a version
 * needs is not theirs to change while they are judging it. The props say which seat
 * this is, and the database says whether the caller is telling the truth.
 *
 * The line that matters most on this panel is the one that says a requirement has no
 * authorised reviewer. Without it, "1 requirement still open" is a door that will not
 * open and nothing explains why: either somebody is granted the subject on
 * `/admin/reviewers`, or a governance admin waives it in writing.
 */
export function RequirementPanel({
  versionId,
  requirements,
  subjects,
  blockedBecause,
  recountError,
  canRequire,
  canWaive,
}: {
  versionId: string;
  requirements: ReviewRequirement[];
  subjects: SubjectAreaOption[];
  blockedBecause: string | null;
  recountError: string | null;
  canRequire: boolean;
  canWaive: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [subjectAreaId, setSubjectAreaId] = useState(subjects[0]?.id ?? '');
  const [scope, setScope] = useState<ReviewScope>('scholarly');
  const [count, setCount] = useState(1);
  const [waiving, setWaiving] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  async function post(payload: Record<string, unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fetch('/api/review/requirements', {
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
      return;
    }
    if (json.note) setNotice(json.note);
    startTransition(() => router.refresh());
  }

  async function submitRequirement() {
    const checked = validateRequirementInput({ subjectAreaId, scope, count });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    await post({ action: 'require', courseVersionId: versionId, ...checked.value },
      'Could not record what this version needs.');
  }

  async function submitWaiver(requirementId: string) {
    const checked = validateWaiverInput({ reason });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    await post({ action: 'waive', requirementId, ...checked.value },
      'Could not waive that requirement.');
    setWaiving(null);
    setReason('');
  }

  async function recount() {
    await post({ action: 'recount', courseVersionId: versionId }, 'Could not recount.');
  }

  return (
    <div className="card">
      <div className="outline-h" style={{ marginTop: 0 }}>
        <h3 style={{ margin: 0 }}>What this version needs before it can publish</h3>
        <span className={`badge ${blockedBecause ? 'warn' : 'ok'}`}>
          {blockedBecause ? `${requirements.filter((r) => r.status === 'open').length} open` : 'Nothing open'}
        </span>
      </div>

      <p className="meta" style={{ marginTop: '0.25rem' }}>
        Publishing needs a scholarly approval in any case — that is{' '}
        <code>governance.min_approvals</code>. A requirement here is stricter and
        specific: this version teaches a subject, so the approval has to come from
        somebody authorised for that subject, and a reviewer who is not cannot even be
        assigned to it.
      </p>

      {recountError && (
        <div className="notice error">
          The approvals could not be recounted ({recountError}), so what is shown below
          may be a moment out of date.
        </div>
      )}

      {blockedBecause && <div className="notice warn">{blockedBecause}.</div>}

      {requirements.length === 0 ? (
        <p className="empty">
          Nothing is required of this version beyond the approval every version needs.
          {canRequire ? ' Writing a requirement down is what makes the subject matter.' : ''}
        </p>
      ) : (
        <ul className="lessons">
          {requirements.map((r) => (
            <li key={r.id}>
              <span>
                {r.subjectName ?? 'A subject'} · {SCOPE_LABEL[r.reviewScope]}
                {r.status !== 'waived' && (
                  <>
                    {' · '}
                    {r.approvals === null ? 'approvals not counted' : `${r.approvals} of ${r.requiredApprovalCount} approvals`}
                    {r.status === 'open' && r.authorisedReviewers !== null && (
                      <> · {r.authorisedReviewers === 0
                        ? 'no reviewer is authorised for this'
                        : `${r.authorisedReviewers} reviewer${r.authorisedReviewers === 1 ? '' : 's'} could close it`}</>
                    )}
                  </>
                )}
                {r.status === 'waived' && r.waivedReason && (
                  <> · waived by {r.waivedByName ?? 'governance'}: {r.waivedReason}</>
                )}
              </span>
              <span className={`badge ${r.status === 'satisfied' ? 'ok' : r.status === 'waived' ? 'neutral' : 'warn'}`}>
                {REQUIREMENT_STATUS_LABEL[r.status]}
              </span>
              {canWaive && r.status !== 'waived' && (
                <button
                  type="button"
                  className="btn tiny ghost"
                  disabled={busy}
                  onClick={() => { setWaiving(waiving === r.id ? null : r.id); setReason(''); }}
                >
                  Waive
                </button>
              )}
              {canWaive && waiving === r.id && (
                <div className="stack" style={{ flexBasis: '100%', marginTop: '0.5rem' }}>
                  <p className="meta" style={{ marginTop: 0 }}>
                    Waiving lets this version publish without the review that was asked
                    for. The reason is stored with your name on it.
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Why this review is not needed"
                    aria-label="Reason for the waiver"
                    maxLength={2000}
                    style={{ width: '100%' }}
                  />
                  <div className="row">
                    <button type="button" className="btn secondary" disabled={busy}
                      onClick={() => submitWaiver(r.id)}>
                      {busy ? 'Waiving…' : 'Waive it in writing'}
                    </button>
                    <button type="button" className="btn ghost" disabled={busy}
                      onClick={() => setWaiving(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="row" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn tiny ghost" disabled={busy} onClick={recount}>
          Recount the approvals
        </button>
        <span className="meta">
          An approval closes its own requirement as it is recorded. Recounting is for
          the other order: a requirement written after the approvals arrived, or a
          reviewer granted the subject afterwards.
        </span>
      </div>

      {canRequire && (
        <details style={{ marginTop: '0.75rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
            Require a review of a subject
          </summary>
          <div className="row" style={{ flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <select
              value={subjectAreaId}
              onChange={(e) => setSubjectAreaId(e.target.value)}
              aria-label="Subject that needs reviewing"
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
              {SCOPES.map((s) => (
                <option key={s} value={s}>{SCOPE_LABEL[s]}</option>
              ))}
            </select>
            <label className="row" style={{ gap: '0.35rem' }}>
              <span className="meta">Approvals</span>
              <input
                type="number"
                min={1}
                max={MAX_APPROVALS}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                aria-label="Approvals needed"
                style={{ width: '4.5rem' }}
              />
            </label>
            <button type="button" className="btn secondary" disabled={busy} onClick={submitRequirement}>
              {busy ? 'Recording…' : 'Write it down'}
            </button>
          </div>
          <p className="meta">
            Raising the number of approvals reopens a requirement that was already met,
            because the state follows from the approvals and the number. Lowering it
            does not reopen anything.
          </p>
        </details>
      )}

      {error && <p className="danger" style={{ fontSize: '0.9rem' }} role="alert">{error}</p>}
      {notice && <p className="muted" style={{ fontSize: '0.9rem' }}>{notice}</p>}
    </div>
  );
}
