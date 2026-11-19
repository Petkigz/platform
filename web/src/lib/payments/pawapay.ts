/**
 * pawaPay — mobile-money collections in many countries through one account.
 *
 * The owner asked for M-Pesa, Orange Money and "a lot of mobile money services
 * in a lot of countries", and chose one aggregator over a contract with each
 * operator (2026-11-18), keeping MTN and Airtel direct where an account of
 * their own exists. pawaPay is that aggregator: see `DECISIONS.md`.
 *
 * **Written from pawaPay's published documentation and run against nothing.**
 * This platform has no pawaPay account, sandbox or live. Every request below
 * is the shape https://docs.pawapay.io/v2 describes (read 2026-11-19); none
 * has been sent to pawaPay. The first thing to do with a sandbox token is to
 * find out where this file is wrong.
 *
 * The flow (API v2):
 *
 *   1. `POST /v2/deposits` with `Authorization: Bearer <token>`: a deposit id
 *      this platform makes (a UUIDv4), the operator's code, the payer's
 *      number with its country code and no plus, the amount as a decimal
 *      string, and the currency. The answer is `ACCEPTED`, `REJECTED` or
 *      `DUPLICATE_IGNORED`, with HTTP 200 for all three.
 *   2. The payer approves with their PIN on their own handset. (In the
 *      sandbox there is no prompt: the test number decides the outcome.)
 *   3. `GET /v2/deposits/{depositId}` is the authoritative status:
 *      `COMPLETED` and `FAILED` are final; `ACCEPTED`, `PROCESSING` and
 *      `IN_RECONCILIATION` are not.
 *
 * **A provider here is an operator in a country**, as everywhere in this
 * directory (`markets.ts`): `pawapay_mpesa_ke` is M-Pesa in Kenya and collects
 * shillings from Kenyan numbers. The payer never sees the word pawaPay.
 *
 * **One callback address for all of them.** pawaPay sends every deposit's
 * final status to the one address set in its dashboard, so that address is
 * `/api/payments/webhook/pawapay`, and the provider with that id exists only
 * to answer it: it is never offered at checkout and cannot start a payment.
 * What it settles is recorded in the ledger under `pawapay`; which operator a
 * payer chose is on the payment attempt.
 *
 * **THE CALLBACK IS NOT PROOF, HERE EITHER.** pawaPay can sign its callbacks,
 * and its own documentation says what a valid signature is worth: "that
 * pawaPay sent this callback, not that it is about your payment. Before
 * releasing goods or money, confirm the status with your own API token." So
 * this adapter does only that. `verifyWebhookSignature` is false whatever
 * arrives, the notification is used to find the deposit, and the outcome,
 * the amount and the order all come from the status query. Checking the
 * signature as well would be a second lock; it is not built.
 *
 * **Which order a payment was for** is written into the deposit twice, as
 * `clientReferenceId` and as metadata, and both come back in the status
 * answer. A payment settles an order only when that answer names it and the
 * amount is the order's total (`binding.ts`).
 *
 * **Not built, and said here so nobody assumes it:**
 *
 *   - signing this platform's own requests (pawaPay's "only accept signed
 *     requests" setting must stay off, or every request is refused);
 *   - operators that send the payer to a page of their own or ask for a code
 *     first (Wave; Orange in Burkina Faso);
 *   - asking pawaPay which operators are enabled or which are having an
 *     outage: the account's operators are listed by hand in
 *     `PAWAPAY_PROVIDERS`, and an outage is met as a refused payment;
 *   - anything that notices a refund's outcome. `requestRefund` starts one
 *     and nothing listens for how it ended.
 */

import { randomUUID } from 'node:crypto';
import { fromMajor, minorUnitDivisor, toMajorString, type Money } from '../money.ts';
import {
  type CheckoutRequest,
  type CheckoutResult,
  type PaymentProvider,
  type ProviderPaymentStatus,
  type WebhookEvent,
  PaymentProviderUnavailableError,
} from './provider.ts';
import { readJson } from './oauth.ts';
import { PAWAPAY_BRANDS, internationalDigits, isNumberOf, type Market, type PawaPayOperator } from './markets.ts';

/** The id of the provider that answers pawaPay's one callback address. */
export const PAWAPAY_CALLBACK_ID = 'pawapay';

const SANDBOX = 'https://api.sandbox.pawapay.io';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
/** What pawaPay accepts as the note a payer may see: 4 to 22 letters, digits and spaces. */
const MESSAGE = /^[a-zA-Z0-9 ]{4,22}$/u;
const DEFAULT_MESSAGE = 'AyahSpring course';
/** How long one request to pawaPay may take before it counts as unanswered. */
const TIMEOUT_MS = 15_000;

