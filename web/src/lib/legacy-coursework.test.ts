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
