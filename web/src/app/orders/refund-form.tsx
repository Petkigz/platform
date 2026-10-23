'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, fromMinor } from '@/lib/money';
import { describeRemaining } from '@/lib/refunds';

/**
 * Ask for a refund.
 *
 * The amount is fixed at the order total and is not editable here, so the form
 * cannot send a number the user did not see. A partial refund is possible in
 * the schema and staff can arrange one, but the default ask is everything — and
 * letting someone type an arbitrary number would mostly produce requests that
 * the refundable-balance check then refuses.
 *
 * The confirmation says plainly that nothing has been paid back yet, because
 * "submitted" reads like "done" and the refund is actually waiting on a person.
 */
export function RefundForm({
  orderId,
  amountMinor,
  currencyCode,
  closesAt,
  remainingHours,
}: {
  orderId: string;
  amountMinor: string | number;
  currencyCode: string;
  /** When the 72-hour window shuts, from the database's clock. */
  closesAt?: string | null;
  remainingHours?: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  const amount = format(fromMinor(amountMinor, currencyCode));

  async function submit() {
    setMessage(null);

    const res = await fetch('/api/refunds', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId, amountMinor: String(amountMinor), reason }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'Could not send that request.');
      return;
    }

    setTone('info');
    setOpen(false);
    setReason('');
    setMessage('Sent. Someone will review it — nothing has been refunded yet.');
    startTransition(() => router.refresh());
  }

  if (message && !open) {
    return (
      <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
        {message}
      </div>
    );
  }

  if (!open) {
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
        <button
          type="button"
          className="btn secondary"
          style={{ width: 'auto', margin: 0 }}
          onClick={() => setOpen(true)}
        >
          Request a refund
        </button>
        {closesAt ? (
          <span className="muted" style={{ fontSize: '0.78rem' }}>
            Until {new Date(closesAt).toLocaleString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
            })} UTC
            {remainingHours !== null && remainingHours !== undefined
              ? ` — ${describeRemaining(remainingHours)}`
              : ''}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '0.5rem', width: '100%' }}>
      <label className="eyebrow" htmlFor={`r-${orderId}`}>
        Why do you want a refund of {amount}?
      </label>
      <input
        id={`r-${orderId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="What went wrong"
      />
      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          disabled={pending || reason.trim().length === 0}
          onClick={submit}
        >
          {pending ? 'Sending…' : 'Send request'}
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
      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
      <p className="muted">
        A person reviews every request. Access stays open until a refund is
        actually settled.
      </p>
    </div>
  );
}
