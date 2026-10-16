/**
 * MTN MoMo — Collections (Request to Pay).
 *
 * The flow, as MTN documents it:
 *
 *   1. POST /collection/token/ with HTTP Basic (api user : api key) plus the
 *      subscription-key header, to get a bearer token valid ~1 hour.
 *   2. POST /collection/v1_0/requesttopay with a caller-generated
 *      X-Reference-Id. Answers 202 Accepted with no body — the payment has been
 *      *requested*, not made. The prompt appears on the handset and the payer
 *      approves it with their PIN.
 *   3. The outcome arrives either on the callback host or by polling
 *      GET /collection/v1_0/requesttopay/{referenceId}.
 *
 * THE CALLBACK IS NOT SIGNED. This is the single most important fact about this
 * adapter. MTN publishes no signature scheme for the collection callback, and
 * the documented integration pattern is to treat it as a notification, find the
 * order, and then re-query the transaction. So `verifyWebhookSignature` returns
 * false unconditionally — not because verification failed, but because there is
 * nothing to verify against — and the caller is expected to fall back to
 * `fetchPaymentStatus`. Returning true here would let anyone who knows an order
 * id mark it paid.
 *
 * Refunds are the awkward one. There is no refund on the Collections product;
 * money goes back out through Disbursements, which is a separate subscription
 * with its own credentials. Rather than invent an endpoint, `requestRefund`
 * refuses until disbursement credentials are configured. A refund that cannot
 * be sent is a support conversation; one that appears to have been sent is a
 * customer who is waiting for money that never moves.
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

export type MtnMomoConfig = {
  /** Sandbox defaults to MTN's developer host; production is market-specific. */
  baseUrl: string;
  /** X-Target-Environment, e.g. `sandbox` or `mtnuganda`. */
  targetEnvironment: string;
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  /** Where MTN posts notifications. Optional but recommended. */
  callbackUrl?: string;
  /** Disbursement credentials, needed only for refunds. */
  disbursement?: { subscriptionKey: string; apiUser: string; apiKey: string };
};

export function mtnMomoConfigFromEnv(): MtnMomoConfig | null {
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY?.trim();
  const apiUser = process.env.MTN_MOMO_API_USER?.trim();
  const apiKey = process.env.MTN_MOMO_API_KEY?.trim();
  if (!subscriptionKey || !apiUser || !apiKey) return null;

  const disbursementKey = process.env.MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY?.trim();
  const disbursementUser = process.env.MTN_MOMO_DISBURSEMENT_API_USER?.trim();
  const disbursementApiKey = process.env.MTN_MOMO_DISBURSEMENT_API_KEY?.trim();

  return {
    baseUrl:
      process.env.MTN_MOMO_BASE_URL?.trim() || 'https://sandbox.momodeveloper.mtn.com',
    targetEnvironment: process.env.MTN_MOMO_TARGET_ENVIRONMENT?.trim() || 'sandbox',
    subscriptionKey,
    apiUser,
    apiKey,
    callbackUrl: process.env.MTN_MOMO_CALLBACK_URL?.trim() || undefined,
    disbursement:
      disbursementKey && disbursementUser && disbursementApiKey
        ? {
            subscriptionKey: disbursementKey,
            apiUser: disbursementUser,
            apiKey: disbursementApiKey,
          }
        : undefined,
  };
}

export class MtnMomoProvider implements PaymentProvider {
  readonly id = 'mtn_momo';
  readonly label = 'MTN MoMo';
  readonly webhookTrust = 'requery' as const;
  readonly requiresMsisdn = true;
  readonly available: boolean;

  // Declared as a field rather than a constructor parameter property: Node's
  // --experimental-strip-types, which the unit tests run under, does not
  // support parameter properties.
  private readonly config: MtnMomoConfig | null;

  constructor(config: MtnMomoConfig | null) {
    this.config = config;
    this.available = config !== null;
  }

  private get cfg(): MtnMomoConfig {
    if (!this.config) throw new PaymentProviderUnavailableError(this.id);
    return this.config;
  }

  private tokenKey(kind: 'collection' | 'disbursement'): string {
    const c = kind === 'collection' ? this.cfg : this.cfg.disbursement;
    if (!c) throw new PaymentProviderUnavailableError(this.id);
    // Keyed on the credentials, not just the provider, so a sandbox token can
    // never be served to a production call.
    return `mtn_momo:${kind}:${this.cfg.baseUrl}:${c.apiUser}`;
  }

