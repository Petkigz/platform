import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  HANDOVER_DECLARATION,
  confirmSentence,
  describeOutcome,
  handoverCodeOf,
  handoverReasonOf,
  handoverWords,
  parseHandoverOutcome,
  type HandoverOutcome,
} from './handover.ts';
import { formatDay, translator } from './i18n/index.ts';

// The sentences are the catalogue's since 2026-11-25. These are the English ones,
// which is what the page hands the form when the reader reads English.
const english = handoverWords(translator('en'), true);
const arabic = handoverWords(translator('ar'), false);
const day = (code: string) => (value: string) => formatDay(code, value);

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
  assert.match(describeOutcome(kept, english, day('en')), /theirs/);
  assert.match(describeOutcome(kept, english, day('en')), /left the family/);

  const deleted = parseHandoverOutcome(
    outcome({ decision: 'delete', becameOwnAccount: null, leftFamily: false, deletionDue: '2026-12-02' }),
  )!;
  assert.match(describeOutcome(deleted, english, day('en')), /deleted on Dec 2, 2026/);
  assert.match(describeOutcome(deleted, english, day('en')), /nothing changes/);

  // The date is written in the reader's calendar and digits, not pasted in as it was stored.
  const inArabic = describeOutcome(deleted, arabic, day('ar'));
  assert.doesNotMatch(inArabic, /2026-12-02|\{date\}/);
  assert.match(inArabic, /ديسمبر/);

  // A date nobody can write is left out, and the sentence that needs none is said.
  const undated = parseHandoverOutcome(
    outcome({ decision: 'delete', becameOwnAccount: null, leftFamily: false, deletionDue: 'soon' }),
  )!;
  assert.equal(describeOutcome(undated, english, day('en')), english.doneDrop);
  assert.match(english.doneDrop, /thirty days from today/);
});

test('each decision says what it does to the work, before it is taken', () => {
  assert.match(english.keepMeans, /progress, hand-ins and certificates stay/);
  assert.match(english.keepMeans, /login first/, 'keeping a record with no account is not explained');
  assert.match(english.dropMeans, /thirty days/);
  assert.match(english.dropMeans, /certificate already issued/);

  // The words are a statement, not a claim that anything was checked.
  assert.match(HANDOVER_DECLARATION, /I confirm this learner is 18 or older/);
  assert.match(HANDOVER_DECLARATION, /does not hold a date of birth to check it against/);
  assert.match(translator('en')('handover.explainer'), /never stores a date of birth/);
});

test('the statement is English on every page, and a reader of another language is told why', () => {
  const form = readFileSync(new URL('../app/handover/handover-form.tsx', import.meta.url), 'utf8');
  assert.match(form, /<span lang="en" dir="ltr">\{HANDOVER_DECLARATION\}<\/span>/,
    'the statement is not marked as English, so a right-to-left page lays it out backwards');
  assert.equal(english.declarationNote, '', 'an English page explains why its statement is in English');
  assert.notEqual(arabic.declarationNote, '');
  // The statement is not in the catalogue: nothing there can translate it by accident.
  const catalogue = readFileSync(new URL('./i18n/messages/en.ts', import.meta.url), 'utf8');
  assert.ok(!catalogue.includes('I confirm this learner is 18 or older'));
});

test('the confirmation repeats the sentence, in the same words', () => {
  assert.match(confirmSentence('keep', 'Yusuf', english), /Yusuf becomes an adult learner/);
  assert.match(confirmSentence('keep', 'Yusuf', english), /cannot be undone/);
  assert.match(confirmSentence('delete', 'Yusuf', english), /deleted thirty days from today/);
  for (const words of [english, arabic]) {
    for (const decision of ['keep', 'delete'] as const) {
      const said = confirmSentence(decision, 'يوسف', words);
      assert.ok(said.includes('يوسف'), 'the name is missing from the confirmation');
      assert.doesNotMatch(said, /\{name\}/);
    }
  }
});

test('every refusal is a sentence somebody can act on', () => {
  const say = (message: string) => english.refusals[handoverReasonOf(message)];
  assert.match(say('handover:declaration_required'), /tick the box/);
  assert.match(say('handover:needs_an_account'), /Make them a login first/);
  assert.match(say('handover:not_a_child'), /nothing to hand over/);
  assert.match(say('handover:not_allowed'), /Only the learner/);
  assert.match(say('handover:not_active'), /on its way out/);
  assert.match(say('handover:already_requested'), /already a request/);
  assert.match(say('this learning holds a seat on a family plan, so it cannot leave'), /seat on the family plan/);
  assert.match(say('boom'), /nothing was changed/);
});

test('only a reply that names its reason is a refusal; anything else is not known', () => {
  assert.equal(handoverCodeOf(422, 'needs_an_account'), 'needs_an_account');
  assert.equal(handoverCodeOf(400, 'refused'), 'refused');
  assert.equal(handoverCodeOf(401, 'refused'), 'refused');
  // No name, a name nobody has heard of, a name a page cannot send, or a five hundred.
  assert.equal(handoverCodeOf(422, undefined), 'unconfirmed');
  assert.equal(handoverCodeOf(422, 'handover:needs_an_account'), 'unconfirmed');
  assert.equal(handoverCodeOf(422, 'unconfirmed'), 'unconfirmed');
  assert.equal(handoverCodeOf(422, 'toString'), 'unconfirmed');
  assert.equal(handoverCodeOf(500, 'refused'), 'unconfirmed');
  assert.equal(handoverCodeOf(502, undefined), 'unconfirmed');
  assert.equal(handoverCodeOf(200, 'refused'), 'unconfirmed');
  assert.match(english.refusals.unconfirmed, /could not confirm/);
  assert.match(english.refusals.unconfirmed, /before trying again/);

  // Every refusal the route makes names its reason, and no sentence of the route's is shown.
  const route = readFileSync(new URL('../app/api/handover/route.ts', import.meta.url), 'utf8');
  const refusals = route.match(/NextResponse\.json\(\s*\{ error:[^}]*\}/g) ?? [];
  assert.equal(refusals.length, 7);
  for (const refusal of refusals) assert.match(refusal, /code: /, refusal);
  const form = readFileSync(new URL('../app/handover/handover-form.tsx', import.meta.url), 'utf8');
  assert.match(form, /words\.refusals\[result\.code\]/);
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
  // It answered 200 and may well be done: the reader is sent to look, not told it failed.
  if (!result.ok) assert.equal(result.code, 'unconfirmed');

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
  assert.notEqual(describeOutcome(keep, english, day('en')), describeOutcome(drop, english, day('en')));
});
