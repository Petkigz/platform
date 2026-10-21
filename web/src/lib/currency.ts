/**
 * Reporting money in one currency.
 *
 * The platform charges in whatever currency a family has — UGX in Kampala, NGN
 * in Lagos, GBP in Birmingham — and the owner reads a single figure, in USD.
 * D4 stays intact: the original amount and currency are authoritative and are
 * integer minor units. Nothing here converts a stored amount; it converts a
 * *total*, on the way to being read, and it says which recorded rate did it.
 *
 * Three rules this module exists to keep, all of them enforced in
 * `20261223000100_currency_reporting.sql`:
 *
 *   * a rate always has a source, because a rate nobody can attribute is not
 *     auditable and cannot be checked when a total looks wrong;
 *   * a currency pair nobody recorded converts to **nothing**, never to 1. A
 *     made-up figure folds into a total invisibly; an unconverted row is shown
 *     beside it as a gap;
 *   * minor units are per-currency. 5 000 minor units of UGX is 5 000
 *     shillings, and 5 000 minor units of USD is 50 dollars, so applying a
 *     major-unit rate without the divisor on each side is a hundredfold error
 *     that still looks like a number. `minorUnitDivisor()` in `money.ts` is the
 *     browser's copy of that fact and the database has its own, pinned against
 *     each other by tests on both sides.
 *
 * Rates are entered by a person. There is no rate feed in this environment and
 * no credential to call one with, so `source` is a sentence a finance admin can
 * be asked about later — "Bank of Uganda, mid rate" — and not a provider name
 * that pretends to be automatic.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { format, fromMinor } from './money.ts';

/** What the admin screens read from `currency_exchange_rates`. */
export const RATE_COLUMNS =
  'id,base_currency,quote_currency,rate,source,observed_at,created_at';

export const CURRENCY_RE = /^[A-Z]{3}$/;
/** The database refuses a rate above this, and says why. */
export const RATE_MAX = 1_000_000_000;
/** numeric(18,8): at most eight decimal places. */
export const RATE_RE = /^(0|[1-9][0-9]{0,8})(\.[0-9]{1,8})?$/;
export const SOURCE_MAX = 200;
export const OVERRIDE_MAX = 500;
/** The report refuses a wider window. */
export const WINDOW_MAX_DAYS = 366;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type CurrencyFailure = {
  ok: false;
  code: 'invalid' | 'forbidden' | 'rejected';
  message: string;
};

export type CurrencyOutcome<T> = { ok: true; value: T } | CurrencyFailure;

export type RateRow = {
  id: string;
  base: string;
  quote: string;
  rate: string;
  source: string;
  observedAt: string | null;
};

/** What `resolve_exchange_rate()` returns, or the rate part of a conversion. */
export type RateResolution = {
  rateId: string | null;
  base: string;
  quote: string;
  rate: string;
  source: string;
  observedAt: string | null;
  /** True when it is the inverse of a recorded pair, and nobody published it. */
  derived: boolean;
};

export type ConvertedAmount = RateResolution & {
  amountMinor: string;
  currency: string;
};

export type Settlement = {
  id: string;
  status: string;
  settlementAmountMinor: string;
  settlementCurrency: string;
  transactionAmountMinor: string;
  transactionCurrency: string;
  fxRate: string | null;
  fxSource: string | null;
  fxObservedAt: string | null;
  rateId: string | null;
  derived: boolean;
  restated: boolean;
};

export type ReportRow = {
  section: 'transactions';
  transactionType: string;
  direction: 'debit' | 'credit';
  currency: string;
  count: number;
  /** Gross, in the currency it was charged in. */
  amountMinor: string;
  /** The same total in the reporting currency, or null when no rate exists. */
  reportingAmountMinor: string | null;
};

export type EarningsRow = {
  section: 'earnings';
  status: string;
  currency: string;
  count: number;
  grossAmountMinor: string;
  netAmountMinor: string;
  reportingGrossMinor: string | null;
  reportingNetMinor: string | null;
};

