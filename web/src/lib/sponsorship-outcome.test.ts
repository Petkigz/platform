import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { messagesFor } from './i18n/index.ts';
import type { LocaleCode } from './i18n/locales.ts';
import { en } from './i18n/messages/en.ts';
import { SPONSOR } from './i18n/messages/sponsor.ts';
import {
  ASK_STATES,
  PLEDGE_STATES,
  STAFF_NOTE_MAX,
  amountOf,
  askStateOf,
  pledgeStateOf,
  staffNoteOf,
  switchOf,
} from './sponsorship-outcome.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const MIGRATION = read('../../../supabase/migrations/20261281001000_sponsorship.sql');
const PAGE = read('../app/account/sponsorship/page.tsx');

/** The body of one function in the migration. */
function body(name: string): string {
  const start = MIGRATION.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, name);
  const end = MIGRATION.indexOf('\n$$;', start);
  assert.ok(end > start, name);
  return MIGRATION.slice(start, end);
}

/** The states a table's `status` column may hold, as its check constraint lists them. */
function statesOf(table: string): string[] {
  const start = MIGRATION.indexOf(`create table public.${table} (`);
  assert.ok(start >= 0, `${table} is not created where this test looks`);
  const end = MIGRATION.indexOf('\n);', start);
  const check = /check \(status in \(([^)]+)\)\)/u.exec(MIGRATION.slice(start, end));
  assert.ok(check, `${table} has no check on status`);
  return [...check[1]!.matchAll(/'([a-z_]+)'/gu)].map((m) => m[1]!);
}

test('the states this page has sentences for are the states the database allows', () => {
  assert.deepEqual([...ASK_STATES].sort(), statesOf('sponsorship_applications').sort());
  assert.deepEqual([...PLEDGE_STATES].sort(), statesOf('sponsorships').sort());
});

test('a state the page does not know is "other", never the word itself', () => {
  for (const state of ASK_STATES) assert.equal(askStateOf(state), state);
  for (const state of PLEDGE_STATES) assert.equal(pledgeStateOf(state), state);
  for (const odd of ['', 'FUNDED', 'paid ', 'refunded', null, undefined, 7, {}, ['paid']]) {
    assert.equal(askStateOf(odd), 'other');
    assert.equal(pledgeStateOf(odd), 'other');
  }
  // The two tables share a word and nothing else.
  assert.equal(askStateOf('paid'), 'other');
  assert.equal(pledgeStateOf('funded'), 'other');
});

test('an amount is a currency code and major units, worked out in whole numbers', () => {
  assert.equal(amountOf('50000', 'UGX'), 'UGX 50000');
  // What the page used to print as 1999.
  assert.equal(amountOf('1999', 'USD'), 'USD 19.99');
  assert.equal(amountOf('5', 'USD'), 'USD 0.05');
  assert.equal(amountOf('5000', 'KWD'), 'KWD 5.000');
  assert.equal(amountOf(1999, 'KES'), 'KES 19.99');
  assert.equal(amountOf('0', 'UGX'), 'UGX 0');
  // Past what a Number holds exactly, and still every digit.
  assert.equal(amountOf('900719925474099312', 'UGX'), 'UGX 900719925474099312');
  assert.equal(amountOf('900719925474099312', 'USD'), 'USD 9007199254740993.12');
});

test('an amount that cannot be said correctly is left out', () => {
  for (const [amount, currency] of [
    ['', 'UGX'],
    ['-500', 'UGX'],
    ['19.99', 'USD'],
    ['1e3', 'USD'],
    ['1,000', 'USD'],
    ['١٢٣', 'UGX'],
    ['1000', ''],
    ['1000', 'ugx'],
    ['1000', 'UGXX'],
    ['1000', null],
    [null, 'UGX'],
    [undefined, 'UGX'],
    [19.99, 'USD'],
    [2 ** 60, 'UGX'],
    [Number.NaN, 'UGX'],
    ['1'.repeat(19), 'UGX'],
    [{}, 'UGX'],
  ] as [unknown, unknown][]) {
    assert.equal(amountOf(amount, currency), null, `${String(amount)} ${String(currency)}`);
  }
});

test('the switch is what a board that could be read says, and unknown when neither could', () => {
  assert.equal(switchOf({ enabled: true }, { enabled: true }), true);
  assert.equal(switchOf(null, { enabled: false }), false);
  assert.equal(switchOf({ enabled: false }, null), false);
  assert.equal(switchOf(null, null), null);
  assert.equal(switchOf(undefined, undefined), null);
});

