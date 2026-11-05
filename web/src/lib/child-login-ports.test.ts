import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { childLoginCreatePorts } from './child-login-ports.ts';

const cast = (value: unknown) => value as SupabaseClient;

test('session reserves and only the service client creates, looks up and completes', async () => {
  const calls: { name: string; input: unknown }[] = [];
  const session = cast({ rpc: async (name: string, input: unknown) => {
    calls.push({ name: `session:${name}`, input }); return { data: 'attempt', error: null };
  } });
  const service = cast({
    rpc: async (name: string, input: unknown) => {
      calls.push({ name: `service:${name}`, input });
      return { data: name === 'child_login_attempt_identity' ? null : { username: 'amina', learnerProfileId: 'learner', alreadyCompleted: false }, error: null };
    },
    auth: { admin: { createUser: async (input: unknown) => {
      calls.push({ name: 'service:createUser', input }); return { data: { user: { id: 'child' } }, error: null };
    } } },
  });
  const ports = childLoginCreatePorts(session, service);
  assert.equal(await ports.prepare('learner', 'amina'), 'attempt');
  assert.equal(await ports.findIdentity('attempt', 'guardian'), null);
  assert.equal(await ports.createIdentity({ username: 'amina', password: 'secret', attemptId: 'attempt' }), 'child');
  await ports.complete('attempt', 'guardian', 'child');
  assert.deepEqual(calls.map(c => c.name), [
    'session:prepare_child_login', 'service:child_login_attempt_identity', 'service:createUser', 'service:complete_child_login_attempt',
  ]);
  assert.deepEqual(calls[2]?.input, {
    email: 'amina@learners.ayahspring.com', password: 'secret', email_confirm: true,
    app_metadata: { ayahspring_child_attempt: 'attempt' },
    user_metadata: { child_login: true, username: 'amina' },
  });
});

test('provider errors are not exposed and missing results are not treated as success', async () => {
  const session = cast({ rpc: async () => ({ data: null, error: { message: 'sensitive database detail' } }) });
  const service = cast({
    rpc: async () => ({ data: null, error: { message: 'sensitive database detail' } }),
    auth: { admin: { createUser: async () => ({ data: { user: null }, error: null }) } },
  });
  const ports = childLoginCreatePorts(session, service);
  await assert.rejects(() => ports.prepare('l', 'u'), /reservation unavailable/);
  await assert.rejects(() => ports.findIdentity('a', 'g'), /identity lookup unavailable/);
  await assert.rejects(() => ports.createIdentity({ username: 'u', password: 'p', attemptId: 'a' }), /identity creation uncertain/);
  await assert.rejects(() => ports.complete('a', 'g', 'u'), /link completion uncertain/);
});


test('an incomplete completion response is not accepted as proof', async () => {
  const session = cast({});
  const service = cast({ rpc: async () => ({ data: {}, error: null }) });
  const ports = childLoginCreatePorts(session, service);
  await assert.rejects(() => ports.complete('a', 'g', 'u'), /link completion uncertain/);
});
