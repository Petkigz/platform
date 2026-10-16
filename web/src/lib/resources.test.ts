import assert from 'node:assert/strict';
import test from 'node:test';

import { validateAddResource, RESOURCE_TYPES } from './authoring.ts';

// ---------------------------------------------------------------------------
// Attaching content to a lesson.
//
// A lesson with nothing attached is an empty page, so this validation is the
// front gate for the only thing that makes a course worth publishing. The rules
// under test:
//
//   * a name is required, because it is what the learner sees
//   * a URL is required, because uploading into our own storage is not wired
//   * the URL must be https — the column CHECK is `^https://`, and reporting it
//     here means the teacher reads a sentence instead of a constraint name
//   * the type must be one we support, so a typo is caught before the RPC
// ---------------------------------------------------------------------------

const base = {
  lessonId: '11111111-1111-4111-8111-111111111111',
  resourceType: 'video' as const,
  url: 'https://cdn.example.com/lesson.mp4',
  name: 'The lesson',
};

test('a well-formed resource passes', () => {
  assert.equal(validateAddResource(base).ok, true);
});

test('every supported type passes', () => {
  for (const t of RESOURCE_TYPES) {
    const r = validateAddResource({ ...base, resourceType: t });
    assert.equal(r.ok, true, `${t} should be accepted`);
  }
});

test('a blank name is refused before any request', () => {
  for (const name of ['', '   ', '\t']) {
    const r = validateAddResource({ ...base, name });
    assert.equal(r.ok, false, `name ${JSON.stringify(name)} should be refused`);
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.message, /name/i);
  }
});

test('a missing URL is refused, not sent as an empty string', () => {
  for (const url of ['', '   ']) {
    const r = validateAddResource({ ...base, url });
    assert.equal(r.ok, false);
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.message, /url/i);
  }
});

test('an http URL is refused with a message a teacher can act on', () => {
  const r = validateAddResource({ ...base, url: 'http://cdn.example.com/lesson.mp4' });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) {
    // The point is that this is a sentence, not "lesson_resources_external_url_check".
    assert.match(r.message, /https/i);
    assert.doesNotMatch(r.message, /_check/);
  }
});

test('a non-URL is refused', () => {
  for (const url of ['cdn.example.com/lesson.mp4', 'ftp://x/y', 'javascript:alert(1)']) {
    const r = validateAddResource({ ...base, url });
    assert.equal(r.ok, false, `${url} should be refused`);
  }
});

test('an unsupported content type is refused by name', () => {
  const r = validateAddResource({
    ...base,
    resourceType: 'hologram' as unknown as 'video',
  });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) assert.match(r.message, /not a kind of content/i);
});

test('a missing lesson is refused', () => {
  const r = validateAddResource({ ...base, lessonId: '' });
  assert.equal(r.ok, false);
});

test('an over-long name is refused', () => {
  const r = validateAddResource({ ...base, name: 'x'.repeat(201) });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) assert.match(r.message, /200/);
});

test('surrounding whitespace is not treated as a name', () => {
  // trim() decides emptiness, so "   " is blank but " The lesson " is fine.
  assert.equal(validateAddResource({ ...base, name: '  The lesson  ' }).ok, true);
});
