'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { SeatOrder } from '@/lib/seats';
import { seatCodeLine } from '@/lib/seats';

/**
 * Issuing, printing and withdrawing seat codes.
 *
 * The one thing this component is careful about: **the codes exist once.** They
 * are made on the server, hashed before they are stored, and returned in the
 * response body — so the block below is the only place they will ever appear.
 * The screen says so before the button is pressed rather than after, because a
 * person who closes the tab has to issue a second batch against the same order
 * to get codes they can hand out.
 */
export function SeatDesk({ orders }: { orders: SeatOrder[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [issuedFor, setIssuedFor] = useState<string | null>(null);
  const [issued, setIssued] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  async function issue(orderId: string) {
    const count = Number(counts[orderId] ?? '');
    if (!Number.isInteger(count) || count < 1) {
      setError('How many codes? Type a whole number of one or more.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/institution', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'issueSeats', orderId, count }),
      });
      const out = (await res.json()) as { ok?: boolean; message?: string; codes?: string[] };
      if (!out.ok) {
        setError(out.message ?? 'That did not work.');
        return;
      }
      setIssued(out.codes ?? []);
      setIssuedFor(orderId);
      setCopied(false);
      setCounts((previous) => ({ ...previous, [orderId]: '' }));
      startTransition(() => router.refresh());
    } catch {
      setError('The request could not be sent. Nothing was issued.');
    } finally {
      setBusy(false);
    }
  }

  async function voidCode(codeId: string) {
    if (voidReason.trim() === '') {
      setError('Write a reason. Somebody will read it.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/institution', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'voidSeat', codeId, reason: voidReason }),
      });
      const out = (await res.json()) as { ok?: boolean; message?: string };
      if (!out.ok) {
        setError(out.message ?? 'That did not work.');
        return;
      }
      setVoiding(null);
      setVoidReason('');
      startTransition(() => router.refresh());
    } catch {
      setError('The request could not be sent. Nothing changed.');
    } finally {
      setBusy(false);
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(issued.join('\n'));
      setCopied(true);
    } catch {
      // Clipboard access is refused often enough that failing quietly is the
      // only honest option: the codes are on screen and can be selected by hand.
      setCopied(false);
    }
  }

  return (
    <div>
      {error && (
        <p className="notice error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {issued.length > 0 && (
        <section className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--green-800)' }}>
          <h2 style={{ marginTop: 0 }}>These codes, now</h2>
          <p className="notice warn" style={{ marginBottom: '0.75rem' }}>
            <strong>This is the only time they are shown.</strong> They are stored as a hash, so
            nobody — including the owner — can read them back. Print them, copy them into the
            school&apos;s system, or write them down before you leave this page. If they are lost,
            issue another batch against the same order; the unused seats are still there.
          </p>
          <div className="scroll-x">
            <pre
              style={{
                margin: 0,
                padding: '0.75rem',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                fontSize: '1rem',
                lineHeight: 1.8,
                letterSpacing: '0.05em',
              }}
            >
              {issued.join('\n')}
            </pre>
          </div>
          <p style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            <button type="button" className="btn secondary" onClick={() => void copyAll()}>
              {copied ? 'Copied' : 'Copy all'}
            </button>{' '}
            <button
              type="button"
              className="btn secondary"
              onClick={() => window.print()}
            >
              Print this page
            </button>{' '}
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setIssued([]);
                setIssuedFor(null);
              }}
            >
              I have written them down
            </button>
          </p>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0, marginTop: '0.5rem' }}>
            Each code works once. The last four characters are kept, so when somebody rings the
            office about &ldquo;the code ending 4F2A&rdquo; you can find it below.
          </p>
        </section>
      )}

      {orders.length === 0 ? (
        <div className="empty">
          No seats have been bought for this institution yet. When the school buys seats, the order
          appears here and you can issue one code per seat.
        </div>
      ) : (
        orders.map((order) => (
          <section className="card" key={order.orderId} style={{ marginBottom: '1.5rem' }}>
            <div className="outline-h" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>{order.courseTitle}</h2>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {order.versionNumber ? `version ${order.versionNumber}` : 'an edition'}
              </span>
            </div>

            <p className="muted" style={{ marginTop: 0 }}>
              Invoice {order.invoiceReference}
              {order.purchasedOn ? ` · ${order.purchasedOn}` : ''}
            </p>
            {order.note && <p className="muted">{order.note}</p>}

            {order.remaining > 0 ? (
              <div style={{ marginTop: '0.75rem' }}>
                <label htmlFor={`count-${order.orderId}`} style={{ display: 'block', marginBottom: '0.35rem' }}>
                  How many codes to issue now?{' '}
                  <span className="muted">({order.remaining} of {order.seats} seats unissued)</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    id={`count-${order.orderId}`}
                    type="number"
                    min={1}
                    max={order.remaining}
                    value={counts[order.orderId] ?? ''}
                    onChange={(event) =>
                      setCounts((previous) => ({ ...previous, [order.orderId]: event.target.value }))
                    }
                    style={{ width: '7rem' }}
                  />
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || pending}
                    onClick={() => void issue(order.orderId)}
                  >
                    Issue codes
                  </button>
                </div>
                <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                  You can issue them in batches — one class now, the rest later. The codes are shown
                  once, immediately after this.
                </p>
              </div>
            ) : (
              <p className="muted" style={{ marginTop: '0.5rem' }}>
                Every seat on this order has been issued.
              </p>
            )}

            {order.codes.length > 0 && (
              <>
                <h3 style={{ marginBottom: '0.35rem' }}>{issuedFor === order.orderId ? 'Codes so far' : 'Codes'}</h3>
                <ul className="lessons" style={{ margin: 0 }}>
                  {order.codes.map((code) => (
                    <li key={code.id} style={{ alignItems: 'flex-start', gap: '0.75rem' }}>
                      <span className="t" style={{ minWidth: 0, flex: 1 }}>
                        <strong>{seatCodeLine(code).replace('Code …', '…')}</strong>
                        {code.issuedAt && (
                          <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                            issued {code.issuedAt.slice(0, 10)}
                          </span>
                        )}
                      </span>
                      {!code.voided && (
                        <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {voiding === code.id ? (
                            <>
                              <label htmlFor={`void-${code.id}`} className="muted" style={{ fontSize: '0.85rem' }}>
                                Why?
                              </label>
                              <input
                                id={`void-${code.id}`}
                                value={voidReason}
                                onChange={(event) => setVoidReason(event.target.value)}
                                style={{ width: '12rem' }}
                              />
                              <button
                                type="button"
                                className="btn secondary"
                                disabled={busy}
                                onClick={() => void voidCode(code.id)}
                              >
                                Withdraw
                              </button>
                              <button
                                type="button"
                                className="btn secondary"
                                disabled={busy}
                                onClick={() => {
                                  setVoiding(null);
                                  setVoidReason('');
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => {
                                setVoiding(code.id);
                                setVoidReason('');
                              }}
                            >
                              Withdraw
                            </button>
                          )}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                  Withdrawing a code that has not been used simply stops it working. Withdrawing one
                  that has been used takes the course away from that learner, keeps everything they
                  have already done, and records the reason you gave.
                </p>
              </>
            )}
          </section>
        ))
      )}
    </div>
  );
}
