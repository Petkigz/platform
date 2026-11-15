/** Opt-in, best-effort recovery for one browser profile, not durable storage.
 * Stored IDs and positions can be inspected by anyone with profile access.
 * Expiry is enforced on later access; a closed browser cannot erase on time.
 */
const PREFIX = 'ayahspring:resume-recovery:v1:';
const CONSENT = `${PREFIX}enabled`;
const ITEM = `${PREFIX}item:`;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Scope = { actorId: string; enrolmentId: string; lessonId: string };
export type RecoveryRecord = Scope & { sessionId: string; seconds: number; updatedAt: number };
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
const validScope = (scope: Scope) => [scope.actorId, scope.enrolmentId, scope.lessonId].every((id) => idPattern.test(id));
const validRecord = (record: RecoveryRecord, now: number) => validScope(record) && idPattern.test(record.sessionId)
  && Number.isInteger(record.seconds) && record.seconds >= 0 && record.seconds <= 86400
  && Number.isSafeInteger(record.updatedAt) && record.updatedAt <= now && now - record.updatedAt < MAX_AGE;
const keyFor = (record: RecoveryRecord) => `${ITEM}${record.actorId}:${record.enrolmentId}:${record.lessonId}:${record.sessionId}`;

export function positionRecovery(store: Store, clock: () => number = Date.now) {
  const keys = () => {
    const result: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith(ITEM)) result.push(key);
    }
    return result;
  };
  return {
    enabled() { return store.getItem(CONSENT) === 'yes'; },
    enable() { store.setItem(CONSENT, 'yes'); },
    disable() {
      // Remove consent first so a partial cleanup does not silently resume writes.
      store.removeItem(CONSENT);
      for (const key of keys()) store.removeItem(key);
    },
    save(record: RecoveryRecord) {
      if (store.getItem(CONSENT) !== 'yes') return false;
      if (!validRecord(record, clock())) throw new Error('Invalid recovery record');
      store.setItem(keyFor(record), JSON.stringify(record));
      return true;
    },
    list(scope: Scope): RecoveryRecord[] {
      if (store.getItem(CONSENT) !== 'yes' || !validScope(scope)) return [];
      const now = clock();
      const found: RecoveryRecord[] = [];
      for (const key of keys()) {
        let record: RecoveryRecord | null = null;
        try { record = JSON.parse(store.getItem(key) ?? 'null') as RecoveryRecord | null; } catch { /* invalid record */ }
        if (!record || typeof record !== 'object' || !validRecord(record, now) || keyFor(record) !== key) {
          store.removeItem(key);
          continue;
        }
        if (record.actorId === scope.actorId && record.enrolmentId === scope.enrolmentId && record.lessonId === scope.lessonId) found.push(record);
      }
      return found.sort((a, b) => b.updatedAt - a.updatedAt || a.sessionId.localeCompare(b.sessionId));
    },
    remove(record: RecoveryRecord) {
      if (!validScope(record) || !idPattern.test(record.sessionId)) throw new Error('Invalid recovery record');
      const key = keyFor(record);
      const current = store.getItem(key);
      // Avoid removing an updated record in the ordinary case. localStorage has
      // no atomic compare-and-delete across tabs, so callers must still regard
      // recovery as best effort, not a transactional outbox.
      if (current === JSON.stringify(record)) store.removeItem(key);
    },
  };
}
