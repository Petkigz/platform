import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCourseworkUploadTarget } from './coursework-upload-target.ts';

const asset = '4f30fd1d-6f2c-4c1e-9a5b-0d2f6c8a1b23';
const row = { asset_id: asset, master_bucket: 'masters', master_key: `${asset}/image-png` };
test('only one matching coursework asset can become a signed upload target', () => {
  const expected = { assetId: asset, bucket: 'masters', key: row.master_key };
  assert.deepEqual(parseCourseworkUploadTarget(row), expected);
  assert.deepEqual(parseCourseworkUploadTarget([row], asset.toUpperCase()), expected);
  for (const value of [null, [], [row, row], {}, { ...row, asset_id: 'invalid' },
    { ...row, master_key: `11111111-1111-4111-8111-111111111111/image-png` },
    { ...row, master_key: null }, { ...row, master_bucket: '' }]) {
    assert.equal(parseCourseworkUploadTarget(value), null);
  }
  assert.equal(parseCourseworkUploadTarget(row, '11111111-1111-4111-8111-111111111111'), null);
});
