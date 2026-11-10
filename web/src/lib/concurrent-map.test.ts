import assert from 'node:assert/strict';
import test from 'node:test';
import { mapConcurrent } from './concurrent-map.ts';

test('bounded mapping keeps input order and does not run more than the limit', async () => {
  let active = 0; let maxActive = 0;
  const results = await mapConcurrent([0, 1, 2, 3, 4, 5, 6], 3, async (value) => {
    active++; maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, (6 - value) * 2));
    active--; return value * 2;
  });
  assert.deepEqual(results, [0, 2, 4, 6, 8, 10, 12]);
  assert.equal(maxActive, 3);
  assert.deepEqual(await mapConcurrent([], 2, async () => 1), []);
});

test('bounded mapping reports failures rather than inventing empty results', async () => {
  await assert.rejects(mapConcurrent([1, 2], 1, async (value) => { if (value === 2) throw new Error('read failed'); return value; }), /read failed/);
  await assert.rejects(mapConcurrent([1], 0, async (value) => value), /positive integer/);
});
