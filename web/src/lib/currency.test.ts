import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CURRENCY_RE,
  RATE_COLUMNS,
  RATE_MAX,
  SOURCE_MAX,
  WINDOW_MAX_DAYS,
  describeRate,
  describeRateSource,
  convertAmount,
  fetchMoneyReport,
  fetchRecentRates,
  formatMinor,
  formatRate,
  mapCurrencyError,
  normaliseConvertedAmount,
  normaliseRateResolution,
  normaliseRateRow,
  normaliseReport,
  normaliseSettlement,
  parseRateInput,
  recordExchangeRate,
  settleTransaction,
  validateRateInput,
  validateSettlementInput,
  validateWindowInput,
  type ConvertedAmount,
  type MoneyReport,
} from './currency.ts';
import { minorUnitDivisor } from './money.ts';

// ---------------------------------------------------------------------------
// Reporting money in one currency.
//
// The rules under test:
//
//   * a rate needs a source, a pair, and a value the numeric column can hold
//   * a window a person picks is inclusive of its end date, because the
//     database treats the end as exclusive and silently dropping the last day's
//     money is the failure this module exists to prevent
//   * the readers are strict. A report that quietly lost a group would show a
//     smaller total and nothing would say so
//   * a refusal made here never costs a round trip
//   * the minor-unit divisors agree with the copy the database keeps
// ---------------------------------------------------------------------------

const RATE_ID = '6f1a1b6a-0000-4000-8000-000000000f01';
const TXN_ID = '6f1a1b6a-0000-4000-8000-000000000f02';

type RpcCall = { fn: string; args: Record<string, unknown> };
type TableCall = { table: string; select?: string; orders: string[]; limit?: number };

function stubCurrency(specs: Record<string, { data: unknown; error?: { message: string } }> = {}) {
  const rpcCalls: RpcCall[] = [];
  const tables: TableCall[] = [];
  const client = {
    from: (table: string) => {
      const call: TableCall = { table, orders: [] };
      tables.push(call);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = (cols?: string) => {
        if (typeof cols === 'string') call.select = cols;
        return chain;
      };
      chain.order = (column: string) => {
        call.orders.push(column);
        return chain;
      };
      chain.limit = (n: number) => {
        call.limit = n;
        return chain;
      };
      chain.eq = (column: string, value: unknown) => {
        call.orders.push(`${column}=${String(value)}`);
        return chain;
      };
      chain.then = (resolve: (v: unknown) => unknown) => {
        const spec = specs[table] ?? { data: [] };
        return Promise.resolve({ data: spec.data, error: spec.error ?? null }).then(resolve);
      };
      return chain;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      const spec = specs[`rpc:${fn}`];
      if (!spec) return { data: null, error: null };
      return { data: spec.data, error: spec.error ?? null };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return { client, rpcCalls, tables };
}

const day = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10);

function sampleRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    section: 'transactions',
    transactionType: 'capture',
    direction: 'credit',
    currency: 'UGX',
    count: 1,
    amountMinor: '500000',
    reportingAmountMinor: '13500',
    ...overrides,
  };
}

function sampleEarnings(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    section: 'earnings',
    status: 'accrued',
    currency: 'UGX',
    count: 1,
    grossAmountMinor: '500000',
    netAmountMinor: '250000',
    reportingGrossMinor: '13500',
    reportingNetMinor: '6750',
    ...overrides,
  };
}

function sampleRate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    rateId: RATE_ID,
    base: 'UGX',
    quote: 'USD',
    rate: '0.00027000',
    source: 'Bank of Uganda',
    observedAt: '2025-09-16T12:00:00Z',
    derived: false,
    amountMinor: '13500',
    currency: 'USD',
    ...overrides,
  };
}

function reportFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    reportingCurrency: 'USD',
    window: { from: '2025-09-01T00:00:00Z', to: '2025-10-01T00:00:00Z' },
    rows: [
      sampleRow(),
      sampleRow({ transactionType: 'refund', direction: 'debit', amountMinor: '50000',
                  reportingAmountMinor: '1350' }),
    ],
    earnings: [sampleEarnings()],
    byDirection: [
      { direction: 'credit', groups: 1, count: 1, reportingAmountMinor: '13500' },
      { direction: 'debit', groups: 1, count: 1, reportingAmountMinor: '1350' },
    ],
    totals: { groups: 2, transactions: 2, unconvertedGroups: 0, missingRates: [] },
    unconverted: [],
    ratesUsed: [sampleRate()],
    outliers: [],
    note: 'Gross figures grouped by type and direction. Nothing here nets a refund.',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// The divisor list, against the copy the database keeps
// ---------------------------------------------------------------------------

test('the minor-unit divisors are the same list the database keeps', () => {
  // supabase/tests/currency_reporting.test.mjs pins
  // public.currency_minor_divisor() against these same codes. Two consumers of
  // one fact, with no shared runtime: the browser cannot call the function, so
  // both copies are held by a test on their own side.
  for (const code of ['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG',
                      'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']) {
    assert.equal(minorUnitDivisor(code), 1, `${code} should have no minor unit`);
  }
  for (const code of ['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']) {
    assert.equal(minorUnitDivisor(code), 1000, `${code} has three decimal places`);
  }
  for (const code of ['USD', 'GBP', 'EUR', 'KES', 'NGN', 'ZAR', 'AED', 'SAR']) {
    assert.equal(minorUnitDivisor(code), 100, `${code} has two decimal places`);
  }
  assert.throws(() => minorUnitDivisor('US'), 'a two-letter code was given a divisor');
});

test('a zero-decimal amount displays without invented cents', () => {
  // 5 000 minor units of UGX is 5 000 shillings, not 50.
  assert.equal(formatMinor('5000', 'UGX'), 'UGX 5000');
  assert.equal(formatMinor('13500', 'USD'), 'USD 135.00');
  assert.equal(formatMinor('1000', 'BHD'), 'BHD 1.000');
  assert.equal(formatMinor('0', 'USD'), 'USD 0.00');
  assert.equal(formatMinor(null, 'USD'), '—');
  // A figure the formatter refuses is still shown: on a money screen an amount
  // that cannot be displayed is still an amount somebody owes.
  assert.equal(formatMinor('12.5', 'USD'), 'USD 12.5');
});

test('a rate is displayed as a person reads it', () => {
  assert.equal(formatRate('0.00027000'), '0.00027');
  assert.equal(formatRate('1.00000000'), '1');
  assert.equal(formatRate('0.00000000'), '0');
  // Trimming zeros from a whole number would turn one hundred into one.
  assert.equal(formatRate('100'), '100');
  assert.equal(formatRate('130.50'), '130.5');
  assert.equal(formatRate(null), '—');
});

// ---------------------------------------------------------------------------
// Recording a rate
// ---------------------------------------------------------------------------

test('a currency code is three uppercase letters', () => {
  assert.ok(CURRENCY_RE.test('UGX'));
  assert.equal(validateRateInput({ base: 'shillings', quote: 'USD', rate: '1', source: 'x' }).ok, false);
  assert.equal(validateRateInput({ base: 'ugx', quote: 'USD', rate: '1', source: 'x' }).ok, true,
    'a lower-case code from a form field should be accepted');
});

test('a rate is a decimal string the numeric column can hold', () => {
  assert.equal(parseRateInput('0.00027'), '0.00027');
  assert.equal(parseRateInput('  130  '), '130');
  assert.equal(parseRateInput('0.123456789'), null, 'nine decimal places were accepted');
  assert.equal(parseRateInput('1e5'), null, 'scientific notation was accepted');
  assert.equal(parseRateInput('007'), null, 'a padded number was accepted');
  assert.equal(parseRateInput('-1'), null, 'a negative rate was accepted');
  assert.equal(parseRateInput('0'), null, 'a zero rate was accepted');
  assert.equal(parseRateInput(''), null);
  assert.equal(parseRateInput(0.00027), null, 'a number was accepted from a form field');
  assert.equal(parseRateInput(String(RATE_MAX + 1)), null, 'a rate above the ceiling was accepted');
});

