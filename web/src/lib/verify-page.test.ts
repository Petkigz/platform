import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { numberProblem } from './certificate-number.ts';
import { languageShownFor, translator } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { VERIFY } from './i18n/messages/verify.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const landing = read('../app/verify/page.tsx');
const answer = read('../app/verify/[number]/page.tsx');
const sample = read('../app/verify/sample-number.tsx');

const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('verify.'));
const LANGUAGES = [
  'ar', 'ur', 'fa', 'fa-af', 'tr', 'id', 'ms', 'bn', 'hi', 'fr', 'es', 'pt', 'sw', 'af',
  'zh-hans', 'zh-hant', 'vi', 'th', 'fil', 'uz', 'kk', 'az', 'tg', 'ky', 'tk', 'ta', 'ne',
] as const;

test('all twenty-seven languages have every sentence, with the number where English has it', () => {
  assert.equal(KEYS.length, 21);
  const blanks = (text: string) => (text.match(/\{[a-zA-Z]+\}/gu) ?? []).sort().join(' ');
  const withNumber = KEYS.filter((key) => en[key].includes('{number}'));
  assert.deepEqual(withNumber, ['verify.whereBody', 'verify.notANumber', 'verify.noneBody']);
  for (const code of LANGUAGES) {
    const part = VERIFY[code];
    assert.ok(part, code);
    assert.deepEqual(Object.keys(part).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      assert.equal(blanks(part[key]!), blanks(en[key]), `${code} ${key}`);
      assert.equal(CATALOGUES[code]?.[key], part[key], `${code} ${key} is served`);
      // The sample number is the page's to set, never a translator's to retype.
      assert.ok(!/AS-\d{4}/u.test(part[key]!), `${code} ${key} carries a number of its own`);
    }
    // A sentence about the brand names it in Latin letters.
    assert.ok(part['verify.validBody']!.includes('AyahSpring'), code);
    // The letters of the number are the letters of the number.
    assert.ok(part['verify.whereBody']!.includes('AS'), code);
    if (code.startsWith('zh')) assert.ok(!Object.values(part).join('').includes('您'), code);
  }
  assert.equal(Object.keys(VERIFY).length, 27);
});

test('valid and not valid are never the same sentence, in any language', () => {
  for (const code of ['en', ...LANGUAGES] as const) {
    const t = translator(code);
    const said = [t('verify.valid'), t('verify.invalid'), t('verify.none')];
    assert.equal(new Set(said).size, 3, code);
    // "Not valid" is not "valid" with something a reader could miss dropped from it.
    assert.ok(!said[0]!.includes(said[1]!), code);
  }
});

test('the pages draw with the catalogue and have no sentence of their own', () => {
  for (const [name, page] of [['landing', landing], ['answer', answer]] as const) {
    assert.ok(page.includes("languageShownFor(locale, 'verify')"), name);
    assert.ok(page.includes('generateMetadata'), name);
    assert.ok(!/export const metadata\b/u.test(page), `${name} still has a title in one language`);
    const body = page.slice(page.indexOf('export default'));
    const drawn = body.slice(body.indexOf('return ('));
    const sentence = />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u.exec(drawn) ?? /(?:placeholder|aria-label)="[A-Z][a-z]+ /u.exec(drawn);
    assert.equal(sentence, null, `${name}: ${sentence?.[0]}`);
  }
  // The page that prints a name is still kept out of every index.
  assert.ok(answer.includes('robots: { index: false, follow: false }'));
  // Neither page asks who is reading.
  for (const page of [landing, answer]) assert.ok(!page.includes('auth.getUser'), 'a session is asked for');
});

test('what a person wrote and the number are set apart from the page’s words', () => {
  for (const written of ['result.revokedReason', 'result.learnerName', 'result.courseTitle', 'canonical']) {
    assert.ok(answer.includes(`<bdi>{${written}}</bdi>`), written);
  }
  // The date is the recorded day in the reader's calendar, not the server's clock and locale.
  assert.ok(answer.includes('formatDay(shown.code, result.issuedOn)'));
  assert.ok(!answer.includes('toLocaleDateString'));
  // The sample number and the box it is typed in run left to right in every language.
  assert.ok(sample.includes('<code dir="ltr">{SAMPLE_NUMBER}</code>'));
  assert.ok(sample.includes("SAMPLE_NUMBER = 'AS-2026-00000001'"));
  assert.ok(/name="number"\s+dir="ltr"/u.test(landing));
  for (const key of ['verify.whereBody', 'verify.notANumber']) {
    assert.ok(landing.includes(`<WithSampleNumber text={t('${key}')} />`), key);
  }
  assert.ok(answer.includes("<WithSampleNumber text={t('verify.noneBody')} />"));
});

test('Arabic is read in Arabic, and English says what the library says', () => {
  assert.equal(languageShownFor('ar', 'verify').code, 'ar');
  assert.equal(translator('en')('verify.notANumber').replace('{number}', 'AS-2026-00000001'), numberProblem('12345'));
});
