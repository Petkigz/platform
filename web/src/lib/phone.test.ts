import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  describeCountry,
  findCountry,
  formatPhone,
  inferCountry,
  internationalPhone,
  isE164,
  isStoredPhone,
  parsePhone,
  phoneCountries,
  stripFormatting,
  toE164,
} from './phone.ts';

function ok(input: string, country: string) {
  const parsed = parsePhone(input, country);
  assert(parsed.ok, `expected ${input} to parse: ${parsed.ok ? '' : parsed.message}`);
  return parsed;
}

function refused(input: string, country: string): string {
  const parsed = parsePhone(input, country);
  assert(!parsed.ok, `expected ${input} to be refused, and it was accepted`);
  return parsed.message;
}

// ---------------------------------------------------------------------------
// Parsing — the same rules the database applies
// ---------------------------------------------------------------------------

test('a number typed the way a person writes it becomes one string', () => {
  assert.equal(ok('0772 123 456', 'UG').e164, '+256772123456');
  assert.equal(ok('+256 (0) 772-123.456', 'UG').e164, '+256772123456');
  assert.equal(ok('256772123456', 'UG').e164, '+256772123456');
  assert.equal(ok('00256772123456', 'UG').e164, '+256772123456');
});

test('the trunk prefix is dropped, and only where the country has one', () => {
  assert.equal(ok('0772123456', 'UG').national, '772123456');
  assert.equal(ok('12015550123', 'US').e164, '+12015550123');
  // Italy's leading zero is part of the number: its row carries no trunk prefix.
  assert.equal(ok('0612345678', 'IT').e164, '+390612345678');
});

test('a number whose dial code belongs to another country is refused, both named', () => {
  const message = refused('+447400123456', 'UG');
  assert.match(message, /not a UG number/);
  assert.match(message, /\+256/);
});

test('a number the wrong length is refused with the length it should be', () => {
  assert.match(refused('077212345', 'UG'), /9 digits, and this one has 8/);
  assert.match(refused('07721234567', 'UG'), /9 digits, and this one has 10/);
});

test('letters, stray pluses and punctuation alone are refused before any request', () => {
  assert.match(refused('call me', 'UG'), /cannot contain letters/);
  assert.match(refused('++256772123456', 'UG'), /at most one \+/);
  assert.match(refused('256+772123456', 'UG'), /at most one \+/);
  assert.match(refused('+', 'UG'), /not just punctuation/);
  assert.match(refused('   ', 'UG'), /Type a phone number/);
});

test('a country with no dial code is refused, not guessed at', () => {
  assert.match(refused('0772123456', 'XX'), /Choose the country/);
  assert.match(refused('0772123456', ''), /Choose the country/);
});

test('a stored value is recognised as already canonical', () => {
  assert.equal(isStoredPhone('+256772123456', 'UG'), true);
  assert.equal(isStoredPhone('0772123456', 'UG'), false);
  assert.equal(isStoredPhone('+447400123456', 'UG'), false);
});

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

test('a stored number is written the way the country writes it', () => {
  assert.equal(formatPhone('+256772123456', 'UG').national, '772 123456');
  assert.equal(formatPhone('+256772123456', 'UG').international, '+256 772 123456');
  assert.equal(formatPhone('+12015550123', 'US').national, '201 555 0123');
  assert.equal(formatPhone('+447400123456', 'GB').national, '7400 123456');
});

test('a number in a country with no rule for its length is still readable', () => {
  // Not every length has a metadata rule; the fallback groups in threes rather
  // than printing an unbroken run of digits.
  const formatted = formatPhone('+256772123456', 'UG');
  assert.match(formatted.national, /^\d{3} \d{6}$/);
  const odd = formatPhone('+44207946001', 'GB');
  assert.match(odd.national, / /, 'a number of an unusual length lost its spaces');
});

test('a number whose country is unknown is shown exactly as stored, never mangled', () => {
  assert.equal(formatPhone('+999123456789').national, '+999123456789');
  assert.equal(formatPhone('not a number').national, 'not a number');
});

