/**
 * SHA-256 over a file that does not fit in memory.
 *
 * WHY THIS EXISTS INSTEAD OF `crypto.subtle.digest`
 * -------------------------------------------------
 * `register_media_upload()` requires a SHA-256 digest of the file, and that is
 * the right requirement: the digest is what proves the platform still holds the
 * exact original somebody uploaded, and what lets a rights request be matched to
 * every copy of it. WebCrypto cannot produce one incrementally — `subtle.digest`
 * takes a whole `ArrayBuffer` — so hashing in a browser meant holding the entire
 * file in memory, which is why the browser path used to stop at 512 MiB while the
 * database accepted 8 GiB.
 *
 * This is the same algorithm, fed a slice at a time. Memory is bounded by the
 * chunk size, not by the file: a 5 GiB recording costs one 4 MiB buffer, because
 * `Blob.slice()` reads from disk rather than copying the file into the page.
 *
 * ONE IMPLEMENTATION, NOT A FAST PATH AND A SLOW PATH
 * ---------------------------------------------------
 * WebCrypto would be several times faster on a small file, so the obvious design
 * is to use it below some threshold and this above it. That is refused here on
 * purpose: the digest is a security property, and two implementations means the
 * one that is exercised least — the large-file path, which is the rare one — is
 * the one a bug hides in. Every upload goes through the same code, and every
 * upload is therefore a test of it.
 *
 * The cost is a few extra seconds on a small file, in a flow dominated by the
 * transfer itself.
 */

/**
 * Bytes read per pass.
 *
 * Large enough that the per-chunk overhead is noise, small enough that the page
 * holds one of them. A chunk is also the granularity of the progress callback,
 * so this is how often a teacher sees the checksum move.
 */
export const DIGEST_CHUNK_BYTES = 4 * 1024 * 1024;

