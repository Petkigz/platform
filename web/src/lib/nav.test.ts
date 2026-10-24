import assert from 'node:assert/strict';
import test from 'node:test';

import { isCurrentPath, normalisePath } from './nav.ts';

test('a section is current on its own page and under it', () => {
  assert.equal(isCurrentPath('/catalogue', '/catalogue'), true);
  assert.equal(isCurrentPath('/learn/abc/lesson/xyz', '/learn'), true);
  assert.equal(isCurrentPath('/teach/course-1/cohorts/c1', '/teach'), true);
});

test('a prefix that is not a path segment is not the same section', () => {
  // The bug a bare `startsWith` has: every one of these would be "learn".
  assert.equal(isCurrentPath('/learned', '/learn'), false);
  assert.equal(isCurrentPath('/learn-paths', '/learn'), false);
  assert.equal(isCurrentPath('/cat', '/catalogue'), false);
  assert.equal(isCurrentPath('/teaching', '/teach'), false);
});

test('home is only home', () => {
  assert.equal(isCurrentPath('/', '/'), true);
  assert.equal(isCurrentPath('/catalogue', '/'), false);
});

test('trailing slashes, queries and fragments do not change the answer', () => {
  assert.equal(isCurrentPath('/catalogue/', '/catalogue'), true);
  assert.equal(isCurrentPath('/catalogue?page=2', '/catalogue'), true);
  assert.equal(isCurrentPath('/verify/AS-1#top', '/verify'), true);
  assert.equal(normalisePath(''), '/');
  assert.equal(normalisePath('///'), '/');
  assert.equal(normalisePath('/learn//'), '/learn');
});

test('nothing is current without a pathname', () => {
  assert.equal(isCurrentPath(null, '/learn'), false);
  assert.equal(isCurrentPath(undefined, '/learn'), false);
});
