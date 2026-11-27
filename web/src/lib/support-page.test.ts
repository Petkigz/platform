import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LOCALES } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { SUPPORT } from './i18n/messages/support.ts';
import { en } from './i18n/messages/en.ts';
import {
  CATEGORY_KEY,
  CATEGORY_LABEL,
  mapSupportError,
  STATUS_KEY,
  STATUS_LABEL,
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  supportRefusalOf,
  validateOpenCaseInput,
  validateReason,
  validateReplyBody,
} from './support.ts';

// The two pages a person asks for help on, put into the reader's language on
// 2026-11-27. What staff alone see under a request stays in English, in its
// own two files, and is checked here only for being kept apart.

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('support.'));
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');

const PAGE = read('../app/support/page.tsx');
const FORM = read('../app/support/new-case-form.tsx');
const SEARCH = read('../app/support/help-search.tsx');
const CASE = read('../app/support/[caseNumber]/page.tsx');
const ACTIONS = read('../app/support/[caseNumber]/case-actions.tsx');
const STAFF_PANEL = read('../app/support/[caseNumber]/staff-panel.tsx');
const STAFF_ACTIONS = read('../app/support/[caseNumber]/staff-case-actions.tsx');

test('asking for help is written in every language the dashboard is', () => {
  assert.equal(KEYS.length, 72);
  assert.deepEqual(Object.keys(SUPPORT).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const part = SUPPORT[code];
    assert.ok(part, code);
    assert.deepEqual(Object.keys(part).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      const value: string = part[key]!;
      assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
      assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
      // The platform's name is not translated or respelt.
      assert.equal(value.includes('AyahSpring'), en[key].includes('AyahSpring'), `${code} ${key} and the platform's name`);
    }
    if (code.startsWith('zh')) assert.ok(!Object.values(part).join('').includes('您'), code);
    // A topic and a state are told apart in every language.
    assert.equal(new Set(SUPPORT_CATEGORIES.map((c) => part[CATEGORY_KEY[c.value]])).size, 7, `${code}: two topics say the same`);
    assert.equal(new Set(SUPPORT_STATUSES.map((s) => part[STATUS_KEY[s]])).size, 5, `${code}: two states say the same`);
    assert.notEqual(part['support.unsureSent'], part['support.notSent'], `${code}: "nobody can say" and "refused" are one sentence`);
    assert.notEqual(part['support.unsureSaved'], part['support.refused'], `${code}: "nobody can say" and "refused" are one sentence`);
  }
});

