import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { translator } from './i18n/index.ts';
import {
  describeKind,
  NOTIFICATION_KINDS,
  parsePreferences,
  PREFERENCE_REFUSALS,
  preferenceChangeOf,
  preferenceRefusalOf,
  preferenceRefusalStatus,
  preferenceSummary,
  type Preference,
} from './notification-prefs.ts';

const en = translator('en');
const here = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const LATEST = here('../../../supabase/migrations/20261281151000_teaching_answer_told.sql');

test('the nine kinds are the nine the database can send, in its order', () => {
  // The order is the database's (`my_notification_preferences()`), not a choice
  // made here: a screen that reorders the list is a screen whose next kind is
  // forgotten in the other list. Read out of the function itself.
  const fn = LATEST.slice(LATEST.indexOf('create or replace function public.my_notification_preferences('));
  const list = /foreach v_kind in array array\[([^\]]+)\]/u.exec(fn)?.[1] ?? '';
  const inDatabase = [...list.matchAll(/'([a-z_]+)'/gu)].map((m) => m[1]);
  assert.equal(inDatabase.length, 9);
  assert.deepEqual(NOTIFICATION_KINDS.map((k) => k.kind), inDatabase);
});

test('every kind has a name and a description, and no two share one', () => {
  const keys = NOTIFICATION_KINDS.flatMap((k) => [k.labelKey, k.descriptionKey]);
  assert.equal(new Set(keys).size, 18);
  for (const key of keys) {
    const said = en(key);
    assert.notEqual(said, key, `${key} is not in the catalogue`);
    assert.ok(said.length > 10, key);
  }
  // The sentences are the catalogue's. None is left in this file.
  const source = here('./notification-prefs.ts');
  assert.doesNotMatch(source, /\blabel: '|\bdescription: '/u);
  assert.doesNotMatch(source, /Not in use on this platform yet|optional message/u);
});

test('a kind’s name reads as something that happened, in both places it is said', () => {
  // It is the label beside a switch and the line above a message, so it is
  // not a category ("Payouts") and not an instruction ("Tell me when…").
  for (const k of NOTIFICATION_KINDS) {
    // "A …" for something that happened on the site; "Your …" for the one
    // that is an answer to something the reader sent.
    assert.match(en(k.labelKey), /^(?:A|Your) /u, k.kind);
    assert.doesNotMatch(en(k.labelKey), /[.:!?]$/u, k.kind);
  }
});

test('a cancelled class is a choice, and the description says what silence costs', () => {
  // Same reasoning as a failed encode: important is not the same as owed. The
  // room still says the class was cancelled and why, so muting loses the
  // warning rather than the fact — and the switch says so.
  const info = describeKind('live_cancelled');
  assert.ok(info);
  assert.equal(info.locked, false);
  assert.match(en(info.descriptionKey), /finding out by opening the room/);
  assert.match(en(info.descriptionKey), /still says it was cancelled/);
});

test('a recording being ready is a choice, and the description says what silence costs', () => {
  // The recording is not going anywhere: muting the message costs the warning,
  // not the class. That is what makes it a switch rather than an obligation.
  const info = describeKind('live_recording_ready');
  assert.ok(info);
  assert.equal(info.locked, false);
  assert.match(en(info.descriptionKey), /still there/);
});

test('exactly two kinds are locked, and they are the money failures', () => {
  const locked = NOTIFICATION_KINDS.filter((k) => k.locked).map((k) => k.kind);
  assert.deepEqual(locked, ['payout_failed', 'payout_cancelled']);
  // The database's own rule, so the two cannot drift apart.
  const rule = here('../../../supabase/migrations/20261277000100_notification_preferences.sql');
  const fn = rule.slice(rule.indexOf('function public.notification_kind_is_locked('));
  assert.match(fn.slice(0, 400), /p_kind in \('payout_failed', 'payout_cancelled'\)/u);
  for (const kind of locked) assert.match(en(describeKind(kind)!.descriptionKey), /Always on/);
});

test('a failed encode is a choice, and the description says what silence costs', () => {
  // Locked would be defensible — it is bad news about your own work. It is not
  // locked because "always on" must mean "the platform owes you this", and the
  // two money kinds are the ones that do. The cost of muting it is stated
  // instead of hidden.
  const info = describeKind('media_encode_failed');
  assert.ok(info);
  assert.equal(info.locked, false);
  assert.match(en(info.descriptionKey), /finding out from a learner/);
  assert.match(en(info.descriptionKey), /does not affect whether the file is fixed/);
});

test('no sentence about a kind promises an email, a text or a push', () => {
  // `delivery.notifications` is off and no provider is chosen. These are
  // messages inside the application.
  for (const key of ['notify.lead', 'notify.prefsBody', ...NOTIFICATION_KINDS.map((k) => k.descriptionKey)] as const) {
    assert.doesNotMatch(en(key), /\b(we|will) (email|text|send)|by email|by SMS|push notification/iu, key);
  }
  assert.match(en('notify.lead'), /not sent to an inbox or a phone/u);
});

test('a name every object has is not a kind', () => {
  for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'nope', '', 7, null, undefined, {}]) {
    assert.equal(describeKind(name), null, String(name));
  }
  assert.throws(() => parsePreferences([{ kind: 'constructor', enabled: true }]), /does not know/);
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
  assert.throws(() => parsePreferences(undefined), /did not load/);
});

