import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isRemovedDevice, parseOfflineDevices } from './offline-devices.ts';
const id='6b1c7a9e-0000-4000-8000-000000000001';
const row={device_id:id,learner_profile_id:id,learner_name:'A learner',label:null,first_seen_at:'2026-11-01T00:00:00Z',last_seen_at:'2026-11-01T00:00:00Z',saved_count:1};
test('device rows fail closed rather than becoming an empty list', () => {
  assert.deepEqual(parseOfflineDevices([row]),[row]);
  assert.deepEqual(parseOfflineDevices([]),[]);
  for(const bad of [null, [{}], [{...row, device_id:'bad'}], [{...row,saved_count:-1}], [{...row,last_seen_at:'bad'}]]) assert.equal(parseOfflineDevices(bad),null);
  assert.equal(isRemovedDevice({removed:true,deviceId:id},id),true);
  assert.equal(isRemovedDevice({removed:true,deviceId:'other'},id),false);
});
test('device management warns about remote copies and uncertain replies', () => {
  const page=readFileSync(new URL('../app/downloads/offline-devices.tsx', import.meta.url),'utf8');
  assert.match(page,/remove_offline_device/);
  // The words are the catalogue's since 2026-11-27; the page hands them over
  // and the part says each one where it used to type it.
  const catalogue=readFileSync(new URL('./i18n/messages/en.ts', import.meta.url),'utf8');
  assert.match(catalogue,/'downloads\.devLede':\s+'[^']*cannot delete, from here, copies or keys already kept on that device\.'/);
  assert.match(catalogue,/'downloads\.devUnconfirmed':\s+'[^']*could not be confirmed\. [^']*a reply that was lost may still have removed it\.'/);
  assert.match(catalogue,/'downloads\.devUnread': '[^']*Do not take it to be empty\.'/);
  assert.match(catalogue,/'downloads\.devRemoved':\s+'[^']*were not erased from here\.'/);
  for (const said of ['words.lede','words.unconfirmed','words.unread','words.removed','words.removedUnrefreshed','words.confirm']) assert.ok(page.includes(said),said);
  // A list that was not read is its own branch, before "no devices".
  assert.match(page,/devices === null \? <p className="notice warn">\{words\.unread\}/);
});
