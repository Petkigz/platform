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
} from './learner-courses.ts';

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

  assert.equal(statusLabel(course({ status: 'active' })), null,
    'an ordinary course got a badge it does not need');
  assert.match(statusLabel(course({ status: 'suspended' }))!, /Paused by the teacher/);
  assert.match(statusLabel(course({ status: 'expired' }))!, /No longer available/);
});

test('progress and certificates are said in the same words every time', () => {
  assert.equal(progressSentence(course({ lessonsDone: 3, lessonsTotal: 10, percentComplete: 30 })),
    '3 of 10 lessons · 30%');
  assert.equal(progressSentence(course({ lessonsDone: 1, lessonsTotal: 1, percentComplete: 100 })),
    '1 of 1 lesson · 100%');
  assert.equal(progressSentence(course({ lessonsDone: 0, lessonsTotal: 0, percentComplete: 0 })),
    'No lessons in this course yet');

  assert.equal(certificateLine(course({ certificateNumber: null })), null);
  assert.equal(
    certificateLine(course({ certificateNumber: 'AY-2026-0001', certificateStatus: 'issued' })),
    'Certificate AY-2026-0001');
  // A revoked certificate stays on the card: it was issued, and the record of that
  // is the honest answer to "what happened to mine?".
  assert.match(
    certificateLine(course({ certificateNumber: 'AY-2026-0001', certificateStatus: 'revoked' }))!,
    /revoked/);
});

test('last activity is coarse on purpose, and the boundaries are pinned', () => {
  const now = new Date('2026-11-02T12:00:00Z');
  assert.equal(lastActivityLabel(null, now), 'Not started yet');
  assert.equal(lastActivityLabel('2026-11-02T09:00:00Z', now), 'Active today');
  assert.equal(lastActivityLabel('2026-11-01T09:00:00Z', now), 'Active yesterday');
  assert.equal(lastActivityLabel('2026-10-30T09:00:00Z', now), 'Active 3 days ago');
  assert.equal(lastActivityLabel('2026-10-20T09:00:00Z', now), 'Active 1 week ago');
  assert.equal(lastActivityLabel('2026-10-10T09:00:00Z', now), 'Active 3 weeks ago');
  assert.equal(lastActivityLabel('2026-08-01T09:00:00Z', now), 'Last active 2026-08-01');

  // The exact minute a child sat down to study is not something this page prints.
  assert.ok(!/:\d\d/.test(lastActivityLabel('2026-11-02T09:41:00Z', now)),
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