export type DirectionTotal = {
  direction: 'debit' | 'credit';
  groups: number;
  count: number;
  reportingAmountMinor: string;
};

export type UnconvertedRow = {
  section: 'transactions' | 'earnings';
  currency: string;
  count: number;
  amountMinor: string;
};

export type RateOutlier = {
  base: string;
  quote: string;
  rate: string;
  previousRate: string;
  factor: number;
  observedAt: string | null;
  source: string;
};

export type MoneyReport = {
  reportingCurrency: string;
  window: { from: string; to: string };
  rows: ReportRow[];
  earnings: EarningsRow[];
  byDirection: DirectionTotal[];
  totals: {
    groups: number;
    transactions: number;
    unconvertedGroups: number;
    missingRates: string[];
  };
  unconverted: UnconvertedRow[];
  ratesUsed: ConvertedAmount[];
  outliers: RateOutlier[];
  note: string;
};

export type ReportWindow = { from: string; to: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export function normaliseCurrencyCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return CURRENCY_RE.test(code) ? code : null;
}

/**
 * A rate is not an amount, so it is a number rather than a bigint — but it is
 * still validated as a decimal string, because a form field arrives as one and
 * `Number('1e5')` would quietly accept scientific notation that the numeric
 * column would then store as 100000.
 */
export function parseRateInput(value: unknown): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!RATE_RE.test(raw)) return null;
  if (Number(raw) <= 0) return null;
  if (Number(raw) > RATE_MAX) return null;
  return raw;
}

export type RateInput = {
  base: string;
  quote: string;
  rate: string;
  source: string;
  observedAt: string | null;
  overrideReason: string | null;
};

export function validateRateInput(input: {
  base?: unknown;
  quote?: unknown;
  rate?: unknown;
  source?: unknown;
  observedAt?: unknown;
  overrideReason?: unknown;
}): CurrencyOutcome<RateInput> {
  const base = normaliseCurrencyCode(input.base);
  const quote = normaliseCurrencyCode(input.quote);
  if (!base) return { ok: false, code: 'invalid', message: 'Which currency is being priced?' };
  if (!quote) return { ok: false, code: 'invalid', message: 'Which currency is it priced in?' };
  if (base === quote) {
    return {
      ok: false,
      code: 'invalid',
      message: `A rate cannot quote ${base} against itself. That conversion is exactly 1.`,
    };
  }

  const rate = parseRateInput(input.rate);
  if (!rate) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Enter a positive rate with at most eight decimal places.',
    };
  }

  const source = typeof input.source === 'string' ? input.source.trim() : '';
  if (source.length === 0) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Where did this rate come from? A rate nobody can check is not auditable.',
    };
  }
  if (source.length > SOURCE_MAX) {
    return { ok: false, code: 'invalid', message: `Keep the source under ${SOURCE_MAX} characters.` };
  }

  let observedAt: string | null = null;
  if (typeof input.observedAt === 'string' && input.observedAt.trim().length > 0) {
    const raw = input.observedAt.trim();
    if (!DATE_RE.test(raw)) {
      return { ok: false, code: 'invalid', message: 'Use a date, or leave it as now.' };
    }
    const parsed = new Date(`${raw}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, code: 'invalid', message: 'That date does not exist.' };
    }
    if (parsed.getTime() > Date.now() + 5 * 60_000) {
      return { ok: false, code: 'invalid', message: 'A rate cannot be observed in the future.' };
    }
    observedAt = parsed.toISOString();
  }

  let overrideReason: string | null = null;
  if (typeof input.overrideReason === 'string' && input.overrideReason.trim().length > 0) {
    overrideReason = input.overrideReason.trim();
    if (overrideReason.length > OVERRIDE_MAX) {
      return {
        ok: false,
        code: 'invalid',
        message: `Keep the reason under ${OVERRIDE_MAX} characters.`,
      };
    }
  }

  return { ok: true, value: { base, quote, rate, source, observedAt, overrideReason } };
}

/**
 * A reporting window from two dates a person picked.
 *
 * The end date is **inclusive**: the window closes at midnight after it, which
 * is what "from the 1st to the 31st" means to the person choosing it. The
 * database treats the end as exclusive, so adding the day here is what makes
 * the two agree rather than silently dropping the last day's money.
 */
export function validateWindowInput(input: {
  from?: unknown;
  to?: unknown;
}): CurrencyOutcome<ReportWindow> {
  const fromRaw = typeof input.from === 'string' ? input.from.trim() : '';
  const toRaw = typeof input.to === 'string' ? input.to.trim() : '';
  if (!DATE_RE.test(fromRaw) || !DATE_RE.test(toRaw)) {
    return { ok: false, code: 'invalid', message: 'Choose a start and an end date.' };
  }
  const from = new Date(`${fromRaw}T00:00:00Z`);
  const toInclusive = new Date(`${toRaw}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(toInclusive.getTime())) {
    return { ok: false, code: 'invalid', message: 'One of those dates does not exist.' };
  }
  const to = new Date(toInclusive.getTime() + 86_400_000);
  if (from.getTime() >= to.getTime()) {
    return { ok: false, code: 'invalid', message: 'The window has to start before it ends.' };
  }
  if (to.getTime() > Date.now() + 5 * 60_000) {
    return { ok: false, code: 'invalid', message: 'The window cannot end in the future.' };
  }
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (days > WINDOW_MAX_DAYS) {
    return {
      ok: false,
      code: 'invalid',
      message: `A window is at most ${WINDOW_MAX_DAYS} days. Ask for a narrower one.`,
    };
  }
  return { ok: true, value: { from: from.toISOString(), to: to.toISOString() } };
}

