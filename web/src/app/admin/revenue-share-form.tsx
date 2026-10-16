'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function RevenueShareForm({ currentPercent }: { currentPercent: number }) {
  const router = useRouter();
  const [percent, setPercent] = useState(String(currentPercent));
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSaved(false);

    const numericPercent = Number(percent);
    const response = await fetch('/api/admin/revenue-share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ percent: numericPercent, reason }),
    });
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      percent?: number;
      message?: string;
    } | null;

    if (!response.ok || result?.ok !== true) {
      setMessage(result?.message ?? 'Could not save the revenue share.');
      return;
    }

    setPercent(String(result.percent ?? numericPercent));
    setReason('');
    setSaved(true);
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={save} className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div className="outline-h" style={{ marginTop: 0 }}>
        <h3>Teacher revenue share</h3>
        <span className="badge neutral">{currentPercent}% to teachers</span>
      </div>
      <p className="muted">
        The teacher&rsquo;s percentage of course-sale proceeds. Processing fees, tax treatment,
        and whether this is uniform across teachers still need a policy decision; the percentage
        is not a substitute for deciding those terms.
      </p>
      {currentPercent === 0 && (
        <div className="notice" role="note">
          It is still 0%: teachers currently accrue no share and the platform retains the sale
          proceeds. No percentage was chosen on your behalf.
        </div>
      )}
      <div style={{ display: 'grid', gap: '0.8rem', maxWidth: '34rem', marginTop: '1rem' }}>
        <label>
          Teacher share, whole percent
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              required
              value={percent}
              onChange={(event) => setPercent(event.target.value)}
              aria-label="Teacher revenue share percent"
            />
            <span>%</span>
          </span>
        </label>
        <label>
          Reason for this change (kept in the audit log)
          <textarea
            required
            maxLength={500}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: approved instructor compensation policy, reviewed on…"
          />
        </label>
        <div>
          <button type="submit" className="btn" disabled={pending}>
            {pending ? 'Saving…' : 'Save revenue share'}
          </button>
          {saved && <span className="success" role="status" style={{ marginLeft: '0.75rem' }}>Saved.</span>}
          {message && <p className="danger" role="alert">{message}</p>}
        </div>
      </div>
    </form>
  );
}
