'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrollableLearner } from '@/lib/enrolment';
import { type JoinableCohort, cohortJoinWindowOpen } from '@/lib/cohorts';
import { LocalTime } from '@/components/local-time';
import { classOutcomeOf, type ClassLines, type ClassWords } from '@/lib/course-parts';
import { fill } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';

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
 * The classes a learner or guardian can join, and how full each one is.
 *
 * Fullness comes from `cohort_places()`, which returns counts and no identities:
 * a joiner may know that three of twelve places are taken and may not know whose
 * children took them, because `cohort_members_read` is deliberately narrower than
 * `cohorts_read`. A class that is full says so instead of offering a button that
 * `join_cohort()` would refuse for spare capacity.
 *
 * It carries no sentence of its own: the course page hands it `words` in the
 * reader's language. A refusal is said by its name (`classOutcomeOf`), and a
 * reply that names nothing this page knows is "could not be confirmed, reload":
 * the route's English sentence is never printed. A class's title and
 * description are the teacher's and are shown as written.
 *
 * It writes no number either. Every sentence with a count or a version in it
 * arrives finished in `lines`, by the class's id: a browser's copy of a
 * language can be thinner than the server's, and the two would disagree. The
 * moments are the exception (`LocalTime`): only a browser knows the zone.
 */
export function CohortBrowser({
  cohortsEnabled,
  cohorts,
  learners,
  locale,
  words,
  lines,
}: {
  cohortsEnabled: boolean;
  cohorts: JoinableCohort[];
  learners: EnrollableLearner[];
  /** The language the words are in, for the moments. */
  locale: LocaleCode;
  words: ClassWords;
  /** The sentences with a number in them, by the class's id. */
  lines: Record<string, ClassLines>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!cohortsEnabled && cohorts.length === 0) return null;

  function learnerFor(cohort: JoinableCohort) {
    const id = selected[cohort.id] ?? cohort.joinedLearnerIds[0] ?? learners[0]?.id ?? '';
    return learners.find((l) => l.id === id) ?? null;
  }

  async function act(cohort: JoinableCohort, learnerProfileId: string, action: 'join' | 'leave') {
    setBusy(`${cohort.id}-${action}`);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/cohorts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, cohortId: cohort.id, learnerProfileId }),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; code?: unknown };
      if (response.ok && result.ok === true) {
        setMessage(action === 'join' ? words.joinedDone : words.leftDone);
      } else {
        const outcome = classOutcomeOf(response.status, result.code);
        setError(outcome === 'unconfirmed' ? words.unconfirmed : words.refusals[outcome]);
      }
    } catch {
      setError(words.unconfirmed);
    } finally {
      // Whatever was said, the page is drawn again from what the database holds.
      router.refresh();
      setBusy(null);
    }
  }

  /** When the class stops taking joiners, in words. */
  function registration(cohort: JoinableCohort): ReactNode {
    const closes = new Date(cohort.joinClosesAt).getTime();
    const starts = new Date(cohort.startsAt).getTime();
    if (Date.now() > closes) return words.regClosed;
    return Math.abs(closes - starts) < 60_000
      ? words.regAtStart
      : withMoment(words.regCloses, cohort.joinClosesAt, locale);
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '.75rem' }} aria-labelledby="cohort-options-title">
      <h2 id="cohort-options-title" style={{ margin: 0 }}>{words.title}</h2>
      <p className="muted" style={{ margin: 0 }}>{words.body}</p>
      {!cohortsEnabled && <div className="notice warn">{words.paused}</div>}
      {cohorts.length === 0 ? (
        <p className="empty">{words.none}</p>
      ) : cohorts.map((cohort) => {
        const learner = learnerFor(cohort);
        const joined = learner ? cohort.joinedLearnerIds.includes(learner.id) : false;
        const eligible = learner ? cohort.eligibleLearnerIds.includes(learner.id) : false;
        const open = cohortJoinWindowOpen(cohort);
        const line = lines[cohort.id];
        return (
          <article key={cohort.id} className="card" style={{ display: 'grid', gap: '.5rem' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* `.row` pins its first child to a label's width; this one is the
                  title and four facts, so it takes the room the badge leaves. */}
              <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <h3 style={{ margin: 0 }} dir="auto">{cohort.title}</h3>
                <p className="muted" style={{ margin: '.25rem 0 0' }}>
                  {line?.version && <>{line.version} · </>}
                  {withMoment(words.starts, cohort.startsAt, locale)}
                  {' · '}
                  {cohort.endsAt ? withMoment(words.ends, cohort.endsAt, locale) : words.noEnd}
                  {line && <>{' · '}{line.places}</>}
                  {' · '}{registration(cohort)}
                </p>
              </div>
              <span className="badge neutral">
                {cohort.places.full ? words.badgeFull : open ? words.badgeOpen : words.regClosed}
              </span>
            </div>
            {cohort.description && <p style={{ margin: 0 }} dir="auto">{cohort.description}</p>}

            {learners.length > 1 && (
              <div>
                <label htmlFor={`who-${cohort.id}`}>{words.who}</label>
                <select
                  id={`who-${cohort.id}`}
                  value={learner?.id ?? ''}
                  onChange={(e) => setSelected({ ...selected, [cohort.id]: e.target.value })}
                >
                  {learners.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.isSelf ? fill(words.me, { name: l.name }) : l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!learner ? (
              <p className="muted" style={{ margin: 0 }}>{words.needProfile}</p>
            ) : joined ? (
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge" style={{ flex: '0 1 auto' }}>
                  {learner.isSelf ? words.joinedSelf : fill(words.joinedFor, { name: learner.name })}
                </span>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ width: 'auto', margin: 0 }}
                  disabled={busy === `${cohort.id}-leave`}
                  onClick={() => act(cohort, learner.id, 'leave')}
                >
                  {busy === `${cohort.id}-leave` ? words.leaving : words.leave}
                </button>
              </div>
            ) : !cohortsEnabled ? null : eligible && open ? (
              cohort.places.full ? (
                // The count is why the button is not here: `join_cohort()` would
                // refuse it for spare capacity, and being refused after choosing a
                // class and a learner reads as a broken site.
                <p className="muted" style={{ margin: 0 }}>
                  {line?.full ?? words.refusals.full}
                </p>
              ) : (
                <button
                  type="button"
                  className="btn"
                  style={{ justifySelf: 'start' }}
                  disabled={busy === `${cohort.id}-join`}
                  onClick={() => act(cohort, learner.id, 'join')}
                >
                  {busy === `${cohort.id}-join`
                    ? words.joining
                    : learner.isSelf ? words.joinSelf : fill(words.joinFor, { name: learner.name })}
                </button>
              )
            ) : eligible ? (
              // The class is still running; it simply stopped taking joiners.
              // Saying "closed" would read as the class being over.
              <p className="muted" style={{ margin: 0 }}>
                {cohort.endsAt ? words.stoppedRunning : words.stopped}
              </p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {!line
                  ? words.refusals.not_enrolled
                  : learner.isSelf
                    ? line.needEnrolSelf
                    : fill(line.needEnrolFor, { name: learner.name })}
              </p>
            )}
          </article>
        );
      })}
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
      {cohortsEnabled && cohorts.length > 0 && (
        <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
          {words.foot} <Link href="/learn">{words.learning}</Link>
        </p>
      )}
    </section>
  );
}
