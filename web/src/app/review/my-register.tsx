'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BARRING_CONFLICT_STATUSES,
  BIO_MAX,
  CONFLICT_STATUS_LABEL,
  CONFLICT_TYPES,
  CONFLICT_TYPE_LABEL,
  QUALIFICATION_STATUS_LABEL,
  QUALIFICATION_TYPES,
  QUALIFICATION_TYPE_LABEL,
  REVIEWER_STATUS_LABEL,
  validateConflictInput,
  validateQualificationInput,
  validateReviewerBio,
  type ReviewerRegisterEntry,
  type SubjectAreaOption,
} from '@/lib/review';

/**
 * The reviewer's own entry on the register.
 *
 * Three things can be done here and no more: put yourself forward, say what you are
 * qualified for, and stand aside from something you cannot judge impartially. What
 * cannot be done here is the point of the split — nobody can verify themselves, and
 * nobody can grant themselves a subject. Those are on `/admin/reviewers`, and a
 * person who tries them from here gets the database's own sentence back.
 *
 * A declaration made here bars an assignment straight away, before anybody has read
 * it: `validate_review_assignment()` refuses while a declaration is `declared`,
 * `under_assessment` or `disqualifying`. That is deliberate. A conflict heard later
 * is worth more than a review published sooner.
 */
