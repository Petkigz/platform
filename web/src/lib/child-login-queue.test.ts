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
