'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { Say } from '@/components/say';
import { formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';
import { findCountry, formatPhone, parsePhone } from '@/lib/phone';
import {
  phoneOutcomeOf,
  phoneReasonOf,
  phoneSaidAs,
  type PhoneCode,
  type PhoneParts,
  type PhoneReason,
  type PhoneSaid,
} from '@/lib/phone-outcome';

/** Everything this card says, in the language of the page that draws it. */
export type PhoneWords = {
  /** The language the words are in: counts are written its way. */
  locale: LocaleCode;
  heading: string;
  lede: string;
  /** Holds `{number}`. */
  storedAs: string;
  country: string;
  number: string;
  help: string;
  /** Holds `{number}`. */
  willStore: string;
  /**
   * One sentence for each way a number cannot be stored. `other_country` holds
   * `{begins}` and `{dial}`; `length_one` holds `{digits}` and `{count}`;
   * `length_range` holds `{min}`, `{max}` and `{count}`.
   */
  why: Record<PhoneSaid, string>;
  /**
   * Said after a length, for a country that writes a digit in front of a
   * number and does not dial it: "077212345" is nine digits typed and eight
   * counted, and without this the count looks wrong. Holds `{digit}`.
   */
  whyTrunk: string;
  noDial: string;
  save: string;
  update: string;
  saving: string;
  remove: string;
  saved: string;
  removed: string;
  signedOut: string;
  off: string;
  refused: string;
  /** A change was asked for and no answer came back. */
  unconfirmed: string;
  /** Numbers are not being collected, and one is stored. */
  paused: string;
  foot: string;
};

export type PhoneCountryName = { code: string; name: string };

/** A number, a dial code, the start of a number: read left to right in any page. */
const dialled = (value: string) => <bdi dir="ltr">{value}</bdi>;

/**
 * The number the platform holds for you.
 *
 * What it does while you type, and what it deliberately does not:
 *
 * **It says what is wrong before the request.** Typing four digits and pressing
 * save is not how anyone wants to learn that a number is short, so the same
 * rules the database applies run here, and each has a name the page has a
 * sentence for (`lib/phone-outcome.ts`).
 *
 * **It shows the number as it will be stored.** The line under the field is the
 * E.164 value, `+256772123456`, because a person should be able to see the one
 * string the platform keeps, not only the friendly form. The friendly form comes
 * from the country's own grouping; if that looks odd for a number, the stored
 * value is still right, and it is on the screen so nobody has to take that on
 * trust.
 *
 * **It has no words of its own.** The page hands them over, with the name of
 * every country in the reader's language, made on the server: a browser with
 * different country names from the server's would otherwise redraw the list.
 *
 * **A change that was not answered is said as that.** Saving and removing are
 * writes. With no reply, nothing is claimed either way; asking again is safe,
 * because both set the stored number to one value.
 *
 * **A stored number can be removed while numbers are not being collected.**
 * With the switch off and a number stored, the card shows the number and the
 * button that removes it, and nothing else. Hiding the card would leave a
 * number its owner could neither see nor take away.
 *
 * **It does not pretend to send anything.** Nothing here messages the number
 * and no staff screen shows it; the card says both.
 */
export function PhoneForm({
  words,
  countries,
  initialPhone,
  initialCountry,
  collecting,
}: {
  words: PhoneWords;
  countries: readonly PhoneCountryName[];
  initialPhone: string | null;
  initialCountry: string | null;
  collecting: boolean;
}) {
  const router = useRouter();
  const [country, setCountry] = useState(initialCountry ?? 'UG');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<ReactNode>(null);
  // Removed while numbers are not being collected: the page is not asked again,
  // because without a number it would not draw this card, and the sentence
  // saying the number is gone would go with it.
  const [gone, setGone] = useState(false);
  const [, startTransition] = useTransition();

  const parsed = useMemo(() => parsePhone(phone, country), [phone, country]);
  const stored = initialPhone && initialCountry ? formatPhone(initialPhone, initialCountry) : null;
  const storedCountry = initialCountry
    ? (countries.find((option) => option.code === initialCountry)?.name ?? initialCountry)
    : '';

  const num = (value: number) => formatNumber(words.locale, value);

  /** A reason a number cannot be stored, as its sentence; the general refusal if a gap would be empty. */
  function reasonSaid(reason: PhoneReason): ReactNode {
    const said = phoneSaidAs(reason);
    if (!said) return words.refused;
    const trunk = reason.why === 'length' ? findCountry(country)?.trunk : null;
    return (
      <>
      <Say
        text={words.why[said]}
        parts={{
          ...(reason.begins === undefined ? {} : { begins: dialled(reason.begins) }),
          ...(reason.dial === undefined ? {} : { dial: dialled(reason.dial) }),
          ...(reason.min === undefined ? {} : { min: num(reason.min), digits: num(reason.min) }),
          ...(reason.max === undefined ? {} : { max: num(reason.max) }),
          ...(reason.count === undefined ? {} : { count: num(reason.count) }),
        }}
      />
      {trunk && /^[0-9]$/u.test(trunk) && (
        <>
          {' '}
          <Say text={words.whyTrunk} parts={{ digit: num(Number(trunk)) }} />
        </>
      )}
      </>
    );
  }

  /** A refusal the route named, as its sentence. */
  function refusalSaid(outcome: { code: PhoneCode } & PhoneParts): ReactNode {
    if (outcome.code === 'signed_out') return words.signedOut;
    if (outcome.code === 'off') return words.off;
    if (outcome.code === 'no_dial') return words.noDial;
    const reason = phoneReasonOf(outcome);
    return reason ? reasonSaid(reason) : words.refused;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!parsed.ok) {
      setError(reasonSaid(parsed));
      return;
    }
    await send({ phone, country }, false);
  }

  async function remove() {
    setMessage(null);
    setError(null);
    await send({ clear: true }, true);
  }

  async function send(body: Record<string, unknown>, clearing: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/account/phone', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: unknown; phoneE164?: unknown }
        | null;

      if (response.ok && result?.ok === true) {
        // The server returns what it stored, after normalising. A reply that
        // does not match what was asked (a number after a removal, nothing
        // after a save) is not believed either way.
        const kept = typeof result.phoneE164 === 'string' && result.phoneE164 !== '' ? result.phoneE164 : null;
        if (clearing ? kept !== null || result.phoneE164 !== null : kept === null) {
          setError(words.unconfirmed);
        } else {
          // Trusting the reply rather than the field is what keeps the two in
          // step: if the two parsers ever disagree, the screen shows the one
          // that is stored.
          setPhone(kept ?? '');
          setMessage(kept ? words.saved : words.removed);
          if (collecting) startTransition(() => router.refresh());
          else setGone(kept === null);
        }
      } else {
        const outcome = phoneOutcomeOf(response.status, result);
        setError(outcome.code === 'failed' ? words.unconfirmed : refusalSaid(outcome));
      }
    } catch {
      setError(words.unconfirmed);
    } finally {
      setBusy(false);
    }
  }

  const dialOf = (code: string) => findCountry(code)?.dial ?? '';

  return (
    <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>{words.heading}</h2>
      <p className="muted">{words.lede}</p>

      {stored && initialPhone && !gone && (
        <p>
          <strong>{dialled(stored.international)}</strong>
          <br />
          <span className="muted">
            <Say text={words.storedAs} parts={{ number: dialled(initialPhone) }} />
            {' · '}
            <bdi>{storedCountry}</bdi>
          </span>
        </p>
      )}

      {collecting ? (
        <form onSubmit={submit} style={{ display: 'grid', gap: '0.65rem', maxWidth: '32rem' }}>
          <label htmlFor="account-phone-country">{words.country}</label>
          <select
            id="account-phone-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            disabled={busy}
          >
            {countries.map((option) => (
              // A left-to-right mark on each side of the dial code keeps its plus
              // in front of it in a right-to-left list. A picker draws its rows
              // as plain text and takes no notice of an isolate, so a mark it is.
              <option key={option.code} value={option.code}>
                {`${option.name} (\u200E${dialOf(option.code)}\u200E)`}
              </option>
            ))}
          </select>

          <label htmlFor="account-phone">{words.number}</label>
          <input
            id="account-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            dir="ltr"
            // Laid out strictly in the order typed, as a dialler shows a number.
            // Arabic-Indic digits typed in groups would otherwise be drawn with
            // the last group first, and the number would read backwards.
            style={{ unicodeBidi: 'bidi-override' }}
            placeholder="0772 123 456"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={busy}
            aria-describedby="account-phone-help"
          />
          <p id="account-phone-help" className="muted" style={{ margin: '-0.3rem 0 0' }}>
            {phone.trim() === '' ? (
              words.help
            ) : parsed.ok ? (
              <Say text={words.willStore} parts={{ number: dialled(parsed.e164) }} />
            ) : (
              reasonSaid(parsed)
            )}
          </p>

          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}

          <div className="page-actions" style={{ marginTop: '0.25rem' }}>
            <button className="btn" type="submit" disabled={busy || !parsed.ok}>
              {busy ? words.saving : initialPhone ? words.update : words.save}
            </button>
            {initialPhone && (
              <button className="btn secondary" type="button" onClick={remove} disabled={busy}>
                {words.remove}
              </button>
            )}
          </div>
        </form>
      ) : (
        <div style={{ display: 'grid', gap: '0.65rem', maxWidth: '32rem' }}>
          {!gone && (
            <p className="notice" style={{ margin: 0 }}>
              {words.paused}
            </p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          {initialPhone && !gone && (
            <div className="page-actions" style={{ marginTop: '0.25rem' }}>
              <button className="btn secondary" type="button" onClick={remove} disabled={busy}>
                {words.remove}
              </button>
            </div>
          )}
        </div>
      )}

      <p className="muted" style={{ marginTop: '0.75rem' }}>
        {words.foot}
      </p>
    </section>
  );
}
