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

/** `3 of 10 lessons · 30%` — the same sentence every screen uses for progress. */
export function progressSentence(course: LearnerCourse): string {
  const percent = Math.round(course.percentComplete);
  const lessons = `${course.lessonsDone} of ${course.lessonsTotal} lesson${
    course.lessonsTotal === 1 ? '' : 's'
  }`;
  return course.lessonsTotal === 0 ? 'No lessons in this course yet' : `${lessons} · ${percent}%`;
}

/** What the badge says, and why it is a word rather than a colour. */
export function statusLabel(course: LearnerCourse): string | null {
  if (course.status === 'completed') return 'Finished';
  if (course.status === 'suspended') return 'Paused by the teacher';
  if (course.status === 'expired') return 'No longer available';
  return null;
}

/**
 * What the certificate line says. A revoked certificate stays on the card — it was
 * issued, and "what happened to mine?" is a question the page answers rather than
 * hides.
 */
export function certificateLine(course: LearnerCourse): string | null {
  if (!course.certificateNumber) return null;
  return course.certificateStatus === 'revoked'
    ? `Certificate ${course.certificateNumber} — revoked`
    : `Certificate ${course.certificateNumber}`;
}

/**
 * When this learner last opened a lesson, in words a parent reads.
 *
 * Deliberately coarse: the exact minute a child sat down to study is not something
 * a page should broadcast, and "this week" answers the question a guardian has.
 * `now` is a parameter so the test can pin the boundaries.
 */
export function lastActivityLabel(lastActivityAt: string | null, now: Date = new Date()): string {
  if (!lastActivityAt) return 'Not started yet';
  const then = new Date(lastActivityAt);
  if (Number.isNaN(then.getTime())) return 'Not started yet';

  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  if (days < 7) return `Active ${days} days ago`;
  if (days < 30) return `Active ${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  return `Last active ${then.toISOString().slice(0, 10)}`;
}
