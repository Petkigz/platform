'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { formatSeatCode } from '@/lib/seats';

/**
 * The form a parent fills in from a school letter.
 *
 * Three things it does that a plain input would not.
 *
 * **It reforms as you type.** `abcde fghjk` becomes `ABCDE-FGHJK` in the field,
 * because the code is copied off paper by somebody who has never seen one before
 * and the shape is the only hint that it went in right.
 *
 * **It can put the seat on a child.** A learner switcher is offered when the
 * account manages more than one learner profile; one profile means no choice is
 * shown at all, because a select with one option is a question with no answer.
 *
 * **It does not clear the field on a refusal.** Nine refusals in ten are "check
 * the code", and wiping what the person typed makes them start again from a
 * letter they are holding in their hand.
 */
export function ClaimForm({
  learners,
}: {
  learners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState('');
  const [learnerId, setLearnerId] = useState(learners[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch('/api/institution/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, learnerProfileId: learnerId || null }),
      });
      const out = (await res.json()) as {
        ok?: boolean;
        message?: string;
        courseTitle?: string;
        versionNumber?: number;
        courseSlug?: string;
      };
      if (!out.ok) {
        setError(out.message ?? 'That did not work.');
        return;
      }
      setDone(
        out.versionNumber
          ? `That seat is now yours: ${out.courseTitle ?? 'the course'}, version ${out.versionNumber}.`
          : `That seat is now yours: ${out.courseTitle ?? 'the course'}.`,
      );
      setCode('');
      startTransition(() => router.refresh());
    } catch {
      setError('The request could not be sent. Nothing was claimed.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div>
        <p className="notice" role="status">
          <strong>{done}</strong>
        </p>
        <p>
          It is on <a href="/learn">your learning page</a>, and the school is not told which of its
          codes went to whom.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: '32rem' }}>
      <label htmlFor="seat-code" style={{ display: 'block', marginBottom: '0.35rem' }}>
        Your code
      </label>
      <input
        id="seat-code"
        name="code"
        value={code}
        onChange={(event) => setCode(formatSeatCode(event.target.value).slice(0, 11))}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="characters"
        placeholder="ABCDE-FGHJK"
        style={{ width: '100%', fontFamily: 'monospace', letterSpacing: '0.08em' }}
        required
      />
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
        Ten characters, on the letter or card the school gave you. Capitals are assumed, and the dash
        does not matter.
      </p>

      {learners.length > 1 && (
        <>
          <label htmlFor="seat-learner" style={{ display: 'block', margin: '1rem 0 0.35rem' }}>
            Whose learning is this?
          </label>
          <select
            id="seat-learner"
            value={learnerId}
            onChange={(event) => setLearnerId(event.target.value)}
            style={{ width: '100%' }}
          >
            {learners.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.name}
              </option>
            ))}
          </select>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
            A seat is one learner for one course. Choosing a child uses the seat for them; the
            school still only sees that a seat was claimed.
          </p>
        </>
      )}

      {error && (
        <p className="notice error" role="alert" style={{ marginTop: '1rem' }}>
          {error}
        </p>
      )}

      <p style={{ marginTop: '1rem' }}>
        <button type="submit" className="btn" disabled={busy || pending || code.length < 11}>
          {busy ? 'Claiming…' : 'Claim this seat'}
        </button>
      </p>
    </form>
  );
}
