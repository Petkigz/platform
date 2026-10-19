'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type LearnerOption = { id: string; name: string; isSelf: boolean };

/**
 * The enrol button.
 *
 * One button, three honest states. It never pretends a paid course is free,
 * and it never shows a checkout button that cannot work — no payment provider
 * is connected yet, so a paid course says so plainly instead of failing.
 *
 * When the account has children, the button first asks *who is learning*. A
 * child is a learner profile under a family, never a user account (D2), so a
 * child cannot sign in and enrol themselves — the parent has to be able to do
 * it, and the enrolment has to be visibly the child's rather than silently the
 * parent's.
 */
export function EnrolButton({
  courseId,
  state,
  signedIn,
  label,
  learners,
}: {
  courseId: string;
  state: 'free' | 'paid' | 'entitled';
  signedIn: boolean;
  label: string;
  learners: LearnerOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [guardianReviewRequired, setGuardianReviewRequired] = useState(false);
  const [tone, setTone] = useState<'info' | 'error'>('info');
  const [learnerId, setLearnerId] = useState<string>(
    learners[0]?.id ?? '',
  );

  if (!signedIn) {
    return (
      <div className="hero-actions">
        <a href={`/sign-up?next=/courses/${courseId}`} className="btn">
          Create an account to enrol
        </a>
        <a href={`/sign-in?next=/courses/${courseId}`} className="btn secondary">
          I already have an account
        </a>
      </div>
    );
  }

  if (state === 'paid') {
    // This used to be a disabled button with a notice saying checkout was not
    // open. Now there is a checkout, so it links there. Whether a provider is
    // configured is the buy page's problem, not this button's — it reports that
    // plainly, and it still creates the order so the attempt is recorded.
    return (
      <div>
        <div className="hero-actions">
          <a href={`/courses/${courseId}/buy`} className="btn">
            Buy — {label}
          </a>
          <a href="/learn" className="btn secondary">
            Go to my learning
          </a>
        </div>
      </div>
    );
  }

  async function enrol() {
    setMessage(null);
    const res = await fetch('/api/enrol', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // learnerId may be a child's. The route passes it through and
      // course_enrolments_insert decides whether this caller may act for that
      // learner — the check is not duplicated here.
      body: JSON.stringify({ courseId, learnerProfileId: learnerId || undefined }),
    });
    const json = (await res.json()) as { ok: boolean; code?: string; message?: string };

    if (json.ok) {
      startTransition(() => router.push('/learn'));
      return;
    }
    setGuardianReviewRequired(json.code === 'guardian_verification_required');
    setTone(res.status === 402 ? 'info' : 'error');
    setMessage(json.message ?? 'Enrolment failed. Please try again.');
  }

  return (
    <div>
      {learners.length > 1 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label className="eyebrow" htmlFor="who-is-learning">
            Who is learning?
          </label>
          <select
            id="who-is-learning"
            value={learnerId}
            onChange={(e) => setLearnerId(e.target.value)}
          >
            {learners.map((l) => (
              <option key={l.id} value={l.id}>
                {l.isSelf ? `${l.name} (me)` : l.name}
              </option>
            ))}
          </select>
          <p className="muted">
            Enrolling for a child puts the course on their record, not yours.
          </p>
        </div>
      )}

      <div className="hero-actions">
        <button type="button" className="btn" onClick={enrol} disabled={pending}>
          {pending
            ? 'Enrolling…'
            : state === 'entitled'
              ? 'Continue enrolment'
              : 'Enrol — free'}
        </button>
        <a href="/learn" className="btn secondary">Go to my learning</a>
      </div>
      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} style={{ marginTop: '0.75rem' }}>
          {message}
          {guardianReviewRequired && (
            <p style={{ margin: '0.5rem 0 0' }}>
              <Link href="/family/guardians">Open guardian access</Link> to request review.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
