import test from 'node:test';
import assert from 'node:assert/strict';
import { draftLocalQuiz, LOCAL_QUIZ_URL, LOCAL_QUIZ_MODEL } from './local-quiz.ts';

const source = 'A learner should review this sample lesson carefully before answering questions.';
const respond = (response: string) => new Response(JSON.stringify({ response }), { status: 200 });

test('local drafts use only the fixed loopback model and keep the teacher source separate', async () => {
  let called = false;
  const result = await draftLocalQuiz(source, async (url, init) => {
    called = true;
    assert.equal(url, LOCAL_QUIZ_URL);
    assert.equal(init?.redirect, 'error');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, LOCAL_QUIZ_MODEL);
    assert.equal(body.stream, false);
    assert.match(body.system, /untrusted data/);
    assert.ok(body.prompt.includes(source));
    return respond(JSON.stringify({ questions: [{ question: 'What should a learner review?', answer: 'The sample lesson.' }] }));
  });
  assert.equal(called, true);
  assert.deepEqual(result, { ok: true, questions: [{ question: 'What should a learner review?', answer: 'The sample lesson.' }] });
});

test('invalid input never contacts the local model', async () => {
  const fetcher: typeof fetch = async () => { throw new Error('must not call'); };
  assert.equal((await draftLocalQuiz('short', fetcher)).ok, false);
  assert.equal((await draftLocalQuiz('x'.repeat(8001), fetcher)).ok, false);
});

test('malformed, excessive and unavailable model responses are refused', async () => {
  for (const response of [
    new Response('bad json'),
    respond('not json'),
    respond(JSON.stringify({ questions: [] })),
    respond(JSON.stringify({ questions: [{ question: 'A', answer: '' }] })),
    respond(JSON.stringify({ questions: Array(4).fill({ question: 'A', answer: 'B' }) })),
    new Response('unavailable', { status: 500 }),
    new Response('x'.repeat(50001)),
  ]) {
    const result = await draftLocalQuiz(source, async () => response);
    assert.equal(result.ok, false);
  }
  assert.equal((await draftLocalQuiz(source, async () => { throw new Error('offline'); })).ok, false);
});
