import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { en } from './i18n/messages/en.ts';
import { LOCALES, countLabel, directionOf, formatNumber, translator } from './i18n/index.ts';
import { frontDoorCta } from './session.ts';

/**
 * The front door, in the reader's language.
 *
 * `i18n.test.ts` proves every language has a sentence for every key.
 * `i18n-shelf-wiring.test.ts` proves the catalogue and the two doors ask for
 * them. This file is about the one page a stranger reads *before* any of that:
 * the front door. It was the last surface on the site written in English, on the
 * argument that it is the page with no session to read a preference from — which
 * was never true, because the language cookie and the device's own header are
 * both available to a page that has not been signed into.
 *
 * The check is not "the page imports the translator". It is that **no English
 * sentence is left in the markup**, that every key the page uses exists in every
 * one of the thirty-two translations, and that the two numbers on the page are
 * numbers rather than words: the subject count through `countLabel()`, which
 * knows that Swahili does not pluralise by adding a letter, and the step number
 * through `formatNumber()`, which knows a Persian reader reads ۲ for 2.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const HOME = read('../app/page.tsx');

/** Every language except the source. */
const TRANSLATED = LOCALES.filter((l) => l.code !== 'en');

/** The three families the front page's copy is written in. */
const HOME_FILES = [
  'home-africa-east.ts',
  'home-africa-west.ts',
  'home-africa-south.ts',
  'home-world.ts',
].map((name) => [name, read(`./i18n/messages/${name}`)] as const);

