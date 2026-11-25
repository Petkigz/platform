/**
 * Progress and achievements, said in the reader's language.
 *
 * `progress-record.ts` holds the same sentences in English and is what the
 * tests of the arithmetic read. This is what the page and the streak strip
 * draw with since 2026-11-25: every sentence is a key in the `prog.` part,
 * every number is written in the reader's digits, and a count takes the form
 * its language wants.
 *
 * A badge is named by its code. The database also sends a name and a
 * description, in English; they are what a reader sees for a badge this file
 * has never heard of, and the caller marks them as English.
 *
 * Server only: it reads the catalogues. The page and the strip are drawn on
 * the server, so nothing here reaches a browser as a script.
 */
import {
  countLabel,
  formatNumber,
  translator,
  type LocaleCode,
  type MessageKey,
} from './i18n/index.ts';
import { numberWord, type Badge, type RecordCourse } from './progress-record.ts';

export type Who = 'you' | 'they';

const BADGES: Record<string, { name: MessageKey; why: MessageKey }> = {
  first_lesson: { name: 'prog.bFirstLesson', why: 'prog.bFirstLessonWhy' },
  ten_lessons: { name: 'prog.bTenLessons', why: 'prog.bTenLessonsWhy' },
  fifty_lessons: { name: 'prog.bFiftyLessons', why: 'prog.bFiftyLessonsWhy' },
  first_course: { name: 'prog.bFirstCourse', why: 'prog.bFirstCourseWhy' },
  three_courses: { name: 'prog.bThreeCourses', why: 'prog.bThreeCoursesWhy' },
  first_certificate: { name: 'prog.bFirstCert', why: 'prog.bFirstCertWhy' },
  seven_day_streak: { name: 'prog.bWeek', why: 'prog.bWeekWhy' },
  thirty_day_streak: { name: 'prog.bMonth', why: 'prog.bMonthWhy' },
};

const MORE: Record<string, { one: MessageKey; other: MessageKey }> = {
  lesson: { one: 'prog.moreLessonOne', other: 'prog.moreLessonOther' },
  course: { one: 'prog.moreCourseOne', other: 'prog.moreCourseOther' },
  certificate: { one: 'prog.moreCertOne', other: 'prog.moreCertOther' },
  day: { one: 'prog.moreDayOne', other: 'prog.moreDayOther' },
};

/** A calendar day that was stored with no time, read as it was written. */
function utc(isoDate: string | null | undefined): Date | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/u.exec(isoDate ?? '');
  if (!parts) return null;
  const when = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return Number.isNaN(when.getTime()) ? null : when;
}

function dated(code: LocaleCode, when: Date | null, options: Intl.DateTimeFormatOptions): string {
  if (!when) return '';
  try {
    // English keeps the order this page always wrote: "12 Oct".
    return new Intl.DateTimeFormat(code === 'en' ? 'en-GB' : code, { ...options, timeZone: 'UTC' }).format(when);
  } catch {
    return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(when);
  }
}