test('a rate needs a pair, a value and a source a person could check', () => {
  const missingSource = validateRateInput({ base: 'UGX', quote: 'USD', rate: '0.00027' });
  assert.equal(missingSource.ok, false);
  if (!missingSource.ok) {
    assert.match(missingSource.message, /Where did this rate come from/);
  }

  const longSource = validateRateInput({
    base: 'UGX', quote: 'USD', rate: '0.00027', source: 'x'.repeat(SOURCE_MAX + 1),
  });
  assert.equal(longSource.ok, false);

  const selfPair = validateRateInput({ base: 'USD', quote: 'usd', rate: '1', source: 'identity' });
  assert.equal(selfPair.ok, false, 'a currency quoted against itself was accepted');

  const happy = validateRateInput({
    base: ' ugx ', quote: 'USD', rate: '0.00027', source: ' Bank of Uganda, mid rate ',
  });
  assert.equal(happy.ok, true);
  if (happy.ok) {
    assert.deepEqual(happy.value, {
      base: 'UGX',
      quote: 'USD',
      rate: '0.00027',
      source: 'Bank of Uganda, mid rate',
      observedAt: null,
      overrideReason: null,
    });
  }
});

test('an observation date is a date, and cannot be in the future', () => {
  assert.equal(validateRateInput({
    base: 'UGX', quote: 'USD', rate: '1', source: 's', observedAt: 'yesterday',
  }).ok, false);
  assert.equal(validateRateInput({
    base: 'UGX', quote: 'USD', rate: '1', source: 's', observedAt: iso(2),
  }).ok, false, 'a rate observed in the future was accepted');

  const backdated = validateRateInput({
    base: 'UGX', quote: 'USD', rate: '1', source: 's', observedAt: iso(-40),
  });
  assert.equal(backdated.ok, true, 'a backdated rate was refused');
  if (backdated.ok) {
    assert.ok(backdated.value.observedAt?.endsWith('T12:00:00.000Z'),
      `a backdated rate was stored at ${backdated.value.observedAt}`);
  }
});

test('an override reason has a ceiling too', () => {
  assert.equal(validateRateInput({
    base: 'UGX', quote: 'USD', rate: '1', source: 's', overrideReason: 'x'.repeat(501),
  }).ok, false);
});

test('a rate is recorded through the audited writer, with its own validation first', async () => {
  const { client, rpcCalls } = stubCurrency({ 'rpc:record_exchange_rate': { data: RATE_ID } });

  const refused = await recordExchangeRate(client, { base: 'UGX', quote: 'USD', rate: '0' });
  assert.equal(refused.ok, false);
  assert.equal(rpcCalls.length, 0, 'a refusal made here cost a round trip');

  const recorded = await recordExchangeRate(client, {
    base: 'ugx', quote: 'USD', rate: '0.00027', source: 'Bank of Uganda',
  });
  assert.equal(recorded.ok, true);
  if (recorded.ok) assert.equal(recorded.value.id, RATE_ID);
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0]?.fn, 'record_exchange_rate');
  assert.deepEqual(rpcCalls[0]?.args, {
    p_base_currency: 'UGX',
    p_quote_currency: 'USD',
    p_rate: 0.00027,
    p_source: 'Bank of Uganda',
    p_observed_at: null,
    p_override_reason: null,
  });
});

test('a rate that moved too far is refused by the database, not hidden here', async () => {
  const { client } = stubCurrency({
    'rpc:record_exchange_rate': {
      data: null,
      error: {
        message: 'the rate 50 is more than 10 times away from the last recorded rate 1 for ABC to USD. If that is right, say why in writing',
      },
    },
  });
  const outcome = await recordExchangeRate(client, {
    base: 'ABC', quote: 'USD', rate: '50', source: 'published',
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, 'rejected');
    assert.match(outcome.message, /say why in writing/,
      'the reason the database gave was replaced with a vaguer one');
  }
});

// ---------------------------------------------------------------------------
// The rate list
// ---------------------------------------------------------------------------