test('the sentence counts only what can be chosen', () => {
  const pref = (
    kind: Preference['kind'],
    enabled: boolean,
    locked = false,
    available = true,
  ): Preference => ({ kind, enabled, locked, available });

  assert.deepEqual(
    preferenceSummary([
      pref('payout_paid', true), pref('payout_failed', true, true),
      pref('payout_cancelled', true, true), pref('media_encode_failed', true),
      pref('class_starting', true), pref('plan_renewing', true),
      pref('live_cancelled', true),
    ]),
    { key: 'notify.sumAllOn' },
  );

  assert.deepEqual(
    preferenceSummary([
      pref('payout_paid', true), pref('payout_failed', true, true),
      pref('payout_cancelled', true, true), pref('media_encode_failed', true),
      pref('class_starting', false), pref('plan_renewing', true),
      pref('live_cancelled', true),
    ]),
    { key: 'notify.sumOff', count: 1 },
  );

  assert.deepEqual(
    preferenceSummary([
      pref('payout_paid', false), pref('payout_failed', true, true),
      pref('payout_cancelled', true, true), pref('media_encode_failed', false),
      pref('class_starting', false), pref('plan_renewing', false),
      pref('live_cancelled', false),
    ]),
    { key: 'notify.sumAllOff' },
  );

  // The count is said after a colon, so one and many are the same sentence.
  assert.equal(en('notify.sumOff', { count: '1' }), 'Optional messages switched off: 1');
  assert.equal(en('notify.sumAllOn'), 'Everything you can choose is on.');
  assert.equal(en('notify.sumAllOff'), 'You have switched off every optional message.');
});

test('a kind that is not in use yet says so, and still keeps the choice', () => {
  const [off] = parsePreferences([
    { kind: 'class_starting', enabled: true, locked: false, available: false },
  ]);
  assert.equal(off?.available, false);
  // The switch is still usable: a choice made in advance is not an error.
  assert.equal(off?.enabled, true);
  assert.match(en('notify.notInUse'), /Not in use on this platform yet/);
  assert.match(en('notify.notInUse'), /Your choice is saved/);

  const [live] = parsePreferences([
    { kind: 'class_starting', enabled: true, locked: false, available: true },
  ]);
  assert.equal(live?.available, true);
});

test('a reply without the availability field is treated as live', () => {
  // A database older than the field must not make every switch look dead.
  const [pref] = parsePreferences([{ kind: 'payout_paid', enabled: true, locked: false }]);
  assert.equal(pref?.available, true);
});

test('the media kind is a preference the database will accept', () => {
  const prefs = parsePreferences([
    { kind: 'media_encode_failed', enabled: false, locked: false, available: true },
  ]);
  assert.equal(prefs[0]?.kind, 'media_encode_failed');
  assert.equal(prefs[0]?.enabled, false);
});

test('each way the database refuses a switch has a name, and the rest claim nothing', () => {
  // The three refusals and their SQLSTATEs, read out of the function.
  const fn = LATEST.slice(
    LATEST.indexOf('create or replace function public.set_notification_preference('),
    LATEST.indexOf('create or replace function public.my_notification_preferences('),
  );
  const raised = [...fn.matchAll(/using errcode = '([a-z_]+)'/gu)].map((m) => m[1]);
  assert.deepEqual(raised, ['insufficient_privilege', 'invalid_parameter_value', 'check_violation']);

  assert.equal(preferenceRefusalOf('42501'), 'signed_out');
  assert.equal(preferenceRefusalOf('22023'), 'unknown_kind');
  assert.equal(preferenceRefusalOf('23514'), 'locked');
  for (const other of ['23505', 'PGRST301', '', null, undefined, 42501]) {
    assert.equal(preferenceRefusalOf(other), 'failed', String(other));
  }

  const statuses = Object.fromEntries(PREFERENCE_REFUSALS.map((r) => [r, preferenceRefusalStatus(r)]));
  assert.deepEqual(statuses, {
    unconfigured: 503, malformed: 400, signed_out: 401, unknown_kind: 400, locked: 409, failed: 500, unconfirmed: 502,
  });
});

test('a change names a kind and says on or off, and nothing else is one', () => {
  assert.deepEqual(preferenceChangeOf({ kind: 'payout_paid', enabled: false, extra: 1 }), { kind: 'payout_paid', enabled: false });
  for (const bad of [null, undefined, 'x', [], [{ kind: 'payout_paid', enabled: true }], {}, { kind: 'payout_paid' },
    { enabled: true }, { kind: 7, enabled: true }, { kind: 'payout_paid', enabled: 'true' }, { kind: 'payout_paid', enabled: 1 }]) {
    assert.equal(preferenceChangeOf(bad), null, JSON.stringify(bad));
  }
});

test('neither route sends the database’s sentence to a browser', () => {
  for (const path of ['../app/api/notifications/route.ts', '../app/api/notifications/preferences/route.ts']) {
    const route = here(path);
    assert.doesNotMatch(route, /message: error\.message/u, path);
    assert.doesNotMatch(route, /NextResponse\.json\([^)]*error\.message/u, path);
    assert.match(route, /console\.error\('\[notifications\]/u, path);
    assert.match(route, /'Cache-Control': 'no-store'/u, path);
  }
  // The switch that moved is the one the database said moved.
  const island = here('../app/notifications/preferences.tsx');
  assert.match(island, /json\.value\?\.kind !== pref\.kind/u);
  assert.doesNotMatch(island, /json\.message|result\?\.message/u);
  assert.doesNotMatch(here('../app/notifications/notification-actions.tsx'), /\.message/u);
});

test('the page says what it could not read, and does not throw it', () => {
  const page = here('../app/notifications/page.tsx');
  assert.doesNotMatch(page, /throw new Error/u);
  assert.match(page, /data-centre="unread"/u);
  assert.match(page, /data-preferences="unread"/u);
  assert.doesNotMatch(page, /Intl\.DateTimeFormat\('en'/u);
  assert.match(page, /languageShownFor\(locale, 'notify'\)/u);
});
