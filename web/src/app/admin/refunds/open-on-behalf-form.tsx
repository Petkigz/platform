'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, fromMinor } from '@/lib/money';

/**
 * Open a refund request for a customer, after their window has closed.
 *
 * Deliberately two fields and no amount. The amount is whatever is still
 * refundable, which the server reads from the database — a person on a support
 * call should not be retyping a figure in a currency they have to read off
 * another screen, and a mistyped amount on a goodwill refund is money somebody
 * has to chase. A partial refund is still a database action and has no screen
 * yet; that gap is recorded rather than papered over with a free-text box.
 */
export function OpenOnBehalfForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [orderNumber, setOrderNumber] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function submit() {
    setMessage(null);

    const res = await fetch('/api/admin/refunds/on-behalf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderNumber, reason }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      amountMinor?: string;
      currencyCode?: string;
    };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'Could not open that request.');
      return;
    }

    setTone('info');
    setOrderNumber('');
    setReason('');
    setMessage(
      `Opened for ${format(fromMinor(json.amountMinor ?? '0', json.currencyCode ?? 'UGX'))}. `
      + 'It is waiting in the queue — nothing has been refunded, and someone else has to approve it.',
    );
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '34rem' }}>
      <div>
        <label className="eyebrow" htmlFor="behalf-order">
          Order number
        </label>
        <input
          id="behalf-order"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="AS-00001234"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="eyebrow" htmlFor="behalf-reason">
          Why, in writing
        </label>
        <input
          id="behalf-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What happened, and what you agreed on the call"
        />
      </div>
      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          disabled={pending || orderNumber.trim().length === 0 || reason.trim().length === 0}
          onClick={submit}
        >
          {pending ? 'Opening…' : 'Open the request'}
        </button>
      </div>
      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : ''}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
