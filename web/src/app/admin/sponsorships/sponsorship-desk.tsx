'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { SponsorshipOverview } from '@/lib/sponsorship';

/**
 * The two acts on this desk: decide a request, and record money that arrived.
 *
 * Both need words — a reason for a decision, a reference for a payment — and the
 * database refuses either without them. This component asks first so the person
 * typing finds out before they press a button, not after.
 *
 * There is no "mark paid" without a reference, and there is no amount field:
 * what the sponsor was told to pay was resolved from the course and their
 * market at pledge time, and it is shown here rather than editable.
 */
export function SponsorshipDesk({ overview }: { overview: SponsorshipOverview }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<Record<string, string>>({});

  async function call(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setDone(null);
    try {
      const res = await fetch('/api/sponsorship', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = (await res.json()) as { ok?: boolean; message?: string; seatCode?: string };
      if (!out.ok) {
        setError(out.message ?? 'That did not work.');
        return false;
      }
      setDone(
        body.action === 'decide'
          ? `Recorded${out.seatCode ? ` — seat ${out.seatCode} is now in the pool` : ''}.`
          : 'Payment recorded, and the seat is open.',
      );
      startTransition(() => router.refresh());
      return true;
    } catch {
      setError('The request could not be sent. Nothing changed.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      {error && <div className="notice error" role="alert">{error}</div>}
      {done && <div className="notice" role="status">{done}</div>}

      <section className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>Requests waiting for a decision</h2>
          <span className="badge neutral">{overview.counts.waiting}</span>
        </div>

        {overview.waiting.length === 0 ? (
          <p className="empty">Nothing is waiting. A request appears here the moment somebody asks.</p>
        ) : (
          <ul className="lessons">
            {overview.waiting.map((row) => (
              <li key={row.id}>
                <p className="meta" style={{ marginTop: 0 }}>
                  <strong>{row.learnerName ?? 'A learner'}</strong> for{' '}
                  <strong>{row.courseTitle ?? 'a course'}</strong>
                  {row.applicantName && <> · asked by {row.applicantName}</>}
                </p>
                <blockquote className="muted" style={{ margin: '0.35rem 0' }}>
                  {row.reason}
                </blockquote>
                <label className="field" htmlFor={`reason-${row.id}`}>
                  <span>Why you are deciding this way (kept on the record)</span>
                </label>
                <input
                  id={`reason-${row.id}`}
                  type="text"
                  maxLength={500}
                  value={reasons[row.id] ?? ''}
                  onChange={(event) =>
                    setReasons((current) => ({ ...current, [row.id]: event.target.value }))
                  }
                  placeholder="Checked with the family, the course is priced out of reach…"
                />
                <p className="row" style={{ marginTop: '0.5rem', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy !== null || pending || (reasons[row.id] ?? '').trim() === ''}
                    onClick={() =>
                      call(
                        { action: 'decide', applicationId: row.id, approve: true, reason: reasons[row.id] },
                        row.id,
                      )
                    }
                  >
                    Approve and add to the pool
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy !== null || pending || (reasons[row.id] ?? '').trim() === ''}
                    onClick={() =>
                      call(
                        { action: 'decide', applicationId: row.id, approve: false, reason: reasons[row.id] },
                        row.id,
                      )
                    }
                  >
                    Decline
                  </button>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>Pledges waiting for the money</h2>
          <span className="badge neutral">{overview.counts.pledged}</span>
        </div>

        <p className="meta">
          No card or mobile-money provider takes a sponsorship, so this is where it is recorded
          once it arrives. Recording it is what opens the seat — an entitlement and an enrolment
          with source <code>scholarship</code>.
        </p>

        {overview.seats.length === 0 ? (
          <p className="empty">No seat has been pledged yet.</p>
        ) : (
          <ul className="lessons">
            {overview.seats.map((row, index) => {
              const key = row.seatCode ?? `seat-${index}`;
              const owed =
                row.amountMinor && row.currencyCode
                  ? `${row.currencyCode} ${row.amountMinor}`
                  : 'an amount the pledge did not record';
              return (
                <li key={key}>
                  <p className="meta" style={{ marginTop: 0 }}>
                    <strong>{row.seatCode ?? '—'}</strong> · {row.courseTitle ?? 'a course'} ·{' '}
                    {row.donor ?? 'a donor'} · <strong>{owed}</strong>
                    {row.reference && <> · reference {row.reference}</>}
                  </p>

                  {row.status === 'pledged' ? (
                    <>
                      <label className="field" htmlFor={`ref-${key}`}>
                        <span>Reference the payment came with</span>
                      </label>
                      <input
                        id={`ref-${key}`}
                        type="text"
                        maxLength={120}
                        value={references[key] ?? ''}
                        onChange={(event) =>
                          setReferences((current) => ({ ...current, [key]: event.target.value }))
                        }
                        placeholder="Bank transfer, receipt number, cash recorded in the book"
                      />
                      <p style={{ marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn"
                          disabled={busy !== null || pending || (references[key] ?? '').trim() === ''}
                          onClick={() =>
                            call(
                              { action: 'record', sponsorshipId: row.id, reference: references[key] },
                              key,
                            )
                          }
                        >
                          Record the payment
                        </button>
                      </p>
                    </>
                  ) : (
                    <p className="muted">Recorded{row.reference ? ` against ${row.reference}` : ''}.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
