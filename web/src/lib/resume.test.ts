import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLAYBACK_SPEEDS,
  clampPosition,
  formatPosition,
  loopLabel,
  resumeLabel,
  shouldLoopBack,
  shouldResume,
  stepSpeed,
} from './resume.ts';

test('a position is a whole number of seconds inside one day', () => {
  assert.equal(clampPosition(74.9), 74);
  assert.equal(clampPosition(-0.4), 0, 'a seek can land just before zero');
  assert.equal(clampPosition(Number.NaN), 0);
  assert.equal(clampPosition(Infinity), 0);
  assert.equal(clampPosition(999999), 86400);
  assert.equal(clampPosition(null), 0);
});

test('a time is said the way a player says it', () => {
  assert.equal(formatPosition(0), '0:00');
  assert.equal(formatPosition(75), '1:15');
  assert.equal(formatPosition(754), '12:34');
  assert.equal(formatPosition(3725), '1:02:05');
});

test('the first seconds of a lesson are not "where you were"', () => {
  // Jumping someone 10 seconds forward every time they open a lesson is worse
  // than starting at the beginning.
  assert.equal(shouldResume(0), false);
  assert.equal(shouldResume(14), false);
  assert.equal(shouldResume(15), true);
  assert.equal(shouldResume(null), false);
  assert.equal(shouldResume(undefined), false);
});

test('a lesson left at its end does not resume at its end', () => {
  assert.equal(shouldResume(590, 600), false, 'ten seconds from the end is finished');
  assert.equal(shouldResume(575, 600), true, 'twenty-five seconds is still a place');
  // Without a duration we cannot know, so the place is honoured.
  assert.equal(shouldResume(590, null), true);
});

test('the resume sentence names the moment, and says nothing when there is none', () => {
  assert.equal(resumeLabel(754), 'Resuming at 12:34.');
  assert.equal(resumeLabel(3), null);
});

test('the speeds a recitation player offers go slow enough to repeat after', () => {
  assert.deepEqual([...PLAYBACK_SPEEDS], [0.5, 0.75, 1, 1.25, 1.5]);
  assert.equal(stepSpeed(1, -1), 0.75);
  assert.equal(stepSpeed(1, 1), 1.25);
  // The ends are the ends.
  assert.equal(stepSpeed(0.5, -1), 0.5);
  assert.equal(stepSpeed(1.5, 1), 1.5);
  // An unknown rate starts from normal rather than jumping to an end.
  assert.equal(stepSpeed(2, -1), 0.75);
});

test('a marked passage is described in all its half-marked states', () => {
  assert.equal(loopLabel({ from: null, to: null }), null);
  assert.match(loopLabel({ from: 70, to: null }) ?? '', /from 1:10.*mark where it ends/);
  assert.match(loopLabel({ from: null, to: 100 }) ?? '', /up to 1:40.*mark where it starts/);
  assert.equal(loopLabel({ from: 70, to: 100 }), 'Repeating 1:10 – 1:40.');
  assert.match(loopLabel({ from: 100, to: 70 }) ?? '', /ends before it starts/);
});

test('the player loops back only when both ends are marked, in order', () => {
  assert.equal(shouldLoopBack({ from: 70, to: 100 }, 99), false);
  assert.equal(shouldLoopBack({ from: 70, to: 100 }, 100), true);
  assert.equal(shouldLoopBack({ from: 70, to: 100 }, 130), true);
  assert.equal(shouldLoopBack({ from: 70, to: null }, 200), false);
  assert.equal(shouldLoopBack({ from: null, to: 100 }, 200), false);
  assert.equal(shouldLoopBack({ from: 100, to: 70 }, 200), false, 'a backwards passage is not a loop');
});
