import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyUnfinishedUploads } from './unfinished-upload-privacy.ts';

const id = '11111111-1111-4111-8111-111111111111';
const upload = (key: string) => ({ key, uploadId: `upload-${key}`, initiated: null });
test('ordinary staff get only exact classified keys, not unknown or similar private keys', async () => {
  const items = [upload('library/key'), upload('library/key-suffix'), upload('private/key'), upload('unknown')];
  const result = await classifyUnfinishedUploads(items, async () => ({ is_owner: false, library_assets: [{key: 'library/key', asset_id: id}] }));
  assert.deepEqual(result?.visible, [items[0]]);
  assert.equal(result?.isOwner, false);
});
test('owner can inspect unknown keys but only classified library keys are actionable', async () => {
  const items = [upload('library'), upload('unknown')];
  const result = await classifyUnfinishedUploads(items, async () => ({ is_owner: true, library_assets: [{key:'library', asset_id:id}] }));
  assert.deepEqual(result?.visible, items);
  assert.equal(result?.libraryAssets.has('unknown'), false);
});
test('malformed or failed authorization does not return bucket entries', async () => {
  const items = [upload('private')];
  assert.equal(await classifyUnfinishedUploads(items, async () => null), null);
  assert.equal(await classifyUnfinishedUploads(items, async () => ({ is_owner: 'yes', library_assets: [] })), null);
  assert.equal(await classifyUnfinishedUploads(items, async () => ({ is_owner: false, library_assets: [{key:'not-requested',asset_id:id}] })), null);
});
test('large bucket listings are classified in bounded batches and owner must pass every check', async () => {
  const items = Array.from({length: 501}, (_, i) => upload(`key-${i}`));
  const calls: number[] = [];
  const result = await classifyUnfinishedUploads(items, async (keys) => {
    calls.push(keys.length);
    return { is_owner: calls.length === 1, library_assets: keys.slice(0, 1).map(key => ({key,asset_id:id})) };
  });
  assert.deepEqual(calls, [500, 1]);
  assert.equal(result?.isOwner, false);
  assert.deepEqual(result?.visible, [items[0], items[500]]);
});
