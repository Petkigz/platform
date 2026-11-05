import assert from 'node:assert/strict';
import test from 'node:test';
import { createChildLogin, type ChildLoginCreatePorts } from './child-login-create.ts';

const input = { learnerId: 'learner', guardianId: 'guardian', username: 'amina.k', password: 'secret' };
function fixture() {
  const calls: string[] = [];
  const ports: ChildLoginCreatePorts = {
    async prepare() { calls.push('prepare'); return 'attempt'; },
    async findIdentity() { calls.push('find'); return null; },
    async createIdentity({ attemptId }) { calls.push(`create:${attemptId}`); return 'child'; },
    async complete(attempt, guardian, child) { calls.push(`complete:${attempt}:${guardian}:${child}`); },
  };
  return { calls, ports };
}

test('creation binds the identity to the reservation before completion', async () => {
  const { calls, ports } = fixture();
  assert.deepEqual(await createChildLogin(ports, input), { ok: true, recovered: false });
  assert.deepEqual(calls, ['prepare', 'find', 'create:attempt', 'complete:attempt:guardian:child']);
});

test('a lost provider response is recovered only via the marked identity', async () => {
  const { calls, ports } = fixture();
  let n = 0;
  ports.findIdentity = async () => { calls.push('find'); return ++n === 2 ? 'child' : null; };
  ports.createIdentity = async () => { calls.push('create'); throw new Error('timeout'); };
  assert.deepEqual(await createChildLogin(ports, input), { ok: true, recovered: true });
  assert.deepEqual(calls, ['prepare', 'find', 'create', 'find', 'complete:attempt:guardian:child']);
});

test('a retry with an existing marked identity never resets the password or creates another', async () => {
  const { calls, ports } = fixture();
  ports.findIdentity = async () => { calls.push('find'); return 'child'; };
  assert.deepEqual(await createChildLogin(ports, input), { ok: true, recovered: true });
  assert.deepEqual(calls, ['prepare', 'find', 'complete:attempt:guardian:child']);
});

test('ambiguous outcomes do not delete, release, or claim success', async () => {
  for (const failing of ['prepare', 'findIdentity', 'createIdentity', 'complete'] as const) {
    const { ports } = fixture();
    if (failing === 'prepare') ports.prepare = async () => { throw new Error('timeout'); };
    if (failing === 'findIdentity') ports.findIdentity = async () => { throw new Error('timeout'); };
    if (failing === 'createIdentity') ports.createIdentity = async () => { throw new Error('timeout'); };
    if (failing === 'complete') ports.complete = async () => { throw new Error('timeout'); };
    const result = await createChildLogin(ports, input);
    assert.equal(result.ok, false, `${failing} was treated as success`);
  }
});
