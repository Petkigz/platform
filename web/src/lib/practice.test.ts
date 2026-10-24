import assert from 'node:assert/strict';
import test from 'node:test';

import type { Assessment, Question } from './assessment.ts';
import {
  answerIsEmpty,
  checkAnswer,
  choicesOf,
  practiceForLesson,
  promptOf,
} from './practice.ts';

function assessment(over: Partial<Assessment>): Assessment {
  return {
    id: 'a1',
    title: 'Practice',
    instructions: null,
    type: 'practice',
    pass_threshold: null,
    attempt_limit: null,
    lesson_id: null,
    ...over,
  };
}

function question(over: Partial<Question>): Question {
  return {
    id: 'q1',
    assessment_id: 'a1',
    type: 'single_choice',
    content: {},
    points: 1,
    position: 1,
    explanation: null,
    grading_method: 'automatic',
    ...over,
  };
}

test('only practice attached to this lesson appears in the lesson', () => {
  const items = practiceForLesson(
    [
      assessment({ id: 'p1', type: 'practice', lesson_id: 'lesson-1' }),
      assessment({ id: 'p2', type: 'practice', lesson_id: 'lesson-2' }),
      assessment({ id: 'g1', type: 'graded', lesson_id: 'lesson-1' }),
      assessment({ id: 'f1', type: 'final', lesson_id: null }),
    ],
    'lesson-1',
  );
  assert.deepEqual(items.map((a) => a.id), ['p1']);
});

test('a graded quiz is never turned into an inline check', () => {
  // A graded assessment has an attempt limit and a score. Putting it inline
  // invites somebody to spend an attempt by scrolling.
  const items = practiceForLesson(
    [assessment({ id: 'g1', type: 'graded', lesson_id: 'lesson-1' })],
    'lesson-1',
  );
  assert.equal(items.length, 0);
});

test('an empty answer is not worth checking', () => {
  assert.equal(answerIsEmpty('single_choice', ''), true);
  assert.equal(answerIsEmpty('single_choice', undefined), true);
  assert.equal(answerIsEmpty('single_choice', 'b'), false);

  assert.equal(answerIsEmpty('multiple_choice', []), true);
  assert.equal(answerIsEmpty('multiple_choice', ['x']), false);

  assert.equal(answerIsEmpty('true_false', null), true);
  assert.equal(answerIsEmpty('true_false', false), false);

  // Spaces are not an answer.
  assert.equal(answerIsEmpty('short_answer', '   '), true);
  assert.equal(answerIsEmpty('short_answer', 'Iman'), false);
});

test('a question without a prompt is blank rather than "undefined"', () => {
  assert.equal(promptOf(question({ content: {} })), '');
  assert.equal(promptOf(question({ content: { prompt: 'Which?' } })), 'Which?');
});

test('choices are read defensively out of free-form content', () => {
  assert.deepEqual(
    choicesOf(question({ content: { choices: [{ id: 'a', text: 'One' }, { id: 'b' }] } })),
    [{ id: 'a', text: 'One' }, { id: 'b', text: 'b' }],
  );
  assert.deepEqual(choicesOf(question({ content: { choices: 'nope' } })), []);
  assert.deepEqual(choicesOf(question({ content: { choices: [{ text: 'no id' }] } })), []);
});

test('a verdict comes back as a verdict', async () => {
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      assert.equal(name, 'check_lesson_answer');
      assert.equal(args.p_question_id, 'q1');
      assert.equal(args.p_answer, 'b');
      return { data: { questionId: 'q1', correct: true, explanation: 'Because.' }, error: null };
    },
  };

  const result = await checkAnswer(client as never, 'q1', 'b');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.correct, true);
    assert.equal(result.explanation, 'Because.');
  }
});

test('a refusal keeps the sentence the database wrote', async () => {
  const client = {
    rpc: async () => ({
      data: null,
      error: { message: 'a teacher marks this question, so it cannot be checked here' },
    }),
  };

  const result = await checkAnswer(client as never, 'q1', 'anything');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /a teacher marks this question/);
  }
});

test('a reply with no verdict is a failure, not a wrong answer', async () => {
  // Marking somebody wrong because the reply was unreadable would be a lie
  // dressed as feedback.
  const client = { rpc: async () => ({ data: {}, error: null }) };
  const result = await checkAnswer(client as never, 'q1', 'b');
  assert.equal(result.ok, false);
});
