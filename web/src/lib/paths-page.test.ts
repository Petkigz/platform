import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LOCALES } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { PATHS } from './i18n/messages/paths.ts';
import { en } from './i18n/messages/en.ts';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('paths.'));
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');

test('the learning-path pages are written in every language the dashboard is', () => {
  assert.equal(KEYS.length, 25);
  assert.deepEqual(Object.keys(PATHS).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const part = PATHS[code];
    assert.ok(part, code);
    assert.deepEqual(Object.keys(part).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      const value: string = part[key]!;
      assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
      assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
      // A percentage is written by the language's own rule, never typed.
      assert.ok(!/[%٪]/u.test(value), `${code} ${key} types a percent sign`);
    }
    if (code.startsWith('zh')) assert.ok(!Object.values(part).join('').includes('您'), code);
  }
});

test('neither page says anything that is not in the catalogue', () => {
  const list = read('../app/paths/page.tsx');
  const one = read('../app/paths/[slug]/page.tsx');
  const reader = read('../app/paths/reader.ts');
  const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
  for (const source of [strip(list), strip(one)]) {
    assert.doesNotMatch(source, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, 'a sentence is written in the page');
    assert.doesNotMatch(source, /(?:placeholder|aria-label|title)="[A-Z]/u);
    assert.doesNotMatch(source, /\? '[A-Z][a-z]+/u, 'a word is chosen in the page');
    assert.match(source, /shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);
  }
  const everything = [list, one, reader].join('\n');
  for (const key of KEYS) assert.ok(everything.includes(`'${key}'`), `${key} is not used`);
  assert.match(reader, /languageShownFor\(locale, 'paths'\)/u);
  // Numbers in the reader's digits; a percentage as the language writes it.
  assert.match(one, /formatPercent\(shown\.code, pathProgress\.percentComplete\)/u);
  assert.doesNotMatch(strip(one), /\}% complete|% complete/u);
});

test('a read that fails is not said as an empty list or as "not started"', () => {
  const list = read('../app/paths/page.tsx');
  const one = read('../app/paths/[slug]/page.tsx');
  assert.match(list, /if \(error\) throw new Error\(error\.message\);/u);
  assert.match(one, /if \(error\) throw new Error\(error\.message\);/u);
  assert.match(one, /if \(enrolmentError\) throw new Error\(enrolmentError\.message\);/u);
  // The switch is read without a catch: unreadable is the error page, not "off".
  for (const source of [list, one]) {
    assert.match(source, /await isFlagEnabled\(supabase, 'learning\.paths'\);/u);
    assert.doesNotMatch(source, /isFlagEnabled\([^)]*\)\.catch/u);
  }
});
