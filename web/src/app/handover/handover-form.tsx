'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  HANDOVER_OPTIONS,
  HANDOVER_DECLARATION,
  confirmSentence,
  describeOutcome,
  requestHandover,
  type HandoverDecision,
} from '@/lib/handover';

/**
 * Two decisions, one statement, and no third option.
 *
 * The confirmation is deliberately not a modal: the sentence a person is agreeing
 * to sits above the button, in the same words the database will store, because a
 * record that says "they confirmed" while the screen said something else is how a
 * consent becomes a document nobody can rely on.
 */
export function HandoverForm({
  learnerId,
  learnerName,
  hasOwnAccount,
}: {
  learnerId: string;
  learnerName: string;
  hasOwnAccount: boolean;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<HandoverDecision | null>(null);
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');
  const [done, setDone] = useState(false);

  async function submit() {
    if (!decision) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await requestHandover({
        learnerId,
        decision,
        declaresAdult: declared,
      });
      if (!result.ok) {
        setTone('error');
        setMessage(result.message);
        return;
      }
      setTone('info');
      setDone(true);
      setMessage(describeOutcome(result.outcome));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="notice info" role="status">
        {message}
      </p>
    );
  }

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {HANDOVER_OPTIONS.map((option) => (
        <label
          key={option.value}
          className="card"
          style={{ display: 'block', padding: '0.9rem 1rem', marginBlockEnd: '0.6rem', cursor: 'pointer' }}
        >
          <span style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <input
              type="radio"
              name={`handover-${learnerId}`}
              value={option.value}
              checked={decision === option.value}
              onChange={() => { setDecision(option.value); setMessage(null); }}
            />
            <span>
              <strong>{option.label}</strong>
              <br />
              <span className="muted">{option.effect}</span>
            </span>
          </span>
          {option.value === 'keep' && !hasOwnAccount && (
            <span className="muted" style={{ display: 'block', marginBlockStart: '0.4rem' }}>
              This learner has no login yet, so this option will be refused until they
              have one. Make them a login on the family page first.
            </span>
          )}
        </label>
      ))}

      {decision && (
        <>
          <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBlock: '0.75rem' }}>
            <input
              type="checkbox"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
            />
            <span>{HANDOVER_DECLARATION}</span>
          </label>

          <p className="muted" style={{ fontSize: '0.9rem' }}>
            {confirmSentence(decision, learnerName)}
          </p>

          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={submit}
              disabled={busy || !declared}
            >
              {busy ? 'Working…' : decision === 'keep' ? 'Make the record theirs' : 'Decide not to keep it'}
            </button>
          </div>
        </>
      )}

      {message && (
        <div className={tone === 'error' ? 'notice error' : 'notice info'} role="alert"
             style={{ marginBlockStart: '0.75rem' }}>
          {message}
        </div>
      )}
    </div>
  );
}
