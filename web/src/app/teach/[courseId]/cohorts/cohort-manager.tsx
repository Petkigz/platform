'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CourseCohort, CohortMemberCounts } from '@/lib/cohorts';

export type CohortVersionOption = { id: string; versionNumber: number; status: string };

export function CohortManager({
  enabled,
  courseId,
  versions,
  cohorts,
  counts,
}: {
  enabled: boolean;
  courseId: string;
  versions: CohortVersionOption[];
  cohorts: CourseCohort[];
  counts: CohortMemberCounts;
}) {
  const router = useRouter();
  const publishedVersions = versions.filter((v) => v.status === 'published');
  const [versionId, setVersionId] = useState(publishedVersions[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function send(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/cohorts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? 'That cohort change did not work.');
      setMessage('Saved.');
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That cohort change did not work.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const ok = await send({
      action: 'create',
      courseId,
      courseVersionId: versionId,
      title,
      description,
      startsAt: startsAt ? new Date(startsAt).toISOString() : '',
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      capacity: capacity || null,
    }, 'create');
    if (ok) {
      setTitle('');
      setDescription('');
      setStartsAt('');
      setEndsAt('');
      setCapacity('');
      setMessage('Draft cohort created. Open it when you are ready for people to join.');
    }
  }

  async function setStatus(cohort: CourseCohort, status: 'open' | 'closed' | 'cancelled') {
    await send({ action: 'set_status', cohortId: cohort.id, status }, `${cohort.id}-${status}`);
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {!enabled && (
        <div className="notice warn">
          Cohort enrollment is switched off. Existing learners can still see and
          leave their class; you can close or cancel a class that is already open.
        </div>
      )}

      {enabled && (
        <form className="card" onSubmit={create} style={{ display: 'grid', gap: '.6rem' }}>
          <h2 style={{ margin: 0 }}>Create a dated class</h2>
          <p className="muted" style={{ margin: 0 }}>
            Everyone in this group follows one exact published course version.
            Learners and their guardians choose to join; you cannot add someone silently.
          </p>

          <label htmlFor="cohort-version">Published course version</label>
          <select id="cohort-version" value={versionId} onChange={(e) => setVersionId(e.target.value)} required>
            {publishedVersions.map((v) => <option key={v.id} value={v.id}>Version {v.versionNumber}</option>)}
          </select>

          <label htmlFor="cohort-title">Class name</label>
          <input id="cohort-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label htmlFor="cohort-description">Short description (optional)</label>
          <textarea id="cohort-description" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />

          <label htmlFor="cohort-start">Starts</label>
          <input id="cohort-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />

          <label htmlFor="cohort-end">Ends (optional; blank means open-ended)</label>
          <input id="cohort-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />

          <label htmlFor="cohort-capacity">Capacity (optional)</label>
          <input id="cohort-capacity" type="number" min={1} step={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="No limit" />

          <button type="submit" className="btn" disabled={Boolean(busy) || publishedVersions.length === 0}>
            {busy === 'create' ? 'Creating…' : 'Create draft cohort'}
          </button>
          <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
            Current join rule: an open class accepts members after the start until it ends.
            Review that late-join policy before switching the feature on.
          </p>
        </form>
      )}

      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}

      <section style={{ display: 'grid', gap: '.75rem' }}>
        <h2 style={{ margin: 0 }}>Classes</h2>
        {cohorts.length === 0 ? (
          <div className="card"><p className="empty">No cohorts yet.</p></div>
        ) : cohorts.map((cohort) => {
          const count = counts[cohort.id] ?? { active: 0, left: 0 };
          const version = versions.find((v) => v.id === cohort.courseVersionId);
          return (
            <article className="card" key={cohort.id} style={{ display: 'grid', gap: '.5rem' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{cohort.title}</h3>
                  <p className="muted" style={{ margin: '.25rem 0' }}>
                    Version {version?.versionNumber ?? '?'} · Starts {new Date(cohort.startsAt).toLocaleString()}
                    {cohort.endsAt ? ` · Ends ${new Date(cohort.endsAt).toLocaleString()}` : ' · Open-ended'}
                  </p>
                </div>
                <span className={`badge ${cohort.status === 'open' ? '' : 'neutral'}`}>{cohort.status}</span>
              </div>
              {cohort.description && <p style={{ margin: 0 }}>{cohort.description}</p>}
              <p className="muted" style={{ margin: 0 }}>
                {count.active} active member{count.active === 1 ? '' : 's'}
                {cohort.capacity ? ` · capacity ${cohort.capacity}` : ''}
                {count.left ? ` · ${count.left} previously left` : ''}
              </p>
              <div className="row" style={{ gap: '.5rem' }}>
                {cohort.status === 'draft' && (
                  <button type="button" className="btn" disabled={!enabled || Boolean(busy)} onClick={() => setStatus(cohort, 'open')}>
                    {busy === `${cohort.id}-open` ? 'Opening…' : 'Open for joining'}
                  </button>
                )}
                {cohort.status === 'open' && (
                  <button type="button" className="btn secondary" disabled={Boolean(busy)} onClick={() => setStatus(cohort, 'closed')}>
                    {busy === `${cohort.id}-closed` ? 'Closing…' : 'Close to new joiners'}
                  </button>
                )}
                {(cohort.status === 'draft' || cohort.status === 'open') && (
                  <button type="button" className="btn ghost" disabled={Boolean(busy)} onClick={() => setStatus(cohort, 'cancelled')}>
                    Cancel class
                  </button>
                )}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
                Member names are not shown on this screen. Learners see only themselves and family.
              </p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
