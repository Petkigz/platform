'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { TeachingQueue } from '@/lib/teaching';
import { safeSampleUrl } from '@/lib/teaching';

/**
 * The teacher queue: read, watch, decide.
 *
 * Two buttons and one text box per application, because that is what the
 * decision actually is. The reason is required by the database and shown to the
 * applicant, so the box says so before anybody types in it — a refusal note is
 * something a person reads, not an internal memo.
 *
 * Approving grants the `instructor` role. This screen says that out loud next to
 * the button, because it is the only place on the platform where that happens
 * automatically and it should never be a surprise to the person clicking it.
 */
export function TeachingQueue({ queue }: { queue: TeachingQueue }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function decide(id: string, approve: boolean) {
    const reason = (reasons[id] ?? '').trim();
    if (reason.length < 4) {
      setError('Write a reason first — the applicant reads it.');
      return;
    }
    setBusy(`${id}:${approve ? 'approve' : 'decline'}`);
    setError(null);
    setDone(null);
    try {
      const res = await fetch('/api/teaching/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'decide', applicationId: id, approve, reason }),
      });
      const out = (await res.json()) as { ok?: boolean; message?: string };
      if (!out.ok) {
        setError(out.message ?? 'That did not work.');
        return;
      }
      setDone(
        approve
          ? 'Approved. They now hold the teaching role — and every course they write still goes through review.'
          : 'Declined. They can read your reason on their page and apply again.',
      );
      setReasons((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      startTransition(() => router.refresh());
    } catch {
      setError('The request could not be sent. Nothing changed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {done && (
        <div className="notice" role="status">
          {done}
        </div>
      )}

      <h2>Waiting to be read ({queue.counts.waiting})</h2>

      {queue.waiting.length === 0 ? (
        <div className="empty">
          Nobody is waiting. An application arrives here when somebody sends one from{' '}
          <code>/teach/apply</code>.
        </div>
      ) : (
        queue.waiting.map((row) => {
          const link = safeSampleUrl(row.sampleUrl);
          const working = busy?.startsWith(`${row.id}:`) ?? false;
          return (
            <section key={row.id} className="card">
              <div className="outline-h" style={{ marginTop: 0 }}>
                <h3 style={{ margin: 0 }}>{row.headline}</h3>
                <span className="badge neutral">{row.name ?? 'Unnamed applicant'}</span>
              </div>
              <p className="meta">
                {row.email ?? 'no address on file'} · sent{' '}
                {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString('en-GB') : '—'}
              </p>

              <p style={{ whiteSpace: 'pre-wrap' }}>{row.qualifications}</p>
              {row.note && (
                <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                  {row.note}
                </p>
              )}

              {link ? (
                <p>
                  <a href={link} target="_blank" rel="noreferrer noopener" className="btn secondary">
                    Watch the sample lesson
                  </a>
                </p>
              ) : (
                <p className="muted">No usable sample link was stored with this application.</p>
              )}

              <label htmlFor={`reason-${row.id}`}>
                Your reason (the applicant reads this)
              </label>
              <textarea
                id={`reason-${row.id}`}
                rows={3}
                maxLength={2000}
                value={reasons[row.id] ?? ''}
                onChange={(event) =>
                  setReasons((current) => ({ ...current, [row.id]: event.target.value }))
                }
                disabled={working || pending}
                placeholder="What you watched, what convinced you — or exactly what would need to change."
              />

              <p className="muted">
                Approving makes them a teacher here: it creates the <code>instructor</code> role,
                audited with your reason against their account. It does not publish anything —
                every course they write still goes through review.
              </p>

              <p style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  disabled={working || pending}
                  onClick={() => decide(row.id, true)}
                >
                  {busy === `${row.id}:approve` ? 'Approving…' : 'Approve as a teacher'}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={working || pending}
                  onClick={() => decide(row.id, false)}
                >
                  {busy === `${row.id}:decline` ? 'Declining…' : 'Decline, with the reason'}
                </button>
              </p>
            </section>
          );
        })
      )}

      <h2>Recently decided</h2>
      {queue.decided.length === 0 ? (
        <div className="empty">No decisions yet.</div>
      ) : (
        <div className="scroll-x">
          <table>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Would teach</th>
                <th>Decision</th>
                <th>Reason</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {queue.decided.map((row) => (
                <tr key={row.id}>
                  <td>{row.name ?? '—'}</td>
                  <td>{row.headline}</td>
                  <td>
                    <span className={row.status === 'approved' ? 'badge ok' : 'badge neutral'}>
                      {row.status === 'approved' ? 'Approved' : 'Declined'}
                    </span>
                  </td>
                  <td>{row.reason ?? '—'}</td>
                  <td>{row.decidedAt ? new Date(row.decidedAt).toLocaleDateString('en-GB') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