test('the rate list asks for the columns the screen renders', async () => {
  const { client, tables } = stubCurrency({
    currency_exchange_rates: {
      data: [{
        id: RATE_ID,
        base_currency: 'UGX',
        quote_currency: 'USD',
        rate: 0.00027,
        source: 'Bank of Uganda',
        observed_at: '2025-09-16T12:00:00Z',
        created_at: '2025-09-16T12:05:00Z',
      }],
    },
  });

  const outcome = await fetchRecentRates(client, 25);
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.value.length, 1);
    assert.deepEqual(outcome.value[0], {
      id: RATE_ID,
      base: 'UGX',
      quote: 'USD',
      rate: '0.00027',
      source: 'Bank of Uganda',
      observedAt: '2025-09-16T12:00:00Z',
    });
  }

  assert.equal(tables.length, 1);
  // A stub answers whatever columns are asked for, so this is the assertion
  // that catches a column name that does not exist.
  assert.equal(tables[0]?.table, 'currency_exchange_rates');
  assert.equal(tables[0]?.select, RATE_COLUMNS);
  assert.deepEqual(tables[0]?.orders, ['observed_at']);
  assert.equal(tables[0]?.limit, 25);
});

test('a recorded rate that comes back unreadable is refused whole', async () => {
  const { client } = stubCurrency({
    currency_exchange_rates: {
      data: [{ id: RATE_ID, base_currency: 'UGX', quote_currency: 'USD', rate: 0.00027 }],
    },
  });
  const outcome = await fetchRecentRates(client);
  assert.equal(outcome.ok, false, 'a row with no source was rendered');
  if (!outcome.ok) assert.equal(outcome.code, 'rejected');
});

test('a padded char(3) code is trimmed before anything compares it', () => {
  const row = normaliseRateRow({
    id: RATE_ID, base_currency: 'UGX', quote_currency: 'USD ', rate: '0.00027000',
    source: 'Bank of Uganda', observed_at: null,
  });
  assert.ok(row, 'a padded code was refused');
  assert.equal(row?.quote, 'USD');
  assert.equal(normaliseRateRow({ id: 'not-a-uuid', base_currency: 'UGX', quote_currency: 'USD', rate: '1', source: 's' }), null);
  assert.equal(normaliseRateRow(null), null);
});

// ---------------------------------------------------------------------------
// Resolution and conversion, as the database returns them
// ---------------------------------------------------------------------------

test('a resolution without its derivation flag is not a resolution', () => {
  const good: Record<string, unknown> = {
    rateId: RATE_ID, base: 'UGX', quote: 'USD', rate: '0.00027',
    source: 'Bank of Uganda', observedAt: '2025-09-16T12:00:00Z', derived: false,
  };
  assert.ok(normaliseRateResolution(good));
  const { derived: _derived, ...noFlag } = good;
  assert.equal(normaliseRateResolution(noFlag), null,
    'a rate that did not say whether it was inverted was accepted');
  assert.equal(normaliseRateResolution({ ...good, base: 'shilling' }), null);
  assert.equal(normaliseRateResolution({ ...good, rateId: 'nope' }), null);

  // Identity has no row behind it, which is not the same as a missing one.
  const identity = normaliseRateResolution({
    rateId: null, base: 'USD', quote: 'USD', rate: '1', source: 'identity',
    observedAt: null, derived: false,
  });
  assert.ok(identity, 'an identity resolution was refused');
});

test('a converted amount carries the rate that produced it', () => {
  const converted = normaliseConvertedAmount({
    rateId: RATE_ID, base: 'UGX', quote: 'USD', rate: '0.00027', source: 'Bank of Uganda',
    observedAt: null, derived: false, amountMinor: '135', currency: 'USD',
  }) as ConvertedAmount | null;
  assert.ok(converted);
  assert.equal(converted?.amountMinor, '135');
  assert.equal(normaliseConvertedAmount({
    rateId: null, base: 'UGX', quote: 'USD', rate: '1', source: 'identity',
    observedAt: null, derived: false, amountMinor: '13.5', currency: 'USD',
  }), null, 'a fractional minor-unit amount was accepted');
});

