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
 * And, since 2026-10-24, **sealed**: what is written is AES-GCM ciphertext, not
 * the lesson. The key comes from `/api/offline/key` and is minted only while the
 * save is live, so a lapsed copy on disk is unreadable through the app even
 * though the bytes are still there. `openSavedLesson()` is the only way bytes
 * leave storage, which is what makes that true rather than advisory.
 *
 * THE UPGRADE
 * -----------
 * Version 1 of this store held plain lesson blobs. They are deleted when the
 * database opens at version 2: a plaintext copy cannot be turned into a sealed
 * one without the key, and pretending to keep it would leave on disk exactly
 * what this change exists to remove. A learner loses a save and re-downloads it
 * once; the alternative is a permanent hole behind a feature that claims to be
 * protected.
 *
 * The pieces that can be tested without a browser are the clock and the device
 * key; the IndexedDB surface is thin and deliberately dumb, so there is no logic
 * in it that could disagree with the database.
 */

import {
  OfflineVaultError,
  fromBase64Url,
  importSaveKey,
  openBytes,
  plaintextSize,
  sealBytes,
  toArrayBuffer,
} from './offline-vault.ts';

export type SavedLesson = {
  downloadId: string;
  lessonId: string;
  title: string;
  courseTitle: string;
  savedAt: string;
  expiresAt: string;
  bytes: number;
  /**
   * What the bytes are, recorded at save time from the response.
   *
   * A saved copy has no file name for a browser to read a type from, and
   * `application/octet-stream` makes it download instead of play. Guessing from
   * magic bytes was the alternative and it is guesswork: the fetch that produced
   * the bytes already knew.
   */
  mimeType: string;
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
/** 2 = sealed. 1 held plain blobs and is deleted on upgrade, never read. */
const DB_VERSION = 2;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // A plaintext store from version 1 is dropped rather than migrated: its
      // blobs cannot be sealed without a key that was never minted for them,
      // and keeping them would preserve the exact thing this version removes.
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE);
      }
      db.createObjectStore(STORE, { keyPath: 'lessonId' });
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

type StoredLesson = Omit<SavedLesson, 'lapsed'> & { sealed: ArrayBuffer };

/**
 * Ask the server for the key to this save.
 *
 * The key is per save and expires with it. A 410 means the save lapsed or was
 * removed, which is a sentence the screen can show — not a network fault.
 */
export async function fetchSaveKey(downloadId: string): Promise<Uint8Array> {
  const response = await fetch('/api/offline/key', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ downloadId }),
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => null)) as
    | { ok?: boolean; key?: string; message?: string }
    | null;

  if (!response.ok || body?.ok !== true || typeof body.key !== 'string') {
    throw new OfflineVaultError(
      'key',
      body?.message ?? 'This saved lesson cannot be opened on this device.',
    );
  }

  return fromBase64Url(body.key);
}

/**
 * Keep a lesson, sealed.
 *
 * Sealing happens here rather than in the player so that there is exactly one
 * writer to this store and no code path can put an unsealed blob in it. The size
 * recorded is the plaintext's, because that is what the reader is deciding
 * about when they look at their storage, and ciphertext size would be a
 * meaningless number sixteen bytes larger.
 */
export async function storeLesson(
  lesson: Omit<SavedLesson, 'lapsed'>,
  blob: Blob,
): Promise<void> {
  const raw = await fetchSaveKey(lesson.downloadId);
  const key = await importSaveKey(raw);
  const sealed = await sealBytes(key, new Uint8Array(await blob.arrayBuffer()));

  const record: StoredLesson = {
    ...lesson,
    bytes: blob.size,
    mimeType: lesson.mimeType || blob.type || 'video/mp4',
    sealed: sealed.buffer.slice(sealed.byteOffset, sealed.byteOffset + sealed.byteLength) as ArrayBuffer,
  };
  await run('readwrite', (store) => store.put(record));
}

/** Everything saved on this device, whether or not it has lapsed. */
export async function listSaved(now: Date = new Date()): Promise<SavedLesson[]> {
  const all = await run<StoredLesson[]>('readonly', (store) => store.getAll() as IDBRequest<StoredLesson[]>);
  return all
    .map(({ sealed, ...rest }) => ({
      ...rest,
      // The recorded plaintext size, not the envelope's: a reader looking at
      // "how much of my phone is this" is owed the size of the lesson.
      bytes: rest.bytes || plaintextSize(new Uint8Array(sealed)),
      lapsed: !isPlayable(rest.expiresAt, now),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * The saved copy, decrypted, as a URL the player can play.
 *
 * This is the only way bytes leave this store. Three refusals happen before any
 * decryption: there is no record, the clock has passed, or the server will not
 * mint the key — and the last of those is the one that matters, because it is
 * the server's answer about the learner's plan rather than this device's.
 *
 * The URL is created at read time. The caller must revoke it; a player that
 * forgot would keep the decrypted lesson alive in memory for the life of the
 * tab, which is the one thing this design is trying to avoid.
 */
export async function openSavedLesson(
  lessonId: string,
  now: Date = new Date(),
): Promise<{ url: string; type: string } | null> {
  const record = await run<StoredLesson | undefined>(
    'readonly',
    (store) => store.get(lessonId) as IDBRequest<StoredLesson | undefined>,
  );
  if (!record) return null;

  if (!isPlayable(record.expiresAt, now)) {
    throw new OfflineVaultError(
      'key',
      'This saved lesson has lapsed. Save it again while you are online to keep it.',
    );
  }

  const raw = await fetchSaveKey(record.downloadId);
  const key = await importSaveKey(raw);
  const plain = await openBytes(key, new Uint8Array(record.sealed));

  const type = record.mimeType || 'video/mp4';
  return { url: URL.createObjectURL(new Blob([toArrayBuffer(plain)], { type })), type };
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
