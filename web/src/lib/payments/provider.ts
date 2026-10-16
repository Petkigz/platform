/**
 * The payment provider boundary — P11.
 *
 * No provider has been chosen. MTN MoMo and Airtel Money are the likely
 * candidates and both need merchant registration and signed API terms before
 * anyone can write an adapter against them. Building an adapter for a provider
 * we have not chosen means writing it twice.
 *
 * What is built instead is the seam: the exact shape an adapter has to
 * satisfy, so that choosing a provider is a matter of writing one file and
 * registering it. Everything above this line — orders, order items, the
 * checkout page, the webhook route — is provider-independent and can be built
 * and tested now.
 *
 * Two rules this interface encodes, both from D4:
 *
 *   1. Money is `Money` (integer minor units), never a number. An adapter that
 *      accepts a float has already lost the amount.
 *   2. `verifyWebhookSignature` is mandatory and returns nothing usable on
 *      failure. A provider redirect is not proof of payment;
 *      `record_payment_success()` in the database refuses to act on one, and
 *      it can only refuse if the app never hands it an unverified event.
 */

import type { Money } from '../money';

export type ProviderId = string;

export type CheckoutRequest = {
  /** Our order id. Sent to the provider and echoed back on the callback. */
  orderId: string;
  amount: Money;
  /** Where the provider should send the payer's browser. */
  returnUrl: string;
  /** Free-form, but keep personal data out of it — it may appear in logs. */
  description: string;
  /**
   * The payer's phone number in E.164, for mobile-money providers. Absent for
   * card providers. Never a locally-formatted number: see lib/phone.ts.
   */
  msisdn?: string;
};

export type CheckoutResult =
  | { kind: 'redirect'; url: string }
  /**
   * Mobile money usually has no redirect: the prompt appears on the handset
   * and the outcome arrives asynchronously. The UI polls or waits for the
   * webhook.
   */
  | { kind: 'pending'; providerReference: string };

/**
 * What the provider says about a payment when we ask it directly.
 *
 * This exists because of a fact about mobile money that is easy to miss and
 * expensive to get wrong: **neither MTN MoMo nor Airtel Money signs its
 * callbacks.** MTN's documented guidance is to use the callback only to find
 * the order and then re-query the transaction; Airtel publishes no signature
 * scheme for its notification at all. So for these providers the callback is a
 * *notification that something changed*, never proof that money moved.
 *
 * Which means the interface needs a way to ask the provider what actually
 * happened. `verifyWebhookSignature` returning false is not the end of the
 * flow here — it is the signal to go and check.
 *
 * `unknown` is a real state and not a synonym for failure. If the provider is
 * unreachable, the honest answer is "we do not know yet", and treating that as
 * `failed` is how a platform retries a payment that already succeeded and
 * charges someone twice.
 */
export type ProviderPaymentStatus =
  | {
      state: 'succeeded';
      providerReference: string;
      amount: Money;
      /** The provider's own transaction id, for the ledger and for refunds. */
      financialTransactionId: string | null;
    }
  | { state: 'pending'; providerReference: string }
  | { state: 'failed'; providerReference: string; reason: string }
  | { state: 'unknown'; providerReference: string; reason: string };

export type WebhookEvent =
  | {
      kind: 'payment.succeeded';
      /** Stable id from the provider. Used to deduplicate. */
      eventId: string;
      providerReference: string;
      orderId: string;
      amount: Money;
      raw: unknown;
    }
  | {
      kind: 'payment.failed';
      eventId: string;
      providerReference: string;
      orderId: string;
      reason: string;
      raw: unknown;
    }
  | {
      kind: 'refund.succeeded';
      eventId: string;
      providerReference: string;
      orderId: string;
      amount: Money;
      raw: unknown;
    }
  | { kind: 'ignored'; eventId: string; reason: string; raw: unknown };

export interface PaymentProvider {
  readonly id: ProviderId;
  readonly label: string;
  /** Whether this provider can be used at all right now. */
  readonly available: boolean;

