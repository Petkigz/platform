import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';

// The module is written for the browser's global crypto; Node has the same
// WebCrypto under `node:crypto` and not on globalThis in every version.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

const {
  OfflineVaultError,
  VAULT_MAGIC,
  fromBase64Url,
  importSaveKey,
  looksSealed,
  openBytes,
  plaintextSize,
  sealBytes,
  toBase64Url,
} = await import('./offline-vault.ts');

const keyBytes = (seed: number) => new Uint8Array(32).fill(seed);

test('a lesson sealed with a key comes back byte for byte', async () => {
  const key = await importSaveKey(keyBytes(1));
  const plain = new TextEncoder().encode('the first lesson of the course');

  const sealed = await sealBytes(key, plain);

  assert.deepEqual(await openBytes(key, sealed), plain);
});

test('the envelope says what it is, and the header is checked before decrypting', async () => {
  const key = await importSaveKey(keyBytes(2));
  const sealed = await sealBytes(key, new Uint8Array([1, 2, 3]));

  assert.equal(new TextDecoder().decode(sealed.slice(0, 4)), VAULT_MAGIC);
  assert.equal(looksSealed(sealed), true);
});

test('a plaintext blob is refused by name, not by an opaque crypto error', async () => {
  const key = await importSaveKey(keyBytes(3));
  const oldPlaintext = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  await assert.rejects(
    () => openBytes(key, oldPlaintext),
    (error: unknown) =>
      error instanceof OfflineVaultError &&
      /older version of the app/.test(error.message),
  );
});

test('a tampered byte fails, and the message admits it cannot tell why', async () => {
  const key = await importSaveKey(keyBytes(4));
  const sealed = await sealBytes(key, new TextEncoder().encode('watch this'));

  sealed[sealed.length - 1] = sealed[sealed.length - 1]! ^ 0xff;

  await assert.rejects(
    () => openBytes(key, sealed),
    (error: unknown) =>
      error instanceof OfflineVaultError &&
      /altered, or the key/.test(error.message),
  );
});

test('the wrong key cannot open it', async () => {
  const sealed = await sealBytes(await importSaveKey(keyBytes(5)), new Uint8Array([9, 9, 9]));
  const otherKey = await importSaveKey(keyBytes(6));

  await assert.rejects(() => openBytes(otherKey, sealed), OfflineVaultError);
});

test('two seals of the same bytes differ, because the nonce is fresh', async () => {
  const key = await importSaveKey(keyBytes(7));
  const plain = new Uint8Array([4, 4, 4]);

  const first = await sealBytes(key, plain);
  const second = await sealBytes(key, plain);

  assert.notDeepEqual(first, second, 'a reused nonce would leak that two lessons are identical');
  assert.deepEqual(await openBytes(key, first), plain);
  assert.deepEqual(await openBytes(key, second), plain);
});

test('a key of the wrong length is refused before anything is sealed', async () => {
  await assert.rejects(
    () => importSaveKey(new Uint8Array(16)),
    (error: unknown) => error instanceof OfflineVaultError && /32-byte key/.test(error.message),
  );
});

test('a truncated file is refused rather than fed to the tag check', async () => {
  const key = await importSaveKey(keyBytes(8));

  await assert.rejects(() => openBytes(key, new Uint8Array(8)), /truncated/);
});

test('the reported size is the plaintext size, not the envelope', async () => {
  const key = await importSaveKey(keyBytes(9));
  const plain = new Uint8Array(1000);

  const sealed = await sealBytes(key, plain);

  assert.equal(plaintextSize(sealed), 1000);
  assert.equal(sealed.length, 1000 + 16 + 16, 'header and tag are not the lesson');
});

test('a key survives the JSON round trip it actually takes', async () => {
  const key = keyBytes(11);
  const wire = toBase64Url(key);

  assert.match(wire, /^[A-Za-z0-9_-]+$/, 'a key with + or / in it is not safe in a header');
  assert.deepEqual(fromBase64Url(wire), key);
});

test('base64url decoding handles the padding it had to drop', async () => {
  for (const length of [1, 2, 3, 4, 5, 31, 32, 33]) {
    const bytes = new Uint8Array(length).map((_, i) => (i * 7) % 256);
    assert.deepEqual(fromBase64Url(toBase64Url(bytes)), bytes);
  }
});
