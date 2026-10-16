'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type PriceOption = {
  id: string;
  label: string;
  interval: string;
};

/**
 * The checkout form.
 *
 * It posts a price id and never an amount. The server resolves the amount from
 * the price row, so this component cannot change what is charged no matter what
 * the browser sends.
 *
 * The success handling is deliberately cautious. A `redirect` result means the
 * payer leaves to pay, and the entitlement arrives later via the webhook — not
 * on the way back. A `pending` result is mobile money, where the prompt appears
 * on the handset. Neither is a confirmation, so neither says "you're in".
 */
export function BuyForm({
  courseId,
  prices,
  providers,
  providerConfigured,
}: {
  courseId: string;
  prices: PriceOption[];
  /** Providers that are configured and usable right now. */
  providers: { id: string; label: string; requiresMsisdn: boolean }[];
  providerConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [priceId, setPriceId] = useState(prices[0]?.id ?? '');
  const [msisdn, setMsisdn] = useState('');
  // Default to the first live provider. With one provider this is the only
  // choice, so the selector renders as a single option rather than a decision
  // the payer has to make.
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const chosen = providers.find((p) => p.id === providerId);
  const needsNumber = chosen?.requiresMsisdn ?? false;
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  if (prices.length === 0) {
    return (
      <p className="muted">
        There is no price available for this course right now.
      </p>
    );
  }

  async function buy() {
    setMessage(null);
    if (!priceId) {
      setTone('error');
      setMessage('Choose an option first.');
      return;
    }

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        courseId,
        priceId,
        msisdn: msisdn || undefined,
        provider: providerId || undefined,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      orderId?: string;
      kind?: 'redirect' | 'pending';
      url?: string;
      code?: string;
    };

    if (res.ok && json.kind === 'redirect' && json.url) {
      window.location.href = json.url;
      return;
    }

    if (res.ok && json.kind === 'pending') {
      setTone('info');
      setMessage(
        'Check your phone and approve the payment. Access opens once it is ' +
          'confirmed — you can close this page and watch it in your orders.',
      );
      return;
    }

    // An order can exist even when the request failed: the order is created
    // before the provider is called, and a provider outage is not a reason to
    // lose the record of the attempt.
    setTone(res.status === 503 || res.status === 502 ? 'info' : 'error');
    setMessage(
      json.error ?? 'Checkout failed. Please try again.',
    );
    if (json.orderId) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <fieldset style={{ display: 'grid', gap: '0.5rem' }}>
        {prices.map((p) => (
          <label key={p.id} className="row" style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name="price"
              value={p.id}
              checked={priceId === p.id}
              onChange={() => setPriceId(p.id)}
            />
            <span>
              <strong>{p.label}</strong>
              {p.interval !== 'one_time' && (
                <span className="muted"> · {p.interval}</span>
              )}
            </span>
          </label>
        ))}
      </fieldset>

      {providers.length > 1 && (
        <fieldset>
          <legend className="eyebrow">Pay with</legend>
          {providers.map((p) => (
            <label key={p.id} className="radio">
              <input
                type="radio"
                name="provider"
                value={p.id}
                checked={providerId === p.id}
                onChange={() => setProviderId(p.id)}
              />
              <span>{p.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      {needsNumber && (
      <div>
        <label htmlFor="msisdn" className="eyebrow">
          Mobile money number
        </label>
        <input
          id="msisdn"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0772 123456"
          value={msisdn}
          onChange={(e) => setMsisdn(e.target.value)}
        />
        <p className="muted">
          Used to send the payment prompt to your handset. Normalised to E.164
          before it is sent anywhere. Nothing is charged until you approve it on
          the phone.
        </p>
      </div>
      )}

      <button type="button" className="btn" onClick={buy} disabled={pending}>
        {pending ? 'Starting…' : 'Continue to payment'}
      </button>

      {message && (
        <div
          className={`notice ${tone === 'error' ? 'error' : 'warn'}`}
          role="status"
        >
          {message}
        </div>
      )}

      {!providerConfigured && (
        <p className="muted">
          This will create the order but cannot take payment yet.
        </p>
      )}
    </div>
  );
}
