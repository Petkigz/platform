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

  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;

  /**
   * Must return false for a bad signature. Must not throw for a payload it
   * simply does not recognise — return `ignored` from parseWebhookEvent
   * instead, so an unknown event type does not turn into a 500 that the
   * provider retries forever.
   */
  verifyWebhookSignature(payload: string, signature: string | null): boolean;

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

  async createCheckout(): Promise<CheckoutResult> {
    throw new PaymentProviderUnavailableError(this.id);
  }

  verifyWebhookSignature(): boolean {
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

  async requestRefund(): Promise<{ providerRefundReference: string }> {
    throw new PaymentProviderUnavailableError(this.id);
  }
}
