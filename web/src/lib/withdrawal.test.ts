import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COURSE_WITHDRAWAL_COUNTRIES,
  describeWithdrawalRule,
  hasCourseWithdrawalRight,
  mapWithdrawalRefusal,
  normaliseWithdrawalOffer,
  recordWithdrawalChoice,
} from './withdrawal.ts';

// The 14-day right is a fact about consumer law, and every way of getting it
// wrong here is silent:
//
//   * a country missing from the list means somebody is never offered the box and
//     is told, by the refund clock, that they have 72 hours;
//   * a malformed offer rendered anyway means a box with no words under it;
//   * a refusal translated as a success means a waiver that was never recorded.

type RpcCall = { fn: string; args: Record<string, unknown> };

function stub(result: { data?: unknown; error?: { message: string } }) {
  const calls: RpcCall[] = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

function offer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    country: 'DE',
    countryKnown: true,
    statutory: true,
    canWaive: true,
    flagOn: true,
    policyVersionId: '5f0f0f4a-6a1f-4f2b-9c1a-2c7d5b0f0a11',
    policyVersionNumber: 2,
    policyInForceFrom: '2026-11-01',
    wording: 'In the European Union you have 14 days…',
    reason: 'offered',
    message: 'You have 14 days to withdraw.',
    ...overrides,
  };
}

test('the country list is the same 31 the database keeps', () => {
  // `supabase/tests/withdrawal_waiver.test.mjs` asserts the database list is 31
  // codes and that Germany, France, the UK, Norway and Iceland are among them, and
  // that Uganda, Kenya, the United States and Nigeria are not. These are the same
  // facts on this side, because the browser cannot call the function.
  assert.equal(COURSE_WITHDRAWAL_COUNTRIES.length, 31);
  assert.equal(new Set(COURSE_WITHDRAWAL_COUNTRIES).size, 31, 'a country appears twice');
  for (const code of COURSE_WITHDRAWAL_COUNTRIES) {
    assert.match(code, /^[A-Z]{2}$/, `${code} is not an ISO 3166-1 alpha-2 code`);
  }
  for (const code of ['DE', 'FR', 'GB', 'NO', 'IS', 'IT', 'ES']) {
    assert.ok(COURSE_WITHDRAWAL_COUNTRIES.includes(code as never), `${code} is missing`);
  }
  for (const code of ['UG', 'KE', 'US', 'NG', 'CH']) {
    assert.ok(!COURSE_WITHDRAWAL_COUNTRIES.includes(code as never), `${code} should not be listed`);
  }
});

test('a country nobody can name keeps the benefit of the doubt', () => {
  assert.equal(hasCourseWithdrawalRight('de'), true, 'a lowercase code was not read');
  assert.equal(hasCourseWithdrawalRight(' DE '), true, 'a padded code was not read');
  assert.equal(hasCourseWithdrawalRight('UG'), false);
  // Unknown is not "no". The cost of the two mistakes is not symmetrical.
  assert.equal(hasCourseWithdrawalRight(null), true);
  assert.equal(hasCourseWithdrawalRight(''), true);
  assert.equal(hasCourseWithdrawalRight('Germany'), true);
});

test('an offer is read strictly, and one that would render an empty box is refused', () => {
  const read = normaliseWithdrawalOffer(offer());
  assert.ok(read);
  assert.equal(read?.canWaive, true);
  assert.equal(read?.policyVersionNumber, 2);
  assert.match(read?.wording ?? '', /14 days/);

  assert.equal(normaliseWithdrawalOffer(null), null);
  assert.equal(normaliseWithdrawalOffer({}), null);
  assert.equal(normaliseWithdrawalOffer(offer({ wording: '' })), null,
    'a box was offered with no words under it');
  assert.equal(normaliseWithdrawalOffer(offer({ canWaive: true, policyVersionId: null })), null,
    'a waiver was offered with no policy version to waive');
  assert.equal(normaliseWithdrawalOffer(offer({ reason: 'because' })), null);
  assert.equal(
    normaliseWithdrawalOffer(offer({ canWaive: false, reason: 'offered' })),
    null,
    'a country with the right was told there is no box, with no reason that explains it',
  );

  const switchedOff = normaliseWithdrawalOffer(offer({
    canWaive: false, reason: 'switched_off', policyVersionId: null,
  }));
  assert.ok(switchedOff, 'the flag being off is a legitimate reason for no box');
});

test('a waiver is recorded with the buyer\'s answer and nothing else', async () => {
  const { client, calls } = stub({
    data: {
      orderId: 'order-1',
      decision: 'waived',
      country: 'DE',
      policyVersionId: '5f0f0f4a-6a1f-4f2b-9c1a-2c7d5b0f0a11',
      statutory: true,
      message: 'The course opens as soon as payment is confirmed.',
    },
  });

  const result = await recordWithdrawalChoice(client, {
    orderId: 'order-1', choice: 'waived', country: 'DE',
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.decision, 'waived');
    assert.equal(result.value.policyVersionId, '5f0f0f4a-6a1f-4f2b-9c1a-2c7d5b0f0a11');
  }
  assert.deepEqual(calls[0], {
    fn: 'record_withdrawal_choice',
    args: { p_order_id: 'order-1', p_accepted: true, p_country: 'DE' },
  });
});

test('leaving the box unticked is sent as a decision, not as silence', async () => {
  const { client, calls } = stub({
    data: { decision: 'retained', country: 'DE', message: 'You keep the 14 days.' },
  });
  await recordWithdrawalChoice(client, { orderId: 'order-2', choice: 'retained' });
  assert.equal(calls[0]?.args.p_accepted, false,
    'an unticked box was sent as though no choice had been made');
});

test('a refusal is never rendered as a recorded choice', async () => {
  const noPolicy = stub({
    error: { message: 'withdrawal:no_policy' },
  });
  const refused = await recordWithdrawalChoice(noPolicy.client, {
    orderId: 'order-3', choice: 'waived',
  });
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.message, /14 days still apply/);

  // An answer that says it worked but does not say what was recorded is not an
  // answer. The buyer is told it did not happen rather than told nothing.
  const shapeless = stub({ data: { ok: true } });
  const unreadable = await recordWithdrawalChoice(shapeless.client, {
    orderId: 'order-4', choice: 'waived',
  });
  assert.equal(unreadable.ok, false);
});

test('each database refusal has a sentence, and an unknown one still says where things stand', () => {
  assert.match(mapWithdrawalRefusal('withdrawal:already_paid'), /Ask us for a refund/);
  assert.match(mapWithdrawalRefusal('withdrawal:not_your_order'), /Only the person paying/);
  assert.match(mapWithdrawalRefusal('withdrawal:no_policy'), /published refunds policy/);
  assert.match(mapWithdrawalRefusal('some other error'), /nothing has been charged/);
  // The key is read out of a longer Postgres message, not off the start of it.
  assert.match(
    mapWithdrawalRefusal('ERROR: withdrawal:not_applicable (SQLSTATE P0001)'),
    /no 14-day right to waive/,
  );
});

test('the rule an order is on is said in words, and an unknown rule says nothing', () => {
  assert.match(describeWithdrawalRule('statutory_14_days'), /14 days by law/);
  assert.match(describeWithdrawalRule('waived_policy_window'), /you asked us to start immediately/);
  assert.match(describeWithdrawalRule('policy_window'), /72-hour window/);
  assert.equal(describeWithdrawalRule(null), '');
  assert.equal(describeWithdrawalRule('something_new'), '');
});
