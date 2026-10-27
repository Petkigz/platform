'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  ZAKAT_HONESTY,
  audienceWords,
  pledgeNextStep,
  seatPrice,
  type PoolSeat,
} from '@/lib/sponsorship';

/**
 * The seats a sponsor may take.
 *
 * One row per approved seat, with the course, who it is for and the price in
 * this reader's market. Nothing else is here because nothing else is sent: the
 * learner's name, age, household and note never leave the database for this
 * page, so there is no field a redesign could accidentally start rendering.
 */
export function SponsorPool({
  seats,
  signedIn,
  country,
}: {
  seats: PoolSeat[];
  signedIn: boolean;
  country: string | null;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');
  const [note, setNote] = useState<Record<string, string>>({});

  async function take(seat: PoolSeat) {
    setWorking(seat.seatCode);
    setMessage(null);
    try {
      const res = await fetch('/api/sponsorship', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'pledge',
          seatCode: seat.seatCode,
          country,
          note: note[seat.seatCode] ?? null,
        }),
      });
      const out = (await res.json()) as { ok?: boolean; message?: string; currencyCode?: string; amountMinor?: string };
      if (!out.ok) {
        setTone('error');
        setMessage(out.message ?? 'That did not work.');
        return;
      }
      setTone('info');
      setMessage(
        `Seat ${seat.seatCode} is yours to pay for: ${out.currencyCode ?? ''} ${out.amountMinor ?? ''}. ` +
          'Nothing has been taken — the next step explains how the payment is recorded.',
      );
      startTransition(() => router.refresh());
    } catch {
      setTone('error');
      setMessage('The request could not be sent. Nothing was charged.');
    } finally {
      setWorking(null);
    }
  }

  if (seats.length === 0) {
    return (
      <div className="notice">
        <strong>No seats are waiting for a sponsor right now.</strong> Approved requests appear
        here as soon as the owner or finance approves one. A course that has nobody waiting can
        still be bought for yourself on its own page.
      </div>
    );
  }

  return (
    <div className="stack">
      {message && (
        <div className={tone === 'error' ? 'notice error' : 'notice'} role="status">
          {message}
        </div>
      )}

      {seats.map((seat) => {
        const price = seatPrice(seat);
        return (
          <div className="card" key={seat.seatCode}>
            <div className="outline-h" style={{ marginTop: 0 }}>
              <h3 style={{ margin: 0 }}>{seat.courseTitle ?? 'A course'}</h3>
              <span className="badge neutral">{seat.seatCode}</span>
            </div>

            <p className="meta" style={{ marginTop: '0.5rem' }}>
              {[audienceWords(seat.audience), seat.difficulty].filter(Boolean).join(' · ') || 'A place on a course'}
            </p>

            <p style={{ marginTop: '0.75rem' }}>
              <strong>{price.ok ? price.label : 'Not available here'}</strong>{' '}
              <span className="muted">
                {price.ok
                  ? '— the price of this course where you are. It is the seat that is sponsored, not a gift card.'
                  : price.label}
              </span>
            </p>

            {price.ok && signedIn && (
              <>
                <label className="field" htmlFor={`note-${seat.seatCode}`}>
                  <span>A note for staff, if you want one (optional)</span>
                </label>
                <input
                  id={`note-${seat.seatCode}`}
                  type="text"
                  maxLength={500}
                  value={note[seat.seatCode] ?? ''}
                  onChange={(event) =>
                    setNote((current) => ({ ...current, [seat.seatCode]: event.target.value }))
                  }
                  placeholder="In memory of somebody, or a dedication"
                />
                <p style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || working !== null}
                    onClick={() => take(seat)}
                  >
                    {working === seat.seatCode ? 'Taking the seat…' : 'Sponsor this seat'}
                  </button>
                </p>
                <p className="muted">
                  No card or mobile-money provider can take a sponsorship automatically yet.
                  Taking the seat records a pledge and tells you how to pay; staff record the
                  payment and the seat opens then.
                </p>
              </>
            )}

            {price.ok && !signedIn && (
              <p className="muted">Sign in to sponsor this seat.</p>
            )}
          </div>
        );
      })}

      <p className="muted">{ZAKAT_HONESTY}</p>
      <p className="muted">{pledgeNextStep('pledged')}</p>
    </div>
  );
}
