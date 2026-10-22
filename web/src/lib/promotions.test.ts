import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeBenefit,
  describeLimits,
  describeMarkets,
  describePromotionRefusal,
  validateCampaignInput,
  type PromotionCampaign,
  type PromotionInput,
} from './promotions.ts';

const base: PromotionInput = {
  code: 'eid24',
  name: 'Eid offer',
  benefitType: 'percent_off',
  percent: '20',
  markets: [],
  courseIds: [],
};

test('a code is stored the way people will type it, in upper case', () => {
  const result = validateCampaignInput(base);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.code, 'EID24');
  assert.equal(result.value.benefitType, 'percent_off');
  assert.equal(result.value.percent, 20);
  assert.equal(result.value.totalLimit, null, 'an empty limit became something other than null');
});

test('a code that a person cannot type is refused by what is allowed', () => {
  for (const code of ['', 'has space', 'slash/code', 'x'.repeat(33), '-leading']) {
    const result = validateCampaignInput({ ...base, code });
    assert.equal(result.ok, false, `'${code}' was accepted`);
    if (!result.ok) assert.match(result.message, /letters, digits/i);
  }
});

test('a percentage has to be a whole number between 1 and 100', () => {
  for (const percent of ['0', '101', '12.5', 'free']) {
    assert.equal(validateCampaignInput({ ...base, percent }).ok, false, `${percent} was accepted`);
  }
  const hundred = validateCampaignInput({ ...base, percent: '100' });
  assert.equal(hundred.ok, true, '100% off is a legitimate giveaway');
});

test('a fixed amount carries its own currency, and no conversion is attempted', () => {
  const noCurrency = validateCampaignInput({
    ...base, benefitType: 'fixed_amount_off', percent: undefined,
    amountMinor: '5000', currency: '',
  });
  assert.equal(noCurrency.ok, false);
  if (!noCurrency.ok) assert.match(noCurrency.message, /currency/i);

  const ok = validateCampaignInput({
    ...base, benefitType: 'fixed_amount_off', percent: undefined,
    amountMinor: '5 000', currency: 'ugx',
  });
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.value.amountMinor, '5000', 'the amount was not normalised');
  assert.equal(ok.value.currency, 'UGX');

  const zero = validateCampaignInput({
    ...base, benefitType: 'fixed_amount_off', amountMinor: '0', currency: 'UGX',
  });
  assert.equal(zero.ok, false, 'a zero discount was accepted');
});

test('the family limit is a number or nothing, and zero is a mistake', () => {
  const two = validateCampaignInput({ ...base, perFamilyLimit: '2' });
  assert.equal(two.ok, true);
  if (two.ok) assert.equal(two.value.perFamilyLimit, 2);

  const blank = validateCampaignInput({ ...base, perFamilyLimit: '' });
  assert.equal(blank.ok, true);
  if (blank.ok) assert.equal(blank.value.perFamilyLimit, null);

  const zero = validateCampaignInput({ ...base, perFamilyLimit: '0' });
  assert.equal(zero.ok, false, 'a limit of zero was accepted — that is a blocked promotion');
});

test('the window is a real range, and dates are sent as instants', () => {
  const backwards = validateCampaignInput({
    ...base, startsAt: '2026-12-01T10:00', endsAt: '2026-11-01T10:00',
  });
  assert.equal(backwards.ok, false);
  if (!backwards.ok) assert.match(backwards.message, /cannot end before/i);

  const fine = validateCampaignInput({
    ...base, startsAt: '2026-12-01T10:00', endsAt: '2026-12-31T10:00',
  });
  assert.equal(fine.ok, true);
  if (!fine.ok) return;
  assert.match(String(fine.value.startsAt), /2026-12-0\dT/);

  const nonsense = validateCampaignInput({ ...base, startsAt: 'next tuesday' });
  assert.equal(nonsense.ok, false);
});

test('markets and courses are de-duplicated, because a checkbox can be posted twice', () => {
  const result = validateCampaignInput({ ...base, markets: ['ug', 'UG', 'ke'], courseIds: ['a', 'a'] });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value.markets, ['UG', 'KE']);
  assert.deepEqual(result.value.courseIds, ['a']);
});

test('the database refusals become sentences a person can act on', () => {
  const cases: [string, RegExp][] = [
    ['only the platform owner or a teacher may create a promotion', /only the platform owner or a teacher/i],
    ['course 123 is not yours to discount', /courses you created/i],
    ['the code EID24 is already used by another promotion', /already in use/i],
    ['course 123 has no live price in market TZ', /no price in one of the countries/i],
    ['course 123 is priced in KES in market KE, so a UGX discount would be a different gift there',
      /different currency/i],
    ['only the owner of this campaign may change its status', /created this promotion/i],
    ['this campaign has already been redeemed 4 times, so the total limit cannot be 2',
      /more times than the limit/i],
  ];
  for (const [raw, pattern] of cases) {
    assert.match(describePromotionRefusal(raw), pattern);
  }

  // An unknown message is passed through rather than replaced with a vague one.
  assert.equal(describePromotionRefusal('connection terminated unexpectedly'),
    'connection terminated unexpectedly');
});

test('a campaign reads as a sentence, not as a row', () => {
  const percent: PromotionCampaign['benefit'] = { type: 'percent_off', percent: 20 };
  const fixed: PromotionCampaign['benefit'] = {
    type: 'fixed_amount_off', amountMinor: 5000n, currency: 'UGX',
  };
  assert.equal(describeBenefit(percent), '20% off');
  assert.equal(describeBenefit(fixed), '5,000 UGX off');

  assert.equal(describeMarkets([]), 'Everywhere the course is sold');
  assert.equal(describeMarkets(['UG']), 'UG');
  assert.equal(describeMarkets(['KE', 'UG']), 'KE, UG');

  assert.equal(describeLimits({ total: null, perUser: null, perFamily: null }), 'No limit');
  assert.equal(describeLimits({ total: 100, perUser: null, perFamily: 2 }),
    '100 in total · 2 per family');
});
