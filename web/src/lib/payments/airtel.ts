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
import { AIRTEL_MARKETS, nationalDigits, type Market } from './markets.ts';

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

/**
 * One Airtel market's account, from the environment, or null when it has none.
 *
 * **One country, one set of names.** Kenya's account is `AIRTEL_KE_CLIENT_ID`
 * and `AIRTEL_KE_CLIENT_SECRET`; it calls Airtel's production host with
 * `X-Country: KE` and collects shillings. Only a country in `AIRTEL_MARKETS`
 * can be named.
 *
 * **The names without a country** (`AIRTEL_CLIENT_ID` and the rest) are the
 * first account this platform was written for. They stay, and they are one
 * market like any other: the country is `AIRTEL_COUNTRY`, Uganda when it is
 * not set, and they default to Airtel's test host as they always did.
 */
export function airtelConfigFromEnv(country?: string): AirtelConfig | null {
  const scoped = country !== undefined;
  const read = (name: string) =>
    process.env[scoped ? `AIRTEL_${country}_${name}` : `AIRTEL_${name}`]?.trim();

  const clientId = read('CLIENT_ID');
  const clientSecret = read('CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  const where = (scoped ? country : process.env.AIRTEL_COUNTRY?.trim() || 'UG').toUpperCase();
  const market = AIRTEL_MARKETS[where];
  // A country Airtel Money does not operate in cannot be configured into one.
  if (!market) return null;

  return {
    baseUrl:
      read('BASE_URL') ||
      (scoped ? 'https://openapi.airtel.africa' : 'https://openapiuat.airtel.africa'),
    clientId,
    clientSecret,
    country: where,
    currency: read('CURRENCY')?.toUpperCase() || market.currency,
    refundPath: read('REFUND_PATH') || '/merchant/v1/payments/refund/',
  };
}

/**
 * The id a collection is started under, with the order inside it.
 *
 * Airtel's answer to a status query names the transaction and says nothing
 * about the order it was for, and its notification is unsigned. So the order
 * is written into the id itself: the order's thirty-two hex digits, then four
 * random ones so a second attempt at the same order is a different
 * transaction. A status that is asked for by this id is therefore a status
 * of this order, and a payment made for one order cannot be presented as the
 * payment for another.
 *
 * Thirty-six characters, the length of the UUID this used to be. Whether
 * Airtel accepts it in every market is one more thing to confirm in sandbox.
 */
export function airtelTransactionId(orderId: string): string {
  const hex = orderId.replace(/-/gu, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/u.test(hex)) {
    throw new Error('Airtel Money needs an order id that is a UUID.');
  }
  return `${hex}${randomUUID().replace(/-/gu, '').slice(0, 4)}`;
}

/** The order a transaction id was made for, or null for an id this file did not make. */
export function orderOfAirtelTransaction(transactionId: string): string | null {
  if (!/^[0-9a-f]{36}$/u.test(transactionId)) return null;
  const h = transactionId.slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export class AirtelMoneyProvider implements PaymentProvider {
  readonly id: string;
  readonly label = 'Airtel Money';
  readonly webhookTrust = 'requery' as const;
  readonly requiresMsisdn = true;
  readonly available: boolean;
  readonly market: Market | null;

  // Declared as a field rather than a constructor parameter property: Node's
  // --experimental-strip-types, which the unit tests run under, does not
  // support parameter properties.
  private readonly config: AirtelConfig | null;

  constructor(config: AirtelConfig | null, id = 'airtel_money') {
    this.config = config;
    this.id = id;
    this.available = config !== null;
    this.market = config ? { country: config.country, currency: config.currency } : null;
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

    // Airtel takes the subscriber's number without the country's code: the
    // country travels in `X-Country`. This sent every digit of the stored
    // number, `256752123456`, which is not a number in Uganda. A number from
    // another country has no national form here and is refused.
    const national = nationalDigits(request.msisdn, cfg.country);
    if (!national) {
      throw new Error(`Airtel Money in ${cfg.country} cannot prompt a number from another country.`);
    }

    // Our transaction id. Airtel echoes it back, and it is what the status
    // query is keyed on, so it has to be stable for the life of the attempt.
    // It carries the order: see `airtelTransactionId`.
    const transactionId = airtelTransactionId(request.orderId);

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
          msisdn: national,
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
        // The order is in the id (`airtelTransactionId`); Airtel's own
        // notification carries no reference of ours.
        orderId: orderOfAirtelTransaction(transactionId) ?? reference,
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
        // The order is in the id (`airtelTransactionId`); Airtel's own
        // notification carries no reference of ours.
        orderId: orderOfAirtelTransaction(transactionId) ?? reference,
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

    type Transaction = {
      status?: string;
      status_code?: string;
      message?: string;
      airtel_money_id?: string;
      amount?: string | number;
      currency?: string;
    };
    // Airtel wraps its answer: `{ data: { transaction }, status }`. This read
    // `transaction` at the top, where it is not, so every answer was
    // "unknown". The unwrapped shape is still read, for a market that sends it.
    const body = (await readJson(res)) as {
      data?: { transaction?: Transaction };
      transaction?: Transaction;
    } | null;
    const t = body?.data?.transaction ?? body?.transaction;

    if (!res.ok || !t) {
      return {
        state: 'unknown',
        providerReference,
        reason: `Airtel status query returned ${res.status}: ${describe(body)}`,
      };
    }
    const status = (t.status_code ?? t.status ?? '').toUpperCase();

    if (status === 'TS') {
      // Airtel's answer names the transaction and its state and, as
      // documented, no amount. This used to call a success with no amount
      // "unknown", so no Airtel payment could ever have settled. The amount
      // is reported when it is there and is null when it is not; what binds
      // the payment to an order is the id (below), and the webhook settles
      // the order's own total.
      const amount = parseAmount(t.amount, t.currency ?? cfg.currency);
      return {
        state: 'succeeded',
        providerReference,
        amount: amount && amount.amountMinor > 0n ? amount : null,
        financialTransactionId: t.airtel_money_id ?? null,
        // The id this status was asked for by was made from an order's id, and
        // Airtel has just said it knows that id. Null for an id made any
        // other way, which settles nothing.
        orderId: orderOfAirtelTransaction(providerReference),
      };
    }

    if (status === 'TF') {
      return {
        state: 'failed',
        providerReference,
        reason: t.message ?? 'payment failed',
        orderId: orderOfAirtelTransaction(providerReference),
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
