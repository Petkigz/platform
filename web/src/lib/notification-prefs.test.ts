import assert from 'node:assert/strict';
import test from 'node:test';

import {
  availabilityNote,
  describeKind,
  NOTIFICATION_KINDS,
  parsePreferences,
  preferenceSummary,
  type Preference,
} from './notification-prefs.ts';

test('the six kinds are the six the database can send, in its order', () => {
  // The order is the database's (`my_notification_preferences()`), not a choice
  // made here: a screen that reorders the list is a screen whose next kind is
  // forgotten in the other list.
  assert.deepEqual(
    NOTIFICATION_KINDS.map((k) => k.kind),
    [
      'payout_paid', 'payout_failed', 'payout_cancelled',
      'media_encode_failed', 'class_starting', 'plan_renewing',
    ],
  );
});

test('exactly two kinds are locked, and they are the money failures', () => {
  const locked = NOTIFICATION_KINDS.filter((k) => k.locked).map((k) => k.kind);
  assert.deepEqual(locked, ['payout_failed', 'payout_cancelled']);
});

test('a failed encode is a choice, and the description says what silence costs', () => {
  // Locked would be defensible — it is bad news about your own work. It is not
  // locked because "always on" must mean "the platform owes you this", and the
  // two money kinds are the ones that do. The cost of muting it is stated
  // instead of hidden.
  const info = describeKind('media_encode_failed');
  assert.ok(info);
  assert.equal(info!.locked, false);
  assert.match(info!.description, /finding out from a learner/);
  assert.match(info!.description, /does not affect whether the file is fixed/);
});

test('a list from the database comes back in the order it arrived', () => {
  const prefs = parsePreferences([
    { kind: 'payout_paid', enabled: false, locked: false },
    { kind: 'class_starting', enabled: true, locked: false },
  ]);
  assert.deepEqual(prefs.map((p) => p.kind), ['payout_paid', 'class_starting']);
  assert.equal(prefs[0]?.enabled, false);
});

test('a locked kind reads as on even if the row says otherwise', () => {
  // The database already refuses to write such a row and ignores one written by
  // hand; the screen must not show a switch in a position it cannot hold.
  const prefs = parsePreferences([{ kind: 'payout_failed', enabled: false, locked: false }]);
  assert.equal(prefs[0]?.enabled, true);
  assert.equal(prefs[0]?.locked, true);
});

test('a kind this screen does not know is an error, not an unlabelled switch', () => {
  assert.throws(
    () => parsePreferences([{ kind: 'marketing_offers', enabled: true, locked: false }]),
    /does not know/,
  );
});

test('a reply that is not a list is an error', () => {
  assert.throws(() => parsePreferences({}), /did not load/);
  assert.throws(() => parsePreferences(null), /did not load/);
});

test('the sentence counts only what can be chosen', () => {
  const pref = (
    kind: Preference['kind'],
    enabled: boolean,
    locked = false,
    available = true,
  ): Preference => ({ kind, enabled, locked, available });

  assert.equal(
    preferenceSummary([
      pref('payout_paid', true), pref('payout_failed', true, true),
      pref('payout_cancelled', true, true), pref('media_encode_failed', true),
      pref('class_starting', true), pref('plan_renewing', true),
    ]),
    'Everything you can choose is on.',
  );

  assert.equal(
    preferenceSummary([
      pref('payout_paid', true), pref('payout_failed', true, true),
      pref('payout_cancelled', true, true), pref('media_encode_failed', true),
      pref('class_starting', false), pref('plan_renewing', true),
    ]),
    '1 optional message is switched off.',
  );

  assert.equal(
    preferenceSummary([
      pref('payout_paid', false), pref('payout_failed', true, true),
      pref('payout_cancelled', true, true), pref('media_encode_failed', false),
      pref('class_starting', false), pref('plan_renewing', false),
    ]),
    'You have switched off every optional message.',
  );
});

test('a kind that is not in use yet says so, and still keeps the choice', () => {
  const [off] = parsePreferences([
    { kind: 'class_starting', enabled: true, locked: false, available: false },
  ]);
  assert.equal(off?.available, false);
  // The switch is still usable: a choice made in advance is not an error.
  assert.equal(off?.enabled, true);
  assert.match(availabilityNote(off!)!, /Not in use on this platform yet/);

  const [live] = parsePreferences([
    { kind: 'class_starting', enabled: true, locked: false, available: true },
  ]);
  assert.equal(availabilityNote(live!), null);
});

test('a reply without the availability field is treated as live', () => {
  // A database older than the field must not make every switch look dead.
  const [pref] = parsePreferences([{ kind: 'payout_paid', enabled: true, locked: false }]);
  assert.equal(pref?.available, true);
});

test('a kind is described in a sentence a person can act on', () => {
  const info = describeKind('payout_failed');
  assert.ok(info);
  assert.match(info!.description, /Always on/);
  assert.equal(describeKind('nope'), null);
});

test('the media kind is a preference the database will accept', () => {
  // End to end with the migration's own lists: if `media_encode_failed` were
  // missing from the CHECK, the RPC or the `foreach`, the reply would not parse
  // and this test would fail on the throw rather than on an assertion.
  const prefs = parsePreferences([
    { kind: 'media_encode_failed', enabled: false, locked: false, available: true },
  ]);
  assert.equal(prefs[0]?.kind, 'media_encode_failed');
  assert.equal(prefs[0]?.enabled, false);
  assert.equal(availabilityNote(prefs[0]!), null);
});
