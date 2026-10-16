/**
 * Airtel Money — Collections.
 *
 * The flow:
 *
 *   1. POST /auth/oauth2/token with client_id + client_secret in a JSON body,
 *      for a bearer token. Lifetime varies by market and is short — some
 *      deployments issue 3600s, others as little as 180s — so the expiry the
 *      provider reports is always believed rather than assumed.
 *   2. POST /merchant/v1/payments/ with X-Country and X-Currency headers, the
 *      subscriber's number and the amount. This triggers a USSD push; the payer
 *      confirms with their PIN.
 *   3. GET /standard/v1/payments/{transactionId} for the authoritative status:
 *      TS = success, TF = failed, TIP = in progress.
 *
 * LIKE MTN, THE CALLBACK IS NOT PROOF. Airtel publishes no signature scheme for
 * its collection notification, so there is nothing to verify against and
 * `verifyWebhookSignature` returns false unconditionally. The notification tells
 * us to look; `fetchPaymentStatus` tells us what happened. An adapter that
 * trusted the callback body would let anyone who knows an order id mark it paid.
 *
 * ONE THING TO CONFIRM IN SANDBOX BEFORE GOING LIVE: the refund endpoint. Airtel
 * exposes refunds on the collections product, but the path and payload differ
 * between markets and API versions (`/merchant/v1/payments/refund/` versus
 * `/standard/v1/payments/refund`, keyed on `transaction_id` versus
 * `airtel_money_id`). The default below is the most widely documented shape and
 * the path is overridable with AIRTEL_REFUND_PATH, because a refund sent to the
 * wrong path fails visibly while a refund recorded as sent but never despatched
 * fails silently — and the silent one is the expensive mistake.
 */

import { randomUUID } from 'node:crypto';
import { toMajorString, fromMajor, type Money } from '../money.ts';
import {
  type CheckoutRequest,
  type CheckoutResult,
  type PaymentProvider,
  type ProviderPaymentStatus,
  type WebhookEvent,
  PaymentProviderUnavailableError,
} from './provider.ts';
import { accessToken, invalidateToken, readJson } from './oauth.ts';

export type AirtelConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /** ISO 3166-1 alpha-2, e.g. `UG`. Sent as X-Country and in the payload. */
  country: string;
  /** ISO 4217, e.g. `UGX`. Sent as X-Currency and in the payload. */
  currency: string;
  /** Overridable because it differs between markets and API versions. */
  refundPath: string;
};

export function airtelConfigFromEnv(): AirtelConfig | null {
  const clientId = process.env.AIRTEL_CLIENT_ID?.trim();
  const clientSecret = process.env.AIRTEL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const country = process.env.AIRTEL_COUNTRY?.trim() || 'UG';
  return {
    baseUrl:
      process.env.AIRTEL_BASE_URL?.trim() || 'https://openapiuat.airtel.africa',
    clientId,
    clientSecret,
    country,
    currency: process.env.AIRTEL_CURRENCY?.trim() || 'UGX',
    refundPath:
      process.env.AIRTEL_REFUND_PATH?.trim() || '/merchant/v1/payments/refund/',
  };
}

export class AirtelMoneyProvider implements PaymentProvider {
  readonly id = 'airtel_money';
  readonly label = 'Airtel Money';
  readonly webhookTrust = 'requery' as const;
  readonly requiresMsisdn = true;
  readonly available: boolean;

  // Declared as a field rather than a constructor parameter property: Node's
  // --experimental-strip-types, which the unit tests run under, does not
  // support parameter properties.
  private readonly config: AirtelConfig | null;

  constructor(config: AirtelConfig | null) {
    this.config = config;
    this.available = config !== null;
  }

  private get cfg(): AirtelConfig {
    if (!this.config) throw new PaymentProviderUnavailableError(this.id);
    return this.config;
  }

  private get tokenKey(): string {
    // Keyed on the credentials so a sandbox token is never served to a
    // production call — the mix-up presents as a mysterious 401.
    return `airtel_money:${this.cfg.baseUrl}:${this.cfg.clientId}`;
  }

