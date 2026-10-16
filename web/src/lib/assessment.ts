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

// ---------------------------------------------------------------------------
// Authoring assessments
//
// Everything above assumes an assessment exists. Until now none could:
// `assessments` and `assessment_questions` both had zero rows and no writer, so
// no teacher could create a quiz. That cascaded — completion rules of type
// `assessment_submitted` and `assessment_passed` carry a `target_assessment_id`
// with nothing to point at, and `submit_attempt()` above was unreachable.
//
// Note the reader filters `status = 'active'`, so a draft is invisible to a
// learner, and D5 freezes assessments at publication. `createAssessment()`
// therefore returns a draft that must be activated, and the database refuses to
// publish a version with a draft left behind.
// ---------------------------------------------------------------------------

export const ASSESSMENT_TYPES = ['practice', 'graded', 'final'] as const;

export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const ASSESSMENT_TYPE_LABEL: Record<AssessmentType, string> = {
  practice: 'Practice',
  graded: 'Graded',
  final: 'Final',
};

export const ASSESSMENT_TYPE_HINT: Record<AssessmentType, string> = {
  practice: 'Not scored, so learners can rehearse. No pass mark.',
  graded: 'Scored against a pass mark.',
  final: 'Scored against a pass mark, intended as the last check.',
};

export type AuthoredAssessment = {
  id: string;
  title: string;
  type: AssessmentType;
  status: 'draft' | 'active' | 'retired';
  passThreshold: number | null;
  questionCount: number;
};

/**
 * The author's own assessments for one version, including drafts.
 *
 * Deliberately not the same query as `fetchAssessmentsForVersion`, which filters
 * to `active` for learners. An author has to see the drafts, or a half-finished
 * assessment would simply vanish from the editor.
 */
export async function fetchAuthoredAssessments(
  supabase: SupabaseClient,
  versionId: string,
): Promise<AuthoredAssessment[]> {
  const { data, error } = await supabase
    .from('assessments')
    .select(
      'id, title, type, status, pass_threshold, assessment_questions ( id )',
    )
    .eq('course_version_id', versionId)
    .order('title', { ascending: true });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    title: string;
    type: string;
    status: string;
    pass_threshold: number | null;
    assessment_questions: { id: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((a) => ({
    id: String(a.id),
    title: String(a.title),
    type: a.type as AssessmentType,
    status: a.status as AuthoredAssessment['status'],
    passThreshold: a.pass_threshold === null ? null : Number(a.pass_threshold),
    questionCount: a.assessment_questions?.length ?? 0,
  }));
}

export type CreateAssessmentInput = {
  versionId: string;
  title: string;
  type?: AssessmentType;
  passThreshold?: number | null;
  attemptLimit?: number | null;
  instructions?: string;
  lessonId?: string | null;
};

export type CreateAssessmentResult =
  | { ok: true; assessmentId: string }
  | { ok: false; message: string };

/**
 * Validate before the request, because the rules are easy to get wrong in the
 * form and a constraint name is not an explanation.
 *
 * The pair that trips people up: a practice assessment must NOT have a pass
 * mark, and a graded or final one must.
 */
export function validateCreateAssessment(
  input: CreateAssessmentInput,
): CreateAssessmentResult {
  if (!input.versionId)
    return { ok: false, message: 'That course version is missing.' };

  const title = input.title.trim();
  if (title.length === 0)
    return { ok: false, message: 'Give the assessment a title.' };
  if (title.length > 200)
    return { ok: false, message: 'Keep the title under 200 characters.' };

  const type = input.type ?? 'graded';
  if (!ASSESSMENT_TYPES.includes(type))
    return { ok: false, message: 'That is not a kind of assessment we support.' };

  const threshold =
    input.passThreshold === undefined ? null : input.passThreshold;

  if (type === 'practice' && threshold !== null)
    return {
      ok: false,
      message: 'A practice assessment is not scored, so it cannot have a pass mark.',
    };

  if (type !== 'practice' && threshold === null)
    return {
      ok: false,
      message: `A ${ASSESSMENT_TYPE_LABEL[type].toLowerCase()} assessment needs a pass mark.`,
    };

  if (threshold !== null) {
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100)
      return { ok: false, message: 'A pass mark must be between 0 and 100.' };
  }

  const limit = input.attemptLimit === undefined ? null : input.attemptLimit;
  if (limit !== null) {
    if (!Number.isInteger(limit) || limit <= 0)
      return { ok: false, message: 'An attempt limit must be at least 1.' };
  }

  return { ok: true, assessmentId: '' };
}

