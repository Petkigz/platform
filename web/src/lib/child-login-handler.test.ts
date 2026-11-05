import assert from 'node:assert/strict';
import test from 'node:test';
import { handleChildLoginCreation } from './child-login-handler.ts';
import type { ChildLoginCreatePorts } from './child-login-create.ts';

const learnerId = '1e576ccc-1fa6-4ad3-9afd-3d74d9ee0f64';
function fixture() {
  const calls: unknown[] = [];
  const ports: ChildLoginCreatePorts = {
    async prepare(learner, username) { calls.push(['prepare', learner, username]); return 'attempt'; },
    async findIdentity(attempt, guardian) { calls.push(['find', attempt, guardian]); return null; },
    async createIdentity(input) { calls.push(['create', input]); return 'child'; },
    async complete(attempt, guardian, user) { calls.push(['complete', attempt, guardian, user]); },
  };
  return { ports, calls };
}

test('server guardian, never a body actor, drives creation', async () => {
  const { ports, calls } = fixture();
  const result = await handleChildLoginCreation(ports, 'real-guardian', {
    learnerId, username: ' Amina.K ', password: 'safepass1', guardianId: 'forged-guardian',
  });
  assert.deepEqual(result, { status: 200, body: { ok: true, username: 'amina.k', recovered: false } });
  assert.deepEqual(calls[0], ['prepare', learnerId, 'amina.k']);
  assert.deepEqual(calls[1], ['find', 'attempt', 'real-guardian']);
  assert.deepEqual(calls[3], ['complete', 'attempt', 'real-guardian', 'child']);
});

test('malformed input cannot call the provider', async () => {
  for (const body of [null, {}, { learnerId, username: 'ab', password: 'safepass1' }, { learnerId, username: 'amina', password: 'bad' }]) {
    const { ports, calls } = fixture();
    assert.equal((await handleChildLoginCreation(ports, 'guardian', body)).status, 400);
    assert.equal(calls.length, 0);
  }
});

test('a missing completion response is not claimed as failure or success', async () => {
  const { ports } = fixture();
  ports.complete = async () => { throw new Error('timeout with sensitive details'); };
  const result = await handleChildLoginCreation(ports, 'guardian', { learnerId, username: 'amina', password: 'safepass1' });
  assert.equal(result.status, 409);
  assert.match('message' in result.body ? result.body.message : '', /could not confirm/);
  assert.doesNotMatch(JSON.stringify(result), /sensitive details|safepass1/);
});
