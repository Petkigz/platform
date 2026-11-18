/**
 * One learner, every course — the shape a household reads.
 *
 * `learner_across_courses()` is the only definition of this list, and it is a
 * database function because the boundary belongs where the rows are: it refuses any
 * caller `can_access_learner()` does not admit, so a teacher, a stranger and a
 * grantee of a progress-only share all get nothing. This module is the client's
 * copy of the answer — the parsing, the ordering and the sentences.
 *
 * Two rules the copy follows, because both are how a list turns into a claim:
 *
 * 1. **A number comes from the database or is absent.** Completion is the same
 *    `enrolment_progress_summary()` the certificate engine reads; this file formats
 *    it and never recomputes it.
 * 2. **A course that stopped is shown.** Suspended and expired enrolments are rows
 *    here, because a course that quietly vanished from a child's page reads as
 *    "they are not doing it", which is a different fact from "it stopped".
 */

export type LearnerCourse = {
  enrolmentId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  status: 'active' | 'completed' | 'suspended' | 'expired' | string;
  enrolledAt: string | null;
  lessonsDone: number;
  lessonsTotal: number;
  percentComplete: number;
  lastActivityAt: string | null;
  certificateNumber: string | null;
  certificateStatus: 'issued' | 'revoked' | null;
};

/** The columns `learner_across_courses()` returns, in snake case. */
export type LearnerCourseRow = {
  enrolment_id?: unknown;
  course_id?: unknown;
  course_slug?: unknown;
  course_title?: unknown;
  enrolment_status?: unknown;
  enrolled_at?: unknown;
  lessons_completed?: unknown;
  lessons_in_version?: unknown;
  percent_complete?: unknown;
  last_activity_at?: unknown;
  certificate_number?: unknown;
  certificate_status?: unknown;
};

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parse one row, or null when it cannot be one.
 *
 * A row without an enrolment id or a course title is not a course card; showing it
 * as an untitled card would be worse than dropping it, and a test pins both.
 */
export function parseLearnerCourse(raw: unknown): LearnerCourse | null {
  const row = (raw && typeof raw === 'object' ? raw : {}) as LearnerCourseRow;
  const enrolmentId = text(row.enrolment_id);
  const courseTitle = text(row.course_title);
  if (!enrolmentId || !courseTitle) return null;

  const certificateStatus = text(row.certificate_status);

  return {
    enrolmentId,
    courseId: text(row.course_id),
    courseSlug: text(row.course_slug),
    courseTitle,
    status: text(row.enrolment_status) || 'active',
    enrolledAt: text(row.enrolled_at) || null,
    lessonsDone: num(row.lessons_completed),
    lessonsTotal: num(row.lessons_in_version),
    percentComplete: Math.max(0, Math.min(100, num(row.percent_complete))),
    lastActivityAt: text(row.last_activity_at) || null,
    certificateNumber: text(row.certificate_number) || null,
    certificateStatus:
      certificateStatus === 'issued' || certificateStatus === 'revoked' ? certificateStatus : null,
  };
}

export function parseLearnerCourses(data: unknown): LearnerCourse[] {
  if (!Array.isArray(data)) return [];
  return data
    .map(parseLearnerCourse)
    .filter((course): course is LearnerCourse => course !== null);
}

/**
 * Split the list the way a reader thinks about it.
 *
 * In progress first, then finished, then the courses that stopped — each in the
 * order the database gave, which is most recently active first. Nothing here
 * re-sorts: the database already answered "what is this learner doing now".
 */
export function groupLearnerCourses(courses: LearnerCourse[]): {
  active: LearnerCourse[];
  finished: LearnerCourse[];
  stopped: LearnerCourse[];
} {
  const active: LearnerCourse[] = [];
  const finished: LearnerCourse[] = [];
  const stopped: LearnerCourse[] = [];
  for (const course of courses) {
    if (course.status === 'completed') finished.push(course);
    else if (course.status === 'suspended' || course.status === 'expired') stopped.push(course);
    else active.push(course);
  }
  return { active, finished, stopped };
}

/**
 * The words, handed in.
 *
 * The four functions below used to return English. The page that calls them
 * is written in the reader's language now, so each takes the page's own way of
 * saying a named sentence, of writing a number, and of writing a day. The
 * decisions (which sentence, which boundary) are still made here, where a
 * test can pin them without a browser.
 */
export type LearnerCourseKey =
  | 'learn.lessonsDone'
  | 'family.noLessons'
  | 'family.stFinished'
  | 'family.stPaused'
  | 'family.stExpired'
  | 'family.cert'
  | 'family.certRevoked'
  | 'family.actNever'
  | 'family.actToday'
  | 'family.actYesterday'
  | 'family.actDays'
  | 'family.actWeeksOne'
  | 'family.actWeeksOther'
  | 'family.actOn';

export type LearnerCourseCopy = {
  /** The sentence with this name, with its places filled. */
  say: (key: LearnerCourseKey, vars?: Record<string, string | number>) => string;
  /** A number in the reader's digits. */
  number: (value: number) => string;
  /** A day and nothing finer: no time of day is ever passed through here. */
  day: (when: Date) => string;
  /** Which of the two forms this count takes in the reader's language. */
  plural: (count: number) => 'one' | 'other';
};

/** `3 of 10 lessons · 30%` — the same sentence the dashboard uses for progress. */
export function progressSentence(course: LearnerCourse, copy: LearnerCourseCopy): string {
  if (course.lessonsTotal === 0) return copy.say('family.noLessons');
  return copy.say('learn.lessonsDone', {
    done: copy.number(course.lessonsDone),
    total: copy.number(course.lessonsTotal),
    percent: copy.number(Math.round(course.percentComplete)),
  });
}

/** What the badge says, and why it is a word rather than a colour. */
export function statusLabel(course: LearnerCourse, copy: LearnerCourseCopy): string | null {
  if (course.status === 'completed') return copy.say('family.stFinished');
  if (course.status === 'suspended') return copy.say('family.stPaused');
  if (course.status === 'expired') return copy.say('family.stExpired');
  return null;
}

/**
 * What the certificate line says. A revoked certificate stays on the card — it was
 * issued, and "what happened to mine?" is a question the page answers rather than
 * hides. The number is the certificate's own and is not rewritten in other digits.
 */
export function certificateLine(course: LearnerCourse, copy: LearnerCourseCopy): string | null {
  if (!course.certificateNumber) return null;
  return copy.say(course.certificateStatus === 'revoked' ? 'family.certRevoked' : 'family.cert', {
    number: course.certificateNumber,
  });
}

/**
 * When this learner last opened a lesson, in words a parent reads.
 *
 * Deliberately coarse: the exact minute a child sat down to study is not something
 * a page should broadcast, and "this week" answers the question a guardian has.
 * `now` is a parameter so the test can pin the boundaries.
 */
export function lastActivityLabel(
  lastActivityAt: string | null,
  copy: LearnerCourseCopy,
  now: Date = new Date(),
): string {
  if (!lastActivityAt) return copy.say('family.actNever');
  const then = new Date(lastActivityAt);
  if (Number.isNaN(then.getTime())) return copy.say('family.actNever');

  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return copy.say('family.actToday');
  if (days === 1) return copy.say('family.actYesterday');
  if (days < 7) return copy.say('family.actDays', { count: copy.number(days) });
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return copy.say(copy.plural(weeks) === 'one' ? 'family.actWeeksOne' : 'family.actWeeksOther', {
      count: copy.number(weeks),
    });
  }
  return copy.say('family.actOn', { date: copy.day(then) });
}
