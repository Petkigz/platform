import assert from 'node:assert/strict';
import test from 'node:test';
import { describeBytes, describeRemaining, isPlayable } from './offline.ts';

const now = new Date('2026-10-22T12:00:00Z');

test('a save counts down in whole days and says when it has gone', () => {
  assert.equal(describeRemaining('2026-10-23T12:00:00Z', now), '1 day left');
  assert.equal(describeRemaining('2026-10-31T12:00:00Z', now), '9 days left');
  assert.equal(describeRemaining('2026-10-22T11:59:00Z', now), 'expired');
});

test('playability is the clock, not a flag', () => {
  assert.equal(isPlayable('2026-10-22T12:01:00Z', now), true);
  assert.equal(isPlayable('2026-10-22T12:00:00Z', now), false);
  assert.equal(isPlayable('2026-09-01T12:00:00Z', now), false);
});

test('storage is described the way a phone would describe it', () => {
  assert.equal(describeBytes(900 * 1024), '900 KB');
  assert.equal(describeBytes(5 * 1024 * 1024), '5.0 MB');
  assert.equal(describeBytes(2.5 * 1024 * 1024 * 1024), '2.50 GB');
  // Nothing useful is "0 KB".
  assert.equal(describeBytes(10), '1 KB');
});
