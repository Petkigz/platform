import assert from 'node:assert/strict';
import test from 'node:test';

import { validateCreateProduct, validateSetPrice, PRODUCT_TYPES } from './products.ts';

// ---------------------------------------------------------------------------
// Putting a course on sale.
//
// products, prices and product_course_versions all had zero rows and no writer,
// so nothing could ever be bought. These rules are the front gate.
//
// The one that matters most: a price is an integer number of minor units. The
// column is bigint, so a fractional amount would be silently rounded on the way
// in — and rounding money is the kind of thing nobody notices until the books
// disagree.
// ---------------------------------------------------------------------------

const PRODUCT = '22222222-2222-4222-8222-222222222222';

const basePrice = {
  productId: PRODUCT,
  amountMinor: 10000,
  currencyCode: 'USD',
};

test('a well-formed product passes', () => {
  assert.equal(validateCreateProduct({ name: 'Quran Foundations' }).ok, true);
});

test('every supported product type passes', () => {
  for (const t of PRODUCT_TYPES) {
    assert.equal(validateCreateProduct({ name: 'X', productType: t }).ok, true,
      `${t} should be accepted`);
  }
});

test('a blank product name is refused', () => {
  for (const name of ['', '   ', '\t']) {
    const r = validateCreateProduct({ name });
    assert.equal(r.ok, false, `${JSON.stringify(name)} should be refused`);
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.message, /name/i);
  }
});

test('an over-long product name is refused', () => {
  const r = validateCreateProduct({ name: 'x'.repeat(201) });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) assert.match(r.message, /200/);

  assert.equal(validateCreateProduct({ name: 'x'.repeat(200) }).ok, true,
    'exactly 200 should pass');
});

test('an unsupported product type is refused', () => {
  const r = validateCreateProduct({
    name: 'X',
    productType: 'subscription' as unknown as 'course',
  });
  assert.equal(r.ok, false);
});

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

test('a well-formed price passes', () => {
  assert.equal(validateSetPrice(basePrice).ok, true);
});

test('a fractional amount is refused rather than silently rounded', () => {
  // The column is bigint. 10000.5 would become 10000 or 10001 depending on how
  // it got there, and nobody would notice until the books disagreed.
  for (const amountMinor of [10000.5, 0.1, -0.5]) {
    const r = validateSetPrice({ ...basePrice, amountMinor });
    assert.equal(r.ok, false, `${amountMinor} should be refused`);
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.message, /minor units/i);
  }
});

test('a negative price is refused', () => {
  for (const amountMinor of [-1, -10000]) {
    assert.equal(validateSetPrice({ ...basePrice, amountMinor }).ok, false);
  }
});

test('zero is a valid price, because a free course is a real thing', () => {
  assert.equal(validateSetPrice({ ...basePrice, amountMinor: 0 }).ok, true);
});

test('a non-numeric or infinite amount is refused', () => {
  for (const amountMinor of [Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(validateSetPrice({ ...basePrice, amountMinor }).ok, false);
  }
});

test('a currency that is not 3-letter uppercase ISO is refused', () => {
  for (const currencyCode of ['usd', 'US', 'USD1', '', 'USDD']) {
    const r = validateSetPrice({ ...basePrice, currencyCode });
    assert.equal(r.ok, false, `${currencyCode} should be refused`);
    assert.ok(!r.ok);
    if (!r.ok) {
      assert.match(r.message, /three-letter uppercase ISO/);
      assert.doesNotMatch(r.message, /_check/);
    }
  }
});

test('a market that is not 2-letter uppercase is refused', () => {
  for (const market of ['ug', 'UGA', 'u', '']) {
    const r = validateSetPrice({ ...basePrice, market });
    assert.equal(r.ok, false, `${market} should be refused`);
  }

  assert.equal(validateSetPrice({ ...basePrice, market: 'UG' }).ok, true);
  assert.equal(validateSetPrice({ ...basePrice, market: null }).ok, true,
    'a null market means "everywhere" and is valid');
});

test('an unsupported billing interval is refused', () => {
  const r = validateSetPrice({
    ...basePrice,
    billingInterval: 'decade' as unknown as 'month',
  });
  assert.equal(r.ok, false);
});

test('every supported billing interval passes', () => {
  for (const billingInterval of ['week', 'month', 'quarter', 'year', 'one_time'] as const) {
    assert.equal(validateSetPrice({ ...basePrice, billingInterval }).ok, true,
      `${billingInterval} should be accepted`);
  }
});

test('a missing product is refused', () => {
  assert.equal(validateSetPrice({ ...basePrice, productId: '' }).ok, false);
});
