'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ASK_REASON_MAX, askSeatOutcomeOf, type AskSeatReason } from '@/lib/sponsor-pool-outcome';

/** The words this form says. A script sent to a browser holds no catalogue. */
export type ApplyWords = {
  whoFor: string;
  course: string;
  choose: string;
  reason: string;
  reasonNote: string;
  submit: string;
  sending: string;
  done: string;
  mine: string;
  reasons: Record<AskSeatReason, string>;
};

/**
 * Asking for a sponsored seat.
 *
 * Two choices and a few sentences. The learner list is the caller's own
 * learners and their family's, exactly as checkout offers them; the database
 * checks the same thing again, so a tampered request is refused.
 *
 * The reason is a plain box and not a set of categories: the person deciding
 * needs to read what somebody actually wrote. It takes its own direction
 * (`dir="auto"`), whatever the page's.
 *
 * What the request was answered with is said by its name
 * (`sponsor-pool-outcome.ts`), in the reader's language. The server's own
 * sentence is never shown. A request that got no answer may have been
 * recorded, so it is said as "we could not confirm", with the way to look.
 */
export function ApplyForm({
  learners,
  courses,
  words,
}: {
  learners: { id: string; name: string }[];
  courses: { id: string; title: string }[];
  words: ApplyWords;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [learnerId, setLearnerId] = useState(learners[0]?.id ?? '');
  const [courseId, setCourseId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ tone: 'info' | 'warn' | 'error'; text: string; link: boolean } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaid(null);
    let res: Response;
    try {
      res = await fetch('/api/sponsorship', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'apply', learnerProfileId: learnerId, courseId, reason }),
      });
    } catch {
      setSaid({ tone: 'warn', text: words.reasons.unconfirmed, link: true });
      setBusy(false);
      return;
    }
    const out = (await res.json().catch(() => null)) as { ok?: unknown; reason?: unknown } | null;
    setBusy(false);

    if (res.ok && out?.ok === true) {
      setSaid({ tone: 'info', text: words.done, link: true });
      setReason('');
      setCourseId('');
      startTransition(() => router.refresh());
      return;
    }
    const why = askSeatOutcomeOf(res.status, out?.reason);
    setSaid({
      tone: why === 'unconfirmed' || why === 'off' ? 'warn' : 'error',
      text: words.reasons[why],
      link: why === 'unconfirmed' || why === 'already_asked',
    });
  }

  return (
    <form className="card" onSubmit={submit} style={{ display: 'grid', gap: '0.65rem', maxWidth: '42rem' }}>
      <label htmlFor="apply-learner">{words.whoFor}</label>
      <select id="apply-learner" value={learnerId} onChange={(event) => setLearnerId(event.target.value)} disabled={busy || pending} required>
        {learners.map((learner) => (
          <option key={learner.id} value={learner.id}>
            {learner.name}
          </option>
        ))}
      </select>

      <label htmlFor="apply-course">{words.course}</label>
      <select id="apply-course" value={courseId} onChange={(event) => setCourseId(event.target.value)} disabled={busy || pending} required>
        <option value="">{words.choose}</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </select>

      <label htmlFor="apply-reason">{words.reason}</label>
      <textarea
        id="apply-reason"
        rows={4}
        dir="auto"
        maxLength={ASK_REASON_MAX}
        aria-describedby="apply-reason-note"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        disabled={busy || pending}
        required
      />
      <p id="apply-reason-note" className="muted" style={{ margin: '-0.3rem 0 0' }}>
        {words.reasonNote}
      </p>

      {said && (
        <div
          className={`notice ${said.tone === 'error' ? 'error' : said.tone === 'warn' ? 'warn' : ''}`}
          role={said.tone === 'info' ? 'status' : 'alert'}
          data-ask-said={said.tone}
        >
          {said.text}
          {said.link && (
            <>
              {' '}
              <Link href="/account/sponsorship">{words.mine}</Link>
            </>
          )}
        </div>
      )}

      <button type="submit" className="btn" disabled={busy || pending || !courseId || reason.trim() === ''}>
        {busy ? words.sending : words.submit}
      </button>
    </form>
  );
}
