import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRecordRemoval,
  describeIdentityRemoval,
  EMPTY_IDENTITY_QUEUE,
  identityAttentionLines,
  identityLookupSentence,
  identityQueueHeadline,
  identityRefusalSentence,
  identityRowSituation,
  parseIdentityLookup,
  parseIdentityQueue,
  type IdentityQueue,
  type IdentityQueueRow,
} from './identity.ts';

function queue(over: Partial<IdentityQueue> = {}): IdentityQueue {
  return { ...EMPTY_IDENTITY_QUEUE, ...over };
}

function row(over: Partial<IdentityQueueRow> = {}): IdentityQueueRow {
  return {
    userId: '11111111-1111-1111-1111-111111111111',
    closedAt: '2026-10-01T09:00:00Z',
    label: 'Deleted account',
    erased: true,
    erasedAt: '2026-10-01T09:00:00Z',
    recordedRemoved: false,
    ...over,
  };
}

test('an empty ledger is stated as a fact about the ledger, not a claim about people', () => {
  // The failure this prevents: "0 outstanding" read as "everybody who ever
  // erased has been removed", on a ledger that starts the day it was created.
  assert.equal(
    identityQueueHeadline(queue()),
    'No account has ever been closed, so there is no sign-in left behind.',
  );
  const closedAndClean = identityQueueHeadline(queue({ closedAccounts: 4, removed: 4 }));
  assert.match(closedAndClean, /4 closed accounts have/);
  assert.match(closedAndClean, /no sign-in left at the provider/);
});

test('the headline names the provider and says why this database cannot fix it', () => {
  const sentence = identityQueueHeadline(queue({ closedAccounts: 3, stillAtProvider: 3, unrecorded: 3 }));
  assert.match(sentence, /3 closed accounts can/);
  assert.match(sentence, /still sign in/);
  assert.match(sentence, /authentication provider/);
  assert.match(sentence, /deleted in Supabase, then recorded here/);
});

test('one outstanding identity is not said as a plural', () => {
  const sentence = identityQueueHeadline(queue({ closedAccounts: 1, stillAtProvider: 1, unrecorded: 1 }));
  assert.match(sentence, /1 closed account can/);
  assert.doesNotMatch(sentence, /1 closed accounts/);
});

test('each row says where the account is in the process, and never the name', () => {
  // Every closed account is renamed 'Deleted account' by `erase_my_account`, so
  // the label is not information — the date and the state are.
  assert.equal(
    identityRowSituation(row()),
    'Closed 1 Oct 2026 · in the ledger, sign-in still at the provider',
  );
  assert.match(identityRowSituation(row({ erased: false })), /not yet in the ledger/);
  assert.match(
    identityRowSituation(row({ recordedRemoved: true })),
    /recorded as deleted at the provider/,
  );
  assert.match(
    identityRowSituation(row({ closedAt: null })),
    /did not record/,
  );
});

test('the press is not offered twice for one deletion', () => {
  assert.equal(canRecordRemoval(row()), true);
  assert.equal(canRecordRemoval(row({ recordedRemoved: true })), false);
  assert.equal(canRecordRemoval(row({ userId: '' })), false);
});

test('a recorded removal repeats the database’s count, not a prediction', () => {
  assert.equal(
    describeIdentityRemoval({ recorded: true, remainingAtProvider: 0 }),
    'Recorded. No closed account has a sign-in left at the provider.',
  );
  assert.match(
    describeIdentityRemoval({ recorded: true, remainingAtProvider: 1 }),
    /1 closed account still has/,
  );
  assert.match(
    describeIdentityRemoval({ recorded: true, remainingAtProvider: 5 }),
    /5 closed accounts still have/,
  );
});

test('an active account whose identity vanished is called out separately', () => {
  // Not a tidiness issue: that person cannot sign in, cannot be mailed, and will
  // not find out until they try.
  const [line] = identityAttentionLines(queue({ activeWithoutIdentity: 2 }));
  assert.ok(line, 'nothing was said about an active account with no identity');
  assert.match(line, /2 accounts are active with no identity/);
  assert.match(line, /cannot sign in/);
});

test('a ledger that disagrees with the provider is reported as the bug it is', () => {
  const [drift] = identityAttentionLines(queue({ stillAtProvider: 4, unrecorded: 1 }));
  assert.ok(drift, 'a ledger that disagrees with the provider was not reported');
  assert.match(drift, /3 identities are recorded as removed while the provider/);
});

test('a lookup that finds nothing keeps the limit on what that means', () => {
  const miss = identityLookupSentence({
    found: false,
    erasedAt: null,
    identityRemovedAt: null,
    stillAtProvider: false,
    activeAccountsAtAddress: 0,
    note: 'No erased account was recorded for this address. That is not proof it was never used here: the ledger starts on 2026-11-01.',
  });
  assert.match(miss, /not proof it was never used here/);
  assert.match(miss, /2026-11-01/);
});

test('a lookup that finds somebody says what is still possible for them', () => {
  const still = identityLookupSentence({
    found: true,
    erasedAt: '2026-10-02T10:00:00Z',
    identityRemovedAt: null,
    stillAtProvider: true,
    activeAccountsAtAddress: 0,
    note: '',
  });
  assert.match(still, /closed on 2 Oct 2026/);
  assert.match(still, /can still sign in/);

  const gone = identityLookupSentence({
    found: true,
    erasedAt: '2026-10-02T10:00:00Z',
    identityRemovedAt: '2026-11-01T08:00:00Z',
    stillAtProvider: false,
    activeAccountsAtAddress: 1,
    note: '',
  });
  assert.match(gone, /deleted at the provider on 1 Nov 2026/);
  assert.doesNotMatch(gone, /can still sign in/);
  assert.match(gone, /came back/);
});

test('every refusal the database can give has a sentence, and none of them blame the browser', () => {
  assert.match(identityRefusalSentence('identity:still_present'), /Delete it there first/);
  assert.match(identityRefusalSentence('identity:already_recorded'), /twice/);
  assert.match(identityRefusalSentence('identity:not_closed'), /still open/);
  assert.match(identityRefusalSentence('identity:no_account'), /no account with that id/);
  assert.match(identityRefusalSentence('identity:not_allowed'), /platform owner/);
  assert.match(identityRefusalSentence('identity:address_required'), /address/);
  assert.match(identityRefusalSentence('42P01'), /Nothing was written/);
});

test('a jsonb reply of the wrong shape becomes zeroes, never NaN on the screen', () => {
  const parsed = parseIdentityQueue({ stillAtProvider: null, rows: 'nope' });
  assert.equal(parsed.stillAtProvider, 0);
  assert.deepEqual(parsed.rows, []);
  assert.doesNotMatch(identityQueueHeadline(parsed), /NaN/);

  const one = parseIdentityQueue({
    closedAccounts: 1,
    stillAtProvider: 1,
    rows: [{ userId: 7, label: '', closedAt: 5 }],
  });
  assert.equal(one.rows.length, 1);
  const [first] = one.rows;
  assert.ok(first, 'the row was dropped instead of defaulted');
  assert.equal(first.userId, '');
  assert.equal(first.label, 'Deleted account');
  assert.equal(first.closedAt, null);
  assert.equal(first.erased, false);
});

test('a lookup reply is parsed as the conservative answer when it is malformed', () => {
  const parsed = parseIdentityLookup({ found: 'yes', stillAtProvider: 1 });
  assert.equal(parsed.found, false);
  assert.equal(parsed.stillAtProvider, false);
  assert.equal(parsed.activeAccountsAtAddress, 0);
});