export async function createAssessment(
  supabase: SupabaseClient,
  input: CreateAssessmentInput,
): Promise<CreateAssessmentResult> {
  const check = validateCreateAssessment(input);
  if (!check.ok) return check;

  const { data, error } = await supabase.rpc('create_assessment', {
    p_course_version_id: input.versionId,
    p_title: input.title.trim(),
    p_type: input.type ?? 'graded',
    p_lesson_id: input.lessonId ?? null,
    p_pass_threshold:
      input.passThreshold === undefined ? null : input.passThreshold,
    p_attempt_limit: input.attemptLimit === undefined ? null : input.attemptLimit,
    p_instructions: input.instructions?.trim() || null,
  });

  if (error) {
    const m = error.message;
    if (/only the author may add an assessment/i.test(m))
      return { ok: false, message: 'Only the author can change this course.' };
    if (/locked \(D5\)/i.test(m))
      return {
        ok: false,
        message:
          'That version is published and frozen. Create a new version to change it.',
      };
    if (/needs a title/i.test(m))
      return { ok: false, message: 'Give the assessment a title.' };
    if (/not graded/i.test(m))
      return {
        ok: false,
        message: 'A practice assessment is not scored, so it cannot have a pass mark.',
      };
    if (/needs a pass mark/i.test(m))
      return { ok: false, message: 'That assessment needs a pass mark.' };
    if (/between 0 and 100/i.test(m))
      return { ok: false, message: 'A pass mark must be between 0 and 100.' };
    if (/at least 1/i.test(m))
      return { ok: false, message: 'An attempt limit must be at least 1.' };
    if (/belongs to version/i.test(m))
      return { ok: false, message: 'That lesson belongs to a different version.' };
    return { ok: false, message: m };
  }

  return { ok: true, assessmentId: data === null ? '' : String(data) };
}

export type AddQuestionInput = {
  assessmentId: string;
  type?: QuestionType;
  prompt: string;
  choices?: { id: string; text: string }[];
  answerId?: string;
  points?: number;
  gradingMethod?: 'automatic' | 'manual';
  explanation?: string;
};

export type AddQuestionResult =
  | { ok: true; questionId: string }
  | { ok: false; message: string };

/**
 * Validate a question.
 *
 * The rule that matters: an automatically graded question needs an answer, or
 * the attempt can never be marked and the learner is left hanging. A manually
 * graded one must not have one, because there would be nothing to grade against.
 */
export function validateAddQuestion(
  input: AddQuestionInput,
): AddQuestionResult {
  if (!input.assessmentId)
    return { ok: false, message: 'That assessment is missing.' };

  const prompt = input.prompt.trim();
  if (prompt.length === 0)
    return { ok: false, message: 'Write the question itself.' };

  const type = input.type ?? 'single_choice';
  const grading = input.gradingMethod ?? 'automatic';

  if (grading !== 'automatic' && grading !== 'manual')
    return { ok: false, message: 'That is not a way to mark a question.' };

  const points = input.points === undefined ? 1 : input.points;
  if (!Number.isFinite(points) || points <= 0)
    return { ok: false, message: 'A question is worth at least one point.' };

  if (type === 'single_choice' || type === 'multiple_choice') {
    const choices = input.choices ?? [];
    if (choices.length < 2)
      return { ok: false, message: 'Give at least two choices.' };
    if (choices.some((c) => c.text.trim().length === 0))
      return { ok: false, message: 'A choice cannot be blank.' };

    if (grading === 'automatic') {
      if (!input.answerId)
        return { ok: false, message: 'Mark which choice is correct.' };
      if (!choices.some((c) => c.id === input.answerId))
        return { ok: false, message: 'The correct answer is not one of the choices.' };
    }
  }

  if (type === 'true_false' && grading === 'automatic' && !input.answerId)
    return { ok: false, message: 'Mark whether the statement is true or false.' };

  return { ok: true, questionId: '' };
}