/** Round `value` right by `bits`, as an unsigned 32-bit number. */
function rotr(value: number, bits: number): number {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

/** The first 32 bits of the fractional parts of the cube roots of the first 64 primes. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const INITIAL_H = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

/**
 * The 64-bit big-endian bit count that ends a padded message.
 *
 * Exported because the high word is the part a browser test cannot otherwise
 * reach: it is non-zero only at 512 MiB and above, which is exactly the range
 * this file exists to make uploadable, and exactly the range the old
 * WebCrypto-only path never had to handle.
 */
export function lengthBlock(totalBytes: number): Uint8Array {
  if (!Number.isFinite(totalBytes) || totalBytes < 0) {
    throw new Error('a byte count cannot be negative');
  }
  // bits / 2^32, without ever forming a bit count larger than 2^53.
  const high = Math.floor(totalBytes / 2 ** 29);
  const low = (totalBytes * 8) >>> 0;
  const out = new Uint8Array(8);
  out[0] = (high >>> 24) & 0xff;
  out[1] = (high >>> 16) & 0xff;
  out[2] = (high >>> 8) & 0xff;
  out[3] = high & 0xff;
  out[4] = (low >>> 24) & 0xff;
  out[5] = (low >>> 16) & 0xff;
  out[6] = (low >>> 8) & 0xff;
  out[7] = low & 0xff;
  return out;
}

/**
 * A SHA-256 state that can be fed any number of times.
 *
 * Deliberately not a `ReadableStream` transformer: the callers have a `Blob`,
 * and a transform would need one more API (`ReadableStream` from a slice) to do
 * what `update()` does directly.
 */
export class Sha256 {
  private readonly h = Uint32Array.from(INITIAL_H);
  private readonly block = new Uint8Array(64);
  private readonly w = new Uint32Array(64);
  private blockLength = 0;
  private totalBytes = 0;
  private finished = false;

  /** Bytes hashed so far. What the progress callback reports. */
  get bytes(): number {
    return this.totalBytes;
  }

  update(chunk: Uint8Array): void {
    if (this.finished) throw new Error('a finished digest cannot take more bytes');
    this.totalBytes += chunk.length;

    let offset = 0;

    // Finish a part-filled block first, so the loop below can work in whole
    // blocks straight out of the caller's buffer.
    if (this.blockLength > 0) {
      const take = Math.min(64 - this.blockLength, chunk.length);
      this.block.set(chunk.subarray(0, take), this.blockLength);
      this.blockLength += take;
      offset = take;
      if (this.blockLength === 64) {
        this.compress(this.block, 0);
        this.blockLength = 0;
      }
    }

    while (offset + 64 <= chunk.length) {
      this.compress(chunk, offset);
      offset += 64;
    }

    if (offset < chunk.length) {
      this.block.set(chunk.subarray(offset), 0);
      this.blockLength = chunk.length - offset;
    }
  }

  /** Pads, compresses the tail and returns the 32-byte digest. */
  digest(): Uint8Array {
    if (this.finished) throw new Error('a digest cannot be taken twice');
    this.finished = true;

    // A message whose tail leaves no room for the length needs a second block.
    const padded = new Uint8Array(this.blockLength < 56 ? 64 : 128);
    padded.set(this.block.subarray(0, this.blockLength), 0);
    padded[this.blockLength] = 0x80;
    padded.set(lengthBlock(this.totalBytes), padded.length - 8);

    this.compress(padded, 0);
    if (padded.length === 128) this.compress(padded, 64);

    const out = new Uint8Array(32);
    for (let i = 0; i < 8; i += 1) {
      const word = this.h[i] ?? 0;
      out[i * 4] = (word >>> 24) & 0xff;
      out[i * 4 + 1] = (word >>> 16) & 0xff;
      out[i * 4 + 2] = (word >>> 8) & 0xff;
      out[i * 4 + 3] = word & 0xff;
    }
    return out;
  }

  private compress(input: Uint8Array, offset: number): void {
    const w = this.w;
    for (let i = 0; i < 16; i += 1) {
      const at = offset + i * 4;
      w[i] =
        (((input[at] ?? 0) << 24) |
          ((input[at + 1] ?? 0) << 16) |
          ((input[at + 2] ?? 0) << 8) |
          (input[at + 3] ?? 0)) >>>
        0;
    }
    for (let i = 16; i < 64; i += 1) {
      const x = w[i - 15] ?? 0;
      const y = w[i - 2] ?? 0;
      const s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
      const s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0;
      w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) >>> 0;
    }

    const h = this.h;
    let a = h[0] ?? 0;
    let b = h[1] ?? 0;
    let c = h[2] ?? 0;
    let d = h[3] ?? 0;
    let e = h[4] ?? 0;
    let f = h[5] ?? 0;
    let g = h[6] ?? 0;
    let hh = h[7] ?? 0;

    for (let i = 0; i < 64; i += 1) {
      const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const choose = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (hh + s1 + choose + (K[i] ?? 0) + (w[i] ?? 0)) >>> 0;
      const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (s0 + majority) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h[0] = ((h[0] ?? 0) + a) >>> 0;
    h[1] = ((h[1] ?? 0) + b) >>> 0;
    h[2] = ((h[2] ?? 0) + c) >>> 0;
    h[3] = ((h[3] ?? 0) + d) >>> 0;
    h[4] = ((h[4] ?? 0) + e) >>> 0;
    h[5] = ((h[5] ?? 0) + f) >>> 0;
    h[6] = ((h[6] ?? 0) + g) >>> 0;
    h[7] = ((h[7] ?? 0) + hh) >>> 0;
  }
}

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

export type DigestProgress = {
  /** Bytes folded into the digest so far. */
  hashedBytes: number;
  totalBytes: number;
};

export type DigestOptions = {
  chunkBytes?: number;
  onProgress?: (progress: DigestProgress) => void;
};

/**
 * The SHA-256 of a blob, as 64 lowercase hex characters, reading it a slice at a
 * time.
 *
 * Each pass yields to the event loop, because a teacher watching a multi-gigabyte
 * checksum with a frozen page cannot tell "working" from "hung" — and cannot
 * cancel either, since the button is disabled while this runs.
 */
export async function sha256OfBlob(blob: Blob, options: DigestOptions = {}): Promise<string> {
  const chunkBytes = options.chunkBytes ?? DIGEST_CHUNK_BYTES;
  if (!Number.isFinite(chunkBytes) || chunkBytes < 1) {
    throw new Error('a chunk has to be at least one byte');
  }

  const hasher = new Sha256();
  for (let offset = 0; offset < blob.size; offset += chunkBytes) {
    const slice = blob.slice(offset, Math.min(offset + chunkBytes, blob.size));
    hasher.update(new Uint8Array(await slice.arrayBuffer()));
    options.onProgress?.({ hashedBytes: hasher.bytes, totalBytes: blob.size });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return toHex(hasher.digest());
}
