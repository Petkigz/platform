'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  describeCountry,
  formatPhone,
  parsePhone,
  phoneCountries,
} from '@/lib/phone';

/**
 * The number the platform can reach you on.
 *
 * What it does while you type, and what it deliberately does not:
 *
 * **It says what is wrong before the request.** Typing four digits and pressing
 * save is not how anyone wants to learn that a number is short, so the same
 * rules the database applies run here, and the sentence is the same sentence.
 *
 * **It shows the number as it will be stored.** The line under the field is the
 * E.164 value — `+256772123456` — because a person should be able to see the one
 * string the platform keeps, not only the friendly form. The friendly form comes
 * from the country's own grouping; if that looks odd for a number, the stored
 * value is still right, and it is on the screen so nobody has to take that on
 * trust.
 *
 * **It does not pretend to send anything.** Nothing here messages the number:
 * no SMS provider is configured, so the card says the number is for staff to
 * reach you and for the day messaging exists.
 */
export function PhoneForm({
  initialPhone,
  initialCountry,
}: {
  initialPhone: string | null;
  initialCountry: string | null;
}) {
  const router = useRouter();
  const [country, setCountry] = useState(initialCountry ?? 'UG');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const countries = useMemo(() => phoneCountries(), []);
  const parsed = useMemo(() => parsePhone(phone, country), [phone, country]);
  const stored = initialPhone && initialCountry
    ? formatPhone(initialPhone, initialCountry)
    : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    await send('/api/account/phone', { phone, country });
  }

  async function remove() {
    setMessage(null);
    setError(null);
    await send('/api/account/phone', { clear: true });
  }

  async function send(url: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; phoneE164?: string | null }
        | null;
      if (!response.ok || result?.ok !== true) {
        setError(result?.message ?? 'Could not save your phone number.');
        return;
      }
      // The server returns what it stored, after normalising. Trusting the
      // reply rather than the field is what keeps the two in step: if the two
      // parsers ever disagree, the screen shows the one that is stored.
      setPhone(result.phoneE164 ?? '');
      setMessage(
        result.phoneE164
          ? 'Your phone number has been saved.'
          : 'Your phone number has been removed.',
      );
      startTransition(() => router.refresh());
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>The number to reach me on</h2>
      <p className="muted">
        Kept in one notation — country code, then the number — so that a call from
        anywhere reaches the same phone. Only you and platform staff can see it.
      </p>

      {stored && (
        <p>
          <strong>{stored.international}</strong>
          <br />
          <span className="muted">
            Stored as {initialPhone} · {describeCountry(initialCountry)}
          </span>
        </p>
      )}

      <form onSubmit={submit} style={{ display: 'grid', gap: '0.65rem', maxWidth: '32rem' }}>
        <label htmlFor="account-phone-country">Country</label>
        <select
          id="account-phone-country"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          disabled={busy}
        >
          {countries.map((option) => (
            <option key={option.code} value={option.code}>
              {describeCountry(option.code)} ({option.dial})
            </option>
          ))}
        </select>

        <label htmlFor="account-phone">Phone number</label>
        <input
          id="account-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="0772 123 456, or +256 772 123 456"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={busy}
          aria-describedby="account-phone-help"
        />
        <p id="account-phone-help" className="muted" style={{ margin: '-0.3rem 0 0' }}>
          {phone.trim() === ''
            ? 'Any way you write it — with spaces, brackets, a leading 0 or + — is read the same way.'
            : parsed.ok
              ? `Will be stored as ${parsed.e164}.`
              : parsed.message}
        </p>

        {error && <p className="notice error" role="alert">{error}</p>}
        {message && <p className="notice" role="status">{message}</p>}

        <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn" type="submit" disabled={busy || !parsed.ok}>
            {busy ? 'Saving…' : initialPhone ? 'Update my number' : 'Save my number'}
          </button>
          {initialPhone && (
            <button
              className="btn secondary"
              type="button"
              onClick={remove}
              disabled={busy}
            >
              Remove it
            </button>
          )}
        </div>
      </form>

      <p className="muted" style={{ marginTop: '0.75rem' }}>
        Nothing is sent to this number yet: the platform has no messaging provider
        configured, so it is how staff reach you and the address the platform will
        message when one exists.
      </p>
    </section>
  );
}
