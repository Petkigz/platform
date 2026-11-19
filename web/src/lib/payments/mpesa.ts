/**
 * M-Pesa in Kenya, direct — Safaricom's Daraja API, "M-Pesa Express" (the
 * prompt on the handset, also called STK push).
 *
 * Why it exists: the owner asked for M-Pesa first, the aggregator's sandbox
 * account was not given M-Pesa in Kenya (`pawapay.ts`), and the owner said a
 * direct road "can be added to fix this" (2026-11-19). Kenya only: M-Pesa in
 * Tanzania, Mozambique, Lesotho, the Democratic Republic of the Congo and
 * Ethiopia are other companies' systems with other APIs, and are reached
 * through the aggregator or not at all.
 *
 * **Written from descriptions of Daraja and run against nothing.** Safaricom's
 * own documentation sits behind a developer sign-in this platform has not
 * made. The shapes below are the ones Daraja integrations agree on in public
 * (the endpoints, the password, the answer to a status query and its codes;
 * for instance github.com/kamalogudah/lipwa issue 67 and
 * github.com/Flying-Tea-Squad/paykit-go issue 97). **No request has been sent
 * to Safaricom.** There is no Daraja app, sandbox or live, and going live
 * needs a paybill or till in the name of a registered business.
 *
 * The flow:
 *
 *   1. `GET /oauth/v1/generate?grant_type=client_credentials` with the app's
 *      consumer key and secret as HTTP Basic, for a bearer token (an hour).
 *   2. `POST /mpesa/stkpush/v1/processrequest`: the shortcode, a password
 *      (base64 of shortcode + passkey + timestamp), the amount in whole
 *      shillings, the payer's number as `2547…`, and the address Safaricom
 *      is to call with the outcome. The answer carries a `CheckoutRequestID`,
 *      Safaricom's name for this prompt.
 *   3. The payer types their PIN on their own handset.
 *   4. `POST /mpesa/stkpushquery/v1/query` with that id is the authoritative
 *      status: `ResultCode` "0" is paid; 1032 is cancelled, 1037 not reached,
 *      1 not enough money, 2001 a wrong PIN; and HTTP 500 with the error code
 *      `500.001.1001` means the payer has not answered yet, which is not a
 *      failure.
 *
 * **THE CALLBACK IS NOT PROOF.** Safaricom does not sign it. As everywhere
 * in this directory, it is used to find the payment and the status query
 * decides what happened.
 *
 * **Which order a payment was for is the hard part here, and it is solved
 * differently from the other three.** Safaricom's status answer names the
 * prompt and nothing of ours: no order, no reference, **no amount**. And the
 * id of the prompt is Safaricom's, so the order cannot be written into it as
 * it is for Airtel. What Safaricom does give back, exactly, is the address
 * it was told to call. So the order travels there:
 *
 *   - each payment is started with a callback address of its own, carrying
 *     the order's id, a random number, and a code made from both with a key
 *     only this server holds (`…?o=<order>&n=<random>&s=<code>`);
 *   - a callback that arrives anywhere else, or with a code that does not
 *     fit, is ignored before Safaricom is asked anything. That address is
 *     never sent to the payer's browser;
 *   - a callback at a good address is still only a pointer. Safaricom is
 *     asked about the `CheckoutRequestID` it carries, and the order is
 *     settled only if Safaricom says that prompt was paid.
 *
 * What that proves: somebody who knew the address this server gave Safaricom
 * for that order says a prompt was paid, and Safaricom confirms that prompt
 * was. **What it does not prove, said plainly:** that the prompt Safaricom
 * confirms is the one started for that order. Whoever holds a good address
 * for one order (Safaricom; anybody who can read this server's outgoing
 * requests) and the id of another paid prompt on the same shortcode could
 * settle the first with the second. A payer holds neither address. And the
 * amount cannot be checked at all: it is the one this server asked for, the
 * payer cannot change it on the prompt, and the order's own total is what is
 * recorded (`binding.ts`, `amountFrom: 'order'`).
 *
 * **Not built:** refunds (Safaricom's reversal needs an operator's own
 * credential, encrypted with Safaricom's certificate), paybill and till
 * notifications that are not answers to a prompt, and anything that asks
 * again when a callback never comes. Safaricom does not send a callback
 * twice.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { minorUnitDivisor, type Money } from '../money.ts';
import {
  type CheckoutRequest,
  type CheckoutResult,
  type PaymentProvider,
  type ProviderPaymentStatus,
  type WebhookEvent,
  type WebhookRequest,
  PaymentNotStartedError,
  PaymentProviderUnavailableError,
  refusedOutright,
} from './provider.ts';
import { accessToken, invalidateToken, readJson } from './oauth.ts';
import { MPESA_MARKETS, internationalDigits, isNumberOf, type Market } from './markets.ts';

const SANDBOX = 'https://sandbox.safaricom.co.ke';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
/** Safaricom's id for a prompt: `ws_CO_191220191020363925`. Letters, digits, `_`, `.`, `-`. */
const CHECKOUT_ID = /^[A-Za-z0-9_.-]{6,100}$/u;
const NONCE = /^[0-9a-f]{32}$/u;
/** How long one request to Safaricom may take before it counts as unanswered. */
const TIMEOUT_MS = 20_000;

