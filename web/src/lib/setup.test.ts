import assert from 'node:assert/strict';
import test from 'node:test';

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

test('each sentence describes today rather than giving advice', () => {
  const done = setupSteps(working);
  assert.match(done[0]!.detail, /1 reviewer is active/);
  assert.match(done[1]!.detail, /3 courses exist/);
  assert.match(done[2]!.detail, /2 versions are published/);

  const empty = setupSteps(fresh);
  assert.doesNotMatch(empty[0]!.detail, /reviewer is active/);
});

test('singular and plural are not the same sentence', () => {
  const one = setupSteps({ subjects: 1, courses: 1, published: 1, reviewers: 1 });
  assert.match(one[0]!.detail, /1 reviewer is active/);
  assert.match(one[2]!.detail, /1 version is published/);
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
  assert.match(subjectsNote({ ...fresh, subjects: 6 }), /6 subject areas/);
  assert.match(subjectsNote({ ...fresh, subjects: 1 }), /1 subject area\./);
  assert.match(subjectsNote(fresh), /nothing can be tagged/);
});

test('an empty queue line does not claim the work is done', () => {
  const line = emptyQueueLede(fresh);

  assert.ok(line);
  assert.match(line, /nothing is here yet/);
  assert.doesNotMatch(line, /Every queue you can work was checked/);
});

test('with work outstanding the number is singular or plural, not "1 things"', () => {
  assert.match(emptyQueueLede({ ...fresh, subjects: 6, reviewers: 1, courses: 1 }) ?? '', /one thing/);
  assert.match(emptyQueueLede({ ...fresh, subjects: 6, reviewers: 1 }) ?? '', /2 things/);
});

test('a set-up platform with empty queues keeps the page’s own sentence', () => {
  assert.equal(emptyQueueLede(working), null);
});
