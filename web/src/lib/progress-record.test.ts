import assert from 'node:assert/strict';
import test from 'node:test';

import {
  badgeFraction,
  badgeProgress,
  barWidth,
  calendarWeeks,
  courseSummary,
  earnedCount,
  monthLabels,
  numberWord,
  orderBadges,
  prettyDate,
  streakHeadline,
  type Badge,
} from './progress-record.ts';

const badge = (over: Partial<Badge> = {}): Badge => ({
  code: 'ten_lessons',
  name: 'Ten lessons',
  description: 'Finished ten lessons.',
  earned: false,
  earnedOn: null,
  have: 0,
  need: 10,
  unit: 'lesson',
  ...over,
});

// ---------------------------------------------------------------------------
// The calendar
// ---------------------------------------------------------------------------

test('twelve columns of seven days, ending in the week that contains today', () => {
  // 2026-10-26 is a Monday.
  const weeks = calendarWeeks([], '2026-10-26', { weeks: 12, startOfWeek: 0 });

  assert.equal(weeks.length, 12);
  assert.ok(weeks.every((w) => w.length === 7));
  // Sunday-start week containing Monday the 26th is 25 Oct .. 31 Oct.
  assert.equal(weeks[11]![0]!.date, '2026-10-25');
  assert.equal(weeks[11]![6]!.date, '2026-10-31');
});