export type PawaPayConfig = {
  baseUrl: string;
  token: string;
  /** The operator and country this provider collects through, or null for the callback's provider. */
  operator: (PawaPayOperator & { country: string; label: string }) | null;
  customerMessage: string;
};

/** The operator codes the account may use, as `PAWAPAY_PROVIDERS` lists them. */
export function pawaPayEnabledCodes(): Set<string> {
  return new Set(
    (process.env.PAWAPAY_PROVIDERS ?? '')
      .split(/[\s,]+/u)
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean),
  );
}

/**
 * pawaPay's account, from the environment, for one operator in one country
 * or (with neither) for the callback's provider. Null when there is no token.
 *
 * **One token, and a list.** `PAWAPAY_API_TOKEN` is the account. Which
 * operators that account may collect through is decided by pawaPay and
 * differs from account to account, so it is said here, in
 * `PAWAPAY_PROVIDERS`, with pawaPay's own codes: `MPESA_KEN, MTN_MOMO_UGA`.
 * An operator that is not in that list has no provider, whatever
 * `PAWAPAY_BRANDS` knows about it: a button for an operator the account
 * cannot use is a payment that fails after the number is typed.
 *
 * **The test host unless told otherwise.** `PAWAPAY_BASE_URL` defaults to
 * the sandbox; production is `https://api.pawapay.io`. A sandbox token and a
 * live one are different tokens, so the wrong pairing fails loudly.
 */
export function pawaPayConfigFromEnv(brand?: string, country?: string): PawaPayConfig | null {
  const token = process.env.PAWAPAY_API_TOKEN?.trim();
  if (!token) return null;
  const typed = process.env.PAWAPAY_CUSTOMER_MESSAGE?.trim() ?? '';
  const base = {
    baseUrl: (process.env.PAWAPAY_BASE_URL?.trim() || SANDBOX).replace(/\/+$/u, ''),
    token,
    customerMessage: MESSAGE.test(typed) ? typed : DEFAULT_MESSAGE,
  };
  if (brand === undefined && country === undefined) return { ...base, operator: null };

  const known = brand ? PAWAPAY_BRANDS[brand] : undefined;
  const where = country?.toUpperCase();
  const operator = known && where ? known.countries[where] : undefined;
  if (!known || !where || !operator) return null;
  if (!pawaPayEnabledCodes().has(operator.code)) return null;
  return { ...base, operator: { ...operator, country: where, label: operator.label ?? known.label } };
}

/**
 * An amount as pawaPay takes it: major units, no trailing zero in the
 * fraction and no bare point (`15`, `15.5`, `0.05`; never `15.50`).
 *
 * Done on the string `money.ts` makes in whole numbers. Zero and less are
 * refused: nobody is prompted for nothing.
 */
export function pawaPayAmount(amount: Money): string {
  if (amount.amountMinor <= 0n) throw new Error('pawaPay cannot collect an amount that is not more than zero.');
  const major = toMajorString(amount);
  return major.includes('.') ? major.replace(/0+$/u, '').replace(/\.$/u, '') : major;
}

/** Whether an amount is a whole number of the currency's major unit. */
function isWhole(amount: Money): boolean {
  return amount.amountMinor % BigInt(minorUnitDivisor(amount.currency)) === 0n;
}

/**
 * An amount as pawaPay writes it back, exactly, or null.
 *
 * pawaPay answers `100.00` for a currency that has no cents, so zeros past
 * the currency's own places are dropped; anything else past them is an
 * amount this platform cannot hold, and is not rounded into one.
 */
export function parsePawaPayAmount(amount: unknown, currency: unknown): Money | null {
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/u.test(currency)) return null;
  if (typeof amount !== 'string' && typeof amount !== 'number') return null;
  const written = String(amount).trim();
  const parts = /^(\d{1,18})(?:\.(\d{1,6}))?$/u.exec(written);
  if (!parts) return null;
  try {
    const places = String(minorUnitDivisor(currency)).length - 1;
    const fraction = parts[2] ?? '';
    if (!/^0*$/u.test(fraction.slice(places))) return null;
    const kept = fraction.slice(0, places);
    return fromMajor(kept ? `${parts[1]}.${kept}` : parts[1]!, currency);
  } catch {
    return null;
  }
}

