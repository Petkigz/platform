/**
 * Progress and achievements, as the screen draws them.
 *
 * Everything numeric is decided by `learner_progress_record()`; this module
 * decides only the words and the layout. That split matters more here than
 * usual, because the two things a learner can be *told* — "two more lessons"
 * and "you earned this on Tuesday" — are the whole reason the page exists, and
 * a screen that invented either would be contradicting the record.
 *
 * The calendar is the fiddly part. A learner sees weeks as columns of seven
 * days, and the first column has to start on the right weekday for their
 * locale-run-of-days to make sense. `calendarWeeks` builds that grid from the
 * days the database returned and nothing else: a day it was not told about is
 * a blank square, never an assumption.
 */

export type Badge = {
  code: string;
  name: string;
  description: string;
  earned: boolean;
  earnedOn: string | null;
  have: number;
  need: number;
  unit: string;
};

export type RecordCourse = {
  enrolmentId: string;
  courseTitle: string;
  courseSlug: string;
  status: string;
  lessonsDone: number;
  lessonsTotal: number;
  percentComplete: number;
};

export type RecordCertificate = {
  certificateNumber: string;
  courseTitle: string;
  issuedOn: string;
  status: string;
};

export type ProgressRecord = {
  learnerProfileId: string;
  displayName: string | null;
  timezone: string;
  today: string;
  streakDays: number;
  longestStreakDays: number;
  lastActiveOn: string | null;
  totals: {
    lessonsCompleted: number;
    coursesCompleted: number;
    certificates: number;
    studyDays: number;
  };
  studyDays: string[];
  badges: Badge[];
  courses: RecordCourse[];
  certificates: RecordCertificate[];
};

/** One square of the calendar. `null` is a day nobody studied. */
export type CalendarDay = { date: string; studied: boolean };

/**
 * Weeks of the last `weeks` weeks ending on `today`, as columns of seven.
 *
 * `startOfWeek` follows the locale's convention: Sunday (0) by default, Monday
 * (1) where the person is used to it. The grid starts on the first day of the
 * week `weeks-1` weeks before today's week, so the final column always ends
 * today or later and the whole span is visible.
 */
export function calendarWeeks(
  studyDays: string[],
  today: string,
  { weeks = 12, startOfWeek = 0 }: { weeks?: number; startOfWeek?: number } = {},
): CalendarDay[][] {
  const studied = new Set(studyDays);
  const end = dayNumber(today);
  if (Number.isNaN(end)) return [];

  // Walk back to the first day of the week that is `weeks - 1` weeks back.
  const todayDate = new Date(`${today}T00:00:00Z`);
  const offset = (todayDate.getUTCDay() - startOfWeek + 7) % 7;
  const lastColumnStart = end - offset;
  const firstDay = lastColumnStart - (weeks - 1) * 7;

  const columns: CalendarDay[][] = [];
  for (let w = 0; w < weeks; w += 1) {
    const column: CalendarDay[] = [];
    for (let d = 0; d < 7; d += 1) {
      const n = firstDay + w * 7 + d;
      const date = dateFromDayNumber(n);
      // Days after today are shown as days nobody has lived through yet. They
      // are not "not studied" — they have not happened, and colouring them like
      // a missed day would be a small daily accusation.
      column.push({ date, studied: studied.has(date) && n <= end });
    }
    columns.push(column);
  }
  return columns;
}

