import assert from 'node:assert/strict';
import test from 'node:test';

import {
  claimOwnLearnerProfile,
  offeringFromAnswer,
  offeringLabel,
  type Offering,
} from './enrolment.ts';

/**
 * The reader's answer is the only thing between the price the database resolved
 * and the price a person reads. The branching is small and the consequences are
 * not: "no price anywhere" means free, "no price for you" must never mean free,
 * and a paid answer without an amount must never become a charge of zero.
 */

const paid = {
  resolved: true,
  hasLivePrice: true,
  priceId: 'price-1',
  amountMinor: '30000',
  currencyCode: 'UGX',
  billingInterval: 'one_time',
  market: 'UG',
  matched: 'country',
  country: 'UG',
  countrySource: 'account',
  reason: null,
};

test('a resolved price becomes a paid offering, with the amount exact', () => {
  const offering = offeringFromAnswer(paid);
  assert.equal(offering.kind, 'paid');
  if (offering.kind !== 'paid') return;

  assert.equal(offering.price.id, 'price-1');
  assert.equal(offering.price.amount.amountMinor, 30000n);
  assert.equal(offering.price.amount.currency, 'UGX');
  assert.equal(offering.match, 'country');
  assert.equal(offering.country, 'UG');
  assert.equal(offering.countrySource, 'account');
});

test('the default market is named as the default, not as a country match', () => {
  const offering = offeringFromAnswer({ ...paid, market: null, matched: 'default' });
  assert.equal(offering.kind, 'paid');
  if (offering.kind !== 'paid') return;
  assert.equal(offering.match, 'default');
  assert.equal(offering.price.market, null);
});

test('nothing on sale anywhere is free', () => {
  assert.deepEqual(offeringFromAnswer(null), { kind: 'free' });
  assert.deepEqual(offeringFromAnswer({}), { kind: 'free' });
  assert.deepEqual(
    offeringFromAnswer({ resolved: false, hasLivePrice: false, reason: 'no_price' }),
    { kind: 'free' },
  );
  // A course with no published version answers the same way; the enrolment
  // path has its own sentence for that and must not be pre-empted here.
  assert.deepEqual(
    offeringFromAnswer({ resolved: false, hasLivePrice: false, reason: 'course_not_available' }),
    { kind: 'free' },
  );
});

test('a course on sale that this buyer cannot have is not free', () => {
  const offering = offeringFromAnswer({
    resolved: false,
    hasLivePrice: true,
    reason: 'no_price_for_country',
    country: 'TZ',
    countrySource: 'account',
  });

  assert.equal(offering.kind, 'not_sold_here');
  if (offering.kind !== 'not_sold_here') return;
  assert.equal(offering.reason, 'no_price_for_country');
  assert.equal(offering.country, 'TZ');
});

test('a paid answer with no amount never becomes a zero charge', () => {
  for (const answer of [
    { ...paid, amountMinor: undefined },
    { ...paid, currencyCode: undefined },
    { ...paid, priceId: undefined },
    { ...paid, resolved: false },
  ]) {
    const offering = offeringFromAnswer(answer);
    assert.equal(offering.kind, 'not_sold_here', JSON.stringify(answer));
  }
});

test('the source of the country is carried through, and an unknown one is none', () => {
  const hinted = offeringFromAnswer({ ...paid, countrySource: 'request' });
  assert.equal(hinted.kind, 'paid');
  if (hinted.kind === 'paid') assert.equal(hinted.countrySource, 'request');

  const anonymous = offeringFromAnswer({ ...paid, countrySource: 'somewhere' });
  assert.equal(anonymous.kind, 'paid');
  if (anonymous.kind === 'paid') assert.equal(anonymous.countrySource, 'none');
});

test('the label says what kind of thing this is, and never says Free to a sold course', () => {
  const labels: Array<[Offering, string]> = [
    [{ kind: 'free' }, 'Free'],
    [{ kind: 'entitled' }, 'Included in your access'],
    [
      {
        kind: 'not_sold_here',
        reason: 'no_price_for_country',
        country: 'TZ',
      },
      'Not available in your country yet',
    ],
    [
      { kind: 'not_sold_here', reason: 'price_ambiguous', country: 'TZ' },
      'Price needs a correct currency',
    ],
  ];

  for (const [offering, expected] of labels) {
    assert.equal(offeringLabel(offering), expected);
  }

  const offering = offeringFromAnswer(paid);
  assert.match(offeringLabel(offering), /30000/, 'a paid label did not show the amount');
});

// ---------------------------------------------------------------------------
// Becoming a learner
// ---------------------------------------------------------------------------

function claimStub(data: unknown, error: { message: string } | null = null) {
  const calls: string[] = [];
  const client = {
    rpc: async (fn: string) => {
      calls.push(fn);
      return { data, error };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

test('claiming a learner profile is one call and nothing sent with it', async () => {
  const { client, calls } = claimStub({
    learnerProfileId: 'learner-1',
    created: true,
    learnerType: 'adult',
    ageBand: '18+',
  });

  const result = await claimOwnLearnerProfile(client);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.learnerProfileId, 'learner-1');
  assert.equal(result.created, true);
  assert.deepEqual(calls, ['claim_own_learner_profile'],
    'the claim was made by more than the one writer');
});

test('the writer decides whether anything was created', async () => {
  const { client } = claimStub({ learnerProfileId: 'learner-1', created: false });
  const result = await claimOwnLearnerProfile(client);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.created, false, 'a second press claimed a new profile');
});

test('a refusal is shown in the writer’s words, and an unreadable answer is refused', async () => {
  const archived = claimStub(null, {
    message: 'a learner profile for this account was removed, so it cannot be recreated here. Contact us and we will sort it out',
  });
  const refused = await claimOwnLearnerProfile(archived.client);
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.message, /removed/);

  const signedOut = claimStub(null, { message: 'sign in to start learning' });
  const anon = await claimOwnLearnerProfile(signedOut.client);
  assert.equal(anon.ok, false);
  if (!anon.ok) assert.match(anon.message, /Sign in/);

  for (const broken of [{}, { learnerProfileId: '' }, null, 'nonsense']) {
    const stub = claimStub(broken);
    const outcome = await claimOwnLearnerProfile(stub.client);
    assert.equal(outcome.ok, false, `${JSON.stringify(broken)} was accepted`);
  }
});
