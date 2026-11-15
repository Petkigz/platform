import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completeCatalogueWork, searchLessonsIfEnabled } from './catalogue-work.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test('no query or disabled/unavailable flag never invokes lesson search', async () => {
  let flags = 0; let searches = 0;
  const flag = async () => { flags++; return false; };
  const search = async () => { searches++; return ['hit']; };
  assert.deepEqual(await searchLessonsIfEnabled(false, flag, search), { enabled: false, hits: [] });
  assert.equal(flags, 0);
  assert.deepEqual(await searchLessonsIfEnabled(true, flag, search), { enabled: false, hits: [] });
  assert.deepEqual(await searchLessonsIfEnabled(true, async () => { throw new Error('unavailable'); }, search), { enabled: false, hits: [] });
  assert.equal(searches, 0);
  assert.deepEqual(await searchLessonsIfEnabled(true, async () => true, search), { enabled: true, hits: ['hit'] });
});

test('lesson search starts while independent card work is still pending', async () => {
  const card = deferred<string>();
  const flag = deferred<boolean>();
  let searchStarted = false;
  const lessons = searchLessonsIfEnabled(true, () => flag.promise, async () => {
    searchStarted = true; return ['lesson'];
  });
  const completed = completeCatalogueWork(card.promise, lessons, Promise.resolve());
  flag.resolve(true);
  await lessons;
  assert.equal(searchStarted, true);
  card.resolve('cards');
  assert.deepEqual(await completed, { cards: 'cards', lessons: { enabled: true, hits: ['lesson'] } });
});

test('analytics remains awaited and unexpected search failures still propagate', async () => {
  const analytics = deferred<void>();
  let completed = false;
  const all = completeCatalogueWork(Promise.resolve('cards'), Promise.resolve({ enabled: false, hits: [] }), analytics.promise).then(() => { completed = true; });
  await Promise.resolve();
  assert.equal(completed, false);
  analytics.resolve();
  await all;
  await assert.rejects(searchLessonsIfEnabled(true, async () => true, async () => { throw new Error('search failed'); }), /search failed/);
});
