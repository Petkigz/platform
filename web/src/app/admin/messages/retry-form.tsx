'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Put one dead letter back in the queue.
 *
 * The reason is required because the next person to look at this row needs to
 * know why somebody believed a fifth attempt would work when four had not. The
 * address being on the do-not-send list is the one refusal worth wording
 * carefully: staff can act on it, but only deliberately.
 */
export function RetryForm({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function submit() {
    setMessage(null);
    const res = await fetch('/api/admin/messages/retry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, reason }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'Could not queue that again.');
      return;
    }

    setTone('info');
    setReason('');
    setMessage('Back in the queue. It will be tried on the next dispatch.');
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.6rem' }}>
      <label className="eyebrow" htmlFor={`retry-${id}`}>
        Why another try
      </label>
      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          id={`retry-${id}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What has changed since it failed"
          autoComplete="off"
          style={{ flex: '1 1 18rem' }}
        />
        <button
          type="button"
          className="btn secondary"
          disabled={pending || reason.trim().length < 4}
          onClick={submit}
        >
          {pending ? 'Queueing…' : 'Try again'}
        </button>
      </div>
      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : ''}`} role="status" style={{ margin: 0 }}>
          {message}
        </div>
      )}
    </div>
  );
}
