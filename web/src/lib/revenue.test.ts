import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  courseLabel,
  currenciesIn,
  describePeriod,
  forCurrency,
  isEmptyPeriod,
  parseRevenueReport,
  revenueReconciliation,
  type RevenueReport,
} from './revenue.ts';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    from: '2031-06-01',
    to: '2031-06-30',
    orders: 2,
    households: 1,
    byCurrency: [
      {
        currency: 'UGX',
        orders: 2,
        grossMinor: '80000',
        discountMinor: '5000',
        refundedMinor: '20000',
        netMinor: '60000',
      },
    ],
    byCourse: [
      {
        courseId: 'c1',
        courseSlug: 'fiqh',
        courseTitle: 'Fiqh for adults',
        currency: 'UGX',
        sales: 2,
        grossMinor: '80000',
        discountMinor: '5000',
        refundedMinor: '20000',
        netMinor: '60000',
      },
    ],
    byPlan: [],
    byTeacher: [],
    refunds: [
      { orderId: 'o1', currency: 'UGX', amountMinor: '20000', refundedAt: '2031-06-02' },
    ],
    ...overrides,
  };
}

function parsed(overrides: Record<string, unknown> = {}): RevenueReport {
  const report = parseRevenueReport(payload(overrides));
  assert(report, 'the fixture should parse');
  return report;
}

// ---------------------------------------------------------------------------
// Reading the payload
// ---------------------------------------------------------------------------

test('a well-formed report is read, and minor amounts stay exact strings', () => {
  const report = parsed();

  assert.equal(report.orders, 2);
  assert.equal(report.households, 1);
  assert.equal(report.byCurrency[0]!.grossMinor, '80000');
  assert.equal(report.byCurrency[0]!.netMinor, '60000');
  assert.equal(report.refunds[0]!.refundedAt, '2031-06-02');
});

test('a payload with no currency list is refused rather than read as "nothing sold"', () => {
  assert.equal(parseRevenueReport({ ...payload(), byCurrency: undefined }), null);
  assert.equal(parseRevenueReport({ ...payload(), byCurrency: null }), null);
});

test('one unreadable row refuses the whole report', () => {
  const broken = payload({
    byCurrency: [
      { currency: 'UGX', orders: 1, grossMinor: '100', discountMinor: '0', refundedMinor: '0', netMinor: '100' },
      { currency: 'USD', orders: 1, grossMinor: '100', discountMinor: '0', refundedMinor: '0' },
    ],
  });
  assert.equal(parseRevenueReport(broken), null);
});

test('a bigint printed as a JSON number is kept to the last digit', () => {
  const report = parsed({
    byCurrency: [
      {
        currency: 'UGX',
        orders: 1,
        grossMinor: 9007199254740991,
        discountMinor: 0,
        refundedMinor: 0,
        netMinor: 9007199254740991,
      },
    ],
  });
  assert.equal(report.byCurrency[0]!.grossMinor, '9007199254740991');
});

test('a sale with no single course behind it is read, with nothing invented for it', () => {
  const report = parsed({
    byCourse: [
      {
        courseId: null,
        courseSlug: null,
        courseTitle: null,
        currency: 'UGX',
        sales: 2,
        grossMinor: '80000',
        discountMinor: '0',
        refundedMinor: '0',
        netMinor: '80000',
      },
    ],
  });

  assert.equal(report.byCourse[0]!.courseId, null);
  assert.equal(courseLabel(report.byCourse[0]!), 'A product that maps to more than one course');
});

test('an empty period is a real report, not a refusal', () => {
  const report = parsed({ orders: 0, households: 0, byCurrency: [], byCourse: [], refunds: [] });

  const reread = parseRevenueReport(report);
  assert(reread);
  assert.equal(reread.orders, 0);
  assert.equal(isEmptyPeriod(report), true);
});

// ---------------------------------------------------------------------------
// Does it agree with itself?
// ---------------------------------------------------------------------------

test('a report that adds up has nothing to report', () => {
  assert.deepEqual(revenueReconciliation(parsed()), []);
});

test('a net figure that is not gross less refunds is said out loud', () => {
  const report = parsed({
    byCurrency: [
      {
        currency: 'UGX',
        orders: 2,
        grossMinor: '80000',
        discountMinor: '0',
        refundedMinor: '20000',
        netMinor: '80000',
      },
    ],
  });

  const issues = revenueReconciliation(report);
  assert.equal(issues.length, 1);
  assert.match(issues[0]!, /less 20000 returned is 60000, but the report says 80000/);
});

test('more refunded than taken is a contradiction, not a negative sale', () => {
  const report = parsed({
    byCurrency: [
      {
        currency: 'UGX',
        orders: 1,
        grossMinor: '10000',
        discountMinor: '0',
        refundedMinor: '15000',
        netMinor: '-5000',
      },
    ],
  });

  const issues = revenueReconciliation(report);
  assert(issues.some((issue) => /15000 was refunded against 10000 taken/.test(issue)));
  // The arithmetic is still checked, because "it adds up" and "it makes sense"
  // are two different assurances and the page says both or neither.
  assert(!issues.some((issue) => /but the report says/.test(issue)));
});

test('the same currency twice is refused, because two rows read as one total', () => {
  const row = {
    currency: 'UGX',
    orders: 1,
    grossMinor: '1000',
    discountMinor: '0',
    refundedMinor: '0',
    netMinor: '1000',
  };
  const report = parsed({ byCurrency: [row, { ...row, grossMinor: '2000', netMinor: '2000' }] });

  assert(revenueReconciliation(report).some((issue) => /listed twice/.test(issue)));
});

test('a course row claiming more refunded than sold is flagged by name', () => {
  const report = parsed({
    byCourse: [
      {
        courseId: 'c1',
        courseSlug: 'fiqh',
        courseTitle: 'Fiqh for adults',
        currency: 'UGX',
        sales: 1,
        grossMinor: '1000',
        discountMinor: '0',
        refundedMinor: '2000',
        netMinor: '-1000',
      },
    ],
  });

  assert(revenueReconciliation(report).some((issue) => /Fiqh for adults: 2000 was refunded/.test(issue)));
});

// ---------------------------------------------------------------------------
// Reading the report on a page
// ---------------------------------------------------------------------------

test('the window is written in UTC, so the boundary names the day it was measured on', () => {
  assert.equal(describePeriod(parsed()), '1 Jun 2031 → 30 Jun 2031');
});

test('currencies are listed, never added, and each one keeps its rows together', () => {
  const report = parsed({
    byCurrency: [
      { currency: 'USD', orders: 1, grossMinor: '5000', discountMinor: '0', refundedMinor: '0', netMinor: '5000' },
      { currency: 'UGX', orders: 2, grossMinor: '80000', discountMinor: '0', refundedMinor: '0', netMinor: '80000' },
    ],
  });

  assert.deepEqual(currenciesIn(report), ['UGX', 'USD']);
  assert.equal(forCurrency(report.byCurrency, 'UGX').length, 1);
  assert.equal(forCurrency(report.byCurrency, 'UGX')[0]!.grossMinor, '80000');
});
