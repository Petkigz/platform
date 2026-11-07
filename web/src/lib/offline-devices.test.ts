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
  assert.match(page,/cannot remotely delete copies or keys/i);
  assert.match(page,/could not be confirmed/);
  assert.match(page,/Do not assume it is empty/);
});
