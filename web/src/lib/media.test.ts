import assert from 'node:assert/strict';
import test from 'node:test';

import { validateRegisterUpload, MAX_UPLOAD_BYTES } from './media.ts';

// ---------------------------------------------------------------------------
// Registering an upload target.
//
// The rules under test are the ones that stop a bad row reaching the database,
// plus the one that matters most to the person using it: the checksum is a
// 64-char lowercase hex SHA-256, and being told that in a sentence beats being
// told a constraint name.
// ---------------------------------------------------------------------------

const base = {
  mimeType: 'video/mp4',
  byteSize: 1048576,
  checksum: 'a'.repeat(64),
  durationSeconds: 600,
};

test('a well-formed upload registers', () => {
  assert.equal(validateRegisterUpload(base).ok, true);
});

test('duration is optional', () => {
  assert.equal(validateRegisterUpload({ ...base, durationSeconds: null }).ok, true);
  assert.equal(
    validateRegisterUpload({ ...base, durationSeconds: undefined }).ok,
    true,
  );
});

test('a checksum that is not lowercase hex SHA-256 is refused', () => {
  const bad = [
    'not-a-hash',
    'A'.repeat(64), // uppercase
    'a'.repeat(63), // one short
    'a'.repeat(65), // one long
    'z'.repeat(64), // not hex
    '',
    ' '.repeat(64),
  ];

  for (const checksum of bad) {
    const r = validateRegisterUpload({ ...base, checksum });
    assert.equal(r.ok, false, `${JSON.stringify(checksum)} should be refused`);
    assert.ok(!r.ok);
    if (!r.ok) {
      assert.match(r.message, /SHA-256/);
      // The point is that this is a sentence, not a constraint name.
      assert.doesNotMatch(r.message, /_check/);
    }
  }
});

test('a mixed-case digest is refused rather than silently lowercased', () => {
  // The database lowercases it; the validation refuses first, so the caller is
  // told what was wrong instead of having their input quietly rewritten.
  const r = validateRegisterUpload({ ...base, checksum: 'Ab' + 'c'.repeat(62) });
  assert.equal(r.ok, false);
});

test('a file needs a type', () => {
  for (const mimeType of ['', '   ']) {
    const r = validateRegisterUpload({ ...base, mimeType });
    assert.equal(r.ok, false);
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.message, /type/i);
  }
});

test('a file needs a positive size in bytes', () => {
  for (const byteSize of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const r = validateRegisterUpload({ ...base, byteSize });
    assert.equal(r.ok, false, `${byteSize} should be refused`);
  }
});

test('an absurdly large file is refused before the request', () => {
  const r = validateRegisterUpload({ ...base, byteSize: MAX_UPLOAD_BYTES + 1 });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) assert.match(r.message, /8 GiB/);

  assert.equal(validateRegisterUpload({ ...base, byteSize: MAX_UPLOAD_BYTES }).ok, true,
    'exactly at the limit should pass');
});

test('a negative duration is refused', () => {
  assert.equal(validateRegisterUpload({ ...base, durationSeconds: -1 }).ok, false);
  assert.equal(validateRegisterUpload({ ...base, durationSeconds: 0 }).ok, true,
    'zero is a valid duration');
});

test('a fractional duration is refused', () => {
  assert.equal(validateRegisterUpload({ ...base, durationSeconds: 1.5 }).ok, false);
});