type Failure = { failureCode?: unknown; rejectionCode?: unknown };
type Answer = {
  status?: unknown;
  depositId?: unknown;
  refundId?: unknown;
  failureReason?: Failure | null;
  rejectionReason?: Failure | null;
};
type Deposit = {
  depositId?: unknown;
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
  clientReferenceId?: unknown;
  providerTransactionId?: unknown;
  failureReason?: Failure | null;
  metadata?: unknown;
};

/**
 * pawaPay's code for why, and nothing else of its answer. Its sentence beside
 * the code quotes the payer's phone number, and this ends up in a log.
 */
function codeOf(body: Answer | Deposit | null, fallback: string): string {
  const reason = (body as Answer | null)?.failureReason ?? (body as Answer | null)?.rejectionReason;
  const code = reason?.failureCode ?? reason?.rejectionCode;
  return typeof code === 'string' && /^[A-Z0-9_]{2,60}$/u.test(code) ? code : fallback;
}

/** The order a deposit was started for, as pawaPay's own record says it, or null. */
function orderOf(deposit: Deposit): string | null {
  const reference = typeof deposit.clientReferenceId === 'string' ? deposit.clientReferenceId.trim() : '';
  const meta = deposit.metadata;
  // Sent as a list of one-key objects; written back as one object.
  const fromMeta =
    meta && typeof meta === 'object' && !Array.isArray(meta) && typeof (meta as { orderId?: unknown }).orderId === 'string'
      ? ((meta as { orderId: string }).orderId).trim()
      : '';
  // Written twice by this file with the same value. Two different values is a
  // record nobody here made, and it names no order.
  if (reference && fromMeta && reference.toLowerCase() !== fromMeta.toLowerCase()) return null;
  const order = reference || fromMeta;
  return UUID.test(order) ? order.toLowerCase() : null;
}

export class PawaPayProvider implements PaymentProvider {
  readonly id: string;
  readonly label: string;
  readonly webhookTrust = 'requery' as const;
  readonly requiresMsisdn = true;
  readonly available: boolean;
  readonly market: Market | null;

  // A field, not a parameter property: see `airtel.ts`.
  private readonly config: PawaPayConfig | null;

  constructor(config: PawaPayConfig | null, id: string = PAWAPAY_CALLBACK_ID) {
    this.config = config;
    this.id = id;
    const operator = config?.operator ?? null;
    // Only an operator in a country can be paid through. The callback's
    // provider has neither and is never offered.
    this.available = operator !== null;
    this.label = operator?.label ?? 'pawaPay';
    this.market = operator ? { country: operator.country, currency: operator.currency } : null;
  }

  private get cfg(): PawaPayConfig {
    if (!this.config) throw new PaymentProviderUnavailableError(this.id);
    return this.config;
  }

