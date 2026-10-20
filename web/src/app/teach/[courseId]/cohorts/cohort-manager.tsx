'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type CohortMemberCounts,
  type CourseCohort,
  cohortJoinWindowOpen,
  joinWindowLabel,
} from '@/lib/cohorts';

function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

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
  // Blank is the decided default: registration closes when the class starts.
  const [joinClosesAt, setJoinClosesAt] = useState('');
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
      joinClosesAt: joinClosesAt ? new Date(joinClosesAt).toISOString() : null,
    }, 'create');
    if (ok) {
      setTitle('');
      setDescription('');
      setStartsAt('');
      setEndsAt('');
      setCapacity('');
      setJoinClosesAt('');
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

          <label htmlFor="cohort-join-closes">Registration closes (optional)</label>
          <input id="cohort-join-closes" type="datetime-local" value={joinClosesAt} onChange={(e) => setJoinClosesAt(e.target.value)} placeholder="When the class starts" />

          <button type="submit" className="btn" disabled={Boolean(busy) || publishedVersions.length === 0}>
            {busy === 'create' ? 'Creating…' : 'Create draft cohort'}
          </button>
          <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
            Join rule: registration closes when the class starts unless you set a later
            time here. You can move it while the class is a draft or open, so
            &ldquo;two more days&rdquo; is a change rather than a new class.
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
                    {' · '}{joinWindowLabel(cohort)}
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
                <Link className="btn secondary" href={`/teach/${courseId}/cohorts/${cohort.id}`}>
                  Class progress
                </Link>
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

              {(cohort.status === 'draft' || cohort.status === 'open') && (
                <JoinWindowControl cohort={cohort} onSend={send} busy={busy} />
              )}
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

/**
 * Moving the join window, beside the class it governs rather than in the create
 * form: "we will take joiners for two more days" is a decision made once a class
 * is running, and the create form cannot know it yet.
 */
function JoinWindowControl({
  cohort,
  onSend,
  busy,
}: {
  cohort: CourseCohort;
  onSend: (payload: Record<string, unknown>, key: string) => Promise<unknown>;
  busy: string | null;
}) {
  const [closesAt, setClosesAt] = useState(toLocalInput(cohort.joinClosesAt));
  const key = `window-${cohort.id}`;
  const open = cohortJoinWindowOpen(cohort);
  const unchanged = closesAt === toLocalInput(cohort.joinClosesAt);

  async function save() {
    if (!closesAt) return;
    await onSend({
      action: 'set_join_window',
      cohortId: cohort.id,
      joinClosesAt: new Date(closesAt).toISOString(),
    }, key);
  }

  return (
    <div style={{ display: 'grid', gap: '.35rem' }}>
      <label htmlFor={`join-closes-${cohort.id}`} style={{ margin: 0 }}>
        Registration closes
      </label>
      <div className="row" style={{ gap: '.5rem', alignItems: 'center' }}>
        <input
          id={`join-closes-${cohort.id}`}
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          style={{ maxWidth: '15rem' }}
        />
        <button
          type="button"
          className="btn ghost"
          disabled={Boolean(busy) || unchanged || !closesAt}
          onClick={save}
        >
          {busy === key ? 'Saving…' : 'Move the window'}
        </button>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
        {cohort.status === 'open'
          ? open
            ? 'Joining is open. Moving this later lets in someone who was refused.'
            : 'Registration has closed. Move it later to let somebody in; the class keeps running.'
          : 'Set it before opening the class, or move it later while it runs.'}
        {' '}It cannot move past the end of the class.
      </p>
    </div>
  );
}
