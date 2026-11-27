import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LOCALES } from './i18n/index.ts';
import { formatBytes } from './i18n/format.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { DOWNLOADS } from './i18n/messages/downloads.ts';
import { en } from './i18n/messages/en.ts';
import { daysRemaining, describeBytes, openRefusalOf } from './offline.ts';
import { decideKey } from './offline-key.ts';
import { removeSavedWithConfirmation } from './offline-removal.ts';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('downloads.'));
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');

test('the saved-lessons page is written in every language the dashboard is', () => {
  assert.equal(KEYS.length, 45);
  assert.deepEqual(Object.keys(DOWNLOADS).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const part = DOWNLOADS[code];
    assert.ok(part, code);
    assert.deepEqual(Object.keys(part).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      const value: string = part[key]!;
      assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
      assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
      // The plan's name is the plan's name; a unit of size is never typed.
      assert.equal(value.includes('Plus'), en[key].includes('Plus'), `${code} ${key} and the plan's name`);
      assert.ok(!/\b[KMG]B\b/u.test(value), `${code} ${key} types a unit of size`);
    }
    if (code.startsWith('zh')) assert.ok(!Object.values(part).join('').includes('您'), code);
  }
});

test('the page and its two parts say nothing that is not in the catalogue', () => {
  const page = read('../app/downloads/page.tsx');
  const list = read('../app/downloads/downloads-list.tsx');
  const devices = read('../app/downloads/offline-devices.tsx');
  for (const source of [strip(page), strip(list), strip(devices)]) {
    assert.doesNotMatch(source, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, 'a sentence is written in the page');
    assert.doesNotMatch(source, /(?:placeholder|aria-label|title)=["{]\s*['"]?[A-Z]/u);
    assert.doesNotMatch(source, /\? '[A-Z][a-z]+/u, 'a word is chosen in the page');
    // No sentence in quotes: what is said comes from `words`.
    assert.doesNotMatch(source, /(?:setPlayError|setMessage|setError|confirm)\(\s*['"`][A-Z]/u);
    assert.doesNotMatch(source, /toLocaleDateString|describeBytes|describeRemaining/u);
  }
  assert.match(page, /shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);
  assert.match(page, /languageShownFor\(locale, 'downloads'\)/u);
  // Every sentence is handed over by the page, and every one is used.
  for (const key of KEYS) assert.ok(page.includes(`'${key}'`), `${key} is not used`);
  for (const [name, source] of [['DownloadsWords', list], ['DeviceWords', devices]] as const) {
    const type = new RegExp(`export type ${name} = \\{([\\s\\S]*?)\\n\\};`, 'u').exec(source)?.[1] ?? '';
    const fields = [...type.matchAll(/^ {2}([a-zA-Z]+): string;/gmu)].map((m) => m[1]!);
    assert.ok(fields.length >= 15, name);
    for (const field of fields) {
      assert.ok(new RegExp(`words\\.${field}\\b|words\\[reason\\]`, 'u').test(source), `${name}.${field} is never said`);
    }
  }
  // Neither part reaches the catalogues: only the file that needs no catalogue.
  for (const source of [list, devices]) {
    assert.match(source, /from '@\/lib\/i18n\/format'/u);
    assert.doesNotMatch(source, /from '@\/lib\/i18n'/u);
  }
});

test('a switch that could not be read is not said as "new saves are closed"', () => {
  const page = read('../app/downloads/page.tsx');
  assert.match(page, /isFlagEnabled\(supabase, 'learning\.offline'\)\.catch\(\(\) => null\)/u);
  assert.match(page, /offlineOn === false && /u);
  assert.doesNotMatch(strip(page), /!offlineOn/u);
});

test('why a saved lesson did not open is a name, and only a four hundred is a refusal', () => {
  assert.equal(openRefusalOf(401, 'signed_out'), 'signIn');
  assert.equal(openRefusalOf(410, 'lapsed'), 'lapsed');
  assert.equal(openRefusalOf(410, 'removed'), 'removedCopy');
  assert.equal(openRefusalOf(404, 'removed'), 'removedCopy');
  assert.equal(openRefusalOf(403, 'not_allowed'), 'notAllowed');
  // A name nobody knows, no name, and a server that does not know.
  assert.equal(openRefusalOf(410, 'something_new'), null);
  assert.equal(openRefusalOf(400, undefined), null);
  assert.equal(openRefusalOf(503, 'not_allowed'), null);
  assert.equal(openRefusalOf(200, 'lapsed'), null);

  // The route sends the name beside the sentence, and the list has a sentence for each name.
  const route = read('../app/api/offline/key/route.ts');
  for (const code of ['signed_out', 'removed', 'lapsed', 'not_allowed']) assert.ok(route.includes(`'${code}'`), code);
  assert.match(route, /if \(error\) return fail\('The saved copies could not be read\.', 502\);/u);
  assert.match(route, /if \(accessError\) return fail\('Access to this saved lesson could not be checked\.', 503\);/u);
  const list = read('../app/downloads/downloads-list.tsx');
  for (const reason of ['needConnection', 'lapsed', 'notAllowed', 'removedCopy', 'signIn']) {
    assert.match(list, new RegExp(`^  ${reason}: string;`, 'mu'), reason);
  }
  assert.doesNotMatch(strip(list), /cause\.message|result\.message/u);

  const now = new Date('2026-11-27T12:00:00Z');
  const row = (over: object) => ({ id: 'a', expires_at: '2026-12-01T00:00:00Z', removed_at: null, ...over });
  const reason = (r: ReturnType<typeof decideKey>) => (r.ok ? 'ok' : r.reason);
  assert.equal(reason(decideKey(row({}), now)), 'ok');
  assert.equal(reason(decideKey(null, now)), 'missing');
  assert.equal(reason(decideKey(row({ removed_at: '2026-11-01T00:00:00Z' }), now)), 'removed');
  assert.equal(reason(decideKey(row({ expires_at: 'never' }), now)), 'unreadable');
  assert.equal(reason(decideKey(row({ expires_at: '2026-11-27T11:59:59Z' }), now)), 'lapsed');
});

test('a removal that went wrong says which half went wrong', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const good = async () => ({ data: { removed: true, downloadId: id }, error: null });
  const fine = async () => {};
  assert.deepEqual(await removeSavedWithConfirmation(id, good, fine), { ok: true });
  const lost = await removeSavedWithConfirmation(id, async () => { throw new Error('offline'); }, fine);
  assert.equal(lost.ok === false && lost.reason, 'unconfirmed');
  const other = await removeSavedWithConfirmation(id, async () => ({ data: { removed: true, downloadId: 'other' }, error: null }), fine);
  assert.equal(other.ok === false && other.reason, 'unconfirmed');
  const stuck = await removeSavedWithConfirmation(id, good, async () => { throw new Error('quota'); });
  assert.equal(stuck.ok === false && stuck.reason, 'local');
});

test('a size is the language\'s number and the three letters a phone prints', () => {
  const MB = 1024 * 1024;
  for (const bytes of [10, 900 * 1024, 5 * MB, 2.5 * 1024 * MB]) {
    assert.equal(formatBytes('en', bytes), describeBytes(bytes));
  }
  assert.equal(formatBytes('fa', 5 * MB), '۵٫۰ MB');
  assert.equal(formatBytes('fr', 2.5 * 1024 * MB), '2,50 GB');
  assert.equal(formatBytes('ne', 900 * 1024), '९०० KB');
  assert.equal(formatBytes('hi', 0), '1 KB');

  const now = new Date('2026-11-27T12:00:00Z');
  assert.equal(daysRemaining('2026-11-28T12:00:00Z', now), 1);
  assert.equal(daysRemaining('2026-11-27T12:00:01Z', now), 1);
  assert.equal(daysRemaining('2026-12-06T12:00:00Z', now), 9);
  assert.ok(daysRemaining('2026-11-27T11:59:00Z', now) <= 0);
});
