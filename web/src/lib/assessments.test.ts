import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchAttemptResults,
  FEEDBACK_MAX,
  validateCreateAssessment,
  validateFeedback,
  validateAddQuestion,
  addAssessmentQuestion,
  choicesOf,
  fetchPendingManualResponses,
  markManualAssessmentResponse,
  submitAttempt,
  type Question,
  ASSESSMENT_TYPES,
} from './assessment.ts';

// ---------------------------------------------------------------------------
// Authoring assessments.
//
// The rules under test are the ones a form gets wrong quietly:
//
//   * a practice assessment must NOT have a pass mark, a graded one MUST — the
//     pair of CHECKs on the table that contradict each other if you only read
//     one of them
//   * an automatically graded question needs a correct answer, or the attempt
//     can never be marked and the learner is left hanging
//   * the answer key is sent only when grading is automatic
// ---------------------------------------------------------------------------

const VERSION = '33333333-3333-4333-8333-333333333333';
const ASSESSMENT = '44444444-4444-4444-8444-444444444444';

const baseAssessment = {
  versionId: VERSION,
  title: 'Tajweed check',
  type: 'graded' as const,
  passThreshold: 60,
};

test('a well-formed graded assessment passes', () => {
  assert.equal(validateCreateAssessment(baseAssessment).ok, true);
});

test('every supported type is recognised', () => {
  for (const type of ASSESSMENT_TYPES) {
    const passThreshold = type === 'practice' ? null : 60;
    assert.equal(
      validateCreateAssessment({ ...baseAssessment, type, passThreshold }).ok,
      true,
      `${type} should be accepted`,
    );
  }
});

test('a practice assessment must NOT have a pass mark', () => {
  // assessments_pass_threshold_sensible. A practice one is not scored, so a
  // pass mark would be shown in the UI and mean nothing.
  const r = validateCreateAssessment({
    ...baseAssessment,
    type: 'practice',
    passThreshold: 60,
  });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) {
    assert.match(r.message, /not scored/i);
    assert.match(r.message, /practice/i);
  }
});

test('a graded or final assessment MUST have a pass mark', () => {
  for (const type of ['graded', 'final'] as const) {
    const r = validateCreateAssessment({
      ...baseAssessment,
      type,
      passThreshold: null,
    });
    assert.equal(r.ok, false, `${type} without a pass mark should be refused`);
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.message, /pass mark/i);
  }
});

test('a practice assessment with no pass mark is valid', () => {
  assert.equal(
    validateCreateAssessment({
      ...baseAssessment,
      type: 'practice',
      passThreshold: null,
    }).ok,
    true,
  );
});

test('an omitted pass mark is treated as absent, not as zero', () => {
  // A graded assessment with the field simply not provided must be refused.
  // Defaulting it to 0 would silently create an assessment everyone passes.
  const { passThreshold: _ignored, ...rest } = baseAssessment;
  const r = validateCreateAssessment(rest);
  assert.equal(r.ok, false, 'a graded assessment with no pass mark should be refused');
});

test('a pass mark outside 0-100 is refused', () => {
  for (const passThreshold of [-1, 101, 250, Number.NaN]) {
    assert.equal(
      validateCreateAssessment({ ...baseAssessment, passThreshold }).ok,
      false,
      `${passThreshold} should be refused`,
    );
  }
});

test('the boundaries 0 and 100 are allowed', () => {
  assert.equal(validateCreateAssessment({ ...baseAssessment, passThreshold: 0 }).ok, true);
  assert.equal(validateCreateAssessment({ ...baseAssessment, passThreshold: 100 }).ok, true);
});

test('a blank title is refused', () => {
  for (const title of ['', '   ', '\t']) {
    const r = validateCreateAssessment({ ...baseAssessment, title });
    assert.equal(r.ok, false, `${JSON.stringify(title)} should be refused`);
  }
});

test('an over-long title is refused', () => {
  assert.equal(
    validateCreateAssessment({ ...baseAssessment, title: 'x'.repeat(201) }).ok,
    false,
  );
});

test('an attempt limit below 1 is refused, and an omitted one is unlimited', () => {
  assert.equal(
    validateCreateAssessment({ ...baseAssessment, attemptLimit: 0 }).ok,
    false,
  );
  assert.equal(
    validateCreateAssessment({ ...baseAssessment, attemptLimit: -2 }).ok,
    false,
  );
  assert.equal(
    validateCreateAssessment({ ...baseAssessment, attemptLimit: 1.5 }).ok,
    false,
  );
  assert.equal(
    validateCreateAssessment({ ...baseAssessment, attemptLimit: 3 }).ok,
    true,
  );
  assert.equal(validateCreateAssessment(baseAssessment).ok, true,
    'omitting the limit means unlimited and is valid');
});