export async function addAssessmentQuestion(
  supabase: SupabaseClient,
  input: AddQuestionInput,
): Promise<AddQuestionResult> {
  const check = validateAddQuestion(input);
  if (!check.ok) return check;

  const type = input.type ?? 'single_choice';
  const grading = input.gradingMethod ?? 'automatic';
  const choices = input.choices ?? [];

  // Content and answer key are stored as JSON. The key is never returned to an
  // authenticated client — assessment_questions_read excludes it — so writing it
  // here is the only place it enters the system.
  const content: Record<string, unknown> = { prompt: input.prompt.trim() };
  if (type === 'single_choice' || type === 'multiple_choice') {
    content.choices = choices.map((c) => ({ id: c.id, text: c.text.trim() }));
  }

  let answerKey: Record<string, unknown> | null = null;
  if (grading === 'automatic') {
    answerKey =
      type === 'multiple_choice'
        ? { answers: [input.answerId ?? ''] }
        : { answer: input.answerId ?? 'true' };
  }

  const { data, error } = await supabase.rpc('add_assessment_question', {
    p_assessment_id: input.assessmentId,
    p_type: type,
    p_content: content,
    p_points: input.points === undefined ? 1 : input.points,
    p_grading_method: grading,
    p_answer_key: answerKey,
    p_explanation: input.explanation?.trim() || null,
  });

  if (error) {
    const m = error.message;
    if (/only the author may add questions/i.test(m))
      return { ok: false, message: 'Only the author can change this assessment.' };
    if (/locked \(D5\)/i.test(m))
      return {
        ok: false,
        message:
          'That version is published and frozen. Create a new version to change it.',
      };
    if (/needs an answer key/i.test(m))
      return { ok: false, message: 'Mark the correct answer, or switch it to manual marking.' };
    if (/JSON object/i.test(m))
      return { ok: false, message: 'The question content was malformed.' };
    if (/at least one point/i.test(m))
      return { ok: false, message: 'A question is worth at least one point.' };
    if (/not found/i.test(m))
      return { ok: false, message: 'That assessment no longer exists.' };
    return { ok: false, message: m };
  }

  return { ok: true, questionId: data === null ? '' : String(data) };
}

export type ActivateAssessmentResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Make an assessment visible to learners.
 *
 * The reader only shows `active`, and D5 freezes assessments at publication, so
 * this is the step that must not be forgotten — which is why the database also
 * refuses to publish a version with a draft left behind.
 */
export async function activateAssessment(
  supabase: SupabaseClient,
  assessmentId: string,
): Promise<ActivateAssessmentResult> {
  if (!assessmentId)
    return { ok: false, message: 'That assessment is missing.' };

  const { error } = await supabase.rpc('activate_assessment', {
    p_assessment_id: assessmentId,
  });

  if (error) {
    const m = error.message;
    if (/at least one question/i.test(m))
      return { ok: false, message: 'Add at least one question first.' };
    if (/only the author may activate/i.test(m))
      return { ok: false, message: 'Only the author can change this assessment.' };
    if (/has been retired/i.test(m))
      return { ok: false, message: 'That assessment has been retired.' };
    if (/not found/i.test(m))
      return { ok: false, message: 'That assessment no longer exists.' };
    return { ok: false, message: m };
  }

  return { ok: true };
}
