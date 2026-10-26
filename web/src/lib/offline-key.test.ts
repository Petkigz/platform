import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

const { VAULT_INFO, decideKey, deriveSaveKey, readVaultSecret, VaultSecretError } =
  await import('./offline-key.ts');

const SECRET = 'a'.repeat(43);
const SAVE = '6f1d9f0e-3f4a-4c1b-9a2e-0b7c5d3e1f22';
const OTHER = '0b7c5d3e-1f22-4c1b-9a2e-6f1d9f0e3f4a';

test('the same save always derives the same key', async () => {
  const a = await deriveSaveKey(SECRET, SAVE);
  const b = await deriveSaveKey(SECRET, SAVE);

  assert.equal(a.length, 32);
  assert.deepEqual(a, b, 'a key that changed per call could not open a stored copy');
});

test('two saves on one device get two different keys', async () => {
  const a = await deriveSaveKey(SECRET, SAVE);
  const b = await deriveSaveKey(SECRET, OTHER);

  assert.notDeepEqual(a, b, 'one shared key would mean losing one save opens all of them');
});

test('a different secret gives a different key — that is how rotation revokes', async () => {
  const a = await deriveSaveKey(SECRET, SAVE);
  const b = await deriveSaveKey('b'.repeat(43), SAVE);

  assert.notDeepEqual(a, b);
});

test('the derivation is bound to this format', () => {
  assert.equal(VAULT_INFO, 'ayahspring.offline.v2');
});

test('an unset secret is refused with the name of the variable', () => {
  assert.throws(
    () => readVaultSecret(undefined),
    (error: unknown) => error instanceof VaultSecretError && /OFFLINE_VAULT_SECRET is unset/.test(error.message),
  );
  assert.throws(() => readVaultSecret('   '), VaultSecretError);
});

test('a short secret is refused rather than called 256-bit', () => {
  assert.throws(
    () => readVaultSecret('short'),
    (error: unknown) => error instanceof VaultSecretError && /too short/.test(error.message),
  );
});

test('a long secret is accepted and trimmed', () => {
  assert.equal(readVaultSecret(`  ${SECRET}  `), SECRET);
});

test('a live save gets its key', () => {
  const out = decideKey({
    id: SAVE,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    removed_at: null,
  });

  assert.equal(out.ok, true);
  assert.equal(out.ok && out.saveId, SAVE);
});

test('a lapsed save does not, and says to save it again', () => {
  const out = decideKey({
    id: SAVE,
    expires_at: new Date(Date.now() - 1000).toISOString(),
    removed_at: null,
  });

  assert.equal(out.ok, false);
  assert.match(out.ok === false ? out.message : '', /lapsed/);
});

test('a save removed on the device does not, even before its clock runs out', () => {
  const out = decideKey({
    id: SAVE,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    removed_at: new Date().toISOString(),
  });

  assert.equal(out.ok, false);
  assert.match(out.ok === false ? out.message : '', /removed from the device/);
});

test('a missing row is a refusal, not an empty key', () => {
  assert.equal(decideKey(null).ok, false);
  assert.equal(decideKey(undefined).ok, false);
  assert.equal(decideKey({ id: '', expires_at: null }).ok, false);
});

test('a row with no expiry is answered on its other facts', () => {
  assert.equal(decideKey({ id: SAVE, expires_at: null, removed_at: null }).ok, true);
});

test('an unreadable expiry is refused rather than treated as no expiry', () => {
  const out = decideKey({ id: SAVE, expires_at: 'the thirtieth', removed_at: null });

  assert.equal(out.ok, false);
  assert.match(out.ok === false ? out.message : '', /readable expiry/);
});