test('the first column starts exactly eleven weeks before the last', () => {
  const weeks = calendarWeeks([], '2026-10-26', { weeks: 12 });
  const first = weeks[0]![0]!.date;
  const lastStart = weeks[11]![0]!.date;

  const span = (Date.parse(`${lastStart}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000;
  assert.equal(span, 11 * 7);
});

test('a studied day is marked and every other square is not', () => {
  const weeks = calendarWeeks(['2026-10-26', '2026-10-20'], '2026-10-26');
  const all = weeks.flat();

  assert.equal(all.filter((d) => d.studied).length, 2);
  assert.equal(all.find((d) => d.date === '2026-10-26')?.studied, true);
  assert.equal(all.find((d) => d.date === '2026-10-25')?.studied, false);
});

test('days after today are never marked studied', () => {
  // A day in the same column but after today must not be lit even if the
  // database somehow returned it.
  const weeks = calendarWeeks(['2026-10-31'], '2026-10-26');
  const future = weeks.flat().find((d) => d.date === '2026-10-31');

  assert.equal(future?.studied, false);
});

test('a Monday-first calendar starts its columns on Monday', () => {
  const weeks = calendarWeeks([], '2026-10-26', { startOfWeek: 1 });

  assert.equal(weeks[11]![0]!.date, '2026-10-26');
});

test('a rubbish date yields no calendar rather than a broken one', () => {
  assert.deepEqual(calendarWeeks([], 'not-a-date'), []);
});

test('month labels appear only when the month changes', () => {
  const weeks = calendarWeeks([], '2026-10-26', { weeks: 12 });
  const labels = monthLabels(weeks);

  assert.equal(labels.length, 12);

  // Twelve weeks ending in October covers August, September and October, so
  // three months are named and every other column is blank.
  const named = labels.filter((l): l is string => l !== null);
  assert.equal(named.length, 3, `named months were ${named.join(', ')}`);
  assert.equal(named[named.length - 1], 'October');
  assert.equal(new Set(named).size, named.length, 'a month was labelled twice');
});

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

test('an unearned badge says how many are left, in words', () => {
  assert.equal(badgeProgress(badge({ have: 8, need: 10 })), 'Two more lessons');
  assert.equal(badgeProgress(badge({ have: 7, need: 10 })), 'Three more lessons');
  assert.equal(badgeProgress(badge({ have: 9, need: 10 })), 'One more lesson');
});

test('an earned badge says when, not how many', () => {
  assert.equal(
    badgeProgress(badge({ earned: true, earnedOn: '2026-10-12', have: 10 })),
    'Earned 12 Oct',
  );
});

test('an earned badge with no date still says earned', () => {
  assert.equal(badgeProgress(badge({ earned: true, earnedOn: null, have: 10 })), 'Earned');
});

test('a badge the database has caught up with never says "0 more"', () => {
  assert.equal(badgeProgress(badge({ earned: false, have: 10, need: 10 })), 'Earned');
});

test('a singular unit stays singular and a plural one does not double up', () => {
  assert.equal(badgeProgress(badge({ have: 5, need: 6, unit: 'course' })), 'One more course');
  assert.equal(badgeProgress(badge({ have: 0, need: 3, unit: 'course' })), 'Three more courses');
});

test('the bar is a fraction of the threshold, never past full', () => {
  assert.equal(badgeFraction(badge({ have: 5, need: 10 })), 0.5);
  assert.equal(badgeFraction(badge({ have: 40, need: 10 })), 1);
  assert.equal(badgeFraction(badge({ have: 0, need: 0, earned: true })), 1);
});

test('earned badges come first, and each group keeps its order', () => {
  const ordered = orderBadges([
    badge({ code: 'a' }),
    badge({ code: 'b', earned: true }),
    badge({ code: 'c' }),
    badge({ code: 'd', earned: true }),
  ]);

  assert.deepEqual(ordered.map((b) => b.code), ['b', 'd', 'a', 'c']);
  assert.equal(earnedCount(ordered), 2);
});

// ---------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------

test('no streak is a fact plus the next step, not a zero', () => {
  assert.match(streakHeadline(0, 0), /Finish a lesson to start one/);
  assert.match(streakHeadline(0, 9), /Your best is 9 days/);
  assert.doesNotMatch(streakHeadline(0, 9), /0 days/);
});

test('a live streak behind the best says so; a record says so too', () => {
  assert.match(streakHeadline(3, 9), /3 days in a row — your best is 9 days/);
  assert.match(streakHeadline(9, 9), /your best so far/);
  assert.match(streakHeadline(1, 1), /1 day in a row/);
});

test('numbers under twenty-one are words', () => {
  assert.equal(numberWord(2), 'two');
  assert.equal(numberWord(20), 'twenty');
  assert.equal(numberWord(25), '25');
});

test('dates are day and month, and nonsense is empty rather than "NaN"', () => {
  assert.equal(prettyDate('2026-10-12'), '12 Oct');
  assert.equal(prettyDate(null), '');
  assert.equal(prettyDate('nonsense'), '');
});

test('the course sentence counts what is in progress and what is finished', () => {
  const course = (status: string) => ({
    enrolmentId: 'e', courseTitle: 'C', courseSlug: 'c', status,
    lessonsDone: 0, lessonsTotal: 1, percentComplete: 0,
  });

  assert.equal(courseSummary([course('active'), course('completed')]), '1 course in progress · 1 finished');
  assert.equal(courseSummary([course('active'), course('active')]), '2 courses in progress');
  assert.match(courseSummary([]), /The catalogue is where a course starts/);
});

test('the bar width is clamped and rounded so the label and the bar agree', () => {
  assert.equal(barWidth(41.6), '42%');
  assert.equal(barWidth(-5), '0%');
  assert.equal(barWidth(140), '100%');
  assert.equal(barWidth(NaN), '0%');
});

test('a guardian reading a child\'s record is not told "your best"', () => {
  const line = streakHeadline(4, 11, 'they');

  assert.match(line, /their best is 11 days/);
  assert.doesNotMatch(line, /your best/);
});

test('the no-streak prompt follows the same pronoun', () => {
  assert.match(streakHeadline(0, 0, 'you'), /Finish a lesson/);
  assert.match(streakHeadline(0, 0, 'they'), /They finish a lesson/);
  assert.match(streakHeadline(0, 6, 'they'), /Their best is 6 days/);
});
