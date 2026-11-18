import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  PHONE_SENTENCE,
  PHONE_WHYS,
  phoneCodeOf,
  phoneOutcomeOf,
  phonePartsOf,
  phoneReasonOf,
  phoneRefusal,
  phoneSaidAs,
  phoneStatusOf,
  type PhoneCode,
} from './phone-outcome.ts';
import { parsePhone } from './phone.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const MIGRATION = read('../../../supabase/migrations/20261281000700_phone_numbers.sql');

const CODES = Object.keys(PHONE_SENTENCE) as PhoneCode[];

/** Every sentence the migration raises, with the state it raises it under. */
function raised(): { words: string; state: string }[] {
  const out: { words: string; state: string }[] = [];
  const pattern = /raise exception\s+'((?:[^']|'')*)'[^;]*?using errcode = '([a-z_]+)'/gu;
  for (const match of MIGRATION.matchAll(pattern)) out.push({ words: match[1]!, state: match[2]! });
  return out;
}

const SQLSTATE: Record<string, string> = {
  invalid_parameter_value: '22023',
  insufficient_privilege: '42501',
  feature_not_supported: '0A000',
  check_violation: '23514',
};

/** A raised sentence with its `%` gaps filled the way PostgreSQL would. */
function filled(words: string): string {
  if (words.startsWith('that number is not a %')) {
    return 'that number is not a UG number: it begins +447, and a number from there begins +256';
  }
  if (words.startsWith('a number from %')) return 'a number from UG has 9 to 9 digits, and this one has 8';
  return words.replace(/%/gu, 'XX');
}

test('every sentence the database raises is read as a name, and none as "failed"', () => {
  const all = raised();
  assert(all.length >= 12, `only ${all.length} raise statements found: the pattern no longer reads the migration`);
  const seen = new Set<PhoneCode>();
  for (const { words, state } of all) {
    const code = SQLSTATE[state];
    assert(code, `the migration raises under ${state}, which this test has no state for`);
    const read = phoneCodeOf({ code, message: filled(words) });
    assert.notEqual(read.code, 'failed', `"${words}" is raised before anything is written, and was read as unknown`);
    seen.add(read.code);
  }
  // Each reason a number can be refused for is one the database really raises.
  for (const why of [...PHONE_WHYS, 'no_dial', 'signed_out', 'off'] as PhoneCode[]) {
    assert(seen.has(why), `nothing the migration raises is read as ${why}`);
  }
});

test('the sentences with gaps hand over their digits, and only digits', () => {
  assert.deepEqual(
    phoneCodeOf({ code: '22023', message: 'that number is not a UG number: it begins +447, and a number from there begins +256' }),
    { code: 'other_country', begins: '+447', dial: '+256' },
  );
  // Typed with 00: the database quotes the zeros; the page writes a plus.
  assert.deepEqual(
    phoneCodeOf({ code: '22023', message: 'that number is not a UG number: it begins 0044, and a number from there begins +256' }),
    { code: 'other_country', begins: '+44', dial: '+256' },
  );
  assert.deepEqual(
    phoneCodeOf({ code: '22023', message: 'a number from UG has 9 to 9 digits, and this one has 8' }),
    { code: 'length', min: 9, max: 9, count: 8 },
  );
  assert.deepEqual(
    phoneCodeOf({ code: '22023', message: 'a number from DE has 5 to 15 digits, and this one has 3' }),
    { code: 'length', min: 5, max: 15, count: 3 },
  );
});

test('"not just punctuation" is not mistaken for the sentence it begins with', () => {
  assert.equal(phoneCodeOf({ code: '22023', message: 'type a phone number, not just punctuation' }).code, 'punctuation');
  assert.equal(phoneCodeOf({ code: '22023', message: 'type a phone number' }).code, 'empty');
});