export function validateSettlementInput(input: {
  transactionId?: unknown;
  amountMinor?: unknown;
  currency?: unknown;
  rateId?: unknown;
}): CurrencyOutcome<{
  transactionId: string;
  amountMinor: string;
  currency: string;
  rateId: string | null;
}> {
  const transactionId = typeof input.transactionId === 'string' ? input.transactionId.trim() : '';
  if (!UUID_RE.test(transactionId)) {
    return { ok: false, code: 'invalid', message: 'Choose the transaction that settled.' };
  }
  const amount = typeof input.amountMinor === 'string' ? input.amountMinor.trim() : '';
  if (!/^(0|[1-9][0-9]*)$/.test(amount)) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Enter what actually landed, in whole minor units. Zero is allowed; a fee can eat it all.',
    };
  }
  const currency = normaliseCurrencyCode(input.currency);
  if (!currency) {
    return { ok: false, code: 'invalid', message: 'Use a three-letter currency code.' };
  }
  let rateId: string | null = null;
  if (typeof input.rateId === 'string' && input.rateId.trim().length > 0) {
    const trimmed = input.rateId.trim();
    if (!UUID_RE.test(trimmed)) {
      return { ok: false, code: 'invalid', message: 'A rate is chosen from the list, not typed in.' };
    }
    rateId = trimmed;
  }
  return { ok: true, value: { transactionId, amountMinor: amount, currency, rateId } };
}

// ---------------------------------------------------------------------------
// Reading back
// ---------------------------------------------------------------------------

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return null;
}

/**
 * `char(3)` arrives from PostgREST padded, and a padded code fails every
 * comparison and every currency lookup downstream.
 */
function code(value: unknown): string | null {
  const raw = text(value);
  if (raw === null) return null;
  const trimmed = raw.trim().toUpperCase();
  return CURRENCY_RE.test(trimmed) ? trimmed : null;
}

