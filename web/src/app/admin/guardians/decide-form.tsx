'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Decide one guardian request.
 *
 * The reviewer is not a field here. It is taken from the session server-side,
 * because a consent record that lets the caller name the decider is not a
 * consent record.
 */
export function DecideForm({ relationshipId }: { relationshipId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [decision, setDecision] = useState<'verified' | 'rejected' | 'needs_information'>(
    'verified',
  );
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function submit() {
    setMessage(null);

    if (decision === 'rejected' && reason.trim().length === 0) {
      setTone('error');
      setMessage('A rejection needs a written reason. The database requires one.');
      return;
    }

    const res = await fetch('/api/admin/guardians', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        relationshipId,
        decision,
        reason,
        evidenceReference: evidence || undefined,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The decision was not recorded.');
      return;
    }

    setTone('info');
    setMessage('Recorded.');
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <fieldset className="row" style={{ gap: '1rem' }}>
        <label>
          <input
            type="radio"
            name={`d-${relationshipId}`}
            checked={decision === 'verified'}
            onChange={() => setDecision('verified')}
          />{' '}
          Verify
        </label>
        <label>
          <input
            type="radio"
            name={`d-${relationshipId}`}
            checked={decision === 'needs_information'}
            onChange={() => setDecision('needs_information')}
          />{' '}
          Need more information
        </label>
        <label>
          <input
            type="radio"
            name={`d-${relationshipId}`}
            checked={decision === 'rejected'}
            onChange={() => setDecision('rejected')}
          />{' '}
          Reject
        </label>
      </fieldset>

      <div>
        <label className="eyebrow" htmlFor={`r-${relationshipId}`}>
          Reason{decision === 'rejected' ? ' (required)' : ''}
        </label>
        <textarea
          id={`r-${relationshipId}`}
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What evidence was checked"
        />
      </div>

      <div>
        <label className="eyebrow" htmlFor={`e-${relationshipId}`}>
          Evidence reference (optional)
        </label>
        <input
          id={`e-${relationshipId}`}
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Where the evidence is stored, not the evidence itself"
        />
        <p className="muted">
          A pointer, not the document. Consent evidence has its own retention
          obligation and does not belong in this column.
        </p>
      </div>

      <button type="button" className="btn" onClick={submit} disabled={pending}>
        {pending ? 'Recording…' : 'Record decision'}
      </button>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}

      {decision === 'rejected' && (
        <p className="muted">
          Rejecting revokes the relationship and removes every requested
          capability. It is not a soft no.
        </p>
      )}
    </div>
  );
}
