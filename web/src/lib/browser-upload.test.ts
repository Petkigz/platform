import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';

import {
  MAX_BROWSER_UPLOAD_BYTES,
  MAX_DISPLAY_NAME_LENGTH,
  MULTIPART_THRESHOLD_BYTES,
  fallbackName,
  normalizeDisplayName,
  sha256OfFile,
  shouldUploadInParts,
  validateBrowserFile,
} from './browser-upload.ts';

const file = (over: Partial<{ name: string; size: number; type: string }> = {}) => ({
  name: 'Lesson 3 — Wudu.mp4',
  size: 10_485_760,
  type: 'video/mp4',
  ...over,
});

// ---------------------------------------------------------------------------
// What a browser can upload
// ---------------------------------------------------------------------------

await test('an ordinary lesson video is accepted', () => {
  assert.deepEqual(validateBrowserFile(file()), { ok: true });
});

await test('the ceiling is the database\'s, and the refusal says so', () => {
  // Two ceilings used to sit below this one: hashing, which needed the whole file
  // in memory and stopped at 512 MiB, and the transport, because one presigned
  // PUT carries at most 5 GiB less 5 MiB. `lib/digest.ts` removed the first and
  // parts removed the second, so what is left is the row's own limit — and the
  // browser and the database now refuse the same file for the same reason.
  assert.equal(MAX_BROWSER_UPLOAD_BYTES, 8 * 1024 * 1024 * 1024);

  const refused = validateBrowserFile(file({ size: MAX_BROWSER_UPLOAD_BYTES + 1 }));
  assert.equal(refused.ok, false);
  assert.ok(!refused.ok);
  // The teacher is told why the number exists rather than being handed a limit
  // that looks like a network problem they could retry their way past.
  assert.match(refused.message, /The most one lesson may be is/);
  assert.match(refused.message, /8\.0 GiB/);
  assert.match(refused.message, /limit on the record and not on the network/);
  assert.match(refused.message, /Split the recording/);
});

await test('a recording too large for either old ceiling is now accepted', () => {
  // 512 MiB was the limit when hashing needed the whole file in memory; 5 GiB
  // less 5 MiB was the limit while the upload was one request. These are the
  // sizes a real lesson recording comes in at, including the ones that used to be
  // refused and now travel in parts.
  for (const size of [
    512 * 1024 * 1024 + 1,
    1024 * 1024 * 1024,
    4 * 1024 * 1024 * 1024,
    5 * 1024 * 1024 * 1024,
    6 * 1024 * 1024 * 1024,
    8 * 1024 * 1024 * 1024,
  ]) {
    assert.deepEqual(validateBrowserFile(file({ size })), { ok: true }, String(size));
  }
});

await test('a file is uploaded in parts once one request stops being the safer choice', () => {
  assert.equal(MULTIPART_THRESHOLD_BYTES, 32 * 1024 * 1024);
  // At the threshold one PUT still wins: a single request, no XML, nothing to
  // assemble, and nothing that can be left half-finished in storage.
  assert.equal(shouldUploadInParts(MULTIPART_THRESHOLD_BYTES), false);
  assert.equal(shouldUploadInParts(MULTIPART_THRESHOLD_BYTES + 1), true);
  assert.equal(shouldUploadInParts(10_485_760), false);
  assert.equal(shouldUploadInParts(8 * 1024 * 1024 * 1024), true);
  // A size that is not a number is the caller's bug, and answering "one PUT"
  // would send it down the path that fails least loudly.
  assert.equal(shouldUploadInParts(Number.NaN), false);
  assert.equal(shouldUploadInParts(Number.POSITIVE_INFINITY), false);
});

await test('a file exactly at the ceiling is accepted', () => {
  assert.deepEqual(validateBrowserFile(file({ size: MAX_BROWSER_UPLOAD_BYTES })), { ok: true });
});

await test('an empty file, a nameless file and a typeless file are each refused', () => {
  for (const [over, pattern] of [
    [{ size: 0 }, /empty/],
    [{ name: '   ' }, /no name/],
    [{ type: '' }, /no type/],
  ] as const) {
    const refused = validateBrowserFile(file(over));
    assert.equal(refused.ok, false, JSON.stringify(over));
    assert.ok(!refused.ok);
    assert.match(refused.message, pattern, JSON.stringify(over));
  }
});

