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

test('owner recovery is wired to a narrow session RPC and does not claim deletion', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../app/admin/guardians/page.tsx', import.meta.url), 'utf8');
  const form = readFileSync(new URL('../app/admin/guardians/reconcile-form.tsx', import.meta.url), 'utf8');
  const route = readFileSync(new URL('../app/api/admin/child-login-reconcile/route.ts', import.meta.url), 'utf8');
  assert.match(page, /attempt\.marked_identity_present && <ReconcileForm/);
  assert.match(page, /does not reset the password, create another identity or remove one/);
  assert.match(form, /originally set still applies/);
  assert.match(form, /Could not confirm completion/);
  assert.match(route, /reconcile_child_login_attempt/);
  assert.match(route, /application\\\/json/);
  assert.doesNotMatch(route, /createAdminClient|deleteUser/);
});

test('the identity-removal queue does not confuse missing data with an empty list', async () => {
  const { parseChildLoginRemovalTasks } = await import('./child-login-queue.ts');
  assert.deepEqual(parseChildLoginRemovalTasks([]), []);
  assert.equal(parseChildLoginRemovalTasks(null), null);
  const row = { task_id: 'task', learner_name: 'Child', username: 'child', child_user_id: 'user', created_at: '2026-11-05T00:00:00Z', identity_present: true, marker_matches: false };
  assert.deepEqual(parseChildLoginRemovalTasks([row]), [row]);
  assert.equal(parseChildLoginRemovalTasks([{ ...row, identity_present: null }]), null);
});

test('erasure recovery shows a late identity without exposing learner or guardian fields', async () => {
  const { parseChildLoginErasureRecovery } = await import('./child-login-queue.ts');
  const row = { source_kind: 'attempt', source_id: 'marker', identity_id: null, created_at: '2026-11-05T00:00:00Z', identity_present: true, trusted_marker_matches: true, matched_identity_ids: ['auth-id'] };
  assert.deepEqual(parseChildLoginErasureRecovery([row]), [row]);
  assert.equal(parseChildLoginErasureRecovery([{ ...row, matched_identity_ids: [null] }]), null);
  assert.equal(parseChildLoginErasureRecovery(null), null);
});

test('old erasure cleanup rejects malformed counts and does not treat read failure as empty', async () => {
  const { parseChildLoginLegacyErasure } = await import('./child-login-queue.ts');
  const row = { learner_id: 'child', attempt_count: 1, removal_task_count: 0, coursework_held: false };
  assert.deepEqual(parseChildLoginLegacyErasure([row]), [row]);
  assert.equal(parseChildLoginLegacyErasure([{ ...row, attempt_count: -1 }]), null);
  assert.equal(parseChildLoginLegacyErasure(null), null);
});

test('queue page numbers are non-negative bounded integers', async () => {
  const { queuePageNumber } = await import('./child-login-queue.ts');
  assert.equal(queuePageNumber(undefined), 0);
  assert.equal(queuePageNumber('0'), 0);
  assert.equal(queuePageNumber('2'), 2);
  for (const input of ['-1', '1.2', '1e4', '042', '42949672', ['2']]) assert.equal(queuePageNumber(input), 0);
});