  private async token(): Promise<string> {
    const cfg = this.cfg;
    try {
      return await accessToken(this.tokenKey, async () => {
        const res = await fetch(`${cfg.baseUrl}/auth/oauth2/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: '*/*' },
          // Airtel takes the credentials in the body, not as HTTP Basic.
          body: JSON.stringify({
            client_id: cfg.clientId,
            client_secret: cfg.clientSecret,
            grant_type: 'client_credentials',
          }),
        });
        const body = (await readJson(res)) as {
          access_token?: string;
          expires_in?: number;
        } | null;
        if (!res.ok || !body?.access_token) {
          throw new Error(`Airtel token request failed (${res.status})`);
        }
        return { accessToken: body.access_token, expiresIn: body.expires_in ?? 300 };
      });
    } catch (e) {
      invalidateToken(this.tokenKey);
      throw e;
    }
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const cfg = this.cfg;

    if (!request.msisdn) {
      throw new Error('Airtel Money needs the payer\'s mobile money number.');
    }

    // The currency the order is priced in must match what this account is
    // configured for. Sending a UGX amount to a KES-configured merchant account
    // would be rejected at best, and charged in the wrong currency at worst.
    if (request.amount.currency !== cfg.currency) {
      throw new Error(
        `Airtel Money is configured for ${cfg.currency} and this order is in ` +
          `${request.amount.currency}.`,
      );
    }

    // Our transaction id. Airtel echoes it back, and it is what the status
    // query is keyed on, so it has to be stable for the life of the attempt.
    const transactionId = randomUUID();

    const res = await fetch(`${cfg.baseUrl}/merchant/v1/payments/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        'Content-Type': 'application/json',
        Accept: '*/*',
        'X-Country': cfg.country,
        'X-Currency': cfg.currency,
      },
      body: JSON.stringify({
        reference: request.orderId,
        subscriber: {
          country: cfg.country,
          currency: cfg.currency,
          // Digits only. E.164 is what we store; the leading '+' is not part of
          // what Airtel accepts.
          msisdn: request.msisdn.replace(/\D/g, ''),
        },
        transaction: {
          amount: toMajorString(request.amount),
          country: cfg.country,
          currency: cfg.currency,
          id: transactionId,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Airtel Money could not start this payment (${res.status}): ${describe(await readJson(res))}`,
      );
    }

    return { kind: 'pending', providerReference: transactionId };
  }

  /** Always false: Airtel does not sign collection notifications. */
  verifyWebhookSignature(_payload: string, _signature: string | null): boolean {
    return false;
  }

  parseWebhookEvent(payload: unknown): WebhookEvent {
    const p = (payload ?? {}) as Record<string, unknown>;
    const txn = (p.transaction ?? p) as Record<string, unknown>;
    const status = typeof txn.status_code === 'string'
      ? txn.status_code.toUpperCase()
      : typeof txn.status === 'string'
        ? txn.status.toUpperCase()
        : '';
    const reference = typeof p.reference === 'string' ? p.reference : '';
    const transactionId = typeof txn.id === 'string' ? txn.id : '';

    if (!reference && !transactionId) {
      return {
        kind: 'ignored',
        eventId: 'unknown',
        reason: 'notification carries no reference or transaction id',
        raw: payload,
      };
    }

    if (status === 'TS') {
      return {
        kind: 'payment.succeeded',
        eventId: transactionId || `airtel:${reference}`,
        providerReference: transactionId,
        orderId: reference,
        // Untrusted. The recorded amount comes from fetchPaymentStatus.
        amount: safeAmount(txn),
        raw: payload,
      };
    }

    if (status === 'TF') {
      return {
        kind: 'payment.failed',
        eventId: transactionId || `airtel:${reference}`,
        providerReference: transactionId,
        orderId: reference,
        reason: typeof txn.message === 'string' ? txn.message : 'payment failed',
        raw: payload,
      };
    }

    return {
      kind: 'ignored',
      eventId: transactionId || `airtel:${reference}`,
      reason: `unrecognised Airtel status '${status}' (TIP is in progress, not an outcome)`,
      raw: payload,
    };
  }

  async fetchPaymentStatus(providerReference: string): Promise<ProviderPaymentStatus> {
    const cfg = this.cfg;

    let res: Response;
    try {
      res = await fetch(
        `${cfg.baseUrl}/standard/v1/payments/${encodeURIComponent(providerReference)}`,
        {
          headers: {
            Authorization: `Bearer ${await this.token()}`,
            'X-Country': cfg.country,
            'X-Currency': cfg.currency,
            Accept: '*/*',
          },
        },
      );
    } catch (e) {
      // Unreachable is not failed — reporting `failed` invites a retry on a
      // payment that may already have succeeded.
      return {
        state: 'unknown',
        providerReference,
        reason: `could not reach Airtel Money: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    const body = (await readJson(res)) as {
      transaction?: {
        status?: string;
        status_code?: string;
        message?: string;
        airtel_money_id?: string;
        amount?: string | number;
        currency?: string;
      };
    } | null;

    if (!res.ok || !body?.transaction) {
      return {
        state: 'unknown',
        providerReference,
        reason: `Airtel status query returned ${res.status}: ${describe(body)}`,
      };
    }

    const t = body.transaction;
    const status = (t.status_code ?? t.status ?? '').toUpperCase();

    if (status === 'TS') {
      const amount = parseAmount(t.amount, t.currency) ?? {
        amountMinor: 0n,
        currency: cfg.currency,
      };
      // An amount the provider did not report is not a reason to reject a
      // successful payment; the order total is authoritative anyway. But a zero
      // placeholder must never reach the ledger as if it were the amount paid.
      if (amount.amountMinor === 0n) {
        return {
          state: 'unknown',
          providerReference,
          reason: `Airtel reported success without a usable amount: ${describe(t)}`,
        };
      }
      return {
        state: 'succeeded',
        providerReference,
        amount,
        financialTransactionId: t.airtel_money_id ?? null,
      };
    }

    if (status === 'TF') {
      return {
        state: 'failed',
        providerReference,
        reason: t.message ?? 'payment failed',
      };
    }

    if (status === 'TIP') {
      return { state: 'pending', providerReference };
    }

    return {
      state: 'unknown',
      providerReference,
      reason: `unrecognised Airtel status '${status}'`,
    };
  }

  async requestRefund(args: {
    providerReference: string;
    amount: Money;
    reason: string;
  }): Promise<{ providerRefundReference: string }> {
    const cfg = this.cfg;
    const referenceId = randomUUID();

    const res = await fetch(`${cfg.baseUrl}${cfg.refundPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        'Content-Type': 'application/json',
        Accept: '*/*',
        'X-Country': cfg.country,
        'X-Currency': cfg.currency,
      },
      body: JSON.stringify({
        reference_id: referenceId,
        transaction_id: args.providerReference,
      }),
    });

    if (!res.ok) {
      // Say plainly that the path may be wrong for this market, because that is
      // the most likely cause and it is not obvious from the status code.
      throw new Error(
        `Airtel Money could not start this refund (${res.status}): ` +
          `${describe(await readJson(res))}. If the path is wrong for this market, ` +
          'set AIRTEL_REFUND_PATH.',
      );
    }
    return { providerRefundReference: referenceId };
  }
}

// ---------------------------------------------------------------------------

function describe(body: unknown): string {
  if (!body || typeof body !== 'object') return 'no response body';
  return JSON.stringify(body).slice(0, 300);
}

/** Parsed as a decimal string, never via Number — no floats in money. */
function parseAmount(amount: unknown, currency: unknown): Money | null {
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) return null;
  const s = String(amount ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  try {
    return fromMajor(s, currency);
  } catch {
    return null;
  }
}

/** For an untrusted notification body. Never used to record money. */
function safeAmount(t: Record<string, unknown>): Money {
  return parseAmount(t.amount, t.currency) ?? { amountMinor: 0n, currency: 'UGX' };
}
