import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adultCardExplanationKey,
  adultCardHeadingKey,
  adultFamilyState,
  canJoinFamily,
  joinButtonKey,
  joinOutcomeKey,
  joinOutcomeOf,
  LEAVE_NOTE_KEY,
} from './family-adult.ts';
import { en } from './i18n/messages/en.ts';

// The sentences live in the catalogue; this module chooses which. Each test
// below reads the English the name stands for, so what a reader is told is
// still pinned, and a name that is not in the catalogue fails to compile.
const adultCardExplanation = (state: Parameters<typeof adultCardExplanationKey>[0]) =>
  en[adultCardExplanationKey(state)];
const adultCardHeading = (state: Parameters<typeof adultCardHeadingKey>[0]) =>
  en[adultCardHeadingKey(state)];
const joinButtonLabel = (state: Parameters<typeof joinButtonKey>[0]) => en[joinButtonKey(state)];
const joinOutcomeMessage = (result: { created: boolean; joined: boolean }) =>
  en[joinOutcomeKey(result)];
const LEAVE_NOTE = en[LEAVE_NOTE_KEY];

const FAMILY = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

test('no profile at all is its own state, not "alone"', () => {
  assert.equal(adultFamilyState(null, FAMILY), 'no-profile');
});

test('a profile in this family is in-family', () => {
  assert.equal(adultFamilyState({ id: 'p', displayName: 'Me', familyId: FAMILY }, FAMILY), 'in-family');
});

test('a profile outside any family is alone', () => {
  assert.equal(adultFamilyState({ id: 'p', displayName: 'Me', familyId: null }, FAMILY), 'alone');
});

test('a profile in another family is not offered this one', () => {
  const state = adultFamilyState({ id: 'p', displayName: 'Me', familyId: OTHER }, FAMILY);

  assert.equal(state, 'other-family');
  assert.equal(canJoinFamily(state), false, 'a person in another family was offered a join button');
});

test('the button appears only where joining is possible', () => {
  assert.equal(canJoinFamily('no-profile'), true);
  assert.equal(canJoinFamily('alone'), true);
  assert.equal(canJoinFamily('in-family'), false);
});

test('joining moves an existing profile, and the sentence says nothing is lost', () => {
  const line = adultCardExplanation('alone');

  assert.match(line, /moves your existing learning into it/);
  assert.match(line, /Nothing is copied and nothing is lost/);
});

test('somebody with no profile is told the family will see their progress', () => {
  assert.match(adultCardExplanation('no-profile'), /other adults in the family will be able to see it/);
});

test('the "other family" explanation does not promise a button', () => {
  const line = adultCardExplanation('other-family');

  assert.match(line, /one family at a time/);
  assert.doesNotMatch(line, /Joining/);
});

test('the label distinguishes moving from creating', () => {
  assert.equal(joinButtonLabel('alone'), 'Move my learning into this family');
  assert.equal(joinButtonLabel('no-profile'), 'Learn here as myself');
});

test('every state has its own heading, so the page never repeats itself', () => {
  const headings = (['in-family', 'alone', 'other-family', 'no-profile'] as const)
    .map((s) => adultCardHeading(s));

  assert.equal(new Set(headings).size, 4);
});

test('the leave note warns about the seat before the click', () => {
  assert.match(LEAVE_NOTE, /keeps every course/);
  assert.match(LEAVE_NOTE, /release that seat first/);
});

test('the outcome distinguishes a move from a creation from a no-op', () => {
  assert.match(joinOutcomeMessage({ created: false, joined: true }), /moved into this family/);
  assert.match(joinOutcomeMessage({ created: true, joined: false }), /now a learner in this family/);
  assert.match(joinOutcomeMessage({ created: false, joined: false }), /already learns/);
});

test('a named learner gets the heading with a place for the name, and only when they learn here', () => {
  assert.equal(adultCardHeadingKey('in-family', true), 'family.adultHeadInNamed');
  assert.match(en['family.adultHeadInNamed'], /\{name\}/);
  for (const state of ['alone', 'other-family', 'no-profile'] as const) {
    assert.equal(adultCardHeadingKey(state, true), adultCardHeadingKey(state, false),
      `${state} put a name on a card that is not about where they learn`);
  }
});

test('the outcome has a name the card can keep without a sentence', () => {
  assert.equal(joinOutcomeOf({ created: false, joined: true }), 'moved');
  assert.equal(joinOutcomeOf({ created: true, joined: false }), 'created');
  assert.equal(joinOutcomeOf({ created: true, joined: true }), 'moved');
  assert.equal(joinOutcomeOf({ created: false, joined: false }), 'already');
});
