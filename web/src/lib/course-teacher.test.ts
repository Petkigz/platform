import assert from 'node:assert/strict';
import test from 'node:test';

import { teacherAttribution, UNNAMED_REASON } from './course-teacher.ts';

test('a published profile names its teacher and links to their page', () => {
  const a = teacherAttribution({
    displayName: 'Amina Yusuf',
    headline: 'Tajweed and Qira\u2019at',
    slug: 'amina-yusuf',
  });
  assert.equal(a.kind, 'named');
  if (a.kind !== 'named') return;
  assert.equal(a.name, 'Amina Yusuf');
  assert.equal(a.headline, 'Tajweed and Qira\u2019at');
  assert.equal(a.href, '/teachers/amina-yusuf');
});

test('no profile is an honest sentence, not a gap', () => {
  const a = teacherAttribution(null);
  assert.equal(a.kind, 'unnamed');
  if (a.kind !== 'unnamed') return;
  assert.equal(a.reason, UNNAMED_REASON);
  // The sentence must not suggest the course is unreviewed or the teacher lesser.
  assert.match(a.reason, /approved by a reviewer/);
  assert.doesNotMatch(a.reason, /unverified|not qualified|unknown teacher/i);
});

test('a name of only spaces is treated as no name', () => {
  // "Taught by " with nothing after it is worse than the honest sentence.
  assert.equal(
    teacherAttribution({ displayName: '   ', headline: 'x', slug: 'a' }).kind,
    'unnamed',
  );
});

test('names are trimmed, and an empty headline is null rather than a blank line', () => {
  const a = teacherAttribution({ displayName: '  Amina  ', headline: '   ', slug: 'amina' });
  assert.equal(a.kind, 'named');
  if (a.kind !== 'named') return;
  assert.equal(a.name, 'Amina');
  assert.equal(a.headline, null);
});

test('a slug that is not a slug produces no link', () => {
  // The table enforces this shape too; building an href from an unvalidated
  // string is how a redirect gets introduced later.
  for (const slug of ['../admin', 'Amina Yusuf', 'amina/yusuf', '', '  ', 'amina-']) {
    const a = teacherAttribution({ displayName: 'Amina', headline: null, slug });
    assert.equal(a.kind, 'named');
    if (a.kind !== 'named') continue;
    assert.equal(a.href, null, `slug ${JSON.stringify(slug)} produced a link`);
    // The name is still shown: a broken slug should not hide the teacher.
    assert.equal(a.name, 'Amina');
  }
});

test('a well-formed slug is linked exactly once, unencoded', () => {
  const a = teacherAttribution({ displayName: 'A', headline: null, slug: 'a-b-9' });
  if (a.kind !== 'named') throw new Error('expected named');
  assert.equal(a.href, '/teachers/a-b-9');
});
