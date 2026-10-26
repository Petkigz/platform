import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  confirmsMerge,
  describeBlocks,
  describeExpiry,
  describeMergeStatus,
  describeMoves,
  leftBehind,
  parseMergeBoard,
  parsePreview,
  parseSummary,
} from './merge.ts';

function board(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    incoming: [
      {
        id: 'r1',
        status: 'pending',
        requestedAt: '2026-10-20T10:00:00Z',
        expiresAt: '2026-11-03T10:00:00Z',
        expired: false,
        otherName: 'Ama',
        otherUserId: 'u1',
        preview: { ok: true, blocks: [], notes: ['the two learner records become one'] },
      },
    ],
    outgoing: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reading the reply
// ---------------------------------------------------------------------------

test('a board with a waiting request is read, with its preview', () => {
  const parsed = parseMergeBoard(board());
  assert(parsed);
  assert.equal(parsed.enabled, true);
  assert.equal(parsed.incoming.length, 1);
  assert.equal(parsed.incoming[0]!.otherName, 'Ama');
  assert.equal(parsed.incoming[0]!.preview?.ok, true);
  assert.deepEqual(parsed.incoming[0]!.preview?.notes, ['the two learner records become one']);
});

test('a reply that does not say whether the feature is on is refused', () => {
  assert.equal(parseMergeBoard({ incoming: [], outgoing: [] }), null);
  assert.equal(parseMergeBoard(null), null);
});

test('a request with no id or status is dropped rather than rendered blank', () => {
  const parsed = parseMergeBoard(board({
    incoming: [{ status: 'pending' }, { id: 'r2' }, { id: 'r3', status: 'pending' }],
  }));
  assert(parsed);
  assert.equal(parsed.incoming.length, 1);
  assert.equal(parsed.incoming[0]!.id, 'r3');
});

test('a preview that does not claim to be fine is not treated as fine', () => {
  // Anything other than an explicit `ok: true` leaves the merge blocked: the
  // screen must not offer a button the database will refuse.
  assert.equal(parsePreview({ blocks: [] })?.ok, false);
  assert.equal(parsePreview({ ok: 'yes', blocks: [] })?.ok, false);
  assert.equal(parsePreview({ ok: true, blocks: [] })?.ok, true);
});

test('only counts are read out of a summary', () => {
  const summary = parseSummary({ enrolments: 2, notes: 'many', roles: -1, bookmarks: 0 });
  assert(summary);
  assert.equal(summary.enrolments, 2);
  assert.equal(summary.bookmarks, 0);
  assert.equal(summary.notes, undefined);
  assert.equal(summary.roles, undefined);
});

// ---------------------------------------------------------------------------
// Saying it
// ---------------------------------------------------------------------------

test('a status is said in words a person uses', () => {
  assert.equal(describeMergeStatus('pending'), 'Waiting');
  assert.equal(describeMergeStatus('completed'), 'Merged');
  assert.equal(describeMergeStatus('declined'), 'Declined');
  assert.equal(describeMergeStatus('cancelled'), 'Withdrawn');
  assert.equal(describeMergeStatus('pending', true), 'Expired');
  assert.equal(describeMergeStatus('expired'), 'Expired');
});

test('what moved is listed in words, and nothing that did not move is listed', () => {
  const lines = describeMoves({ enrolments: 2, certificates: 1, notifications: 0 });
  assert.deepEqual(lines, ['2 enrolments', '1 certificate']);
});

test('a single item is singular, because "1 enrolments" reads as a bug', () => {
  assert.deepEqual(describeMoves({ enrolments: 1 }), ['1 enrolment']);
  assert.deepEqual(describeMoves({ assessmentAttempts: 1 }), ['1 assessment attempt']);
});

test('nothing to report is an empty list rather than a zero', () => {
  assert.deepEqual(describeMoves(null), []);
  assert.deepEqual(describeMoves({}), []);
});

test('what stayed behind is reported separately, and only when there is some', () => {
  assert.equal(leftBehind({ leftBehind: 3 }), 3);
  assert.equal(leftBehind({ leftBehind: 0 }), null);
  assert.equal(leftBehind({}), null);
});

test('the refusal is shown as the sentences the database gave', () => {
  const message = describeBlocks({
    ok: false,
    blocks: ['this account has 1 payout(s) in flight', 'both accounts have started "Fiqh"'],
    notes: [],
  });
  assert.match(message ?? '', /payout/);
  assert.match(message ?? '', /Fiqh/);
});

test('a refusal with no reason says so rather than inventing one', () => {
  const message = describeBlocks({ ok: false, blocks: [], notes: [] });
  assert.match(message ?? '', /did not say why/);
});

test('a preview that passed has nothing to refuse', () => {
  assert.equal(describeBlocks({ ok: true, blocks: [], notes: [] }), null);
  assert.equal(describeBlocks(null), null);
});

test('the expiry date is written as a date, in UTC like the window it came from', () => {
  assert.equal(describeExpiry('2026-11-03T23:30:00Z'), '3 November 2026');
  assert.equal(describeExpiry(null), null);
  assert.equal(describeExpiry('not a date'), null);
});

test('the confirmation ignores case and spacing, and nothing else', () => {
  assert.equal(confirmsMerge('ama  osei', 'Ama Osei'), true);
  assert.equal(confirmsMerge(' AMA OSEI ', 'Ama Osei'), true);
  assert.equal(confirmsMerge('Ama', 'Ama Osei'), false);
  assert.equal(confirmsMerge('', 'Ama Osei'), false);
  assert.equal(confirmsMerge('Ama Osei', ''), false);
});