test('the source line says when a rate was inverted', () => {
  const published = {
    rateId: RATE_ID, base: 'UGX', quote: 'USD', rate: '0.00027000',
    source: 'Bank of Uganda', observedAt: '2025-09-16T12:00:00Z', derived: false,
  };
  assert.equal(describeRate(published), '1 UGX = 0.00027 USD');
  assert.equal(describeRateSource(published),
    'Bank of Uganda · observed 2025-09-16');

  const inverted = { ...published, base: 'INV', quote: 'USD', rate: '0.25000000', derived: true };
  assert.match(describeRateSource(inverted), /inverted$/,
    'an inverted rate was presented as a published one');
  assert.equal(describeRateSource({ ...published, observedAt: null }),
    'Bank of Uganda · no observation recorded');
});

// ---------------------------------------------------------------------------
// The window
// ---------------------------------------------------------------------------

test('a window a person picks includes the day it ends on', () => {
  const outcome = validateWindowInput({ from: '2026-01-01', to: '2026-01-31' });
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.value.from, '2026-01-01T00:00:00.000Z');
    // The database treats the end as exclusive, so the last day is only in the
    // window if the client adds it.
    assert.equal(outcome.value.to, '2026-02-01T00:00:00.000Z');
  }
});

test('a window has to be a window', () => {
  assert.equal(validateWindowInput({ from: '2026-02-01', to: '2026-01-01' }).ok, false);
  assert.equal(validateWindowInput({ from: '2026-01-01' }).ok, false);
  assert.equal(validateWindowInput({ from: 'January', to: '2026-01-01' }).ok, false);
  const future = validateWindowInput({ from: iso(2), to: iso(3) });
  assert.equal(future.ok, false, 'a window ending in the future was accepted');

  const wide = validateWindowInput({
    from: '2020-01-01',
    to: new Date(Date.UTC(2020, 0, 1 + WINDOW_MAX_DAYS + 2)).toISOString().slice(0, 10),
  });
  assert.equal(wide.ok, false, `a window wider than ${WINDOW_MAX_DAYS} days was accepted`);

  const exactly = validateWindowInput({
    from: '2020-01-01',
    to: new Date(Date.UTC(2020, 0, WINDOW_MAX_DAYS)).toISOString().slice(0, 10),
  });
  assert.equal(exactly.ok, true, 'a window of exactly the maximum span was refused');
});

// ---------------------------------------------------------------------------
// Settlements
// ---------------------------------------------------------------------------

test('a settlement needs a transaction, a whole amount and a currency', () => {
  assert.equal(validateSettlementInput({ amountMinor: '100', currency: 'UGX' }).ok, false);
  assert.equal(validateSettlementInput({
    transactionId: TXN_ID, amountMinor: '-5', currency: 'UGX',
  }).ok, false, 'a negative settlement was accepted');
  assert.equal(validateSettlementInput({
    transactionId: TXN_ID, amountMinor: '12.5', currency: 'UGX',
  }).ok, false, 'a fractional settlement was accepted');
  assert.equal(validateSettlementInput({
    transactionId: TXN_ID, amountMinor: '100', currency: 'shillings',
  }).ok, false);
  assert.equal(validateSettlementInput({
    transactionId: TXN_ID, amountMinor: '100', currency: 'UGX', rateId: 'not-a-uuid',
  }).ok, false, 'a typed-in rate id was accepted');

  // Zero is allowed: a provider can settle nothing at all after fees.
  assert.deepEqual(validateSettlementInput({
    transactionId: TXN_ID, amountMinor: '0', currency: 'ugx',
  }), { ok: true, value: { transactionId: TXN_ID, amountMinor: '0', currency: 'UGX', rateId: null } });
});

test('a settlement goes through the writer that stamps the rate', async () => {
  const { client, rpcCalls } = stubCurrency({
    'rpc:record_transaction_settlement': {
      data: {
        id: TXN_ID, status: 'settled', settlementAmountMinor: '1350', settlementCurrency: 'USD',
        transactionAmountMinor: '5000000', transactionCurrency: 'UGX',
        fxRate: '0.00027000', fxSource: 'Bank of Uganda',
        fxObservedAt: '2025-09-16T12:00:00Z', rateId: RATE_ID, derived: false, restated: false,
      },
    },
  });

  const outcome = await settleTransaction(client, {
    transactionId: TXN_ID, amountMinor: '1350', currency: 'USD',
  });
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.value.fxSource, 'Bank of Uganda');
    assert.equal(outcome.value.restated, false);
  }
  assert.deepEqual(rpcCalls[0]?.args, {
    p_financial_transaction_id: TXN_ID,
    p_settlement_amount_minor: '1350',
    p_settlement_currency: 'USD',
    p_rate_id: null,
  });
});

