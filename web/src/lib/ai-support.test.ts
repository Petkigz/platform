import assert from 'node:assert/strict';
import test from 'node:test';

import {
  askAiSupport,
  describeAiSupportStatus,
  mapAskRefusal,
  normaliseAiSupportAnswer,
} from './ai-support.ts';

// The interesting assertions here are about what is refused. A study assistant on
// a platform that teaches a religion is only as safe as the answers it will not
// render, and every refusal in this file is one a future change could quietly
// remove.

type RpcCall = { fn: string; args: Record<string, unknown> };

function stub(result: { data?: unknown; error?: { message: string } }) {
  const calls: RpcCall[] = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

function citation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lessonId: 'lesson-1',
    lessonTitle: 'Pronouncing the letters correctly',
    sectionTitle: 'Makharij',
    courseId: 'course-1',
    courseSlug: 'tajwid-basics',
    courseTitle: 'Tajwid basics',
    snippet: 'Where each <mark>letter</mark> is produced.',
    matchedIn: 'description',
    href: '/courses/tajwid-basics',
    ...overrides,
  };
}

function answer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    questionId: 'q-1',
    status: 'answered',
    message: 'This is what your courses cover on that.',
    citations: [citation()],
    matchedPhrases: [],
    supportCaseId: null,
    supportCaseNumber: null,
    boundary: {
      retrievalOnly: true,
      model: null,
      generatedText: false,
      rules: 'A citation to a lesson you can open, or no answer.',
    },
    ...overrides,
  };
}

test('an answer is a citation, and the payload must say no model wrote it', () => {
  const read = normaliseAiSupportAnswer(answer());
  assert.ok(read);
  assert.equal(read?.citations.length, 1);
  assert.equal(read?.boundary.generatedText, false);

  // The three ways a payload could start claiming generation.
  assert.equal(normaliseAiSupportAnswer(answer({
    boundary: { retrievalOnly: true, model: 'gpt', generatedText: false },
  })), null, 'a payload naming a model was rendered');
  assert.equal(normaliseAiSupportAnswer(answer({
    boundary: { retrievalOnly: true, model: null, generatedText: true },
  })), null, 'a payload claiming generated text was rendered');
  assert.equal(normaliseAiSupportAnswer(answer({
    boundary: { retrievalOnly: false, model: null, generatedText: false },
  })), null, 'a payload that is not retrieval-only was rendered');
});

test('an "answered" answer with no citation is not an answer', () => {
  assert.equal(normaliseAiSupportAnswer(answer({ citations: [] })), null);
  assert.equal(normaliseAiSupportAnswer({
    status: 'answered',
    message: 'Here is a paragraph about the prayer.',
    citations: [],
    boundary: { retrievalOnly: true, model: null, generatedText: false },
  }), null, 'prose with no citation was rendered as an answer');
});

test('a refusal carrying a citation is not a refusal', () => {
  assert.equal(normaliseAiSupportAnswer(answer({
    status: 'refused_ruling', message: 'Ask a teacher.', citations: [citation()],
  })), null);
});

test('a ruling refusal is read with what it matched and where it went', () => {
  const read = normaliseAiSupportAnswer(answer({
    status: 'refused_ruling',
    message: 'That is a question for a teacher. We have opened case SC-000123.',
    citations: [],
    matchedPhrases: ['is it haram'],
    supportCaseNumber: 'SC-000123',
  }));
  assert.ok(read);
  assert.equal(read?.status, 'refused_ruling');
  assert.deepEqual(read?.matchedPhrases, ['is it haram']);
  assert.equal(read?.supportCaseNumber, 'SC-000123');
});

test('a citation without a destination or with an unknown match is refused', () => {
  assert.equal(normaliseAiSupportAnswer(answer({ citations: [citation({ href: '' })] })), null);
  assert.equal(normaliseAiSupportAnswer(answer({ citations: [citation({ matchedIn: 'body' })] })), null);
  assert.equal(normaliseAiSupportAnswer(answer({ citations: [citation({ lessonTitle: null })] })), null);
  assert.equal(normaliseAiSupportAnswer(null), null);
  assert.equal(normaliseAiSupportAnswer({}), null);
});

test('the question is sent as typed, and a refusal is not a 500', async () => {
  const { client, calls } = stub({ data: answer() });
  const result = await askAiSupport(client, { question: '  pronouncing the letters  ' });
  assert.equal(result.ok, true);
  assert.deepEqual(calls[0], {
    fn: 'ai_support_ask',
    args: { p_question: 'pronouncing the letters', p_course_id: null },
  });

  const refused = stub({ error: { message: 'ai_support:too_short' } });
  const short = await askAiSupport(refused.client, { question: 'ab' });
  assert.equal(short.ok, false, 'a two-character question was sent anyway');
  assert.equal(refused.calls.length, 0);
});

test('each refusal has a sentence, and an unreadable payload says so', async () => {
  assert.match(mapAskRefusal('ai_support:not_signed_in'), /Sign in/);
  assert.match(mapAskRefusal('ai_support:too_long'), /1000 characters/);
  assert.match(mapAskRefusal('something else'), /Nothing was recorded/);

  const shapeless = stub({ data: { status: 'answered', message: 'yes' } });
  const result = await askAiSupport(shapeless.client, { question: 'the positions of the prayer' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /will not render/);
});

test('each status has one line, and none of them claims to have answered', () => {
  assert.match(describeAiSupportStatus('answered'), /Found in your courses/);
  assert.match(describeAiSupportStatus('refused_ruling'), /teacher/);
  assert.match(describeAiSupportStatus('no_match'), /Nothing/);
  assert.match(describeAiSupportStatus('closed'), /Not switched on/);
});


test('retrieval-only transcript citations remain valid without relaxing the model boundary', () => {
  const payload = answer({ citations: [citation({ matchedIn: 'transcript' })] });
  assert.equal(normaliseAiSupportAnswer(payload)?.citations[0]?.matchedIn, 'transcript');
  assert.equal(normaliseAiSupportAnswer({ ...payload, boundary: { retrievalOnly: false, model: 'other', generatedText: true } }), null);
});
