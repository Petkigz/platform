import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ASSIGNMENT_STATUS_LABEL,
  WATCHABLE_ASSIGNMENT_STATUSES,
  isAssignmentWatchable,
  type AssignmentStatus,
} from './review.ts';

// The states a content review assignment can be in. Written out here so that
// adding one to the schema without deciding whether its media is served breaks a
// test rather than silently landing on one side of the line.
const EVERY_STATUS: AssignmentStatus[] = [
  'offered', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled',
];

test('media is served while a review is open, and only while it is open', () => {
  // This must match may_review_version_media() in
  // 20261213000100_reviewer_media_access.sql, which requires accepted or
  // in_progress. The database decides; this list is what a screen uses to say why
  // a lesson is not playable.
  assert.deepEqual([...WATCHABLE_ASSIGNMENT_STATUSES], ['accepted', 'in_progress']);
  assert.equal(isAssignmentWatchable('accepted'), true);
  assert.equal(isAssignmentWatchable('in_progress'), true);
});

test('an assignment that has not started, or has ended, is not watchable', () => {
  // Somebody who declined never was, and somebody who finished stops being served
  // the moment they finish: the reason for the access ended, so the access ends.
  assert.equal(isAssignmentWatchable('offered'), false);
  assert.equal(isAssignmentWatchable('declined'), false);
  assert.equal(isAssignmentWatchable('completed'), false);
  assert.equal(isAssignmentWatchable('cancelled'), false);
});

test('every status has been decided, one way or the other', () => {
  for (const status of EVERY_STATUS) {
    assert.equal(typeof isAssignmentWatchable(status), 'boolean',
      `${status} had no answer`);
    assert.equal(WATCHABLE_ASSIGNMENT_STATUSES.includes(status),
      isAssignmentWatchable(status),
      `${status} disagreed with the list`);
  }
  const watchable = EVERY_STATUS.filter(isAssignmentWatchable);
  assert.equal(watchable.length, 2, `expected two open states, found ${watchable.join(', ')}`);
});

test('every status has a label, because a page prints it', () => {
  for (const status of EVERY_STATUS) {
    const label = ASSIGNMENT_STATUS_LABEL[status];
    assert.ok(label && label.length > 0, `${status} has no label`);
  }
  // The review page lowercases the label into a sentence, so no label may be a
  // whole sentence of its own.
  for (const status of EVERY_STATUS) {
    assert.equal(/[.!?]$/.test(ASSIGNMENT_STATUS_LABEL[status]), false,
      `${status} is labelled with a sentence`);
  }
});
