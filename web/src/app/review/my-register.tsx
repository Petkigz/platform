'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BARRING_CONFLICT_STATUSES,
  BIO_MAX,
  CONFLICT_TYPES,
  QUALIFICATION_TYPES,
  type ReviewerRegisterEntry,
  type SubjectAreaOption,
} from '@/lib/review';
import {
  checkConflict,
  checkQualification,
  checkReviewerBio,
  isRegisterRefusal,
  registerRefusalSentence,
  type RegisterFailure,
  type RegisterWords,
} from '@/lib/review-register';

type RegisterForm = 'apply' | 'qualification' | 'conflict';

/**
 * The reviewer's own entry on the register.
 *
 * Three things can be done here and no more: put yourself forward, say what you are
 * qualified for, and stand aside from something you cannot judge impartially. What
 * cannot be done here is the point of the split — nobody can verify themselves, and
 * nobody can grant themselves a subject. Those are on `/admin/reviewers`.
 *
 * A declaration made here bars an assignment straight away, before anybody has read
 * it: `validate_review_assignment()` refuses while a declaration is `declared`,
 * `under_assessment` or `disqualifying`. That is deliberate. A conflict heard later
 * is worth more than a review published sooner.
 *
 * Since 2026-11-27 every sentence here is handed over by the page, in the
 * reader's language, and a refusal is said by the name the route gives it;
 * the database's own sentence is not printed. Three things changed with
 * that. A reply that is no answer (a gateway's page, a connection that
 * went) says nobody can tell whether it was recorded, because a declaration
 * bars an assignment from the moment it exists. What was typed is kept
 * unless it was recorded; until then a refused qualification or declaration
 * emptied its boxes. And a request that never came back no longer leaves
 * every button disabled.
 */
