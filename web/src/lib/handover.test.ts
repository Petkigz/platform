import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  HANDOVER_DECLARATION,
  HANDOVER_EXPLAINER,
  HANDOVER_OPTIONS,
  confirmSentence,
  describeHandoverError,
  describeOutcome,
  parseHandoverOutcome,
  type HandoverOutcome,
} from './handover.ts';

const outcome = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  status: 'completed',
  decision: 'keep',
  learnerProfileId: '3c1f0000-0000-4000-8000-000000000001',
  requestedAs: 'self',
  becameOwnAccount: '9d8e0000-0000-4000-8000-000000000002',
  leftFamily: true,
  deletionDue: null,
  ...over,
});

test('nothing is read as done unless the database says it is done', () => {
  assert.ok(parseHandoverOutcome(outcome()));
  assert.equal(parseHandoverOutcome(outcome({ status: 'requested' })), null);
  assert.equal(parseHandoverOutcome(outcome({ decision: 'archive' })), null);
  assert.equal(parseHandoverOutcome(outcome({ requestedAs: 'staff' })), null);
  assert.equal(parseHandoverOutcome(null), null);
  assert.equal(parseHandoverOutcome({}), null);
});

test('the outcome says what happened to the record, in the past tense', () => {
  const kept = parseHandoverOutcome(outcome())!;
  assert.match(describeOutcome(kept), /theirs/);
  assert.match(describeOutcome(kept), /left the family/);

  const deleted = parseHandoverOutcome(
    outcome({ decision: 'delete', becameOwnAccount: null, leftFamily: false, deletionDue: '2026-12-02' }),
  )!;
  assert.match(describeOutcome(deleted), /deleted on 2026-12-02/);
  assert.match(describeOutcome(deleted), /nothing changes/);
});

test('each decision says what it does to the work, before it is taken', () => {
  assert.equal(HANDOVER_OPTIONS.length, 2);
  const keep = HANDOVER_OPTIONS.find((o) => o.value === 'keep')!;
  const drop = HANDOVER_OPTIONS.find((o) => o.value === 'delete')!;

  assert.match(keep.effect, /progress, hand-ins and certificates stay/);
  assert.match(keep.effect, /login first/, 'keeping a record with no account is not explained');
  assert.match(drop.effect, /thirty days/);
  assert.match(drop.effect, /certificate already issued/);

  // The words are a statement, not a claim that anything was checked.
  assert.match(HANDOVER_DECLARATION, /I confirm this learner is 18 or older/);
  assert.match(HANDOVER_DECLARATION, /does not hold a date of birth to check it against/);
  assert.match(HANDOVER_EXPLAINER, /never stores a date of birth/);
});

test('the confirmation repeats the sentence, in the same words', () => {
  assert.match(confirmSentence('keep', 'Yusuf'), /Yusuf becomes an adult learner/);
  assert.match(confirmSentence('keep', 'Yusuf'), /cannot be undone/);
  assert.match(confirmSentence('delete', 'Yusuf'), /deleted thirty days from today/);
});

test('every refusal is a sentence somebody can act on', () => {
  assert.match(describeHandoverError('handover:declaration_required'), /tick the box/);
  assert.match(describeHandoverError('handover:needs_an_account'), /Make them a login first/);
  assert.match(describeHandoverError('handover:not_a_child'), /nothing to hand over/);
  assert.match(describeHandoverError('handover:not_allowed'), /Only the learner/);
  assert.match(describeHandoverError('handover:not_active'), /on its way out/);
  assert.match(
    describeHandoverError('this learning holds a seat on a family plan, so it cannot leave'),
    /seat on a family plan/);
  assert.match(describeHandoverError('boom'), /nothing was changed/);
});

test('the page asks the family, and the route never names an actor', () => {
  const page = readFileSync(new URL('../app/handover/page.tsx', import.meta.url), 'utf8');
  const route = readFileSync(new URL('../app/api/handover/route.ts', import.meta.url), 'utf8');
  const family = readFileSync(new URL('../app/family/page.tsx', import.meta.url), 'utf8');

  assert.ok(page.includes('learner_profiles'), 'the page does not list the learners it can act on');
  assert.ok(page.includes('HandoverForm'), 'the page has no form');
  assert.ok(page.includes('/policies/children'), 'the page does not point at the policy it changes');

  // The database decides who may ask; the route must not pass a user id.
  assert.ok(route.includes('request_learner_handover'), 'the route calls no handover function');
  assert.ok(!/p_requested_by|requestedBy|p_actor/.test(route),
    'the route sends an actor, which is how one person acts as another');
  assert.match(route, /p_declares_adult: true/,
    'the route does not pass the statement the database requires');

  assert.ok(family.includes('/handover'), 'the family page never offers the handover');
});

test('the handover keeps the outcome honest when the payload is the wrong shape', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({ ok: true, outcome: { status: 'completed', decision: 'keep' } }),
  })) as unknown as typeof fetch;

  const { requestHandover } = await import('./handover.ts');
  const result = await requestHandover({
    learnerId: '3c1f0000-0000-4000-8000-000000000001',
    decision: 'keep',
    declaresAdult: true,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /will not trust/);

  globalThis.fetch = original;
});

test('a kept record and a deleted one are different shapes of outcome', () => {
  const keep: HandoverOutcome = parseHandoverOutcome(outcome())!;
  const drop: HandoverOutcome = parseHandoverOutcome(outcome({
    decision: 'delete',
    becameOwnAccount: null,
    deletionDue: '2026-12-02',
  }))!;

  assert.equal(keep.becameOwnAccount === null, false);
  assert.equal(drop.becameOwnAccount, null);
  assert.notEqual(describeOutcome(keep), describeOutcome(drop));
});
