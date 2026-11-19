'use client';

import { useState } from 'react';

import { pledgeOutcomeOf, type PledgeOutcome } from '@/lib/checkout-outcome';

/**
 * The words this form says. Chosen on the server, in the reader's language:
 * a script sent to a browser holds no catalogue.
 */
export type PayWords = {
  payWith: string;
  phoneLabel: string;
  phoneNote: string;
  /** With `{country}` and `{dial}` in it. */
  phoneCountry: string;
  submit: string;
  starting: string;
  approve: string;
  orderSaved: string;
  reasons: Record<PledgeOutcome, string>;
};

type Service = { id: string; label: string; countryName: string | null; dial: string | null };

/**
 * Pay one pledge: which service, which number, and one press.
 *
 * The amount is not here and is not sent: the database reads it from the
 * pledge. Neither is anything about who the seat is for.
 *
 * **A press that got no answer is not a failure.** An order is written before
 * the payment service is called, and a prompt may already be on the phone.
 * So a lost reply is said as "we could not confirm", never as "try again".
 */
export function PayForm({
  sponsorshipId,
  providers,
  words,
}: {
  sponsorshipId: string;
  providers: Service[];
  words: PayWords;
}) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [msisdn, setMsisdn] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [tone, setTone] = useState<'info' | 'warn' | 'error'>('info');
  const [message, setMessage] = useState<string | null>(null);

  const chosen = providers.find((p) => p.id === providerId) ?? providers[0];
  const [countryLead, countryRest] = words.phoneCountry.split('{country}');
  const [countryMid, countryTail] = (countryRest ?? '').split('{dial}');

  async function pay() {
    if (busy || started) return;
    setBusy(true);
    setMessage(null);

    let res: Response;
    try {
      res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sponsorshipId, provider: providerId || undefined, msisdn: msisdn || undefined }),
      });
    } catch {
      setTone('warn');
      setMessage(words.reasons.unconfirmed);
      setBusy(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as { reason?: unknown; kind?: unknown; url?: unknown; orderId?: unknown } | null;

    if (res.ok && json?.kind === 'redirect' && typeof json.url === 'string' && json.url !== '') {
      // Still busy: the page is leaving.
      window.location.href = json.url;
      return;
    }
    setBusy(false);

    if (res.ok && json?.kind === 'pending') {
      // One prompt is on its way. The button is not offered again on this
      // page: a second press would be a second prompt for the same pledge.
      setStarted(true);
      setTone('info');
      setMessage(words.approve);
      return;
    }

    const reason = pledgeOutcomeOf(res.status, json?.reason);
    const platform = reason === 'disabled' || reason === 'provider_unavailable' || reason === 'provider_failed' || reason === 'unconfirmed';
    setTone(platform ? 'warn' : 'error');
    const saved = typeof json?.orderId === 'string' && json.orderId !== '' && reason !== 'unconfirmed';
    setMessage(saved ? `${words.reasons[reason]} ${words.orderSaved}` : words.reasons[reason]);
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {providers.length > 1 && (
        <fieldset disabled={busy || started}>
          <legend className="eyebrow">{words.payWith}</legend>
          {providers.map((p) => (
            <label key={p.id} className="radio">
              <input type="radio" name="provider" value={p.id} checked={providerId === p.id} onChange={() => setProviderId(p.id)} />
              {/* A service's name is its own; the country it collects in is the reader's word for it. */}
              <span>
                <bdi dir="ltr">{p.label}</bdi>
                {p.countryName && (
                  <>
                    {' · '}
                    <bdi>{p.countryName}</bdi>
                  </>
                )}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <div>
        <label htmlFor="pledge-msisdn" className="eyebrow">
          {words.phoneLabel}
        </label>
        <input
          id="pledge-msisdn"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          aria-describedby="pledge-msisdn-help"
          value={msisdn}
          onChange={(e) => setMsisdn(e.target.value)}
          disabled={busy || started}
        />
        <p id="pledge-msisdn-help" className="muted">
          {words.phoneNote}
          {chosen?.countryName && chosen.dial && (
            <>
              {' '}
              {countryLead}
              <bdi>{chosen.countryName}</bdi>
              {countryMid}
              <bdi dir="ltr">{chosen.dial}</bdi>
              {countryTail}
            </>
          )}
        </p>
      </div>

      {!started && (
        <button type="button" className="btn" onClick={pay} disabled={busy}>
          {busy ? words.starting : words.submit}
        </button>
      )}

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : tone === 'warn' ? 'warn' : ''}`} role={tone === 'info' ? 'status' : 'alert'}>
          {message}
        </div>
      )}
    </div>
  );
}
