'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { amountOf } from '@/lib/sponsorship-outcome';
import { SEAT_NOTE_MAX, pledgeSeatOutcomeOf, type PledgeSeatReason } from '@/lib/sponsor-pool-outcome';

/** A seat as the page says it: every word already chosen on the server. */
export type SeatShown = {
  seatCode: string;
  title: string | null;
  /** Who the course is for and how hard it is, in the reader's language. */
  about: string[];
  /** The price where the reader is, in major units, or null when it cannot be taken. */
  price: string | null;
  /** Why it cannot be taken, when it cannot. */
  blocked: string | null;
};

/** The words this list says. A script sent to a browser holds no catalogue. */
export type PoolWords = {
  aCourse: string;
  /** With `{code}` in it. */
  seat: string;
  priceNote: string;
  noteLabel: string;
  optional: string;
  take: string;
  taking: string;
  /** Ends with `{amount}`. */
  taken: string;
  takenNext: string;
  pledgeNote: string;
  mine: string;
  reasons: Record<PledgeSeatReason, string>;
};

/**
 * The seats a sponsor may take.
 *
 * One card per approved seat: the course, who it is for, and the price in
 * this reader's market. Nothing else is here because nothing else is sent:
 * the learner's name, age, household and note never leave the database for
 * this page.
 *
 * **Taking a seat is a pledge.** Nothing is charged by this button. What it
 * was answered with is said by its name (`sponsor-pool-outcome.ts`), in the
 * reader's language, and the server's own sentence is never shown. A press
 * that got no answer is not a failure: the seat may be this account's now, so
 * the reader is sent to look.
 */
export function SponsorPool({
  seats,
  country,
  words,
}: {
  seats: SeatShown[];
  country: string | null;
  words: PoolWords;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [working, setWorking] = useState<string | null>(null);
  const [said, setSaid] = useState<{ tone: 'info' | 'warn' | 'error'; text: string; amount?: string | null; link?: boolean } | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  const [seatLead, seatTail] = words.seat.split('{code}');
  const takenLead = words.taken.split('{amount}')[0] ?? '';

  async function take(seat: SeatShown) {
    if (working !== null) return;
    setWorking(seat.seatCode);
    setSaid(null);
    let res: Response;
    try {
      res = await fetch('/api/sponsorship', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'pledge', seatCode: seat.seatCode, country, note: note[seat.seatCode] ?? null }),
      });
    } catch {
      setSaid({ tone: 'warn', text: words.reasons.unconfirmed, link: true });
      setWorking(null);
      return;
    }
    const out = (await res.json().catch(() => null)) as { ok?: unknown; reason?: unknown; currencyCode?: unknown; amountMinor?: unknown } | null;
    setWorking(null);

    if (res.ok && out?.ok === true) {
      // What the database says was pledged, in major units; failing that, the price this card showed.
      setSaid({ tone: 'info', text: takenLead, amount: amountOf(out.amountMinor, out.currencyCode) ?? seat.price, link: true });
      startTransition(() => router.refresh());
      return;
    }
    const reason = pledgeSeatOutcomeOf(res.status, out?.reason);
    setSaid({
      tone: reason === 'unconfirmed' || reason === 'off' ? 'warn' : 'error',
      text: words.reasons[reason],
      link: reason === 'unconfirmed',
    });
    // Somebody else has it, or it closed: the list is out of date.
    if (reason === 'gone') startTransition(() => router.refresh());
  }

  return (
    <div className="stack">
      {said && (
        <div
          className={`notice ${said.tone === 'error' ? 'error' : said.tone === 'warn' ? 'warn' : ''}`}
          role={said.tone === 'info' ? 'status' : 'alert'}
          data-pool-said={said.tone}
        >
          {said.amount === undefined ? (
            said.text
          ) : (
            <>
              {/* Two lines, each whole: no full stop is put between them, because
                  not every language ends a sentence with one. With no amount to
                  say, the first line, which ends in a colon, is not said. */}
              {said.amount && (
                <span style={{ display: 'block' }}>
                  {said.text}
                  <bdi dir="ltr">{said.amount}</bdi>
                </span>
              )}
              <span style={{ display: 'block' }}>{words.takenNext}</span>
            </>
          )}
          {said.link && (
            <>
              {' '}
              <Link href="/account/sponsorship">{words.mine}</Link>
            </>
          )}
        </div>
      )}

      {seats.map((seat) => (
        <div className="card" key={seat.seatCode} data-seat={seat.seatCode}>
          <h3 style={{ margin: 0, overflowWrap: 'anywhere' }}>{seat.title ? <bdi>{seat.title}</bdi> : words.aCourse}</h3>
          <p className="meta" style={{ margin: '0.25rem 0 0' }}>
            {seatLead}
            <bdi dir="ltr">{seat.seatCode}</bdi>
            {seatTail}
          </p>
          {seat.about.length > 0 && (
            <p className="meta" style={{ margin: '0.25rem 0 0' }}>
              {seat.about.join(' · ')}
            </p>
          )}

          {seat.price ? (
            <p style={{ marginTop: '0.75rem' }}>
              <strong>
                <bdi dir="ltr">{seat.price}</bdi>
              </strong>{' '}
              <span className="muted">{words.priceNote}</span>
            </p>
          ) : (
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              {seat.blocked}
            </p>
          )}

          {seat.price && (
            <>
              <label className="field" htmlFor={`note-${seat.seatCode}`}>
                <span>
                  {words.noteLabel} {words.optional}
                </span>
              </label>
              <input
                id={`note-${seat.seatCode}`}
                type="text"
                dir="auto"
                maxLength={SEAT_NOTE_MAX}
                value={note[seat.seatCode] ?? ''}
                onChange={(event) => setNote((current) => ({ ...current, [seat.seatCode]: event.target.value }))}
                disabled={busy || working !== null}
              />
              <p style={{ marginTop: '0.75rem' }}>
                <button type="button" className="btn" disabled={busy || working !== null} onClick={() => take(seat)}>
                  {working === seat.seatCode ? words.taking : words.take}
                </button>
              </p>
              <p className="muted">{words.pledgeNote}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
