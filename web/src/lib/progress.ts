/**
 * Lesson progress.
 *
 * The schema already enforces the invariants that matter, and this module
 * exists to satisfy them rather than to re-check them:
 *
 *   * `status = 'completed'` if and only if `completed_at` is set
 *   * a completed lesson is at 100 percent, never 99.9
 *   * `started_at` is never after `completed_at`
 *   * the lesson must belong to the enrolment's pinned version
 *     (`enforce_progress_version_match`)
 *
 * The last one is the interesting one. Progress is recorded against the
 * version the learner enrolled into, so re-publishing a course does not
 * silently invalidate anyone's progress — and a client that tried to record
 * progress against a different version's lesson is refused by the trigger.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type LessonStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export type ProgressRow = {
  id: string;
  lesson_id: string;
  status: LessonStatus;
  progress_percent: number;
  last_video_position: number | null;
  completed_at: string | null;
};

export type ProgressSummary = {
  lessonsTotal: number;
  lessonsDone: number;
  percentComplete: number;
};

export type CompletionEvaluation = {
  isComplete: boolean;
  percentComplete: number;
  requirementsMet: number;
  requirementsTotal: number;
  blocking: string[];
};

/**
 * The fields to write for a given status.
 *
 * Kept as one function so the three constraints above cannot drift apart
 * across call sites. Completing a lesson is not just a status change.
 */
export function fieldsForStatus(
  status: LessonStatus,
  opts: { videoPosition?: number; alreadyStarted?: boolean } = {},
): Record<string, unknown> {
  const now = new Date().toISOString();
  const base: Record<string, unknown> = {
    status,
    last_seen_at: now,
  };

  if (opts.videoPosition !== undefined) {
    base.last_video_position = Math.max(0, Math.floor(opts.videoPosition));
  }

  if (status === 'completed') {
    base.progress_percent = 100;
    base.completed_at = now;
    // lp_started_before_completed: a lesson completed without ever being
    // started must have both timestamps in the right order.
    if (!opts.alreadyStarted) base.started_at = now;
    return base;
  }

  if (status === 'in_progress') {
    if (!opts.alreadyStarted) base.started_at = now;
    // Never 100 while in_progress: lp_completed_means_full runs in the other
    // direction, but a full bar on an unfinished lesson is a lie either way.
    if (opts.videoPosition !== undefined) base.progress_percent = 50;
    return base;
  }

  if (status === 'skipped') {
    base.progress_percent = 0;
    return base;
  }

  base.progress_percent = 0;
  return base;
}

/** Every progress row for one enrolment, keyed by lesson. */
export async function fetchProgress(
  supabase: SupabaseClient,
  enrolmentId: string,
): Promise<Map<string, ProgressRow>> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('id, lesson_id, status, progress_percent, last_video_position, completed_at')
    .eq('course_enrolment_id', enrolmentId);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as ProgressRow[];
  return new Map(rows.map((r) => [r.lesson_id, r]));
}

export async function fetchSummary(
  supabase: SupabaseClient,
  enrolmentId: string,
): Promise<ProgressSummary> {
  const { data, error } = await supabase.rpc('enrolment_progress_summary', {
    p_enrolment_id: enrolmentId,
  });
  if (error) throw new Error(error.message);

  const row = (Array.isArray(data) ? data[0] : data) as
    | { lessons_total: number | string; lessons_done: number | string; percent_complete: number | string }
    | null;

  if (!row) return { lessonsTotal: 0, lessonsDone: 0, percentComplete: 0 };
  return {
    lessonsTotal: Number(row.lessons_total),
    lessonsDone: Number(row.lessons_done),
    percentComplete: Number(row.percent_complete),
  };
}

/**
 * What still stands between the learner and completion, per the course's own
 * completion policy. Returned to the learner verbatim — `blocking` is written
 * for humans by the policy engine.
 */
export async function fetchCompletion(
  supabase: SupabaseClient,
  enrolmentId: string,
): Promise<CompletionEvaluation> {
  const { data, error } = await supabase.rpc('evaluate_completion', {
    p_enrolment_id: enrolmentId,
  });
  if (error) throw new Error(error.message);

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        is_complete: boolean;
        percent_complete: number | string;
        requirements_met: number;
        requirements_total: number;
        blocking: string[] | null;
      }
    | null;

  if (!row) {
    return {
      isComplete: false,
      percentComplete: 0,
      requirementsMet: 0,
      requirementsTotal: 0,
      blocking: [],
    };
  }

  return {
    isComplete: row.is_complete === true,
    percentComplete: Number(row.percent_complete),
    requirementsMet: row.requirements_met,
    requirementsTotal: row.requirements_total,
    blocking: row.blocking ?? [],
  };
}

export type ProgressOutcome =
  | { ok: true; status: LessonStatus }
  | { ok: false; code: ProgressErrorCode; message: string };

export type ProgressErrorCode =
  | 'not_signed_in'
  | 'no_enrolment'
  | 'not_your_enrolment'
  | 'version_mismatch'
  | 'rejected';

/**
 * Record progress on one lesson.
 *
 * Upserts rather than inserting, because resuming a video and completing it
 * are two writes to the same row. The enrolment is checked first so that a
 * learner cannot write progress into someone else's enrolment — though RLS
 * would refuse it anyway, and this is the path that turns that refusal into a
 * sentence.
 */
export async function recordLessonProgress(
  supabase: SupabaseClient,
  args: { userId: string; enrolmentId: string; lessonId: string; status: LessonStatus; videoPosition?: number },
): Promise<ProgressOutcome> {
  const { data: enrolment } = await supabase
    .from('course_enrolments')
    .select('id, learner_profile_id, course_version_id, deleted_at')
    .eq('id', args.enrolmentId)
    .maybeSingle();

  const row = enrolment as
    | { id: string; learner_profile_id: string; course_version_id: string; deleted_at: string | null }
    | null;

  if (!row || row.deleted_at) {
    return { ok: false, code: 'no_enrolment', message: 'That enrolment does not exist.' };
  }

  const { data: profile } = await supabase
    .from('learner_profiles')
    .select('id')
    .eq('id', row.learner_profile_id)
    .maybeSingle();
  if (!profile) {
    return { ok: false, code: 'not_your_enrolment', message: 'That is not your enrolment.' };
  }

  const { data: existingRows } = await supabase
    .from('lesson_progress')
    .select('id, started_at')
    .eq('course_enrolment_id', args.enrolmentId)
    .eq('lesson_id', args.lessonId)
    .limit(1);

  const existing = (existingRows ?? [])[0] as { id: string; started_at: string | null } | undefined;

  const fields = fieldsForStatus(args.status, {
    videoPosition: args.videoPosition,
    alreadyStarted: Boolean(existing?.started_at),
  });

  const { error } = existing
    ? await supabase.from('lesson_progress').update(fields).eq('id', existing.id)
    : await supabase.from('lesson_progress').insert({
        course_enrolment_id: args.enrolmentId,
        lesson_id: args.lessonId,
        ...fields,
      });

  if (error) {
    // The version-match trigger raises when the lesson does not belong to the
    // pinned version. That is a client bug or a stale page, not a permission
    // problem, and it gets its own message.
    if (/version/i.test(error.message)) {
      return {
        ok: false,
        code: 'version_mismatch',
        message:
          'This lesson belongs to a different version of the course than the ' +
          'one you are enrolled in. Reload the page.',
      };
    }
    return { ok: false, code: 'rejected', message: 'Could not save your progress.' };
  }

  return { ok: true, status: args.status };
}
