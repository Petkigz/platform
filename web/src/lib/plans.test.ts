import assert from 'node:assert/strict';
import { test } from 'node:test';

import { en } from './i18n/messages/en.ts';
import { PERIOD_KEY, PLAN_PERIODS, learnersFor, offersFor, standingOf, storefrontOf } from './plans.ts';

const NOW = Date.parse('2026-11-24T10:00:00Z');

const price = (over: Record<string, unknown>) => ({
  id: 'price-1',
  plan_version_id: 'v-month',
  amount_minor: '30000',
  currency_code: 'UGX',
  billing_interval: 'month',
  market: null,
  status: 'active',
  effective_from: null,
  effective_until: null,
  ...over,
});
const MONTH = { id: 'v-month', period: 'month' as const };

test('a price is offered only if the writer would take it', () => {
  assert.deepEqual(offersFor([price({})], MONTH, null, NOW).map((o) => [o.priceId, o.amount]), [['price-1', 'UGX 30000']]);
  // Each of the writer's conditions, one at a time.
  for (const [why, over] of [
    ['another version', { plan_version_id: 'v-year' }],
    ['not active', { status: 'retired' }],
    ['another period', { billing_interval: 'year' }],
    ['ended', { effective_until: '2027-01-01T00:00:00Z' }],
    ['not started', { effective_from: '2026-12-01T00:00:00Z' }],
    ['a start that is not a date', { effective_from: 'soon' }],
    ['another market', { market: 'KE' }],
    ['no amount', { amount_minor: null }],
    ['an amount of nothing', { amount_minor: '0' }],
    ['a negative amount', { amount_minor: '-5' }],
    ['a currency that is not one', { currency_code: 'shillings' }],
  ] as const) {
    assert.deepEqual(offersFor([price(over)], MONTH, null, NOW), [], why);
  }
  // Started in the past is on sale.
  assert.equal(offersFor([price({ effective_from: '2026-01-01T00:00:00Z' })], MONTH, null, NOW).length, 1);
});

test('the account\'s own market is the price; the default is not offered beside it', () => {
  const both = [price({ id: 'default', currency_code: 'USD', amount_minor: '999' }), price({ id: 'uganda', market: 'UG' })];
  assert.deepEqual(offersFor(both, MONTH, 'UG', NOW).map((o) => o.priceId), ['uganda']);
  // Somebody in another country, or with no country on the account, gets the default.
  assert.deepEqual(offersFor(both, MONTH, 'KE', NOW).map((o) => [o.priceId, o.amount]), [['default', 'USD 9.99']]);
  assert.deepEqual(offersFor(both, MONTH, null, NOW).map((o) => o.priceId), ['default']);
  // A market price is never offered to an account with no country.
  assert.deepEqual(offersFor([price({ market: 'UG' })], MONTH, null, NOW), []);
});

test('two currencies are two offers; two prices in one currency are a mistake and neither is offered', () => {
  const two = [price({ id: 'usd', currency_code: 'USD', amount_minor: '999' }), price({ id: 'ugx' })];
  assert.deepEqual(offersFor(two, MONTH, null, NOW).map((o) => o.priceId), ['ugx', 'usd']);
  const clash = [price({ id: 'a' }), price({ id: 'b', amount_minor: '25000' }), price({ id: 'usd', currency_code: 'USD', amount_minor: '999' })];
  assert.deepEqual(offersFor(clash, MONTH, null, NOW).map((o) => o.priceId), ['usd']);
});

const read = (over: Record<string, unknown> = {}) => ({
  plans: [{ id: 'plan-1', name: 'Family', description: 'For a household.' }],
  versions: [
    { id: 'v-month', plan_id: 'plan-1', version_number: 2, billing_interval: 'month', adult_allowance: 1, child_allowance: 3 },
    { id: 'v-old', plan_id: 'plan-1', version_number: 1, billing_interval: 'month', adult_allowance: 1, child_allowance: 1 },
    { id: 'v-year', plan_id: 'plan-1', version_number: 3, billing_interval: 'year', adult_allowance: 1, child_allowance: 3 },
  ],
  prices: [price({}), price({ id: 'price-old', plan_version_id: 'v-old' }), price({ id: 'price-year', plan_version_id: 'v-year', billing_interval: 'year', amount_minor: '300000' })],
  entitlements: [
    { plan_version_id: 'v-month', scope_type: 'catalogue', feature_code: null, subject_areas: { name: 'Tajwid' }, products: null },
    { plan_version_id: 'v-month', scope_type: 'product', feature_code: null, subject_areas: null, products: [{ name: 'Arabic year one' }] },
    { plan_version_id: 'v-month', scope_type: 'feature', feature_code: 'offline_downloads', subject_areas: null, products: null },
    { plan_version_id: 'v-month', scope_type: 'feature', feature_code: 'something_new', subject_areas: null, products: null },
  ],
  ...over,
});
const BUYER = { country: null, offlineOn: true, now: NOW };

test('a card is one plan for one period, on its newest version on sale', () => {
  const cards = storefrontOf(read(), BUYER);
  assert.ok(cards);
  assert.deepEqual(cards.map((c) => [c.versionId, c.period, c.children]), [['v-month', 'month', 3], ['v-year', 'year', 3]]);
  assert.deepEqual(cards[0]!.offers.map((o) => o.priceId), ['price-1']);
  assert.deepEqual(cards[1]!.offers.map((o) => o.amount), ['UGX 300000']);
  assert.equal(cards[0]!.name, 'Family');
  assert.equal(cards[0]!.description, 'For a household.');
});