export function normaliseRateRow(raw: unknown): RateRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const base = code(row.base_currency);
  const quote = code(row.quote_currency);
  const rate = text(row.rate);
  const source = text(row.source);
  if (!id || !base || !quote || rate === null || source === null) return null;
  if (!UUID_RE.test(id)) return null;
  return {
    id,
    base,
    quote,
    rate,
    source,
    observedAt: text(row.observed_at),
  };
}

export function normaliseRateResolution(raw: unknown): RateResolution | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const base = code(row.base);
  const quote = code(row.quote);
  const rate = text(row.rate);
  const source = text(row.source);
  if (!base || !quote || rate === null || source === null) return null;
  if (typeof row.derived !== 'boolean') return null;
  const rateId = text(row.rateId);
  if (rateId !== null && !UUID_RE.test(rateId)) return null;
  return { rateId, base, quote, rate, source, observedAt: text(row.observedAt), derived: row.derived };
}

export function normaliseConvertedAmount(raw: unknown): ConvertedAmount | null {
  const resolution = normaliseRateResolution(raw);
  if (!resolution) return null;
  const row = raw as Record<string, unknown>;
  const amountMinor = text(row.amountMinor);
  const currency = code(row.currency);
  if (amountMinor === null || !/^-?[0-9]+$/.test(amountMinor) || !currency) return null;
  return { ...resolution, amountMinor, currency };
}

export function normaliseSettlement(raw: unknown): Settlement | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const settlementAmountMinor = text(row.settlementAmountMinor);
  const settlementCurrency = code(row.settlementCurrency);
  const transactionAmountMinor = text(row.transactionAmountMinor);
  const transactionCurrency = code(row.transactionCurrency);
  if (!id || !UUID_RE.test(id)) return null;
  if (settlementAmountMinor === null || !/^[0-9]+$/.test(settlementAmountMinor)) return null;
  if (!settlementCurrency || transactionAmountMinor === null || !transactionCurrency) return null;
  if (typeof row.derived !== 'boolean' || typeof row.restated !== 'boolean') return null;
  return {
    id,
    status: text(row.status) ?? 'settled',
    settlementAmountMinor,
    settlementCurrency,
    transactionAmountMinor,
    transactionCurrency,
    fxRate: text(row.fxRate),
    fxSource: text(row.fxSource),
    fxObservedAt: text(row.fxObservedAt),
    rateId: text(row.rateId),
    derived: row.derived,
    restated: row.restated,
  };
}

/**
 * The report is read strictly.
 *
 * A money report that quietly dropped a group would show a smaller total and
 * nothing would say so, which is the one failure this feature exists to
 * prevent. Anything that does not have the shape the database returns is
 * refused whole rather than partially rendered.
 */
