import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  HOLDS_NOTE,
  missingClassEndCount,
  parseMissingClassEnds,
  PURGE_NOTE,
  actionConfirmation,
  describeRetentionError,
  holdMeta,
  holdSentence,
  parseHoldCount,
  parseHoldCountStrict,
  parseHolds,
  parseHoldPage,
  parseStorageQueue,
  parseStoragePage,
  postRetentionAction,
  storageSentence,
  storageDeadlineStatus,
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

test('hold totals reject malformed or contradictory values without hiding a valid list', () => {
  assert.deepEqual(parseHoldCountStrict({ held: 3, holdingNothing: 2 }), { held: 3, holdingNothing: 2 });
  for (const value of [null, {}, { held: 0, holdingNothing: 1 },
    { held: '3', holdingNothing: 1 }, { held: -1, holdingNothing: 0 },
    { held: 3, holdingNothing: 1.5 }]) assert.equal(parseHoldCountStrict(value), null);
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /const canSeeHolds = holdRows !== null/);
  assert.match(page, /Hold totals could not be checked/);
  assert.match(page, /const storageRows = !storageResult.error/);
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
  assert.match(storageSentence(row!), /bytes due 2026-11-04T10:00:00.000Z/);
  assert.equal(row?.key, 'child/2026/page-one.jpg');

  assert.match(PURGE_NOTE, /cannot delete or verify/);
  assert.match(PURGE_NOTE, /refuses/);
  assert.match(PURGE_NOTE, /Do not delete held objects or objects not yet due/);
  assert.match(PURGE_NOTE, /cannot prevent changes or deletion in storage/);
  assert.match(HOLDS_NOTE, /written reason/);
  assert.match(HOLDS_NOTE, /restores a known byte deadline/);
  assert.match(HOLDS_NOTE, /review older or unclear cases individually/);
});

test('each refusal is a sentence, not an error code', () => {
  assert.match(describeRetentionError('that file is already held'), /already held/);
  assert.match(describeRetentionError('holding a file back needs a written reason'), /written reason/);
  assert.match(describeRetentionError('that file is still readable; nothing has been deleted to record'),
    /still readable in the platform/);
  assert.match(describeRetentionError('coursework:not_allowed'), /safeguarding owner/);
  assert.match(describeRetentionError('coursework:not_allowed'), /Only/);
  assert.match(describeRetentionError('boom'), /could not be confirmed/);
});

test('the confirmation says what happened to the clock, not what was clicked', () => {
  assert.match(actionConfirmation('hold', 'Page one.jpg'), /not a preservation guarantee/);
  assert.match(actionConfirmation('release', 'Page one.jpg'), /may already be due/);
  assert.match(actionConfirmation('purge', 'Page one.jpg'), /did not verify/);
  assert.match(describeRetentionError('a held file cannot be recorded'), /held file/);
  assert.match(describeRetentionError('this storage location or its extra objects need individual review'), /Do not delete it as routine cleanup/);
});

test('the page renders the register and the bucket, and asks the database first', () => {
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');

  assert.ok(page.includes('coursework_holds'), 'the page never reads the holds register');
  assert.ok(page.includes('coursework_hold_count'), 'the page never counts the holds');
  assert.ok(page.includes('coursework_bytes_awaiting'), 'the page never reads the storage queue');
  assert.ok(page.includes('RetentionActionForm'), 'the register has no actions on it');
  assert.ok(page.includes('canSeeHolds'), 'the page does not distinguish a refusal from an empty list');
  assert.ok(page.includes('row.held ?') && page.includes('Safeguarding hold open'), 'held storage entries need a visible warning');
  assert.ok(page.includes('coursework_bytes_awaiting_checked_page'));
  assert.ok(page.includes('canSeeStorage'), 'the storage queue is rendered without asking whether it may be');
  assert.ok(!page.includes('it is a record that somebody saw the file'));
  const form = readFileSync(new URL('../app/admin/coursework/retention-actions.tsx', import.meta.url), 'utf8');
  assert.ok(form.includes('!attested') && form.includes('cannot verify this'), 'storage statement needs an explicit attestation');
});

test('missing class-end reporting distinguishes unknown from zero and validates rows', () => {
  assert.equal(missingClassEndCount({ files: { missingClassEnd: 2 } }), 2);
  assert.equal(missingClassEndCount({ files: { missingClassEnd: 0 } }), 0);
  assert.equal(missingClassEndCount({ files: {} }), null);
  assert.equal(missingClassEndCount({ files: { missingClassEnd: -1 } }), null);
  assert.equal(parseMissingClassEnds(null), null);
  assert.deepEqual(parseMissingClassEnds([]), []);
  assert.deepEqual(parseMissingClassEnds([{ cohort_id: 'c', cohort_title: 'Class', course_title: 'Course', files: '2', cohort_status: 'closed', starts_at: '2025-01-01T00:00:00Z', join_closes_at: '2025-01-02T00:00:00Z' }]),
    [{ cohortId: 'c', cohortTitle: 'Class', courseTitle: 'Course', files: 2, status: 'closed', startsAt: '2025-01-01T00:00:00Z', joinClosesAt: '2025-01-02T00:00:00Z' }]);
  assert.equal(parseMissingClassEnds([{ cohort_id: 'c', files: 1 }]), null);
});

