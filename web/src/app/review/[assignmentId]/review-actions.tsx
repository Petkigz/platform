'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DECISION_LABEL,
  SCOPE_LABEL,
  type Decision,
  type ReviewAssignment,
} from '@/lib/review';

/**
 * Act on one assignment: accept it, or record a decision.
 *
 * The rationale is required for every outcome, including approval. It is the
 * record a teacher appeals against, and "looks fine" is not an appeal answer.
 */
export function ReviewActions({ assignment }: { assignment: ReviewAssignment }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');
  const [, startTransition] = useTransition();

  const open = assignment.status === 'offered';
  const decided = assignment.decisions.length > 0;

  async function post(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);

    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assignmentId: assignment.id, ...payload }),
    });
    const json = (await res.json().catch(() => null)) as { ok: boolean; message?: string };

    setBusy(null);
    if (!json.ok) {
      setError(json.message ?? 'That did not work.');
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function decide(decision: Decision) {
    await post({ action: 'decide', decision, rationale }, `decide-${decision}`);
  }

  return (
    <div>
      {error && (
        <div className="notice error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      {open && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>This review is offered to you</h3>
          <p className="meta" style={{ marginTop: 0 }}>
            Nothing is expected until you accept it.
          </p>
          <div className="row">
            <button
              type="button"
              className="btn"
              disabled={busy === 'accept'}
              onClick={() => post({ action: 'respond', accept: true }, 'accept')}
            >
              {busy === 'accept' ? 'Accepting…' : 'Accept this review'}
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={busy === 'decline'}
              onClick={() => post({ action: 'respond', accept: false }, 'decline')}
            >
              {busy === 'decline' ? 'Declining…' : 'Decline'}
            </button>
          </div>
        </div>
      )}

      {!open && !decided && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            Record a {SCOPE_LABEL[assignment.scope].toLowerCase()} decision
          </h3>

          <label htmlFor="rationale">Reason</label>
          <textarea
            id="rationale"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={5}
            placeholder="What did you check, and what did you find? This is the record a teacher would appeal against."
            required
          />

          <div className="row" style={{ marginTop: '0.75rem' }}>
            {(Object.keys(DECISION_LABEL) as Decision[]).map((d) => (
              <button
                key={d}
                type="button"
                className={d === 'approved' ? 'btn' : 'btn secondary'}
                disabled={busy === `decide-${d}` || rationale.trim().length === 0}
                onClick={() => decide(d)}
              >
                {busy === `decide-${d}` ? 'Recording…' : DECISION_LABEL[d]}
              </button>
            ))}
          </div>

          <p className="meta" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            Approving moves the version to <strong>approved</strong>, where a
            platform admin can publish it. You cannot publish it yourself, and
            you cannot approve a course you wrote.
          </p>
        </div>
      )}

      {decided && (
        <div className="notice">
          You have already recorded a decision on this assignment.
          <ul style={{ marginBottom: 0, marginTop: '0.5rem' }}>
            {assignment.decisions.map((d) => (
              <li key={d.id}>
                <strong>{DECISION_LABEL[d.decision] ?? d.decision}</strong>
                {d.decidedAt && (
                  <span className="meta">
                    {' '}
                    · {new Date(d.decidedAt).toLocaleDateString()}
                  </span>
                )}
                {d.rationale && <div className="meta">{d.rationale}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
