import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { LOCALES, isOfferedLocale } from './i18n/locales.ts';
import { en } from './i18n/messages/en.ts';

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

test('every right-to-left language a reader can choose is named, from the register', () => {
  const page = read('../app/account/accessibility/page.tsx');

  // The list used to be typed: "Right-to-left is for Arabic, Urdu, Persian,
  // Pashto and Dari. Choosing one of those five…", and this test compared the
  // sentence with the register. The page is now in the reader's language, so
  // there is no English sentence to compare. The list is counted from the
  // register when the page is drawn, which is the stronger form of the same
  // promise: it cannot name a language that is not there, or miss one.
  assert.doesNotMatch(page, /Right-to-left is for/u);
  assert.match(page, /entry\.code !== DEFAULT_LOCALE && isOfferedLocale\(entry\.code\)/u);
  assert.match(page, /offered\.filter\(\(entry\) => entry\.dir === 'rtl'\)/u);
  // Each name in its own script and marked as that language, so a screen
  // reader says "العربية" in Arabic whatever the page is in.
  assert.match(page, /<bdi key=\{entry\.code\} lang=\{entry\.code\}>\s*\{entry\.nativeName\}/u);
  // And the sentence has a place for them, and for the count of languages.
  assert.match(en['reading.rtlNote'], /\{languages\}/u);
  assert.match(en['reading.offeredNote'], /\{count\}/u);
  assert.match(page, /count: formatNumber\(shown\.code, offered\.length\)/u);

  // What the register gives the page today: something to list, and Dhivehi,
  // which is right-to-left and withheld, not in it. Promising it would send a
  // reader to a picker that does not have it.
  const rtl = LOCALES.filter((locale) => locale.dir === 'rtl' && isOfferedLocale(locale.code));
  assert.ok(rtl.length > 0);
  assert.ok(LOCALES.some((locale) => locale.dir === 'rtl' && !isOfferedLocale(locale.code)));

  // No number of languages is typed anywhere in the sentences: "thirty-three
  // languages, all complete" was true once and stayed on the page for a month
  // after it stopped being true.
  for (const [key, sentence] of Object.entries(en)) {
    if (!key.startsWith('reading.') && !key.startsWith('ease.')) continue;
    assert.doesNotMatch(sentence, /\b(?:thirty|forty|fifty)[- ]/iu, `${key} types a count of languages`);
  }
});

test('the accessibility page tells the truth about the translation', () => {
  const page = read('../app/account/accessibility/page.tsx');
  const said = (key: keyof typeof en) => en[key];

  // The sentences that had to go: "the interface itself is in English", and
  // then "all of them are complete today".
  for (const text of [page, ...Object.values(en)]) {
    assert.doesNotMatch(text, /interface itself is in English/iu);
    assert.doesNotMatch(text, /All of them are complete/iu);
  }

  // What replaced them has to admit that a translation can be partial rather
  // than imply that many languages means many finished ones — and it has to
  // point at the page that prints the number instead of asserting it here.
  assert.match(said('reading.offeredNote'), /actually\s+translated/iu);
  assert.match(said('reading.offeredNote'), /in English for everyone/u);
  assert.match(page, /href="\/language"/u);
  // And the claim a coverage number cannot make: that a speaker read it.
  assert.match(said('reading.unreviewed'), /first-language\s+speaker/iu);

  // The sentence a fully written language shows on the language page said
  // "This language is fully translated" while whole screens were English.
  assert.doesNotMatch(said('language.coverageAll'), /fully translated/iu);
  assert.match(said('language.coverageAll'), /in English for everyone/u);

  // And it must still admit what it has not got, rather than listing only what
  // works.
  // Until 2026-11-27 that was "no text-to-speech" and "no dyslexia-friendly
  // font". Both are built; neither sentence may linger, and what is left is
  // what nobody has done.
  for (const text of Object.values(en)) {
    assert.doesNotMatch(text, /No text-to-speech|No dyslexia-friendly font/u);
  }
  assert.equal(said('ease.untested'), 'Not tested with a screen reader.');
  assert.match(page, /const missing = \[\['ease\.untested', 'ease\.untestedNote'\]\] as const;/u);
  // The font is offered as a choice, with its limits said beside it.
  assert.match(said('ease.lettersDyslexicNote'), /Latin and Cyrillic letters only/u);
  assert.match(said('ease.lettersDyslexicNote'), /studies have not shown that it helps everyone/u);
  // Reading aloud: whose voice, that the words go nowhere, and what is left out.
  assert.match(said('ease.speechNote'), /your device’s own voice/u);
  assert.match(said('ease.speechNote'), /The words are sent nowhere/u);
  assert.match(said('ease.speechNote'), /a verse is not for a machine’s voice/u);
});

test('the accessibility page claims only what was built or measured', () => {
  // Universal claims nobody measured were on this page: "every input has a
  // label", "no control is reachable only by a mouse", "every image that is
  // decoration is marked". They are not said in any sentence now.
  for (const [key, sentence] of Object.entries(en)) {
    if (!key.startsWith('reading.') && !key.startsWith('ease.')) continue;
    assert.doesNotMatch(sentence, /\bEvery (?:input|button|table|image|colour)\b/iu, key);
    assert.doesNotMatch(sentence, /no control is reachable/iu, key);
  }
  // What is not known is said: nobody who relies on a screen reader tested it.
  assert.match(en['ease.untestedNote'], /nobody who relies on one has tested it yet/u);
  assert.match(en['ease.untestedNote'], /has not been heard on every device/u);
  // The contrast check is of the normal design, and says so.
  assert.match(en['reading.coloursNote'], /of the normal design/u);

  // The page is open to everybody: the settings are a cookie on this browser.
  const page = read('../app/account/accessibility/page.tsx');
  assert.doesNotMatch(page, /redirect\(/u);
  assert.match(en['reading.lede'], /You do not need to be signed in/u);
  // And the way to it is on every page, signed in or not.
  const layout = read('../app/layout.tsx');
  assert.match(layout, /<Link href="\/account\/accessibility" lang=\{readingLabel\.code\}/u);
});

test('the first stop on every page can be seen when the keyboard reaches it', () => {
  const layout = read('../app/layout.tsx');
  // It was `className="sr-only"` with the same rules inline, so it was hidden
  // at every moment, focus included.
  assert.match(layout, /<a href="#main" className="skip-link">/u);
  assert.doesNotMatch(layout, /srOnly/u);
  const rule = globals.match(/\.skip-link \{[^}]*\}/u)?.[0] ?? '';
  assert.match(rule, /transform: translateY\(-300%\)/u);
  assert.doesNotMatch(rule, /clip:|width: 1px/u);
  assert.match(globals, /\.skip-link:focus \{ transform: none; \}/u);
});