  /**
   * Whether this operator can be asked for this amount at all: its currency,
   * more than nothing, and no fraction where the operator takes none.
   *
   * M-Pesa in Kenya collects whole shillings. An order of 1,250.50 cannot be
   * paid through it, and is not rounded to make it fit: the amount collected
   * has to be the order's total, exactly.
   */
  accepts(amount: Money): boolean {
    const operator = this.config?.operator;
    if (!operator) return false;
    if (amount.currency !== operator.currency || amount.amountMinor <= 0n) return false;
    return operator.decimals || isWhole(amount);
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.cfg.token}`, 'Content-Type': 'application/json', Accept: 'application/json' };
  }

  /** One deposit as pawaPay holds it, or why it could not be read. */
  private async deposit(depositId: string): Promise<{ found: Deposit } | { missing: true } | { unread: string }> {
    const cfg = this.cfg;
    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl}/v2/deposits/${encodeURIComponent(depositId)}`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      return { unread: `could not reach pawaPay: ${e instanceof Error ? e.name : 'error'}` };
    }
    const body = (await readJson(res)) as { status?: unknown; data?: Deposit | null } | null;
    if (!res.ok) return { unread: `pawaPay status query returned ${res.status}: ${codeOf(body as Answer | null, 'no code')}` };
    if (body?.status === 'NOT_FOUND') return { missing: true };
    const data = body?.data;
    if (body?.status !== 'FOUND' || !data || typeof data !== 'object') {
      return { unread: 'pawaPay status query answered in a shape this adapter does not know' };
    }
    // An answer about another deposit is not an answer about this one.
    if (typeof data.depositId !== 'string' || data.depositId.toLowerCase() !== depositId.toLowerCase()) {
      return { unread: 'pawaPay status query answered about another deposit' };
    }
    return { found: data };
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const cfg = this.cfg;
    const operator = cfg.operator;
    if (!operator) throw new PaymentProviderUnavailableError(this.id);

    if (!request.msisdn) {
      throw new Error(`${this.label} needs the payer's mobile money number.`);
    }
    if (!UUID.test(request.orderId)) {
      throw new Error('pawaPay needs an order id that is a UUID.');
    }
    if (request.amount.currency !== operator.currency) {
      throw new Error(
        `${this.label} in ${operator.country} collects ${operator.currency} and this order is in ${request.amount.currency}.`,
      );
    }
    if (!this.accepts(request.amount)) {
      throw new Error(`${this.label} in ${operator.country} takes whole amounts only, and this order's total is not one.`);
    }
    // The operator prompts handsets on its own network in its own country.
    if (!isNumberOf(request.msisdn, operator.country)) {
      throw new Error(`${this.label} in ${operator.country} cannot prompt a number from another country.`);
    }

    // Made here and kept as the attempt's reference. If no answer comes back,
    // this is still the id the payment can be asked about.
    const depositId = randomUUID();
    const body = JSON.stringify({
      depositId,
      payer: {
        type: 'MMO',
        accountDetails: { phoneNumber: internationalDigits(request.msisdn), provider: operator.code },
      },
      amount: pawaPayAmount(request.amount),
      currency: operator.currency,
      // The order, twice: both come back in the status answer, and the
      // metadata comes back in the notification as well. Nothing personal is
      // put in either.
      clientReferenceId: request.orderId,
      customerMessage: cfg.customerMessage,
      metadata: [{ orderId: request.orderId }],
    });

    const refused = (code: string): Error => {
      // The code and no more: enough for whoever runs the site to act on.
      console.error(`pawaPay (${this.id}): the deposit for order ${request.orderId} was not accepted: ${code}`);
      return new Error(`${this.label} could not start this payment: ${code}`);
    };

    let res: Response | null = null;
    try {
      res = await fetch(`${cfg.baseUrl}/v2/deposits`, {
        method: 'POST',
        headers: this.headers(),
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      res = null;
    }

    // No answer, or pawaPay's own "unknown error": the deposit may have been
    // accepted all the same, and the payer may be looking at a prompt. Saying
    // "try again" now could collect twice, so pawaPay is asked once whether
    // it holds this id. Its documentation says to do exactly this.
    if (!res || res.status >= 500) {
      const held = await this.deposit(depositId);
      if ('found' in held && held.found.status !== 'FAILED') {
        return { kind: 'pending', providerReference: depositId };
      }
      throw refused('found' in held ? codeOf(held.found, 'FAILED') : 'missing' in held ? 'NOT_RECEIVED' : 'NO_ANSWER');
    }

    const answer = (await readJson(res)) as Answer | null;
    if (!res.ok) throw refused(codeOf(answer, `HTTP_${res.status}`));

    const status = typeof answer?.status === 'string' ? answer.status : '';
    // A duplicate is this same id, already accepted: the payment is under way.
    if (status === 'ACCEPTED' || status === 'DUPLICATE_IGNORED') {
      return { kind: 'pending', providerReference: depositId };
    }
    throw refused(codeOf(answer, status === 'REJECTED' ? 'REJECTED' : 'UNREADABLE_ANSWER'));
  }

  /**
   * Always false. pawaPay may sign what it sends, and a valid signature would
   * still not say the payment is this order's; the status query does.
   */
  verifyWebhookSignature(_payload: string, _signature: string | null): boolean {
    return false;
  }

  parseWebhookEvent(payload: unknown): WebhookEvent {
    const p = (payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}) as Deposit & {
      refundId?: unknown;
      payoutId?: unknown;
    };
    const depositId = typeof p.depositId === 'string' && UUID.test(p.depositId) ? p.depositId.toLowerCase() : '';

    if (!depositId) {
      // A refund's or a payout's final status, sent to this address by
      // mistake, or something else entirely. Nothing here acts on it.
      const other = typeof p.refundId === 'string' ? 'a refund' : typeof p.payoutId === 'string' ? 'a payout' : null;
      return {
        kind: 'ignored',
        eventId: 'unknown',
        reason: other ? `notification is about ${other}, not a deposit` : 'notification carries no deposit id',
        raw: payload,
      };
    }

    const status = typeof p.status === 'string' ? p.status.toUpperCase() : '';
    // What the notification says the order is. A claim: `webhook.ts` believes
    // the status answer, and uses it alone when this is empty.
    const orderId = orderOf(p) ?? '';

    if (status === 'COMPLETED') {
      return {
        kind: 'payment.succeeded',
        eventId: depositId,
        providerReference: depositId,
        orderId,
        // Untrusted. The recorded amount comes from fetchPaymentStatus.
        amount: parsePawaPayAmount(p.amount, p.currency) ?? { amountMinor: 0n, currency: 'XXX' },
        raw: payload,
      };
    }
    if (status === 'FAILED') {
      return {
        kind: 'payment.failed',
        eventId: depositId,
        providerReference: depositId,
        orderId,
        reason: codeOf(p, 'FAILED'),
        raw: payload,
      };
    }
    return {
      kind: 'ignored',
      eventId: depositId,
      reason: `pawaPay status '${status.slice(0, 40)}' is not an outcome`,
      raw: payload,
    };
  }

  async fetchPaymentStatus(providerReference: string): Promise<ProviderPaymentStatus> {
    // The callback's provider has to answer this with only a token; with no
    // token at all nothing can be asked, which is "unknown", never "failed".
    if (!this.config) {
      return { state: 'unknown', providerReference, reason: 'pawaPay is not configured' };
    }
    // Anything else is whatever a stranger posted, and is not put in an address.
    if (!UUID.test(providerReference)) {
      return { state: 'unknown', providerReference, reason: 'not a pawaPay deposit id' };
    }

    const held = await this.deposit(providerReference);
    if ('unread' in held) return { state: 'unknown', providerReference, reason: held.unread };
    // An id pawaPay has never seen settles nothing and closes nothing.
    if ('missing' in held) return { state: 'unknown', providerReference, reason: 'pawaPay holds no deposit with this id' };

    const deposit = held.found;
    const status = typeof deposit.status === 'string' ? deposit.status.toUpperCase() : '';
    const orderId = orderOf(deposit);

    if (status === 'COMPLETED') {
      // pawaPay always says how much. A success whose amount cannot be read
      // exactly is not recorded at the order's total on trust.
      const amount = parsePawaPayAmount(deposit.amount, deposit.currency);
      if (!amount || amount.amountMinor <= 0n) {
        return { state: 'unknown', providerReference, reason: 'pawaPay reports a completed deposit with an amount that cannot be read' };
      }
      return {
        state: 'succeeded',
        providerReference,
        amount,
        financialTransactionId:
          typeof deposit.providerTransactionId === 'string' ? deposit.providerTransactionId.slice(0, 120) : null,
        orderId,
      };
    }
    if (status === 'FAILED') {
      return { state: 'failed', providerReference, reason: codeOf(deposit, 'FAILED'), orderId };
    }
    if (status === 'ACCEPTED' || status === 'PROCESSING' || status === 'IN_RECONCILIATION') {
      return { state: 'pending', providerReference };
    }
    return { state: 'unknown', providerReference, reason: `unrecognised pawaPay status '${status.slice(0, 40)}'` };
  }

  /**
   * Start a refund of a completed deposit, back to the wallet that paid.
   *
   * The money comes out of this platform's balance at pawaPay. A refund that
   * was started is not a refund that arrived (D4): pawaPay answers whether
   * it took the request, and nothing in this platform yet hears how it ended.
   */
  async requestRefund(args: {
    providerReference: string;
    amount: Money;
    reason: string;
  }): Promise<{ providerRefundReference: string }> {
    const cfg = this.cfg;
    if (!UUID.test(args.providerReference)) {
      throw new Error('pawaPay refunds a deposit by its id, and this is not one.');
    }
    const refundId = randomUUID();

    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl}/v2/refunds`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          refundId,
          depositId: args.providerReference.toLowerCase(),
          amount: pawaPayAmount(args.amount),
          currency: args.amount.currency,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // Said with the id, so that whoever reads this can ask pawaPay about
      // it. A refund recorded as failed that in fact went out is paid twice.
      throw new Error(
        `pawaPay did not answer the refund request ${refundId}. Whether it was taken is not known: check it at pawaPay before trying again.`,
      );
    }
    const answer = (await readJson(res)) as Answer | null;
    if (res.status >= 500) {
      throw new Error(
        `pawaPay answered the refund request ${refundId} with ${res.status}. Whether it was taken is not known: check it at pawaPay before trying again.`,
      );
    }
    if (!res.ok || answer?.status !== 'ACCEPTED') {
      throw new Error(`pawaPay did not take this refund: ${codeOf(answer, res.ok ? 'REJECTED' : `HTTP_${res.status}`)}`);
    }
    return { providerRefundReference: refundId };
  }
}