await test('a refusal names the size of the file the teacher picked', () => {
  const refused = validateBrowserFile(file({ size: 9 * 1024 * 1024 * 1024 }));
  assert.equal(refused.ok, false);
  assert.ok(!refused.ok);
  assert.match(refused.message, /9\.0 GiB/, 'the teacher cannot tell which file was refused');
});

// ---------------------------------------------------------------------------
// The name that ends up in the library
// ---------------------------------------------------------------------------

await test('the extension goes and the rest of the name stays', () => {
  assert.equal(normalizeDisplayName('Lesson 3 — Wudu.mp4', 'video/mp4'), 'Lesson 3 — Wudu');
  assert.equal(normalizeDisplayName('recording.MP4', 'video/mp4'), 'recording');
  assert.equal(normalizeDisplayName('notes.pdf', 'application/pdf'), 'notes');
});

await test('a name in Arabic survives untouched', () => {
  assert.equal(
    normalizeDisplayName('درس التجويد الأول.mp4', 'video/mp4'),
    'درس التجويد الأول',
  );
});

await test('a name with no substance falls back to what the file is', () => {
  assert.equal(normalizeDisplayName('', 'video/mp4'), 'Video recording');
  assert.equal(normalizeDisplayName('.mp4', 'video/mp4'), 'Video recording');
  assert.equal(normalizeDisplayName('   ', 'audio/mpeg'), 'Audio recording');
  assert.equal(normalizeDisplayName('scan.pdf', 'application/pdf').length > 0, true);
  assert.equal(fallbackName('application/pdf'), 'PDF document');
  assert.equal(fallbackName('image/png'), 'Image');
  assert.equal(fallbackName('application/octet-stream'), 'Uploaded file');
});

await test('whitespace is collapsed and a long name is cut to the column limit', () => {
  assert.equal(normalizeDisplayName('  Lesson    3  \n\t .mov ', 'video/quicktime'), 'Lesson 3');
  const long = normalizeDisplayName('x'.repeat(600), 'video/mp4');
  assert.equal(long.length, MAX_DISPLAY_NAME_LENGTH);
});

await test('a name that is only an extension is not left empty', () => {
  assert.equal(normalizeDisplayName('mp4', 'video/mp4'), 'mp4');
  assert.equal(normalizeDisplayName('.mov', 'video/quicktime'), 'Video recording');
});

// ---------------------------------------------------------------------------
// The checksum the database requires
// ---------------------------------------------------------------------------

await test('the digest matches an independent implementation', async () => {
  const bytes = new TextEncoder().encode('AyahSpring lesson recording');
  const expected = createHash('sha256').update(bytes).digest('hex');

  const actual = await sha256OfFile(new Blob([bytes]));
  assert.equal(actual, expected);
  assert.match(actual, /^[a-f0-9]{64}$/, 'lowercase hex, exactly what the column checks');
});

await test('an empty file still has a digest', async () => {
  const expected = createHash('sha256').update(Buffer.alloc(0)).digest('hex');
  assert.equal(await sha256OfFile(new Blob([])), expected);
});

await test('two different files do not share a digest', async () => {
  const a = await sha256OfFile(new Blob([new TextEncoder().encode('lesson one')]));
  const b = await sha256OfFile(new Blob([new TextEncoder().encode('lesson two')]));
  assert.notEqual(a, b);
});

await test('hashing reports progress, because on a large file it takes a while', async () => {
  // Bigger than one digest chunk, so this is more than one pass: a progress
  // callback that fires once is indistinguishable from no progress at all.
  const bytes = new Uint8Array(4 * 1024 * 1024 + 1000);

  const seen: number[] = [];
  const got = await sha256OfFile(new Blob([bytes]), (progress) => seen.push(progress.hashedBytes));

  assert.equal(got, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(seen[seen.length - 1], bytes.length, 'the last report is the whole file');
  assert.ok(seen.length > 1, 'a file this size is hashed in more than one pass');
});
