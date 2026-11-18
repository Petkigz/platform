import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  MERGE_MOVES,
  confirmsMerge,
  leftBehind,
  mergeStateOf,
  movesOf,
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

test('a request in a state the table does not have is not drawn', () => {
  const parsed = parseMergeBoard(board({ outgoing: [{ id: 'r9', status: 'approved' }, { id: 'r8', status: 'declined' }] }));
  assert.deepEqual(parsed?.outgoing.map((request) => request.id), ['r8']);
});

// ---------------------------------------------------------------------------
// Naming it
// ---------------------------------------------------------------------------

test('a request that ran out while waiting is said as that, whatever its row says', () => {
  assert.equal(mergeStateOf({ status: 'pending', expired: false }), 'pending');
  assert.equal(mergeStateOf({ status: 'pending', expired: true }), 'expired');
  assert.equal(mergeStateOf({ status: 'expired', expired: false }), 'expired');
  assert.equal(mergeStateOf({ status: 'completed', expired: false }), 'completed');
});

test('what moved is names and counts in a fixed order, and nothing that did not move', () => {
  assert.deepEqual(movesOf({ certificates: 1, enrolments: 2, notifications: 0, somethingNew: 4 }), [
    { kind: 'enrolments', count: 2 },
    { kind: 'certificates', count: 1 },
  ]);
  assert.deepEqual(movesOf(null), []);
  assert.deepEqual(movesOf({}), []);
});

test('every count the merge reports has a name here, and what stayed is not among them', () => {
  const sql = readFileSync(
    new URL('../../../supabase/migrations/20261281000800_account_merge.sql', import.meta.url),
    'utf8',
  );
  const reported = [...sql.matchAll(/v_moved \|\| jsonb_build_object\('([A-Za-z]+)'/gu)].map((m) => m[1]);
  assert.equal(reported.length, 16);
  assert.deepEqual([...new Set(reported)].filter((name) => name !== 'leftBehind').sort(), [...MERGE_MOVES].sort());
  assert.equal((MERGE_MOVES as readonly string[]).includes('leftBehind'), false);
});

test('this file holds no sentence', () => {
  const source = readFileSync(new URL('./merge.ts', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gmu, '');
  assert.equal(/'[A-Z][a-z]+ [a-z]/u.test(source), false);
  assert.equal(source.includes('toLocale'), false);
});

test('what stayed behind is reported separately, and only when there is some', () => {
  assert.equal(leftBehind({ leftBehind: 3 }), 3);
  assert.equal(leftBehind({ leftBehind: 0 }), null);
  assert.equal(leftBehind({}), null);
});

test('the confirmation is the name as the database compares it: trimmed, and otherwise exact', () => {
  assert.equal(confirmsMerge(' Ama Osei ', 'Ama Osei'), true);
  assert.equal(confirmsMerge('Ama Osei', ' Ama Osei '), true);
  // The database refuses these two, so the button does not light for them.
  assert.equal(confirmsMerge('ama osei', 'Ama Osei'), false);
  assert.equal(confirmsMerge('Ama  Osei', 'Ama Osei'), false);
  assert.equal(confirmsMerge('Ama', 'Ama Osei'), false);
  assert.equal(confirmsMerge('', 'Ama Osei'), false);
});

test('an account with no name confirms nothing, though the database would take an empty box', () => {
  assert.equal(confirmsMerge('', ''), false);
  assert.equal(confirmsMerge('', null), false);
  assert.equal(confirmsMerge('Ama Osei', ''), false);
  const sql = readFileSync(
    new URL('../../../supabase/migrations/20261281000800_account_merge.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /if btrim\(coalesce\(p_confirm, ''\)\) <> btrim\(coalesce\(v_name, ''\)\) then/u);
});
