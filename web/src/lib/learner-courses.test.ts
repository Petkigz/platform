import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  certificateLine,
  groupLearnerCourses,
  lastActivityLabel,
  parseLearnerCourse,
  parseLearnerCourses,
  progressSentence,
  statusLabel,
  type LearnerCourse,
  type LearnerCourseCopy,
} from './learner-courses.ts';
import { en } from './i18n/messages/en.ts';
import { fill } from './i18n/format.ts';

// The sentences are the catalogue's; the page hands the functions its own way
// of saying them. This is the English page's, with a day written the way the
// boundaries below are easiest to read.
const copy: LearnerCourseCopy = {
  say: (key, vars) => fill(en[key], vars),
  number: String,
  day: (when) => when.toISOString().slice(0, 10),
  plural: (count) => (count === 1 ? 'one' : 'other'),
};

const row = (over: Record<string, unknown> = {}) => ({
  enrolment_id: '2f1c0000-0000-4000-8000-000000000001',
  course_id: '2f1c0000-0000-4000-8000-000000000002',
  course_slug: 'tajweed-basics',
  course_title: 'Tajweed Basics',
  enrolment_status: 'active',
  enrolled_at: '2026-10-01T09:00:00Z',
  lessons_completed: 3,
  lessons_in_version: 10,
  percent_complete: '30.00',
  last_activity_at: '2026-11-01T18:00:00Z',
  certificate_number: null,
  certificate_status: null,
  ...over,
});

const course = (over: Partial<LearnerCourse> = {}): LearnerCourse => ({
  ...(parseLearnerCourse(row()) as LearnerCourse),
  ...over,
});

test('a row without an enrolment or a title is not a course card', () => {
  assert.deepEqual(parseLearnerCourse(row()), parseLearnerCourse(row()),
    'the same row parsed twice gave two answers');
  assert.equal(parseLearnerCourse(row({ enrolment_id: null })), null);
  assert.equal(parseLearnerCourse(row({ course_title: '' })), null);
  assert.equal(parseLearnerCourse(null), null);
  assert.equal(parseLearnerCourse('nonsense'), null);
});

test('the numbers are the database’s, and a missing one is zero rather than NaN', () => {
  const parsed = parseLearnerCourse(row())!;
  assert.equal(parsed.lessonsDone, 3);
  assert.equal(parsed.lessonsTotal, 10);
  assert.equal(parsed.percentComplete, 30);

  const empty = parseLearnerCourse(row({
    lessons_completed: null, lessons_in_version: null, percent_complete: null,
  }))!;
  assert.equal(empty.lessonsDone, 0);
  assert.equal(empty.lessonsTotal, 0);
  assert.equal(empty.percentComplete, 0);
  assert.ok(Number.isFinite(empty.percentComplete), 'a missing percentage became NaN');
});

test('a percentage outside 0–100 is clamped, because a bar cannot be wider than the page', () => {
  assert.equal(parseLearnerCourse(row({ percent_complete: 140 }))!.percentComplete, 100);
  assert.equal(parseLearnerCourse(row({ percent_complete: -5 }))!.percentComplete, 0);
});

test('the list keeps the order the database gave: most recently active first', () => {
  const courses = parseLearnerCourses([
    row({ enrolment_id: 'a', course_title: 'Recent', last_activity_at: '2026-11-02T08:00:00Z' }),
    row({ enrolment_id: 'b', course_title: 'Older', last_activity_at: '2026-10-01T08:00:00Z' }),
    row({ enrolment_id: 'c', course_title: 'Never', last_activity_at: null }),
  ]);

  assert.deepEqual(courses.map((c) => c.courseTitle), ['Recent', 'Older', 'Never'],
    'the client re-sorted the database’s answer');
});

