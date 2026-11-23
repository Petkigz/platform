'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Say } from '@/components/say';
import { PhoneReasonSaid, type PhoneReasonWords } from '@/components/phone-reason';
import { track } from '@/lib/analytics';
import { parsePhone } from '@/lib/phone';
import { leavesPlanWaiting, planOutcomeOf, type PlanOutcome } from '@/lib/plan-outcome';

/**
 * The words this form says. Chosen on the server, in the reader's language:
 * a script sent to a browser holds no catalogue.
 */
export type PlanPayWords = {
  whoFor: string;
  choose: string;
  /** `{name}` and the word for a child's profile. */
  learnerChild: string;
  /** `{name}`: the one learner this plan can cover. */
  forOne: string;
  whichPrice: string;
  payWith: string;
  phoneLabel: string;
  phoneNote: string;
  /** With `{country}` and `{dial}` in it. */
  phoneCountry: string;
  phoneWhy: PhoneReasonWords;
  submit: string;
  starting: string;
  approve: string;
  /** Said after a refusal that left an order behind. */
  waiting: string;
  subscriptions: string;
  orders: string;
  /** The request could not be made at all. */
  unreachable: string;
  reasons: Record<PlanOutcome, string>;
};

type Service = {
  id: string;
  label: string;
  requiresMsisdn: boolean;
  country: string | null;
  countryName: string | null;
  dial: string | null;
};

export type PlanPayOffer = {
  priceId: string;
  /** As it is said: `UGX 30000`. */
  amount: string;
  /** The services that can collect this amount. Never empty. */
  providers: Service[];
};

/**
 * Pay for one plan: who it is for, which price, which service, which number,
 * and one press.
 *
 * The amount is shown and is not sent: the database reads it from the price.
 *
 * **A reply that cannot be read is not a failure.** An order is written
 * before the payment service is called, and a prompt may already be on the
 * phone. So it is "we could not confirm", with the way to the orders page.
 * The button stays: for a plan a second press cannot be a second payment,
 * because the writer refuses a second order while the first is waiting.
 *
 * **A plan with an order waiting cannot be ordered again.** The writer keeps
 * a pending subscription beside the order and refuses a second for the same
 * plan. So when a reply says an order exists and the payment did not start,
 * the button is taken away and the form says where the order is cancelled:
 * pressing again would only be refused.
 *
 * (The old form sent no service and no number, so with a mobile-money service
 * connected every press was refused for an empty phone number; and it printed
 * whatever sentence came back, which for a plan was the database's own.)
 */
