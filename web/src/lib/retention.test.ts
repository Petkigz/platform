import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeRetentionRun,
  dueTotal,
  EMPTY_PLAN,
  nextDueSentence,
  policyPeriod,
  retentionDay,
  retentionGateSentence,
  retentionHeadline,
  retentionPolicyLines,
  type RetentionPlan,
} from './retention.ts';

function plan(over: Partial<RetentionPlan> = {}): RetentionPlan {
  return { ...EMPTY_PLAN, ...over };
}

test('nothing due is said plainly, and says nothing about the cases outside the rule', () => {
  assert.equal(
    retentionHeadline(plan()),
    'Nothing is past its retention date today.',
  );
  assert.equal(dueTotal(plan()), 0);
});

test('an unclosed case is named in the same breath as the zero it hides behind', () => {
  // The failure this prevents: "0 due", believed, while a four-year-old case
  // sits outside every rule because nobody closed it.
  const one = plan({
    supportCases: {
      ...EMPTY_PLAN.supportCases,
      waiting: { count: 1, oldestCreatedAt: '2022-01-01T00:00:00Z', note: 'never closed' },
    },
  });
  const sentence = retentionHeadline(one);
  assert.match(sentence, /never been closed/);
  assert.match(sentence, /1 support case/);
  assert.match(sentence, /its clock/);

  const many = plan({
    supportCases: {
      ...EMPTY_PLAN.supportCases,
      waiting: { count: 4, oldestCreatedAt: '2022-01-01T00:00:00Z', note: 'never closed' },
    },
  });
  assert.match(retentionHeadline(many), /4 support cases have never been closed/);
  assert.match(retentionHeadline(many), /them/);
});

test('due records are counted across both clocks, with the plural right', () => {
  const one = plan({ screenings: { due: 1, oldestDue: '2026-01-01', nextDue: null } });
  assert.match(retentionHeadline(one), /^1 record is past the date the policy gives it/);

  const three = plan({
    screenings: { due: 2, oldestDue: '2026-01-01', nextDue: null },
    supportCases: { ...EMPTY_PLAN.supportCases, due: 1 },
  });
  assert.match(retentionHeadline(three), /^3 records are past the date the policy gives them/);
});