export function normaliseReport(raw: unknown): MoneyReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const report = raw as Record<string, unknown>;

  const reportingCurrency = code(report.reportingCurrency);
  const note = text(report.note);
  if (!reportingCurrency || note === null) return null;

  const windowRaw = report.window;
  if (!windowRaw || typeof windowRaw !== 'object') return null;
  const from = text((windowRaw as Record<string, unknown>).from);
  const to = text((windowRaw as Record<string, unknown>).to);
  if (!from || !to) return null;

  if (!Array.isArray(report.rows) || !Array.isArray(report.earnings)
      || !Array.isArray(report.byDirection) || !Array.isArray(report.unconverted)
      || !Array.isArray(report.ratesUsed) || !Array.isArray(report.outliers)) return null;

  const rows: ReportRow[] = [];
  for (const entry of report.rows) {
    if (!entry || typeof entry !== 'object') return null;
    const row = entry as Record<string, unknown>;
    const transactionType = text(row.transactionType);
    const currency = code(row.currency);
    const amountMinor = text(row.amountMinor);
    const direction = row.direction;
    if (!transactionType || !currency || amountMinor === null) return null;
    if (direction !== 'debit' && direction !== 'credit') return null;
    if (typeof row.count !== 'number') return null;
    // Present-but-null means nobody could convert it, which is a fact the
    // report shows. Absent means the shape changed, which it must not.
    if (!('reportingAmountMinor' in row)) return null;
    const converted = text(row.reportingAmountMinor);
    if (converted !== null && !/^-?[0-9]+$/.test(converted)) return null;
    rows.push({
      section: 'transactions',
      transactionType,
      direction,
      currency,
      count: row.count,
      amountMinor,
      reportingAmountMinor: converted,
    });
  }

  const earnings: EarningsRow[] = [];
  for (const entry of report.earnings) {
    if (!entry || typeof entry !== 'object') return null;
    const row = entry as Record<string, unknown>;
    const status = text(row.status);
    const currency = code(row.currency);
    const gross = text(row.grossAmountMinor);
    const net = text(row.netAmountMinor);
    if (!status || !currency || gross === null || net === null) return null;
    if (typeof row.count !== 'number') return null;
    if (!('reportingGrossMinor' in row) || !('reportingNetMinor' in row)) return null;
    const reportingGross = text(row.reportingGrossMinor);
    const reportingNet = text(row.reportingNetMinor);
    earnings.push({
      section: 'earnings',
      status,
      currency,
      count: row.count,
      grossAmountMinor: gross,
      netAmountMinor: net,
      reportingGrossMinor: reportingGross,
      reportingNetMinor: reportingNet,
    });
  }

  const byDirection: DirectionTotal[] = [];
  for (const entry of report.byDirection) {
    if (!entry || typeof entry !== 'object') return null;
    const row = entry as Record<string, unknown>;
    const reportingAmountMinor = text(row.reportingAmountMinor);
    if (row.direction !== 'debit' && row.direction !== 'credit') return null;
    if (typeof row.groups !== 'number' || typeof row.count !== 'number') return null;
    if (reportingAmountMinor === null) return null;
    byDirection.push({
      direction: row.direction,
      groups: row.groups,
      count: row.count,
      reportingAmountMinor,
    });
  }

  const unconverted: UnconvertedRow[] = [];
  for (const entry of report.unconverted) {
    if (!entry || typeof entry !== 'object') return null;
    const row = entry as Record<string, unknown>;
    const currency = code(row.currency);
    const amountMinor = text(row.amountMinor);
    if (!currency || amountMinor === null || typeof row.count !== 'number') return null;
    const section = row.section === 'earnings' ? 'earnings' : 'transactions';
    unconverted.push({ section, currency, count: row.count, amountMinor });
  }

  const ratesUsed: ConvertedAmount[] = [];
  for (const entry of report.ratesUsed) {
    const converted = normaliseConvertedAmount(entry);
    if (!converted) return null;
    ratesUsed.push(converted);
  }

  const outliers: RateOutlier[] = [];
  for (const entry of report.outliers) {
    if (!entry || typeof entry !== 'object') return null;
    const row = entry as Record<string, unknown>;
    const base = code(row.base);
    const quote = code(row.quote);
    const rate = text(row.rate);
    const previousRate = text(row.previousRate);
    const source = text(row.source);
    if (!base || !quote || rate === null || previousRate === null || source === null) return null;
    if (typeof row.factor !== 'number') return null;
    outliers.push({ base, quote, rate, previousRate, factor: row.factor, observedAt: text(row.observedAt), source });
  }

  const totalsRaw = report.totals;
  if (!totalsRaw || typeof totalsRaw !== 'object') return null;
  const totals = totalsRaw as Record<string, unknown>;
  if (typeof totals.groups !== 'number' || typeof totals.transactions !== 'number'
      || typeof totals.unconvertedGroups !== 'number') return null;
  const missingRates: string[] = [];
  if (!Array.isArray(totals.missingRates)) return null;
  for (const entry of totals.missingRates) {
    const missing = code(entry);
    if (!missing) return null;
    missingRates.push(missing);
  }

  return {
    reportingCurrency,
    window: { from, to },
    rows,
    earnings,
    byDirection,
    totals: {
      groups: totals.groups,
      transactions: totals.transactions,
      unconvertedGroups: totals.unconvertedGroups,
      missingRates,
    },
    unconverted,
    ratesUsed,
    outliers,
    note,
  };
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/**
 * A rate as a person reads it: no trailing zeros, and never in scientific
 * notation. `Number(0.00027).toString()` is fine but `Number(1e-9).toString()`
 * is `1e-9`, which on a money screen reads as a mistake rather than a number.
 */
