import assert from 'node:assert/strict';
import test from 'node:test';

import { COUNTRY_HEADERS, countryFromHeaders, countryName } from './geo.ts';

const withHeaders = (entries: Record<string, string>) => ({
  get: (name: string) => entries[name] ?? null,
});

test('the first country header that carries a country wins', () => {
  assert.equal(
    countryFromHeaders(withHeaders({
      'x-vercel-ip-country': 'UG',
      'cf-ipcountry': 'KE',
    })),
    'UG',
  );
  assert.equal(
    countryFromHeaders(withHeaders({ 'cf-ipcountry': 'ke' })),
    'KE',
    'a lower-case code was not normalised',
  );
});

test('every known header is read, so a deployment on either host works', () => {
  for (const name of COUNTRY_HEADERS) {
    assert.equal(countryFromHeaders(withHeaders({ [name]: 'TZ' })), 'TZ', name);
  }
});

test('a placeholder code is not a country', () => {
  for (const code of ['XX', 'T1', 'A1', 'A2', 'O1']) {
    assert.equal(countryFromHeaders(withHeaders({ 'cf-ipcountry': code })), null, code);
  }
});

test('a malformed header is skipped, not guessed at', () => {
  for (const value of ['UGA', 'U', '12', '', '   ', 'uganda']) {
    assert.equal(countryFromHeaders(withHeaders({ 'cf-ipcountry': value })), null, value);
  }
  // A bad first header does not hide a good second one.
  assert.equal(
    countryFromHeaders(withHeaders({ 'x-vercel-ip-country': 'UGA', 'cf-ipcountry': 'UG' })),
    'UG',
  );
});

test('no headers at all is null rather than a guess', () => {
  assert.equal(countryFromHeaders(null), null);
  assert.equal(countryFromHeaders(undefined), null);
  assert.equal(countryFromHeaders({ get: () => null }), null);
});

test('a country is named for a person, and an unknown one falls back to its code', () => {
  assert.equal(countryName('UG'), 'Uganda');
  assert.equal(countryName('ke'), 'Kenya');
  assert.equal(countryName('ZA'), 'South Africa');
  assert.equal(countryName('ZZ'), 'ZZ');
  assert.equal(countryName(null), null);
  assert.equal(countryName('UGA'), null, 'a malformed code was treated as a country');
});
