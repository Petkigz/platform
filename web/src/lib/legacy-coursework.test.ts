import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseLegacyCoursework } from './legacy-coursework.ts';

const row = { asset_id:'2b1c7a9e-0000-4000-8000-000000000001', display_name:null,
  asset_status:'available', tombstoned:false, in_lesson:true, attached:false, in_revision:true };

test('legacy review rows preserve mixed-use facts and reject missing or malformed data', () => {
  assert.deepEqual(parseLegacyCoursework([row]), [row]);
  assert.deepEqual(parseLegacyCoursework([]), []);
  for (const value of [null, {}, [null], [{...row, asset_id:'bad'}],
    [{...row, in_lesson:'false'}], [{...row, in_revision:null}], [{...row, asset_status:'unknown'}], [{...row, asset_status:['available']}]]) {
    assert.equal(parseLegacyCoursework(value), null);
  }
});

test('legacy register warns about mixed use and does not present its list as deletion proof', () => {
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /legacy_coursework_review_page/);
  assert.match(page, /not a deletion queue/);
  assert.match(page, /may also be a lesson resource/);
  assert.match(page, /list could not be loaded/);
});

test('erasure review rows fail closed on malformed data', async () => {
  const { parseErasureReviews } = await import('./legacy-coursework.ts');
  const review = { asset_id: row.asset_id, learner_id: '2b1c7a9e-0000-4000-8000-000000000002', display_name: null, reason: 'legacy_library', recorded_at: '2026-11-01T00:00:00Z' };
  assert.deepEqual(parseErasureReviews([review]), [review]);
  assert.deepEqual(parseErasureReviews([]), []);
  for (const value of [null, [{}], [{ ...review, reason: 'unknown' }], [{ ...review, learner_id: 'bad' }], [{ ...review, recorded_at: 'bad' }]]) assert.equal(parseErasureReviews(value), null);
});

test('shared retention entries require truthful context and hold fields', async () => {
  const { parseSharedRetentionReviews } = await import('./legacy-coursework.ts');
  const review = { asset_id: row.asset_id, display_name: null, earliest_due: '2026-11-01', submission_contexts: 2, in_lesson: false, erasure_review: true, held: false };
  assert.deepEqual(parseSharedRetentionReviews([review]), [review]);
  assert.deepEqual(parseSharedRetentionReviews([]), []);
  for (const value of [null, [{}], [{ ...review, submission_contexts: 0 }], [{ ...review, held: 'false' }], [{ ...review, earliest_due: null }]]) assert.equal(parseSharedRetentionReviews(value), null);
});

test('erasure actions distinguish a queue, an owner statement and verified deletion', () => {
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');
  const actions = readFileSync(new URL('../app/admin/coursework/erasure-review-actions.ts', import.meta.url), 'utf8');
  assert.match(page, /queues storage deletion; it does not delete or verify the bytes/);
  assert.match(page, /A storage-deletion statement is recorded; I understand it is not independently verified/);
  assert.match(page, /storage-queue/);
  assert.match(actions, /queue_reviewed_coursework_erasure/);
  assert.match(actions, /clear_coursework_erasure_review/);
  assert.match(actions, /uncertain/);
});

test('shared retention action requires review and distinguishes the storage queue', () => {
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');
  const action = readFileSync(new URL('../app/admin/coursework/shared-retention-actions.ts', import.meta.url), 'utf8');
  assert.match(page, /Queue when every context is due/);
  assert.match(page, /I reviewed every context/);
  assert.match(page, /storage bytes have not been verified deleted/);
  assert.match(action, /queue_reviewed_shared_coursework/);
  assert.match(action, /uncertain/);
});

test('older coursework offers an owner hold without claiming it locks storage', () => {
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /Place safeguarding hold/);
  assert.match(page, /cannot lock external storage/);
  assert.match(page, /Check the holds register/);
});