test('a settlement the database refuses for want of a rate says so', async () => {
  const { client } = stubCurrency({
    'rpc:record_transaction_settlement': {
      data: null,
      error: { message: 'no exchange rate is recorded from QQQ to USD. Record one first, so the settlement cites a rate with a source' },
    },
  });
  const outcome = await settleTransaction(client, {
    transactionId: TXN_ID, amountMinor: '100', currency: 'USD',
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.match(outcome.message, /Record the rate first/);
    assert.match(outcome.message, /QQQ to USD/, 'the currencies were dropped from the message');
  }
});

test('a settlement that comes back unreadable is not reported as saved', async () => {
  const { client } = stubCurrency({
    'rpc:record_transaction_settlement': { data: { id: TXN_ID, status: 'settled' } },
  });
  const outcome = await settleTransaction(client, {
    transactionId: TXN_ID, amountMinor: '100', currency: 'UGX',
  });
  assert.equal(outcome.ok, false);
  assert.equal(normaliseSettlement({
    id: TXN_ID, status: 'settled', settlementAmountMinor: '100', settlementCurrency: 'UGX',
    transactionAmountMinor: '100', transactionCurrency: 'UGX', fxRate: null, fxSource: null,
    fxObservedAt: null, rateId: null, derived: false,
  }), null, 'a settlement that did not say whether it was a restatement was accepted');
});

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

test('a report is read strictly, group by group', () => {
  const report = normaliseReport(reportFixture()) as MoneyReport | null;
  assert.ok(report, 'a well-formed report was refused');
  assert.equal(report?.reportingCurrency, 'USD');
  assert.equal(report?.rows.length, 2);
  assert.equal(report?.rows[0]?.reportingAmountMinor, '13500');
  assert.equal(report?.earnings[0]?.reportingNetMinor, '6750');
  assert.equal(report?.byDirection.length, 2);
  assert.equal(report?.ratesUsed[0]?.base, 'UGX');
  assert.equal(report?.totals.missingRates.length, 0);
  assert.match(report?.note ?? '', /nets/, 'the note that says it does not net was dropped');
});

test('a report that lost a group is refused rather than rendered smaller', () => {
  // A row that says "this could not be converted" carries the key with a null
  // in it. A row that has lost the key is a different thing, and the report is
  // refused rather than rendered with one group quietly missing.
  const withoutKey = sampleRow();
  delete withoutKey.reportingAmountMinor;
  assert.equal(normaliseReport(reportFixture({ rows: [withoutKey] })), null,
    'a group that lost its converted figure was rendered as an unconverted one');

  assert.equal(normaliseReport(reportFixture({
    rows: [sampleRow({ currency: 'shillings' })],
  })), null);

  assert.equal(normaliseReport(reportFixture({
    rows: [sampleRow({ reportingAmountMinor: '135.5' })],
  })), null, 'a fractional minor-unit total was accepted');

  const earningsWithoutNet = sampleEarnings();
  delete earningsWithoutNet.reportingNetMinor;
  assert.equal(normaliseReport(reportFixture({ earnings: [earningsWithoutNet] })), null,
    'an earnings group that did not say whether it converted was accepted');

  const noNote = reportFixture();
  delete noNote.note;
  assert.equal(normaliseReport(noNote), null);

  assert.equal(normaliseReport(reportFixture({
    totals: { groups: 2, transactions: 2, unconvertedGroups: 0, missingRates: 'QQQ' },
  })), null);

  assert.equal(normaliseReport(reportFixture({
    ratesUsed: [sampleRate({ derived: 'no' })],
  })), null);

  assert.equal(normaliseReport(null), null);
  assert.equal(normaliseReport({}), null);
});

test('an unconverted group is a row of its own, not a zero', () => {
  const report = normaliseReport(reportFixture({
    rows: [sampleRow({
      currency: 'QQQ', amountMinor: '900', reportingAmountMinor: null,
    })],
    totals: { groups: 1, transactions: 1, unconvertedGroups: 1, missingRates: ['QQQ'] },
    unconverted: [{ section: 'transactions', currency: 'QQQ', count: 1, amountMinor: '900' }],
    ratesUsed: [],
    byDirection: [],
  })) as MoneyReport | null;
  assert.ok(report);
  assert.equal(report?.rows[0]?.reportingAmountMinor, null,
    'an amount nobody could convert was turned into a number');
  assert.deepEqual(report?.totals.missingRates, ['QQQ']);
  assert.equal(report?.unconverted[0]?.amountMinor, '900');
});

test('one amount can be checked against the rate in force', async () => {
  const { client, rpcCalls } = stubCurrency({
    'rpc:to_reporting_currency': {
      data: {
        rateId: RATE_ID, base: 'UGX', quote: 'USD', rate: '0.00027000',
        source: 'Bank of Uganda', observedAt: '2025-09-16T12:00:00Z', derived: false,
        amountMinor: '13500', currency: 'USD',
      },
    },
  });

  const outcome = await convertAmount(client, { amountMinor: '500000', currency: 'ugx' });
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.value.converted?.amountMinor, '13500');
    assert.equal(outcome.value.asked.currency, 'UGX');
  }
  assert.deepEqual(rpcCalls[0]?.args, {
    p_amount_minor: '500000', p_currency: 'UGX', p_as_of: null,
  });

  assert.equal((await convertAmount(client, { amountMinor: '-5', currency: 'UGX' })).ok, false);
  assert.equal((await convertAmount(client, { amountMinor: '5', currency: 'shilling' })).ok, false);
});

