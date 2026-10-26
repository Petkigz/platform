/**
 * The key a saved lesson is sealed with, and who is allowed to be given it.
 *
 * Per save, not per account: the input is the save's id, so two lessons on the
 * same device are sealed with two different keys and losing one does not open
 * the other. The master secret is server-only (`OFFLINE_VAULT_SECRET`) and never
 * reaches a browser; rotating it invalidates every saved copy everywhere, which
 * is both the revocation story and the reason it should be long and random.
 *
 * Derivation is HKDF-SHA256 with the save id as salt and a fixed info string.
 * The info string is versioned — a future envelope can derive a different key
 * without any old save becoming readable under the new format.
 */

/** 32 bytes, base64url, from a CSPRNG. Never a passphrase. */
const SECRET_MIN_BYTES = 32;

export const VAULT_INFO = 'ayahspring.offline.v2';

export class VaultSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultSecretError';
  }
}

/**
 * The configured secret, or a refusal that says what to set.
 *
 * There is deliberately no development fallback. A default secret would mean
 * every saved lesson on every deployment sealed with a key in this repository,
 * which is the same as leaving the bytes in the clear while calling them
 * encrypted. An unconfigured deployment therefore cannot save lessons offline at
 * all — fail closed, and say why.
 */
export function readVaultSecret(value: unknown = process.env.OFFLINE_VAULT_SECRET): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new VaultSecretError(
      'Offline saving is not configured on this deployment: OFFLINE_VAULT_SECRET is unset.',
    );
  }
  const secret = value.trim();
  if (secret.length < 43) {
    // 43 base64url characters is 32 bytes. A shorter secret is still a secret,
    // but not one worth claiming is 256 bits.
    throw new VaultSecretError(
      'OFFLINE_VAULT_SECRET is too short. Generate 32 random bytes (openssl rand -base64 32) and set that.',
    );
  }
  return secret;
}

/** The raw 32-byte key for one save id. Deterministic; never stored. */
export async function deriveSaveKey(secret: string, saveId: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'HKDF',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      // A save id is a UUID: unique per (learner, lesson, device). Salting with
      // it is what makes two saves on one device two keys.
      salt: encoder.encode(saveId),
      info: encoder.encode(VAULT_INFO),
    },
    material,
    256,
  );

  return new Uint8Array(bits);
}

/**
 * Whether a save may be opened right now.
 *
 * Four facts, and every one of them is a reason the app should refuse rather
 * than a reason it should try: a save that was never made, one that has lapsed,
 * one the learner withdrew on this device, and one the plan no longer covers.
 * The database enforces the entitlement; this function exists so the route has
 * one place that reads the row a single way.
 */
export type SaveRow = {
  id: string;
  expires_at: string | null;
  /** Set when the learner withdrew the save on that device, or the device was removed. */
  removed_at?: string | null;
};

export type KeyDecision =
  | { ok: true; saveId: string; expiresAt: string | null }
  | { ok: false; message: string };

export function decideKey(row: SaveRow | null | undefined, now: Date = new Date()): KeyDecision {
  if (!row || typeof row.id !== 'string' || row.id === '') {
    return { ok: false, message: 'There is no saved copy with that id.' };
  }

  // `removed_at` rather than a status column: a save has three states and the
  // table records them as facts — never made (no row), withdrawn (removed_at
  // set), or live until `expires_at`. A status string would be a fourth copy of
  // the same three facts.
  if (row.removed_at) {
    return { ok: false, message: 'That saved copy was removed from the device that held it.' };
  }

  if (row.expires_at) {
    const expires = new Date(row.expires_at);
    if (Number.isNaN(expires.getTime())) {
      return { ok: false, message: 'That saved copy has no readable expiry.' };
    }
    if (expires.getTime() <= now.getTime()) {
      return {
        ok: false,
        message: 'That saved copy has lapsed. Save the lesson again to refresh it.',
      };
    }
  }

  return { ok: true, saveId: row.id, expiresAt: row.expires_at };
}

/** The secret as a byte length, for the start-up line in the docs. Never the secret itself. */
export function describeSecret(secret: string): string {
  return `${secret.length} characters`;
}

export { SECRET_MIN_BYTES };
