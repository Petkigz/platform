import assert from 'node:assert/strict';
import test from 'node:test';

import { carryOnHeading, continuePoint, type ContinueRow } from './continue-point.ts';
import { flattenOutline, type OutlineSectionRow } from './outline.ts';

const outline: OutlineSectionRow[] = [
  {
    id: 's1',
    title: 'Foundations',
    position: 1,
    lessons: [
      { id: 'l1', title: 'The pillars', position: 1 },
      { id: 'l2', title: 'Who is a Muslim?', position: 2 },
    ],
  },
  {
    id: 's2',
    title: 'Prayer',
    position: 2,
    lessons: [
      { id: 'l3', title: 'The conditions of prayer', position: 1 },
      { id: 'l4', title: 'Wudu in practice', position: 2 },
    ],
  },
];

const steps = flattenOutline(outline);
const row = (lesson_id: string, status: ContinueRow['status'], last_seen_at: string): ContinueRow => ({
  lesson_id,
  status,
  last_seen_at,
});

test('a brand new course starts at the first lesson', () => {
  const point = continuePoint(steps, []);

  assert.equal(point?.lesson.id, 'l1');
  assert.equal(point?.index, 1);
  assert.equal(point?.total, 4);
  assert.equal(point?.reason, 'next');
});

test('an unfinished lesson is resumed, not skipped past', () => {
  const point = continuePoint(steps, [
    row('l1', 'completed', '2026-10-01T09:00:00Z'),
    row('l2', 'in_progress', '2026-10-02T09:00:00Z'),
  ]);

  assert.equal(point?.lesson.id, 'l2');
  assert.equal(point?.reason, 'resume');
});

test('the most recently touched unfinished lesson wins', () => {
  const point = continuePoint(steps, [
    row('l2', 'in_progress', '2026-10-01T09:00:00Z'),
    row('l4', 'in_progress', '2026-10-03T09:00:00Z'),
    row('l3', 'in_progress', '2026-10-02T09:00:00Z'),
  ]);

  assert.equal(point?.lesson.id, 'l4');
});

test('a finished last lesson does not become a resume', () => {
  // The defect this rule exists to prevent: "last touched" points back at
  // something already done, and the button goes nowhere useful.
  const point = continuePoint(steps, [
    row('l2', 'completed', '2026-10-01T09:00:00Z'),
    row('l3', 'completed', '2026-10-02T09:00:00Z'),
    row('l4', 'completed', '2026-10-03T09:00:00Z'),
  ]);

  assert.equal(point?.lesson.id, 'l1');
  assert.equal(point?.reason, 'next');
});

test('a skipped lesson is not resumed and does not block the next one', () => {
  const point = continuePoint(steps, [
    row('l1', 'skipped', '2026-10-01T09:00:00Z'),
    row('l2', 'completed', '2026-10-02T09:00:00Z'),
  ]);

  assert.equal(point?.lesson.id, 'l3', 'the first unfinished lesson after l2');
  assert.equal(point?.reason, 'next');
});

test('a whole course finished has nothing to carry on with', () => {
  const point = continuePoint(steps, [
    row('l1', 'completed', '2026-10-01T09:00:00Z'),
    row('l2', 'completed', '2026-10-02T09:00:00Z'),
    row('l3', 'completed', '2026-10-03T09:00:00Z'),
    row('l4', 'completed', '2026-10-04T09:00:00Z'),
  ]);

  assert.equal(point, null);
});

test('progress for a lesson outside this version is ignored', () => {
  const point = continuePoint(steps, [
    row('from-an-old-version', 'in_progress', '2026-10-09T09:00:00Z'),
    row('l1', 'completed', '2026-10-01T09:00:00Z'),
  ]);

  assert.equal(point?.lesson.id, 'l2', 'a stale row was offered as the place to resume');
});

test('two rows written in the same millisecond still answer the same twice', () => {
  const rows = [
    row('l3', 'in_progress', '2026-10-02T09:00:00Z'),
    row('l2', 'in_progress', '2026-10-02T09:00:00Z'),
  ];

  const once = continuePoint(steps, rows)?.lesson.id;
  const twice = continuePoint(steps, [...rows].reverse())?.lesson.id;

  assert.equal(once, twice, 'the answer depended on the order the rows arrived');
  assert.equal(once, 'l2', 'the tie is broken by lesson id, ascending');
});

test('an empty course has no continue point', () => {
  assert.equal(continuePoint([], []), null);
  assert.equal(continuePoint(flattenOutline([]), []), null);
});

test('a missing timestamp sorts last rather than throwing', () => {
  const point = continuePoint(steps, [
    { lesson_id: 'l3', status: 'in_progress', last_seen_at: null },
    row('l2', 'in_progress', '2026-10-02T09:00:00Z'),
  ]);

  assert.equal(point?.lesson.id, 'l2');
});

test('the section title comes with the lesson', () => {
  const point = continuePoint(steps, []);

  assert.equal(point?.lesson.sectionTitle, 'Foundations');
  assert.equal(point?.lesson.title, 'The pillars');
});

test('a course never opened is started, not resumed', () => {
  const point = continuePoint(steps, []);
  const copy = carryOnHeading(point!, false);

  assert.equal(copy.eyebrow, 'Start the course');
  assert.equal(copy.action, 'Open lesson 1');
});

test('the middle of a lesson reads as carrying on', () => {
  const point = continuePoint(steps, [row('l2', 'in_progress', '2026-10-02T09:00:00Z')]);
  const copy = carryOnHeading(point!, true);

  assert.equal(copy.eyebrow, 'Carry on where you stopped');
  assert.equal(copy.action, 'Continue lesson 2');
});

test('a finished lesson leads to the next one, not back to itself', () => {
  const point = continuePoint(steps, [row('l1', 'completed', '2026-10-01T09:00:00Z')]);
  const copy = carryOnHeading(point!, true);

  assert.equal(copy.eyebrow, 'Next up');
  assert.equal(copy.action, 'Open lesson 2');
});
