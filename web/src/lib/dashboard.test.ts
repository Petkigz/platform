import assert from 'node:assert/strict';
import test from 'node:test';

import { rankEnrolments } from './dashboard.ts';

const enrolment = (id: string, enrolledAt: string) => ({ id, enrolledAt });
const seen = (course_enrolment_id: string, last_seen_at: string | null) => ({
  course_enrolment_id,
  last_seen_at,
});

test('a course touched yesterday outranks one enrolled in last month', () => {
  const order = rankEnrolments(
    [enrolment('old-but-active', '2026-09-01T00:00:00Z'), enrolment('new-and-ignored', '2026-10-20T00:00:00Z')],
    [seen('old-but-active', '2026-10-23T00:00:00Z')],
  );

  assert.deepEqual(order, ['old-but-active', 'new-and-ignored']);
});

test('two untouched courses fall back to the newest enrolment', () => {
  const order = rankEnrolments(
    [enrolment('a', '2026-09-01T00:00:00Z'), enrolment('b', '2026-10-01T00:00:00Z')],
    [],
  );

  assert.deepEqual(order, ['b', 'a']);
});

test('two touched courses order by the newest activity', () => {
  const order = rankEnrolments(
    [enrolment('a', '2026-09-01T00:00:00Z'), enrolment('b', '2026-09-02T00:00:00Z')],
    [seen('a', '2026-10-01T00:00:00Z'), seen('b', '2026-10-05T00:00:00Z')],
  );

  assert.deepEqual(order, ['b', 'a']);
});

test('a course with many rows appears once, at its newest', () => {
  const order = rankEnrolments(
    [enrolment('many', '2026-09-01T00:00:00Z'), enrolment('few', '2026-09-01T00:00:00Z')],
    [
      seen('many', '2026-09-02T00:00:00Z'),
      seen('many', '2026-10-09T00:00:00Z'),
      seen('many', '2026-10-01T00:00:00Z'),
      seen('few', '2026-10-05T00:00:00Z'),
    ],
  );

  assert.deepEqual(order, ['many', 'few'], 'the newest row for the same course did not win');
  assert.equal(order.length, 2);
});

test('a null timestamp is not activity, so the newer enrolment wins', () => {
  // Two courses, neither actually touched: one has a progress row whose
  // timestamp is null, which a row can carry and which means nothing. The
  // fallback is the enrolment date, so the newer one leads.
  const order = rankEnrolments(
    [enrolment('touched', '2026-09-01T00:00:00Z'), enrolment('never', '2026-10-20T00:00:00Z')],
    [seen('never', null)],
  );

  assert.deepEqual(order, ['never', 'touched']);
});

test('a null timestamp does not outrank a real one', () => {
  const order = rankEnrolments(
    [enrolment('touched', '2026-09-01T00:00:00Z'), enrolment('null-row', '2026-10-20T00:00:00Z')],
    [seen('null-row', null), seen('touched', '2026-10-01T00:00:00Z')],
  );

  assert.deepEqual(order, ['touched', 'null-row'], 'a null timestamp was treated as the newest activity');
});

test('activity for an enrolment that is not in the list is ignored', () => {
  const order = rankEnrolments([enrolment('mine', '2026-09-01T00:00:00Z')], [
    seen('somebody-elses', '2026-10-30T00:00:00Z'),
  ]);

  assert.deepEqual(order, ['mine'], 'a stray row displaced a real enrolment');
});

test('a tie is broken the same way twice', () => {
  const same = '2026-10-10T00:00:00Z';
  const rows = [seen('a', same), seen('b', same)];
  const enrolments = [enrolment('a', same), enrolment('b', same)];

  const once = rankEnrolments(enrolments, rows);
  const twice = rankEnrolments([...enrolments].reverse(), [...rows].reverse());

  assert.deepEqual(once, twice, 'the dashboard order depended on the order rows arrived');
  assert.deepEqual(once, ['a', 'b']);
});

test('no enrolments is an empty order', () => {
  assert.deepEqual(rankEnrolments([], [seen('x', '2026-10-01T00:00:00Z')]), []);
});
