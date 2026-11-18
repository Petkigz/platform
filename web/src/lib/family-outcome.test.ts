import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FAMILY_SENTENCE,
  addChildCodeOf,
  createFamilyCodeOf,
  familyOutcomeOf,
  familyRefusal,
  familyStatusOf,
  joinFamilyCodeOf,
  leaveFamilyCodeOf,
  type FamilyCode,
} from './family-outcome.ts';
import { en } from './i18n/messages/en.ts';
import { fill } from './i18n/format.ts';

const CODES = Object.keys(FAMILY_SENTENCE) as FamilyCode[];

test('only an answer in the four hundreds that names a known reason is a refusal', () => {
  for (const code of CODES) {
    assert.equal(familyOutcomeOf(familyStatusOf(code), code), code, code);
  }
  // A five hundred is not a refusal whatever it says: something else answered.
  assert.equal(familyOutcomeOf(500, 'not_owner'), 'unconfirmed');
  assert.equal(familyOutcomeOf(503, undefined), 'unconfirmed');
  assert.equal(familyOutcomeOf(502, 'unconfirmed'), 'unconfirmed');
  // A two hundred that did not say `ok` is not a success, and not a refusal.
  assert.equal(familyOutcomeOf(200, 'not_owner'), 'unconfirmed');
  // A reason nobody has heard of, a page from something in front of the
  // site, and the name these routes used to give everything.
  assert.equal(familyOutcomeOf(403, 'forbidden_by_proxy'), 'unconfirmed');
  assert.equal(familyOutcomeOf(404, undefined), 'unconfirmed');
  assert.equal(familyOutcomeOf(400, 'rejected'), 'unconfirmed');
  assert.equal(familyOutcomeOf(400, 'toString'), 'unconfirmed');
  assert.equal(familyOutcomeOf(400, 7), 'unconfirmed');
});

test('each name has one status, and only "unconfirmed" is outside the four hundreds', () => {
  for (const code of CODES) {
    const status = familyStatusOf(code);
    if (code === 'unconfirmed') assert.equal(status, 502);
    else assert.ok(status >= 400 && status <= 499, `${code} answered ${status}`);
  }
  assert.equal(familyStatusOf('signed_out'), 401);
  assert.equal(familyStatusOf('not_owner'), 403);
  assert.equal(familyStatusOf('not_member'), 403);
  assert.equal(familyStatusOf('no_family'), 404);
  assert.equal(familyStatusOf('name_long'), 400);
  assert.equal(familyStatusOf('seat_held'), 409);
  assert.equal(familyStatusOf('declaration_required'), 409);
  assert.deepEqual(familyRefusal('seat_held'), { ok: false, code: 'seat_held', message: FAMILY_SENTENCE.seat_held });
});

test('an error with no SQLSTATE, or a dropped connection, is never a refusal', () => {
  for (const decide of [createFamilyCodeOf, addChildCodeOf, joinFamilyCodeOf, leaveFamilyCodeOf]) {
    assert.equal(decide({ message: 'sign in first' }), 'unconfirmed');
    assert.equal(decide({ message: 'sign in first', code: null }), 'unconfirmed');
    assert.equal(decide({ message: 'sign in first', code: 'PGRST301' }), 'unconfirmed');
    assert.equal(decide({ message: 'sign in first', code: '08006' }), 'unconfirmed');
    assert.equal(decide({ message: 'sign in first', code: '42501' }), 'signed_out');
    // A refusal nobody named is still a refusal: it was rolled back.
    assert.equal(decide({ message: 'permission denied for function', code: '42501' }), 'refused');
    assert.equal(decide({ code: '57014' }), 'refused');
  }
});

test('the English beside a name is the sentence the English page says', () => {
  // The route's English is for a caller with no words; the page's is the
  // catalogue's. Where both exist they are the same sentence, so a reader of
  // the API and a reader of the page are told the same thing.
  const same: Array<[FamilyCode, string]> = [
    ['signed_out', en['family.signedOut']],
    ['name_long', fill(en['family.createNameLong'], { count: 120 })],
    ['name_missing', en['family.childNameMissing']],
    ['band_invalid', en['family.childBandBad']],
    ['no_family', en['family.noFamily']],
    ['not_owner', en['family.childNotOwner']],
    ['declaration_required', fill(en['family.childDeclaration'], { age: 18 })],
    ['not_member', en['family.notMember']],
    ['seat_held', en['family.seatHeld']],
    ['not_here', en['family.notHere']],
    ['refused', en['family.adultRefused']],
  ];
  for (const [code, sentence] of same) assert.equal(FAMILY_SENTENCE[code], sentence, code);
  // No sentence for "unconfirmed" says to try again: a second family and a
  // second child with the same name would both be accepted.
  for (const key of ['family.createUnconfirmed', 'family.childUnconfirmed', 'family.adultUnconfirmed'] as const) {
    assert.match(en[key], /Reload the page/u, key);
    assert.doesNotMatch(en[key], /^Try again|\. Try again/u, key);
  }
});
