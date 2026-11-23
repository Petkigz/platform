/**
 * A payer's statement, as the screen reads it.
 *
 * `my_statement()` returns JSON, and JSON crossing a network boundary is
 * `unknown` until something checks it. The rest of this codebase treats that
 * shape as the contract and normalises at the edge (`normaliseReport`,
 * `normaliseRateRow`, `normaliseSettlement`), so this file does the same thing
 * for the one payload a customer reads as money.
 *
 * It is deliberately structural and not semantic: an unknown `kind` passes
 * through, because the function may learn a new one and a screen that threw
 * away an event it did not recognise would silently understate what a family
 * paid. What it will not pass through is an amount that is not a whole number
 * of minor units — D4 says money is integer minor units, and a float arriving
 * here means something upstream already broke it. Rendering `NaN` in a
 * statement would be worse than refusing to render at all.
 */

export type Movement = {
  kind: string;
  occurredAt: string;
  orderId: string | null;
  orderNumber: string | null;
  amountMinor: string;
  direction: 'out' | 'in';
  description: string | null;
  runningMinor: string;
};

export type WaitingItem = {
  kind: string;
  occurredAt: string;
  orderId: string | null;
  orderNumber: string | null;
  amountMinor: string;
  status: string | null;
  reason: string | null;
  says: string | null;
};

export type CurrencySection = {
  currencyCode: string;
  chargedMinor: string;
  refundedMinor: string;
  netMinor: string;
  moved: Movement[];
  notYetMoney: WaitingItem[];
};

export type StatementAccount = {
  billingAccountId: string;
  displayName: string;
  billingCountry: string | null;
  billingCurrency: string;
  currencies: CurrencySection[];
};

export type Statement = {
  generatedAt: string;
  accounts: StatementAccount[];
};

export class StatementError extends Error {}

const MINOR = /^\d+$/;
const CURRENCY = /^[A-Z]{3}$/;

function minor(value: unknown, where: string): string {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !MINOR.test(text)) {
    throw new StatementError(`${where} is not a whole number of minor units`);
  }
  return text;
}

function currency(value: unknown, where: string): string {
  if (typeof value !== 'string' || !CURRENCY.test(value)) {
    throw new StatementError(`${where} is not a currency code`);
  }
  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseMovement(raw: unknown, where: string): Movement {
  const row = (raw ?? {}) as Record<string, unknown>;
  const direction = row.direction === 'in' ? 'in' : 'out';
  return {
    kind: typeof row.kind === 'string' ? row.kind : 'unknown',
    occurredAt: typeof row.occurredAt === 'string' ? row.occurredAt : '',
    orderId: optionalString(row.orderId),
    orderNumber: optionalString(row.orderNumber),
    amountMinor: minor(row.amountMinor, `${where} amount`),
    direction,
    description: optionalString(row.description),
    runningMinor: minor(row.runningMinor, `${where} running total`),
  };
}

function parseWaiting(raw: unknown, where: string): WaitingItem {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    kind: typeof row.kind === 'string' ? row.kind : 'unknown',
    occurredAt: typeof row.occurredAt === 'string' ? row.occurredAt : '',
    orderId: optionalString(row.orderId),
    orderNumber: optionalString(row.orderNumber),
    amountMinor: minor(row.amountMinor, `${where} amount`),
    status: optionalString(row.status),
    reason: optionalString(row.reason),
    says: optionalString(row.says),
  };
}

/**
 * Turn the function's payload into something a page can render — or throw.
 *
 * Throwing is the point. An empty statement and a broken one must not look the
 * same: a page that quietly rendered zero for a malformed payload would tell a
 * family they had paid nothing.
 */
