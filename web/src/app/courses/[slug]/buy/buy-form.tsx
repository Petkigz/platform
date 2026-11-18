'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Say } from '@/components/say';
import { PhoneReasonSaid, type PhoneReasonWords } from '@/components/phone-reason';
import { parsePhone } from '@/lib/phone';
import { format, fromMinor } from '@/lib/money';
import type { WithdrawalOffer } from '@/lib/withdrawal';
import {
  QUOTE_FEE_LABEL,
  QUOTE_TAX_LABEL,
  checkoutOutcomeOf,
  type CheckoutReason,
} from '@/lib/checkout-outcome';

/**
 * The checkout form.
 *
 * It posts a course id and a phone number, never a price and never an amount.
 * The server resolves the price from the buyer's country, so this component
 * cannot change what is charged no matter what the browser sends.
 *
 * The success handling is deliberately cautious. A `redirect` result means the
 * payer leaves to pay, and the entitlement arrives later via the webhook — not
 * on the way back. A `pending` result is mobile money, where the prompt appears
 * on the handset. Neither is a confirmation, so neither says "you're in".
 *
 * **The words are handed in** by the buy page, in the reader's language. There
 * is no English of its own in this file, with one exception that is marked as
 * English wherever the page is not: the 14-day withdrawal box. Its paragraph
 * comes from the database, is the same paragraph as the published refunds
 * policy, and is what the buyer's choice is recorded against; the two
 * sentences under it are kept in the language of the paragraph they explain.
 *
 * **A refusal is said by its reason** (`lib/checkout-outcome.ts`). The form
 * used to print whatever sentence came back.
 *
 * **Pressing twice used to send two checkouts.** The button was disabled only
 * while the page was being read again afterwards, not while the request was
 * out. It is disabled for the whole of the request now.
 */
export type BuyWords = {
  whoFor: string;
  /** The first line of the list when nobody has been chosen for the buyer. */
  choose: string;
  /** `{name}` and the word for a child's profile. */
  learnerChild: string;
  whoNote: string;
  /** `{name}`: the one learner this account can buy for. */
  forOne: string;
  codeLabel: string;
  optional: string;
  checkPrice: string;
  checking: string;
  codeNote: string;
  quoteFailed: string;
  /** `{amount}`. */
  quoteSimple: string;
  quoteList: string;
  /** `{code}` and `{amount}`. */
  quoteOffCode: string;
  quoteOff: string;
  quoteTax: string;
  quoteFee: string;
  quotePay: string;
  quoteTaxNote: string;
  quoteHolds: string;
  payWith: string;
  phoneLabel: string;
  phoneNote: string;
  /** How a number written without a country code is read. Holds `{country}` and `{dial}`. */
  phoneCountry: string;
  /** Why a number cannot be read as one of that country's: the phone card's sentences. */
  phoneWhy: PhoneReasonWords;
  continue: string;
  starting: string;
  noProviderNote: string;
  approve: string;
  orderSaved: string;
  unreachable: string;
  /** What the form says for each reason a checkout or a price check can be refused. */
  reasons: Record<CheckoutReason, string>;
};

/** An amount is a currency code and Latin digits whatever the page is. */
const Amount = ({ value }: { value: string }) => (
  <strong>
    <bdi dir="ltr">{value}</bdi>
  </strong>
);

type Quote = {
  list: string;
  discount: string;
  tax: string;
  fee: string;
  taxLabel: string;
  feeLabel: string;
  total: string;
  code: string | null;
  hasDiscount: boolean;
  hasTax: boolean;
  hasFee: boolean;
};

