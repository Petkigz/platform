/**
 * Money, per D4.
 *
 * D4 is frozen: the original amount and currency are authoritative, amounts
 * are **integer minor units**, and there are no floating-point amounts
 * anywhere in the system. This module is that rule in TypeScript.
 *
 * Why it exists as its own file rather than inline arithmetic: the moment
 * someone writes `price * 1.13` in a component, D4 is broken and nothing will
 * say so. `bigint` makes the mistake a type error instead.
 *
 * The database stores `amount_minor bigint` and `currency_code char(3)`. JSON
 * cannot carry a bigint, so the wire representation is a string — that is what
 * PostgREST gives us and what we send back.
 */

export type Currency = string; // ISO 4217, validated below

export type Money = {
  /** Whole minor units: cents, or the smallest unit the currency has. */
  amountMinor: bigint;
  currency: Currency;
};

const CURRENCY_RE = /^[A-Z]{3}$/;

/**
 * Currencies with no minor unit at all (ISO 4217 exponent 0). Charging 100
 * "cents" of Japanese yen would be a hundred times the intended amount.
 *
 * These two lists are duplicated in the database, in
 * `public.currency_minor_divisor()` (`20261223000100_currency_reporting.sql`),
 * because converting an amount into the reporting currency has to know the same
 * fact server-side and a browser cannot call a function for it. Both copies are
 * pinned against the same codes — here in `money.test.ts` and there in
 * `supabase/tests/currency_reporting.test.mjs`. Change one and a test fails.
 */
const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF',
  'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/**
 * Currencies with three decimal places (ISO 4217 exponent 3), all of them
 * dinars. Treating one as two-decimal is a ten-times error, which is why they
 * get a list of their own rather than falling through to the common case.
 */
const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

export class MoneyError extends Error {}

export function isCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && CURRENCY_RE.test(v);
}

/** How many minor units make one major unit in this currency. */
export function minorUnitDivisor(currency: Currency): number {
  if (!isCurrency(currency)) {
    throw new MoneyError(`'${String(currency)}' is not an ISO 4217 code`);
  }
  if (ZERO_DECIMAL.has(currency)) return 1;
  if (THREE_DECIMAL.has(currency)) return 1000;
  return 100;
}

/**
 * Parse a minor-unit amount arriving from the database.
 *
 * Accepts a string or a number, because PostgREST renders bigint as a string
 * but a hand-built fixture may not. Rejects anything with a fractional part —
 * a float arriving here means something upstream already broke D4, and
 * silently truncating it would hide that.
 */
export function fromMinor(value: string | number, currency: Currency): Money {
  if (!isCurrency(currency)) {
    throw new MoneyError(`'${String(currency)}' is not an ISO 4217 code`);
  }
  const s = String(value).trim();
  if (!/^-?\d+$/.test(s)) {
    throw new MoneyError(
      `amount ${JSON.stringify(value)} is not a whole number of minor units. ` +
        'D4 requires integer minor units; a float here means something upstream ' +
        'already broke it.',
    );
  }
  return { amountMinor: BigInt(s), currency };
}

/** Parse a major-unit amount typed by a human, e.g. "12.50" USD. */
export function fromMajor(value: string, currency: Currency): Money {
  const divisor = minorUnitDivisor(currency);
  const s = value.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new MoneyError(`'${value}' is not a valid amount`);
  }
  const [whole, frac = ''] = s.split('.');
  const digits = divisor === 1 ? 0 : String(divisor).length - 1;
  if (frac.length > digits) {
    throw new MoneyError(
      `'${value}' has more precision than ${currency} supports (${digits} decimal places)`,
    );
  }
  const padded = frac.padEnd(digits, '0');
  return { amountMinor: BigInt(whole + padded), currency };
}

/** The wire form: a string, because JSON has no bigint. */
export function toWire(m: Money): { amount_minor: string; currency_code: Currency } {
  return { amount_minor: m.amountMinor.toString(), currency_code: m.currency };
}

export function fromWire(row: {
  amount_minor: string | number;
  currency_code: string;
}): Money {
  return fromMinor(row.amount_minor, row.currency_code);
}

/**
 * Display. Deliberately not a currency formatter with locale negotiation —
 * the amount and the currency are authoritative, and a formatter that infers
 * the currency from the viewer's locale would quietly contradict D4.
 */
export function format(m: Money): string {
  const divisor = BigInt(minorUnitDivisor(m.currency));
  const negative = m.amountMinor < 0n;
  const abs = negative ? -m.amountMinor : m.amountMinor;
  const whole = abs / divisor;
  const frac = abs % divisor;
  const digits = divisor === 1n ? 0 : String(divisor).length - 1;
  const fracPart = digits > 0 ? `.${frac.toString().padStart(digits, '0')}` : '';
  return `${negative ? '-' : ''}${m.currency} ${whole}${fracPart}`;
}

/**
 * The amount as a plain decimal string, for providers whose API wants major
 * units ("100.50") rather than minor units.
 *
 * Done in BigInt, never by dividing into a Number. MTN MoMo and Airtel both
 * take a decimal string, and the obvious implementation — `Number(minor) /
 * 100` — is exactly the float arithmetic D4 exists to prevent. For a
 * zero-decimal currency like UGX this returns the integer as-is, which is the
 * right answer and the one most easily got wrong.
 */
export function toMajorString(m: Money): string {
  const divisor = BigInt(minorUnitDivisor(m.currency));
  if (divisor === 1n) return m.amountMinor.toString();

  const negative = m.amountMinor < 0n;
  const abs = negative ? -m.amountMinor : m.amountMinor;
  const whole = abs / divisor;
  const frac = (abs % divisor).toString().padStart(
    divisor.toString().length - 1,
    '0',
  );
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

export function isZero(m: Money): boolean {
  return m.amountMinor === 0n;
}

export function isNegative(m: Money): boolean {
  return m.amountMinor < 0n;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(
      `cannot combine ${a.currency} with ${b.currency}. Settlement and FX are ` +
        'recorded separately under D4; they are never folded into the amount.',
    );
  }
}