  /**
   * How this provider's callbacks can be trusted. Declared rather than
   * inferred, because the two cases need opposite handling and getting it
   * wrong is expensive in both directions:
   *
   *   'signature' — the provider signs its callbacks, so
   *                 `verifyWebhookSignature` is the gate and a failed check is
   *                 a rejection.
   *   'requery'   — the provider does not sign. A callback is only a hint that
   *                 something changed; the authoritative answer comes from an
   *                 authenticated `fetchPaymentStatus`. Rejecting here would
   *                 discard every real payment notification.
   *
   * MTN MoMo and Airtel Money are both 'requery'. Neither publishes a signature
   * scheme for its collection callback, and MTN's own guidance is to use the
   * callback only to find the order and then re-query the transaction.
   */
  readonly webhookTrust: 'signature' | 'requery';

  /**
   * Whether this provider needs a handset number to take a payment.
   *
   * Declared rather than inferred from the provider id, so adding a card
   * provider later does not require the checkout form to learn its name. The
   * form asks for a number only when the chosen provider actually needs one —
   * asking for a phone number to pay by card is the kind of small friction that
   * costs completions.
   */
  readonly requiresMsisdn: boolean;

  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;

  /**
   * Must return false for a bad signature. Must not throw for a payload it
   * simply does not recognise — return `ignored` from parseWebhookEvent
   * instead, so an unknown event type does not turn into a 500 that the
   * provider retries forever.
   *
   * Returning false is not necessarily a rejection. For the mobile-money
   * providers below it is the normal case, because they do not sign at all;
   * the caller is expected to fall back to `fetchPaymentStatus`. What it must
   * never do is return true for something it could not verify.
   */
  verifyWebhookSignature(payload: string, signature: string | null): boolean;

  /**
   * Ask the provider what actually happened to a payment.
   *
   * Required, not optional: an adapter that cannot answer this cannot be used
   * safely, because for any provider whose callback is unsigned (both mobile
   * money ones) this is the only acceptable proof that money moved. Making it
   * optional would let an adapter skip the hard part and still look complete.
   *
   * Must return `unknown` rather than throw when the provider cannot be
   * reached, so a network blip is never mistaken for a failed payment.
   */
  fetchPaymentStatus(providerReference: string): Promise<ProviderPaymentStatus>;

  parseWebhookEvent(payload: unknown): WebhookEvent;

  /**
   * A refund *request* is not a completed refund (D4). This initiates it with
   * the provider; the database records the outcome when the event arrives.
   */
  requestRefund(args: {
    providerReference: string;
    amount: Money;
    reason: string;
  }): Promise<{ providerRefundReference: string }>;
}

export class PaymentProviderUnavailableError extends Error {
  constructor(providerId: ProviderId) {
    super(
      `Payment provider '${providerId}' is not configured. No live provider has ` +
        'been chosen yet — see DECISIONS.md P11 and P12. Set ' +
        'PAYMENT_PROVIDER and its credentials when one is.',
    );
    this.name = 'PaymentProviderUnavailableError';
  }
}

/**
 * The provider that is always available: the one that says no.
 *
 * This exists so the checkout path can be built, rendered and tested end to
 * end today, and so that the failure mode is a clear sentence rather than a
 * null dereference at 2am. It is not a stub to be deleted — an unconfigured
 * deployment must keep behaving this way.
 */
export class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly id = 'unconfigured';
  readonly label = 'Payments not configured';
  readonly available = false;
  // 'signature' so that the false return below is treated as a rejection.
  // Nothing is configured to re-query, so there is no safer default: an
  // unconfigured deployment must refuse every callback, signed or not.
  readonly webhookTrust = 'signature' as const;
  readonly requiresMsisdn = false;

  async createCheckout(): Promise<CheckoutResult> {
    throw new PaymentProviderUnavailableError(this.id);
  }

  // The parameters are declared even though they are unused: an implementation
  // that omits them cannot be called through the interface's own signature,
  // which is how a caller ends up casting instead of type-checking.
  verifyWebhookSignature(_payload: string, _signature: string | null): boolean {
    // Nothing is configured to sign with, so nothing can be valid.
    return false;
  }

  parseWebhookEvent(payload: unknown): WebhookEvent {
    return {
      kind: 'ignored',
      eventId: 'unconfigured',
      reason: 'no payment provider is configured',
      raw: payload,
    };
  }

  async fetchPaymentStatus(providerReference: string): Promise<ProviderPaymentStatus> {
    return {
      state: 'unknown',
      providerReference,
      reason: 'no payment provider is configured',
    };
  }

  async requestRefund(): Promise<{ providerRefundReference: string }> {
    throw new PaymentProviderUnavailableError(this.id);
  }
}
