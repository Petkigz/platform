import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeEmptyRegister,
  describeRate,
  describeSample,
  describeScope,
  type ChargeRule,
} from './charges.ts';

const rule = (over: Partial<ChargeRule> = {}): ChargeRule => ({
  id: 'r1',
  kind: 'tax',
  country_code: 'UG',
  currency_code: null,
  label: 'VAT',
  rate_bps: 1800,
  fixed_minor: 0,
  min_minor: null,
  max_minor: null,
  effective_from: '2026-10-22T00:00:00Z',
  effective_to: null,
  status: 'active',
  note: null,
  ...over,
});

test('a rate reads as a percentage, with a fixed part only when there is one', () => {
  assert.equal(describeRate(1800), '18%');
  assert.equal(describeRate(750), '7.5%');
  assert.equal(describeRate(0, 500), '500');
  assert.equal(describeRate(100, 500), '1% + 500');
});

test('a scope says which places a rule covers', () => {
  assert.equal(describeScope({ country_code: 'UG', currency_code: null }), 'UG · any currency');
  assert.equal(describeScope({ country_code: null, currency_code: 'UGX' }), 'every country · UGX');
});

test('an empty register says so rather than looking broken', () => {
  assert.match(describeEmptyRegister([]) ?? '', /no order is charged/i);
  assert.equal(describeEmptyRegister([rule()]), null);
  assert.match(
    describeEmptyRegister([rule({ status: 'retired' })]) ?? '',
    /no tax or fee is registered/i,
  );
});

test('a sample amount follows the same arithmetic as the database', () => {
  // 18% of 30,000.
  assert.equal(describeSample(rule(), 30000), 5400);
  // 1% + 500, clamped to a 2,000 ceiling.
  assert.equal(
    describeSample(rule({ rate_bps: 100, fixed_minor: 500, min_minor: 500, max_minor: 2000 }), 1000000),
    2000,
  );
  // The same rule on 1,000 lands on 510, above its floor.
  assert.equal(
    describeSample(rule({ rate_bps: 100, fixed_minor: 500, min_minor: 500, max_minor: 2000 }), 1000),
    510,
  );
});
