import assert from 'node:assert/strict';
import test from 'node:test';

import { childLoginOutcomeOf } from './child-login-outcome.ts';

test('a refusal is a four hundred that names a reason the card has words for', () => {
  assert.equal(childLoginOutcomeOf(401, 'signed_out'), 'signed_out');
  assert.equal(childLoginOutcomeOf(400, 'username_chars'), 'username_chars');
  assert.equal(childLoginOutcomeOf(400, 'password_short'), 'password_short');
  assert.equal(childLoginOutcomeOf(400, 'under_twelve'), 'under_twelve');
  assert.equal(childLoginOutcomeOf(400, 'confirm_twelve'), 'confirm_twelve');
  assert.equal(childLoginOutcomeOf(415, 'malformed'), 'malformed');
  assert.equal(childLoginOutcomeOf(400, 'no_child'), 'no_child');
});

test('the database’s own names are said by the card’s', () => {
  assert.equal(childLoginOutcomeOf(409, 'child_login:verified_guardian_required'), 'guardian_required');
  assert.equal(childLoginOutcomeOf(409, 'child_login:not_your_child'), 'not_your_child');
  assert.equal(childLoginOutcomeOf(409, 'child_login:no_login'), 'no_login');
});

test('a server with no key never tried, and only a 503 may say so', () => {
  assert.equal(childLoginOutcomeOf(503, 'child_login_unavailable'), 'unavailable');
  assert.equal(childLoginOutcomeOf(503, 'reset_unavailable'), 'reset_unavailable');
  assert.equal(childLoginOutcomeOf(200, 'child_login_unavailable'), 'unconfirmed');
  assert.equal(childLoginOutcomeOf(400, 'reset_unavailable'), 'unconfirmed');
});

test('everything else is unconfirmed, because a login may have been made', () => {
  // The route's own answer when the database or the sign-in service did not
  // say what happened: a 409 with no name.
  assert.equal(childLoginOutcomeOf(409, undefined), 'unconfirmed');
  assert.equal(childLoginOutcomeOf(409, null), 'unconfirmed');
  // A name nobody has heard of, whatever the status.
  assert.equal(childLoginOutcomeOf(400, 'child_login:username_taken'), 'unconfirmed');
  assert.equal(childLoginOutcomeOf(400, 'toString'), 'unconfirmed');
  assert.equal(childLoginOutcomeOf(400, 7), 'unconfirmed');
  // A known name on a status that is not a refusal.
  assert.equal(childLoginOutcomeOf(500, 'signed_out'), 'unconfirmed');
  assert.equal(childLoginOutcomeOf(200, 'no_child'), 'unconfirmed');
  assert.equal(childLoginOutcomeOf(502, 'username_short'), 'unconfirmed');
  assert.equal(childLoginOutcomeOf(503, 'under_twelve'), 'unconfirmed');
});