export function progressWords(code: LocaleCode) {
  const t = translator(code);
  const num = (value: number) => formatNumber(code, value);
  const days = (count: number) => countLabel(code, count, { one: 'prog.dayOne', other: 'prog.dayOther' });
  /** "3 days in a row", or that there is no streak yet. */
  const row = (count: number): string => {
    if (!Number.isFinite(count) || count <= 0) return t('prog.rowNone');
    return countLabel(code, Math.trunc(count), { one: 'prog.rowOne', other: 'prog.rowOther' });
  };

  return {
    t,
    num,
    days,
    /** "12 Oct": a day without a year, because every date on the page is recent. */
    day: (isoDate: string | null | undefined) => dated(code, utc(isoDate), { day: 'numeric', month: 'short' }),
    /**
     * The month above a column of the calendar. English keeps the whole name
     * it always had; the others are given the short one, because a column is
     * twelve pixels wide and nobody has looked at "செப்டம்பர்" over it.
     */
    month: (isoDate: string) => dated(code, utc(isoDate), { month: code === 'en' ? 'long' : 'short' }),
    /**
     * One letter for a weekday, Sunday first: 2023-01-01 was a Sunday. "One
     * letter" is one written unit, which in Tamil or Hindi is a consonant with
     * its vowel; Filipino's narrow form is three letters, and the gutter has
     * room for one.
     */
    weekday(index: number): string {
      const narrow = dated(code, new Date(Date.UTC(2023, 0, 1 + index)), { weekday: 'narrow' });
      try {
        const first = new Intl.Segmenter(code, { granularity: 'grapheme' }).segment(narrow)[Symbol.iterator]().next();
        return first.done ? narrow : first.value.segment;
      } catch {
        return narrow;
      }
    },
    /** A whole percentage between 0 and 100, in the reader's digits; the sentence carries the sign. */
    percent: (value: number) => num(Math.min(100, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)))),
    streak: row,

    /**
     * The sentence under the streak. A streak that is not alive is a fact and
     * the next step, never "0 days in a row"; and "your best" on a child's
     * record, read by a parent, would be about the wrong person.
     */
    headline(count: number, longest: number, who: Who): string {
      const you = who === 'you';
      if (count <= 0) {
        if (longest > 0) return t(you ? 'prog.noStreakBestYou' : 'prog.noStreakBestThey', { best: days(longest) });
        return t(you ? 'prog.noStreakYou' : 'prog.noStreakThey');
      }
      if (longest > count) {
        return t(you ? 'prog.rowBestYou' : 'prog.rowBestThey', { row: row(count), best: days(longest) });
      }
      return t(you ? 'prog.rowTopYou' : 'prog.rowTopThey', { row: row(count) });
    },

    /** Null for a badge with no words here: the caller shows the database's, marked as English. */
    badgeName: (badge: Pick<Badge, 'code'>): string | null =>
      Object.hasOwn(BADGES, badge.code) ? t(BADGES[badge.code]!.name) : null,
    badgeWhy: (badge: Pick<Badge, 'code'>): string | null =>
      Object.hasOwn(BADGES, badge.code) ? t(BADGES[badge.code]!.why) : null,

    /**
     * How far a badge has got. "Two more lessons" is a goal and "2/10" is a
     * fraction; the page is for a child as well as an adult. English keeps
     * its small numbers as words; another language is given its own digits.
     */
    badgeProgress(badge: Badge): string {
      if (badge.earned) {
        const on = dated(code, utc(badge.earnedOn), { day: 'numeric', month: 'short' });
        return on ? t('prog.earnedOn', { date: on }) : t('prog.earned');
      }
      const remaining = Math.max(0, badge.need - badge.have);
      // The database will catch up; never say "0 more".
      if (remaining === 0) return t('prog.earned');
      const keys = Object.hasOwn(MORE, badge.unit) ? MORE[badge.unit]! : MORE.lesson!;
      if (code !== 'en') return countLabel(code, remaining, keys);
      const word = numberWord(remaining);
      return t(remaining === 1 ? keys.one : keys.other, { count: `${word[0]!.toUpperCase()}${word.slice(1)}` });
    },

    /** The line over the courses. Nothing enrolled is not a failure: it offers the catalogue. */
    courseSummary(courses: Pick<RecordCourse, 'status'>[]): string {
      const active = courses.filter((c) => c.status === 'active').length;
      const done = courses.filter((c) => c.status === 'completed').length;
      if (courses.length === 0) return t('prog.nothingOn');
      const parts: string[] = [];
      if (active > 0) parts.push(countLabel(code, active, { one: 'prog.inProgressOne', other: 'prog.inProgressOther' }));
      if (done > 0) parts.push(countLabel(code, done, { one: 'prog.finishedOne', other: 'prog.finishedCount' }));
      return parts.join(' · ');
    },

    /** The three things the strip says under a streak, joined the way a list of facts is. */
    strip(engagement: { streakDays: number; longestStreakDays: number; lessonsCompleted: number }, who: Who): string {
      const you = who === 'you';
      const parts = [
        countLabel(code, engagement.lessonsCompleted, { one: 'prog.lessonsDoneOne', other: 'prog.lessonsDoneOther' }),
      ];
      if (engagement.longestStreakDays > engagement.streakDays) {
        parts.push(t(you ? 'prog.bestYou' : 'prog.bestThey', { count: num(engagement.longestStreakDays) }));
      }
      parts.push(
        engagement.streakDays === 0
          ? t(you ? 'prog.startYou' : 'prog.startThey')
          : t(you ? 'prog.keepYou' : 'prog.keepThey'),
      );
      return parts.join(' · ');
    },
  };
}
