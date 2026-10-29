import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * The wiring, not the logic.
 *
 * `arabic.test.ts` covers what `lib/arabic.ts` decides. This file covers the
 * other half, which no unit test can reach: whether the screens actually use it.
 * Every one of these assertions is a claim that a document made to somebody, and
 * each is the kind that fails silently — a component that stops being imported
 * still compiles, and a stylesheet that loses one line still renders. The next
 * person deleting the import to simplify a page will get a red suite instead of
 * a certificate printed in the wrong alphabet.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const globals = read('../app/globals.css');

/** The surfaces where a person's own words appear with no language column. */
const SURFACES: Array<[string, string]> = [
  ['the certificate', '../app/certificates/[number]/page.tsx'],
  ['a lesson page', '../app/learn/[enrolmentId]/lesson/[lessonId]/page.tsx'],
  ['a teacher profile', '../app/teachers/[slug]/page.tsx'],
  ['a course page', '../app/courses/[slug]/page.tsx'],
  ['a shelf card', '../app/_shared/course-shelf-card.tsx'],
];

for (const [what, path] of SURFACES) {
  test(`${what} marks Arabic`, () => {
    const source = read(path);
    assert.match(
      source,
      /from '@\/app\/_shared\/arabic-text'/,
      `${what} no longer imports the Arabic components`,
    );
    assert.match(
      source,
      /<Arabic(Inline|Block|Heading)\b/,
      `${what} imports the components and does not use them`,
    );
  });
}

test('the Arabic rules survive a stylesheet edit', () => {
  // Tracking is the rule most likely to be "tidied": it looks like a typo next
  // to the letter-spacing every other block in the file sets.
  assert.match(globals, /\.arabic\s*\{[^}]*letter-spacing:\s*0\s*!important/u);
  // A harakah is clipped at the 1.55 the rest of the site uses; the whole
  // argument for this line is the number.
  assert.match(globals, /\.arabic\s*\{[^}]*line-height:\s*2;/u);
  // No webfont is downloaded. If a `@font-face` ever appears for a Naskh face,
  // it was a decision, and it belongs in DECISIONS.md first.
  assert.doesNotMatch(globals, /@font-face[\s\S]{0,200}?(Naskh|Amiri|Scheherazade)/iu);
});

test('the shell says out loud that it is English and left to right', () => {
  const layout = read('../app/layout.tsx');
  assert.match(layout, /<html lang="en" dir="ltr">/u);
});

test('the accessibility page does not claim a translation', () => {
  const page = read('../app/account/accessibility/page.tsx');
  // The sentence that has to stay, in some form: the interface is English.
  assert.match(page, /interface[^.]{0,80}English/iu);
  assert.match(page, /No right-to-left interface/u);
  // And it must still admit what it has not got, rather than listing only what
  // works.
  assert.match(page, /No text-to-speech/u);
  assert.match(page, /No dyslexia-friendly font/u);
});
