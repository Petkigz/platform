import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { contentLine, formatMinutes } from './catalogue-cards.ts';
import { LOCALES, translator } from './i18n/index.ts';
import { emptyShelfMessage } from './lesson-search.ts';
import { rangeLabel } from './paging.ts';

/**
 * The shelf, in the reader's language.
 *
 * `i18n.test.ts` proves every language has a sentence for every key, and
 * `i18n-wiring.test.ts` proves the sign-in door asks for them. This file is the
 * catalogue's own proof: the shelf is the screen a person meets before they have
 * an account, so an English shelf behind an Arabic interface is not a missing
 * detail, it is the first thing they see.
 *
 * Two rules are older than this unit and are checked here because the shelf is
 * where they would break first: the words a learner typed are never translated,
 * and a course's title and description belong to its author.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const PAGE = read('../app/catalogue/page.tsx');
const PAGER = read('../app/_shared/shelf-pager.tsx');
const CARD = read('../app/_shared/course-shelf-card.tsx');
const YOUNG = read('../app/young/page.tsx');
const ADULTS = read('../app/adults/page.tsx');

const FILES: Array<[string, string]> = [
  ['the catalogue page', PAGE],
  ['the shelf pager', PAGER],
  ['the shelf card', CARD],
];

test('the catalogue page asks the reader’s browser which language it is in', () => {
  // The cookie is the reader's choice and the header is the device's; both are
  // handed to `chooseLocale`, which already knows the order between them.
  assert.match(PAGE, /const \{ code: locale \} = chooseLocale\(\{/u);
  assert.match(PAGE, /chosen: jar\.get\(LOCALE_COOKIE\)\?\.value \?\? null/u);
  assert.match(PAGE, /acceptLanguage: hdrs\.get\('accept-language'\)/u);
  assert.match(PAGE, /const t = translator\(locale\);/u);
});

for (const [what, source] of FILES) {
  test(`${what} has no English sentence left in its markup`, () => {
    // Three or more words inside a JSX text node is a sentence somebody meant to
    // read. In a file that is translated, it is a miss.
    const literal = source.match(/>\s*[A-Z][a-z]+(?: [a-z']+){2,}\s*</gu) ?? [];
    assert.deepEqual(literal, [], `${what} still says ${literal[0] ?? ''} in English`);
  });

  test(`${what} has no hard-coded control label`, () => {
    // A control named in English inside an Arabic page is read aloud in English
    // by a screen reader, and shown as an English tooltip to everybody else.
    const props = source.match(/aria-label="[A-Za-z][^"]{3,}"/gu) ?? [];
    assert.deepEqual(props, [], `${what} hard-codes ${props[0] ?? ''}`);
    const placeholders = source.match(/placeholder="[A-Za-z][^"]{3,}"/gu) ?? [];
    assert.deepEqual(placeholders, [], `${what} hard-codes ${placeholders[0] ?? ''}`);
  });
}

test('every string on the shelf comes from the catalogue', () => {
  // A count, not an exact list: the point is that this screen translates, not
  // that it translates precisely twenty-one times today.
  const page = (PAGE.match(/t\('(?:catalogue|audience|difficulty|price)\./gu) ?? []).length;
  assert.ok(page >= 15, `the catalogue page only translates ${page} strings`);

  assert.match(CARD, /t\('audience\.child'\)/u);
  assert.match(CARD, /t\('difficulty\.beginner'\)/u);
  assert.match(PAGER, /t\('catalogue\.pageOf', \{/u);
  assert.match(PAGER, /t\('catalogue\.pages'\)/u);
});

test('the language reaches both pagers and every card', () => {
  // The shelf draws the pager above and below the grid; a locale that reached
  // only the first would leave the bottom of the page in English, which is
  // exactly the kind of half-translated screen nobody photographs and everybody
  // notices.
  const pagers = PAGE.match(/<ShelfPager\b[^>]*locale=\{locale\}/gsu) ?? [];
  assert.equal(pagers.length, 2, `the page passes the locale to ${pagers.length} pagers`);
  assert.match(PAGE, /<CourseShelfCard\b[^>]*locale=\{locale\}/su);
  assert.match(PAGE, /emptyShelfMessage\(\s*\{[^}]*\},\s*locale,\s*\)/su);
});

test('the search words are printed back exactly as they were typed', () => {
  // A learner who searches for a word in Arabic and is answered with a
  // transliteration of it has been told their own word was wrong.
  assert.match(PAGE, /defaultValue=\{q \?\? ''\}/u);
  // The sentence around the word is translated; the word inside it is not.
  assert.match(read('./lesson-search.ts'), /t\('catalogue\.emptyQuery', \{ query \}\)/u);
});

test('a course’s title and description are its author’s, and are never translated', () => {
  // The shelf translates *about* a course. It does not translate the course.
  // A translated title is a second title, and nobody asked for one.
  assert.match(CARD, /<ArabicInline text=\{course\.title\} \/>/u);
  assert.match(CARD, /course\.description\.length > 180/u);
  assert.doesNotMatch(CARD, /t\('card\.title'\)/u);
});

test('the count and the timings are written in the reader’s own digits', () => {
  // The numerals come from `Intl.NumberFormat`, so a Persian reader sees ۱ and a
  // Bengali reader ১, and neither is a translation of a digit string we wrote.
  assert.match(rangeLabel(0, 25, 137, 'fa'), /[۰-۹]/u, 'Persian count is not in Persian digits');
  assert.match(formatMinutes(90, 'bn'), /[০-৯]/u, 'Bengali minutes are not in Bengali digits');

  // Arabic, Urdu and Hindi resolve to Latin digits in CLDR: the Arabic-speaking
  // world is split between Arabic-Indic and Latin numerals, and we do not pick a
  // region for a reader we have not met. This asserts the decision rather than
  // leaving it to whichever ICU build is installed.
  assert.match(rangeLabel(0, 25, 137, 'ar'), /Showing|تعرض|تُعرض/u);
  assert.match(rangeLabel(0, 25, 137, 'ar'), /1–25/u);
  assert.equal(new Intl.NumberFormat('ar').resolvedOptions().numberingSystem, 'latn');

  // Grouping follows the same data, which is why 1 234 is written three ways in
  // three languages without a single format string of ours.
  assert.equal(new Intl.NumberFormat('bn').format(1234), '১,২৩৪');
  assert.equal(new Intl.NumberFormat('fa').format(1234), '۱٬۲۳۴');

  // And the default is still English, so every caller that never passed a code
  // keeps the behaviour it had.
  assert.equal(formatMinutes(90), '1h 30m');
  assert.equal(contentLine(null), '');
});

test('an empty shelf explains itself in the reader’s language, and says why', () => {
  const arabic = emptyShelfMessage({ page: 1, query: 'تجويد', lessonHits: 0 }, 'ar');
  assert.match(arabic, /لا شيء يطابق/u);
  assert.match(arabic, /تجويد/u, 'the query vanished from the message');

  // Three nothings, three sentences: a catalogue with nothing on it yet, a
  // search that matched nothing, and a page past the end of the shelf. Saying
  // "we have no courses" because somebody mistyped a URL is a lie the page tells
  // without meaning to.
  const bare = emptyShelfMessage({ page: 1, query: null, lessonHits: 0 }, 'sw');
  const missed = emptyShelfMessage({ page: 1, query: 'tajwid', lessonHits: 0 }, 'sw');
  const late = emptyShelfMessage({ page: 4, query: null, lessonHits: 0 }, 'sw');
  assert.equal(new Set([bare, missed, late]).size, 3, 'two of the three nothings read the same');

  // A search that missed every course but hit lessons must not open with
  // "nothing matched" above a list of matches.
  const lessonsHit = emptyShelfMessage({ page: 1, query: 'tajwid', lessonHits: 3 }, 'sw');
  assert.notEqual(missed, lessonsHit);
});

test('the pager’s arrows follow the reading direction, not the words', () => {
  // In Arabic "previous" sits to the right of "next", so a left-pointing arrow
  // beside the word for "previous" points at the wrong page.
  assert.match(PAGER, /directionOf\(code\) === 'rtl' \? \['\\u2192', '\\u2190'\]/u);
  assert.match(PAGER, /\{back\} \{t\('catalogue\.previous'\)\}/u);
  assert.match(PAGER, /\{t\('catalogue\.next'\)\} \{forward\}/u);
});

test('both doors speak the shelf’s language', () => {
  // The doors are built from the same cards and the same pager as the shelf, so
  // an English door behind a Yoruba shelf is one heading and one notice away
  // from the exact defect this unit exists to prevent.
  for (const [what, source] of [
    ['the children’s door', YOUNG],
    ['the adults’ door', ADULTS],
  ] as const) {
    assert.match(source, /const \{ code: locale \} = chooseLocale\(\{/u);
    assert.match(source, /const t = translator\(locale\);/u);
    const calls = source.match(/t\('(?:young|adults|doors|catalogue)\./gu) ?? [];
    assert.ok(calls.length >= 5, `${what} only translates ${calls.length} strings`);
    const pagers = source.match(/<ShelfPager\b[^>]*locale=\{locale\}/gsu) ?? [];
    assert.equal(pagers.length, 2, `${what} hands the locale to ${pagers.length} pagers`);
    assert.match(source, /<CourseShelfCard\b[^>]*locale=\{locale\}/su);
    const literal = source.match(/>\s*[A-Z][a-z]+(?: [a-z']+){2,}\s*</gu) ?? [];
    assert.deepEqual(literal, [], `${what} still says ${literal[0] ?? ''} in English`);
  }
});

test('the age on the children’s door is still named, not dropped', () => {
  // "Nothing is listed for those ages" without saying which is the kind of
  // translation that reads finished and answers nothing.
  for (const locale of LOCALES) {
    const rendered = translator(locale.code)('young.emptyBand', { band: '11-13' });
    assert.match(rendered, /11-13/u, `${locale.code} lost the age band`);
  }
});

test('the notice on the children’s door is written in every language', () => {
  // Renamed on 2026-10-30: it never tested the login promise (the notice says a
  // child does not sign up on their own, which is still true — a guardian makes
  // the login). What it tests is that the sentence a parent came to read is not
  // simply the English one with a coverage count in front of it.
  for (const locale of LOCALES.filter((l) => l.code !== 'en')) {
    const notice = translator(locale.code)('young.notice');
    assert.notEqual(notice, translator('en')('young.notice'), `${locale.code} is still English`);
    assert.notEqual(notice.trim(), '', `${locale.code} has no sentence at all`);
    assert.notEqual(
      translator(locale.code)('young.title'),
      translator('en')('young.title'),
      `${locale.code}.young.title is still English`,
    );
  }
});
