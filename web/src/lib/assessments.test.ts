import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateCreateAssessment,
  validateAddQuestion,
  addAssessmentQuestion,
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
  assert.notEqual(call.args.p_answer_key, null,
    'an automatically graded question must carry its answer key');
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
