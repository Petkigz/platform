import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPositionWriter } from './position-writer.ts';

function deferred() {
  let resolve!: () => void; let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const turn = async () => { await Promise.resolve(); await Promise.resolve(); };

test('coalesces pending positions and keeps a deliberate rewind', async () => {
  const calls: number[] = []; const pending: ReturnType<typeof deferred>[] = [];
  const writer = createPositionWriter({ write: (n) => { calls.push(n); const d = deferred(); pending.push(d); return d.promise; }, onUnconfirmed: () => assert.fail('unexpected failure') });
  writer.enqueue(11, false); writer.enqueue(17, false); writer.enqueue(25, false); writer.enqueue(5, true);
  assert.deepEqual(calls, [11]);
  pending[0]!.resolve(); await turn();
  assert.deepEqual(calls, [11, 5]);
  writer.enqueue(32, true); writer.enqueue(42, true);
  pending[1]!.resolve(); await turn();
  assert.deepEqual(calls, [11, 5, 42]);
  pending[2]!.resolve(); await turn();
});

test('lost reply blocks queued and subsequent saves and reports uncertainty once', async () => {
  const calls: number[] = []; const first = deferred(); let notices = 0;
  const writer = createPositionWriter({ write: (n) => { calls.push(n); return first.promise; }, onUnconfirmed: () => { notices++; } });
  writer.enqueue(10, true); writer.enqueue(40, true); first.reject(new Error('lost reply')); await turn();
  writer.enqueue(50, true); await turn();
  assert.deepEqual(calls, [10]); assert.equal(notices, 1);
});

test('normal events are throttled but forced events save and inputs are bounded', async () => {
  const calls: number[] = [];
  const writer = createPositionWriter({ write: async (n) => { calls.push(n); }, onUnconfirmed: () => assert.fail('unexpected failure') });
  writer.enqueue(1, false); await turn(); writer.enqueue(9, false); await turn();
  assert.deepEqual(calls, [1]);
  writer.enqueue(9, true); await turn(); writer.enqueue(999999, true); await turn();
  assert.deepEqual(calls, [1, 9, 86400]);
});
