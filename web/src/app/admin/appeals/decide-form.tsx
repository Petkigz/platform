'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Decide an appeal.
 *
 * Two rules worth stating on the screen rather than leaving to the server:
 * overturning needs a written summary, and the reviewer whose decision is being
 * appealed cannot decide it. The second one is not enforceable in this
 * component — it needs to know which decision the appeal concerns — so the
 * refusal comes back from the database and is shown here.
 */
export function DecideAppealForm({ appealId }: { appealId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<'upheld' | 'overturned' | 'withdrawn'>('upheld');
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setMessage(null);
    setError(null);

    if (outcome === 'overturned' && summary.trim().length === 0) {
      setError('Overturning a decision needs a written summary. The database requires one.');
      return;
    }

    const res = await fetch('/api/admin/appeals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appealId, outcome, summary: summary || undefined }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(json.error ?? 'Could not decide that appeal.');
      return;
    }

    setMessage('Decided.');
    setSummary('');
    startTransition(() => router.refresh());
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '0.5rem' }}>
      <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        {(
          [
            ['upheld', 'Uphold the rejection'],
            ['overturned', 'Overturn it'],
            ['withdrawn', 'Withdrawn by the author'],
          ] as const
        ).map(([value, text]) => (
          <label key={value} className="row" style={{ gap: '0.35rem' }}>
            <input
              type="radio"
              name={`outcome-${appealId}`}
              checked={outcome === value}
              onChange={() => setOutcome(value)}
            />
            {text}
          </label>
        ))}
      </div>

      <label className="eyebrow" htmlFor={`summary-${appealId}`}>
        Summary{outcome === 'overturned' ? ' (required)' : ''}
      </label>
      <textarea
        id={`summary-${appealId}`}
        rows={2}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder={
          outcome === 'overturned'
            ? 'What did the original decision get wrong?'
            : 'Optional'
        }
      />

      <div>
        <button
          type="button"
          className="btn"
          disabled={pending || (outcome === 'overturned' && summary.trim().length === 0)}
          onClick={submit}
        >
          {pending ? 'Saving…' : 'Decide'}
        </button>
      </div>

      {message && <div className="notice info" role="status">{message}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
    </div>
  );
}