export function MyRegister({
  entry,
  subjects,
}: {
  entry: ReviewerRegisterEntry | null;
  subjects: SubjectAreaOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bio, setBio] = useState('');
  const [qualificationType, setQualificationType] = useState<string>(QUALIFICATION_TYPES[0] ?? '');
  const [title, setTitle] = useState('');
  const [institution, setInstitution] = useState('');
  // A qualification without a subject can never authorise anything, so there
  // is no empty default: the first subject is chosen and the person changes it.
  const [subjectAreaId, setSubjectAreaId] = useState(subjects[0]?.id ?? '');
  const [conflictType, setConflictType] = useState<string>(CONFLICT_TYPES[0] ?? '');
  const [description, setDescription] = useState('');

  async function post(payload: Record<string, unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/review/profile', {
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
      return null;
    }
    startTransition(() => router.refresh());
    return json;
  }

  function notice(message: string | null) {
    if (!message) return null;
    return (
      <p className="danger" style={{ fontSize: '0.85rem' }} role="alert">
        {message}
      </p>
    );
  }

  if (!entry) {
    return (
      <div className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0 }}>Put yourself forward as a reviewer</h3>
          <span className="badge neutral">Not on the register</span>
        </div>

        <p className="meta" style={{ marginTop: '0.5rem' }}>
          You are not on the reviewer register, so nothing can be assigned to you.
          Applying does not make you a reviewer: a governance admin has to check who
          you are before a course can be put in front of you, and only they may say
          which subjects you can judge.
        </p>

        <label htmlFor="register-bio" className="meta" style={{ display: 'block' }}>
          A short biography, shown to whoever checks your application
        </label>
        <textarea
          id="register-bio"
          value={bio}
          maxLength={BIO_MAX}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          style={{ width: '100%' }}
        />

        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={async () => {
              const checked = validateReviewerBio(bio);
              if (!checked.ok) {
                setError(checked.message);
                return;
              }
              await post({ action: 'register', bio: checked.value }, 'Could not apply.');
            }}
          >
            {busy ? 'Applying…' : 'Apply to review'}
          </button>
          {notice(error)}
        </div>
      </div>
    );
  }

  const reviewer = entry.reviewer;

  async function submitQualification() {
    const checked = validateQualificationInput({ qualificationType, title, institution, subjectAreaId });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    if (!reviewer) return;
    await post({
      action: 'qualification',
      reviewerProfileId: reviewer.reviewerProfileId,
      ...checked.value,
    }, 'Could not record that qualification.');
    setTitle('');
    setInstitution('');
  }

  async function submitConflict() {
    const checked = validateConflictInput({ conflictType, description });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    // No version id: this is a standing declaration about you, not about one
    // course. A declaration about a course you have been offered is made from
    // that offer, where the version is known.
    await post({ action: 'conflict', ...checked.value }, 'Could not record that declaration.');
    setDescription('');
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0 }}>Your place on the register</h3>
          <span className={`badge ${reviewer.status === 'active' ? 'ok' : 'neutral'}`}>
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
                : 'Not yet — you cannot be assigned until a governance admin checks you'}
            </dd>
          </div>
        </dl>

        {reviewer.status !== 'active' && (
          <p className="meta">
            While your status is {REVIEWER_STATUS_LABEL[reviewer.status].toLowerCase()}, no
            course can be assigned to you and no approval you give would let anything
            publish.
          </p>
        )}
      </div>

      <div className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0 }}>What you are qualified for</h3>
          <span className="badge neutral">{entry.qualifications.length}</span>
        </div>

        {entry.qualifications.length === 0 ? (
          <p className="empty">Nothing recorded yet.</p>
        ) : (
          <ul className="lessons">
            {entry.qualifications.map((q) => (
              <li key={q.id}>
                <span>
                  {QUALIFICATION_TYPE_LABEL[q.qualificationType as keyof typeof QUALIFICATION_TYPE_LABEL]
                    ?? q.qualificationType}{' '}
                  · {q.title ?? 'untitled'}
                  {q.institution ? ` · ${q.institution}` : ''}
                  {q.subjectName ? ` · ${q.subjectName}` : ''}
                </span>
                <span className={`badge ${q.verificationStatus === 'verified' ? 'ok' : q.verificationStatus === 'pending' ? 'warn' : 'neutral'}`}>
                  {QUALIFICATION_STATUS_LABEL[q.verificationStatus]}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="meta">
          A qualification you record is <em>pending</em> until it is checked — by the
          platform owner, or by the scholarly board while the owner has it convened.
          It must name a subject, because a credential is what authorises you in that
          subject. Recording one does not authorise you either: granting the subject is
          a separate decision by governance staff.
        </p>

        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
            Record a qualification
          </summary>
          <div className="stack" style={{ marginTop: '0.75rem' }}>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <select
                value={qualificationType}
                onChange={(e) => setQualificationType(e.target.value)}
                aria-label="Kind of qualification"
              >
                {QUALIFICATION_TYPES.map((t) => (
                  <option key={t} value={t}>{QUALIFICATION_TYPE_LABEL[t]}</option>
                ))}
              </select>
              <select
                value={subjectAreaId}
                onChange={(e) => setSubjectAreaId(e.target.value)}
                aria-label="Subject this covers"
                required
              >
                {subjects.length === 0 && <option value="">No subjects exist yet</option>}
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What it is called, e.g. Ijazah in Hafs an Asim"
              aria-label="Qualification title"
              maxLength={200}
            />
            <input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Who granted it (optional)"
              aria-label="Issuing institution"
              maxLength={200}
            />
            <div>
              <button type="button" className="btn secondary" disabled={busy} onClick={submitQualification}>
                {busy ? 'Saving…' : 'Record it as pending'}
              </button>
            </div>
          </div>
        </details>
      </div>

      <div className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0 }}>What you must stand aside from</h3>
          <span className="badge neutral">{entry.conflicts.length}</span>
        </div>

        {entry.conflicts.length === 0 ? (
          <p className="empty">
            No declarations. Declare one the moment something you are asked to review
            is not impartial work — a course you wrote, a relative, a school you are
            paid by.
          </p>
        ) : (
          <ul className="lessons">
            {entry.conflicts.map((c) => (
              <li key={c.id}>
                <span>
                  {CONFLICT_TYPE_LABEL[c.conflictType as keyof typeof CONFLICT_TYPE_LABEL] ?? c.conflictType}
                  {' · '}{c.description}
                  {c.assessedByName ? ` · assessed by ${c.assessedByName}` : ''}
                  {c.resolutionNotes ? ` · ${c.resolutionNotes}` : ''}
                </span>
                <span className={`badge ${BARRING_CONFLICT_STATUSES.includes(c.status) ? 'warn' : 'ok'}`}>
                  {CONFLICT_STATUS_LABEL[c.status]}
                </span>
              </li>
            ))}
          </ul>
        )}

        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
            Declare a conflict
          </summary>
          <div className="stack" style={{ marginTop: '0.75rem' }}>
            <p className="meta" style={{ marginTop: 0 }}>
              Declaring one bars you from an assignment immediately, before anybody
              has read it, and stays barring until a governance admin hears it. That
              is the point: a conflict heard later is worth more than a review
              published sooner.
            </p>
            <select
              value={conflictType}
              onChange={(e) => setConflictType(e.target.value)}
              aria-label="Kind of conflict"
            >
              {CONFLICT_TYPES.map((t) => (
                <option key={t} value={t}>{CONFLICT_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What the conflict is, in your own words"
              aria-label="Describe the conflict"
              maxLength={2000}
              style={{ width: '100%' }}
            />
            <div>
              <button type="button" className="btn secondary" disabled={busy} onClick={submitConflict}>
                {busy ? 'Declaring…' : 'Declare it'}
              </button>
            </div>
          </div>
        </details>
      </div>

      {notice(error)}
    </div>
  );
}