export function formatRate(rate: string | null): string {
  if (rate === null) return '—';
  // Only a decimal fraction is trimmed. Stripping zeros from "100" would turn
  // a rate of one hundred into a rate of one.
  if (!rate.includes('.')) return rate;
  const trimmed = rate.replace(/0+$/, '').replace(/\.$/, '');
  if (trimmed.length === 0) return '0';
  return trimmed;
}

/** "1 UGX = 0.00027 USD", which is what a rate row means and the order it means it in. */
export function describeRate(resolution: RateResolution): string {
  return `1 ${resolution.base} = ${formatRate(resolution.rate)} ${resolution.quote}`;
}

/**
 * Where a figure came from. The derivation is part of the answer, not a detail:
 * an inverted rate was never published by anybody, and a total resting on one
 * should say so on the same line.
 */
export function describeRateSource(resolution: RateResolution): string {
  const observed = resolution.observedAt
    ? `observed ${new Date(resolution.observedAt).toISOString().slice(0, 10)}`
    : 'no observation recorded';
  return `${resolution.source} · ${observed}${resolution.derived ? ' · inverted' : ''}`;
}

/** An amount in minor units, displayed through the D4 formatter. */
export function formatMinor(amountMinor: string | null, currency: string): string {
  if (amountMinor === null) return '—';
  try {
    return format(fromMinor(amountMinor, currency));
  } catch {
    // A figure the formatter refuses is shown raw rather than dropped: on a
    // money screen, an amount that cannot be displayed is still an amount.
    return `${currency} ${amountMinor}`;
  }
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export async function recordExchangeRate(
  supabase: SupabaseClient,
  input: {
    base?: unknown;
    quote?: unknown;
    rate?: unknown;
    source?: unknown;
    observedAt?: unknown;
    overrideReason?: unknown;
  },
): Promise<CurrencyOutcome<{ id: string }>> {
  const validation = validateRateInput(input);
  if (!validation.ok) return validation;
  const rate = validation.value;

  const { data, error } = await supabase.rpc('record_exchange_rate', {
    p_base_currency: rate.base,
    p_quote_currency: rate.quote,
    p_rate: Number(rate.rate),
    p_source: rate.source,
    p_observed_at: rate.observedAt,
    p_override_reason: rate.overrideReason,
  });
  if (error) return mapCurrencyError(error);
  const id = text(data);
  if (!id) {
    return { ok: false, code: 'rejected', message: 'The rate was not recorded.' };
  }
  return { ok: true, value: { id } };
}

export async function settleTransaction(
  supabase: SupabaseClient,
  input: {
    transactionId?: unknown;
    amountMinor?: unknown;
    currency?: unknown;
    rateId?: unknown;
  },
): Promise<CurrencyOutcome<Settlement>> {
  const validation = validateSettlementInput(input);
  if (!validation.ok) return validation;
  const settlement = validation.value;

  const { data, error } = await supabase.rpc('record_transaction_settlement', {
    p_financial_transaction_id: settlement.transactionId,
    p_settlement_amount_minor: settlement.amountMinor,
    p_settlement_currency: settlement.currency,
    p_rate_id: settlement.rateId,
  });
  if (error) return mapCurrencyError(error);
  const result = normaliseSettlement(data);
  if (!result) {
    return { ok: false, code: 'rejected', message: 'The settlement came back unreadable.' };
  }
  return { ok: true, value: result };
}

export async function fetchRecentRates(
  supabase: SupabaseClient,
  limit = 50,
): Promise<CurrencyOutcome<RateRow[]>> {
  const { data, error } = await supabase
    .from('currency_exchange_rates')
    .select(RATE_COLUMNS)
    .order('observed_at', { ascending: false })
    .limit(limit);
  if (error) return mapCurrencyError(error);
  const rows: RateRow[] = [];
  for (const entry of data ?? []) {
    const row = normaliseRateRow(entry);
    if (!row) {
      return { ok: false, code: 'rejected', message: 'A recorded rate came back unreadable.' };
    }
    rows.push(row);
  }
  return { ok: true, value: rows };
}

/**
 * What one amount would convert to, right now.
 *
 * Not part of the report: this is the check a finance admin runs when a total
 * looks wrong, so it answers for a single figure and shows the rate it used.
 * `null` means the pair has no recorded rate, which is a true answer rather than
 * an error — the honest result of asking what an unquoted currency is worth is
 * that nobody has said.
 */
export async function convertAmount(
  supabase: SupabaseClient,
  input: { amountMinor?: unknown; currency?: unknown },
): Promise<CurrencyOutcome<{ converted: ConvertedAmount | null; asked: { amountMinor: string; currency: string } }>> {
  const amount = typeof input.amountMinor === 'string' ? input.amountMinor.trim() : '';
  if (!/^(0|[1-9][0-9]*)$/.test(amount)) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Enter a whole number of minor units. A total is never negative.',
    };
  }
  const currency = normaliseCurrencyCode(input.currency);
  if (!currency) {
    return { ok: false, code: 'invalid', message: 'Use a three-letter currency code.' };
  }

  const { data, error } = await supabase.rpc('to_reporting_currency', {
    p_amount_minor: amount,
    p_currency: currency,
    p_as_of: null,
  });
  if (error) return mapCurrencyError(error);
  if (data === null || data === undefined) {
    return { ok: true, value: { converted: null, asked: { amountMinor: amount, currency } } };
  }
  const converted = normaliseConvertedAmount(data);
  if (!converted) {
    return { ok: false, code: 'rejected', message: 'The conversion came back unreadable.' };
  }
  return { ok: true, value: { converted, asked: { amountMinor: amount, currency } } };
}

