// Cohort-scoped learner analytics: the read side of DECISIONS.md, "What a teacher
// may see about a learner" (2026-10-19).
//
// Everything that decides *who* may see *whom* lives in the database, in
// `can_read_learner_course_progress()` and `cohort_learner_progress()`. This
// module only shapes what comes back: it coerces the row, and it turns counts
// into the sentence a teacher reads. Nothing here is a permission, and nothing
// here may become one — a screen that filtered this list would be a screen that
// shows a different answer from the one the database gave.
//
// Type-only Supabase import, so this is safe in the client bundle. It must never
// runtime-import a server-only module.

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Both flags have to be on for a teacher to see any of this. `learning.cohorts`
 * is the opt-in mechanism and `delivery.analytics` is the reporting feature;
 * the predicate checks them itself, so this list is for the screen's message,
 * not for enforcement.
 */
export const COHORT_ANALYTICS_FLAGS = ['learning.cohorts', 'delivery.analytics'] as const;

/**
 * How long without being seen counts as gone quiet. Fourteen days is a
 * fortnight: long enough that a week off is not a warning, short enough that a
 * teacher hears about it while the class is still running.
 */
export const STALL_DAYS = 14;

export type LearnerType = 'adult' | 'child' | string;

/** One row of `cohort_learner_progress()`, as the database returns it. */
type CohortLearnerProgressRow = {
  learner_profile_id: string;
  display_name: string;
  learner_type: LearnerType;
  age_band: string | null;
  joined_at: string | null;
  enrolment_id: string | null;
  enrolment_status: string | null;
  lessons_completed: number | string | null;
  lessons_in_progress: number | string | null;
  lessons_in_version: number | string | null;
  last_seen_at: string | null;
};

/** The same row, in the shape a screen uses. Counts are always numbers here. */
export type CohortLearnerProgress = {
  learnerProfileId: string;
  displayName: string;
  learnerType: LearnerType;
  ageBand: string | null;
  joinedAt: string | null;
  /** Null means the learner is in the class but has no enrolment in its version. */
  enrolmentId: string | null;
  enrolmentStatus: string | null;
  lessonsCompleted: number;
  lessonsInProgress: number;
  lessonsInVersion: number;
  lastSeenAt: string | null;
};

export type CohortAnalyticsResult =
  | { ok: true; rows: CohortLearnerProgress[] }
  | { ok: false; status: number; message: string };

export type CohortSummary = {
  learners: number;
  enrolled: number;
  finished: number;
  inProgress: number;
  notStarted: number;
  stalled: number;
  notEnrolled: number;
  averagePercent: number;
};

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.length === 0 ? null : text;
}

export function mapCohortLearnerRow(row: CohortLearnerProgressRow): CohortLearnerProgress {
  return {
    learnerProfileId: String(row.learner_profile_id),
    displayName: String(row.display_name ?? 'Unnamed learner'),
    learnerType: String(row.learner_type ?? 'adult'),
    ageBand: toText(row.age_band),
    joinedAt: toText(row.joined_at),
    enrolmentId: toText(row.enrolment_id),
    enrolmentStatus: toText(row.enrolment_status),
    lessonsCompleted: toNumber(row.lessons_completed),
    lessonsInProgress: toNumber(row.lessons_in_progress),
    lessonsInVersion: toNumber(row.lessons_in_version),
    lastSeenAt: toText(row.last_seen_at),
  };
}

/**
 * How much of the version is done, in whole percent. A version with no lessons
 * is 0 rather than a division by zero, and the answer is capped: a lesson moved
 * out of a version must not leave a learner at 120%.
 */
export function percentComplete(row: Pick<CohortLearnerProgress,
  'lessonsCompleted' | 'lessonsInVersion'>): number {
  const total = row.lessonsInVersion;
  if (total <= 0) return 0;
  const done = Math.min(row.lessonsCompleted, total);
  return Math.round((done / total) * 100);
}

/** The count, in words. `progressLabel` never guesses; it says what the rows say. */
export function progressLabel(row: Pick<CohortLearnerProgress,
  'lessonsCompleted' | 'lessonsInVersion'>): string {
  if (row.lessonsInVersion <= 0) return 'No lessons in this version';
  return `${row.lessonsCompleted} of ${row.lessonsInVersion} lessons`;
}

export function isFinished(row: Pick<CohortLearnerProgress,
  'lessonsCompleted' | 'lessonsInVersion'>): boolean {
  return row.lessonsInVersion > 0 && row.lessonsCompleted >= row.lessonsInVersion;
}

/**
 * Whole days since a timestamp, or null when there is none. Floors rather than
 * rounds: "no activity for 1 day" should mean a day has actually passed.
 */
export function daysSince(value: string | null, now: Date = new Date()): number | null {
  if (!value) return null;
  const when = new Date(value);
  if (!Number.isFinite(when.getTime())) return null;
  const days = Math.floor((now.getTime() - when.getTime()) / 86_400_000);
  return days < 0 ? 0 : days;
}