  private async token(kind: 'collection' | 'disbursement'): Promise<string> {
    const cfg = this.cfg;
    const creds = kind === 'collection' ? cfg : cfg.disbursement;
    if (!creds) throw new PaymentProviderUnavailableError(this.id);

    const key = this.tokenKey(kind);
    const basic = Buffer.from(`${creds.apiUser}:${creds.apiKey}`).toString('base64');
    const subscriptionKey =
      kind === 'collection' ? cfg.subscriptionKey : creds.subscriptionKey;

    try {
      return await accessToken(key, async () => {
        const res = await fetch(`${cfg.baseUrl}/collection/token/`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basic}`,
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Content-Type': 'application/json',
          },
        });
        const body = (await readJson(res)) as {
          access_token?: string;
          expires_in?: number;
        } | null;
        if (!res.ok || !body?.access_token) {
          throw new Error(`MTN MoMo token request failed (${res.status})`);
        }
        return { accessToken: body.access_token, expiresIn: body.expires_in ?? 3600 };
      });
    } catch (e) {
      invalidateToken(key);
      throw e;
    }
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const cfg = this.cfg;

    // Mobile money needs a handset. Without one there is nothing to prompt, and
    // discovering that after creating the order is worse than refusing now.
    if (!request.msisdn) {
      throw new Error('MTN MoMo needs the payer\'s mobile money number.');
    }

    // MTN's idempotency key. Generated here, returned as the provider
    // reference, and used for every later status query — so it must be stable
    // for the life of the attempt.
    const referenceId = randomUUID();

    const res = await fetch(`${cfg.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.token('collection')}`,
        'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': cfg.targetEnvironment,
        'Content-Type': 'application/json',
        ...(cfg.callbackUrl ? { 'X-Callback-Url': cfg.callbackUrl } : {}),
      },
      body: JSON.stringify({
        // A decimal string in major units, never minor units and never a float.
        amount: toMajorString(request.amount),
        currency: request.amount.currency,
        // Our order id, echoed back in the status response.
        externalId: request.orderId,
        payer: { partyIdType: 'MSISDN', partyId: request.msisdn },
        payerMessage: request.description.slice(0, 100),
        payeeNote: 'AyahSpring',
      }),
    });

    // 202 Accepted is success here, with no body. Anything else is a real
    // failure and the payer should be told, not left waiting on a prompt that
    // was never sent.
    if (res.status !== 202 && res.status !== 200) {
      const body = await readJson(res);
      throw new Error(
        `MTN MoMo could not start this payment (${res.status}): ${describe(body)}`,
      );
    }

    return { kind: 'pending', providerReference: referenceId };
  }

  /** Always false: MTN does not sign collection callbacks. See the header. */
  verifyWebhookSignature(_payload: string, _signature: string | null): boolean {
    return false;
  }

  /**
   * Parse a notification into something we can act on — but only as a pointer.
   *
   * The caller must confirm with `fetchPaymentStatus` before recording a
   * payment. Treating this payload as proof is the exploit: it is unsigned, so
   * anyone who can guess an order id can forge a success.
   */
  parseWebhookEvent(payload: unknown): WebhookEvent {
    const p = (payload ?? {}) as Record<string, unknown>;
    const status = typeof p.status === 'string' ? p.status.toUpperCase() : '';
    const externalId = typeof p.externalId === 'string' ? p.externalId : '';
    const reference = typeof p.referenceId === 'string' ? p.referenceId : '';

    if (!externalId) {
      return {
        kind: 'ignored',
        eventId: reference || 'unknown',
        reason: 'notification carries no externalId, so it cannot be matched to an order',
        raw: payload,
      };
    }

    if (status === 'SUCCESSFUL') {
      return {
        kind: 'payment.succeeded',
        eventId: reference || `mtn:${externalId}`,
        providerReference: reference,
        orderId: externalId,
        // Present in the payload but NOT trusted: the amount that gets recorded
        // comes from fetchPaymentStatus, which is authenticated.
        amount: safeAmount(p),
        raw: payload,
      };
    }

    if (status === 'FAILED') {
      const reason = (p.reason ?? {}) as { message?: string; code?: string };
      return {
        kind: 'payment.failed',
        eventId: reference || `mtn:${externalId}`,
        providerReference: reference,
        orderId: externalId,
        reason: reason.message ?? reason.code ?? 'payment failed',
        raw: payload,
      };
    }

    return {
      kind: 'ignored',
      eventId: reference || `mtn:${externalId}`,
      reason: `unrecognised MTN status '${status}'`,
      raw: payload,
    };
  }

  async fetchPaymentStatus(providerReference: string): Promise<ProviderPaymentStatus> {
    const cfg = this.cfg;

    let res: Response;
    try {
      res = await fetch(
        `${cfg.baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(providerReference)}`,
        {
          headers: {
            Authorization: `Bearer ${await this.token('collection')}`,
            'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
            'X-Target-Environment': cfg.targetEnvironment,
          },
        },
      );
    } catch (e) {
      // Unreachable is not failed. Reporting `failed` here is how a payment
      // that succeeded gets retried and charged twice.
      return {
        state: 'unknown',
        providerReference,
        reason: `could not reach MTN MoMo: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    const body = (await readJson(res)) as {
      status?: string;
      amount?: string | number;
      currency?: string;
      financialTransactionId?: string;
      reason?: { code?: string; message?: string };
    } | null;

    if (!res.ok || !body) {
      return {
        state: 'unknown',
        providerReference,
        reason: `MTN MoMo status query returned ${res.status}: ${describe(body)}`,
      };
    }

    const status = (body.status ?? '').toUpperCase();

    if (status === 'SUCCESSFUL') {
      // The amount comes from here — an authenticated call — not from the
      // callback. That is the whole point of querying.
      const amount = parseAmount(body.amount, body.currency);
      if (!amount) {
        return {
          state: 'unknown',
          providerReference,
          reason: `MTN MoMo reported success but the amount could not be parsed: ${describe(body)}`,
        };
      }
      return {
        state: 'succeeded',
        providerReference,
        amount,
        financialTransactionId: body.financialTransactionId ?? null,
      };
    }

    if (status === 'FAILED') {
      return {
        state: 'failed',
        providerReference,
        reason: body.reason?.message ?? body.reason?.code ?? 'payment failed',
      };
    }

    if (status === 'PENDING') {
      return { state: 'pending', providerReference };
    }

    return {
      state: 'unknown',
      providerReference,
      reason: `unrecognised MTN MoMo status '${status}'`,
    };
  }

  /**
   * MTN refunds go out through Disbursements, a separate subscription. Without
   * those credentials this refuses rather than pretending, so the refund queue
   * shows a real problem instead of a silent one.
   */
  async requestRefund(args: {
    providerReference: string;
    amount: Money;
    reason: string;
  }): Promise<{ providerRefundReference: string }> {
    const cfg = this.cfg;
    if (!cfg.disbursement) {
      throw new Error(
        'MTN MoMo refunds are paid out through the Disbursements product, which ' +
          'is a separate subscription. Configure MTN_MOMO_DISBURSEMENT_* to ' +
          'enable refunds, or refund this one manually and mark it settled.',
      );
    }

    const referenceId = randomUUID();
    const res = await fetch(`${cfg.baseUrl}/disbursement/v1_0/transfer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.token('disbursement')}`,
        'Ocp-Apim-Subscription-Key': cfg.disbursement.subscriptionKey,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': cfg.targetEnvironment,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: toMajorString(args.amount),
        currency: args.amount.currency,
        // The original collection's financial transaction id, so the payout is
        // tied to the payment it reverses.
        externalId: args.providerReference,
        payee: { partyIdType: 'MSISDN', partyId: '' },
        payeeMessage: 'Refund',
        payerMessage: args.reason.slice(0, 100),
      }),
    });

    if (res.status !== 202 && res.status !== 200) {
      throw new Error(
        `MTN MoMo could not start this refund (${res.status}): ${describe(await readJson(res))}`,
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

/**
 * Parse a provider amount into Money.
 *
 * Parsed as a decimal string, never via Number, so a large UGX amount cannot
 * lose precision. Returns null rather than guessing: an amount we cannot read
 * exactly is not an amount we should record.
 */
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

/** Same, but for an untrusted callback payload — never used to record money. */
function safeAmount(p: Record<string, unknown>): Money {
  return parseAmount(p.amount, p.currency) ?? { amountMinor: 0n, currency: 'UGX' };
}