/** The payer has not answered the prompt yet. Not an outcome. */
const STILL_PROCESSING = '500.001.1001';
/**
 * Result codes that say, for certain, that this prompt ended without a
 * payment. A code that is not here and is not "0" is **not** read as a
 * failure: an attempt is not closed on a number nobody here recognises.
 */
const FAILED_FOR_GOOD = new Set(['1', '1001', '1019', '1025', '1032', '1037', '2001']);
/** Result codes that say it is still under way. */
const UNDER_WAY = new Set(['4999']);

export type MpesaConfig = {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  /** The paybill, or for a till the store number the till belongs to. Sent as `BusinessShortCode`. */
  shortCode: string;
  /** The passkey Safaricom issues for M-Pesa Express on that shortcode. */
  passkey: string;
  /** A till number, when money is collected to a till ("Buy Goods") and not a paybill. */
  till: string | null;
  /** This platform's own address for this provider's callbacks, without a query. */
  callbackUrl: string;
  country: string;
  currency: string;
};

/**
 * Safaricom's account for one country, from the environment, or null.
 *
 * Kenya only, so the names are `MPESA_KE_…`: the app's `CONSUMER_KEY` and
 * `CONSUMER_SECRET`, the `SHORTCODE`, its `PASSKEY`, and `CALLBACK_URL`,
 * which is this deployment's own address for the callback
 * (`https://<domain>/api/payments/webhook/mpesa_ke`). All five are needed:
 * without the last, Safaricom has nowhere to say what happened, and the
 * order a payment is for travels in that address.
 *
 * `MPESA_KE_TILL` turns the payment into "Buy Goods" to that till.
 * `MPESA_KE_BASE_URL` is Safaricom's test host unless it says otherwise;
 * production is `https://api.safaricom.co.ke`.
 */
export function mpesaConfigFromEnv(country: string): MpesaConfig | null {
  const where = country.toUpperCase();
  const market = MPESA_MARKETS[where];
  if (!market) return null;
  const read = (name: string) => process.env[`MPESA_${where}_${name}`]?.trim() ?? '';

  const consumerKey = read('CONSUMER_KEY');
  const consumerSecret = read('CONSUMER_SECRET');
  const shortCode = read('SHORTCODE');
  const passkey = read('PASSKEY');
  const till = read('TILL');
  if (!consumerKey || !consumerSecret || !passkey) return null;
  if (!/^\d{4,9}$/u.test(shortCode) || (till !== '' && !/^\d{4,9}$/u.test(till))) return null;

  // Safaricom calls only https addresses. A loopback address is let through
  // so that this can be run against a stand-in on the same machine.
  let callback: URL;
  try {
    callback = new URL(read('CALLBACK_URL'));
  } catch {
    return null;
  }
  const loopback = callback.hostname === 'localhost' || callback.hostname === '127.0.0.1';
  if (callback.protocol !== 'https:' && !(loopback && callback.protocol === 'http:')) return null;
  if (callback.search !== '' || callback.hash !== '' || callback.username !== '' || callback.password !== '') return null;

  return {
    baseUrl: (read('BASE_URL') || SANDBOX).replace(/\/+$/u, ''),
    consumerKey,
    consumerSecret,
    shortCode,
    passkey,
    till: till === '' ? null : till,
    callbackUrl: callback.toString(),
    country: where,
    currency: market.currency,
  };
}

/** `20261119093015`, in Nairobi's time, which has no daylight saving: UTC+3. */
export function mpesaTimestamp(now: Date = new Date()): string {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/\D/gu, '').slice(0, 14);
}

/** The password Daraja asks for: base64 of shortcode, passkey and timestamp, in that order. */
export function mpesaPassword(shortCode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
}