test('a pair with no recorded rate converts to nothing, which is an answer', async () => {
  const { client } = stubCurrency({ 'rpc:to_reporting_currency': { data: null } });
  const outcome = await convertAmount(client, { amountMinor: '900', currency: 'QQQ' });
  assert.equal(outcome.ok, true, 'an unquoted currency was treated as an error');
  if (outcome.ok) {
    assert.equal(outcome.value.converted, null);
    assert.equal(outcome.value.asked.amountMinor, '900');
  }
});

test('the report is fetched for the window that was validated', async () => {
  const { client, rpcCalls } = stubCurrency({
    'rpc:report_money_in_reporting_currency': { data: reportFixture() },
  });
  const outcome = await fetchMoneyReport(client, {
    from: '2025-09-01T00:00:00.000Z',
    to: '2025-10-01T00:00:00.000Z',
  });
  assert.equal(outcome.ok, true);
  assert.equal(rpcCalls[0]?.fn, 'report_money_in_reporting_currency');
  assert.deepEqual(rpcCalls[0]?.args, {
    p_from: '2025-09-01T00:00:00.000Z',
    p_to: '2025-10-01T00:00:00.000Z',
  });
});

test('a report the database refuses is passed through, not invented', async () => {
  const { client } = stubCurrency({
    'rpc:report_money_in_reporting_currency': {
      data: null,
      error: { message: 'only a finance admin or platform admin may read the money report' },
    },
  });
  const outcome = await fetchMoneyReport(client, { from: 'a', to: 'b' });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.code, 'forbidden');
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

test('a role refusal is a refusal, and a missing rate is an instruction', () => {
  assert.equal(mapCurrencyError({
    message: 'only a finance admin or platform admin may record an exchange rate',
  }).code, 'forbidden');
  assert.equal(mapCurrencyError({ message: 'sign in to record an exchange rate' }).code, 'forbidden');
  assert.equal(mapCurrencyError({ message: 'permission denied for table currency_exchange_rates' }).code, 'forbidden');

  const missing = mapCurrencyError({
    message: 'no exchange rate is recorded from QQQ to USD. Record one first, so the settlement cites a rate with a source',
  });
  assert.equal(missing.code, 'rejected');
  if (!missing.ok) {
    assert.match(missing.message, /Record the rate first/);
  }

  assert.equal(mapCurrencyError({ message: 'financial transaction x not found' }).code, 'rejected');
});
