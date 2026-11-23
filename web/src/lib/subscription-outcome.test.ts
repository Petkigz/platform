import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import {
  SUBSCRIPTION_ENGLISH,
  SUBSCRIPTION_OUTCOMES,
  UNPAID_CANCEL_REASON,
  subscriptionOutcomeOf,
  subscriptionReasonOf,
  subscriptionSentenceReason,
  subscriptionStatusOf,
} from './subscription-outcome.ts';

const MIGRATIONS = new URL('../../../supabase/migrations/', import.meta.url);

/** The newest definition of a function in the migrations. */
function newest(name: string): string {
  const files = readdirSync(MIGRATIONS).filter((file) => file.endsWith('.sql')).sort();
  let found = '';
  for (const file of files) {
    const sql = readFileSync(new URL(file, MIGRATIONS), 'utf8');
    const at = sql.lastIndexOf(`create or replace function public.${name}(`);
    if (at === -1) continue;
    const end = sql.indexOf('\n$$;', at);
    assert.notEqual(end, -1, `${file}: ${name} has no end`);
    found = sql.slice(at, end);
  }
  assert.notEqual(found, '', `no migration defines ${name}`);
  return found;
}

/** Every sentence a function raises. A sentence may run over two lines. */
const raised = (name: string): string[] =>
  [...newest(name).matchAll(/raise exception\s+'([^']+)'/gu)].map((m) => m[1]!);

test('every sentence the two writers, their helper and their trigger raise has a name', () => {
  const named = (name: string) => Object.fromEntries(raised(name).map((s) => [s, subscriptionSentenceReason(s)]));
  assert.deepEqual(named('cancel_subscription'), {
    'sign in to cancel a subscription': 'not_signed_in',
    'a written cancellation reason is required': 'reason_required',
    'subscription % not found': 'not_yours',
    'you do not have permission to cancel this subscription': 'not_yours',
  });
  assert.deepEqual(named('allocate_subscription_learner'), {
    'sign in to allocate a learner': 'not_signed_in',
    'that subscription is not active': 'not_running',
    'you are not a member of this billing account': 'not_yours',
    'that learner profile is not available': 'learner_not_yours',
    'an adult slot may only be assigned to your own learner profile': 'learner_not_yours',
    'only an active family member may select this child': 'learner_not_yours',
  });
  assert.deepEqual(named('grant_subscription_plan_entitlements'), {
    'only an active subscription can grant plan access': 'not_running',
  });
  assert.deepEqual(named('enforce_family_slot_capacity'), {
    'plan version % allows % % slot(s); % already allocated': 'no_slot',
  });
});

test('a full place is recognised as the database sends it, with the ids and numbers filled in', () => {
  assert.equal(
    subscriptionSentenceReason('plan version 5d0c1a3e-7b9f-4f0e-9a51-0c7f6f0f2b11 allows 1 child slot(s); 1 already allocated'),
    'no_slot',
  );
  assert.equal(subscriptionSentenceReason('subscription 5d0c1a3e-7b9f-4f0e-9a51-0c7f6f0f2b11 not found'), 'not_yours');
  assert.equal(subscriptionSentenceReason('new row violates check constraint'), null);
  assert.equal(subscriptionSentenceReason(null), null);
});

test('the database’s answer is a refusal; anything else is unconfirmed', () => {
  assert.equal(subscriptionReasonOf({ code: '23514', message: 'that subscription is not active' }), 'not_running');
  assert.equal(subscriptionReasonOf({ code: '42501', message: 'subscription state changes must use the subscription workflow' }), 'refused');
  assert.equal(subscriptionReasonOf({ code: '23514', message: 'something nobody named' }), 'refused');
  // No SQLSTATE, or a connection that broke: the change may have been made.
  assert.equal(subscriptionReasonOf({ message: 'fetch failed' }), 'unconfirmed');
  assert.equal(subscriptionReasonOf({ code: '08006', message: 'that subscription is not active' }), 'unconfirmed');
  assert.equal(subscriptionReasonOf({ code: 'PGRST301', message: 'JWT expired' }), 'unconfirmed');
});

test('each reason has one status, and a form believes a reason only with its own', () => {
  assert.deepEqual(Object.fromEntries(SUBSCRIPTION_OUTCOMES.map((r) => [r, subscriptionStatusOf(r)])), {
    not_signed_in: 401,
    malformed: 400,
    reason_required: 400,
    not_yours: 403,
    learner_not_yours: 403,
    not_running: 409,
    no_slot: 409,
    refused: 500,
    unconfirmed: 502,
  });
  for (const reason of SUBSCRIPTION_OUTCOMES) {
    assert.equal(subscriptionOutcomeOf(subscriptionStatusOf(reason), reason), reason);
  }
  assert.equal(subscriptionOutcomeOf(200, 'no_slot'), 'unconfirmed');
  assert.equal(subscriptionOutcomeOf(500, 'no_slot'), 'unconfirmed');
  assert.equal(subscriptionOutcomeOf(409, 'something_new'), 'unconfirmed');
  assert.equal(subscriptionOutcomeOf(409, null), 'unconfirmed');
});

test('the English beside each reason is the route’s own, and the unpaid reason is one the writer takes', () => {
  assert.deepEqual(Object.keys(SUBSCRIPTION_ENGLISH).sort(), [...SUBSCRIPTION_OUTCOMES].sort());
  for (const sentence of Object.values(SUBSCRIPTION_ENGLISH)) {
    // Not one of the writers' own sentences, and nothing with an id in it.
    assert.equal(subscriptionSentenceReason(sentence), null, sentence);
    assert.doesNotMatch(sentence, /[0-9a-f]{8}-|slot\(s\)|plan version/iu);
  }
  // Only a refusal that changed nothing says nothing was changed.
  assert.match(SUBSCRIPTION_ENGLISH.refused, /Nothing was changed/u);
  assert.doesNotMatch(SUBSCRIPTION_ENGLISH.unconfirmed, /Nothing was changed|try again\.$/u);
  // The writer trims the reason and refuses an empty one; the route allows 500 characters.
  assert.equal(UNPAID_CANCEL_REASON, UNPAID_CANCEL_REASON.trim());
  assert.ok(UNPAID_CANCEL_REASON.length > 0 && UNPAID_CANCEL_REASON.length <= 500);
});
