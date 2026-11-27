import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LOCALES, translator } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { ABOUT } from './i18n/messages/about.ts';
import { en } from './i18n/messages/en.ts';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('about.'));
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');

// The page a parent reads before trusting a site with a child was English for
// every reader, on a site that offers itself in forty-seven languages.
test('the about page is written in every language the dashboard is', () => {
  assert.equal(KEYS.length, 35);
  assert.equal(LANGUAGES.length, 27);
  assert.deepEqual(Object.keys(ABOUT).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const part = ABOUT[code];
    assert.ok(part, code);
    assert.deepEqual(Object.keys(part).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      const value: string = part[key]!;
      assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
      assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
    }
    // The name is the name: in Latin letters wherever a sentence says it.
    for (const key of ['about.title'] as const) assert.ok(part[key]!.includes('AyahSpring'), `${code} ${key}`);
    if (code.startsWith('zh')) assert.ok(!Object.values(part).join('').includes('您'), code);
  }
});

test('the page says nothing that is not in the catalogue, and counts the languages itself', () => {
  const page = read('../app/about/page.tsx');
  // No sentence of its own: every line of text is a key.
  const text = page.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\{\/\*[\s\S]*?\*\/\}/gu, '');
  assert.doesNotMatch(text, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, 'a sentence is written in the page');
  for (const key of KEYS) assert.ok(page.includes(`'${key}'`), `${key} is not used`);
  // The numbers are counted from the register, in the reader's digits; a
  // sentence that spelled them went stale each time a language was added.
  assert.match(page, /translatedLocales\(\)\.length/u);
  assert.match(page, /withheldLocales\(\)/u);
  assert.match(page, /formatNumber\(shown\.code, /u);
  assert.doesNotMatch(read('./i18n/messages/en.ts'), /forty-seven languages/u);
  // In the language the reader is shown, and marked when that is not the page's.
  assert.match(page, /languageShownFor\(locale, 'about'\)/u);
  assert.match(page, /shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);
});

test('what it says about a child’s sign-in is what the platform does', () => {
  const t = translator('en');
  // It used to say a child never has a login of their own. Since 2026-11-24 a
  // verified guardian may give one to a child of twelve or older.
  assert.doesNotMatch(Object.values(en).join('\n'), /The child never gets an email address/u);
  assert.match(t('about.childNotice'), /A child under twelve never has/u);
  assert.match(t('about.childLogin'), /twelve or older/u);
  assert.match(t('about.childLogin'), /^Where the platform allows it/u);
  // A plan can cover a household; a course purchase cannot.
  assert.match(t('about.cost'), /A course is bought for one named learner/u);
});
