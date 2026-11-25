'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isEnrolRefusal, track } from '@/lib/analytics';
import { enrolOutcomeOf, type EnrolCode, type EnrolLearner, type EnrolWords } from '@/lib/enrol-outcome';

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
 *
 * **It carries no sentence of its own.** Every word is handed in by the page,
 * in the reader's language (`EnrolWords`), and so is the note about ages for
 * each learner, made on the server. A refusal is said by the `code` the route
 * sends, never by the route's English sentence; a reply that is not a refusal
 * this button knows is "we could not confirm", which sends the reader to look
 * at their learning before pressing again.
 */
export function EnrolButton({
  courseId,
  state,
  signedIn,
  label,
  learners,
  words,
}: {
  courseId: string;
  state: 'free' | 'paid' | 'entitled' | 'not_sold_here';
  signedIn: boolean;
  label: string;
  learners: EnrolLearner[];
  words: EnrolWords;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [refusal, setRefusal] = useState<EnrolCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [learnerId, setLearnerId] = useState<string>(
    learners[0]?.id ?? '',
  );
  const chosen = learners.find((l) => l.id === learnerId) ?? null;
  const mismatch = chosen?.outside ?? null;

  if (!signedIn) {
    return (
      <div className="hero-actions">
        <a href={`/sign-up?next=/courses/${courseId}`} className="btn">
          {words.createToEnrol}
        </a>
        <a href={`/sign-in?next=/courses/${courseId}`} className="btn secondary">
          {words.haveAccount}
        </a>
      </div>
    );
  }

  if (state === 'not_sold_here') {
    // On sale, but not on terms this buyer can accept. The database would
    // refuse a free enrolment of a sold course anyway; this is the sentence
    // rather than the decision, and it names the reason.
    return (
      <div>
        <p className="notice warn" style={{ marginTop: 0 }}>
          {/* On a line of its own: a full stop is not the same mark in every script. */}
          <strong style={{ display: 'block' }}>{label}</strong>
          {words.notSoldHere}{' '}
          <a href="/support">{words.contact}</a>
        </p>
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
            {words.buy}
          </a>
          <a href="/learn" className="btn secondary">
            {words.goLearning}
          </a>
        </div>
      </div>
    );
  }

  async function enrol() {
    setRefusal(null);
    setBusy(true);
    let status = 0;
    let json: { ok?: boolean; code?: string } = {};
    try {
      const res = await fetch('/api/enrol', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // learnerId may be a child's. The route passes it through and
        // course_enrolments_insert decides whether this caller may act for that
        // learner — the check is not duplicated here.
        body: JSON.stringify({ courseId, learnerProfileId: learnerId || undefined }),
      });
      status = res.status;
      // A reply that is not JSON is a page from something in front of the site.
      json = ((await res.json().catch(() => ({}))) ?? {}) as { ok?: boolean; code?: string };
    } catch {
      // The request never got an answer. That is not a refusal.
    } finally {
      setBusy(false);
    }

    if (status >= 200 && status < 300 && json.ok === true) {
      startTransition(() => router.push('/learn'));
      return;
    }
    setRefusal(enrolOutcomeOf(status, json.code));

    // A refusal leaves no row anywhere — that is what a refusal is — so this is the
    // only place the platform can learn that somebody wanted to start and could not.
    // `isEnrolRefusal` keeps the success case and the setup step out of the count.
    if (isEnrolRefusal(json.code)) {
      void track({
        code: 'enrol.refused',
        subjectId: courseId,
        properties: { reason: json.code },
      });
    }
  }

  return (
    <div>
      {learners.length > 1 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label className="eyebrow" htmlFor="who-is-learning">
            {words.who}
          </label>
          <select
            id="who-is-learning"
            value={learnerId}
            onChange={(e) => setLearnerId(e.target.value)}
          >
            {learners.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="muted">{words.forChild}</p>
        </div>
      )}

      {mismatch && (
        <p className="muted">
          {chosen && !chosen.isSelf ? (
            <>
              <bdi>{chosen.name}</bdi>:{' '}
            </>
          ) : null}
          {mismatch} {words.outsideNote}
        </p>
      )}

      <div className="hero-actions">
        <button type="button" className="btn" onClick={enrol} disabled={pending || busy}>
          {pending || busy
            ? words.enrolling
            : state === 'entitled'
              ? words.continueEnrolment
              : words.enrolFree}
        </button>
        <a href="/learn" className="btn secondary">{words.goLearning}</a>
      </div>
      {refusal && (
        <div
          role="alert"
          className={`notice ${refusal === 'payment_required' ? 'warn' : 'error'}`}
          style={{ marginTop: '0.75rem' }}
        >
          {words.refusals[refusal]}
          {refusal === 'guardian_verification_required' && (
            <p style={{ margin: '0.5rem 0 0' }}>
              <Link href="/family/guardians">{words.openGuardian}</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
