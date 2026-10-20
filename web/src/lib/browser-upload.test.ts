import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';

import {
  MAX_BROWSER_UPLOAD_BYTES,
  MAX_DISPLAY_NAME_LENGTH,
  fallbackName,
  normalizeDisplayName,
  sha256OfFile,
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

await test('the browser ceiling is well below the database ceiling, and says why', () => {
  const refused = validateBrowserFile(file({ size: MAX_BROWSER_UPLOAD_BYTES + 1 }));
  assert.equal(refused.ok, false);
  assert.ok(!refused.ok);
  // The teacher is told the reason, not just the number: without the checksum
  // explanation the limit looks arbitrary.
  assert.match(refused.message, /checksum/);
  assert.match(refused.message, /512 MiB/);
  assert.ok(
    MAX_BROWSER_UPLOAD_BYTES < 8 * 1024 * 1024 * 1024,
    'the browser ceiling must stay below the 8 GiB the database allows',
  );
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

await test('a refusal names both sizes, so the teacher knows how far over they are', () => {
  const refused = validateBrowserFile(file({ size: MAX_BROWSER_UPLOAD_BYTES * 2 }));
  assert.equal(refused.ok, false);
  assert.ok(!refused.ok);
  assert.match(refused.message, /1\.0 GiB/);
  assert.match(refused.message, /512 MiB/);
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
