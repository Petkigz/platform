import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  HOLDS_NOTE,
  PURGE_NOTE,
  actionConfirmation,
  describeRetentionError,
  holdMeta,
  holdSentence,
  parseHoldCount,
  parseHolds,
  parseStorageQueue,
  storageSentence,
} from './coursework-retention.ts';

const hold = {
  asset_id: '2b1c7a9e-0000-4000-8000-000000000001',
  display_name: 'Page one.jpg',
  master_bucket: 'coursework',
  master_key: 'child/2026/page-one.jpg',
  reason: 'A safeguarding concern is open about this photograph.',
  opened_by: '5a6b7c8d-0000-4000-8000-000000000002',
  opened_by_name: 'Hafsa Nakato',
  opened_at: '2026-11-02T09:15:00.000Z',
  still_readable: true,
  due_on: '2027-08-01',
};

test('a register row keeps every fact the next reader needs', () => {
  const [row] = parseHolds([hold]);
  assert.ok(row);
  assert.equal(row?.displayName, 'Page one.jpg');
  assert.equal(row?.openedByName, 'Hafsa Nakato');
  assert.equal(row?.stillReadable, true);
  assert.equal(row?.dueOn, '2027-08-01');
  assert.match(holdMeta(row!), /Hafsa Nakato, 2026-11-02/);
});

test('nothing is read as a hold when the answer is not a list', () => {
  assert.deepEqual(parseHolds(null), []);
  assert.deepEqual(parseHolds({ error: 'nope' }), []);
  assert.deepEqual(parseStorageQueue(undefined), []);
  assert.deepEqual(parseHoldCount(null), { held: 0, holdingNothing: 0 });
  assert.deepEqual(parseHoldCount({ held: '2', holdingNothing: 1 }), { held: 2, holdingNothing: 1 });
});

test('a hold on a file that has gone says so, and does not read as care', () => {
  assert.match(holdSentence(parseHolds([hold])[0]!), /due on 2027-08-01/);

  const dead = parseHolds([{ ...hold, still_readable: false }])[0]!;
  assert.match(holdSentence(dead), /stored bytes/);
  assert.match(holdSentence(dead), /before releasing/);

  const early = parseHolds([{ ...hold, due_on: null }])[0]!;
  assert.match(holdSentence(early), /had not reached its date/);
});

test('the storage sentence never implies the bytes are gone', () => {
  const [row] = parseStorageQueue([{
    asset_id: hold.asset_id,
    master_bucket: 'coursework',
    master_key: 'child/2026/page-one.jpg',
    display_name: 'Page one.jpg',
    tombstoned_at: '2026-11-01T10:00:00.000Z',
    purge_due_at: '2026-11-04T10:00:00.000Z',
  }]);
  assert.ok(row);
  assert.match(storageSentence(row!), /Tombstoned 2026-11-01/);
  assert.match(storageSentence(row!), /bytes due 2026-11-04/);
  assert.equal(row?.key, 'child/2026/page-one.jpg');

  assert.match(PURGE_NOTE, /cannot delete or verify/);
  assert.match(PURGE_NOTE, /refuses/);
  assert.match(HOLDS_NOTE, /written reason/);
  assert.match(HOLDS_NOTE, /thirty days/);
});

test('each refusal is a sentence, not an error code', () => {
  assert.match(describeRetentionError('that file is already held'), /already held/);
  assert.match(describeRetentionError('holding a file back needs a written reason'), /written reason/);
  assert.match(describeRetentionError('that file is still readable; nothing has been deleted to record'),
    /no deletion to record/);
  assert.match(describeRetentionError('coursework:not_allowed'), /safeguarding owner/);
  assert.match(describeRetentionError('coursework:not_allowed'), /Only/);
  assert.match(describeRetentionError('boom'), /nothing was changed/);
});

test('the confirmation says what happened to the clock, not what was clicked', () => {
  assert.match(actionConfirmation('hold', 'Page one.jpg'), /not a preservation guarantee/);
  assert.match(actionConfirmation('release', 'Page one.jpg'), /may already be due/);
  assert.match(actionConfirmation('purge', 'Page one.jpg'), /did not verify/);
  assert.match(describeRetentionError('a held file cannot be recorded'), /held file/);
});

test('the page renders the register and the bucket, and asks the database first', () => {
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');

  assert.ok(page.includes('coursework_holds'), 'the page never reads the holds register');
  assert.ok(page.includes('coursework_hold_count'), 'the page never counts the holds');
  assert.ok(page.includes('coursework_bytes_awaiting'), 'the page never reads the storage queue');
  assert.ok(page.includes('RetentionActionForm'), 'the register has no actions on it');
  assert.ok(page.includes('canSeeHolds'), 'the page does not distinguish a refusal from an empty list');
  assert.ok(page.includes('canSeeStorage'), 'the storage queue is rendered without asking whether it may be');
  assert.ok(!page.includes('it is a record that somebody saw the file'));
  const form = readFileSync(new URL('../app/admin/coursework/retention-actions.tsx', import.meta.url), 'utf8');
  assert.ok(form.includes('!attested') && form.includes('cannot verify this'), 'storage statement needs an explicit attestation');
});
