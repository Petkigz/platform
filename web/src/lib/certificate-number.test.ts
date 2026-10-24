import assert from 'node:assert/strict';
import test from 'node:test';

import {
  certificateVerifyPath,
  normaliseCertificateNumber,
  numberProblem,
} from './certificate-number.ts';

const N = 'AS-2026-00000001';

test('the canonical number is accepted as it is', () => {
  assert.equal(normaliseCertificateNumber(N), N);
});

test('case and surrounding space do not matter', () => {
  assert.equal(normaliseCertificateNumber('  as-2026-00000001 '), N);
  assert.equal(normaliseCertificateNumber('\tAs-2026-00000001\n'), N);
});

test('a PDF that substituted en or em dashes still works', () => {
  assert.equal(normaliseCertificateNumber('AS\u20132026\u201300000001'), N);
  assert.equal(normaliseCertificateNumber('AS\u20142026\u201400000001'), N);
  assert.equal(normaliseCertificateNumber('AS\u22122026\u221200000001'), N);
});

test('a pasted URL yields the number it points at', () => {
  assert.equal(normaliseCertificateNumber(`https://ayahspring.com/verify/${N}`), N);
  assert.equal(normaliseCertificateNumber(`https://ayahspring.com/verify/${N}/`), N);
  assert.equal(normaliseCertificateNumber(`https://ayahspring.com/verify/${N}?utm=email#top`), N);
  assert.equal(normaliseCertificateNumber(`/verify/${N}`), N);
});

test('separators a person types instead of hyphens are dropped', () => {
  assert.equal(normaliseCertificateNumber('AS 2026 00000001'), N);
  assert.equal(normaliseCertificateNumber('AS202600000001'), N);
  assert.equal(normaliseCertificateNumber('AS.2026.00000001'), N);
});

test('a number that is not a number is refused rather than guessed', () => {
  // Nothing here may resolve to a different certificate than the one meant.
  assert.equal(normaliseCertificateNumber('AS-2026-0000001'), null); // seven digits
  assert.equal(normaliseCertificateNumber('AS-2026-000000001'), null); // nine
  assert.equal(normaliseCertificateNumber('BS-2026-00000001'), null);
  assert.equal(normaliseCertificateNumber('AS-26-00000001'), null);
  assert.equal(normaliseCertificateNumber('hello'), null);
  assert.equal(normaliseCertificateNumber(''), null);
  assert.equal(normaliseCertificateNumber('   '), null);
  assert.equal(normaliseCertificateNumber(`${N}x`), null);
});

test('a value that is not a string is refused, not coerced', () => {
  assert.equal(normaliseCertificateNumber(undefined), null);
  assert.equal(normaliseCertificateNumber(null), null);
  assert.equal(normaliseCertificateNumber(202600000001), null);
  assert.equal(normaliseCertificateNumber({ number: N }), null);
});

test('an absurd input is refused before it is worked on', () => {
  assert.equal(normaliseCertificateNumber(`${N}/${'x'.repeat(500)}`), null);
});

test('the link is the number, encoded', () => {
  assert.equal(certificateVerifyPath(N), `/verify/${N}`);
  // Nothing that reaches the path may need escaping, but encoding it means a
  // hand-typed oddity cannot break the URL.
  assert.equal(certificateVerifyPath('AS 2026'), '/verify/AS%202026');
});

test('the sentence quotes the shape rather than a code', () => {
  assert.equal(numberProblem(N), null);

  const empty = numberProblem('  ');
  assert.ok(empty && empty.includes('Enter the certificate number'));

  const wrong = numberProblem('12345');
  assert.ok(wrong && wrong.includes('AS-2026-00000001'));
});