test('a sentence under the wrong state, or an unknown one, is never a named reason', () => {
  assert.deepEqual(phoneCodeOf({ code: 'XX000', message: 'type a phone number' }), { code: 'failed' });
  assert.deepEqual(phoneCodeOf({ code: null, message: 'a phone number cannot contain letters' }), { code: 'failed' });
  assert.deepEqual(phoneCodeOf({}), { code: 'failed' });
  assert.deepEqual(phoneCodeOf({ code: '57014', message: 'canceling statement due to statement timeout' }), { code: 'failed' });
  // Raised before a write, by something this file has no name for: refused, nothing changed.
  assert.deepEqual(phoneCodeOf({ code: '22023', message: 'something new' }), { code: 'refused' });
  assert.deepEqual(phoneCodeOf({ code: '42501', message: 'permission denied for function set_my_phone' }), { code: 'refused' });
  assert.deepEqual(phoneCodeOf({ code: '23514', message: 'phone_e164 must be in E.164' }), { code: 'refused' });
});

test('each name has one status, and only "failed" is outside the 4xx', () => {
  for (const code of CODES) {
    const status = phoneStatusOf(code);
    if (code === 'failed') assert.equal(status, 502);
    else assert(status >= 400 && status <= 499, `${code} is answered with ${status}`);
  }
  assert.equal(phoneStatusOf('signed_out'), 401);
  assert.equal(phoneStatusOf('off'), 409);
});

test('the form believes a refusal only from a 4xx that names a reason it knows', () => {
  for (const code of CODES) {
    const status = phoneStatusOf(code);
    const believed = phoneOutcomeOf(status, phoneRefusal(code));
    assert.equal(believed.code, code === 'failed' ? 'failed' : code);
  }
  assert.deepEqual(phoneOutcomeOf(500, { code: 'letters' }), { code: 'failed' });
  assert.deepEqual(phoneOutcomeOf(200, { code: 'letters' }), { code: 'failed' });
  assert.deepEqual(phoneOutcomeOf(400, { code: 'a newer name' }), { code: 'failed' });
  assert.deepEqual(phoneOutcomeOf(400, null), { code: 'failed' });
  assert.deepEqual(phoneOutcomeOf(400, '<html>'), { code: 'failed' });
  assert.deepEqual(phoneOutcomeOf(400, { code: 'toString' }), { code: 'failed' });
});

test('what travels beside a name is digits, whatever was sent', () => {
  assert.deepEqual(phonePartsOf({ begins: '+447', dial: '+256', min: 9, max: 9, count: 8 }), {
    begins: '+447', dial: '+256', min: 9, max: 9, count: 8,
  });
  assert.deepEqual(phonePartsOf({ begins: '<b>+44</b>', dial: 'Uganda', min: '9', max: 1e9, count: -1 }), {});
  assert.deepEqual(phonePartsOf({ begins: '+', dial: '+1234567', min: 1.5, country: 'UG', message: 'words' }), {});
  assert.deepEqual(phonePartsOf(null), {});
  const sent = phoneRefusal('other_country', { begins: '+447', dial: '+256', extra: 'x' } as never);
  assert.deepEqual(sent, { ok: false, code: 'other_country', message: PHONE_SENTENCE.other_country, begins: '+447', dial: '+256' });
  // The English beside a code is fixed: nothing typed is put into it.
  for (const code of CODES) assert.doesNotMatch(PHONE_SENTENCE[code], /[{}%$]/u, code);
  // And it is the route's own: not one repeats what the database raises.
  for (const { words } of raised()) {
    const start = words.split('%')[0]!.trim().toLowerCase();
    if (start.length < 12) continue;
    for (const code of CODES) {
      assert(!PHONE_SENTENCE[code].toLowerCase().includes(start), `${code} repeats the database's "${start}"`);
    }
  }
});