test('a missing version is refused', () => {
  assert.equal(
    validateCreateAssessment({ ...baseAssessment, versionId: '' }).ok,
    false,
  );
});

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const baseQuestion = {
  assessmentId: ASSESSMENT,
  type: 'single_choice' as const,
  prompt: 'Which is a pillar of Islam?',
  choices: [
    { id: 'a', text: 'Fasting' },
    { id: 'b', text: 'Prayer' },
  ],
  answerId: 'b',
};

test('a well-formed choice question passes', () => {
  assert.equal(validateAddQuestion(baseQuestion).ok, true);
});

test('a blank question is refused', () => {
  for (const prompt of ['', '   ']) {
    assert.equal(validateAddQuestion({ ...baseQuestion, prompt }).ok, false);
  }
});

test('a choice question needs at least two choices', () => {
  assert.equal(
    validateAddQuestion({ ...baseQuestion, choices: [{ id: 'a', text: 'Only one' }] }).ok,
    false,
  );
});

test('a blank choice is refused', () => {
  const r = validateAddQuestion({
    ...baseQuestion,
    choices: [
      { id: 'a', text: 'Fasting' },
      { id: 'b', text: '   ' },
    ],
  });
  assert.equal(r.ok, false);
});

test('an automatically graded choice question needs a correct answer', () => {
  // The rule that matters: without it the question can never be marked, so the
  // attempt never resolves and the learner is left hanging.
  const r = validateAddQuestion({ ...baseQuestion, answerId: undefined });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) assert.match(r.message, /correct/i);
});

test('the correct answer must actually be one of the choices', () => {
  const r = validateAddQuestion({ ...baseQuestion, answerId: 'z' });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) assert.match(r.message, /not one of the choices/i);
});