/** The month names above a calendar, one per column that starts a new month. */
export function monthLabels(weeks: CalendarDay[][]): (string | null)[] {
  let previous = '';
  return weeks.map((week) => {
    const first = week[0]?.date;
    if (!first) return null;
    const month = first.slice(0, 7);
    if (month === previous) return null;
    previous = month;
    return monthName(first);
  });
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthName(isoDate: string): string {
  const m = Number(isoDate.slice(5, 7));
  return MONTHS[m - 1] ?? isoDate.slice(0, 7);
}

function dayNumber(isoDate: string): number {
  const ms = Date.parse(`${isoDate}T00:00:00Z`);
  return Number.isNaN(ms) ? NaN : Math.floor(ms / 86_400_000);
}

function dateFromDayNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * How far an unearned badge has got, said the way a person would say it.
 *
 * "Two more lessons" is a goal. "2/10" is a fraction. The page is for a child as
 * well as an adult, and the child is the one who needs the sentence.
 */
export function badgeProgress(badge: Badge): string {
  if (badge.earned) return badge.earnedOn ? `Earned ${prettyDate(badge.earnedOn)}` : 'Earned';

  const remaining = Math.max(0, badge.need - badge.have);
  if (remaining === 0) return 'Earned'; // the database will catch up; never say "0 more"
  // Capitalised because this stands on its own under the badge, rather than
  // being read as the tail of a sentence.
  if (remaining === 1) return `One more ${badge.unit}`;
  const word = numberWord(remaining);
  return `${word[0]!.toUpperCase()}${word.slice(1)} more ${plural(badge.unit, remaining)}`;
}

/**
 * How much of a badge is done, for the bar under it.
 *
 * A badge with a threshold of one is either done or not, so a bar would be a box
 * that is always empty or always full.
 */
export function badgeFraction(badge: Badge): number {
  if (badge.need <= 0) return badge.earned ? 1 : 0;
  return Math.min(1, Math.max(0, badge.have / badge.need));
}

/** Earned badges first, then the ones still ahead, each group in catalogue order. */
export function orderBadges(badges: Badge[]): Badge[] {
  return [...badges.filter((b) => b.earned), ...badges.filter((b) => !b.earned)];
}

export function earnedCount(badges: Badge[]): number {
  return badges.filter((b) => b.earned).length;
}

/**
 * The heading over the streak.
 *
 * The distinction that matters is between a streak that is alive and one that
 * is not. "0 days in a row" is a scolding; "no streak at the moment" is a fact,
 * followed by the one that makes the next step obvious.
 */
export function streakHeadline(days: number, longest: number, who: 'you' | 'they' = 'you'): string {
  // "your best" on a child's card, read by their parent, would be a sentence
  // about the wrong person. The pronoun is the caller's, because only the caller
  // knows whose card this is.
  const possessive = who === 'you' ? 'your' : 'their';
  const verb = who === 'you' ? 'Finish' : 'They finish';

  if (days <= 0) {
    return longest > 0
      ? `No streak at the moment. ${capitalise(possessive)} best is ${days_plural(longest)}.`
      : `No streak yet. ${verb} a lesson to start one.`;
  }
  if (longest > days) {
    return `${days_plural(days)} in a row — ${possessive} best is ${days_plural(longest)}.`;
  }
  return `${days_plural(days)} in a row — ${possessive} best so far.`;
}

function capitalise(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

function days_plural(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

function plural(unit: string, n: number): string {
  if (n === 1) return unit;
  return unit.endsWith('s') ? unit : `${unit}s`;
}

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen', 'twenty',
];

/** Small numbers as words, because "2 more lessons" reads like a scoreboard. */
export function numberWord(n: number): string {
  if (n >= 0 && n < WORDS.length) return WORDS[n]!;
  return String(n);
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "12 Oct" — a day without a year, because every date on this page is recent. */
export function prettyDate(isoDate: string | null): string {
  if (!isoDate || isoDate.length < 10) return '';
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const name = MONTH_SHORT[month - 1];
  if (!name || Number.isNaN(day)) return '';
  return `${day} ${name}`;
}

/**
 * The sentence above the courses, and the empty one.
 *
 * A learner with nothing enrolled is not a failure state — they may have
 * finished everything — so the empty sentence offers the catalogue rather than
 * reporting an absence.
 */
export function courseSummary(courses: RecordCourse[]): string {
  const active = courses.filter((c) => c.status === 'active').length;
  const done = courses.filter((c) => c.status === 'completed').length;
  if (courses.length === 0) return 'Nothing on the go. The catalogue is where a course starts.';
  const parts: string[] = [];
  if (active > 0) parts.push(`${active} ${active === 1 ? 'course' : 'courses'} in progress`);
  if (done > 0) parts.push(`${done} finished`);
  return parts.join(' · ');
}

/** Clamp a percentage the way the bar does, so the label and the width agree. */
export function barWidth(percent: number): string {
  const p = Number.isFinite(percent) ? percent : 0;
  return `${Math.min(100, Math.max(0, Math.round(p)))}%`;
}