test('the country is inferred for display, longest dial code first', () => {
  // +1 is shared; three-digit codes must win over a one-digit prefix.
  assert.equal(inferCountry('+256772123456')?.code, 'UG');
  assert.equal(inferCountry('+254712123456')?.code, 'KE');
  assert.equal(inferCountry('+447400123456')?.code, 'GB');
  assert.equal(inferCountry('+12015550123')?.code, 'US');
  assert.equal(inferCountry('nothing'), null);
});

test('a country is named in words, and falls back to its code', () => {
  assert.equal(describeCountry('UG'), 'Uganda');
  assert.equal(describeCountry('gb'), 'United Kingdom');
  assert.equal(describeCountry('ZZ'), 'ZZ');
  assert.equal(describeCountry(null), '');
});

test('the list a person picks from is complete and has no duplicates', () => {
  const countries = phoneCountries();
  assert(countries.length > 200, `only ${countries.length} countries`);
  const codes = new Set(countries.map((country) => country.code));
  assert.equal(codes.size, countries.length, 'a country is listed twice');
  assert(findCountry('ug')?.dial, '+256');
  assert.equal(findCountry('XX'), null);
});

test('dialling from outside always names the code', () => {
  assert.equal(internationalPhone('+256772123456', 'UG'), '+256 772 123456');
});

// ---------------------------------------------------------------------------
// The two copies of the table must stay one table
// ---------------------------------------------------------------------------

test('every country in the database seed is in this table, with the same dial code', () => {
  const sql = readFileSync(
    new URL('../../../supabase/migrations/20261281000700_phone_numbers.sql', import.meta.url),
    'utf8',
  );

  const rows = [...sql.matchAll(/^\s+\('([A-Z]{2})', '\+([0-9]+)', (\d+), (\d+), (?:'(\d)'|null)\)/gm)];
  assert(rows.length > 200, `found ${rows.length} seeded countries in the migration`);

  for (const [, code, dial, min, max, trunk] of rows) {
    const country = findCountry(code);
    assert(country, `${code} is in the database and not in the web table`);
    assert.equal(country.dial, `+${dial}`, `${code} dial code`);
    assert.equal(String(country.min), min, `${code} minimum length`);
    assert.equal(String(country.max), max, `${code} maximum length`);
    assert.equal(country.trunk, trunk ?? null, `${code} trunk prefix`);
  }

  assert.equal(rows.length, phoneCountries().length,
    'the web table has a country the database does not');
});

// ---------------------------------------------------------------------------
// The boundary helpers the sign-in and checkout paths already used
// ---------------------------------------------------------------------------

test('accepts a well-formed E.164 number', () => {
  assert.equal(isE164('+256772123456'), true);
  assert.equal(toE164('+256772123456'), '+256772123456');
});

test('rejects what is not E.164', () => {
  for (const bad of ['', '+', '+0772123456', '0772123456', '+1', '+12345', 'abc', '+2567721234567890123']) {
    assert.equal(isE164(bad), false, `${JSON.stringify(bad)} should not be E.164`);
  }
});

test('strips spaces, dashes and parentheses', () => {
  assert.equal(stripFormatting('+256 (772) 123-456'), '+256772123456');
});

test('normalises a Ugandan local number given the dial code', () => {
  assert.equal(toE164('0772 123 456', '+256'), '+256772123456');
  assert.equal(toE164('0772123456', '256'), '+256772123456');
});

test('refuses to guess a country for a bare local number', () => {
  // Guessing here is how an OTP reaches the wrong country.
  assert.equal(toE164('0772123456'), null);
});

test('accepts an international number written without the +', () => {
  assert.equal(toE164('256772123456'), '+256772123456');
});

test('rejects a country code that is not plausible', () => {
  assert.equal(toE164('0772123456', 'not-a-country'), null);
  assert.equal(toE164('0772123456', '2561234'), null);
});

test('a shared dial code is read under each country that uses it', () => {
  // +1 with a number that is only valid as a Canadian one still lands.
  assert.equal(toE164('+12045550123'), '+12045550123');
  assert.equal(toE164('(201) 555-0123', '+1'), '+12015550123');
});

test('the picker is alphabetical by name, so a country can be found', () => {
  const names = phoneCountries().slice(0, 5).map((country) => describeCountry(country.code));
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(names, sorted);
  assert(phoneCountries().length > 200);
});
