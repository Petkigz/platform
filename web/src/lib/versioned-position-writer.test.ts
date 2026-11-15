import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVersionedPositionWriter, type PositionWriteResult } from './versioned-position-writer.ts';

function deferred() {
  let resolve!: (v: PositionWriteResult) => void; let reject!: (e: Error) => void;
  const promise = new Promise<PositionWriteResult>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

test('coalesces and uses the newly confirmed revision, including rewinds', async () => {
  const calls: [number, string | null][] = []; const pending: ReturnType<typeof deferred>[] = [];
  const writer = createVersionedPositionWriter({ revision: 'a', write: (s, r) => { calls.push([s, r]); const d = deferred(); pending.push(d); return d.promise; }, onConfirmed: () => {}, onConflict: () => assert.fail(), onUnconfirmed: () => assert.fail() });
  writer.enqueue(15, true); writer.enqueue(30, true); writer.enqueue(5, true);
  assert.deepEqual(calls, [[15, 'a']]);
  pending[0]!.resolve({ ok: true, seconds: 15, revision: 'b' }); await tick();
  assert.deepEqual(calls, [[15, 'a'], [5, 'b']]);
  pending[1]!.resolve({ ok: true, seconds: 5, revision: 'c' }); await tick();
});

test('conflicts require a choice and retries only against the shown revision', async () => {
  const calls: [number, string | null][] = []; const pending: ReturnType<typeof deferred>[] = [];
  const conflicts: unknown[] = [];
  const writer = createVersionedPositionWriter({ revision: 'a', write: (s, r) => { calls.push([s, r]); const d = deferred(); pending.push(d); return d.promise; }, onConfirmed: () => {}, onConflict: (server, local) => conflicts.push({ server, local }), onUnconfirmed: () => assert.fail() });
  writer.enqueue(10, true); writer.enqueue(20, true);
  pending[0]!.resolve({ ok: false, seconds: 50, revision: 'b' }); await tick();
  assert.deepEqual(conflicts, [{ server: { seconds: 50, revision: 'b' }, local: 20 }]);
  writer.enqueue(25, true); assert.equal(calls.length, 1);
  writer.useLocal(); assert.deepEqual(calls[1], [25, 'b']);
  pending[1]!.resolve({ ok: false, seconds: 60, revision: 'c' }); await tick();
  assert.deepEqual(writer.useServer(), { seconds: 60, revision: 'c' });
  writer.enqueue(7, true); assert.deepEqual(calls[2], [7, 'c']);
  pending[2]!.resolve({ ok: true, seconds: 7, revision: 'd' }); await tick();
});

test('ambiguous results stop writes and retain the newest local place', async () => {
  const pending = deferred(); const uncertain: number[] = []; let calls = 0;
  const writer = createVersionedPositionWriter({ revision: null, write: () => { calls++; return pending.promise; }, onConfirmed: () => assert.fail(), onConflict: () => assert.fail(), onUnconfirmed: (s) => uncertain.push(s) });
  writer.enqueue(10, true); writer.enqueue(20, true); pending.reject(new Error('lost response')); await tick();
  writer.enqueue(30, true); writer.useLocal();
  assert.deepEqual(uncertain, [20, 30]); assert.equal(calls, 1);
});

test('playback before the snapshot is reviewed rather than silently saved', async () => {
  const conflicts: unknown[] = []; let writes = 0;
  const writer = createVersionedPositionWriter({ revision: 'r', write: async () => { writes++; return { ok: true, seconds: 0, revision: 'new' }; }, onConfirmed: () => {}, onConflict: (server, local) => conflicts.push({ server, local }), onUnconfirmed: () => assert.fail() });
  writer.challenge({ seconds: 80, revision: 'r' }, 12);
  assert.equal(writes, 0);
  assert.deepEqual(conflicts, [{ server: { seconds: 80, revision: 'r' }, local: 12 }]);
  assert.deepEqual(writer.useServer(), { seconds: 80, revision: 'r' });
});

test('disposed player ignores late responses', async () => {
  const pending = deferred(); let callbacks = 0;
  const writer = createVersionedPositionWriter({ revision: null, write: () => pending.promise, onConfirmed: () => callbacks++, onConflict: () => callbacks++, onUnconfirmed: () => callbacks++ });
  writer.enqueue(1, true); writer.dispose(); pending.resolve({ ok: true, seconds: 1, revision: 'r' }); await tick();
  assert.equal(callbacks, 0);
});