test('the pages and their forms say nothing that is not in the catalogue', () => {
  for (const [name, source] of [['page', PAGE], ['form', FORM], ['search', SEARCH], ['case', CASE], ['actions', ACTIONS]] as const) {
    const bare = strip(source);
    assert.doesNotMatch(bare, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, `a sentence is written in the ${name}`);
    assert.doesNotMatch(bare, /(?:placeholder|aria-label|title)="[A-Z]/u, name);
    assert.doesNotMatch(bare, /toLocale(?:Date)?String\(/u, `${name}: a day written in the server's language, not the page's`);
    assert.doesNotMatch(bare, /CATEGORY_LABEL|STATUS_LABEL|PRIORITY_LABEL/u, `${name} prints the staff queue's English`);
  }
  // Every sentence is used by one of the two pages.
  for (const key of KEYS) {
    const used = PAGE.includes(`'${key}'`) || CASE.includes(`'${key}'`) || Object.values(CATEGORY_KEY).includes(key) || Object.values(STATUS_KEY).includes(key);
    assert.ok(used, `${key} is not used`);
  }
  // The three browser components are handed words and import no catalogue.
  for (const source of [FORM, SEARCH, ACTIONS]) {
    assert.match(source, /^'use client';/u);
    assert.doesNotMatch(source, /@\/lib\/i18n|useT\(/u);
    assert.doesNotMatch(source, /json\.error|\.error \?\?/u, 'a form prints the route’s English sentence');
  }
  for (const source of [PAGE, CASE]) {
    assert.match(source, /languageShownFor\(locale, 'support'\)/u);
    assert.match(source, /shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);
  }
  // What somebody wrote sets its own direction.
  assert.match(PAGE, /<strong dir="auto">\{c\.subject\}<\/strong>/u);
  assert.match(CASE, /<h1 dir="auto">\{supportCaseRow\.subject\}<\/h1>/u);
  assert.match(CASE, /dir="auto">\{m\.body\}/u);
  assert.match(CASE, /dir="auto">\{supportCaseRow\.resolutionNote\}/u);
  assert.match(CASE, /dir="auto">\{supportCaseRow\.closeReason\}/u);
  assert.match(SEARCH, /dir="auto">\{article\.body\}/u);
  // A moment on a server names its zone.
  assert.match(CASE, /formatDateTime\(shown\.code, iso, 'UTC'\)/u);
});

test('the catalogue and the staff queue name the same topics and states', () => {
  for (const { value, label } of SUPPORT_CATEGORIES) {
    assert.equal(en[CATEGORY_KEY[value]], label, value);
    assert.equal(en[CATEGORY_KEY[value]], CATEGORY_LABEL[value], value);
  }
  for (const status of SUPPORT_STATUSES) assert.equal(en[STATUS_KEY[status]], STATUS_LABEL[status], status);
});

test('what staff alone see is kept apart, in English, and marked as English', () => {
  assert.match(CASE, /\{isStaff \? \(\s*<StaffPanel /u);
  assert.match(STAFF_PANEL, /<div className="support-staff" lang="en" dir="ltr" data-support-staff>/u);
  assert.match(STAFF_PANEL, /<StaffCaseActions/u);
  assert.match(STAFF_PANEL, /<CaseHistory caseId=/u);
  // The person who asked is never handed the staff door, and staff never theirs.
  assert.doesNotMatch(strip(ACTIONS), /\/api\/admin\/support|isInternal|priority|action: 'resolve'|action: 'assign'/u);
  assert.match(ACTIONS, /fetch\('\/api\/support'/u);
  assert.match(STAFF_ACTIONS, /const endpoint = '\/api\/admin\/support';/u);
  assert.doesNotMatch(STAFF_ACTIONS, /isStaff/u);
  // No sentence of the staff half is in the catalogue to be translated by accident.
  for (const sentence of ['Answer this request', 'Triage', 'Mark resolved', 'Pause scheduled case cleanup']) {
    assert.ok(STAFF_PANEL.includes(sentence) || STAFF_ACTIONS.includes(sentence), sentence);
    assert.ok(!Object.values(en).includes(sentence as never), sentence);
  }
});

test('a refusal travels by name, and only a four hundred is a refusal', () => {
  assert.equal(supportRefusalOf(409, 'flag_disabled'), 'notTaking');
  assert.equal(supportRefusalOf(409, 'too_many'), 'tooMany');
  assert.equal(supportRefusalOf(400, 'subject_short'), 'needSubject');
  assert.equal(supportRefusalOf(400, 'empty'), 'empty');
  assert.equal(supportRefusalOf(400, 'too_long'), 'tooLong');
  assert.equal(supportRefusalOf(404, 'not_found'), 'gone');
  assert.equal(supportRefusalOf(404, undefined), 'gone');
  assert.equal(supportRefusalOf(401, undefined), 'signedOut');
  assert.equal(supportRefusalOf(403, undefined), 'refused');
  assert.equal(supportRefusalOf(409, 'something_new'), 'refused');
  assert.equal(supportRefusalOf(400, 'category'), 'refused');
  // Not a refusal: nobody can say whether the write happened.
  assert.equal(supportRefusalOf(500, 'flag_disabled'), 'unsure');
  assert.equal(supportRefusalOf(502, undefined), 'unsure');
  assert.equal(supportRefusalOf(0, undefined), 'unsure');
  assert.equal(supportRefusalOf(200, undefined), 'unsure');
});

test('each thing the route refuses carries its name', () => {
  const code = (result: { ok: boolean; code?: string }) => (result.ok ? null : result.code);
  assert.equal(code(validateOpenCaseInput({ category: 'telepathy', subject: 'A subject', body: 'A body' })), 'category');
  assert.equal(code(validateOpenCaseInput({ category: 'other', subject: ' x', body: 'A body' })), 'subject_short');
  assert.equal(code(validateOpenCaseInput({ category: 'other', subject: 'x'.repeat(201), body: 'A body' })), 'too_long');
  assert.equal(code(validateOpenCaseInput({ category: 'other', subject: 'Fine', body: ' ' })), 'empty');
  assert.equal(code(validateOpenCaseInput({ category: 'other', subject: 'Fine', body: 'x'.repeat(4001) })), 'too_long');
  assert.equal(code(validateReplyBody('  ')), 'empty');
  assert.equal(code(validateReason('', 'Closing a case')), 'empty');
  // The database's sentences, word for word as the migration raises them.
  const raised = read('../../../supabase/migrations/20261127000100_support_cases.sql');
  for (const [sentence, state, status, name] of [
    ['support is not open yet (platform.support is off)', '23514', 409, 'flag_disabled'],
    ['support is not open right now (platform.support is off)', '23514', 409, 'flag_disabled'],
    ['you already have five open requests; wait for a reply or close one first', '23514', 409, 'too_many'],
    ['support case not found', 'P0002', 404, 'not_found'],
    ['this case is closed; open a new one if you still need help', '23514', 409, undefined],
  ] as const) {
    assert.ok(raised.includes(sentence), sentence);
    const mapped = mapSupportError({ message: sentence, code: state });
    assert.equal(mapped.ok, false);
    if (!mapped.ok) { assert.equal(mapped.status, status, sentence); assert.equal(mapped.code, name, sentence); }
  }
  // `insufficient_privilege` arrives as five characters, not as its name.
  const closedAccount = mapSupportError({ message: 'support:account_closed_or_missing', code: '42501' });
  if (!closedAccount.ok) assert.equal(closedAccount.status, 403);
  // An answer with no state is not a refusal.
  for (const error of [{ message: '<html>bad gateway</html>' }, { message: 'fetch failed', code: '' }, { message: 'connection failure', code: '08006' }]) {
    const mapped = mapSupportError(error);
    if (!mapped.ok) { assert.equal(mapped.status, 502); assert.equal(mapped.code, undefined); assert.doesNotMatch(mapped.error, /html|fetch|connection/u); }
  }
});

test('a switch that could not be read is not said to be off', () => {
  assert.match(PAGE, /isFlagEnabled\(supabase, 'platform\.support'\)\.catch\(\(\) => null\)/u);
  assert.match(PAGE, /\{accepting === false \? \(/u);
  const route = read('../app/api/support/route.ts');
  assert.match(route, /if \(accepting === false\) \{/u);
  assert.match(route, /error: result\.error, code: result\.code/u);
});
