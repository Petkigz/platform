'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, fromMinor, isCurrency, toMajorString } from '@/lib/money';

/**
 * Open a refund request for a customer, after their window has closed.
 *
 * **Two fields became three on 2026-11-02, and the reason is a gap closing.**
 * Until today this form refunded whatever was left, which made a goodwill
 * part-refund — half a course sold at the wrong level, a family that got part of
 * what they paid for — a database action with no screen. That meant it was done in
 * SQL, where nothing is audited. The amount is now editable, and staying blank
 * still means "all of it", so the common case is exactly as quick as it was.
 *
 * The amount box fills itself with what the database says is left, because the
 * person on the call should be reading a number, not calculating one. Typing over
 * it is the rare case and the one that needs a sentence: **part of it leaves the
 * learner's access in place; all of it closes the course.**
 *
 * Nothing here decides anything. The request goes in the queue attributed to the
 * member of staff who opened it, and somebody else approves it.
 */
export function OpenOnBehalfForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [orderNumber, setOrderNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [standing, setStanding] = useState<{
    orderNumber: string;
    refundableMinor: string;
    currencyCode: string;
  } | null>(null);
  const [looking, setLooking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function lookUp(raw: string) {
    const order = raw.trim().toUpperCase();
    setStanding(null);
    setAmount('');
    if (!/^AS-\d{8}$/.test(order)) return;

    setLooking(true);
    try {
      const res = await fetch(
        `/api/admin/refunds/on-behalf?order=${encodeURIComponent(order)}`,
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        orderNumber?: string;
        refundableMinor?: string;
        currencyCode?: string;
      };
      if (!res.ok) {
        setTone('error');
        setMessage(json.error ?? 'That order could not be read.');
        return;
      }
      const currency = json.currencyCode ?? '';
      const refundable = json.refundableMinor ?? '0';
      setStanding({
        orderNumber: json.orderNumber ?? order,
        refundableMinor: refundable,
        currencyCode: currency,
      });
      // The whole amount, written the way the currency writes it, so the common
      // case is one press: a zero-decimal currency shows 40000, not 40,000.00.
      setAmount(isCurrency(currency) ? toMajorString(fromMinor(refundable, currency)) : refundable);
      setTone('info');
      setMessage(null);
    } catch {
      setTone('error');
      setMessage('That order could not be read.');
    } finally {
      setLooking(false);
    }
  }

  async function submit() {
    setMessage(null);

    const res = await fetch('/api/admin/refunds/on-behalf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderNumber, reason, amount }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      amountMinor?: string;
      currencyCode?: string;
      partial?: boolean;
      refundableMinor?: string;
    };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'Could not open that request.');
      return;
    }

    const currency = json.currencyCode ?? 'UGX';
    const given = format(fromMinor(json.amountMinor ?? '0', currency));
    const left = format(fromMinor(json.refundableMinor ?? '0', currency));

    setTone('info');
    setOrderNumber('');
    setAmount('');
    setReason('');
    setStanding(null);
    setMessage(
      json.partial
        ? `Opened for ${given} of the ${left} on that order. The learner keeps the course. `
          + 'It is waiting in the queue — nothing has been refunded, and someone else has to approve it.'
        : `Opened for all ${given}. The course closes when the refund completes. `
          + 'It is waiting in the queue — nothing has been refunded, and someone else has to approve it.',
    );
    startTransition(() => router.refresh());
  }

  const ready = Boolean(standing) && reason.trim().length > 0;

  return (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '34rem' }}>
      <div>
        <label className="eyebrow" htmlFor="behalf-order">
          Order number
        </label>
        <input
          id="behalf-order"
          value={orderNumber}
          onChange={(e) => {
            setOrderNumber(e.target.value);
            setStanding(null);
          }}
          onBlur={(e) => {
            if (!standing) void lookUp(e.target.value);
          }}
          placeholder="AS-00001234"
          autoComplete="off"
        />
        {looking && <p className="muted" style={{ margin: '0.35rem 0 0' }}>Looking that up…</p>}
      </div>

      {standing && (
        <div className="notice" role="status">
          <strong>
            {format(fromMinor(standing.refundableMinor, standing.currencyCode))}
          </strong>{' '}
          is still refundable on {standing.orderNumber}.
        </div>
      )}

      <div>
        <label className="eyebrow" htmlFor="behalf-amount">
          How much
        </label>
        <input
          id="behalf-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={standing ? 'Leave it as it is for all of it' : 'Look up the order first'}
          inputMode="decimal"
          autoComplete="off"
          disabled={!standing}
        />
        <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
          Leave it as it is to give back everything. A smaller number is a goodwill
          part-refund, and <strong>the learner keeps the course</strong>; all of it
          closes the course when the refund completes.
        </p>
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
          disabled={pending || !ready}
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
