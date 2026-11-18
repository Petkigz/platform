'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { canJoinFamily, joinOutcomeOf, type AdultFamilyState, type JoinOutcome } from '@/lib/family-adult';
import { familyOutcomeOf, type FamilyCode } from '@/lib/family-outcome';

/**
 * The signed-in adult's own card inside a family.
 *
 * Four states, and only two of them offer a button. A person whose learning
 * already lives in another family is told why there is nothing to click, rather
 * than given a control that would fail — a refusal the screen could foresee is
 * not a safeguard, it is a trap.
 *
 * Both calls go to `/api/family/learner`; the permission is the writer's, not
 * this component's. Nothing here sends a learner id: the caller can only ever
 * name a family, and only their own profile is ever written.
 *
 * **The words are handed in.** The page chooses the heading, the explanation
 * and the label of the join button for the state it read (`lib/family-adult.ts`
 * names them) and passes them in the reader's language. There is no English of
 * its own in this file.
 *
 * **A refusal is said by its name** (`lib/family-outcome.ts`). The card used
 * to print whatever sentence came back, which was sometimes the database's.
 * An answer that is not plainly a refusal says so, and sends the reader to
 * reload and look: both actions are safe to repeat, but the card cannot say
 * which family the learning is in until the page has been read again.
 */
export type FamilyAdultWords = {
  /** For the state the page read; a name is already in it where there is one. */
  heading: string;
  why: string;
  /** The join button, for the state the page read. */
  join: string;
  joining: string;
  leave: string;
  leaving: string;
  leaveNote: string;
  outcomes: Record<JoinOutcome, string>;
  left: string;
  unreachable: string;
  notMember: string;
  otherFamily: string;
  seatHeld: string;
  notHere: string;
  signedOut: string;
  noFamily: string;
  refused: string;
  unconfirmed: string;
};

export function FamilyAdultCard({
  familyId,
  state,
  words,
}: {
  familyId: string;
  state: AdultFamilyState;
  words: FamilyAdultWords;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'join' | 'leave' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function sentenceFor(code: FamilyCode): string {
    switch (code) {
      case 'not_member': return words.notMember;
      case 'other_family': return words.otherFamily;
      case 'seat_held': return words.seatHeld;
      case 'not_here': return words.notHere;
      case 'signed_out': return words.signedOut;
      case 'no_family': return words.noFamily;
      case 'unconfirmed': return words.unconfirmed;
      default: return words.refused;
    }
  }

  async function act(kind: 'join' | 'leave') {
    setBusy(kind);
    setError(null);
    setMessage(null);

    let res: Response;
    try {
      res = await fetch('/api/family/learner', {
        method: kind === 'join' ? 'POST' : 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ familyId }),
      });
    } catch {
      // Both buttons used to stay disabled for good when the request could
      // not be made: nothing caught this.
      setError(words.unreachable);
      setBusy(null);
      return;
    }
    const json = (await res.json().catch(() => null)) as
      | { ok?: unknown; code?: unknown; created?: unknown; joined?: unknown }
      | null;

    setBusy(null);

    if (!res.ok || json?.ok !== true) {
      setError(sentenceFor(familyOutcomeOf(res.status, json?.code)));
      return;
    }

    setMessage(
      kind === 'join'
        ? words.outcomes[joinOutcomeOf({ created: json.created === true, joined: json.joined === true })]
        : words.left,
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="outline-h">
        <h3 style={{ marginTop: 0, marginBottom: 0 }} dir="auto">{words.heading}</h3>
      </div>
      <p className="muted" style={{ marginTop: '0.5rem' }}>{words.why}</p>

      {canJoinFamily(state) && (
        <button
          type="button"
          className="btn"
          onClick={() => act('join')}
          disabled={busy !== null}
        >
          {busy === 'join' ? words.joining : words.join}
        </button>
      )}

      {state === 'in-family' && (
        <>
          <button
            type="button"
            className="btn secondary"
            onClick={() => act('leave')}
            disabled={busy !== null}
          >
            {busy === 'leave' ? words.leaving : words.leave}
          </button>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
            {words.leaveNote}
          </p>
        </>
      )}

      {message && <p className="notice" role="status" style={{ marginBottom: 0 }}>{message}</p>}
      {error && <p className="notice error" role="alert" style={{ marginBottom: 0 }}>{error}</p>}
    </div>
  );
}
