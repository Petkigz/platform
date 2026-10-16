import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isE164, stripFormatting, toE164 } from './phone.ts';

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

test('normalises a Ugandan local number given the country code', () => {
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
