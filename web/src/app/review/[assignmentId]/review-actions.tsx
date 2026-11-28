'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Decision } from '@/lib/review';
import {
  isAssignmentRefusal,
  type AssignmentRefusal,
  type AssignmentSeat,
  type AssignmentWords,
} from '@/lib/review-assignment';

const DECISIONS: Decision[] = ['approved', 'revision_requested', 'rejected'];

/**
 * Act on one assignment: answer the offer, or record a decision.
 *
 * The rationale is required for every outcome, including approval. It is the
 * record a teacher appeals against, and "looks fine" is not an appeal answer.
 *
 * Its words come from the page, in the reader's language (2026-11-28), and a
 * refusal is said by the name the route gives it. An answer nobody could
 * read is not a refusal: it says that nobody knows whether the decision was
 * recorded, because a decision is recorded once. Until then a request that
 * threw left the button disabled for good, and an answer that was not JSON
 * threw inside this component.
 *
 * Which card is shown is the page's `seat`: the form is offered only on a
 * review that can take a decision.
 */
export function ReviewActions({
  assignmentId,
  seat,
  decisions,
  words,
}: {
  assignmentId: string;
  seat: AssignmentSeat;
  decisions: { id: string; decision: Decision; rationale: string | null }[];
  words: AssignmentWords;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<AssignmentRefusal | null>(null);
  // A decision that was recorded while the course stayed where it was.
  const [notMoved, setNotMoved] = useState(false);
  const [rationale, setRationale] = useState('');
  const [, startTransition] = useTransition();

  async function post(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assignmentId, ...payload }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown; moved?: unknown } | null;
      if (json?.ok === true) {
        if (json.moved === 'no') setNotMoved(true);
        startTransition(() => router.refresh());
        return;
      }
      // A reply with no name on it is not a refusal anybody can vouch for.
      setError(isAssignmentRefusal(json?.code) ? json.code : 'unsure');
    } catch {
      setError('unsure');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="assignment-actions" data-assign-actions={seat}>
      {error && (
        <div className="notice error" role="alert" data-assign-refusal={error}>
          {words.refusals[error]}
        </div>
      )}
      {notMoved && (
        <div className="notice warn" role="status" data-assign-moved="no">
          {words.notMoved}
        </div>
      )}

      {seat === 'offer' && (
        <div className="card">
          <h3>{words.offerHead}</h3>
          <p className="meta">{words.offerNote}</p>
          <div className="row assignment-buttons">
            <button
              type="button"
              className="btn"
              disabled={busy !== null}
              onClick={() => post({ action: 'respond', accept: true }, 'accept')}
            >
              {busy === 'accept' ? words.working : words.accept}
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={busy !== null}
              onClick={() => post({ action: 'respond', accept: false }, 'decline')}
            >
              {busy === 'decline' ? words.working : words.decline}
            </button>
          </div>
        </div>
      )}

      {seat === 'decide' && (
        <div className="card">
          <h3>{words.recordHead}</h3>

          <label htmlFor="rationale">{words.reason}</label>
          <textarea
            id="rationale"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={5}
            placeholder={words.reasonHint}
            dir="auto"
            required
          />

          <div className="row assignment-buttons">
            {DECISIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={d === 'approved' ? 'btn' : 'btn secondary'}
                disabled={busy !== null || rationale.trim().length === 0}
                onClick={() => post({ action: 'decide', decision: d, rationale }, `decide-${d}`)}
              >
                {busy === `decide-${d}` ? words.working : words.decisionButton[d]}
              </button>
            ))}
          </div>

          <p className="meta">{words.approveNote}</p>
        </div>
      )}

      {seat === 'decided' && (
        <div className="notice" data-assign-decided>
          {words.decided}
          <ul>
            {decisions.map((d) => (
              <li key={d.id}>
                <strong>{words.decisionMade[d.decision] ?? ''}</strong>
                {words.days[d.id] ? <span className="meta"> · {words.days[d.id]}</span> : null}
                {d.rationale && <div className="meta" dir="auto">{d.rationale}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {seat === 'closed' && (
        <div className="notice" data-assign-closed>{words.closedNote}</div>
      )}
    </div>
  );
}