export function PlanPayForm({
  planVersionId,
  offers,
  learners,
  words,
}: {
  planVersionId: string;
  offers: PlanPayOffer[];
  learners: { id: string; name: string; type: 'adult' | 'child' }[];
  words: PlanPayWords;
}) {
  const [learnerId, setLearnerId] = useState(learners.length === 1 ? learners[0]!.id : '');
  const [priceId, setPriceId] = useState(offers[0]?.priceId ?? '');
  const offer = offers.find((o) => o.priceId === priceId) ?? offers[0];
  const [providerId, setProviderId] = useState(offer?.providers[0]?.id ?? '');
  const chosen = offer?.providers.find((p) => p.id === providerId) ?? offer?.providers[0];
  const [msisdn, setMsisdn] = useState('');
  const [busy, setBusy] = useState(false);
  // Nothing more can be done from this form: a prompt is out, or an order is waiting.
  const [settled, setSettled] = useState(false);
  const [tone, setTone] = useState<'info' | 'warn' | 'error'>('info');
  const [message, setMessage] = useState<string | null>(null);
  const [where, setWhere] = useState<'subscriptions' | 'orders' | null>(null);

  const needsNumber = chosen?.requiresMsisdn ?? false;
  const number = needsNumber && chosen?.country ? parsePhone(msisdn, chosen.country) : null;
  const typed = msisdn.trim() !== '';
  const locked = busy || settled;

  async function pay() {
    if (locked || !offer || !chosen) return;
    setMessage(null);
    setWhere(null);
    if (learnerId === '') {
      setTone('error');
      setMessage(words.reasons.learner_required);
      return;
    }
    // A number the form can already name the fault of is not sent.
    if (number !== null && !number.ok) {
      setTone('error');
      setMessage(words.reasons.phone_invalid);
      return;
    }
    setBusy(true);
    void track({
      code: 'checkout.started',
      subjectId: planVersionId,
      learnerProfileId: learnerId,
      properties: { priceId: offer.priceId },
    });

    let res: Response;
    try {
      res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          planVersionId,
          priceId: offer.priceId,
          learnerProfileId: learnerId,
          provider: chosen.id,
          msisdn: needsNumber ? msisdn || undefined : undefined,
        }),
      });
    } catch {
      // The request could not be made. The form says so and stays usable.
      setTone('warn');
      setMessage(words.unreachable);
      setBusy(false);
      return;
    }

    const json = (await res.json().catch(() => null)) as {
      reason?: unknown;
      kind?: unknown;
      url?: unknown;
      orderId?: unknown;
    } | null;

    if (res.ok && json?.kind === 'redirect' && typeof json.url === 'string' && json.url !== '') {
      // Still busy: the page is leaving.
      window.location.href = json.url;
      return;
    }
    setBusy(false);

    if (res.ok && json?.kind === 'pending') {
      // One prompt is on its way. The button is not offered again here.
      setSettled(true);
      setTone('info');
      setMessage(words.approve);
      setWhere('orders');
      return;
    }

    const reason = planOutcomeOf(res.status, json?.reason);
    const platform =
      reason === 'disabled' || reason === 'provider_unavailable' || reason === 'provider_failed' || reason === 'unconfirmed';
    setTone(platform ? 'warn' : 'error');
    const waiting = leavesPlanWaiting(reason, json?.orderId);
    setMessage(waiting ? `${words.reasons[reason]} ${words.waiting}` : words.reasons[reason]);
    if (waiting || reason === 'already_subscribed') {
      setSettled(true);
      setWhere('subscriptions');
    } else if (reason === 'unconfirmed') {
      // An order may exist: this is where to look.
      setWhere('orders');
    }
  }

  const only = learners[0];

  return (
    <div style={{ display: 'grid', gap: '1rem' }} data-plan-form>
      {learners.length > 1 ? (
        <div>
          <label htmlFor="plan-learner" className="eyebrow">
            {words.whoFor}
          </label>
          <select
            id="plan-learner"
            value={learnerId}
            onChange={(e) => {
              setLearnerId(e.target.value);
              setMessage(null);
            }}
            disabled={locked}
          >
            <option value="">{words.choose}</option>
            {learners.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.type === 'child'
                  ? words.learnerChild.replace('{name}', `\u2068${learner.name}\u2069`)
                  : learner.name}
              </option>
            ))}
          </select>
        </div>
      ) : only ? (
        <p className="meta" style={{ margin: 0 }}>
          <Say text={words.forOne} parts={{ name: <bdi>{only.name}</bdi> }} />
        </p>
      ) : null}

      {offers.length > 1 && (
        <fieldset disabled={locked}>
          <legend className="eyebrow">{words.whichPrice}</legend>
          {offers.map((o) => (
            <label key={o.priceId} className="radio">
              <input
                type="radio"
                name="plan-price"
                value={o.priceId}
                checked={offer?.priceId === o.priceId}
                onChange={() => {
                  setPriceId(o.priceId);
                  // A service collects one currency: the choice starts again.
                  setProviderId(o.providers[0]?.id ?? '');
                }}
              />
              <span>
                <bdi dir="ltr">{o.amount}</bdi>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {offer && offer.providers.length > 1 && (
        <fieldset disabled={locked}>
          <legend className="eyebrow">{words.payWith}</legend>
          {offer.providers.map((p) => (
            <label key={p.id} className="radio">
              <input
                type="radio"
                name="plan-provider"
                value={p.id}
                checked={chosen?.id === p.id}
                onChange={() => setProviderId(p.id)}
              />
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

      {needsNumber && (
        <div>
          <label htmlFor="plan-msisdn" className="eyebrow">
            {words.phoneLabel}
          </label>
          <input
            id="plan-msisdn"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            aria-describedby="plan-msisdn-help"
            aria-invalid={typed && number !== null && !number.ok ? true : undefined}
            value={msisdn}
            onChange={(e) => setMsisdn(e.target.value)}
            disabled={locked}
          />
          <p id="plan-msisdn-help" className="muted">
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

      {!settled && (
        <button type="button" className="btn" onClick={pay} disabled={busy}>
          {busy ? words.starting : words.submit}
        </button>
      )}

      {message && (
        <div
          className={`notice ${tone === 'error' ? 'error' : tone === 'warn' ? 'warn' : ''}`}
          role={tone === 'info' ? 'status' : 'alert'}
          data-plan-answer
        >
          {message}
          {where && (
            <>
              {' '}
              <Link href={where === 'orders' ? '/orders' : '/subscriptions'}>
                {where === 'orders' ? words.orders : words.subscriptions}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
