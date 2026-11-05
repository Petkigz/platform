import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LatestRequest } from './latest-request.ts';

test('only the most recent request may publish, even if an older fetch ignores abort', async () => {
  const manager = new LatestRequest();
  const old = manager.start();
  const current = manager.start();
  assert.equal(old.signal.aborted, true);
  assert.equal(old.isCurrent(), false);
  assert.equal(current.isCurrent(), true);
  const values: string[] = [];
  const complete = (r: typeof old, value: string) => { if (r.isCurrent()) values.push(value); };
  complete(current, 'new');
  complete(old, 'old');
  assert.deepEqual(values, ['new']);
  manager.cancel();
  assert.equal(current.signal.aborted, true);
  assert.equal(current.isCurrent(), false);
  complete(current, 'after-unmount');
  assert.deepEqual(values, ['new']);
});

test('player binds its signed URL to the selected rendition and cancels on change', () => {
  const source = readFileSync(new URL('../app/_shared/rendition-player.tsx', import.meta.url), 'utf8');
  assert.match(source, /signal: request\.signal/);
  assert.match(source, /if \(!request\.isCurrent\(\)\) return/);
  assert.match(source, /return \(\) => playbackRequests\.cancel\(\)/);
  assert.match(source, /playback\?\.id === chosen\.id \? playback\.url : undefined/);
  assert.match(source, /setPosterUrl\(null\)/);
});