test('the front page asks the reader’s browser which language it is in', () => {
  // The cookie is the reader's own choice from `/language`; the header is what
  // the device asked for before they met us. `chooseLocale` already knows the
  // order between them, and the front page must not invent a third rule.
  assert.match(HOME, /const \{ code: locale \} = chooseLocale\(\{/u);
  assert.match(HOME, /chosen: jar\.get\(LOCALE_COOKIE\)\?\.value \?\? null/u);
  assert.match(HOME, /acceptLanguage: hdrs\.get\('accept-language'\)/u);
  assert.match(HOME, /const t = translator\(locale\);/u);
});

test('the front page has no English sentence left in its markup', () => {
  // Three or more words inside a JSX text node is a sentence somebody meant to
  // read. The one exception is deliberate and checked separately below: the
  // Supabase setup notice is read by whoever deploys this, not by a visitor.
  const withoutNotice = HOME.replace(/\{!configured && \([\s\S]*?\)\}\n/u, '');
  const literal = withoutNotice.match(/>\s*[A-Z][a-z]+(?: [a-z']+){2,}\s*</gu) ?? [];
  assert.deepEqual(literal, [], `the front page still says ${literal[0] ?? ''} in English`);

  // A hard-coded heading attribute is the same defect wearing a hat: it is read
  // aloud by a screen reader in the wrong language.
  const props = HOME.match(/aria-label="[A-Za-z][^"]{3,}"/gu) ?? [];
  assert.deepEqual(props, [], `the front page hard-codes ${props[0] ?? ''}`);
});

test('the setup notice stays in English, and only the setup notice', () => {
  // It is an operator's message about `.env.local`. Translating it into isiZulu
  // would be a kindness aimed at somebody who is reading `.env.example`.
  assert.match(HOME, /Supabase is not configured\./u);
  assert.match(HOME, /\{!configured && \(/u);
});

test('every string on the front page comes from the catalogue', () => {
  // A count rather than a list: the point is that this screen translates, not
  // that it translates exactly forty-two times today. Some keys arrive through
  // the three constant arrays (`t(a.title)`, `t(door.label)`), so the count is
  // taken over the keys the file names, not over the calls that render them.
  const keys = new Set(HOME.match(/'((?:home|audience)\.[A-Za-z0-9]+)'/gu) ?? []);
  assert.ok(keys.size >= 35, `the front page only names ${keys.size} translated strings`);

  // And the copy it used to hold as constants is gone from the file itself.
  assert.doesNotMatch(HOME, /^const ASSURANCES = \[\s*\{\s*title: '/mu);
  assert.doesNotMatch(HOME, /Learn your deen/u);
  assert.doesNotMatch(HOME, /Islamic learning, worldwide/u);
});

test('the copy is written for every language the picker offers', () => {
  for (const locale of TRANSLATED) {
    const t = translator(locale.code);
    for (const key of Object.keys(en).filter((k) => k.startsWith('home.'))) {
      assert.notEqual(
        t(key as keyof typeof en),
        translator('en')(key as keyof typeof en),
        `${locale.code}.${key} is still the English sentence`,
      );
    }
  }
});

test('both numbers on the page are numbers, not words', () => {
  // The claim is functional, not a source pattern: `formatNumber` is what the
  // page hands the template, so the assertion is made on the same functions.
  assert.equal(
    translator('fa')('home.step', { number: formatNumber('fa', 2) }),
    translator('fa')('home.step', { number: '۲' }),
    'the Persian step number is not in Persian digits',
  );
  assert.equal(formatNumber('bn', 3), '৩');
  assert.equal(formatNumber('en', 1), '1');

  assert.match(HOME, /\{t\('home\.step', \{ number: formatNumber\(locale, i \+ 1\) \}\)\}/u);

  // A step number is never written into a string. "Step 1st" is what happens
  // when an ordinal is translated, and it is wrong the day a fourth step exists.
  for (const locale of LOCALES) {
    const rendered = translator(locale.code)('home.step', { number: 'X' });
    assert.match(rendered, /X/u, `${locale.code} lost the step number`);
    assert.doesNotMatch(rendered, /1st|2nd|3rd/u, `${locale.code} spelled the number out`);
  }
});

test('the placeholders survive in every catalogue', () => {
  // A sentence that quietly loses its number is worse than an untranslated one:
  // it is finished-looking and says something the data does not.
  const needs: Array<[keyof typeof en, string]> = [
    ['home.studyCountOne', '{count}'],
    ['home.studyCountOther', '{count}'],
    ['home.step', '{number}'],
  ];
  for (const locale of LOCALES) {
    const t = translator(locale.code);
    for (const [key, placeholder] of needs) {
      assert.ok(
        t(key, { count: 'N', number: 'N' }).includes('N'),
        `${locale.code}.${key} dropped ${placeholder}`,
      );
      assert.ok(
        t(key).includes(placeholder),
        `${locale.code}.${key} does not keep ${placeholder} in its source sentence`,
      );
    }
  }
});

test('a subject count is a whole sentence in each language, singular and plural', () => {
  // English first, because it is the one that can be checked by eye.
  assert.equal(
    countLabel('en', 1, { one: 'home.studyCountOne', other: 'home.studyCountOther' }),
    '1 subject, each taught by a teacher reviewed for it.',
  );
  assert.equal(
    countLabel('en', 4, { one: 'home.studyCountOne', other: 'home.studyCountOther' }),
    '4 subjects, each taught by a teacher reviewed for it.',
  );

  // And in a Bantu language a plural is a different word, not the singular with
  // an s. This is why the page has two keys rather than one template: Swahili
  // says "somo" for one and "masomo" for many, isiZulu "isifundo" and "izifundo".
  const swOne = countLabel('sw', 1, { one: 'home.studyCountOne', other: 'home.studyCountOther' });
  const swMany = countLabel('sw', 4, { one: 'home.studyCountOne', other: 'home.studyCountOther' });
  assert.notEqual(swOne, swMany);
  assert.match(swOne, /\bsomo\b/u);
  assert.match(swMany, /asomo\b/u);

  // The digits are the reader's even inside a translated sentence.
  assert.match(countLabel('bn', 4, { one: 'home.studyCountOne', other: 'home.studyCountOther' }), /৪/u);
});

test('the arrows follow the reading direction, not the words', () => {
  // In Arabic a right-pointing arrow at the end of a link points back at the
  // start of the line, so it reads as "go back" beside a link that goes forward.
  assert.match(HOME, /directionOf\(locale\) === 'rtl' \? '\\u2190' : '\\u2192'/u);
  assert.equal(directionOf('ar'), 'rtl');
  assert.equal(directionOf('ur'), 'rtl');
  assert.equal(directionOf('fa'), 'rtl');
  assert.equal(directionOf('sw'), 'ltr');

  // The glyph is decoration and says so, so a screen reader does not announce
  // "rightwards arrow" after every link.
  const arrows = HOME.match(/<span aria-hidden="true">\{forward\}<\/span>/gu) ?? [];
  assert.ok(arrows.length >= 3, `only ${arrows.length} links carry a marked arrow`);
});

test('the button still goes where the session says, and says it in the reader’s language', () => {
  // Two responsibilities, deliberately split: `frontDoorCta` decides the
  // destination so the header, the front page and the closing band cannot
  // disagree, and the catalogue decides the words so the label can translate.
  assert.match(HOME, /const cta = frontDoorCta\(signedIn\);/u);
  assert.match(HOME, /const ctaLabel = t\(signedIn \? 'home\.continue' : 'home\.createAccount'\);/u);
  assert.doesNotMatch(HOME, /cta\.label/u);

  assert.equal(frontDoorCta(false).href, '/sign-up');
  assert.equal(frontDoorCta(true).href, '/learn');
});

test('the closing sentence is a different sentence for a member', () => {
  // A front door that greets somebody who already has an account with "create
  // an account" is how a product feels like a brochure.
  for (const locale of LOCALES) {
    const t = translator(locale.code);
    assert.notEqual(
      t('home.closingSignedIn'),
      t('home.closingSignedOut'),
      `${locale.code} says the same thing to a member and a visitor`,
    );
    assert.ok(t('home.closingSignedIn').length > 0, `${locale.code} has no closing sentence`);
  }
  assert.match(HOME, /\{t\(signedIn \? 'home\.closingSignedIn' : 'home\.closingSignedOut'\)\}/u);
});

test('the front page’s copy is in the files that were written for it', () => {
  // The four home catalogues exist so that adding a language is one block in a
  // file that holds nothing else, rather than a hunt through the framework.
  for (const [name, source] of HOME_FILES) {
    assert.match(source, /export const HOME_/u, `${name} exports nothing`);
    assert.match(source, /reviewed: false/u, `${name} does not say it is unreviewed`);
  }
  for (const code of ['sw', 'am', 'ha', 'yo', 'zu', 'af', 'ar', 'fr']) {
    assert.match(
      HOME_FILES.map(([, source]) => source).join('\n'),
      new RegExp(`^\\s{2}${code}: \\{$`, 'mu'),
      `no home block for ${code}`,
    );
  }
});
