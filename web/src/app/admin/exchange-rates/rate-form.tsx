'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SOURCE_MAX, OVERRIDE_MAX, validateRateInput } from '@/lib/currency';

/**
 * Recording one exchange rate.
 *
 * The form validates first, so a self-pair or a rate with no source is refused
 * here without a round trip — but the database refuses them too, and its refusal
 * is the one that matters, because a rate recorded through any other path has to
 * meet the same rule. The message shown is the one the database sent back, which
 * is why an implausible move arrives as a sentence that says what to write.
 *
 * `source` is not optional and not a dropdown. There is no rate feed in this
 * environment and no credential to call one with, so a rate is a fact a person
 * looked up, and the field is where they say where. A provider integration would
 * be a second writer of the same table with the same requirement, not a
 * replacement for the field.
 */
export function RateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const input = {
      base: data.get('base'),
      quote: data.get('quote'),
      rate: data.get('rate'),
      source: data.get('source'),
      observedAt: data.get('observedAt'),
      overrideReason: data.get('overrideReason'),
    };

    const validation = validateRateInput(input);
    if (!validation.ok) {
      setMessage(validation.message);
      setNotice(null);
      return;
    }

    setBusy(true);
    setMessage(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/exchange-rates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validation.value),
      });
      const out = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!response.ok || out?.ok !== true) {
        setMessage(out?.message ?? 'The rate was not recorded.');
        return;
      }
      setNotice(`Recorded: 1 ${validation.value.base} = ${validation.value.rate} ${validation.value.quote}.`);
      form.reset();
      startTransition(() => router.refresh());
    } catch {
      setMessage('Could not reach the service that records rates.');
    } finally {
      setBusy(false);
    }
  }

  const working = busy || pending;

  return (
    <section className="section">
      <h2>Record a rate</h2>
      <p className="muted">
        One observation of one pair, with where it came from. Recording a rate never
        changes a figure already stored: an amount stays in the currency it was
        charged in, and a total is converted on the way to being read.
      </p>

      {message && <div className="notice error" role="alert">{message}</div>}
      {notice && <div className="notice" role="status">{notice}</div>}

      <div className="card" style={{ padding: '1.25rem' }}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(event.currentTarget);
          }}
        >
          <div className="row">
            <label>
              From
              <input name="base" required minLength={3} maxLength={3} placeholder="UGX"
                     defaultValue="UGX" style={{ textTransform: 'uppercase' }} />
            </label>
            <label>
              Into
              <input name="quote" required minLength={3} maxLength={3} placeholder="USD"
                     defaultValue="USD" style={{ textTransform: 'uppercase' }} />
            </label>
            <label>
              Rate
              <input name="rate" required inputMode="decimal" placeholder="0.00027" />
            </label>
          </div>

          <label>
            Where it came from
            <input name="source" required maxLength={SOURCE_MAX}
                   placeholder="Bank of Uganda, mid rate on the day" />
          </label>

          <div className="row">
            <label>
              Observed on (blank means now)
              <input name="observedAt" type="date" />
            </label>
          </div>

          <details style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
            <summary>Moved a long way from the last rate for this pair?</summary>
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              A rate more than the recorded multiple of the previous one for the same
              pair is refused, because a slipped decimal is a hundredfold error in the
              only number the owner reads and it looks perfectly reasonable on screen.
              Say why and it will be kept in the audit trail beside the rate.
            </p>
            <label>
              Why this move is right
              <textarea name="overrideReason" rows={2} maxLength={OVERRIDE_MAX}
                        placeholder="Redenomination: the issuing bank revalued the unit" />
            </label>
          </details>

          <div className="row" style={{ marginTop: '1rem' }}>
            <button className="btn" type="submit" disabled={working}>
              {working ? 'Recording…' : 'Record rate'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
