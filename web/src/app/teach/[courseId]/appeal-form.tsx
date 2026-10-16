'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Contest a reviewer's rejection.
 *
 * This is the teacher's door. A gate with no appeal is not a scholarly gate, it
 * is just a refusal — and the person whose course was rejected is the one with
 * the most at stake in it being looked at again.
 *
 * One appeal at a time per decision, which the database enforces. Repeatedly
 * re-filing the same argument is not an appeal.
 */
export function AppealForm({
  decisionId,
  versionNumber,
}: {
  decisionId: string;
  versionNumber: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setMessage(null);
    setError(null);

    const res = await fetch('/api/appeals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decisionId, reason }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(json.error ?? 'Could not file that appeal.');
      return;
    }

    setOpen(false);
    setReason('');
    setMessage('Appeal filed. Someone other than the reviewer who rejected it will decide.');
    startTransition(() => router.refresh());
  }

  const label = versionNumber === null ? 'this version' : `version ${versionNumber}`;

  if (message && !open) {
    return (
      <p className="muted" role="status">
        {message}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn ghost"
        style={{ width: 'auto' }}
        onClick={() => setOpen(true)}
      >
        Appeal this rejection
      </button>
    );
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '0.5rem' }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        Appeal the rejection of {label}
      </p>
      <p className="muted" style={{ margin: 0 }}>
        Say what the review missed. Someone other than the reviewer who rejected
        it will decide — they cannot rule on their own decision.
      </p>

      <label className="eyebrow" htmlFor={`reason-${decisionId}`}>
        What are you appealing?
      </label>
      <textarea
        id={`reason-${decisionId}`}
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="The citation is in the second footnote; the wording matches the Madinah edition"
      />

      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          disabled={pending || reason.trim().length === 0}
          onClick={submit}
        >
          {pending ? 'Filing…' : 'File appeal'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>

      {message && <div className="notice info" role="status">{message}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
    </div>
  );
}
