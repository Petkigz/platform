/**
 * Lessons kept inside the app.
 *
 * Decided 2026-10-22: downloads work the way an app's downloads do — they exist
 * in the app's own storage and not in the device's file manager. Nothing can
 * promise a determined person cannot copy a stream, and this does not pretend
 * to. What it does is make the *storage* app-private: bytes go into IndexedDB
 * under this origin, are never written through a `download` attribute, and are
 * played from a blob URL created at read time.
 *
 * The two pieces that can be tested without a browser are the clock and the
 * device key; the IndexedDB surface is thin and deliberately dumb, so there is
 * no logic in it that could disagree with the database.
 */

export type SavedLesson = {
  downloadId: string;
  lessonId: string;
  title: string;
  courseTitle: string;
  savedAt: string;
  expiresAt: string;
  bytes: number;
  /** Filled by the reader, not stored: whether the clock has passed. */
  lapsed: boolean;
};

/** How long is left, said the way a person would say it. */
export function describeRemaining(expiresAt: string, now: Date = new Date()): string {
  const days = Math.ceil(
    (new Date(expiresAt).getTime() - now.getTime()) / 86_400_000,
  );
  if (days <= 0) return 'expired';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

/** Whether a saved lesson may still be played. The database decides it too. */
export function isPlayable(expiresAt: string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() > now.getTime();
}

/**
 * The key this install is known by.
 *
 * Random, not a fingerprint: the platform wants to know "one device or two", not
 * what the hardware is. Kept in local storage so the same browser keeps the same
 * slot, and regenerated if it is missing or malformed — which costs the learner a
 * re-save, not an account.
 */
export function deviceKey(): string {
  const storageKey = 'ayahspring.device';
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) return existing;

    const bytes = new Uint8Array(18);
    window.crypto.getRandomValues(bytes);
    const key = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    window.localStorage.setItem(storageKey, key);
    return key;
  } catch {
    // Private mode, or storage disabled. A key that lives for the session still
    // lets the lesson play; it simply will not be the same slot next time.
    return 'session-' + Math.random().toString(36).slice(2).padEnd(18, '0');
  }
}

const DB_NAME = 'ayahspring-offline';
const STORE = 'lessons';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'lessonId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

type StoredLesson = Omit<SavedLesson, 'lapsed'> & { blob: Blob };

/** Keep a lesson. The bytes never leave this origin. */
export async function storeLesson(
  lesson: Omit<SavedLesson, 'lapsed'>,
  blob: Blob,
): Promise<void> {
  const record: StoredLesson = { ...lesson, blob };
  await run('readwrite', (store) => store.put(record));
}

/** Everything saved on this device, whether or not it has lapsed. */
export async function listSaved(now: Date = new Date()): Promise<SavedLesson[]> {
  const all = await run<StoredLesson[]>('readonly', (store) => store.getAll() as IDBRequest<StoredLesson[]>);
  return all
    .map(({ blob: _blob, ...rest }) => ({ ...rest, lapsed: !isPlayable(rest.expiresAt, now) }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** A URL for the player, created at read time and revoked when it stops. */
export async function lessonBlobUrl(lessonId: string): Promise<string | null> {
  const record = await run<StoredLesson | undefined>(
    'readonly',
    (store) => store.get(lessonId) as IDBRequest<StoredLesson | undefined>,
  );
  if (!record) return null;
  return URL.createObjectURL(record.blob);
}

export async function removeStored(lessonId: string): Promise<void> {
  await run('readwrite', (store) => store.delete(lessonId));
}

/** How much of this device's storage the app is using, for the screen. */
export function describeBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
