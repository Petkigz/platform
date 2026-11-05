import assert from 'node:assert/strict';
import test from 'node:test';
import { parseChildLoginPendingAttempts } from './child-login-queue.ts';

test('a private queue distinguishes an empty result from an unreadable one', () => {
  assert.deepEqual(parseChildLoginPendingAttempts([]), []);
  assert.equal(parseChildLoginPendingAttempts(null), null);
  assert.equal(parseChildLoginPendingAttempts([{}]), null);
  const row = { attempt_id: 'a', learner_name: 'Child', guardian_name: 'Guardian', username: 'child', created_at: '2026-11-05T00:00:00Z', marked_identity_present: true };
  assert.deepEqual(parseChildLoginPendingAttempts([row]), [row]);
  assert.equal(parseChildLoginPendingAttempts([{ ...row, marked_identity_present: null }]), null);
  assert.equal(parseChildLoginPendingAttempts([{ ...row, created_at: 'unknown' }]), null);
});
