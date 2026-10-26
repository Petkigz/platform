/**
 * What is kept on a device, and what it is sealed with.
 *
 * The offline lesson feature had two halves and shipped one. `save_offline_lesson()`
 * books a save, the player fetches the bytes and writes them into this origin's
 * IndexedDB — and then nothing could open them: no player read the stored copy,
 * and the bytes sat there in the clear.
 *
 * Two things follow, and this module is both of them.
 *
 * **A saved lesson is encrypted at rest.** AES-256-GCM with a key derived, per
 * save, from a secret that never leaves the server. What lands in IndexedDB is
 * ciphertext, so a shared laptop, a "copy this folder" instruction or a curious
 * flatmate with devtools finds nothing playable. The key is minted only while the
 * save is live and the plan is still entitled, so a lapsed save is unreadable
 * *after* the client stops holding the key.
 *
 * **This is not DRM, and the file does not pretend it is.** A person who keeps
 * the key they were given can keep playing their copy; no browser technology
 * prevents that. What is achieved is narrower and worth stating plainly: nothing
 * durable on disk is plaintext, and nothing that has lapsed can be opened by the
 * app. Any stronger claim would be false.
 *
 * The envelope is a fixed header plus GCM output:
 *
 *     bytes 0..3    'AFP1' — format and version, checked before decrypting so
 *                   an old plaintext blob is refused by name rather than by an
 *                   opaque crypto error
 *     bytes 4..15   the 96-bit nonce, random per seal
 *     bytes 16..     ciphertext with the 16-byte tag appended by WebCrypto
 */

export const VAULT_MAGIC = 'AFP1';
const MAGIC_BYTES = new TextEncoder().encode(VAULT_MAGIC);
const IV_BYTES = 12;
const HEADER_BYTES = MAGIC_BYTES.length + IV_BYTES;

export class OfflineVaultError extends Error {
  readonly code: 'format' | 'tampered' | 'key';

  constructor(code: 'format' | 'tampered' | 'key', message: string) {
    super(message);
    this.name = 'OfflineVaultError';
    this.code = code;
  }
}

/**
 * A byte array as the exact `ArrayBuffer` WebCrypto wants.
 *
 * `Uint8Array` is generic over its backing buffer in current TypeScript, and
 * `crypto.subtle` will not accept the general type. Slicing copies, which also
 * means a caller cannot mutate the array out from under a pending seal.
 */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Base64url, because the key travels through JSON and a header is no place for `+`. */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * A 32-byte raw key, imported for GCM.
 *
 * The length is checked rather than trusted: a truncated key would otherwise
 * fail at the first seal with "data too short", which says nothing about where
 * the problem is.
 */
export async function importSaveKey(raw: Uint8Array): Promise<CryptoKey> {
  if (raw.length !== 32) {
    throw new OfflineVaultError(
      'key',
      `A saved lesson is sealed with a 32-byte key; this one is ${raw.length} bytes.`,
    );
  }
  return crypto.subtle.importKey('raw', toArrayBuffer(raw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Bytes in, sealed envelope out. The nonce is fresh every time. */
export async function sealBytes(key: CryptoKey, plain: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(plain)),
  );

  const out = new Uint8Array(HEADER_BYTES + cipher.length);
  out.set(MAGIC_BYTES, 0);
  out.set(iv, MAGIC_BYTES.length);
  out.set(cipher, HEADER_BYTES);
  return out;
}

/**
 * Sealed envelope in, bytes out.
 *
 * Every failure is named. "The saved copy cannot be opened on this device" is
 * the sentence the player shows, and the difference between *this file is not
 * ours*, *this file was altered* and *this key is not the one it was sealed
 * with* is the difference between "save it again", "somebody edited it" and
 * "your plan has ended" — three different things for the reader to do.
 */
export async function openBytes(key: CryptoKey, sealed: Uint8Array): Promise<Uint8Array> {
  if (sealed.length <= HEADER_BYTES) {
    throw new OfflineVaultError('format', 'That saved copy is truncated.');
  }

  for (let i = 0; i < MAGIC_BYTES.length; i += 1) {
    if (sealed[i] !== MAGIC_BYTES[i]) {
      throw new OfflineVaultError(
        'format',
        'That saved copy was written by an older version of the app and has to be saved again.',
      );
    }
  }

  const iv = sealed.slice(MAGIC_BYTES.length, HEADER_BYTES);
  const cipher = sealed.slice(HEADER_BYTES);

  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(cipher),
    );
    return new Uint8Array(plain);
  } catch {
    // GCM cannot tell a wrong key from an altered file: both fail the tag check.
    // Saying so is more honest than picking one and being wrong half the time.
    throw new OfflineVaultError(
      'tampered',
      'That saved copy could not be opened — it was altered, or the key that sealed it is no longer issued.',
    );
  }
}

/** Whether a blob found on disk is in the current format, without decrypting it. */
export function looksSealed(bytes: Uint8Array): boolean {
  if (bytes.length <= HEADER_BYTES) return false;
  for (let i = 0; i < MAGIC_BYTES.length; i += 1) {
    if (bytes[i] !== MAGIC_BYTES[i]) return false;
  }
  return true;
}

/** How many bytes the plaintext was, given the envelope. Used to show sizes. */
export function plaintextSize(sealed: Uint8Array): number {
  return Math.max(0, sealed.length - HEADER_BYTES - 16);
}
