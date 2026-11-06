import assert from 'node:assert/strict';
import test from 'node:test';
import { removeTrustedChildAuth, type ChildLoginAuthRemovalPorts } from './child-login-auth-removal.ts';

const task = '11111111-1111-4111-8111-111111111111';
const identityId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';
const email = 'child.name@learners.ayahspring.com';
function fixture() {
  const calls: string[] = [];
  const ports: ChildLoginAuthRemovalPorts = {
    async authorize(id) { calls.push(`authorize:${id}`); return { identityId, attemptId, email }; },
    async lookup(id) { calls.push(`lookup:${id}`); return { id, email, marker: attemptId }; },
    async remove(id) { calls.push(`remove:${id}`); },
    async recordAbsence(id) { calls.push(`record:${id}`); },
  };
  return { ports, calls };
}

test('only the authorized marked identity is removed and absence is recorded', async () => {
  const { ports, calls } = fixture();
  assert.deepEqual(await removeTrustedChildAuth(ports, task), { ok: true });
  assert.deepEqual(calls, [`authorize:${task}`, `lookup:${identityId}`, `remove:${identityId}`, `record:${task}`]);
});

test('bad task, failed authorization or a different identity never reaches deletion', async () => {
  const a = fixture();
  assert.equal((await removeTrustedChildAuth(a.ports, 'not-an-id')).ok, false);
  assert.deepEqual(a.calls, []);
  const b = fixture(); b.ports.authorize = async () => { throw new Error('not owner'); };
  assert.equal((await removeTrustedChildAuth(b.ports, task)).ok, false);
  assert.deepEqual(b.calls, []);
  for (const mismatch of [{ id: task, email, marker: attemptId }, { id: identityId, email: 'adult@example.com', marker: attemptId }, { id: identityId, email, marker: task }]) {
    const c = fixture(); c.ports.lookup = async () => mismatch;
    assert.equal((await removeTrustedChildAuth(c.ports, task)).ok, false);
    assert.equal(c.calls.some((x) => x.startsWith('remove:')), false);
  }
});

test('a lost deletion response succeeds only if the database verifies absence', async () => {
  const a = fixture(); a.ports.remove = async () => { throw new Error('timeout'); };
  assert.deepEqual(await removeTrustedChildAuth(a.ports, task), { ok: true });
  assert.ok(a.calls.includes(`record:${task}`));
  const b = fixture(); b.ports.remove = async () => { throw new Error('timeout'); };
  b.ports.recordAbsence = async () => { throw new Error('still exists'); };
  assert.deepEqual(await removeTrustedChildAuth(b.ports, task), { ok: false });
});

test('a reported deletion without an absence record remains uncertain', async () => {
  const { ports } = fixture(); ports.recordAbsence = async () => { throw new Error('database unavailable'); };
  assert.deepEqual(await removeTrustedChildAuth(ports, task), { ok: false });
});
