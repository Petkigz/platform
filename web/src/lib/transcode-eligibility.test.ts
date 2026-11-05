import assert from 'node:assert/strict';
import test from 'node:test';
import { decideTranscodeEligibility } from './transcode-eligibility.ts';

test('transcoding requires an explicit positive database decision', async () => {
  assert.equal(await decideTranscodeEligibility(async () => ({ data: true, error: null })), 'eligible');
  for (const data of [false, null, undefined, 'true', 1]) {
    assert.equal(await decideTranscodeEligibility(async () => ({ data, error: null })), 'ineligible');
  }
});

test('transcoding fails closed when the database check fails', async () => {
  assert.equal(await decideTranscodeEligibility(async () => ({ data: true, error: { message: 'failed' } })), 'error');
  assert.equal(await decideTranscodeEligibility(async () => { throw new Error('offline'); }), 'error');
});
