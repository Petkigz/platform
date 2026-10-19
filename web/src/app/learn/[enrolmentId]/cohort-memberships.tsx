'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CourseCohort } from '@/lib/cohorts';

export function CohortMemberships({
  enabled,
  cohorts,
  learnerProfileId,
}: {
  enabled: boolean;
  cohorts: CourseCohort[];
  learnerProfileId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (cohorts.length === 0) return null;

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
      const result = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? 'Could not leave this class.');
      setMessage('Left the class.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not leave this class.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '.75rem' }}>
      <h2 style={{ margin: 0 }}>Dated classes for this enrolment</h2>
      {!enabled && (
        <div className="notice warn">Cohort joining is paused. You can still leave a class you already joined.</div>
      )}
      {cohorts.map((cohort) => (
        <article key={cohort.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <strong>{cohort.title}</strong>
            <div className="muted" style={{ fontSize: '.85rem' }}>
              {cohort.status} · starts {new Date(cohort.startsAt).toLocaleString()}
              {cohort.endsAt ? ` · ends ${new Date(cohort.endsAt).toLocaleString()}` : ''}
            </div>
          </div>
          <button type="button" className="btn ghost" disabled={busy === cohort.id} onClick={() => leave(cohort.id)}>
            {busy === cohort.id ? 'Leaving…' : 'Leave class'}
          </button>
        </article>
      ))}
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
    </section>
  );
}