test('what a plan opens is said in sentences the page has, and a stored code is never one', () => {
  const cards = storefrontOf(read(), BUYER)!;
  assert.deepEqual(cards[0]!.includes, [
    { kind: 'subject', name: 'Tajwid' },
    { kind: 'product', name: 'Arabic year one' },
    { kind: 'offline' },
  ]);
  const said = JSON.stringify(cards.map((card) => ({ ...card, offers: card.offers.map((o) => o.amount) })));
  assert.equal(said.includes('something_new'), false);
  assert.equal(said.includes('offline_downloads'), false);
  // Saving lessons is said only while it is switched on.
  const off = storefrontOf(read(), { ...BUYER, offlineOn: false })!;
  assert.deepEqual(off[0]!.includes.map((i) => i.kind), ['subject', 'product']);
});

test('a reply that cannot be trusted is unread, not an empty shop', () => {
  assert.equal(storefrontOf(read({ plans: null }), BUYER), null);
  assert.equal(storefrontOf(read({ versions: 'no' }), BUYER), null);
  assert.equal(storefrontOf(read({ prices: undefined }), BUYER), null);
  assert.equal(storefrontOf(read({ entitlements: [null] }), BUYER), null);
  assert.equal(storefrontOf(read({ plans: [{ id: 'plan-1', name: '' }] }), BUYER), null);
  for (const bad of [{ billing_interval: 'fortnight' }, { adult_allowance: -1 }, { child_allowance: '3' }, { version_number: null }]) {
    const versions = [{ id: 'v-month', plan_id: 'plan-1', version_number: 2, billing_interval: 'month', adult_allowance: 1, child_allowance: 3, ...bad }];
    assert.equal(storefrontOf(read({ versions }), BUYER), null, JSON.stringify(bad));
  }
  // Nothing on sale is an answer, and is not the same thing.
  assert.deepEqual(storefrontOf(read({ plans: [] }), BUYER), []);
  assert.deepEqual(storefrontOf(read({ versions: [] }), BUYER), []);
  // A plan with no price for this buyer is still a card, with nothing to pay.
  assert.deepEqual(storefrontOf(read({ prices: [] }), BUYER)!.map((c) => c.offers.length), [0, 0]);
});

test('the learners a plan can cover are the writer\'s: your own adult profile, and children', () => {
  const learners = [
    { id: 'me', display_name: 'Amina', learner_type: 'adult', linked_user_id: 'user-1' },
    { id: 'spouse', display_name: 'Yusuf', learner_type: 'adult', linked_user_id: 'user-2' },
    { id: 'child', display_name: 'Zayd', learner_type: 'child', linked_user_id: null },
  ];
  assert.deepEqual(learnersFor(learners, { adults: 1, children: 2 }, 'user-1')!.map((l) => l.id), ['me', 'child']);
  assert.deepEqual(learnersFor(learners, { adults: 0, children: 2 }, 'user-1')!.map((l) => l.id), ['child']);
  assert.deepEqual(learnersFor(learners, { adults: 1, children: 0 }, 'user-1')!.map((l) => l.id), ['me']);
  assert.deepEqual(learnersFor(learners, { adults: 0, children: 0 }, 'user-1'), []);
  assert.deepEqual(learnersFor([], { adults: 1, children: 1 }, 'user-1'), []);
  assert.equal(learnersFor(null, { adults: 1, children: 1 }, 'user-1'), null);
  assert.equal(learnersFor([{ id: 'x', display_name: 'X', learner_type: 'robot' }], { adults: 1, children: 1 }, 'user-1'), null);
});

test('what the account already has of a plan follows the writer\'s rule', () => {
  const subs = [
    { plan_id: 'plan-1', status: 'cancelled', current_period_end: '2026-11-01T00:00:00Z' },
    { plan_id: 'plan-2', status: 'pending', current_period_end: null },
  ];
  assert.equal(standingOf(subs, 'plan-1', NOW), null);
  assert.deepEqual(standingOf(subs, 'plan-2', NOW), { kind: 'waiting' });
  // Cancelled but paid up to a later day still stands in the way.
  const paid = [{ plan_id: 'plan-1', status: 'cancelled', current_period_end: '2026-12-01T00:00:00Z' }];
  assert.deepEqual(standingOf(paid, 'plan-1', NOW), { kind: 'live', until: '2026-12-01T00:00:00Z' });
  // A pending one is said first: it is the one that can be cancelled.
  assert.deepEqual(standingOf([...paid, { plan_id: 'plan-1', status: 'pending' }], 'plan-1', NOW), { kind: 'waiting' });
  assert.equal(standingOf(null, 'plan-1', NOW), null);
});

test('every period has a sentence, and none of them says the price repeats', () => {
  assert.deepEqual(Object.keys(PERIOD_KEY).sort(), [...PLAN_PERIODS].sort());
  for (const period of PLAN_PERIODS) {
    const sentence = en[PERIOD_KEY[period]];
    assert.match(sentence, /: \{amount\}$/u, period);
    assert.equal(/\b(per|each|every|monthly|yearly|weekly|renew)/iu.test(sentence), false, sentence);
  }
  assert.match(en['plans.noRenew'], /Nothing is taken again automatically/u);
});