export function BuyForm({
  courseId,
  learners,
  defaultLearnerId,
  providers,
  providerConfigured,
  defaultCode,
  withdrawal = null,
  words,
  markEnglish,
}: {
  courseId: string;
  /** The profiles this purchase may cover: the buyer and their family. */
  learners: { id: string; name: string; type: string }[];
  defaultLearnerId: string;
  /**
   * Providers that are configured, usable right now and collect the currency
   * this course is priced in. A mobile-money provider is one service in one
   * country: `country` is that country, its name is in the reader's language,
   * and `dial` is the code its numbers begin with.
   */
  providers: {
    id: string;
    label: string;
    requiresMsisdn: boolean;
    country: string | null;
    countryName: string | null;
    dial: string | null;
  }[];
  providerConfigured: boolean;
  /**
   * A referral code this browser arrived with. Pre-filled so a friend's link
   * does what it said it would — and editable, because a person who types a
   * different code means it.
   */
  defaultCode?: string | null;
  /**
   * The 14-day withdrawal question, resolved by the database for this buyer's
   * country. `canWaive` is what decides whether a box exists; `statutory` alone
   * only decides whether the buyer has the right — those are different questions
   * and the copy under the box has to answer the one that applies.
   */
  withdrawal?: WithdrawalOffer | null;
  words: BuyWords;
  /** The page is not English, so what is English on it says so. */
  markEnglish: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msisdn, setMsisdn] = useState('');
  // Default to the first live provider. With one provider this is the only
  // choice, so the selector renders as a single option rather than a decision
  // the payer has to make.
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  // One purchase covers one learner, so the buyer names them. A single learner
  // renders as a sentence rather than a decision they have to make.
  const [learnerId, setLearnerId] = useState(defaultLearnerId);
  const chosen = providers.find((p) => p.id === providerId);
  const needsNumber = chosen?.requiresMsisdn ?? false;
  // The number as the chosen service's country writes its numbers. A number
  // typed without a country code used to be read as Ugandan whoever was
  // paying; it is one of the country the service collects in, and the form
  // says which country that is before anything is sent.
  const number = needsNumber && chosen?.country ? parsePhone(msisdn, chosen.country) : null;
  const typed = msisdn.trim() !== '';
  // Optional, and deliberately not required: a family with no code should not
  // have to dismiss a field to buy a course.
  const [promotionCode, setPromotionCode] = useState(defaultCode?.trim() ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'warn' | 'error'>('info');
  // Unticked, and it stays unticked until the buyer ticks it: a pre-ticked box is
  // not consent, and the whole point of this control is that leaving it alone is
  // a legitimate way to buy.
  const [waiverTicked, setWaiverTicked] = useState(false);
  const showWaiver = withdrawal?.canWaive === true;
  const english = markEnglish ? ({ lang: 'en', dir: 'ltr' } as const) : {};

  // What the price checker found, and whether it is still about the box as it stands.
  // Any change to the learner or the code clears it: a total shown against a code
  // somebody has since edited is a wrong number that looks right.
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);

  async function checkPrice() {
    setQuoting(true);
    setQuoteError(null);
    try {
      const res = await fetch('/api/checkout/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          courseId,
          learnerProfileId: learnerId || undefined,
          promotionCode: promotionCode.trim() || undefined,
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        ok?: unknown;
        reason?: unknown;
        quote?: {
          listMinor?: unknown;
          discountMinor?: unknown;
          taxMinor?: unknown;
          feeMinor?: unknown;
          chargeLabels?: { tax?: unknown; fee?: unknown };
          totalMinor?: unknown;
          currencyCode?: unknown;
          promotionCode?: unknown;
        };
      } | null;

      const found = res.ok && json?.ok === true ? json.quote : undefined;
      if (!found) {
        setQuote(null);
        // Asking for a price writes nothing, so an answer nobody can read is
        // only "could not be worked out": asking again costs nothing.
        const reason = checkoutOutcomeOf(res.status, json?.reason);
        setQuoteError(
          reason === 'unconfirmed' || reason === 'refused' || reason === 'malformed'
            ? words.quoteFailed
            : words.reasons[reason],
        );
        return;
      }

      const minor = (value: unknown) => (typeof value === 'string' ? value : '');
      const currency = minor(found.currencyCode);
      const label = (value: unknown, fallback: string) =>
        typeof value === 'string' && value.trim() !== '' ? value : fallback;
      const nonZero = (value: string) => value !== '0' && value !== '';
      const money = (value: string) => format(fromMinor(value === '' ? '0' : value, currency));
      if (currency === '' || minor(found.listMinor) === '' || minor(found.totalMinor) === '') {
        setQuote(null);
        setQuoteError(words.quoteFailed);
        return;
      }
      setQuote({
        list: money(minor(found.listMinor)),
        discount: money(minor(found.discountMinor)),
        tax: money(minor(found.taxMinor)),
        fee: money(minor(found.feeMinor)),
        taxLabel: label(found.chargeLabels?.tax, QUOTE_TAX_LABEL),
        feeLabel: label(found.chargeLabels?.fee, QUOTE_FEE_LABEL),
        total: money(minor(found.totalMinor)),
        code: typeof found.promotionCode === 'string' ? found.promotionCode : null,
        hasDiscount: nonZero(minor(found.discountMinor)),
        hasTax: nonZero(minor(found.taxMinor)),
        hasFee: nonZero(minor(found.feeMinor)),
      });
    } catch {
      // The request could not be made, or the answer was not a price. Nothing
      // was written either way.
      setQuote(null);
      setQuoteError(typeof navigator !== 'undefined' && navigator.onLine === false ? words.unreachable : words.quoteFailed);
    } finally {
      setQuoting(false);
    }
  }

  async function buy() {
    if (busy) return;
    // Nobody chosen yet: said here, without a request.
    if (learnerId === '') {
      setTone('error');
      setMessage(words.reasons.learner_required);
      return;
    }
    // A number that is not one of the service's country is said here, without
    // a request: the route would refuse it, and before that nothing is written.
    if (number && !number.ok) {
      setTone('error');
      setMessage(words.reasons.phone_invalid);
      return;
    }
    setBusy(true);
    setMessage(null);

    let res: Response;
    try {
      res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          courseId,
          learnerProfileId: learnerId || undefined,
          promotionCode: promotionCode.trim() || undefined,
          msisdn: msisdn || undefined,
          provider: providerId || undefined,
          // Only when the box was shown. An absent choice and an unticked one are
          // different facts, and the route records only what was decided.
          withdrawalChoice: showWaiver ? (waiverTicked ? 'waived' : 'retained') : undefined,
        }),
      });
    } catch {
      // Nothing caught this before: the press did nothing and said nothing.
      // With no connection the request never left. Otherwise it may have: an
      // order is written before the provider is called, so the buyer is sent
      // to look rather than to press again.
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setTone(offline ? 'error' : 'warn');
      setMessage(offline ? words.unreachable : words.reasons.unconfirmed);
      setBusy(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as {
      reason?: unknown;
      orderId?: unknown;
      kind?: unknown;
      url?: unknown;
    } | null;

    if (res.ok && json?.kind === 'redirect' && typeof json.url === 'string' && json.url !== '') {
      // Still busy: the page is leaving.
      window.location.href = json.url;
      return;
    }

    setBusy(false);

    if (res.ok && json?.kind === 'pending') {
      setTone('info');
      setMessage(words.approve);
      return;
    }

    const reason = checkoutOutcomeOf(res.status, json?.reason);
    // The platform being closed, a provider that is missing or would not
    // start, and an answer nobody can read are not the buyer's mistake.
    const platform =
      reason === 'disabled' || reason === 'provider_unavailable' || reason === 'provider_failed' || reason === 'unconfirmed';
    setTone(platform ? 'warn' : 'error');
    // An order can exist even when the request failed: the order is created
    // before the provider is called, and a provider outage is not a reason to
    // lose the record of the attempt.
    const saved = typeof json?.orderId === 'string' && json.orderId !== '' && reason !== 'unconfirmed';
    setMessage(saved ? `${words.reasons[reason]} ${words.orderSaved}` : words.reasons[reason]);
    if (saved) {
      startTransition(() => router.refresh());
    }
  }

  const only = learners[0]?.name ?? '';

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {learners.length > 1 ? (
        <div>
          <label htmlFor="learner" className="eyebrow">
            {words.whoFor}
          </label>
          <select
            id="learner"
            value={learnerId}
            onChange={(e) => {
              setLearnerId(e.target.value);
              // A price, and a refusal, were about whoever was chosen before.
              setQuote(null);
              setQuoteError(null);
              setMessage(null);
            }}
            disabled={busy}
          >
            {defaultLearnerId === '' && <option value="">{words.choose}</option>}
            {learners.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.type === 'child'
                  ? words.learnerChild.replace('{name}', `\u2068${learner.name}\u2069`)
                  : learner.name}
              </option>
            ))}
          </select>
          <p className="muted">{words.whoNote}</p>
        </div>
      ) : (
        <p className="meta">
          <Say text={words.forOne} parts={{ name: <bdi>{only}</bdi> }} />
        </p>
      )}

      <div>
        <label htmlFor="promotion" className="eyebrow">
          {words.codeLabel} <span className="meta">{words.optional}</span>
        </label>
        {/* Not `.row`: that is a form row which pins its first child to a
            narrow column, and the button below it took the full width. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <input
            id="promotion"
            dir="ltr"
            style={{ flex: '1 1 6rem' }}
            value={promotionCode}
            onChange={(e) => { setPromotionCode(e.target.value); setQuote(null); }}
            placeholder="EID24"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={32}
            disabled={busy}
          />
          <button
            type="button"
            className="btn secondary"
            style={{ width: 'auto', flex: '0 0 auto', marginTop: 0 }}
            onClick={checkPrice}
            disabled={quoting || busy}
          >
            {quoting ? words.checking : words.checkPrice}
          </button>
        </div>
        <p className="muted">{words.codeNote}</p>

        {quoteError && (
          <div className="notice warn" role="alert" style={{ marginTop: '0.5rem' }}>
            {quoteError}
          </div>
        )}

        {quote && (
          <div className="notice" role="status" style={{ marginTop: '0.5rem' }}>
            {!quote.hasDiscount && !quote.hasTax && !quote.hasFee ? (
              <span>
                <Say text={words.quoteSimple} parts={{ amount: <Amount value={quote.total} /> }} />
              </span>
            ) : (
              <>
                <span>
                  <Say text={words.quoteList} parts={{ amount: <Amount value={quote.list} /> }} />
                  {quote.hasDiscount ? (
                    <>
                      {' · '}
                      <Say
                        text={quote.code ? words.quoteOffCode : words.quoteOff}
                        parts={{
                          code: <bdi dir="ltr">{quote.code}</bdi>,
                          amount: <Amount value={quote.discount} />,
                        }}
                      />
                    </>
                  ) : null}
                  {quote.hasTax ? (
                    <>
                      {' · '}
                      {quote.taxLabel === QUOTE_TAX_LABEL ? (
                        <Say text={words.quoteTax} parts={{ amount: <Amount value={quote.tax} /> }} />
                      ) : (
                        // The database's own name for a charge is English.
                        <>
                          <bdi {...english}>{quote.taxLabel}</bdi> <Amount value={quote.tax} />
                        </>
                      )}
                    </>
                  ) : null}
                  {quote.hasFee ? (
                    <>
                      {' · '}
                      {quote.feeLabel === QUOTE_FEE_LABEL ? (
                        <Say text={words.quoteFee} parts={{ amount: <Amount value={quote.fee} /> }} />
                      ) : (
                        <>
                          <bdi {...english}>{quote.feeLabel}</bdi> <Amount value={quote.fee} />
                        </>
                      )}
                    </>
                  ) : null}
                  {' · '}
                  <Say text={words.quotePay} parts={{ amount: <Amount value={quote.total} /> }} />
                </span>{' '}
                {quote.hasTax || quote.hasFee ? (
                  <span className="meta">{words.quoteTaxNote}</span>
                ) : null}
              </>
            )}{' '}
            <span className="meta">{words.quoteHolds}</span>
          </div>
        )}
      </div>

      {providers.length > 1 && (
        <fieldset disabled={busy}>
          <legend className="eyebrow">{words.payWith}</legend>
          {providers.map((p) => (
            <label key={p.id} className="radio">
              <input
                type="radio"
                name="provider"
                value={p.id}
                checked={providerId === p.id}
                onChange={() => setProviderId(p.id)}
              />
              {/* A provider's name is its own; the country it collects in is the reader's word for it. */}
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

      {needsNumber && (
      <div>
        <label htmlFor="msisdn" className="eyebrow">
          {words.phoneLabel}
        </label>
        <input
          id="msisdn"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          aria-describedby="msisdn-help"
          aria-invalid={typed && number !== null && !number.ok ? true : undefined}
          value={msisdn}
          onChange={(e) => setMsisdn(e.target.value)}
          disabled={busy}
        />
        <p id="msisdn-help" className="muted">
          {typed && number && !number.ok && chosen?.country ? (
            <PhoneReasonSaid
              words={words.phoneWhy}
              reason={number}
              country={chosen.country}
              fallback={words.reasons.phone_invalid}
            />
          ) : (
            <>
              {words.phoneNote}
              {chosen?.countryName && chosen.dial && (
                <>
                  {' '}
                  <Say
                    text={words.phoneCountry}
                    parts={{
                      country: <bdi>{chosen.countryName}</bdi>,
                      dial: <bdi dir="ltr">{chosen.dial}</bdi>,
                    }}
                  />
                </>
              )}
            </>
          )}
        </p>
      </div>
      )}

      {withdrawal?.statutory && (
        // English, and marked as English on a page that is not. See the note
        // at the top of this file.
        <div {...english}>
          {showWaiver ? (
            <>
              {/* `.radio` is the bordered row a choice sits in. Without it the
                  box was drawn the full width of the card, centred on a line
                  of its own above the paragraph it belongs to. */}
              <label htmlFor="withdrawal-waiver" className="radio">
                <input
                  id="withdrawal-waiver"
                  type="checkbox"
                  checked={waiverTicked}
                  onChange={(e) => setWaiverTicked(e.target.checked)}
                  disabled={busy}
                />
                <span>{withdrawal.wording}</span>
              </label>
              <p className="muted" style={{ fontSize: '0.82rem' }}>
                Leaving the box unticked is fine: you still buy the course, it still
                opens when payment is confirmed, and you keep the 14 days.{' '}
                <Link href="/policies/refunds">The refunds policy</Link> states this,
                in these words.
              </p>
            </>
          ) : (
            // The right applies but cannot be waived here — no published policy to
            // waive under, or the platform has not switched the question on. Said
            // rather than hidden, because a buyer who has heard of the 14 days
            // should be able to find out what this platform is doing about them.
            <p className="muted" style={{ fontSize: '0.82rem' }}>{withdrawal.message}</p>
          )}
        </div>
      )}

      <button type="button" className="btn" onClick={buy} disabled={busy}>
        {busy ? words.starting : words.continue}
      </button>

      {message && (
        <div
          className={`notice ${tone === 'error' ? 'error' : tone === 'warn' ? 'warn' : ''}`}
          role={tone === 'info' ? 'status' : 'alert'}
        >
          {message}
        </div>
      )}

      {!providerConfigured && <p className="muted">{words.noProviderNote}</p>}
    </div>
  );
}
