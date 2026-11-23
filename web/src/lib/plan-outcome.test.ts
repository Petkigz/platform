import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import { checkoutStatusOf } from './checkout-outcome.ts';
import {
  PLAN_ENGLISH,
  PLAN_OUTCOMES,
  PLAN_REASONS,
  leavesPlanWaiting,
  planOutcomeOf,
  planReasonOf,
  planSentenceReason,
  planStatusOf,
} from './plan-outcome.ts';

const MIGRATIONS = new URL('../../../supabase/migrations/', import.meta.url);

/** The newest definition of `create_plan_order()` in the migrations. */
function writerSource(): string {
  const files = readdirSync(MIGRATIONS).filter((name) => name.endsWith('.sql')).sort();
  let found = '';
  for (const name of files) {
    const sql = readFileSync(new URL(name, MIGRATIONS), 'utf8');
    const at = sql.lastIndexOf('create or replace function public.create_plan_order(');
    if (at === -1) continue;
    const end = sql.indexOf('\n$$;', at);
    assert.notEqual(end, -1, `${name}: create_plan_order has no end`);
    found = sql.slice(at, end);
  }
  assert.notEqual(found, '', 'no migration defines create_plan_order');
  return found;
}

test('every sentence create_plan_order raises has a name', () => {
  const raised = [...writerSource().matchAll(/raise exception '([^']+)'/gu)].map((m) => m[1]!);
  // Twelve today. A thirteenth is somebody adding a refusal: it needs a name
  // here and a sentence on the page before this number moves.
  assert.equal(raised.length, 12, raised.join(' | '));
  for (const sentence of raised) {
    const reason = planSentenceReason(sentence);
    assert.notEqual(reason, null, `no name for: ${sentence}`);
    assert.notEqual(reason, 'refused', sentence);
  }
  const named = Object.fromEntries(raised.map((sentence) => [sentence, planSentenceReason(sentence)]));
  assert.deepEqual(named, {
    'sign in to start a subscription': 'not_signed_in',
    'checkout:disabled': 'disabled',
    'you cannot pay from that billing account': 'account_not_yours',
    'that plan version is not currently available': 'plan_not_available',
    'that price is not currently available for this plan version': 'price_not_available',
    'that price is not available in the billing account country': 'price_not_available',
    'that learner profile is not available': 'learner_not_yours',
    'this plan has no adult learner slots': 'no_slot',
    'an adult subscription slot may only be assigned to your own learner profile': 'learner_not_yours',
    'this plan has no child learner slots': 'no_slot',
    'only an active family member may select this child': 'learner_not_yours',
    'this billing account already has a pending or unexpired subscription to that plan': 'already_subscribed',
  });
});

test('a profile that does not exist and one that is somebody else\'s are one answer', () => {
  // Told apart, the page would confirm to a stranger that an id is a profile.
  assert.equal(planSentenceReason('that learner profile is not available'), 'learner_not_yours');
  assert.equal(planSentenceReason('only an active family member may select this child'), 'learner_not_yours');
  assert.equal(planStatusOf('learner_not_yours'), 403);
});

test('the database\'s answer is a refusal; anything else is unconfirmed', () => {
  assert.equal(planReasonOf({ code: '42501', message: 'checkout:disabled' }), 'disabled');
  assert.equal(planReasonOf({ code: 'P0001', message: 'a sentence nobody named' }), 'refused');
  assert.equal(planReasonOf({ code: '42501', message: null }), 'refused');
  // Not a SQLSTATE, or the connection class: an order may have been written.
  for (const error of [{}, { code: null }, { code: '' }, { code: 'PGRST301' }, { code: '08006' }, { code: '08P01' }, { message: 'checkout:disabled' }]) {
    assert.equal(planReasonOf(error), 'unconfirmed', JSON.stringify(error));
  }
});

test('each reason has one status, and shares it with the course checkout where the reason is shared', () => {
  assert.deepEqual(
    Object.fromEntries(PLAN_OUTCOMES.map((reason) => [reason, planStatusOf(reason)])),
    {
      plan_not_available: 404,
      price_not_available: 409,
      no_slot: 409,
      already_subscribed: 409,
      account_not_yours: 403,
      learner_not_yours: 403,
      not_signed_in: 401,
      disabled: 503,
      malformed: 400,
      learner_required: 400,
      phone_invalid: 400,
      provider_unavailable: 503,
      provider_failed: 502,
      refused: 500,
      unconfirmed: 502,
    },
  );
  for (const reason of ['not_signed_in', 'disabled', 'malformed', 'learner_required', 'phone_invalid', 'provider_unavailable', 'provider_failed', 'refused', 'unconfirmed'] as const) {
    assert.equal(planStatusOf(reason), checkoutStatusOf(reason), reason);
  }
  assert.equal(new Set(PLAN_OUTCOMES).size, PLAN_OUTCOMES.length);
  assert.equal(PLAN_OUTCOMES.length, PLAN_REASONS.length + 9);
});

test('the form believes a reason only when it arrives with its own status', () => {
  for (const reason of PLAN_OUTCOMES) assert.equal(planOutcomeOf(planStatusOf(reason), reason), reason);
  assert.equal(planOutcomeOf(500, 'already_subscribed'), 'unconfirmed');
  assert.equal(planOutcomeOf(409, 'plan_not_available'), 'unconfirmed');
  assert.equal(planOutcomeOf(409, 'made_up'), 'unconfirmed');
  assert.equal(planOutcomeOf(409, undefined), 'unconfirmed');
  assert.equal(planOutcomeOf(409, { toString: () => 'refused' }), 'unconfirmed');
  // A course-only reason is not a plan's.
  assert.equal(planOutcomeOf(409, 'already_owned'), 'unconfirmed');
});

test('an order is said to be waiting only when the reply named one and is believed', () => {
  assert.equal(leavesPlanWaiting('provider_failed', 'order-1'), true);
  assert.equal(leavesPlanWaiting('provider_unavailable', 'order-1'), true);
  assert.equal(leavesPlanWaiting('provider_unavailable', undefined), false);
  assert.equal(leavesPlanWaiting('provider_failed', ''), false);
  assert.equal(leavesPlanWaiting('unconfirmed', 'order-1'), false);
  assert.equal(leavesPlanWaiting('provider_failed', 7), false);
});

test('the English beside each reason is not the database\'s, and does not say "try again" where that would be refused', () => {
  const source = writerSource();
  for (const reason of PLAN_OUTCOMES) {
    const sentence = PLAN_ENGLISH[reason];
    assert.ok(sentence.length > 10, reason);
    assert.equal(source.includes(`'${sentence}'`), false, reason);
    assert.equal(/checkout:|billing_account|plan version|slot/iu.test(sentence), false, `${reason}: ${sentence}`);
  }
  // After a plan order exists, the same request is refused until it is cancelled.
  assert.equal(/try again/iu.test(PLAN_ENGLISH.provider_failed), false);
  assert.equal(/try again/iu.test(PLAN_ENGLISH.provider_unavailable), false);
});
