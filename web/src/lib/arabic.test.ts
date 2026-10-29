import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  describeText,
  directionOf,
  hasArabic,
  isolateArabic,
  languageOf,
  majorityDirection,
  runs,
} from './arabic.ts';

const FATIHAH = 'الفاتحة';
const BISMILLAH = 'بِسْمِ اللَّهِ';

test('plain English has no Arabic in it', () => {
  assert.equal(hasArabic('Tajweed for beginners'), false);
  assert.equal(hasArabic(''), false);
  assert.equal(hasArabic(null), false);
  assert.equal(languageOf('Tajweed for beginners'), 'en');
});

test('Arabic is found wherever it sits in a sentence', () => {
  assert.equal(hasArabic(FATIHAH), true);
  assert.equal(hasArabic(`Surah ${FATIHAH} has seven verses`), true);
  // The ligature for the Prophet's name is Arabic in the Presentation Forms
  // block, and leaving that block out would miss the commonest case of all.
  assert.equal(hasArabic('The Prophet \uFDFA said'), true);
  // Hebrew is right-to-left too, and a mixed page has to lay both out.
  assert.equal(directionOf('שלום'), 'rtl');
});

test('direction comes from the first strong character, not the first character', () => {
  assert.equal(directionOf('12 rules of tajweed'), 'ltr', 'a leading number is weak');
  assert.equal(directionOf('الفاتحة 7 آيات'), 'rtl');
  assert.equal(directionOf('  ...الفاتحة'), 'rtl', 'punctuation is skipped');
  assert.equal(directionOf('...hello'), 'ltr');
  assert.equal(directionOf(''), 'ltr');
  assert.equal(directionOf(null), 'ltr');
});

test('a mixed string splits into runs and loses nothing', () => {
  const text = `Surah ${FATIHAH} has seven verses`;
  const parts = runs(text);
  assert.equal(parts.map((run) => run.arabic).join(','), 'false,true,false');
  assert.equal(parts.map((run) => run.text).join(''), text, 'the runs rejoin to the original');
});

test('a space between two Arabic words stays with the Arabic', () => {
  const parts = runs(`${BISMILLAH} ${FATIHAH}`);
  assert.equal(parts.length, 1, 'one Arabic run, not three');
  assert.equal(parts[0]!.arabic, true);
  assert.equal(parts[0]!.text, `${BISMILLAH} ${FATIHAH}`);
});

test('a leading space belongs to the text that follows it', () => {
  // Otherwise an English sentence with one Arabic word in it produces a
  // one-space "English" element before the Arabic, which is a real layout bug:
  // the space inherits the wrong font.
  const parts = runs(` ${FATIHAH}`);
  assert.equal(parts.length, 1);
  assert.equal(parts[0]!.arabic, true);
  assert.equal(parts[0]!.text, ` ${FATIHAH}`);
});

test('punctuation at the end of an Arabic run stays inside it', () => {
  const parts = runs(`Read ${FATIHAH}. Then continue.`);
  assert.equal(parts[0]!.text, 'Read ');
  assert.equal(parts[1]!.arabic, true);
  assert.equal(parts[1]!.text, `${FATIHAH}. `);
  assert.equal(parts[2]!.text, 'Then continue.');
});

test('isolation wraps the Arabic and nothing else', () => {
  const isolated = isolateArabic(`Surah ${FATIHAH}`);
  assert.equal(isolated, `Surah \u2068${FATIHAH}\u2069`);
  assert.equal(isolateArabic('no arabic here'), 'no arabic here');
  assert.equal(isolateArabic(null), '');
  // Idempotent enough to be safe on a string that is already isolated, because
  // a stored description may have been through this once already.
  assert.match(isolateArabic(`\u2068${FATIHAH}\u2069`), /\u2068.*\u2069/);
});

test('a block is laid out by what it mostly is', () => {
  assert.equal(majorityDirection(`Surah ${FATIHAH} is recited`), 'ltr');
  assert.equal(majorityDirection('This is a long English sentence about الفاتحة'), 'ltr');
  assert.equal(majorityDirection(`${FATIHAH} ${FATIHAH} ${FATIHAH} and one English word`), 'rtl');
  assert.equal(majorityDirection(FATIHAH), 'rtl');
  assert.equal(majorityDirection(''), 'ltr');
});

test('a language is only claimed when the whole string is in one', () => {
  assert.equal(languageOf(FATIHAH), 'ar');
  assert.equal(languageOf('Tajweed'), 'en');
  // Mixed has no single language: the runs are marked individually instead of
  // the whole string being labelled wrongly.
  assert.equal(languageOf(`Surah ${FATIHAH}`), null);
  assert.equal(languageOf('   '), null);
});

test('the one call a page makes returns everything it needs', () => {
  // "Surah" is five Latin letters and الفاتحة is seven Arabic ones, so the block
  // leans Arabic — which is the honest answer to "which way does this read".
  const described = describeText(`Surah ${FATIHAH}`);
  assert.equal(described.hasArabic, true);
  assert.equal(described.blockDirection, 'rtl');

  const latinLeads = describeText('Surah Al-Fatihah (الفاتحة)');
  assert.equal(latinLeads.blockDirection, 'ltr', 'a Latin-majority line stays left to right');
  assert.equal(described.language, null);
  assert.equal(described.runs.length, 2);

  const plain = describeText('Tajweed');
  assert.equal(plain.hasArabic, false);
  assert.equal(plain.runs.length, 1);
  assert.equal(plain.runs[0]!.arabic, false);
});
