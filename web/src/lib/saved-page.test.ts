import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LOCALES } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { SAVED } from './i18n/messages/saved.ts';
import { en } from './i18n/messages/en.ts';
import { savedRefusalOf, savedStateOf } from './wishlist-shared.ts';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('saved.'));
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');

test('the saved list is written in every language the dashboard is', () => {
  assert.equal(KEYS.length, 18);
  assert.deepEqual(Object.keys(SAVED).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const part = SAVED[code];
    assert.ok(part, code);
    assert.deepEqual(Object.keys(part).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      const value: string = part[key]!;
      assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
      assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
    }
    if (code.startsWith('zh')) assert.ok(!Object.values(part).join('').includes('您'), code);
  }
});

test('the page and its row say nothing that is not in the catalogue', () => {
  const page = read('../app/saved/page.tsx');
  const row = read('../app/saved/saved-item.tsx');
  const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
  for (const source of [strip(page), strip(row)]) {
    assert.doesNotMatch(source, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, 'a sentence is written in the page');
    assert.doesNotMatch(source, /(?:placeholder|aria-label|title)="[A-Z]/u);
  }
  for (const key of KEYS) assert.ok(page.includes(`'${key}'`), `${key} is not used`);
  // The row is a browser component: it is handed words and imports no catalogue.
  assert.doesNotMatch(row, /@\/lib\/i18n|useT\(/u);
  assert.doesNotMatch(row, /json\.error|\.error \?\?/u, 'the row prints the route’s English sentence');
  assert.doesNotMatch(row, /toLocaleDateString/u, 'the day is written by the browser’s language, not the page’s');
  assert.match(page, /languageShownFor\(locale, 'saved'\)/u);
  assert.match(page, /shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);
});

test('the badge is decided without a word of English', () => {
  assert.equal(savedStateOf({ enrolledWho: 'self', availability: 'available' }), 'enrolledYou');
  assert.equal(savedStateOf({ enrolledWho: 'named', availability: 'available' }), 'enrolledFor');
  assert.equal(savedStateOf({ enrolledWho: 'unnamed', availability: 'retired' }), 'enrolledFamily');
  assert.equal(savedStateOf({ enrolledWho: null, availability: 'retired' }), 'retired');
  assert.equal(savedStateOf({ enrolledWho: null, availability: 'unpublished' }), 'unpublished');
  assert.equal(savedStateOf({ enrolledWho: null, availability: 'available' }), 'available');
});

test('only a four hundred that names a known reason is a refusal', () => {
  assert.equal(savedRefusalOf(409, 'limit'), 'limit');
  assert.equal(savedRefusalOf(409, 'gone'), 'gone');
  assert.equal(savedRefusalOf(409, 'flag_disabled'), 'notePaused');
  assert.equal(savedRefusalOf(409, 'something_new'), 'unsure');
  assert.equal(savedRefusalOf(401, undefined), 'unsure');
  assert.equal(savedRefusalOf(500, 'limit'), 'unsure');
  assert.equal(savedRefusalOf(0, undefined), 'unsure');
});

test('with saving switched off the page promises only what the database allows', () => {
  // `guard_course_wishlist()` refuses an insert and an update while the switch
  // is off and lets a delete through. The page said "edit or remove".
  const guard = read('../../../supabase/migrations/20261129000100_course_wishlist.sql');
  assert.match(guard, /if tg_op <> 'DELETE' then/u);
  assert.doesNotMatch(en['saved.paused'], /edit/iu);
  assert.match(en['saved.paused'], /you can still remove it/u);
  const page = read('../app/saved/page.tsx');
  // A switch that could not be read is not said to be off.
  assert.match(page, /isFlagEnabled\(supabase, 'learning\.wishlist'\)\.catch\(\(\) => null\)/u);
  assert.match(page, /\{open === false && <div className="notice warn">\{t\('saved\.paused'\)\}<\/div>\}/u);
  assert.match(page, /canEditNote=\{open !== false\}/u);
  assert.match(read('../app/saved/saved-item.tsx'), /\{canEditNote && \(/u);
});
