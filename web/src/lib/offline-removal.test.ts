import assert from 'node:assert/strict';
import test from 'node:test';
import { removeSavedWithConfirmation } from './offline-removal.ts';

const id = 'save-id';
test('a lost response or rejected booking never silently removes the local copy', async () => {
  let local = false;
  const removeLocal = async () => { local = true; };
  for (const remote of [
    async () => { throw new Error('lost reply'); },
    async () => ({ data: null, error: new Error('server unavailable') }),
    async () => ({ data: { removed: true, downloadId: 'different' }, error: null }),
  ]) {
    const result = await removeSavedWithConfirmation(id, remote, removeLocal);
    assert.equal(result.ok, false);
    assert.equal(local, false);
  }
});
test('confirmed and already-removed replies allow local removal; local failures remain visible', async () => {
  let local = false;
  const remote = async () => ({ data: { removed: true, alreadyRemoved: true, downloadId: id }, error: null });
  assert.deepEqual(await removeSavedWithConfirmation(id, remote, async () => { local = true; }), { ok: true });
  assert.equal(local, true);
  const failure = await removeSavedWithConfirmation(id, remote, async () => { throw new Error('storage'); });
  assert.equal(failure.ok, false);
  if (!failure.ok) assert.match(failure.message, /server recorded the removal/i);
});