export function hasStarted(row: Pick<CohortLearnerProgress,
  'lessonsCompleted' | 'lessonsInProgress' | 'lastSeenAt'>): boolean {
  return row.lessonsCompleted > 0 || row.lessonsInProgress > 0 || Boolean(row.lastSeenAt);
}

/**
 * Started, then went quiet. Somebody who finished is never stalled, and somebody
 * who never started is not stalled either — they are a different problem, and a
 * teacher chasing them needs to see the difference.
 */
export function isStalled(row: Pick<CohortLearnerProgress,
  'lessonsCompleted' | 'lessonsInProgress' | 'lessonsInVersion' | 'lastSeenAt'>,
  now: Date = new Date()): boolean {
  if (isFinished(row)) return false;
  if (!hasStarted(row)) return false;
  const days = daysSince(row.lastSeenAt, now);
  return days !== null && days >= STALL_DAYS;
}

/**
 * The one-line verdict for a learner, in the order a teacher would ask it:
 * are they in, are they done, have they gone quiet, are they working, or have
 * they not begun?
 */
export function paceLabel(row: CohortLearnerProgress, now: Date = new Date()): string {
  if (!row.enrolmentId) return 'Not enrolled yet';
  if (isFinished(row)) return 'Finished';
  if (isStalled(row, now)) {
    const days = daysSince(row.lastSeenAt, now) ?? STALL_DAYS;
    return `No activity for ${days} day${days === 1 ? '' : 's'}`;
  }
  if (hasStarted(row)) return 'In progress';
  return 'Not started';
}

/** The class at a glance, so a teacher does not have to read every row to know. */
export function summariseCohort(rows: CohortLearnerProgress[], now: Date = new Date()): CohortSummary {
  const summary: CohortSummary = {
    learners: rows.length, enrolled: 0, finished: 0, inProgress: 0,
    notStarted: 0, stalled: 0, notEnrolled: 0, averagePercent: 0,
  };
  let totalPercent = 0;
  for (const row of rows) {
    if (!row.enrolmentId) { summary.notEnrolled += 1; continue; }
    summary.enrolled += 1;
    totalPercent += percentComplete(row);
    if (isFinished(row)) { summary.finished += 1; continue; }
    if (isStalled(row, now)) { summary.stalled += 1; continue; }
    if (hasStarted(row)) { summary.inProgress += 1; continue; }
    summary.notStarted += 1;
  }
  summary.averagePercent = summary.enrolled === 0
    ? 0
    : Math.round(totalPercent / summary.enrolled);
  return summary;
}

/**
 * Who a teacher should look at first. Somebody in the class who has not enrolled
 * is the one thing this page can fix with a message, so they are at the top;
 * somebody who finished is at the bottom, because they need nothing.
 */
export function attentionRank(row: CohortLearnerProgress, now: Date = new Date()): number {
  if (!row.enrolmentId) return 0;
  if (isStalled(row, now)) return 1;
  if (!hasStarted(row)) return 2;
  if (isFinished(row)) return 4;
  return 3;
}

/**
 * The roster ordered by need, least far along first within a rank. Sorting is a
 * presentation choice and not a filter: every row the database returned is still
 * here, so the screen cannot quietly drop somebody.
 */
export function sortForAttention(
  rows: CohortLearnerProgress[],
  now: Date = new Date(),
): CohortLearnerProgress[] {
  return [...rows].sort((a, b) =>
    attentionRank(a, now) - attentionRank(b, now)
    || percentComplete(a) - percentComplete(b)
    || a.displayName.localeCompare(b.displayName)
    || a.learnerProfileId.localeCompare(b.learnerProfileId));
}

/**
 * A read failure is not a write failure: there is nothing to retry, and the
 * database's own wording would only tell a teacher that a query failed. Say what
 * they can do, and never echo a message that might describe somebody else's data.
 */
export function mapAnalyticsError(error: {
  message?: string | null;
  code?: string | null;
}): { status: number; message: string } {
  const message = String(error.message ?? '');
  if (/not enabled/i.test(message)) {
    return { status: 409, message: 'Learner analytics are not enabled.' };
  }
  if (/permission denied|insufficient privilege|row-level security/i.test(message)) {
    return { status: 403, message: 'You cannot see this class.' };
  }
  return { status: 500, message: 'This class could not be read. Try again in a moment.' };
}

/**
 * Read the roster. An empty list is a normal answer and not an error: a class
 * with nobody in it, a class the caller may not see, and a cohort id that does
 * not exist all return no rows, deliberately, because telling them apart would
 * tell a caller which cohorts exist.
 */
export async function fetchCohortProgress(
  client: SupabaseClient,
  cohortId: string,
): Promise<CohortAnalyticsResult> {
  const { data, error } = await client.rpc('cohort_learner_progress', { p_cohort_id: cohortId });
  if (error) return { ok: false, ...mapAnalyticsError(error) };
  const rows = (data ?? []) as unknown as CohortLearnerProgressRow[];
  return { ok: true, rows: rows.map(mapCohortLearnerRow) };
}
