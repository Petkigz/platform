import assert from 'node:assert/strict';
import test from 'node:test';
import { isQuarantineCursor, parseCourseworkQuarantines } from './coursework-quarantine.ts';
const id = '44444444-4444-4444-8444-444444444444';
test('quarantine rows preserve unknown prior state without pretending a queue failure is empty', () => {
  const row = { asset_id: id, display_name: null, previous_status: null, quarantined_at: null, recorded_reason: null };
  assert.deepEqual(parseCourseworkQuarantines([row]), [row]);
  assert.equal(parseCourseworkQuarantines(null), null);
  assert.equal(parseCourseworkQuarantines([{ ...row, previous_status: 'deleted' }]), null);
  assert.equal(parseCourseworkQuarantines([{ ...row, asset_id: 'bad' }]), null);
  assert.equal(isQuarantineCursor(id), true);
  assert.equal(isQuarantineCursor('bad'), false);
});