test('class end attestation is explicit, UTC and never presents itself as proof', () => {
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');
  const action = readFileSync(new URL('../app/admin/coursework/class-end-actions.ts', import.meta.url), 'utf8');
  assert.match(page, /actual end, not the date the class was closed/);
  assert.match(page, /not independent proof/);
  assert.match(page, /name="verified" value="yes" required/);
  assert.match(page, /date and time \(UTC\)/);
  assert.match(action, /form\.get\('verified'\) !== 'yes'/);
  assert.match(action, /attest_closed_cohort_end/);
  assert.match(action, /p_ends_at: `\$\{end\}:00Z`/);
});


test('interrupted or malformed retention responses do not claim the action failed', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('connection lost after send'); };
    const disconnected = await postRetentionAction({ action: 'purge', assetId: hold.asset_id });
    assert.equal(disconnected.ok, false);
    if (!disconnected.ok) {
      assert.equal(disconnected.uncertain, true);
      assert.match(disconnected.message, /may have been recorded/);
      assert.doesNotMatch(disconnected.message, /nothing was changed/i);
    }
    globalThis.fetch = async () => new Response('bad gateway', { status: 502 });
    const serverError = await postRetentionAction({ action: 'hold', assetId: hold.asset_id });
    assert.equal(serverError.ok, false);
    if (!serverError.ok) assert.equal(serverError.uncertain, true);
    globalThis.fetch = async () => new Response(JSON.stringify({ok:true}), {status:200});
    assert.deepEqual(await postRetentionAction({action:'hold',assetId:hold.asset_id}), {ok:true});
  } finally { globalThis.fetch = original; }
});


test('storage pages preserve precise cursors and reject malformed responses', () => {
  const timestamp = '2026-11-01T10:00:00.123456+00:00';
  const data = [{asset_id:hold.asset_id,master_bucket:'masters',master_key:'key',display_name:'File',tombstoned_at:timestamp,purge_due_at:null,sort_at:timestamp,held:false,storage_review_needed:false,storage_backend:'r2'}];
  assert.equal(parseStoragePage(data)?.[0]?.sortAt, timestamp);
  assert.equal(parseStoragePage(data)?.[0]?.held, false);
  assert.equal(parseStoragePage(data)?.[0]?.storageReviewNeeded, false);
  assert.equal(parseStoragePage(data)?.[0]?.backend, 'r2');
  assert.equal(parseStoragePage([{...data[0],storage_backend:'unknown'}]), null);
  assert.equal(parseStoragePage([{...data[0],storage_backend:null}]), null);
  assert.equal(parseStoragePage([{...data[0],storage_review_needed:true}])?.[0]?.storageReviewNeeded, true);
  assert.equal(parseStoragePage([{...data[0],storage_review_needed:null}]), null);
  const { storage_review_needed: _storageReview, ...missingReview } = data[0]!;
  assert.equal(parseStoragePage([missingReview]), null);
  assert.equal(parseStoragePage([{...data[0],held:true}])?.[0]?.held, true);
  assert.equal(parseStoragePage([{...data[0],held:null}]), null);
  assert.equal(parseStoragePage([{...data[0],held:'false'}]), null);
  const { held: _held, ...missingHold } = data[0]!;
  assert.equal(parseStoragePage([missingHold]), null);
  assert.equal(parseStoragePage(null), null);
  assert.equal(parseStoragePage([{...data[0],sort_at:'bad'}]), null);
  assert.deepEqual(parseStoragePage([]), []);
});


test('hold pages validate rows and retain precise opened-at cursors', () => {
  const opened = '2026-11-02T09:15:00.123456+00:00';
  assert.equal(parseHoldPage([{...hold,opened_at:opened}])?.[0]?.openedAt, opened);
  assert.equal(parseHoldPage([{...hold,still_readable:'true'}]), null);
  assert.equal(parseHoldPage(null), null);
  assert.deepEqual(parseHoldPage([]), []);
});


test('coursework clock copy does not start thirty days after erasure', () => {
  const page=readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url),'utf8');
  assert.match(page,/thirty days after an eligible account closure/);
  assert.doesNotMatch(page,/thirty days after a learner.rsquo;s record is erased/);
  assert.match(page,/Child-login cleanup and/);
});

test('storage collision warning blocks the routine statement and never claims storage is locked', () => {
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /coursework_bytes_awaiting_checked_page/);
  assert.match(page, /row\.storageReviewNeeded/);
  assert.match(page, /Do not delete it as routine cleanup/);
  assert.match(page, /If it was already deleted/);
  assert.match(page, /href="\/admin\/incidents"/);
  assert.match(PURGE_NOTE, /cannot prevent changes or deletion in storage/);
});


test('storage queue distinguishes future and unknown deadlines without claiming deletion is safe', () => {
  const now = Date.parse('2026-11-04T10:00:00.000Z');
  assert.equal(storageDeadlineStatus({purgeDueAt: null}, now), 'unknown');
  assert.equal(storageDeadlineStatus({purgeDueAt: 'invalid'}, now), 'unknown');
  assert.equal(storageDeadlineStatus({purgeDueAt: '2026-11-04T10:00:00.000001Z'}, now), 'future');
  assert.equal(storageDeadlineStatus({purgeDueAt: '2026-11-04T10:00:00.001Z'}, now), 'future');
  assert.equal(storageDeadlineStatus({purgeDueAt: '2026-11-04T09:59:59.999Z'}, now), 'due');
  assert.equal(storageDeadlineStatus({purgeDueAt: '2026-11-04T09:59:59.999Z'}, NaN), 'unknown');
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /The recorded byte deadline has not arrived/);
  assert.match(page, /The byte deadline is unknown/);
  assert.match(page, /report the incident/);
  assert.match(page, /Record my deletion statement/);
});
