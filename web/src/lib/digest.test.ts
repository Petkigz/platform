/**
 * A digest that does not need the file in memory.
 *
 * These are the tests that let `MAX_BROWSER_UPLOAD_BYTES` rise above 512 MiB.
 * The reference is `node:crypto`, which the web suite may import even though the
 * browser code must not: the point of every test here is that this
 * implementation and a trusted one agree, byte for byte, over inputs fed in
 * shapes a browser will actually produce.
 *
 * The most important one is the last: the high word of the padded bit count is
 * zero below 512 MiB and non-zero above it, so every digest the old
 * WebCrypto-only path ever produced exercised one branch of the padding and
 * nothing exercised the other. A hasher that is wrong above 512 MiB is wrong
 * exactly where it was just made usable.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  DIGEST_CHUNK_BYTES,
  Sha256,
  lengthBlock,
  sha256OfBlob,
  toHex,
} from './digest.ts';

/** The published SHA-256 vectors, so a bug cannot hide behind node:crypto too. */
const VECTORS: Array<[string, string]> = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  [
    'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  ],
  [
    'a'.repeat(1_000_000),
    'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
  ],
];

test('the published vectors come out as published', async () => {
  for (const [input, want] of VECTORS) {
    const hasher = new Sha256();
    hasher.update(new TextEncoder().encode(input));
    assert.equal(toHex(hasher.digest()), want, `the vector for ${input.length} bytes`);
  }
});

/** Fill a buffer with bytes that are not a repeated pattern. */
function bytes(length: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(length));
  for (let i = 0; i < length; i += 1) out[i] = (i * 31 + 7) & 0xff;
  return out;
}

function reference(input: Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

// 55/56, 63/64/65 and 119/120/127/128/129 are the block and padding boundaries:
// a tail of 56 bytes or more needs a second block, and getting that wrong is
// silent — the digest is still 64 plausible hex characters.
const BOUNDARY_SIZES = [
  0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129,
  DIGEST_CHUNK_BYTES - 1, DIGEST_CHUNK_BYTES, DIGEST_CHUNK_BYTES + 1,
];

test('every boundary size matches node:crypto, however it is fed', async () => {
  for (const size of BOUNDARY_SIZES) {
    const input = bytes(size);
    const want = reference(input);

    const whole = new Sha256();
    whole.update(input);
    assert.equal(toHex(whole.digest()), want, `${String(size)} bytes in one update`);

    // One byte at a time: the part-filled block path, on every pass.
    const trickle = new Sha256();
    for (let i = 0; i < size; i += 1) trickle.update(input.subarray(i, i + 1));
    assert.equal(toHex(trickle.digest()), want, `${String(size)} bytes a byte at a time`);

    // Uneven slices, the shape a blob gives up when a chunk boundary lands
    // mid-block.
    const uneven = new Sha256();
    let offset = 0;
    for (const step of [7, 64, 1, 129, 512, 3]) {
      uneven.update(input.subarray(offset, offset + step));
      offset += step;
    }
    uneven.update(input.subarray(offset));
    assert.equal(toHex(uneven.digest()), want, `${String(size)} bytes in uneven slices`);
  }
});

test('an empty file hashes to the empty digest', async () => {
  assert.equal(
    await sha256OfBlob(new Blob([])),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
});

test('a blob is read a slice at a time, and the progress says so', async () => {
  const input = bytes(10_000);
  const seen: Array<{ hashedBytes: number; totalBytes: number }> = [];
  const got = await sha256OfBlob(new Blob([input]), {
    chunkBytes: 1_000,
    onProgress: (progress) => seen.push({ ...progress }),
  });

  assert.equal(got, reference(input));
  assert.equal(seen.length, 10, 'one report per slice');
  assert.equal(seen[0]?.hashedBytes, 1_000);
  assert.equal(seen[9]?.hashedBytes, 10_000);
  assert.ok(
    seen.every((p) => p.totalBytes === 10_000),
    'the total moved while hashing',
  );
  assert.ok(
    seen.every((p, i) => i === 0 || p.hashedBytes > (seen[i - 1]?.hashedBytes ?? 0)),
    'progress went backwards',
  );
});

test('the last slice is short, and still hashed', async () => {
  const input = bytes(2_500);
  const got = await sha256OfBlob(new Blob([input]), { chunkBytes: 1_000 });
  assert.equal(got, reference(input), 'a trailing slice under the chunk size was dropped');
});

test('a finished digest refuses more bytes and a second reading', () => {
  const hasher = new Sha256();
  hasher.update(new TextEncoder().encode('abc'));
  hasher.digest();
  assert.throws(() => hasher.update(new Uint8Array(1)), /finished digest cannot take more bytes/);
  assert.throws(() => hasher.digest(), /cannot be taken twice/);
});

test('the bytes hashed so far are what a progress bar reports', () => {
  const hasher = new Sha256();
  assert.equal(hasher.bytes, 0);
  hasher.update(new Uint8Array(70));
  assert.equal(hasher.bytes, 70, 'a part-filled block was not counted');
  hasher.update(new Uint8Array(30));
  assert.equal(hasher.bytes, 100);
});

test('a chunk has to be at least one byte', async () => {
  await assert.rejects(
    () => sha256OfBlob(new Blob([bytes(8)]), { chunkBytes: 0 }),
    /at least one byte/,
  );
});

test('hex is padded, so a leading zero cannot shorten a digest', () => {
  assert.equal(toHex(new Uint8Array([0, 1, 15, 16, 255])), '00010f10ff');
});

test('the padded bit count is big-endian, and its high word wakes at 512 MiB', () => {
  const hex = (n: number) => Buffer.from(lengthBlock(n)).toString('hex');
  assert.equal(hex(0), '0000000000000000');
  assert.equal(hex(1), '0000000000000008', 'one byte is eight bits');
  assert.equal(hex(512 * 1024 * 1024 - 1), '00000000fffffff8');
  assert.equal(hex(512 * 1024 * 1024), '0000000100000000', 'the high word stays zero');
  assert.equal(hex(5 * 1024 * 1024 * 1024 - 5 * 1024 * 1024), '00000009fd800000',
    'the largest file a single PUT to storage can carry');
  assert.throws(() => lengthBlock(-1), /cannot be negative/);
});

/**
 * 512 MiB of zeros, hashed.
 *
 * This is the expensive test in the file and it is kept anyway: it is the only
 * one that drives the high word of the length through the whole padding and
 * compression path, which is the range the browser could not previously upload
 * at all. Six seconds and half a gigabyte of RAM buys the certainty that a
 * teacher's 3 GiB recording gets the digest the database will later be checked
 * against — a wrong digest there does not fail loudly, it fails when somebody
 * tries to match a rights request to the file.
 */
test('a file above the old ceiling hashes the same as node:crypto says', async () => {
  const size = 512 * 1024 * 1024;
  const input = new Uint8Array(size);

  const referenceHash = createHash('sha256');
  const hasher = new Sha256();
  for (let offset = 0; offset < size; offset += DIGEST_CHUNK_BYTES) {
    const slice = input.subarray(offset, offset + DIGEST_CHUNK_BYTES);
    referenceHash.update(slice);
    hasher.update(slice);
  }

  assert.equal(toHex(hasher.digest()), referenceHash.digest('hex'));
});
