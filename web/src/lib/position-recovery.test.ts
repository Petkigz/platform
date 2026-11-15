import { test } from 'node:test';
import assert from 'node:assert/strict';
import { positionRecovery, type RecoveryRecord } from './position-recovery.ts';

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
const base: RecoveryRecord = { actorId: id(1), enrolmentId: id(2), lessonId: id(3), sessionId: id(4), seconds: 25, updatedAt: now };

test('requires opt-in and scopes recovery to the authenticated actor and lesson', () => {
  const storage = new MemoryStorage(); const recovery = positionRecovery(storage, () => now);
  assert.equal(recovery.save(base), false); assert.equal(storage.length, 0);
  recovery.enable(); assert.equal(recovery.save(base), true);
  recovery.save({ ...base, sessionId: id(5), seconds: 2 });
  assert.equal(recovery.list(base).length, 2);
  assert.deepEqual(recovery.list({ ...base, actorId: id(9) }), []);
  assert.deepEqual(recovery.list({ ...base, lessonId: id(9) }), []);
  recovery.disable(); assert.equal(storage.length, 0); assert.equal(recovery.enabled(), false);
});

test('expiry, invalid records and selective removal', () => {
  const storage = new MemoryStorage(); let clock = now; const recovery = positionRecovery(storage, () => clock);
  recovery.enable(); recovery.save(base);
  const later = { ...base, seconds: 40, updatedAt: now + 100 };
  clock += 100; recovery.save(later); recovery.remove(base);
  assert.deepEqual(recovery.list(base), [later]);
  storage.setItem('ayahspring:resume-recovery:v1:item:invalid', '{bad json');
  assert.deepEqual(recovery.list(base), [later]);
  clock += 7 * 24 * 60 * 60 * 1000;
  assert.deepEqual(recovery.list(base), []); assert.equal(storage.length, 1);
});

test('invalid inputs and unavailable storage are not reported as saved', () => {
  const storage = new MemoryStorage(); const recovery = positionRecovery(storage, () => now);
  recovery.enable();
  assert.throws(() => recovery.save({ ...base, seconds: Infinity }), /Invalid/);
  assert.throws(() => recovery.save({ ...base, actorId: 'bad' }), /Invalid/);
  storage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => recovery.save(base), /quota/);
});
