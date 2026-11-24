'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { TranslateButton } from '@/components/translate-button';
import type { TeachingQueue as Queue } from '@/lib/teaching';
import { safeSampleUrl } from '@/lib/teaching';
import type { TranslateWords } from '@/lib/translate';

/** What this queue says, in the page's language. Handed over as words: the catalogue stays on the server. */
export type TeachingQueueWords = {
  needReason: string;
  failed: string;
  unsent: string;
  approved: string;
  declined: string;
  /** The heading, with its count already in it. */
  waiting: string;
  nobodyWaiting: string;
  unnamed: string;
  noEmail: string;
  watch: string;
  noSample: string;
  reason: string;
  reasonHint: string;
  /** Said under the reason box when the applicant can translate it; null when translation is off. */
  writeYours: string | null;
  approveMeans: string;
  approve: string;
  decline: string;
  working: string;
  decidedTitle: string;
  noDecisions: string;
  colApplicant: string;
  colTeach: string;
  colDecision: string;
  colReason: string;
  colWhen: string;
  wasApproved: string;
  wasDeclined: string;
};

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
 *
 * What an applicant wrote is drawn as they wrote it, in whatever language
 * that was, with a Translate button under it when translation is on. The
 * reason is written in the staff member's own language; the applicant has
 * the same button on their page.
 */
export function TeachingQueue({
  queue,
  words,
  dates,
  translate,
}: {
  queue: Queue;
  words: TeachingQueueWords;
  /** A date for each row, already written in the reader's language. */
  dates: Record<string, string>;
  translate: TranslateWords | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ said: string; detail: string | null } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const written = { dir: 'auto', lang: '' } as const;

  async function decide(id: string, approve: boolean) {
    const reason = (reasons[id] ?? '').trim();
    if (reason.length < 4) {
      setError({ said: words.needReason, detail: null });
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
      const out = (await res.json().catch(() => null)) as { ok?: boolean; code?: string; message?: string } | null;
      if (!out?.ok) {
        // The route's own sentence is English. It is kept beside ours, marked
        // as English, because staff need to know what was refused.
        setError(
          out?.code === 'reason_required'
            ? { said: words.needReason, detail: null }
            : { said: words.failed, detail: typeof out?.message === 'string' ? out.message : null },
        );
        return;
      }
      setDone(approve ? words.approved : words.declined);
      setReasons((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      startTransition(() => router.refresh());
    } catch {
      setError({ said: words.unsent, detail: null });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      {error && (
        <div className="notice error" role="alert" data-tq-said="error">
          {error.said}
          {error.detail ? (
            <>
              {' '}
              <span lang="en" dir="ltr">{error.detail}</span>
            </>
          ) : null}
        </div>
      )}
      {done && (
        <div className="notice" role="status" data-tq-said="done">
          {done}
        </div>
      )}

      <h2>{words.waiting}</h2>

      {queue.waiting.length === 0 ? (
        <div className="empty">{words.nobodyWaiting}</div>
      ) : (
        queue.waiting.map((row) => {
          const link = safeSampleUrl(row.sampleUrl);
          const working = busy?.startsWith(`${row.id}:`) ?? false;
          return (
            <section key={row.id} className="card" data-tq-application={row.id} style={{ minWidth: 0 }}>
              <div className="outline-h" style={{ marginTop: 0 }}>
                <h3 style={{ margin: 0, overflowWrap: 'anywhere' }} {...written}>{row.headline}</h3>
                <span className="badge neutral" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                  {row.name ? <bdi {...written}>{row.name}</bdi> : words.unnamed}
                </span>
              </div>
              <p className="meta">{row.email ? <bdi dir="ltr">{row.email}</bdi> : words.noEmail}</p>
              <p className="meta">{dates[row.id] ?? ''}</p>

              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} {...written}>{row.qualifications}</p>
              {row.note && (
                <p className="muted" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} {...written}>
                  {row.note}
                </p>
              )}
              <TranslateButton
                text={[row.headline, row.qualifications, row.note ?? ''].filter((part) => part.trim() !== '').join('\n\n')}
                words={translate}
              />

              {link ? (
                <p>
                  <a href={link} target="_blank" rel="noreferrer noopener" className="btn secondary">
                    {words.watch}
                  </a>
                </p>
              ) : (
                <p className="muted">{words.noSample}</p>
              )}

              <label htmlFor={`reason-${row.id}`}>{words.reason}</label>
              <textarea
                id={`reason-${row.id}`}
                rows={3}
                maxLength={2000}
                value={reasons[row.id] ?? ''}
                onChange={(event) =>
                  setReasons((current) => ({ ...current, [row.id]: event.target.value }))
                }
                disabled={working || pending}
                placeholder={words.reasonHint}
                dir="auto"
              />
              {words.writeYours ? <p className="muted">{words.writeYours}</p> : null}

              <p className="muted">{words.approveMeans}</p>

              <p style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  disabled={working || pending}
                  onClick={() => decide(row.id, true)}
                >
                  {busy === `${row.id}:approve` ? words.working : words.approve}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={working || pending}
                  onClick={() => decide(row.id, false)}
                >
                  {busy === `${row.id}:decline` ? words.working : words.decline}
                </button>
              </p>
            </section>
          );
        })
      )}

      <h2>{words.decidedTitle}</h2>
      {queue.decided.length === 0 ? (
        <div className="empty">{words.noDecisions}</div>
      ) : (
        <div className="scroll-x">
          <table>
            <thead>
              <tr>
                <th>{words.colApplicant}</th>
                <th>{words.colTeach}</th>
                <th>{words.colDecision}</th>
                <th>{words.colReason}</th>
                <th>{words.colWhen}</th>
              </tr>
            </thead>
            <tbody>
              {queue.decided.map((row) => (
                <tr key={row.id}>
                  <td>{row.name ? <bdi {...written}>{row.name}</bdi> : '—'}</td>
                  <td><bdi {...written}>{row.headline}</bdi></td>
                  <td>
                    <span className={row.status === 'approved' ? 'badge ok' : 'badge neutral'}>
                      {row.status === 'approved' ? words.wasApproved : words.wasDeclined}
                    </span>
                  </td>
                  <td>{row.reason ? <bdi {...written}>{row.reason}</bdi> : '—'}</td>
                  <td>{dates[row.id] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
