import assert from 'node:assert/strict';
import test from 'node:test';
import { checkReviewer } from './reviewer-guard.mjs';

test('only the owner as sole required reviewer permits the deployment job', () => {
  const env = { name: 'ayahspring-worker-test', protection_rules: [{ type: 'required_reviewers', reviewers: [{ type: 'User', reviewer: { id: 112956517, login: 'Petkigz' } }] }] };
  assert.doesNotThrow(() => checkReviewer(env));
  for (const change of [
    (x) => { x.name = 'other'; },
    (x) => { x.protection_rules = []; },
    (x) => { x.protection_rules[0].reviewers[0].reviewer.id = 1; },
    (x) => { x.protection_rules[0].reviewers.push({ type: 'User', reviewer: { id: 1, login: 'other' } }); },
  ]) {
    const altered = structuredClone(env); change(altered); assert.throws(() => checkReviewer(altered));
  }
});