test('a short answer cannot be automatically graded without an expected-answer model', () => {
  const result = validateAddQuestion({
    assessmentId: ASSESSMENT,
    type: 'short_answer',
    prompt: 'Explain the answer.',
    gradingMethod: 'automatic',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /teacher marking/i);
});

test('a manually graded question needs no correct answer', () => {
  assert.equal(
    validateAddQuestion({
      ...baseQuestion,
      type: 'short_answer',
      gradingMethod: 'manual',
      answerId: undefined,
      choices: undefined,
    }).ok,
    true,
  );
});

test('a true/false question still needs marking when automatic', () => {
  assert.equal(
    validateAddQuestion({
      assessmentId: ASSESSMENT,
      type: 'true_false',
      prompt: 'The Quran was revealed in Ramadan.',
      gradingMethod: 'automatic',
    }).ok,
    false,
  );

  assert.equal(
    validateAddQuestion({
      assessmentId: ASSESSMENT,
      type: 'true_false',
      prompt: 'The Quran was revealed in Ramadan.',
      gradingMethod: 'automatic',
      answerId: 'true',
    }).ok,
    true,
  );
});

test('a question is worth at least one point', () => {
  for (const points of [0, -5, Number.NaN]) {
    assert.equal(validateAddQuestion({ ...baseQuestion, points }).ok, false,
      `${points} should be refused`);
  }
});

test('a missing assessment is refused', () => {
  assert.equal(validateAddQuestion({ ...baseQuestion, assessmentId: '' }).ok, false);
});

// ---------------------------------------------------------------------------
// What is actually sent
// ---------------------------------------------------------------------------

function stubRpc(result: { data?: unknown; error?: { message: string } } = { data: 'q-1' }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

test('an automatically graded question sends an answer key', async () => {
  const { client, calls } = stubRpc();

  const r = await addAssessmentQuestion(client, baseQuestion);
  assert.equal(r.ok, true);

  const call = calls[0];
  if (!call) throw new Error('expected an rpc call');
  assert.equal(call.fn, 'add_assessment_question');
  assert.equal(call.args.p_answer_key, 'b',
    'a single-choice key must match the scalar answer the learner submits');
});

test('a manually graded question sends no answer key', async () => {
  const { client, calls } = stubRpc();

  await addAssessmentQuestion(client, {
    ...baseQuestion,
    type: 'short_answer',
    gradingMethod: 'manual',
    answerId: undefined,
    choices: undefined,
  });

  const call = calls[0];
  if (!call) throw new Error('expected an rpc call');
  assert.equal(call.args.p_answer_key, null,
    'a manually graded question should not carry an answer key');
});

test('no answer key is sent when validation has already refused', async () => {
  const { client, calls } = stubRpc();

  const r = await addAssessmentQuestion(client, { ...baseQuestion, answerId: undefined });
  assert.equal(r.ok, false);
  assert.equal(calls.length, 0, 'no request should have been sent');
});

test('multiple choice keys are sorted arrays matching the learner response shape', async () => {
  const { client, calls } = stubRpc();
  const result = await addAssessmentQuestion(client, {
    ...baseQuestion,
    type: 'multiple_choice',
    answerId: undefined,
    answerIds: ['b', 'a'],
  });
  assert.equal(result.ok, true);
  const call = calls[0];
  if (!call) throw new Error('expected an rpc call');
  assert.deepEqual(call.args.p_answer_key, ['a', 'b']);
});

test('true-false questions render two selectable answers for the learner', () => {
  const question = {
    id: 'q', assessment_id: ASSESSMENT, type: 'true_false' as const,
    content: { prompt: 'A statement' }, points: 1, position: 1,
    explanation: null, grading_method: 'automatic' as const,
  } satisfies Question;
  assert.deepEqual(choicesOf(question), [
    { id: 'true', text: 'True' },
    { id: 'false', text: 'False' },
  ]);
});

test('true-false answer keys match the learner’s selected scalar id', async () => {
  const { client, calls } = stubRpc();
  await addAssessmentQuestion(client, {
    ...baseQuestion,
    type: 'true_false',
    choices: undefined,
    answerId: 'true',
  });
  const call = calls[0];
  if (!call) throw new Error('expected an rpc call');
  assert.equal(call.args.p_answer_key, 'true');
});

test('learner submission uses the identity-checked auto-grading writer', async () => {
  const attempt = { id: 'attempt-1', assessment_id: ASSESSMENT, attempt_number: 1,
    status: 'graded', score_earned: 1, score_possible: 1, passed: true };
  const { client, calls } = stubRpc({ data: attempt });
  const result = await submitAttempt(client, 'attempt-1');
  assert.equal(result.ok, true);
  const call = calls[0];
  if (!call) throw new Error('expected an rpc call');
  assert.deepEqual(call, {
    fn: 'submit_assessment_attempt',
    args: { p_attempt_id: 'attempt-1' },
  });
});

test('manual grading queue is fetched by course id through its guarded RPC', async () => {
  const response = { response_id: 'response-1', question_prompt: 'Explain', response_content: 'Because' };
  const { client, calls } = stubRpc({ data: [response] });
  const rows = await fetchPendingManualResponses(client, 'course-1');
  assert.deepEqual(rows, [response]);
  assert.deepEqual(calls[0], {
    fn: 'list_pending_manual_assessment_responses',
    args: { p_course_id: 'course-1' },
  });
});

test('manual marking sends score and verdict, never an actor id', async () => {
  const { client, calls } = stubRpc({ data: { id: 'attempt-1' } });
  const result = await markManualAssessmentResponse(client, {
    responseId: 'response-1', score: 2, isCorrect: true,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls[0], {
    fn: 'mark_manual_assessment_response',
    args: { p_response_id: 'response-1', p_score: 2, p_is_correct: true, p_feedback: null },
  });
});

// ---------------------------------------------------------------------------
// Feedback on a marked answer.
//
// The comment is the only part of marking a written answer that a learner can
// act on, so what is worth pinning is that it travels with the mark, that blank
// means none rather than an empty string, and that it is refused before the
// database is asked when it is too long.
// ---------------------------------------------------------------------------

test('a comment is trimmed and sent with the mark', async () => {
  const { client, calls } = stubRpc({ data: null });
  const result = await markManualAssessmentResponse(client, {
    responseId: 'response-1', score: 3, isCorrect: true,
    feedback: '  Clearer this time — cite the verse.  ',
  });
  assert.equal(result.ok, true);
  assert.equal(calls[0]?.args.p_feedback, 'Clearer this time — cite the verse.');
});

test('a blank comment is sent as none, not as an empty string', async () => {
  const { client, calls } = stubRpc({ data: null });
  await markManualAssessmentResponse(client, {
    responseId: 'response-1', score: 1, isCorrect: false, feedback: '   ',
  });
  assert.equal(calls[0]?.args.p_feedback, null);
});

test('validateFeedback reports the limit this side of the database', () => {
  assert.equal(validateFeedback({}).ok, true);
  assert.equal(validateFeedback({ feedback: 42 }).ok, true, 'a non-string comment is treated as none');
  assert.equal(validateFeedback({ feedback: 'x'.repeat(FEEDBACK_MAX) }).ok, true);

  const tooLong = validateFeedback({ feedback: 'x'.repeat(FEEDBACK_MAX + 1) });
  assert.equal(tooLong.ok, false);

  const blank = validateFeedback({ feedback: '  ' });
  if (blank.ok) assert.equal(blank.feedback, null);
});

test('an overlong comment is refused before the database call', async () => {
  const { client, calls } = stubRpc();
  const result = await markManualAssessmentResponse(client, {
    responseId: 'response-1', score: 2, isCorrect: true,
    feedback: 'x'.repeat(FEEDBACK_MAX + 1),
  });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0, 'an overlong comment was sent to the database');
});

test('a refusal about the comment reads as one', async () => {
  const { client } = stubRpc({ error: { message: 'feedback must be 5000 characters or fewer' } });
  const result = await markManualAssessmentResponse(client, {
    responseId: 'response-1', score: 2, isCorrect: true, feedback: 'ok',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /under 5000 characters/);
});

test('marking an automatic answer is reported as such', async () => {
  const { client } = stubRpc({ error: { message: 'only a manually graded response can be marked here' } });
  const result = await markManualAssessmentResponse(client, {
    responseId: 'response-1', score: 2, isCorrect: true, feedback: 'Nice.',
  });
  if (!result.ok) assert.equal(result.message, 'That answer is marked automatically.');
});

// ---------------------------------------------------------------------------
// What the learner gets back.
// ---------------------------------------------------------------------------

/** A thenable query-builder stub keyed by table. */
function stubTables(tables: Record<string, unknown[]>) {
  const log: { table: string; select: string; filters: Record<string, unknown>; order: string | null }[] = [];
  function makeChain(table: string) {
    const rec = { table, select: '', filters: {} as Record<string, unknown>, order: null as string | null };
    log.push(rec);
    const rows = tables[table] ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    chain.select = (s: string) => { rec.select = s; return chain; };
    chain.eq = (c: string, v: unknown) => { rec.filters[c] = v; return chain; };
    chain.order = (c: string, o?: { ascending?: boolean }) => {
      rec.order = `${c}:${o?.ascending === false ? 'desc' : 'asc'}`;
      return chain;
    };
    chain.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve);
    return chain;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = { from: (table: string) => makeChain(table) } as any;
  return { client, log };
}

test('results carry the score and the comments, newest attempt first', async () => {
  const { client, log } = stubTables({
    assessment_attempts: [
      { id: 'a-2', attempt_number: 2, status: 'graded', score_earned: '5', score_possible: '6', passed: true, graded_at: '2026-10-02T09:00:00Z' },
      { id: 'a-1', attempt_number: 1, status: 'graded', score_earned: '2', score_possible: '6', passed: false, graded_at: '2026-10-01T09:00:00Z' },
      { id: 'a-0', attempt_number: 0, status: 'submitted', score_earned: null, score_possible: null, passed: null, graded_at: null },
    ],
    assessment_responses: [
      {
        score: '3', is_correct: true, grading_feedback: 'Cite the verse next time.',
        assessment_questions: [{ content: { prompt: 'Explain your reasoning' }, points: '3', grading_method: 'manual' }],
      },
      {
        score: '2', is_correct: true, grading_feedback: null,
        assessment_questions: [{ content: { prompt: 'Choose yes' }, points: '2', grading_method: 'automatic' }],
      },
    ],
  });

  const results = await fetchAttemptResults(client, { enrolmentId: 'e-1', assessmentId: 'as-1' });

  // An ungraded attempt is not a result: it has no score and nothing was said.
  assert.equal(results.length, 2);
  assert.equal(results[0]?.attemptNumber, 2);
  assert.equal(results[0]?.scoreEarned, 5);
  assert.equal(results[0]?.passed, true);
  assert.equal(results[0]?.comments.length, 1, 'an answer with no comment was listed as one');
  assert.equal(results[0]?.comments[0]?.prompt, 'Explain your reasoning');
  assert.equal(results[0]?.comments[0]?.feedback, 'Cite the verse next time.');
  assert.equal(results[0]?.comments[0]?.points, 3);

  const attemptQuery = log.find((c) => c.table === 'assessment_attempts');
  assert.equal(attemptQuery?.order, 'attempt_number:desc');
  assert.deepEqual(attemptQuery?.filters, {
    course_enrolment_id: 'e-1',
    assessment_id: 'as-1',
  });
});

test('no graded attempts means no results and no second query', async () => {
  const { client, log } = stubTables({
    assessment_attempts: [
      { id: 'a-1', attempt_number: 1, status: 'submitted', score_earned: null, score_possible: null, passed: null, graded_at: null },
    ],
  });
  assert.deepEqual(await fetchAttemptResults(client, { enrolmentId: 'e-1', assessmentId: 'as-1' }), []);
  assert.equal(log.length, 1, 'responses were fetched for an ungraded attempt');
});

test('a missing id asks for nothing', async () => {
  const { client, log } = stubTables({ assessment_attempts: [] });
  assert.deepEqual(await fetchAttemptResults(client, { enrolmentId: '', assessmentId: 'as-1' }), []);
  assert.equal(log.length, 0);
});

test('manual grading rejects a negative score before the database call', async () => {
  const { client, calls } = stubRpc();
  const result = await markManualAssessmentResponse(client, {
    responseId: 'response-1', score: -1, isCorrect: false,
  });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});