export async function fetchMoneyReport(
  supabase: SupabaseClient,
  window: ReportWindow,
): Promise<CurrencyOutcome<MoneyReport>> {
  const { data, error } = await supabase.rpc('report_money_in_reporting_currency', {
    p_from: window.from,
    p_to: window.to,
  });
  if (error) return mapCurrencyError(error);
  const report = normaliseReport(data);
  if (!report) {
    return { ok: false, code: 'rejected', message: 'The report came back unreadable.' };
  }
  return { ok: true, value: report };
}

/**
 * A refusal from the database, kept as its own type rather than
 * `CurrencyOutcome<never>`: the message it returns is the one a person reads,
 * and a caller that has already checked `ok` should not have to narrow again.
 */
export function mapCurrencyError(error: { message: string }): CurrencyFailure {
  const message = error.message;
  if (/only a finance admin or platform admin/i.test(message)) {
    return { ok: false, code: 'forbidden', message };
  }
  if (/sign in to/i.test(message)) {
    return { ok: false, code: 'forbidden', message: 'Sign in first.' };
  }
  if (/policy|permission denied/i.test(message)) {
    return { ok: false, code: 'forbidden', message: 'That is not yours to change.' };
  }
  if (/no exchange rate is recorded from/i.test(message)) {
    return {
      ok: false,
      code: 'rejected',
      message: `${message}. Record the rate first, so the settlement cites a rate with a source.`,
    };
  }
  if (/more than .* times away from the last recorded rate/i.test(message)) {
    return { ok: false, code: 'rejected', message };
  }
  return { ok: false, code: 'rejected', message };
}