test('a course that stopped is kept and said in words, not dropped', () => {
  const courses = [
    course({ enrolmentId: 'a', status: 'active' }),
    course({ enrolmentId: 'b', status: 'completed' }),
    course({ enrolmentId: 'c', status: 'suspended' }),
    course({ enrolmentId: 'd', status: 'expired' }),
  ];

  const grouped = groupLearnerCourses(courses);
  assert.deepEqual(grouped.active.map((c) => c.enrolmentId), ['a']);
  assert.deepEqual(grouped.finished.map((c) => c.enrolmentId), ['b']);
  assert.deepEqual(grouped.stopped.map((c) => c.enrolmentId), ['c', 'd']);

  assert.equal(statusLabel(course({ status: 'active' }), copy), null,
    'an ordinary course got a badge it does not need');
  assert.match(statusLabel(course({ status: 'suspended' }), copy)!, /Paused by the teacher/);
  assert.match(statusLabel(course({ status: 'expired' }), copy)!, /No longer available/);
});

test('progress and certificates are said in the same words every time', () => {
  assert.equal(progressSentence(course({ lessonsDone: 3, lessonsTotal: 10, percentComplete: 30 }), copy),
    '3 of 10 lessons · 30%');
  // The dashboard's sentence (`learn.lessonsDone`), which has one form: the
  // word after "of" is not inflected for the total in any language here.
  assert.equal(progressSentence(course({ lessonsDone: 1, lessonsTotal: 1, percentComplete: 100 }), copy),
    '1 of 1 lessons · 100%');
  assert.equal(progressSentence(course({ lessonsDone: 0, lessonsTotal: 0, percentComplete: 0 }), copy),
    'No lessons in this course yet');

  assert.equal(certificateLine(course({ certificateNumber: null }), copy), null);
  assert.equal(
    certificateLine(course({ certificateNumber: 'AY-2026-0001', certificateStatus: 'issued' }), copy),
    'Certificate AY-2026-0001');
  // A revoked certificate stays on the card: it was issued, and the record of that
  // is the honest answer to "what happened to mine?".
  assert.match(
    certificateLine(course({ certificateNumber: 'AY-2026-0001', certificateStatus: 'revoked' }), copy)!,
    /revoked/);
});

test('last activity is coarse on purpose, and the boundaries are pinned', () => {
  const now = new Date('2026-11-02T12:00:00Z');
  assert.equal(lastActivityLabel(null, copy, now), 'Not started yet');
  assert.equal(lastActivityLabel('2026-11-02T09:00:00Z', copy, now), 'Active today');
  assert.equal(lastActivityLabel('2026-11-01T09:00:00Z', copy, now), 'Active yesterday');
  assert.equal(lastActivityLabel('2026-10-30T09:00:00Z', copy, now), 'Active 3 days ago');
  assert.equal(lastActivityLabel('2026-10-20T09:00:00Z', copy, now), 'Active 1 week ago');
  assert.equal(lastActivityLabel('2026-10-10T09:00:00Z', copy, now), 'Active 3 weeks ago');
  assert.equal(lastActivityLabel('2026-08-01T09:00:00Z', copy, now), 'Last active 2026-08-01');

  // Two weeks is the first count that takes the other form in English.
  assert.equal(lastActivityLabel('2026-10-18T09:00:00Z', copy, now), 'Active 2 weeks ago');
  // A language whose "one" form covers more numbers than one is asked, not assumed.
  assert.equal(
    lastActivityLabel('2026-10-10T09:00:00Z', { ...copy, plural: () => 'one' }, now),
    'Active 3 week ago');

  // The exact minute a child sat down to study is not something this page prints.
  assert.ok(!/:\d\d/.test(lastActivityLabel('2026-11-02T09:41:00Z', copy, now)),
    'a time of day leaked into a guardian-facing sentence');
});

test('the page reads the function that enforces the boundary, not a table', () => {
  const page = readFileSync(
    new URL('../app/family/[childId]/page.tsx', import.meta.url), 'utf8');

  assert.match(page, /rpc\('learner_across_courses'/,
    'the child page queries the table directly, so the boundary is client-side');
  assert.match(page, /parseLearnerCourses\(/);
  // The four things the view exists for. A page that shows courses without them is
  // the screen that already existed.
  for (const [name, fn] of [
    ['progress', 'progressSentence'],
    ['last activity', 'lastActivityLabel'],
    ['certificate', 'certificateLine'],
    ['status badge', 'statusLabel'],
  ]) {
    assert.ok(page.includes(`${fn}(`), `the page does not render the ${name}`);
  }
});
