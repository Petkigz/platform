import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  add,
  format,
  fromMajor,
  fromMinor,
  fromWire,
  isNegative,
  isZero,
  minorUnitDivisor,
  subtract,
  toWire,
  MoneyError,
} from './money.ts';

test('a whole number of minor units round-trips', () => {
  const m = fromMinor('1250', 'USD');
  assert.equal(m.amountMinor, 1250n);
  assert.equal(m.currency, 'USD');
  assert.equal(toWire(m).amount_minor, '1250');
});

test('accepts a number as well as a string', () => {
  assert.equal(fromMinor(1250, 'USD').amountMinor, 1250n);
});

// D4. This is the assertion that matters: a float must not be silently
// truncated into an integer, because that is how an amount quietly changes.
test('a fractional amount is refused, not truncated', () => {
  assert.throws(() => fromMinor(12.5, 'USD'), MoneyError);
  assert.throws(() => fromMinor('12.50', 'USD'), MoneyError);
  assert.throws(() => fromMinor(NaN, 'USD'), MoneyError);
  assert.throws(() => fromMinor(Infinity, 'USD'), MoneyError);
  assert.throws(() => fromMinor('1e3', 'USD'), MoneyError);
});

test('a bad currency code is refused', () => {
  assert.throws(() => fromMinor('100', 'usd'), MoneyError);
  assert.throws(() => fromMinor('100', 'US'), MoneyError);
  assert.throws(() => fromMinor('100', ''), MoneyError);
});

test('zero-decimal currencies have no minor unit to invent', () => {
  assert.equal(minorUnitDivisor('JPY'), 1);
  assert.equal(minorUnitDivisor('UGX'), 1);
  assert.equal(minorUnitDivisor('USD'), 100);
  // 100 minor units of yen would be a hundred times the intended amount.
  assert.equal(format(fromMinor('100', 'JPY')), 'JPY 100');
  assert.equal(format(fromMinor('100', 'USD')), 'USD 1.00');
});

test('fromMajor respects the currency precision', () => {
  assert.equal(fromMajor('12.50', 'USD').amountMinor, 1250n);
  assert.equal(fromMajor('12.5', 'USD').amountMinor, 1250n);
  assert.equal(fromMajor('12', 'USD').amountMinor, 1200n);
  assert.equal(fromMajor('1250', 'UGX').amountMinor, 1250n);
  assert.throws(() => fromMajor('12.345', 'USD'), MoneyError);
  assert.throws(() => fromMajor('12.5', 'UGX'), MoneyError);
  assert.throws(() => fromMajor('-5', 'USD'), MoneyError);
  assert.throws(() => fromMajor('abc', 'USD'), MoneyError);
});

test('formatting keeps the currency explicit', () => {
  assert.equal(format(fromMinor('0', 'USD')), 'USD 0.00');
  assert.equal(format(fromMinor('5', 'USD')), 'USD 0.05');
  // The sign leads the whole quantity, matching Intl.NumberFormat's own
  // rendering of a negative currency amount.
  assert.equal(format(fromMinor('-1250', 'USD')), '-USD 12.50');
  assert.equal(format(fromMinor('30000', 'UGX')), 'UGX 30000');
});

test('the wire form is a string, because JSON has no bigint', () => {
  const wire = toWire(fromMinor('1250', 'USD'));
  assert.equal(typeof wire.amount_minor, 'string');
  assert.equal(wire.currency_code, 'USD');
  assert.equal(JSON.parse(JSON.stringify(wire)).amount_minor, '1250');
});

test('a database row parses through the wire form', () => {
  const m = fromWire({ amount_minor: '30000', currency_code: 'UGX' });
  assert.equal(m.amountMinor, 30000n);
  assert.equal(format(m), 'UGX 30000');
});

test('amounts only combine within one currency', () => {
  const usd = fromMinor('1000', 'USD');
  const ugx = fromMinor('1000', 'UGX');
  assert.equal(add(usd, fromMinor('250', 'USD')).amountMinor, 1250n);
  assert.equal(subtract(usd, fromMinor('250', 'USD')).amountMinor, 750n);
  // FX is recorded separately under D4; it is never folded into the amount.
  assert.throws(() => add(usd, ugx), MoneyError);
});

test('zero and negative are distinguishable', () => {
  assert.equal(isZero(fromMinor('0', 'USD')), true);
  assert.equal(isNegative(fromMinor('0', 'USD')), false);
  assert.equal(isNegative(fromMinor('-1', 'USD')), true);
});

test('large amounts survive without precision loss', () => {
  // Beyond Number.MAX_SAFE_INTEGER. A float here would silently round.
  const big = fromMinor('9007199254740993', 'USD');
  assert.equal(big.amountMinor, 9007199254740993n);
  assert.equal(toWire(big).amount_minor, '9007199254740993');
});
