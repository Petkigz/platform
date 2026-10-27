'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Asking for a sponsored seat.
 *
 * Two choices and one sentence. The learner list is the caller's own learners
 * and their family's, exactly as checkout offers them; the database checks the
 * same thing again, so a tampered request is refused rather than honoured.
 *
 * The reason is deliberately a plain box rather than a set of categories: the
 * person deciding needs to read what somebody actually wrote, and a dropdown of
 * "reasons" would be a form of its own invention.
 */
export function ApplyForm({
  learners,
  courses,
}: {
  learners: { id: string; name: string }[];
  courses: { id: string; title: string; audience: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [learnerId, setLearnerId] = useState(learners[0]?.id ?? '');
  const [courseId, setCourseId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch('/api/sponsorship', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'apply', learnerProfileId: learnerId, courseId, reason }),
      });
      const out = (await res.json()) as { ok?: boolean; message?: string };
      if (!out.ok) {
        setError(out.message ?? 'That did not work.');
        return;
      }
      setDone(
        'Asked. It is in the queue for the owner or finance to read, and you will see the ' +
          'answer — with a reason — on your account page.',
      );
      setReason('');
      startTransition(() => router.refresh());
    } catch {
      setError('The request could not be sent. Nothing was created.');
    } finally {
      setBusy(false);
    }
  }

  if (learners.length === 0) {
    return (
      <div className="notice">
        There is no learner on this account yet, so there is nobody to ask for. A learner profile
        is created when you enrol in a course, or a child is added in your family.
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="notice">
        No course is on sale at the moment, so there is nothing to ask for. The catalogue will show
        them as they are published.
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ display: 'grid', gap: '0.65rem', maxWidth: '42rem' }}>
      <label htmlFor="apply-learner">Who is the course for?</label>
      <select
        id="apply-learner"
        value={learnerId}
        onChange={(event) => setLearnerId(event.target.value)}
        disabled={busy || pending}
        required
      >
        {learners.map((learner) => (
          <option key={learner.id} value={learner.id}>
            {learner.name}
          </option>
        ))}
      </select>

      <label htmlFor="apply-course">Which course?</label>
      <select
        id="apply-course"
        value={courseId}
        onChange={(event) => setCourseId(event.target.value)}
        disabled={busy || pending}
        required
      >
        <option value="">Choose a course</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </select>

      <label htmlFor="apply-reason">What is the situation?</label>
      <textarea
        id="apply-reason"
        rows={4}
        maxLength={2000}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        disabled={busy || pending}
        required
        placeholder="A few sentences is enough."
      />
      <p className="muted" style={{ margin: '-0.3rem 0 0' }}>
        Read by the owner or finance, and by nobody else. Not shown to whoever pays for the seat.
      </p>

      {error && <div className="notice error" role="alert">{error}</div>}
      {done && <div className="notice" role="status">{done}</div>}

      <button
        type="submit"
        className="btn"
        disabled={busy || pending || !courseId || reason.trim() === ''}
      >
        {busy ? 'Sending…' : 'Ask for this seat'}
      </button>
    </form>
  );
}
