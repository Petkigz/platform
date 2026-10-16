/**
 * Assessments.
 *
 * The one rule this module is organised around: **never `select('*')` on
 * `assessment_questions`.**
 *
 * `answer_key` is protected by column privileges, not by RLS, because RLS
 * cannot hide a column. The grants are:
 *
 *   grant select (id, assessment_id, type, content, points, position,
 *                 explanation, grading_method) ... to authenticated
 *
 * A table-level grant would silently re-expose the key, so there isn't one —
 * and the consequence is that `SELECT *` is refused outright rather than
 * returning the granted columns. Every query here names its columns, and
 * `supabase/tests/assessment.test.mjs` asserts that the star form fails.
 *
 * Grading is server-side only. `grade_response()` is the sole reader of
 * `answer_key`; this module never sees the key and never computes a score.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer';

export type Question = {
  id: string;
  assessment_id: string;
  type: QuestionType;
  /** Free-form per type: `{ prompt, choices: [{ id, text }] }` and so on. */
  content: Record<string, unknown>;
  points: number;
  position: number;
  explanation: string | null;
  grading_method: 'automatic' | 'manual';
};

export type Assessment = {
  id: string;
  title: string;
  instructions: string | null;
  type: 'practice' | 'graded' | 'final';
  pass_threshold: number | null;
  attempt_limit: number | null;
  lesson_id: string | null;
};

export type Attempt = {
  id: string;
  assessment_id: string;
  attempt_number: number;
  status: string;
  score_earned: number | null;
  score_possible: number | null;
  passed: boolean | null;
};

/** The exact column list. Kept in one place so it cannot drift. */
const QUESTION_COLUMNS =
  'id, assessment_id, type, content, points, position, explanation, grading_method';

export async function fetchAssessmentsForVersion(
  supabase: SupabaseClient,
  versionId: string,
): Promise<Assessment[]> {
  const { data, error } = await supabase
    .from('assessments')
    .select('id, title, instructions, type, pass_threshold, attempt_limit, lesson_id')
    .eq('course_version_id', versionId)
    .eq('status', 'active')
    .order('title', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Assessment[];
}

export async function fetchQuestions(
  supabase: SupabaseClient,
  assessmentId: string,
): Promise<Question[]> {
  const { data, error } = await supabase
    .from('assessment_questions')
    .select(QUESTION_COLUMNS)
    .eq('assessment_id', assessmentId)
    .order('position', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Question[];
}

export type AssessmentAction =
  | { ok: true; attempt: Attempt }
  | { ok: false; code: AssessmentErrorCode; message: string };

export type AssessmentErrorCode =
  | 'no_enrolment'
  | 'no_assessment'
  | 'attempt_limit_reached'
  | 'already_submitted'
  | 'not_signed_in'
  | 'rejected';

/**
 * Start a new attempt, or return the one already in progress.
 *
 * The attempt limit is enforced by a database trigger
 * (`enforce_attempt_limit`), so the count here is for the message, not for
 * the decision.
 */
export async function startAttempt(
  supabase: SupabaseClient,
  args: { learnerProfileId: string; enrolmentId: string; assessmentId: string },
): Promise<AssessmentAction> {
  const { data: existing } = await supabase
    .from('assessment_attempts')
    .select('id, assessment_id, attempt_number, status, score_earned, score_possible, passed')
    .eq('assessment_id', args.assessmentId)
    .eq('course_enrolment_id', args.enrolmentId)
    .eq('status', 'in_progress')
    .limit(1);

  const open = (existing ?? [])[0] as Attempt | undefined;
  if (open) return { ok: true, attempt: open };

  const { data: prior } = await supabase
    .from('assessment_attempts')
    .select('attempt_number')
    .eq('assessment_id', args.assessmentId)
    .eq('course_enrolment_id', args.enrolmentId)
    .order('attempt_number', { ascending: false })
    .limit(1);

  const next = (((prior ?? [])[0] as { attempt_number: number } | undefined)?.attempt_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('assessment_attempts')
    .insert({
      assessment_id: args.assessmentId,
      learner_profile_id: args.learnerProfileId,
      course_enrolment_id: args.enrolmentId,
      attempt_number: next,
      status: 'in_progress',
    })
    .select('id, assessment_id, attempt_number, status, score_earned, score_possible, passed')
    .single();

  if (error) {
    return {
      ok: false,
      code: 'attempt_limit_reached',
      message:
        'You have used all your attempts for this assessment. Ask your teacher ' +
        'if you need another.',
    };
  }

  return { ok: true, attempt: data as unknown as Attempt };
}

/**
 * Save one answer.
 *
 * Upserts: a learner changing their mind before submitting is normal and must
 * not create a second response row. `enforce_response_question_match` ties the
 * response to a question that belongs to the same assessment.
 */
export async function saveResponse(
  supabase: SupabaseClient,
  args: { attemptId: string; questionId: string; content: unknown },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: found } = await supabase
    .from('assessment_responses')
    .select('id')
    .eq('assessment_attempt_id', args.attemptId)
    .eq('question_id', args.questionId)
    .limit(1);

  const row = (found ?? [])[0] as { id: string } | undefined;

  const { error } = row
    ? await supabase
        .from('assessment_responses')
        .update({ response_content: args.content })
        .eq('id', row.id)
    : await supabase.from('assessment_responses').insert({
        assessment_attempt_id: args.attemptId,
        question_id: args.questionId,
        response_content: args.content,
      });

  if (error) {
    // A submitted attempt is locked by trigger. Say so rather than "rejected".
    if (/submit|lock/i.test(error.message)) {
      return { ok: false, message: 'This attempt has already been submitted.' };
    }
    return { ok: false, message: 'Could not save that answer.' };
  }
  return { ok: true };
}

/**
 * Submit. `submit_attempt()` is the only path from in_progress to submitted,
 * and it refuses an attempt with unanswered questions — so the server decides,
 * not this function.
 */
export async function submitAttempt(
  supabase: SupabaseClient,
  attemptId: string,
): Promise<{ ok: true; attempt: Attempt } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('submit_attempt', { p_attempt_id: attemptId });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, attempt: data as unknown as Attempt };
}

/** Render a question prompt from its free-form content. */
export function promptOf(q: Question): string {
  const c = q.content as { prompt?: unknown; text?: unknown; question?: unknown };
  const v = c.prompt ?? c.text ?? c.question;
  return typeof v === 'string' ? v : '';
}

export function choicesOf(q: Question): { id: string; text: string }[] {
  const c = q.content as { choices?: unknown; options?: unknown };
  const raw = (c.choices ?? c.options ?? []) as unknown[];
  return raw
    .map((x) => {
      const o = x as { id?: unknown; value?: unknown; text?: unknown; label?: unknown };
      const id = o.id ?? o.value;
      const text = o.text ?? o.label;
      if (typeof id !== 'string' || typeof text !== 'string') return null;
      return { id, text };
    })
    .filter((x): x is { id: string; text: string } => x !== null);
}