export function parseStatement(raw: unknown): Statement {
  if (!raw || typeof raw !== 'object') {
    throw new StatementError('the statement came back empty');
  }
  const payload = raw as Record<string, unknown>;
  if (!Array.isArray(payload.accounts)) {
    throw new StatementError('the statement has no list of accounts');
  }

  const accounts = payload.accounts.map((rawAccount, i) => {
    const a = (rawAccount ?? {}) as Record<string, unknown>;
    const where = `account ${i + 1}`;
    if (typeof a.billingAccountId !== 'string') {
      throw new StatementError(`${where} has no identifier`);
    }
    return {
      billingAccountId: a.billingAccountId,
      displayName: typeof a.displayName === 'string' ? a.displayName : 'Account',
      billingCountry: optionalString(a.billingCountry),
      billingCurrency: currency(a.billingCurrency, `${where} billing currency`),
      currencies: list(a.currencies).map((rawSection, j) => {
        const c = (rawSection ?? {}) as Record<string, unknown>;
        const at = `${where}, currency ${j + 1}`;
        return {
          currencyCode: currency(c.currencyCode, `${at} code`),
          chargedMinor: minor(c.chargedMinor, `${at} charged`),
          refundedMinor: minor(c.refundedMinor, `${at} refunded`),
          netMinor: minor(c.netMinor, `${at} net`),
          moved: list(c.moved).map((m, k) => parseMovement(m, `${at} movement ${k + 1}`)),
          notYetMoney: list(c.notYetMoney).map((w, k) => parseWaiting(w, `${at} waiting ${k + 1}`)),
        } satisfies CurrencySection;
      }),
    } satisfies StatementAccount;
  });

  return {
    generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : '',
    accounts,
  };
}

/** True when an account has neither money moved nor anything waiting. */
export function isQuiet(account: StatementAccount): boolean {
  return account.currencies.length === 0;
}

/**
 * How many things are waiting on an account, across currencies.
 *
 * A count is safe across currencies where a total is not: the number of
 * pending refunds is a count of events, not an amount of money.
 */
export function waitingCount(account: StatementAccount): number {
  return account.currencies.reduce((sum, c) => sum + c.notYetMoney.length, 0);
}

/**
 * What a thing that has not moved money has reached, as a name the page has a
 * sentence for.
 *
 * `my_statement()` sends a sentence with each waiting row (`says`), and it
 * sends it in English. The page was printing it, which put a line of English
 * in the middle of an Arabic statement. The page now says its own sentence,
 * chosen by the row's kind and state, and `says` is not shown at all.
 *
 * Every state the function can send has a name here; a test reads the
 * migration and fails when one is added without. Three states of a bank's
 * case (`open`, `under_review`, `evidence_submitted`) are one name: to the
 * payer they are the same fact, that the bank has not decided and nothing has
 * moved.
 */
export const WAITING_STATES = {
  refund_request: {
    requested: 'rqRequested',
    approved: 'rqApproved',
    rejected: 'rqRejected',
    withdrawn: 'rqWithdrawn',
  },
  refund: {
    pending: 'rfPending',
    failed: 'rfFailed',
  },
  dispute: {
    open: 'dpOpen',
    under_review: 'dpOpen',
    evidence_submitted: 'dpOpen',
    won: 'dpWon',
    lost: 'dpLost',
    withdrawn: 'dpWithdrawn',
  },
} as const;

export type WaitingKind = keyof typeof WAITING_STATES;

export type WaitingState =
  | 'rqRequested' | 'rqApproved' | 'rqRejected' | 'rqWithdrawn'
  | 'rfPending' | 'rfFailed'
  | 'dpOpen' | 'dpWon' | 'dpLost' | 'dpWithdrawn';

/** The kind of a waiting row, when it is one this page has a word for. */
export function waitingKindOf(kind: string): WaitingKind | null {
  return Object.hasOwn(WAITING_STATES, kind) ? (kind as WaitingKind) : null;
}

/**
 * The name of what a waiting row has reached, or nothing.
 *
 * Nothing is an answer: a kind or a state added to the database later is
 * drawn with its amount under "not counted yet" and no sentence, rather than
 * with a sentence that belongs to something else.
 */
export function waitingStateOf(kind: string, status: string | null): WaitingState | null {
  const known = waitingKindOf(kind);
  if (!known || !status) return null;
  const states: Record<string, WaitingState> = WAITING_STATES[known];
  return Object.hasOwn(states, status) ? (states[status] ?? null) : null;
}

/**
 * Whether a movement is a payment, a refund, or something this page has no
 * word for. The direction is still known for the third, so it is still
 * counted and still drawn.
 */
export function movementKindOf(kind: string): 'charge' | 'refund' | null {
  return kind === 'charge' || kind === 'refund' ? kind : null;
}

/**
 * The title a movement was sold under, when the database had one.
 *
 * With no title the function writes `Order <number>` in English. That is not
 * a title, and the number is printed beside the line anyway, so it is nothing
 * here and the page says "payment" or "refund" alone.
 */
export function movementTitleOf(row: Pick<Movement, 'description' | 'orderNumber'>): string | null {
  const text = row.description?.trim();
  if (!text) return null;
  if (text === 'Order' || text === `Order ${row.orderNumber ?? ''}`.trim()) return null;
  return text;
}
