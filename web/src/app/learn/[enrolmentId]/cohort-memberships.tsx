'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CohortStatus, CourseCohort } from '@/lib/cohorts';
import { LocalTime } from '@/components/local-time';
import type { LocaleCode } from '@/lib/i18n/locales';

/**
 * Every sentence this list says, handed in by the course page. They are not
 * asked of the catalogue here: the course sentences are not in what a browser
 * is sent.
 */
export type CohortWords = {
  heading: string;
  paused: string;
  statusDraft: string;
  statusOpen: string;
  statusClosed: string;
  statusCancelled: string;
  /** `{date}` */
  starts: string;
  /** `{date}` */
  ends: string;
  leave: string;
  leaving: string;
  left: string;
  leaveFailed: string;
};

/** A sentence with a moment in it: the words either side of `{date}`. */
function withMoment(sentence: string, iso: string, locale: LocaleCode) {
  const at = sentence.indexOf('{date}');
  if (at === -1) return <>{sentence} <LocalTime iso={iso} locale={locale} /></>;
  return (
    <>
      {sentence.slice(0, at)}
      <LocalTime iso={iso} locale={locale} />
      {sentence.slice(at + '{date}'.length)}
    </>
  );
}

/**
 * The dated classes a learner is in for this enrolment, and the way out of
 * each.
 *
 * When leaving does not go through, the learner is told one thing: that it
 * could not be confirmed, and to reload and look. The server's English
 * sentence is not printed. That is said for a refusal as well as for a lost
 * reply, because the page cannot tell a reader of every language which it
 * was, and "reload and look" is right for both.
 */
export function CohortMemberships({
  enabled,
  cohorts,
  learnerProfileId,
  locale,
  words,
}: {
  enabled: boolean;
  cohorts: CourseCohort[];
  learnerProfileId: string;
  /** The language the words are in, for dates. */
  locale: LocaleCode;
  words: CohortWords;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (cohorts.length === 0) return null;

  const statusWords: Record<CohortStatus, string> = {
    draft: words.statusDraft,
    open: words.statusOpen,
    closed: words.statusClosed,
    cancelled: words.statusCancelled,
  };

  async function leave(cohortId: string) {
    setBusy(cohortId);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/cohorts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'leave', cohortId, learnerProfileId }),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean };
      if (!response.ok || result.ok !== true) setError(words.leaveFailed);
      else setMessage(words.left);
      router.refresh();
    } catch {
      setError(words.leaveFailed);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '.75rem' }}>
      <h2 style={{ margin: 0 }}>{words.heading}</h2>
      {!enabled && <div className="notice warn">{words.paused}</div>}
      {cohorts.map((cohort) => (
        <article key={cohort.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <strong dir="auto">{cohort.title}</strong>
            <div className="muted" style={{ fontSize: '.85rem' }}>
              {statusWords[cohort.status] ?? words.statusClosed} · {withMoment(words.starts, cohort.startsAt, locale)}
              {cohort.endsAt ? <> · {withMoment(words.ends, cohort.endsAt, locale)}</> : null}
            </div>
          </div>
          <button type="button" className="btn ghost" disabled={busy === cohort.id} onClick={() => leave(cohort.id)}>
            {busy === cohort.id ? words.leaving : words.leave}
          </button>
        </article>
      ))}
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
    </section>
  );
}