/** The key the callback's codes are made with. From the passkey, and not the passkey itself. */
function signingKey(passkey: string): Buffer {
  return createHmac('sha256', passkey).update('ayahspring mpesa callback v1').digest();
}

function codeFor(passkey: string, ...parts: string[]): string {
  return createHmac('sha256', signingKey(passkey)).update(parts.join('|')).digest('base64url');
}

function sameCode(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The address Safaricom is told to call for one payment: this provider's
 * own, with the order, a random number and a code made from both.
 */
export function mpesaCallbackUrl(config: Pick<MpesaConfig, 'callbackUrl' | 'passkey'>, orderId: string, nonce: string): string {
  const url = new URL(config.callbackUrl);
  const order = orderId.toLowerCase();
  url.searchParams.set('o', order);
  url.searchParams.set('n', nonce);
  url.searchParams.set('s', codeFor(config.passkey, 'cb', order, nonce));
  return url.toString();
}

/** The order a callback's own address names, when this server made that address; otherwise null. */
export function orderOfMpesaCallback(config: Pick<MpesaConfig, 'passkey'>, requestUrl: string | undefined): string | null {
  if (!requestUrl) return null;
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  const order = url.searchParams.get('o') ?? '';
  const nonce = url.searchParams.get('n') ?? '';
  const code = url.searchParams.get('s') ?? '';
  if (!UUID.test(order) || order !== order.toLowerCase() || !NONCE.test(nonce) || code === '') return null;
  return sameCode(code, codeFor(config.passkey, 'cb', order, nonce)) ? order : null;
}

/**
 * A reference that carries its order: Safaricom's id for the prompt, the
 * order, and a code made from both. Made only after a callback's address has
 * been checked, and never shown to a payer.
 */
function boundReference(passkey: string, checkoutId: string, order: string): string {
  return `${checkoutId}~${order}~${codeFor(passkey, 'ref', checkoutId, order)}`;
}

/** Safaricom's id in a reference, and the order when the reference carries one this server bound. */
function readReference(passkey: string, reference: string): { checkoutId: string; order: string | null } | null {
  const parts = reference.split('~');
  if (parts.length === 1) return CHECKOUT_ID.test(reference) ? { checkoutId: reference, order: null } : null;
  if (parts.length !== 3) return null;
  const [checkoutId, order, code] = parts as [string, string, string];
  if (!CHECKOUT_ID.test(checkoutId) || !UUID.test(order)) return null;
  if (!sameCode(code, codeFor(passkey, 'ref', checkoutId, order))) return null;
  return { checkoutId, order };
}

/** Daraja's own error code, when it looks like one: `500.001.1001`. Never its sentence. */
function errorCodeOf(body: unknown): string | null {
  const code = (body as { errorCode?: unknown } | null)?.errorCode;
  return typeof code === 'string' && /^[0-9.]{3,24}$/u.test(code) ? code : null;
}

const asCode = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isInteger(value) ? String(value) : '';

export class MpesaProvider implements PaymentProvider {
  readonly id: string;
  readonly label = 'M-Pesa';
  readonly webhookTrust = 'requery' as const;
  readonly requiresMsisdn = true;
  readonly available: boolean;
  readonly market: Market | null;

  // A field, not a parameter property: see `airtel.ts`.
  private readonly config: MpesaConfig | null;

  constructor(config: MpesaConfig | null, id = 'mpesa_ke') {
    this.config = config;
    this.id = id;
    this.available = config !== null;
    this.market = config ? { country: config.country, currency: config.currency } : null;
  }

  private get cfg(): MpesaConfig {
    if (!this.config) throw new PaymentProviderUnavailableError(this.id);
    return this.config;
  }

  private get tokenKey(): string {
    return `mpesa:${this.cfg.baseUrl}:${this.cfg.consumerKey}`;
  }

  /** A prompt asks for whole shillings: no cents, and more than nothing. */
  accepts(amount: Money): boolean {
    const config = this.config;
    if (!config || amount.currency !== config.currency || amount.amountMinor <= 0n) return false;
    return amount.amountMinor % BigInt(minorUnitDivisor(amount.currency)) === 0n;
  }

  private async token(): Promise<string> {
    const cfg = this.cfg;
    try {
      return await accessToken(this.tokenKey, async () => {
        const basic = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
        const res = await fetch(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
          headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const body = (await readJson(res)) as { access_token?: unknown; expires_in?: unknown } | null;
        if (!res.ok || typeof body?.access_token !== 'string' || body.access_token === '') {
          throw new Error(`M-Pesa token request failed (${res.status})`);
        }
        // Safaricom writes the lifetime as a string: "3599".
        const seconds = Number.parseInt(String(body.expires_in ?? ''), 10);
        return { accessToken: body.access_token, expiresIn: Number.isFinite(seconds) ? seconds : 300 };
      });
    } catch (e) {
      invalidateToken(this.tokenKey);
      throw e;
    }
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const cfg = this.cfg;

    if (!request.msisdn) {
      throw new Error('M-Pesa needs the payer\'s mobile money number.');
    }
    if (!UUID.test(request.orderId)) {
      throw new Error('M-Pesa needs an order id that is a UUID.');
    }
    if (request.amount.currency !== cfg.currency) {
      throw new Error(`M-Pesa in ${cfg.country} collects ${cfg.currency} and this order is in ${request.amount.currency}.`);
    }
    // Never rounded: the amount on the prompt is the order's total or there is no prompt.
    if (!this.accepts(request.amount)) {
      throw new Error('M-Pesa takes whole shillings only, and this order\'s total is not a whole number of them.');
    }
    if (!isNumberOf(request.msisdn, cfg.country)) {
      throw new Error(`M-Pesa in ${cfg.country} cannot prompt a number from another country.`);
    }

    // Signed in first, apart from the request: if this fails, nothing was
    // asked of Safaricom about this payment (`PaymentNotStartedError`).
    let bearer: string;
    try {
      bearer = await this.token();
    } catch (e) {
      if (e instanceof PaymentProviderUnavailableError) throw e;
      throw new PaymentNotStartedError(this.id, 'signin');
    }

    const timestamp = mpesaTimestamp();
    const phone = internationalDigits(request.msisdn);
    const shillings = (request.amount.amountMinor / BigInt(minorUnitDivisor(request.amount.currency))).toString();
    // Safaricom wants the amount as a number. It is written into the JSON as
    // its own digits, from a whole number, and never passes through a float.
    const body = JSON.stringify({
      BusinessShortCode: cfg.shortCode,
      Password: mpesaPassword(cfg.shortCode, cfg.passkey, timestamp),
      Timestamp: timestamp,
      TransactionType: cfg.till ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
      Amount: 0,
      PartyA: phone,
      PartyB: cfg.till ?? cfg.shortCode,
      PhoneNumber: phone,
      // Where the order travels: see the header.
      CallBackURL: mpesaCallbackUrl(cfg, request.orderId, randomBytes(16).toString('hex')),
      // Both are shown to the payer on the prompt. Nothing personal, and no
      // more than twelve and thirteen characters.
      AccountReference: 'AyahSpring',
      TransactionDesc: 'Course',
    }).replace('"Amount":0,', `"Amount":${shillings},`);

    const res = await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const answer = (await readJson(res)) as { ResponseCode?: unknown; CheckoutRequestID?: unknown } | null;

    if (res.ok && asCode(answer?.ResponseCode) === '0' && typeof answer?.CheckoutRequestID === 'string' && CHECKOUT_ID.test(answer.CheckoutRequestID)) {
      return { kind: 'pending', providerReference: answer.CheckoutRequestID };
    }
    // Refused outright: Safaricom took nothing, and says so.
    if (refusedOutright(res.status)) throw new PaymentNotStartedError(this.id, `http_${res.status}`);
    // Anything else leaves it in doubt whether a prompt went out. The code
    // and no more: Daraja's sentences can name the payer's number.
    throw new Error(`M-Pesa could not start this payment (${res.status}): ${errorCodeOf(answer) ?? 'no code'}`);
  }

  /** Always false: Safaricom does not sign this callback. */
  verifyWebhookSignature(_payload: string, _signature: string | null): boolean {
    return false;
  }

  parseWebhookEvent(payload: unknown, request?: WebhookRequest): WebhookEvent {
    const callback = (payload as { Body?: { stkCallback?: Record<string, unknown> } } | null)?.Body?.stkCallback;
    const checkoutId = typeof callback?.CheckoutRequestID === 'string' ? callback.CheckoutRequestID : '';
    if (!callback || typeof callback !== 'object' || !CHECKOUT_ID.test(checkoutId)) {
      return { kind: 'ignored', eventId: 'unknown', reason: 'not an M-Pesa Express callback', raw: payload };
    }
    // With no account there is no key to check an address with, and nobody to ask.
    const order = this.config ? orderOfMpesaCallback(this.config, request?.url) : null;
    if (!this.config || !order) {
      // Not an address this server gave Safaricom. Ignored here, so that a
      // stranger posting to this route cannot even make it ask Safaricom.
      return { kind: 'ignored', eventId: checkoutId, reason: 'callback address was not made by this platform', raw: payload };
    }

    const result = asCode(callback.ResultCode);
    const providerReference = boundReference(this.config.passkey, checkoutId, order);
    if (result === '0') {
      return {
        kind: 'payment.succeeded',
        eventId: checkoutId,
        providerReference,
        orderId: order,
        // Untrusted, and unused: the order's own total is what is recorded.
        amount: { amountMinor: 0n, currency: this.config.currency },
        raw: payload,
      };
    }
    if (/^\d{1,6}$/u.test(result)) {
      return { kind: 'payment.failed', eventId: checkoutId, providerReference, orderId: order, reason: `mpesa_${result}`, raw: payload };
    }
    return { kind: 'ignored', eventId: checkoutId, reason: 'M-Pesa callback carries no result code', raw: payload };
  }

  async fetchPaymentStatus(providerReference: string): Promise<ProviderPaymentStatus> {
    if (!this.config) {
      return { state: 'unknown', providerReference, reason: 'M-Pesa is not configured' };
    }
    const cfg = this.config;
    // Anything else is whatever a stranger posted, and is not sent to Safaricom.
    const read = readReference(cfg.passkey, providerReference);
    if (!read) return { state: 'unknown', providerReference, reason: 'not an M-Pesa reference this platform made' };
    // What is recorded is Safaricom's own id, without the order and code this server put beside it.
    const reference = read.checkoutId;

    let res: Response;
    try {
      const timestamp = mpesaTimestamp();
      res = await fetch(`${cfg.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await this.token()}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          BusinessShortCode: cfg.shortCode,
          Password: mpesaPassword(cfg.shortCode, cfg.passkey, timestamp),
          Timestamp: timestamp,
          CheckoutRequestID: reference,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      // Unreachable is not failed.
      return { state: 'unknown', providerReference: reference, reason: `could not reach M-Pesa: ${e instanceof Error ? e.name : 'error'}` };
    }

    const body = (await readJson(res)) as {
      ResponseCode?: unknown;
      ResultCode?: unknown;
      CheckoutRequestID?: unknown;
    } | null;

    // The payer has not answered yet. Safaricom says so with an error.
    if (errorCodeOf(body) === STILL_PROCESSING) return { state: 'pending', providerReference: reference };

    if (!res.ok || asCode(body?.ResponseCode) !== '0') {
      return { state: 'unknown', providerReference: reference, reason: `M-Pesa status query returned ${res.status}: ${errorCodeOf(body) ?? 'no code'}` };
    }
    // An answer about another prompt is not an answer about this one.
    if (body?.CheckoutRequestID !== undefined && body.CheckoutRequestID !== reference) {
      return { state: 'unknown', providerReference: reference, reason: 'M-Pesa status query answered about another prompt' };
    }

    const result = asCode(body?.ResultCode);
    if (result === '0') {
      return {
        state: 'succeeded',
        providerReference: reference,
        // Safaricom's answer carries no amount. See the header.
        amount: null,
        // The receipt number is only in the callback, which is unsigned.
        financialTransactionId: null,
        // The order this server bound to the prompt when a callback arrived
        // at an address it had made for that order; null for a bare id, which
        // settles nothing.
        orderId: read.order,
      };
    }
    if (FAILED_FOR_GOOD.has(result)) {
      return { state: 'failed', providerReference: reference, reason: `mpesa_${result}`, orderId: read.order };
    }
    if (UNDER_WAY.has(result)) return { state: 'pending', providerReference: reference };
    return { state: 'unknown', providerReference: reference, reason: `unrecognised M-Pesa result code '${result.slice(0, 12)}'` };
  }

  /**
   * Not built. Safaricom's reversal needs an operator's own credential,
   * encrypted with Safaricom's certificate, and answers through a callback of
   * its own. Saying so is better than recording a refund that never left.
   */
  async requestRefund(_args: {
    providerReference: string;
    amount: Money;
    reason: string;
  }): Promise<{ providerRefundReference: string }> {
    throw new Error(
      'M-Pesa refunds are not built into this platform. Reverse the payment in the M-Pesa organisation portal and record it by hand.',
    );
  }
}
