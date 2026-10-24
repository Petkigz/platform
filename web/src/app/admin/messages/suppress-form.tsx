'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Stop writing to one address.
 *
 * This is the by-hand path to the same list a bounce writes to. It exists for
 * what a provider cannot tell us: a family writing in because mail is reaching
 * somebody else, or a complaint that arrived by a route the provider never saw.
 *
 * It says how many messages it stopped, because "added to the list" and
 * "yesterday's queue will not go out either" are two different reassurances.
 */
export function SuppressForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [address, setAddress] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function submit() {
    setMessage(null);
    const res = await fetch('/api/admin/messages/suppress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel: 'email', address, reason }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      address?: string;
      stoppedQueued?: number;
    };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'Could not stop mail to that address.');
      return;
    }

    setTone('info');
    setAddress('');
    setReason('');
    const stopped = json.stoppedQueued ?? 0;
    setMessage(
      `${json.address ?? 'That address'} will not be written to again. `
        + (stopped === 0
          ? 'Nothing was waiting for it.'
          : `${stopped} message${stopped === 1 ? ' that was' : 's that were'} already queued ${stopped === 1 ? 'is' : 'are'} now suppressed.`),
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="card" style={{ padding: '1.25rem', display: 'grid', gap: '0.6rem' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Stop writing to an address</h3>
        <p className="muted" style={{ fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
          A hard bounce adds an address to this list on its own. Use this when a
          family tells us directly. Anything already queued for the address is
          stopped with it.
        </p>
      </div>

      <div>
        <label className="eyebrow" htmlFor="suppress-address">
          Email address
        </label>
        <input
          id="suppress-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="name@example.com"
          autoComplete="off"
        />
      </div>

      <div>
        <label className="eyebrow" htmlFor="suppress-reason">
          Why
        </label>
        <input
          id="suppress-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What the family said, or what the provider reported"
          autoComplete="off"
        />
      </div>

      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn secondary"
          disabled={pending || address.trim().length < 3 || reason.trim().length < 4}
          onClick={submit}
        >
          {pending ? 'Stopping…' : 'Stop writing to it'}
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
