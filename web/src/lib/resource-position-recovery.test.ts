import { test } from 'node:test';
import assert from 'node:assert/strict';
import { positionRecovery } from './position-recovery.ts';
import { resourcePositionRecovery, type RecoveryRecord } from './resource-position-recovery.ts';

class MemoryStorage {
  items = new Map<string, string>();
  get length() { return this.items.size; }
  key(i: number) { return [...this.items.keys()][i] ?? null; }
  getItem(k: string) { return this.items.get(k) ?? null; }
  setItem(k: string, v: string) { this.items.set(k, v); }
  removeItem(k: string) { this.items.delete(k); }
}
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = 2000000000;
const base: RecoveryRecord = { actorId: id(1), enrolmentId: id(2), lessonId: id(3), resourceId: id(6), sessionId: id(4), seconds: 25, updatedAt: now };

test('requires opt-in and scopes recovery to the authenticated actor and lesson', () => {
  const storage = new MemoryStorage(); const recovery = resourcePositionRecovery(storage, () => now);
  assert.equal(recovery.save(base), false); assert.equal(storage.length, 0);
  recovery.enable(); assert.equal(recovery.save(base), true);
  recovery.save({ ...base, sessionId: id(5), seconds: 2 });
  assert.equal(recovery.list(base).length, 2);
  assert.deepEqual(recovery.list({ ...base, actorId: id(9) }), []);
  assert.deepEqual(recovery.list({ ...base, lessonId: id(9) }), []);
  assert.deepEqual(recovery.list({ ...base, resourceId: id(9) }), []);
  recovery.save({ ...base, resourceId: id(9), seconds: 70 });
  assert.equal(recovery.list(base).length, 2);
  assert.equal(recovery.list({ ...base, resourceId: id(9) })[0]?.seconds, 70);
  recovery.disable(); assert.equal(storage.length, 0); assert.equal(recovery.enabled(), false);
});

test('expiry, invalid records and selective removal', () => {
  const storage = new MemoryStorage(); let clock = now; const recovery = resourcePositionRecovery(storage, () => clock);
  recovery.enable(); recovery.save(base);
  const later = { ...base, seconds: 40, updatedAt: now + 100 };
  clock += 100; recovery.save(later); recovery.remove(base);
  assert.deepEqual(recovery.list(base), [later]);
  storage.setItem('ayahspring:resume-recovery:v3:item:invalid', '{bad json');
  assert.deepEqual(recovery.list(base), [later]);
  clock += 7 * 24 * 60 * 60 * 1000;
  assert.deepEqual(recovery.list(base), []); assert.equal(storage.length, 1);
});

test('invalid inputs and unavailable storage are not reported as saved', () => {
  const storage = new MemoryStorage(); const recovery = resourcePositionRecovery(storage, () => now);
  recovery.enable();
  assert.throws(() => recovery.save({ ...base, seconds: Infinity }), /Invalid/);
  assert.throws(() => recovery.save({ ...base, actorId: 'bad' }), /Invalid/);
  storage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => recovery.save(base), /quota/);
});


test('legacy lesson-only records are never assigned to a resource and either setting clears both formats', () => {
  for (const useResourceDisable of [false, true]) {
    const storage = new MemoryStorage();
    const legacy = positionRecovery(storage, () => now);
    const resource = resourcePositionRecovery(storage, () => now);
    legacy.enable();
    legacy.save({ actorId: base.actorId, enrolmentId: base.enrolmentId, lessonId: base.lessonId,
      sessionId: base.sessionId, seconds: 42, updatedAt: now });
    assert.deepEqual(resource.list(base), []);
    resource.save(base);
    assert.equal(legacy.list(base).length, 1);
    assert.equal(resource.list(base).length, 1);
    if (useResourceDisable) resource.disable(); else legacy.disable();
    assert.equal(storage.length, 0);
    assert.equal(resource.enabled(), false);
  }
});

test('missing resource identities and mismatched storage keys are rejected', () => {
  const storage = new MemoryStorage();
  const recovery = resourcePositionRecovery(storage, () => now);
  recovery.enable();
  assert.throws(() => recovery.save({ ...base, resourceId: '' }), /Invalid/);
  storage.setItem('ayahspring:resume-recovery:v3:item:wrong', JSON.stringify(base));
  assert.deepEqual(recovery.list(base), []);
  assert.equal(storage.length, 1);
});
