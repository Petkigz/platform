'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  describeRetentionRun,
  dueTotal,
  nextDueSentence,
  postRetentionRun,
  retentionDay,
  retentionGateSentence,
  retentionHeadline,
  retentionPolicyLines,
  type RetentionPlan,
  type RetentionRun,
} from '@/lib/retention';

/**
 * Reading the clock, and — for the owner — winding it.
 *
 * The press asks twice, because it is the one control in the product that
 * destroys a record on purpose. The second press is the confirmation inline
 * rather than a `confirm()` dialog: a modal can be dismissed with a stray key
 * and says nothing afterwards, while this restates what it is about to delete.
 *
 * What the run did is printed from the numbers the database returned, never from
 * what the screen expected to happen. A run that deletes forty rows when the
 * plan said thirty-nine is the interesting case, and a screen that reports its
 * own prediction would hide it.
 */
export function RetentionConsole({
  plan,
  canRun,
}: {
  plan: RetentionPlan;
  canRun: boolean;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [run, setRun] = useState<RetentionRun | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const total = dueTotal(plan);

  async function press() {
    setMessage(null); setRun(null); setBusy(true);
    try {
      const result = await postRetentionRun();
      setArmed(false);
      if (!result.ok) {
        setMessage(result.message);
      } else {
        setRun(result.run);
      }
      startTransition(() => router.refresh());
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="notice" style={{ marginTop: '1.5rem' }}>
        {retentionHeadline(plan)}
      </div>

      <p className="muted">These counts cover support cases, screening and child records only. Cases paused from scheduled cleanup are excluded from the case count. Coursework files have a separate register under Handed-in files; a cleanup may also tombstone due coursework.</p>

      <div className="stats" style={{ marginTop: '1.5rem' }}>
        <div>
          <div className="n">{plan.supportCases.due}</div>
          <div className="l">Cases due</div>
        </div>
        <div>
          <div className="n">{plan.screenings.due}</div>
          <div className="l">Screening records due</div>
        </div>
        <div>
          <div className="n">{plan.supportCases.waiting.count}</div>
          <div className="l">Cases never closed</div>
        </div>
        <div>
          <div className="n">{plan.learnerRecords.due}</div>
          <div className="l">Child records due</div>
        </div>
        <div>
          <div className="n">{total}</div>
          <div className="l">Total past due</div>
        </div>
      </div>

      {plan.learnerRecords.erasedToDate > 0 && (
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          {plan.learnerRecords.erasedToDate} child
          {plan.learnerRecords.erasedToDate === 1 ? ' record has' : ' records have'} already been
          erased. Certificates, recovery markers, review records and copies may still retain information; erasure of all data is not verified.
        </p>
      )}

      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>The three clocks</h3>
      </div>
      <div className="card">
        <ul className="lessons">
          {retentionPolicyLines(plan).map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li className="muted">{nextDueSentence(plan)}</li>
          {plan.supportCases.oldestDue && (
            <li className="muted">
              The oldest record waiting was due on {retentionDay(plan.supportCases.oldestDue)}.
              The cleanup rechecks eligibility; records with held coursework may be deferred.
            </li>
          )}
        </ul>
      </div>

      {plan.learnerRecords.waiting.count > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Child profiles with no clock</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {plan.learnerRecords.waiting.note}
          </p>
        </div>
      )}

      {plan.supportCases.waiting.count > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Cases with no clock</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {plan.supportCases.waiting.note}
          </p>
          {plan.supportCases.waiting.oldestCreatedAt && (
            <p className="muted" style={{ marginBottom: 0 }}>
              The oldest was opened on {retentionDay(plan.supportCases.waiting.oldestCreatedAt)}.
            </p>
          )}
        </div>
      )}

      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>Run the cleanup</h3>
      </div>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>{retentionGateSentence(canRun)}</p>

        {message && <p style={{ color: 'var(--danger, #b3261e)' }}>{message}</p>}

        {run && (
          <div className="notice" style={{ marginBottom: '1rem' }}>
            {describeRetentionRun(run)}
          </div>
        )}

        {canRun ? (
          armed ? (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <p style={{ margin: 0 }}>
                Run cleanup for {total === 0 ? 'no records in these three counts' : `${total} past-due record${total === 1 ? '' : 's'}`}? Eligibility is rechecked.
                {' '}Coursework may also be tombstoned, even if these counts are zero. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  disabled={pending || busy}
                  onClick={() => startTransition(() => { void press(); })}
                >
                  {pending || busy ? 'Working…' : 'Yes, run cleanup'}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setArmed(false)}
                  disabled={pending || busy}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn" disabled={pending || busy} onClick={() => setArmed(true)}>
              {total === 0 ? 'Check the clock now' : `Delete the ${total} due record${total === 1 ? '' : 's'}`}
            </button>
          )
        ) : (
          <p className="muted" style={{ marginBottom: 0 }}>
            The cleanup runs from the owner&rsquo;s account, or from a separately configured scheduler. Setting
            <code> CRON_SECRET </code> alone does not schedule a job. Nothing on this page is waiting for a decision
            you can make.
          </p>
        )}
      </div>
    </>
  );
}