test('a reason is said with the sentence that fits, or with none if a gap would be empty', () => {
  assert.equal(phoneSaidAs({ why: 'length', min: 9, max: 9, count: 8 }), 'length_one');
  assert.equal(phoneSaidAs({ why: 'length', min: 5, max: 15, count: 3 }), 'length_range');
  assert.equal(phoneSaidAs({ why: 'length', min: 9, max: 9 }), null);
  assert.equal(phoneSaidAs({ why: 'length' }), null);
  assert.equal(phoneSaidAs({ why: 'other_country', begins: '+447', dial: '+256' }), 'other_country');
  assert.equal(phoneSaidAs({ why: 'other_country', dial: '+256' }), null);
  for (const why of PHONE_WHYS) {
    if (why === 'length' || why === 'other_country') continue;
    assert.equal(phoneSaidAs({ why }), why);
  }
});

test('a code that is about the number becomes a reason; the others do not', () => {
  assert.deepEqual(phoneReasonOf({ code: 'length', min: 9, max: 9, count: 8 }), { why: 'length', min: 9, max: 9, count: 8 });
  for (const code of ['no_dial', 'signed_out', 'off', 'malformed', 'refused', 'failed'] as PhoneCode[]) {
    assert.equal(phoneReasonOf({ code }), null, code);
  }
});

test('what the browser says before a request has a sentence for every way it can refuse', () => {
  // Each of these is refused in the browser; every one must come out as a
  // sentence with nothing missing, or the reader gets the general refusal for
  // a mistake the form could have named.
  const typed: [string, string][] = [
    ['', 'UG'], ['abc', 'UG'], ['+', 'UG'], ['++1', 'UG'], ['+447400123456', 'UG'],
    ['077', 'UG'], ['123', 'DE'], ['1', 'XX'], ['00', 'UG'], ['+25', 'UG'],
  ];
  for (const [input, country] of typed) {
    const parsed = parsePhone(input, country);
    assert(!parsed.ok, input);
    assert.notEqual(phoneSaidAs(parsed), null, `"${input}" in ${country} is refused without everything its sentence needs`);
    // And it survives being sent: a route that names the same reason is believed whole.
    const { ok: _ok, why, ...parts } = parsed;
    assert.deepEqual(phoneOutcomeOf(400, phoneRefusal(why, parts)), { code: why, ...parts });
  }
});

test('the route names every refusal and forwards no sentence of the database', () => {
  const route = read('../app/api/account/phone/route.ts');
  assert.doesNotMatch(route, /error\.message/u, 'the route reads the database sentence again');
  assert.match(route, /phoneCodeOf\(error\)/u);
  assert.match(route, /\} catch \{\s*\/\/ Nothing is known[^\n]*\n\s*return refuse\('failed'\)/u, 'the route has no catch');
  assert.match(route, /'cache-control': 'no-store'/u);
  // Every answer but "not configured" is made by refuse() or carries NO_STORE.
  const answers = route.match(/NextResponse\.json\(/gu) ?? [];
  assert.equal(answers.length, 3, 'a new answer was added: check that it is no-store and named');
  // It does not validate: the database decides.
  assert.doesNotMatch(route, /parsePhone\(/u, 'the route validates the number itself');
});

test('the form has no sentence of its own and says an unanswered write as unknown', () => {
  const form = read('../app/account/phone-form.tsx');
  assert.match(form, /words: PhoneWords;/u, 'the words are optional again');
  assert.doesNotMatch(form, /describeCountry|phoneCountries/u, 'the form names countries itself again');
  assert.doesNotMatch(form, /@\/lib\/i18n'|useT\(/u, 'the form asks the catalogue for words');
  assert.doesNotMatch(form, /result\??\.message|\.message \?\?/u, 'the form shows the route sentence');
  assert.match(form, /\} catch \{\s*setError\(words\.unconfirmed\);/u);
  assert.match(form, /outcome\.code === 'failed' \? words\.unconfirmed/u);
  assert.match(form, /role="alert"/u);
  assert.match(form, /role="status"/u);
  // No English sentence between tags or in a quoted string of three words or more.
  const code = form.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
  assert.doesNotMatch(code, />\s*[A-Z][a-z]+ [a-z]+ [a-z]+/u, 'English between tags');
  assert.doesNotMatch(code, /'[A-Z][a-z]+ [a-z]+ [a-z ]+[.…]?'/u, 'an English sentence in a string');
});
