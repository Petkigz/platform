import assert from 'node:assert/strict';
import test from 'node:test';

import { en } from './i18n/messages/en.ts';
import { emptyQueueLede, outstandingSteps, setupSteps, subjectsNote, type SetupFacts } from './setup.ts';

const fresh: SetupFacts = { subjects: 0, courses: 0, published: 0, reviewers: 0 };
const working: SetupFacts = { subjects: 6, courses: 3, published: 2, reviewers: 1 };

test('a fresh deployment has every step outstanding, in dependency order', () => {
  const steps = setupSteps(fresh);

  assert.deepEqual(steps.map((s) => s.key), ['subjects', 'reviewers', 'courses', 'published']);
  assert.ok(steps.every((s) => !s.done));
});

test('a working platform has nothing outstanding and no panel', () => {
  assert.deepEqual(outstandingSteps(working), []);
});

test('each step is done by its own fact, not by a later one', () => {
  const base = { ...fresh, subjects: 6 };

  const reviewerOnly = outstandingSteps({ ...base, reviewers: 1 });
  assert.deepEqual(reviewerOnly.map((s) => s.key), ['courses', 'published']);

  const courseOnly = outstandingSteps({ ...base, reviewers: 1, courses: 1 });
  assert.deepEqual(courseOnly.map((s) => s.key), ['published'], 'a draft course published nothing');
});

test('every step points at a screen', () => {
  for (const step of setupSteps(fresh)) {
    assert.match(step.href, /^\/admin\//, `${step.key} has no screen`);
  }
});

test('each step carries today’s count and two sentences of the catalogue', () => {
  const done = setupSteps(working);
  assert.deepEqual(done.map((step) => [step.key, step.count, step.done]), [
    ['reviewers', 1, true], ['courses', 3, true], ['published', 2, true],
  ]);

  const empty = setupSteps(fresh);
  assert.deepEqual(empty.map((step) => step.done), [false, false, false, false]);
  for (const step of empty) {
    assert.ok(en[step.title].length > 0 && en[step.why].length > 0, step.key);
    // The name is a thing to have, the sentence is what its absence stops.
    assert.doesNotMatch(en[step.title], /\./u, step.key);
    assert.match(en[step.why], /\.$/u, step.key);
  }
  assert.equal(new Set(empty.flatMap((step) => [step.title, step.why])).size, 8);
});

test('subjects are a step only when there are none, and it points at a screen', () => {
  const withNone = setupSteps(fresh);
  assert.equal(withNone[0]!.key, 'subjects');
  assert.equal(withNone[0]!.href, '/admin/subjects');

  const withSome = setupSteps({ ...fresh, subjects: 6 });
  assert.equal(withSome.some((step) => step.key === 'subjects'), false,
    'a working platform was told to add subjects beside 37 of them');
});

test('the subject line reports a count, and says what its absence stops', () => {
  assert.deepEqual(subjectsNote({ ...fresh, subjects: 6 }), { key: 'staff.subjectsSome', vars: { count: 6 } });
  assert.deepEqual(subjectsNote(fresh), { key: 'staff.subjectsNone' });
  assert.match(en['staff.subjectsNone'], /no course can be filed/);
});

test('an empty queue line does not claim the work is done', () => {
  const line = emptyQueueLede(fresh);

  assert.ok(line);
  assert.equal(line.key, 'staff.zeroSetup');
  assert.match(en[line.key], /queues listed here are empty/);
  assert.match(en[line.key], /still needed before anybody can study/);
});

test('the count is handed over as a number and follows a colon, so no word has to agree with it', () => {
  assert.deepEqual(emptyQueueLede({ ...fresh, subjects: 6, reviewers: 1, courses: 1 })?.vars, { count: 1 });
  assert.deepEqual(emptyQueueLede({ ...fresh, subjects: 6, reviewers: 1 })?.vars, { count: 2 });
  for (const key of ['staff.zeroSetup', 'staff.subjectsSome', 'staff.waiting', 'staff.dormantHead'] as const) {
    assert.match(en[key], /: \{count\}/u, key);
    assert.doesNotMatch(en[key], /\{count\} [a-z]/u, key);
  }
});

test('a set-up platform with empty queues keeps the page’s own sentence', () => {
  assert.equal(emptyQueueLede(working), null);
});
