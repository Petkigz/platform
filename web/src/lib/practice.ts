/**
 * Practice inside a lesson.
 *
 * A `practice` assessment that hangs off one lesson is not a sitting: it is the
 * question at the bottom of the page that tells you whether you followed the
 * paragraph. `check_lesson_answer()` is the writer's opposite — it writes
 * nothing at all — and it is the only thing here that is allowed to know the
 * answer key.
 *
 * The parsing half is pure so the rules that matter can be tested without a
 * database: which assessments belong to a lesson, and whether an answer is
 * worth sending. A "Check" button that sends an empty answer and comes back
 * "wrong" teaches a learner to distrust the button.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Assessment, Question, QuestionType } from './assessment';

/**
 * The practice assessments that belong to this lesson.
 *
 * Graded and final assessments do not appear here even when they are attached
 * to the lesson: they have their own sitting, with an attempt limit and a
 * score, and putting them inline would invite somebody to burn an attempt on a
 * stray click.
 */
export function practiceForLesson(
  assessments: Assessment[],
  lessonId: string,
): Assessment[] {
  return assessments.filter((a) => a.type === 'practice' && a.lesson_id === lessonId);
}

/** Whether an answer is worth checking. */
export function answerIsEmpty(type: QuestionType, value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (type === 'multiple_choice') {
    return !Array.isArray(value) || value.length === 0;
  }
  if (type === 'short_answer') {
    return typeof value !== 'string' || value.trim().length === 0;
  }
  if (type === 'true_false') {
    return typeof value !== 'boolean';
  }
  return typeof value !== 'string' || value.length === 0;
}

export type PracticeCheck =
  | { ok: true; correct: boolean; explanation: string | null }
  | { ok: false; message: string };

type Reply = { questionId?: unknown; correct?: unknown; explanation?: unknown };

/**
 * Ask the database whether one answer was right.
 *
 * The refusal text is passed through rather than replaced: every refusal
 * `check_lesson_answer()` raises is already a sentence a person can read
 * ("a teacher marks this question, so it cannot be checked here"), and a
 * generic "something went wrong" would send a learner to a support form for a
 * question the product can answer.
 */
export async function checkAnswer(
  supabase: SupabaseClient,
  questionId: string,
  answer: unknown,
): Promise<PracticeCheck> {
  const { data, error } = await supabase.rpc('check_lesson_answer', {
    p_question_id: questionId,
    p_answer: answer,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const row = (data ?? null) as Reply | null;
  if (!row || typeof row.correct !== 'boolean') {
    return { ok: false, message: 'The check did not answer. Try again in a moment.' };
  }

  return {
    ok: true,
    correct: row.correct,
    explanation: typeof row.explanation === 'string' ? row.explanation : null,
  };
}

/** The prompt and choices out of a question's free-form content. */
export function promptOf(question: Pick<Question, 'content'>): string {
  const prompt = question.content?.prompt;
  return typeof prompt === 'string' ? prompt : '';
}

export function choicesOf(
  question: Pick<Question, 'content'>,
): { id: string; text: string }[] {
  const raw = question.content?.choices;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((c) => {
    if (!c || typeof c !== 'object') return [];
    const row = c as Record<string, unknown>;
    if (typeof row.id !== 'string') return [];
    return [{ id: row.id, text: typeof row.text === 'string' ? row.text : row.id }];
  });
}
