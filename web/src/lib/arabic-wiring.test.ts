import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { LOCALES } from './i18n/locales.ts';

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

test('the shell says out loud which language it is in', () => {
  const layout = read('../app/layout.tsx');

  // `lang` and `dir` come from the register now, not from a constant. That is
  // what a screen reader and a bidi algorithm read, so it is the two attributes
  // and not the words on the page that decide whether an Arabic page is Arabic.
  assert.match(layout, /<html lang=\{code\} dir=\{directionOf\(code\)\}>/u);

  // Both sources the choice can come from: the cookie this browser set, and the
  // device's own `Accept-Language` when it has not set one.
  assert.match(layout, /LOCALE_COOKIE/u);
  assert.match(layout, /accept-language/u);

  // `og:locale` was fixed at `'en'` while everything around it was translated: a
  // link shared into an Arabic group previewed in English. The share card now
  // takes the same code the page does, in the hook that can read it.
  assert.match(layout, /openGraph: \{ \.\.\.baseMetadata\.openGraph, locale: code/u);

  // And the way to change it is reachable from every page.
  assert.match(layout, /href="\/language"/u);
});

test('every right-to-left language in the register is named as one', () => {
  const page = read('../app/account/accessibility/page.tsx');
  const sentence = page.match(/Right-to-left is for ([^.]+)\./u)?.[1] ?? '';
  assert.notEqual(sentence, '', 'the accessibility page no longer lists the RTL languages');

  const rtl = LOCALES.filter((locale) => locale.dir === 'rtl');
  assert.ok(rtl.length > 0);
  for (const locale of rtl) {
    assert.ok(
      sentence.includes(locale.englishName),
      `${locale.code} is right-to-left but the page does not say so`,
    );
  }
  // The other direction matters too: a left-to-right language claimed as RTL
  // would be the same defect seen from the other side.
  for (const locale of LOCALES.filter((l) => l.dir === 'ltr' && l.code !== 'en')) {
    assert.ok(
      !sentence.includes(locale.englishName),
      `the page calls ${locale.code} right-to-left`,
    );
  }
});

test('the accessibility page tells the truth about the translation', () => {
  const page = read('../app/account/accessibility/page.tsx');

  // The sentence that had to go: "the interface itself is in English".
  assert.doesNotMatch(page, /interface itself is in English/iu);

  // What replaced it has to admit that a translation can be partial rather than
  // imply that many languages means many finished ones — and it has to point at
  // the page that prints the number instead of asserting it here.
  assert.match(page, /actually\s+translated/iu);
  assert.match(page, /href="\/language"/u);
  // And the claim a coverage number cannot make: that a native speaker read it.
  assert.match(page, /native\s+speaker/iu);

  // And it must still admit what it has not got, rather than listing only what
  // works.
  assert.match(page, /No text-to-speech/u);
  assert.match(page, /No dyslexia-friendly font/u);
});

