'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Approve or decline one refund request.
 *
 * The confirmation wording matters here more than anywhere else in the admin:
 * approving is an agreement, not a transfer. Saying "Approved — waiting on the
 * provider" is the difference between staff knowing where the money is and
 * staff believing they sent it.
 */
export function DecideForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function decide(approve: boolean) {
    setMessage(null);

    if (!approve && notes.trim().length === 0) {
      setTone('error');
      setMessage('Declining a refund needs a written reason.');
      return;
    }

    const res = await fetch('/api/admin/refunds', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestId, approve, notes: notes || undefined }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The decision was not recorded.');
      return;
    }

    setTone('info');
    setNotes('');
    setMessage(
      approve
        ? 'Approved. The refund is now pending with the provider — no money has moved yet.'
        : 'Declined. The requester keeps access and nothing is refunded.',
    );
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div>
        <label className="eyebrow" htmlFor={`n-${requestId}`}>
          Notes (required to decline)
        </label>
        <input
          id={`n-${requestId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What you checked, or why you are declining"
        />
      </div>

      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() => decide(true)}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={pending}
          onClick={() => decide(false)}
        >
          Decline
        </button>
      </div>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
