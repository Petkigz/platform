import assert from 'node:assert/strict';
import test from 'node:test';

import { emptyQueueLede, outstandingSteps, setupSteps, subjectsNote, type SetupFacts } from './setup.ts';

const fresh: SetupFacts = { subjects: 0, courses: 0, published: 0, reviewers: 0 };
const working: SetupFacts = { subjects: 6, courses: 3, published: 2, reviewers: 1 };

test('a fresh deployment has every step outstanding, in dependency order', () => {
  const steps = setupSteps(fresh);

  assert.deepEqual(steps.map((s) => s.key), ['reviewers', 'courses', 'published']);
  assert.ok(steps.every((s) => !s.done));
});

test('a working platform has nothing outstanding and no panel', () => {
  assert.deepEqual(outstandingSteps(working), []);
});

test('each step is done by its own fact, not by a later one', () => {
  const reviewerOnly = outstandingSteps({ ...fresh, reviewers: 1 });
  assert.deepEqual(reviewerOnly.map((s) => s.key), ['courses', 'published']);

  const courseOnly = outstandingSteps({ ...fresh, reviewers: 1, courses: 1 });
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

test('subjects are a fact, not a step with no button', () => {
  assert.equal(setupSteps(fresh).some((s) => s.key === ('subjects' as never)), false);
  assert.match(subjectsNote({ ...fresh, subjects: 6 }), /6 subject areas/);
  assert.match(subjectsNote({ ...fresh, subjects: 1 }), /1 subject area\./);
});

test('a deployment with no subjects is named as unfinished, not as a task', () => {
  const note = subjectsNote(fresh);

  assert.match(note, /seed migration/);
  assert.doesNotMatch(note, /add a subject/i, 'the note asked for an action no screen offers');
});

test('an empty queue line does not claim the work is done', () => {
  const line = emptyQueueLede(fresh);

  assert.ok(line);
  assert.match(line, /nothing is here yet/);
  assert.doesNotMatch(line, /Every queue you can work was checked/);
});

test('with work outstanding the number is singular or plural, not "1 things"', () => {
  assert.match(emptyQueueLede({ ...fresh, reviewers: 1, courses: 1 }) ?? '', /one thing/);
  assert.match(emptyQueueLede({ ...fresh, reviewers: 1 }) ?? '', /2 things/);
});

test('a set-up platform with empty queues keeps the page’s own sentence', () => {
  assert.equal(emptyQueueLede(working), null);
});
