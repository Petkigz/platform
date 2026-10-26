'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, fromMinor } from '@/lib/money';

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
 */
export function BuyForm({
  courseId,
  learners,
  defaultLearnerId,
  providers,
  providerConfigured,
  defaultCode,
}: {
  courseId: string;
  /** The profiles this purchase may cover: the buyer and their family. */
  learners: { id: string; name: string; type: string }[];
  defaultLearnerId: string;
  /** Providers that are configured and usable right now. */
  providers: { id: string; label: string; requiresMsisdn: boolean }[];
  providerConfigured: boolean;
  /**
   * A referral code this browser arrived with. Pre-filled so a friend's link
   * does what it said it would — and editable, because a person who types a
   * different code means it.
   */
  defaultCode?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
  // Optional, and deliberately not required: a family with no code should not
  // have to dismiss a field to buy a course.
  const [promotionCode, setPromotionCode] = useState(defaultCode?.trim() ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  // What the price checker found, and whether it is still about the box as it stands.
  // Any change to the learner or the code clears it: a total shown against a code
  // somebody has since edited is a wrong number that looks right.
  const [quote, setQuote] = useState<{
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
  } | null>(null);
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

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        quote?: {
          listMinor: string;
          discountMinor: string;
          taxMinor: string;
          feeMinor: string;
          chargeLabels?: { tax?: string | null; fee?: string | null };
          totalMinor: string;
          currencyCode: string;
          promotionCode: string | null;
        };
      };

      if (!res.ok || !json.ok || !json.quote) {
        setQuote(null);
        setQuoteError(
          json.message ?? json.error ?? 'That price could not be worked out. Try again.',
        );
        return;
      }

      const { quote: found } = json;
      const currency = found.currencyCode;
      const nonZero = (minor: string | undefined) =>
        minor !== undefined && minor !== '0' && minor !== '';
      setQuote({
        list: format(fromMinor(found.listMinor, currency)),
        discount: format(fromMinor(found.discountMinor, currency)),
        tax: format(fromMinor(found.taxMinor, currency)),
        fee: format(fromMinor(found.feeMinor, currency)),
        taxLabel: found.chargeLabels?.tax ?? 'Tax',
        feeLabel: found.chargeLabels?.fee ?? 'Fee',
        total: format(fromMinor(found.totalMinor, currency)),
        code: found.promotionCode,
        hasDiscount: nonZero(found.discountMinor),
        hasTax: nonZero(found.taxMinor),
        hasFee: nonZero(found.feeMinor),
      });
    } finally {
      setQuoting(false);
    }
  }

  async function buy() {
    setMessage(null);

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        courseId,
        learnerProfileId: learnerId || undefined,
        promotionCode: promotionCode.trim() || undefined,
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
      {learners.length > 1 ? (
        <div>
          <label htmlFor="learner" className="eyebrow">
            Who is this course for?
          </label>
          <select
            id="learner"
            value={learnerId}
            onChange={(e) => { setLearnerId(e.target.value); setQuote(null); }}
          >
            {learners.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.name}
                {learner.type === 'child' ? ' (child)' : ''}
              </option>
            ))}
          </select>
          <p className="muted">
            The course is added to this learner&apos;s account, and it does not
            cover anybody else.
          </p>
        </div>
      ) : (
        <p className="meta">
          This purchase is for {learners[0]?.name ?? 'your learner'}. A course
          covers one learner; a sibling needs their own purchase.
        </p>
      )}

      <div>
        <label htmlFor="promotion" className="eyebrow">
          Promotion code <span className="meta">(optional)</span>
        </label>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <input
            id="promotion"
            value={promotionCode}
            onChange={(e) => { setPromotionCode(e.target.value); setQuote(null); }}
            placeholder="EID24"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={32}
          />
          <button
            type="button"
            className="btn secondary"
            onClick={checkPrice}
            disabled={quoting}
          >
            {quoting ? 'Checking…' : 'Check the price'}
          </button>
        </div>
        <p className="muted">
          The discount is applied to the order before you pay. One code per order.
        </p>

        {quoteError && (
          <div className="notice warn" role="status" style={{ marginTop: '0.5rem' }}>
            {quoteError}
          </div>
        )}

        {quote && (
          <div className="notice" role="status" style={{ marginTop: '0.5rem' }}>
            {!quote.hasDiscount && !quote.hasTax && !quote.hasFee ? (
              <span>
                The price is <strong>{quote.total}</strong>.
              </span>
            ) : (
              <>
                <span>
                  Price <strong>{quote.list}</strong>
                  {quote.hasDiscount ? (
                    <>
                      {quote.code ? ` · code ${quote.code}` : ''} takes off{' '}
                      <strong>{quote.discount}</strong>
                    </>
                  ) : null}
                  {quote.hasTax ? (
                    <>
                      {' '}· {quote.taxLabel.toLowerCase()} <strong>{quote.tax}</strong>
                    </>
                  ) : null}
                  {quote.hasFee ? (
                    <>
                      {' '}· {quote.feeLabel.toLowerCase()} <strong>{quote.fee}</strong>
                    </>
                  ) : null}
                  {' '}· you pay <strong>{quote.total}</strong>.
                </span>{' '}
                {quote.hasTax || quote.hasFee ? (
                  <span className="meta">
                    The tax and the fee are set by where you are and are paid by you;
                    neither is kept by the course.
                  </span>
                ) : null}
              </>
            )}{' '}
            <span className="meta">
              Nothing is held back by checking: pay now and exactly this is charged.
            </span>
          </div>
        )}
      </div>

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
