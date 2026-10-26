import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TIER_CHOICES,
  featureLabel,
  tierChangeBlocked,
  tierRuleExplanation,
  tierSavedMessage,
} from './plan-features.ts';

const offline = {
  featureCode: 'offline_downloads',
  minTier: 'plus' as const,
  blockingPlans: null,
};
const lowered = {
  featureCode: 'offline_downloads',
  minTier: 'basic' as const,
  blockingPlans: 'family-monthly',
};

test('a known feature is named, an unknown one is shown as its code', () => {
  assert.equal(featureLabel('offline_downloads'), 'Offline downloads');
  assert.equal(featureLabel('some_future_feature'), 'some_future_feature');
});

test('lowering is never blocked', () => {
  assert.equal(tierChangeBlocked(offline, 'basic'), null);
});

test('raising is allowed when no Basic plan grants the feature', () => {
  assert.equal(tierChangeBlocked({ ...lowered, blockingPlans: null }, 'plus'), null);
});

test('raising is blocked while a Basic plan grants it, and the plan is named', () => {
  const note = tierChangeBlocked(lowered, 'plus');

  assert.ok(note, 'the block was not reported');
  assert.match(note!, /plan family-monthly/);
  assert.match(note!, /offline downloads/i);
});

test('several blocking plans are listed, and the sentence stays grammatical', () => {
  const note = tierChangeBlocked({ ...lowered, blockingPlans: 'a-plan, b-plan' }, 'plus');

  assert.match(note!, /plans a-plan, b-plan/);
});

test('raising a rule that is already Plus is not blocked', () => {
  assert.equal(tierChangeBlocked(offline, 'plus'), null);
});

test('the explanation says what the current rule means, not what the column is', () => {
  assert.match(tierRuleExplanation(offline), /Only a Plus plan can carry offline downloads/);
  assert.match(tierRuleExplanation(lowered), /Moving the requirement to Plus would be refused/);
  assert.match(
    tierRuleExplanation({ ...lowered, blockingPlans: null }),
    /Any plan may carry offline downloads/,
  );
});

test('a saved change says what changed; an unchanged one says it was already so', () => {
  assert.equal(
    tierSavedMessage({ featureCode: 'offline_downloads', minTier: 'plus', changed: true }),
    'Offline downloads now needs Plus.',
  );
  assert.equal(
    tierSavedMessage({ featureCode: 'offline_downloads', minTier: 'plus', changed: false }),
    'Offline downloads already needed Plus.',
  );
});

test('the form offers both shelves and nothing else', () => {
  assert.deepEqual(TIER_CHOICES.map((c) => c.value), ['basic', 'plus']);
});