test('what staff wrote is trimmed, kept as written, and cut where a note has stopped being one', () => {
  assert.equal(staffNoteOf('  Try again next term.\n'), 'Try again next term.');
  assert.equal(staffNoteOf('<b>لا</b>'), '<b>لا</b>');
  for (const nothing of ['', '   ', null, undefined, 7, {}]) assert.equal(staffNoteOf(nothing), null);
  const long = staffNoteOf('x'.repeat(STAFF_NOTE_MAX + 50));
  assert.equal(long?.length, STAFF_NOTE_MAX + 1);
  assert.ok(long?.endsWith('…'));
});

test('the two boards raise one thing, and report the switch themselves', () => {
  for (const name of ['my_sponsorship_applications', 'my_sponsorships']) {
    const raised = [...body(name).matchAll(/raise exception '([^']+)'[^;]*?using errcode = '([a-z_]+)'/gu)].map((m) => [m[1], m[2]]);
    // Signed out, which the page never reaches: it sends such a reader to sign in first.
    assert.deepEqual(raised, [['sponsorship:not_signed_in', 'insufficient_privilege']], name);
    assert.match(body(name), /'enabled', public\.setting_bool\('commerce\.sponsorship', false\)/u, name);
  }
  // Neither side is sent the other.
  assert.doesNotMatch(body('my_sponsorship_applications'), /donor_user_id|public\.sponsorships|\bsp\./u);
  assert.doesNotMatch(body('my_sponsorships'), /learner_profile|display_name|\blp\./u);
  // "Covered" is true once the payment is recorded, which is when the course opens.
  assert.match(body('record_sponsorship_payment'), /set status = 'funded'/u);
});

const KEYS = Object.keys(en).filter((key) => key.startsWith('sponsor.')) as (keyof typeof en)[];
const CODES = Object.keys(SPONSOR) as LocaleCode[];

