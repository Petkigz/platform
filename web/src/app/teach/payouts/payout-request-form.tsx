'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The request form.
 *
 * It shows what is payable and what is still inside its refund hold *before*
 * the button, because "why can I not withdraw this" is the question a teacher
 * actually has. Disabled while payouts are off, with the reason stated rather
 * than hidden.
 */
export type PayoutCurrency = {
  currency: string;
  eligibleLabel: string;
  eligibleEntries: number;
  heldLabel: string;
  heldEntries: number;
  nextEligibleLabel: string | null;
  openPayoutLabel: string | null;
};

export function PayoutRequestForm({
  currencies,
  enabled,
  holdDays,
}: {
  currencies: PayoutCurrency[];
  enabled: boolean;
  holdDays: number;
}) {
  const router = useRouter();
  const payable = currencies.filter((c) => c.eligibleEntries > 0 && !c.openPayoutLabel);
  const [currency, setCurrency] = useState(payable[0]?.currency ?? '');
  const [destination, setDestination] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const chosen = payable.find((c) => c.currency === currency);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch('/api/teach/payouts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'request', currency, destination, acknowledgeTax: acknowledge }),
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || result?.ok !== true) {
      setMessage({ ok: false, text: result?.message ?? 'The request could not be recorded.' });
      return;
    }
    setMessage({ ok: true, text: result.message ?? 'Requested.' });
    setDestination('');
    setAcknowledge(false);
    startTransition(() => router.refresh());
  }

  if (!enabled) {
    return (
      <div className="notice warn">
        <strong>Requesting a payout is switched off.</strong> The request, the queue and the refund hold are
        built, but sending money needs a payout provider, destination details for each teacher, and a tax
        treatment for each country. Until those exist this form would only collect promises, so it is inert.
      </div>
    );
  }

  if (payable.length === 0) {
    return (
      <p className="empty">
        Nothing can be requested right now. Earnings wait {holdDays} day(s) before they are payable, so a
        refund can land first.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: '1.25rem', display: 'grid', gap: '0.9rem' }}>
      <div className="outline-h" style={{ marginTop: 0 }}>
        <h3>Ask to be paid</h3>
      </div>

      <label>
        Currency
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} required>
          {payable.map((c) => (
            <option key={c.currency} value={c.currency}>
              {c.currency} — {c.eligibleLabel} payable
            </option>
          ))}
        </select>
      </label>

      {chosen && (
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          {chosen.eligibleEntries} earning(s) are out of their refund hold. This is an estimate: entries that
          reverse while the request waits drop out, so the amount paid is whatever the ledger owes on the day
          finance sends it.
        </p>
      )}

      <label>
        Where should the money go?
        <textarea
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Mobile money number, bank account, or whatever a person would need to send it"
          required
        />
      </label>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <input
          type="checkbox"
          checked={acknowledge}
          onChange={(e) => setAcknowledge(e.target.checked)}
          style={{ marginTop: '0.3rem' }}
        />
        <span>
          I understand that declaring this income is my own responsibility in the country where I live, and
          that the platform is not withholding tax for me.
        </span>
      </label>

      {message && (
        <div className={message.ok ? 'notice' : 'notice error'} role={message.ok ? 'status' : 'alert'}>
          {message.text}
        </div>
      )}

      <div>
        <button className="btn" type="submit" disabled={pending || !acknowledge}>
          Request a payout
        </button>
      </div>
    </form>
  );
}

export function CancelPayoutButton({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function cancel() {
    setError(null);
    const response = await fetch('/api/teach/payouts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', payoutId }),
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || result?.ok !== true) {
      setError(result?.message ?? 'Could not cancel.');
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <span>
      <button className="outline-h" type="button" onClick={cancel} disabled={pending} style={{ cursor: 'pointer' }}>
        Cancel
      </button>
      {error && (
        <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
          {error}
        </span>
      )}
    </span>
  );
}