export function MyRegister({
  entry,
  subjects,
  words,
}: {
  entry: ReviewerRegisterEntry | null;
  subjects: SubjectAreaOption[];
  words: RegisterWords;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  // One refusal at a time, shown under the form it answers: at the foot of the
  // register it was a screen away from the button on a phone.
  const [error, setError] = useState<{ form: RegisterForm; text: string } | null>(null);

  const [bio, setBio] = useState('');
  const [qualificationType, setQualificationType] = useState<string>(QUALIFICATION_TYPES[0] ?? '');
  const [title, setTitle] = useState('');
  const [institution, setInstitution] = useState('');
  // A qualification without a subject can never authorise anything, so there
  // is no empty default: the first subject is chosen and the person changes it.
  const [subjectAreaId, setSubjectAreaId] = useState(subjects[0]?.id ?? '');
  const [conflictType, setConflictType] = useState<string>(CONFLICT_TYPES[0] ?? '');
  const [description, setDescription] = useState('');

  const refuse = (form: RegisterForm, failure: Pick<RegisterFailure, 'code' | 'max'>) =>
    setError({ form, text: registerRefusalSentence(words, failure) });

  /** True when it was recorded. */
  async function post(form: RegisterForm, payload: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/review/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown; max?: unknown } | null;
      if (json?.ok === true) {
        startTransition(() => router.refresh());
        return true;
      }
      // A reply with no name on it is not a refusal anybody can vouch for.
      refuse(form, isRegisterRefusal(json?.code)
        ? { code: json.code, max: typeof json.max === 'number' ? json.max : undefined }
        : { code: 'unsure' });
      return false;
    } catch {
      refuse(form, { code: 'unsure' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const notice = (form: RegisterForm) =>
    error?.form === form ? <p className="danger register-notice" role="alert">{error.text}</p> : null;

  if (!entry) {
    return (
      <div className="card" data-register="apply">
        <div className="outline-h register-head">
          <h3>{words.applyHead}</h3>
          <span className="badge neutral">{words.notOn}</span>
        </div>

        <p className="meta">{words.applyWhy}</p>

        <label htmlFor="register-bio" className="meta">{words.bioLabel}</label>
        <textarea
          id="register-bio"
          value={bio}
          maxLength={BIO_MAX}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          dir="auto"
        />

        <div className="register-send">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={async () => {
              const checked = checkReviewerBio(bio);
              if (!checked.ok) { refuse('apply', checked); return; }
              await post('apply', { action: 'register', bio: checked.value });
            }}
          >
            {busy ? words.working : words.apply}
          </button>
          {notice('apply')}
        </div>
      </div>
    );
  }

  const reviewer = entry.reviewer;

  async function submitQualification() {
    const checked = checkQualification({ qualificationType, title, institution, subjectAreaId });
    if (!checked.ok) { refuse('qualification', checked); return; }
    const recorded = await post('qualification', { action: 'qualification', reviewerProfileId: reviewer.reviewerProfileId, ...checked.value });
    if (!recorded) return;
    setTitle('');
    setInstitution('');
  }

  async function submitConflict() {
    const checked = checkConflict({ conflictType, description });
    if (!checked.ok) { refuse('conflict', checked); return; }
    // No version id: this is a standing declaration about you, not about one
    // course. A declaration about a course you have been offered is made from
    // that offer, where the version is known.
    const recorded = await post('conflict', { action: 'conflict', conflictType: checked.value.conflictType, description: checked.value.description });
    if (!recorded) return;
    setDescription('');
  }

  const status = words.reviewerStatus[reviewer.status];

  return (
    <div className="stack register" data-register="entry">
      <div className="card">
        <div className="outline-h register-head">
          <h3>{words.placeHead}</h3>
          {status ? <span className={`badge ${reviewer.status === 'active' ? 'ok' : 'neutral'}`}>{status}</span> : null}
        </div>

        <dl className="facts">
          <div>
            <dt>{words.applied}</dt>
            <dd>{words.days.applied}</dd>
          </div>
          <div>
            <dt>{words.checked}</dt>
            <dd>{words.days.checked || words.notChecked}</dd>
          </div>
          {words.days.checked && reviewer.verifiedByName ? (
            <div>
              <dt>{words.checkedBy}</dt>
              <dd><bdi>{reviewer.verifiedByName}</bdi></dd>
            </div>
          ) : null}
        </dl>

        {reviewer.status !== 'active' && <p className="meta">{words.notActive}</p>}
      </div>

      <div className="card" data-register="qualifications">
        <div className="outline-h register-head">
          <h3>{words.qualHead}</h3>
          <span className="badge neutral">{words.counts.qualifications}</span>
        </div>

        {entry.qualifications.length === 0 ? (
          <p className="empty">{words.qualNone}</p>
        ) : (
          <ul className="lessons register-list">
            {entry.qualifications.map((q) => {
              const kind = words.qualificationType[q.qualificationType as keyof RegisterWords['qualificationType']];
              const state = words.qualificationStatus[q.verificationStatus];
              return (
                <li key={q.id}>
                  <span className="register-facts">
                    {kind ? <span>{kind}</span> : null}
                    <bdi>{q.title ?? words.untitled}</bdi>
                    {q.institution ? <bdi>{q.institution}</bdi> : null}
                    {q.subjectName ? <bdi>{q.subjectName}</bdi> : null}
                  </span>
                  {state ? (
                    <span className={`badge ${q.verificationStatus === 'verified' ? 'ok' : q.verificationStatus === 'pending' ? 'warn' : 'neutral'}`}>{state}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <p className="meta">{words.qualRule}</p>

        <details>
          <summary className="register-summary">{words.qualRecord}</summary>
          <div className="stack register-form">
            <div className="register-pair">
              <select value={qualificationType} onChange={(e) => setQualificationType(e.target.value)} aria-label={words.qualKind}>
                {QUALIFICATION_TYPES.map((t) => (
                  <option key={t} value={t}>{words.qualificationType[t]}</option>
                ))}
              </select>
              <select value={subjectAreaId} onChange={(e) => setSubjectAreaId(e.target.value)} aria-label={words.qualSubject} required>
                {subjects.length === 0 && <option value="">{words.noSubjects}</option>}
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={words.qualTitleHint}
              aria-label={words.qualTitle}
              maxLength={200}
              dir="auto"
            />
            <input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder={words.qualByHint}
              aria-label={words.qualBy}
              maxLength={200}
              dir="auto"
            />
            <div className="register-send">
              <button type="button" className="btn secondary" disabled={busy} onClick={submitQualification}>
                {busy ? words.working : words.qualSave}
              </button>
              {notice('qualification')}
            </div>
          </div>
        </details>
      </div>

      <div className="card" data-register="conflicts">
        <div className="outline-h register-head">
          <h3>{words.standHead}</h3>
          <span className="badge neutral">{words.counts.conflicts}</span>
        </div>

        {entry.conflicts.length === 0 ? (
          <p className="empty">{words.standNone}</p>
        ) : (
          <ul className="lessons register-list">
            {entry.conflicts.map((c) => {
              const kind = words.conflictType[c.conflictType as keyof RegisterWords['conflictType']];
              const state = words.conflictStatus[c.status];
              return (
                <li key={c.id}>
                  <span className="register-facts">
                    {kind ? <span>{kind}</span> : null}
                    <bdi>{c.description}</bdi>
                    {c.assessedByName ? <span>{words.assessedBy.split('{name}')[0]}<bdi>{c.assessedByName}</bdi>{words.assessedBy.split('{name}')[1]}</span> : null}
                    {c.resolutionNotes ? <bdi>{c.resolutionNotes}</bdi> : null}
                  </span>
                  {state ? <span className={`badge ${BARRING_CONFLICT_STATUSES.includes(c.status) ? 'warn' : 'ok'}`}>{state}</span> : null}
                </li>
              );
            })}
          </ul>
        )}

        <details>
          <summary className="register-summary">{words.declare}</summary>
          <div className="stack register-form">
            <p className="meta">{words.declareWhy}</p>
            <select value={conflictType} onChange={(e) => setConflictType(e.target.value)} aria-label={words.conflictKind}>
              {CONFLICT_TYPES.map((t) => (
                <option key={t} value={t}>{words.conflictType[t]}</option>
              ))}
            </select>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={words.describeHint}
              aria-label={words.describe}
              maxLength={2000}
              dir="auto"
            />
            <div className="register-send">
              <button type="button" className="btn secondary" disabled={busy} onClick={submitConflict}>
                {busy ? words.working : words.declareIt}
              </button>
              {notice('conflict')}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