test('the page has its thirty-five sentences in twenty-seven languages', () => {
  assert.equal(KEYS.length, 35);
  assert.equal(CODES.length, 27);
  for (const code of CODES) {
    const own = SPONSOR[code]!;
    assert.deepEqual(Object.keys(own).sort(), [...KEYS].sort(), code);
    const served = messagesFor(code);
    for (const key of KEYS) {
      const sentence = served[key];
      assert.equal(sentence, own[key], `${code} ${key}`);
      assert.ok(sentence && sentence.trim() === sentence && !/ {2}|['`\\\n]/u.test(sentence), `${code} ${key}`);
      assert.deepEqual(sentence.match(/\{[a-zA-Z]+\}/gu) ?? [], en[key].match(/\{[a-zA-Z]+\}/gu) ?? [], `${code} ${key}: gaps`);
      // Two short labels may be the same word in a neighbouring language; a sentence may not be English.
      if (en[key].length > 20) assert.notEqual(sentence, en[key], `${code} ${key} is English`);
    }
  }
});

test('whatever is put into a sentence closes it, so no language has to inflect it', () => {
  const GAPS: [keyof typeof en, string][] = [
    ['sponsor.forWhom', '{name}'],
    ['sponsor.seat', '{code}'],
    ['sponsor.amount', '{amount}'],
    ['sponsor.reference', '{reference}'],
    ['sponsor.askedOn', '{date}'],
    ['sponsor.decidedOn', '{date}'],
    ['sponsor.pledgedOn', '{date}'],
    ['sponsor.recordedOn', '{date}'],
  ];
  for (const code of ['en' as LocaleCode, ...CODES]) {
    const served = messagesFor(code);
    for (const [key, gap] of GAPS) {
      assert.ok(served[key].endsWith(gap), `${code} ${key}: "${served[key]}"`);
      assert.equal(served[key].split(gap).length, 2, `${code} ${key}`);
    }
  }
});

test('no sentence says a payment can be made here, and none rules on zakat', () => {
  // A pledge is not a payment, and nothing in the product says how to pay one.
  assert.match(en['sponsor.nextPledged'], /^Nothing is taken automatically: this page collects no payment\./u);
  assert.doesNotMatch(en['sponsor.nextPledged'], /\b(card|mobile|provider|pay the amount|transfer|bank)\b/iu);
  assert.match(en['sponsor.nextPaid'], /have not been told who paid/u);
  // The ruling is a scholar's, with "or neither" kept, and the platform does not make it.
  assert.match(en['sponsor.zakat'], /zakat, sadaqah or neither is a scholar’s ruling, and this platform does not make it/u);
  assert.match(en['sponsor.zakat'], /Ask somebody you trust before you give\.$/u);
  // Nobody is given a gender or told who the other is.
  for (const key of KEYS) assert.doesNotMatch(en[key], /\b(he|she|his|her|him)\b/iu, key);
  assert.match(en['sponsor.coveredBody'], /Whoever paid is not named here/u);
  // "You took this back" was said to a parent about a request their child's other parent withdrew.
  assert.equal(en['sponsor.apWithdrawn'], 'Taken back');
});

test('the page says states, dates and amounts through the catalogue and nothing through English', () => {
  assert.doesNotMatch(PAGE, /'use client'/u);
  // It only reads: two functions, no button, no form.
  assert.deepEqual([...PAGE.matchAll(/\.rpc\('([a-z_]+)'/gu)].map((m) => m[1]), ['my_sponsorship_applications', 'my_sponsorships']);
  assert.doesNotMatch(PAGE, /<button|<form|<input|fetch\(/u);
  // An answer that is an error is not read as an empty board.
  assert.match(PAGE, /const applied = asked\.error \? null : parseApplicationBoard\(asked\.data\);/u);
  assert.match(PAGE, /const sponsored = gave\.error \? null : parseSponsorBoard\(gave\.data\);/u);
  // None of the English this page used to print.
  assert.doesNotMatch(PAGE, /describeApplicationStatus|describeSponsorshipStatus|pledgeNextStep\(|ZAKAT_HONESTY|toLocale(Date)?String|'en-GB'/u);
  assert.doesNotMatch(PAGE, />\s*(Course|For|Asked|Reason: |Note: |Pledged |Sponsored seats|Account)\s*</u);
  assert.match(PAGE, /languageShownFor\(locale, 'sponsor'\)/u);
  assert.match(PAGE, /formatDateTime\(shown\.code, iso, 'UTC'\)/u);
  assert.match(PAGE, /const frame = shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\};/u);
  // An amount through money, set left to right; never the two raw fields side by side.
  assert.match(PAGE, /const amount = amountOf\(row\.amountMinor, row\.currencyCode\);/u);
  assert.match(PAGE, /parts=\{\{ amount: <bdi dir="ltr">\{amount\}<\/bdi> \}\}/u);
  assert.doesNotMatch(PAGE, /\{row\.currencyCode\}|\{row\.amountMinor\}|\{row\.status\}/u);
  // A name somebody typed is set apart; what staff wrote keeps its own direction.
  assert.match(PAGE, /parts=\{\{ name: <bdi>\{row\.learnerName\}<\/bdi> \}\}/u);
  assert.match(PAGE, /const words = name \? <bdi>\{name\}<\/bdi> : t\('sponsor\.aCourse'\);/u);
  assert.match(PAGE, /<p\s+dir="auto"\s+data-staff-note/u);
  assert.match(PAGE, /\{t\('sponsor\.staffNote'\)\}/u);
  // Two boards, each said as unread when it is, aloud.
  assert.equal(PAGE.match(/<div className="notice error" role="alert">/gu)?.length, 2);
  // The switch off: said, and nothing new offered.
  assert.match(PAGE, /\{enabled === false && <div className="notice warn">\{t\('sponsor\.off'\)\}<\/div>\}/u);
  assert.match(PAGE, /\{enabled !== false && \(\s*<div className="page-actions"/u);
  // A state it does not know gets "Recorded" and no next step.
  assert.match(PAGE, /other: 'refer\.rwOther',/u);
  assert.doesNotMatch(PAGE, /other: 'sponsor\.next/u);
  // Every key it asks for exists.
  for (const match of PAGE.matchAll(/'((?:sponsor|account|merge|refer)\.[A-Za-z0-9]+)'/gu)) {
    assert.ok(Object.hasOwn(en, match[1]!), `${match[1]} is not a sentence`);
  }
  // And every sentence written for it is used.
  for (const key of KEYS) assert.ok(PAGE.includes(`'${key}'`), `${key} is written and not used`);
});
