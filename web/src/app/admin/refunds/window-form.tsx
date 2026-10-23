'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Move the refund window.
 *
 * Beside the policy it changes rather than buried in a settings table, because
 * the person changing "how long a family has to change their mind" should be
 * looking at the queue of people who already did.
 *
 * Both ends refuse: this form says what is wrong with a number, and
 * `set_refund_window()` refuses the same things again with the same words. The
 * database is the boundary that matters — a form is just the pleasant way in.
 */
export function RefundWindowForm({ currentHours }: { currentHours: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hours, setHours] = useState(String(currentHours));
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function submit() {
    setMessage(null);

    const res = await fetch('/api/admin/refunds/window', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hours, reason }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; hours?: number };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'Could not change the window.');
      return;
    }

    setTone('info');
    setReason('');
    setMessage(
      json.hours === 0
        ? 'Saved. Self-serve refunds are now closed; staff can still open one on a customer\u2019s behalf.'
        : `Saved. A customer now has ${json.hours} hours from the payment to ask for a refund.`,
    );
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'grid', gap: '0.6rem', maxWidth: '30rem' }}>
      <div>
        <label className="eyebrow" htmlFor="window-hours">
          Hours after payment ({currentHours} now)
        </label>
        <input
          id="window-hours"
          inputMode="numeric"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="72"
        />
      </div>
      <div>
        <label className="eyebrow" htmlFor="window-reason">
          Why, in writing
        </label>
        <input
          id="window-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What changed, and what you expect it to do"
        />
      </div>
      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn secondary"
          disabled={pending || reason.trim().length < 4}
          onClick={submit}
        >
          {pending ? 'Saving…' : 'Save the window'}
        </button>
      </div>
      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : ''}`} role="status">
          {message}
        </div>
      )}
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Changing this does not touch a request already made, and it does not decide
        one — the window bounds asking. Everything else is written to the audit trail
        with your name, the old value and the new one.
      </p>
    </div>
  );
}