test('each clock is printed from the plan, not from a copy of the numbers', () => {
  const lines = retentionPolicyLines(plan());
  assert.equal(lines.length, 3);
  assert.match(lines[0] ?? '', /^A support case: 3 years/);
  assert.match(lines[1] ?? '', /^A screening record: 7 years/);
  assert.match(lines[1] ?? '', /eighteenth birthday/);
  // The children's clock is the only one counted in days, and the sentence has
  // to say so rather than printing "0 years".
  assert.match(lines[2] ?? '', /^A child's learning record: 30 days/);
  assert.doesNotMatch(lines[2] ?? '', /0 years/);

  // A plan that says four years is what the screen says. Hard-coding "3" in the
  // copy is how a screen and a database drift apart without either failing.
  const changed = plan({
    policies: {
      ...EMPTY_PLAN.policies,
      supportCase: { years: 4, days: null, clock: 'four years', source: '' },
    },
  });
  assert.match(retentionPolicyLines(changed)[0] ?? '', /^A support case: 4 years/);
});

test('a date-only string is shown as the day it says, not the day before it', () => {
  // `2026-01-15` parses as UTC midnight; a local formatter west of Greenwich
  // would print 14 January, and a retention date that is a day off is a record
  // deleted a day early.
  assert.equal(retentionDay('2026-01-15'), '15 Jan 2026');
  assert.equal(retentionDay('2026-11-01T23:30:00Z'), '1 Nov 2026');
  assert.equal(retentionDay(null), null);
  assert.equal(retentionDay('not a date'), null);
});

test('an empty platform answers when the next one falls due', () => {
  assert.match(nextDueSentence(plan()), /No record on the platform has a retention date yet/);

  const withNext = plan({
    supportCases: {
      ...EMPTY_PLAN.supportCases,
      nextDue: '2027-03-01',
    },
    screenings: { due: 0, oldestDue: null, nextDue: '2029-06-01' },
  });
  assert.equal(nextDueSentence(withNext), 'The next record falls due on 1 Mar 2027.');
});

test('a run is described from the numbers the database returned', () => {
  assert.equal(
    describeRetentionRun({
      asOf: '2026-11-01',
      deleted: { supportCases: 0, supportCaseMessages: 0, screenings: 0, learnerRecords: 0 },
      remaining: { supportCases: 0, screenings: 0, learnerRecords: 0 },
      audited: false,
    }),
    'Nothing was due, so nothing was deleted and no audit entry was written.',
  );

  const one = describeRetentionRun({
    asOf: '2026-11-01',
    deleted: { supportCases: 1, supportCaseMessages: 1, screenings: 0, learnerRecords: 0 },
    remaining: { supportCases: 0, screenings: 0, learnerRecords: 0 },
    audited: true,
  });
  assert.match(one, /^Deleted 1 support case, 1 reply inside them\./);
  assert.match(one, /Nothing else is due\./);
  assert.match(one, /against your name/);

  const batch = describeRetentionRun({
    asOf: '2026-11-01',
    deleted: { supportCases: 500, supportCaseMessages: 1200, screenings: 3, learnerRecords: 2 },
    remaining: { supportCases: 40, screenings: 0, learnerRecords: 0 },
    audited: true,
  });
  assert.match(batch, /500 support cases/);
  assert.match(batch, /1200 replies/);
  assert.match(batch, /3 screening records/);
  assert.match(batch, /2 children's learning records/);
  assert.match(batch, /40 more are due and will go on the next run/);

  const single = describeRetentionRun({
    asOf: '2026-11-01',
    deleted: { supportCases: 0, supportCaseMessages: 0, screenings: 0, learnerRecords: 1 },
    remaining: { supportCases: 0, screenings: 0, learnerRecords: 0 },
    audited: true,
  });
  assert.match(single, /^Deleted 1 child's learning record\./);
});

test('a child\'s record past its date is counted with the rest', () => {
  const plan3 = plan({
    learnerRecords: {
      due: 1,
      oldestDue: '2026-10-01',
      nextDue: '2026-12-01',
      erasedToDate: 4,
      waiting: { count: 0, oldestCreatedAt: null, note: '' },
    },
  });
  assert.equal(dueTotal(plan3), 1);
  assert.match(retentionHeadline(plan3), /^1 record is past the date the policy gives it/);
  assert.match(nextDueSentence(plan3), /1 Dec 2026/);
});

test('a merge leftover is named, because it has no clock at all', () => {
  const orphaned = plan({
    learnerRecords: {
      due: 0,
      oldestDue: null,
      nextDue: null,
      erasedToDate: 2,
      waiting: { count: 1, oldestCreatedAt: '2025-01-01T00:00:00Z', note: 'merge' },
    },
  });
  const sentence = retentionHeadline(orphaned);
  assert.match(sentence, /left behind by an account merge/);
  assert.match(sentence, /has no clock at all/);
  assert.match(sentence, /^Nothing is past its retention date today\./);
});

test('the gate says who may press, and what the press does', () => {
  assert.match(retentionGateSentence(true), /permanently/);
  assert.match(retentionGateSentence(false), /Only the platform admin/);
  assert.match(retentionGateSentence(false), /read what is due/);
});

test('a period is said the way a person would say it', () => {
  assert.equal(policyPeriod({ years: 3, days: null, clock: '', source: '' }), '3 years');
  assert.equal(policyPeriod({ years: 1, days: null, clock: '', source: '' }), '1 year');
  assert.equal(policyPeriod({ years: null, days: 30, clock: '', source: '' }), '30 days');
  assert.equal(policyPeriod({ years: null, days: 1, clock: '', source: '' }), '1 day');
});
