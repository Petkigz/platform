import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LOCALES } from './i18n/index.ts';
import { ASK } from './i18n/messages/ask.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { TPUB } from './i18n/messages/teacher-page.ts';

// Asking about a lesson and a teacher's public page, put into the reader's
// language on 2026-11-27.

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');

const ASK_PAGE = read('../app/learn/ask/page.tsx');
const ASK_FORM = read('../app/learn/ask/ask-form.tsx');
const ASK_ROUTE = read('../app/api/learn/ask/route.ts');
const TEACHER = read('../app/teachers/[slug]/page.tsx');

for (const [prefix, part, count] of [['ask.', ASK, 29], ['tpub.', TPUB, 7]] as const) {
  test(`${prefix} is written in every language the dashboard is`, () => {
    const keys = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith(prefix));
    assert.equal(keys.length, count);
    assert.deepEqual(Object.keys(part).sort(), [...LANGUAGES].sort());
    for (const code of LANGUAGES) {
      const own = part[code];
      assert.ok(own, code);
      assert.deepEqual(Object.keys(own).sort(), [...keys].sort(), code);
      for (const key of keys) {
        const value: string = own[key]!;
        assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
        assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
        assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
        assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
        assert.equal(value.includes('AyahSpring'), en[key].includes('AyahSpring'), `${code} ${key} and the platform's name`);
      }
      if (code.startsWith('zh')) assert.ok(!Object.values(own).join('').includes('您'), code);
    }
  });
}

test('the words a page shares with another are the same words', () => {
  // Three links on the ask page are said elsewhere already; a reader should
  // not meet two names for one place.
  for (const code of LANGUAGES) {
    const all = CATALOGUES[code]!;
    assert.equal(all['ask.crumbLearn'], all['nav.learn'], code);
    assert.equal(all['ask.help'], all['support.heading'], code);
    assert.equal(all['ask.back'], all['downloads.back'], code);
    // The four statuses and the five meanings are told apart.
    assert.equal(new Set([all['ask.found'], all['ask.forTeacher'], all['ask.nothing'], all['ask.closed']]).size, 4, code);
    assert.equal(new Set([all['ask.foundSays'], all['ask.teacherCase'], all['ask.teacherNoCase'], all['ask.nothingSays']]).size, 4, code);
    assert.notEqual(all['ask.notSent'], all['ask.unsure'], `${code}: "nothing was recorded" and "it may have been" are one sentence`);
  }
  assert.equal(en['ask.crumbLearn'], en['nav.learn']);
  assert.equal(en['ask.help'], en['support.heading']);
});

test('the ask page and its box say nothing that is not in the catalogue', () => {
  for (const [name, source] of [['page', ASK_PAGE], ['box', ASK_FORM]] as const) {
    const bare = strip(source);
    assert.doesNotMatch(bare, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, `a sentence is written in the ${name}`);
    assert.doesNotMatch(bare, /(?:placeholder|aria-label|title)="[A-Z]/u, name);
  }
  const keys = Object.keys(en).filter((key) => key.startsWith('ask.'));
  for (const key of keys) assert.ok(ASK_PAGE.includes(`'${key}'`), `${key} is not used`);
  assert.match(ASK_PAGE, /languageShownFor\(locale, 'ask'\)/u);
  assert.match(ASK_PAGE, /shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);
  // The box is handed its words and reads no catalogue.
  assert.match(ASK_FORM, /^'use client';/u);
  assert.doesNotMatch(ASK_FORM, /@\/lib\/i18n|useT\(/u);
  // The database's English is not printed: not its sentence, not its line
  // about the rules, not the route's.
  const bare = strip(ASK_FORM);
  assert.doesNotMatch(bare, /answer\.message|boundary\.rules|json\??\.error|describeAiSupportStatus/u);
  assert.match(bare, /words\.says\[askSaysKey\(answer\)\]/u);
  assert.match(bare, /words\.status\[answer\.status\]/u);
  // A reply that is no answer is not called a refusal, and what was typed is kept.
  assert.match(bare, /catch \{\s*setError\(words\.refusals\.unsure\);/u);
  assert.match(bare, /if \(!read\) \{ setError\(words\.refusals\.unsure\); return; \}/u);
  assert.ok(bare.indexOf("setQuestion('')") > bare.indexOf('setAnswer(read)'), 'the box is emptied before an answer is in hand');
  // What an author wrote sets its own direction.
  assert.match(bare, /<bdi>\{lesson\.lessonTitle\}<\/bdi>/u);
  assert.match(bare, /<span dir="auto" className="ask-line">/u);
  assert.match(bare, /<bdi dir="ltr">\{answer\.supportCaseNumber\}<\/bdi>/u);
});

test('a switch that could not be read is not said to be off', () => {
  assert.match(ASK_PAGE, /isFlagEnabled\(supabase, 'learning\.ai_support'\)\.catch\(\(\) => null\)/u);
  assert.match(ASK_PAGE, /\{open === false \? \(/u);
  assert.match(ASK_ROUTE, /error: result\.message, code: result\.code \}, \{ status: askStatusOf\(result\.code\) \}/u);
  assert.match(ASK_ROUTE, /code: 'signed_out' \}, \{ status: 401 \}/u);
});

test('a teacher’s page says its own seven things in the reader’s language', () => {
  const bare = strip(TEACHER);
  assert.doesNotMatch(bare, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, 'a sentence is written in the page');
  assert.doesNotMatch(bare, /(?:placeholder|aria-label|title)="[A-Z]/u);
  for (const key of Object.keys(en).filter((k) => k.startsWith('tpub.'))) assert.ok(TEACHER.includes(`'${key}'`), `${key} is not used`);
  assert.match(TEACHER, /languageShownFor\(locale, 'tpub'\)/u);
  assert.match(TEACHER, /<div className="container section" \{\.\.\.frame\}>/u);
  // The name sits where the sentence puts it, kept apart from the words round it.
  assert.match(bare, /\{byBefore\}<bdi><ArabicInline text=\{profile\.displayName\} \/><\/bdi>\{byAfter\}/u);
  for (const code of LANGUAGES) assert.equal(TPUB[code]!['tpub.coursesBy']!.split('{name}').length, 2, code);
  // The names of other people's sites are their names.
  for (const brand of ['Instagram', 'YouTube', 'TikTok', 'Facebook']) assert.ok(bare.includes(`['${brand}', profile.`), brand);
  // Courses that could not be read are said to be unread, not thrown.
  assert.doesNotMatch(bare, /if \(error\) throw/u);
  assert.match(bare, /\{unread \? \(\s*<div className="notice error" role="alert" data-teacher-courses="unread">\{t\('tpub\.unread'\)\}<\/div>/u);
  assert.match(bare, /<h3 dir="auto">/u);
});
