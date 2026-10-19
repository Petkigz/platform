'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrollableLearner } from '@/lib/enrolment';
import {
  type JoinableCohort,
  cohortJoinWindowOpen,
  joinWindowLabel,
} from '@/lib/cohorts';

export function CohortBrowser({
  cohortsEnabled,
  cohorts,
  learners,
}: {
  cohortsEnabled: boolean;
  cohorts: JoinableCohort[];
  learners: EnrollableLearner[];
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
      const result = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? 'That cohort change did not work.');
      setMessage(action === 'join' ? 'Joined this class.' : 'Left this class.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That cohort change did not work.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '.75rem' }} aria-labelledby="cohort-options-title">
      <h2 id="cohort-options-title" style={{ margin: 0 }}>Dated classes</h2>
      <p className="muted" style={{ margin: 0 }}>
        Optional classes follow one exact course version. Joining does not enrol
        anyone in the course; course access is still required first.
      </p>
      {!cohortsEnabled && (
        <div className="notice warn">
          New cohort joining is paused. If you are already in a class, you can
          still leave it here.
        </div>
      )}
      {cohorts.length === 0 ? (
        <p className="empty">No classes are open for joining right now.</p>
      ) : cohorts.map((cohort) => {
        const learner = learnerFor(cohort);
        const joined = learner ? cohort.joinedLearnerIds.includes(learner.id) : false;
        const eligible = learner ? cohort.eligibleLearnerIds.includes(learner.id) : false;
        return (
          <article key={cohort.id} className="card" style={{ display: 'grid', gap: '.5rem' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0 }}>{cohort.title}</h3>
                <p className="muted" style={{ margin: '.25rem 0 0' }}>
                  Version {cohort.versionNumber ?? '?'} · Starts {new Date(cohort.startsAt).toLocaleString()}
                  {cohort.endsAt ? ` · Ends ${new Date(cohort.endsAt).toLocaleString()}` : ' · Open-ended'}
                  {cohort.capacity ? ` · Up to ${cohort.capacity} learners` : ''}
                  {' · '}{joinWindowLabel(cohort)}
                </p>
              </div>
              <span className="badge neutral">
                {cohortJoinWindowOpen(cohort) ? 'Open to joiners' : 'Registration closed'}
              </span>
            </div>
            {cohort.description && <p style={{ margin: 0 }}>{cohort.description}</p>}

            {learners.length > 1 && (
              <div>
                <label htmlFor={`who-${cohort.id}`}>Who is joining?</label>
                <select
                  id={`who-${cohort.id}`}
                  value={learner?.id ?? ''}
                  onChange={(e) => setSelected({ ...selected, [cohort.id]: e.target.value })}
                >
                  {learners.map((l) => (
                    <option key={l.id} value={l.id}>{l.isSelf ? `${l.name} (me)` : l.name}</option>
                  ))}
                </select>
              </div>
            )}

            {!learner ? (
              <p className="muted" style={{ margin: 0 }}>
                Add a learner profile before joining a class.
              </p>
            ) : joined ? (
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="badge">Joined for {learner.isSelf ? 'you' : learner.name}</span>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy === `${cohort.id}-leave`}
                  onClick={() => act(cohort, learner.id, 'leave')}
                >
                  {busy === `${cohort.id}-leave` ? 'Leaving…' : 'Leave class'}
                </button>
              </div>
            ) : !cohortsEnabled ? null : eligible && cohortJoinWindowOpen(cohort) ? (
              <button
                type="button"
                className="btn"
                style={{ justifySelf: 'start' }}
                disabled={busy === `${cohort.id}-join`}
                onClick={() => act(cohort, learner.id, 'join')}
              >
                {busy === `${cohort.id}-join` ? 'Joining…' : `Join for ${learner.isSelf ? 'me' : learner.name}`}
              </button>
            ) : eligible ? (
              // The class is still running; it simply stopped taking joiners.
              // Saying "closed" would read as the class being over.
              <p className="muted" style={{ margin: 0 }}>
                This class stopped accepting joiners{cohort.endsAt ? ' but is still running' : ''}.
                {' '}{joinWindowLabel(cohort)}.
              </p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {learner.isSelf ? 'You need to be enrolled' : `${learner.name} needs to be enrolled`}
                {' '}in version {cohort.versionNumber ?? '?'} first. Enrolment is shown above.
              </p>
            )}
          </article>
        );
      })}
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
      {cohortsEnabled && cohorts.length > 0 && (
        <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
          You only see classes for this course. Learners cannot see anyone else in a class roster.
          <Link href="/learn"> My learning</Link> shows your current enrolments.
        </p>
      )}
    </section>
  );
}
