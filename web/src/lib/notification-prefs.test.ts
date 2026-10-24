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

test('the five kinds are the five the database can send', () => {
  assert.deepEqual(
    NOTIFICATION_KINDS.map((k) => k.kind),
    ['payout_paid', 'payout_failed', 'payout_cancelled', 'class_starting', 'plan_renewing'],
  );
});

test('exactly two kinds are locked, and they are the money failures', () => {
  const locked = NOTIFICATION_KINDS.filter((k) => k.locked).map((k) => k.kind);
  assert.deepEqual(locked, ['payout_failed', 'payout_cancelled']);
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
      pref('payout_cancelled', true, true), pref('class_starting', true),
      pref('plan_renewing', true),
    ]),
    'Everything you can choose is on.',
  );

  assert.equal(
    preferenceSummary([
      pref('payout_paid', true), pref('payout_failed', true, true),
      pref('payout_cancelled', true, true), pref('class_starting', false),
      pref('plan_renewing', true),
    ]),
    '1 optional message is switched off.',
  );

  assert.equal(
    preferenceSummary([
      pref('payout_paid', false), pref('payout_failed', true, true),
      pref('payout_cancelled', true, true), pref('class_starting', false),
      pref('plan_renewing', false),
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
