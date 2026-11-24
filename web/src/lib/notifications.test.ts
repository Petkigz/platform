import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import { NOTIFICATION_KINDS } from './notification-prefs.ts';
import {
  MARK_READ_MOST,
  PLAN_REMINDER_SUFFIX,
  REMINDER_KINDS,
  centreOf,
  factsOf,
  internalHrefOf,
  markReadIdsOf,
  planNameOf,
} from './notifications.ts';

const MIGRATIONS = new URL('../../../supabase/migrations/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, MIGRATIONS), 'utf8');
/** One function out of a migration: from its `create or replace` to the `$$;` that ends it. */
function functionIn(migration: string, name: string): string {
  const sql = read(migration);
  const start = sql.lastIndexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, `${name}() is not in ${migration}`);
  return sql.slice(start, sql.indexOf('\n$$;\n', start) + 5);
}
// The migration that keeps what a message is made of, and the last definition of my_notifications().
const FACTS = '20261281148000_notification_facts.sql';
const centreFunction = functionIn(FACTS, 'my_notifications');

const ID = '11111111-1111-4111-8111-111111111111';
const message = (over: Record<string, unknown> = {}) => ({
  id: ID, kind: 'payout_failed', title: 'A payout did not go through', body: '51500 UGX was not sent.',
  href: '/teach/payouts', severity: 'warning', createdAt: '2026-11-20T10:00:00Z', readAt: null, ...over,
});
const reminder = (over: Record<string, unknown> = {}) => ({
  kind: 'class_starting', title: 'Tajweed circle', body: 'Your class in Tajweed starts 21 Nov 09:00 UTC.',
  href: '/live', severity: 'action', happensAt: '2026-11-21T09:00:00Z', sortKey: 0, ...over,
});
const centre = (over: Record<string, unknown> = {}) => ({ unreadCount: 1, reminders: [reminder()], recent: [message()], ...over });

test('the reminders this code has a sentence for are the ones the database works out', () => {
  assert.ok(centreFunction.length > 2000, 'my_notifications() was not found in the migration this test reads');
  const written = [...centreFunction.matchAll(/'kind',\s+'([a-z_]+)'/gu)].map((m) => m[1]);
  assert.deepEqual(written.sort(), [...REMINDER_KINDS].sort());
  // And both are kinds a person can switch off.
  for (const kind of REMINDER_KINDS) assert.ok(NOTIFICATION_KINDS.some((k) => k.kind === kind && !k.locked));
});

test('a plan’s name comes off the words the database puts after it', () => {
  // The function's own format string, so a change to it fails here.
  assert.match(centreFunction, /format\('%s renews soon', v_renew\.plan_name\)/u);
  assert.equal(PLAN_REMINDER_SUFFIX, ' renews soon');
  assert.equal(planNameOf('Family plan renews soon'), 'Family plan');
  assert.equal(planNameOf('خطة العائلة renews soon'), 'خطة العائلة');
  // A plan may be called anything, these words included.
  assert.equal(planNameOf('It renews soon renews soon'), 'It renews soon');
  assert.equal(planNameOf('Family plan'), null);
  assert.equal(planNameOf(' renews soon'), null);
});

test('a message is shown with its kind named, or with no name, never with the stored word', () => {
  const seen = centreOf(centre());
  assert.deepEqual(seen?.recent[0], {
    id: ID, kind: 'payout_failed', title: 'A payout did not go through', body: '51500 UGX was not sent.',
    facts: null, href: '/teach/payouts', createdAt: '2026-11-20T10:00:00Z', read: false,
  });
  assert.equal(centreOf(centre({ recent: [message({ readAt: '2026-11-20T11:00:00Z' })] }))?.recent[0]?.read, true);
  // A kind added to the database before this code learned it: the message is kept, unnamed.
  assert.equal(centreOf(centre({ recent: [message({ kind: 'marketing_offers' })] }))?.recent[0]?.kind, null);
  // A name every object has is not a kind.
  for (const kind of ['constructor', '__proto__', 'toString', 7, null]) {
    assert.equal(centreOf(centre({ recent: [message({ kind })] }))?.recent[0]?.kind, null, String(kind));
  }
  assert.equal(centreOf(centre({ reminders: [reminder({ kind: 'payout_paid' })] }))?.reminders[0]?.kind, null);
  assert.equal(centreOf(centre())?.reminders[0]?.kind, 'class_starting');
});

test('a reply that cannot be trusted is unread, not a shorter list', () => {
  for (const bad of [null, undefined, [], 'x', {}, { recent: [], reminders: [] }, centre({ unreadCount: -1 }), centre({ unreadCount: 1.5 }), centre({ unreadCount: '1' }),
    centre({ recent: {} }), centre({ reminders: null })]) {
    assert.equal(centreOf(bad), null, JSON.stringify(bad));
  }
  // One row that makes no sense among good ones.
  for (const over of [{ id: 7 }, { id: '' }, { title: '' }, { title: '   ' }, { body: null }, { createdAt: 'yesterday' }, { createdAt: null }, { readAt: 'never' }]) {
    assert.equal(centreOf(centre({ recent: [message(), message(over)] })), null, JSON.stringify(over));
  }
  assert.equal(centreOf(centre({ recent: [message(), null] })), null);
  for (const over of [{ title: '' }, { body: 4 }, { happensAt: 'soon' }, { happensAt: undefined }]) {
    assert.equal(centreOf(centre({ reminders: [reminder(over)] })), null, JSON.stringify(over));
  }
  // Nothing at all is a reply: a person with no messages has none.
  assert.deepEqual(centreOf({ unreadCount: 0, reminders: [], recent: [] }), { unreadCount: 0, reminders: [], recent: [] });
});

test('only an address inside this site is followed', () => {
  // The table's check, which this page does not rely on.
  assert.match(read('20261261000100_notifications.sql'), /href text check \(href is null or href ~ '\^\/'\)/u);
  for (const good of ['/teach/payouts', '/live/11111111-1111-4111-8111-111111111111', '/subscriptions', '/teach/x/preview?step=2#top']) {
    assert.equal(internalHrefOf(good), good);
  }
  // Each of these passes `~ '^/'`, or would be followed off the site by a browser.
  for (const bad of ['//evil.example', '//evil.example/teach', '/\\evil.example', '/\\/evil.example', '/a b', '/a\nb', '/\tx', '', 'teach/payouts',
    'https://evil.example', 'javascript:alert(1)', 'mailto:a@b.example', null, undefined, 7, {}]) {
    assert.equal(internalHrefOf(bad), null, JSON.stringify(bad));
  }
  // A message whose address is refused is still a message.
  const seen = centreOf(centre({ recent: [message({ href: '//evil.example' })], reminders: [reminder({ href: 'https://evil.example' })] }));
  assert.equal(seen?.recent[0]?.href, null);
  assert.equal(seen?.recent[0]?.title, 'A payout did not go through');
  assert.equal(seen?.reminders[0]?.href, null);
});

test('marking as read names what it means; nothing marks everything by accident', () => {
  const OTHER = '22222222-2222-4222-8222-222222222222';
  assert.deepEqual(markReadIdsOf({ ids: [ID, OTHER] }), [ID, OTHER]);
  assert.deepEqual(markReadIdsOf({ ids: [ID, ID] }), [ID]);
  // The database reads "no ids" as "every message I have".
  const mark = read('20261261000100_notifications.sql');
  assert.match(mark.slice(mark.indexOf('create or replace function public.mark_notifications_read(')), /p_ids is null or n\.id = any \(p_ids\)|p_ids is null/u);
  for (const bad of [null, undefined, 'x', [], {}, { ids: null }, { ids: [] }, { ids: 'x' }, { ids: ID }, { ids: [ID, 7] }, { ids: ['not-an-id'] }, { ids: [`${ID} `] },
    { ids: [ID, null] }, { ids: { 0: ID, length: 1 } }, { ids: Array.from({ length: MARK_READ_MOST + 1 }, () => ID) }]) {
    assert.equal(markReadIdsOf(bad), null, JSON.stringify(bad)?.slice(0, 60));
  }
  assert.equal(markReadIdsOf({ ids: Array.from({ length: MARK_READ_MOST }, () => ID) })?.length, 1);
});

test('a notification is shown here and is not sent: nothing that writes one writes to the outbox', () => {
  // `notify.lead` says these messages are not sent to an inbox or a phone.
  // That is true because of how they are written, not because of a switch.
  // If a function ever does both, the sentence has to be looked at again.
  const names = readdirSync(MIGRATIONS).filter((name) => name.endsWith('.sql'));
  const writesOutbox = names.filter((name) => /insert into public\.outbound_messages/u.test(read(name)));
  assert.ok(writesOutbox.length > 0, 'no migration writes to the outbox, so this test is reading the wrong thing');
  for (const name of writesOutbox) {
    assert.doesNotMatch(read(name), /public\.notify_user\(/u, `${name} writes to the outbox and writes a notification`);
  }
  // The other way round: nothing that writes a notification queues a message
  // through the function that fills the outbox.
  const writesNotification = names.filter((name) => /public\.notify_user\(/u.test(read(name)));
  assert.equal(writesNotification.length, 6);
  for (const name of writesNotification) {
    assert.doesNotMatch(read(name), /queue_message\(|insert into public\.outbound_messages/u, `${name} writes a notification and queues a message`);
  }
  const notify = read('20261261000100_notifications.sql');
  const body = notify.slice(notify.indexOf('create or replace function public.notify_user('), notify.indexOf('revoke all on function public.notify_user('));
  assert.ok(body.length > 300);
  assert.doesNotMatch(body, /outbound_messages|enqueue/u);
  // The one that also keeps the facts.
  const withFacts = functionIn(FACTS, 'notify_user');
  assert.match(withFacts, /p_facts\s+jsonb\n\)/u);
  assert.doesNotMatch(withFacts, /outbound_messages|enqueue|queue_message/u);
});

// ------------------------------------------------------------------ facts

const PAID = { amountMinor: '8000000', currency: 'KES', reference: 'REF-77' };
const CLASS = { title: 'Tafsir circle', startsAt: '2026-11-21T06:00:00+00:00', zone: 'Africa/Kampala' };

test('each kind of kept message is read from what it is made of', () => {
  assert.deepEqual(factsOf('payout_paid', PAID), { kind: 'payout_paid', ...PAID });
  assert.deepEqual(factsOf('payout_failed', { amountMinor: '51500', currency: 'UGX', reason: ' The number was closed ' }),
    { kind: 'payout_failed', amountMinor: '51500', currency: 'UGX', reason: 'The number was closed' });
  assert.deepEqual(factsOf('payout_cancelled', { amountMinor: '0', currency: 'UGX' }), { kind: 'payout_cancelled', amountMinor: '0', currency: 'UGX' });
  assert.deepEqual(factsOf('media_encode_failed', { part: 'author', name: 'Recorded lesson', reason: 'encoder exited 137' }),
    { kind: 'media_encode_failed', part: 'author', name: 'Recorded lesson', reason: 'encoder exited 137' });
  // A file with no name is said without one.
  assert.equal(factsOf('media_encode_failed', { part: 'uploader', name: null, reason: 'x' })?.kind, 'media_encode_failed');
  assert.deepEqual(factsOf('media_encode_failed', { part: 'uploader', reason: 'x' }), { kind: 'media_encode_failed', part: 'uploader', name: null, reason: 'x' });
  assert.deepEqual(factsOf('live_cancelled', { ...CLASS, reason: 'Teacher is unwell' }), { kind: 'live_cancelled', ...CLASS, reason: 'Teacher is unwell' });
  assert.deepEqual(factsOf('live_recording_ready', CLASS), { kind: 'live_recording_ready', ...CLASS });
  // An answer to an application is one of two words, and nothing else is kept with it.
  assert.deepEqual(factsOf('teaching_answered', { outcome: 'approved' }), { kind: 'teaching_answered', outcome: 'approved' });
  assert.deepEqual(factsOf('teaching_answered', { outcome: 'declined', reason: 'not kept' }), { kind: 'teaching_answered', outcome: 'declined' });
  for (const bad of [{}, { outcome: 'withdrawn' }, { outcome: true }, { outcome: 'Approved' }, { outcome: null }]) {
    assert.equal(factsOf('teaching_answered', bad), null, JSON.stringify(bad));
  }
  // Something extra in the row is not said and does no harm.
  assert.deepEqual(factsOf('payout_cancelled', { amountMinor: '1', currency: 'UGX', note: 'x' }), { kind: 'payout_cancelled', amountMinor: '1', currency: 'UGX' });
});

test('facts that are not whole are not said at all: the message is then its stored English', () => {
  // Every message written before facts were kept.
  for (const none of [null, undefined, '', 'x', 7, [], [PAID]]) assert.equal(factsOf('payout_paid', none), null, JSON.stringify(none));
  // A kind with no sentence, a reminder's kind, and a name every object has.
  for (const kind of ['marketing_offers', 'class_starting', 'plan_renewing', 'constructor', '__proto__', null, 7]) {
    assert.equal(factsOf(kind, PAID), null, String(kind));
  }
  // The facts of another kind.
  assert.equal(factsOf('live_cancelled', PAID), null);
  assert.equal(factsOf('payout_paid', CLASS), null);
  for (const over of [{ amountMinor: 8000000 }, { amountMinor: '80.5' }, { amountMinor: '-5' }, { amountMinor: '' }, { amountMinor: '007' }, { amountMinor: '1e3' },
    { amountMinor: '9'.repeat(19) }, { currency: 'kes' }, { currency: 'KE' }, { currency: 'KES ' }, { currency: null }, { reference: '' }, { reference: '   ' },
    { reference: 7 }, { reference: 'x'.repeat(301) }, { reference: undefined }]) {
    assert.equal(factsOf('payout_paid', { ...PAID, ...over }), null, JSON.stringify(over).slice(0, 50));
  }
  for (const over of [{ reason: '' }, { reason: null }, { reason: 'x'.repeat(1001) }]) {
    assert.equal(factsOf('payout_failed', { amountMinor: '1', currency: 'UGX', ...over }), null, JSON.stringify(over).slice(0, 40));
    assert.equal(factsOf('live_cancelled', { ...CLASS, ...over }), null, JSON.stringify(over).slice(0, 40));
    assert.equal(factsOf('media_encode_failed', { part: 'uploader', name: null, ...over }), null, JSON.stringify(over).slice(0, 40));
  }
  for (const over of [{ part: 'learner' }, { part: undefined }, { name: 7 }, { name: '' }, { name: '  ' }]) {
    assert.equal(factsOf('media_encode_failed', { part: 'uploader', name: 'n', reason: 'r', ...over }), null, JSON.stringify(over));
  }
  for (const over of [{ title: '' }, { title: null }, { startsAt: 'soon' }, { startsAt: null }, { startsAt: 1763704800 }, { zone: 'Mars/Olympus' }, { zone: '' }, { zone: null },
    { zone: 'x'.repeat(65) }]) {
    assert.equal(factsOf('live_recording_ready', { ...CLASS, ...over }), null, JSON.stringify(over));
    assert.equal(factsOf('live_cancelled', { ...CLASS, reason: 'r', ...over }), null, JSON.stringify(over));
  }
  // A message whose facts are refused is still a message, and the centre is still read.
  const seen = centreOf(centre({ recent: [message({ facts: { amountMinor: 'lots' } }), message({ kind: 'payout_paid', facts: PAID })] }));
  assert.equal(seen?.recent[0]?.facts, null);
  assert.equal(seen?.recent[0]?.title, 'A payout did not go through');
  assert.deepEqual(seen?.recent[1]?.facts, { kind: 'payout_paid', ...PAID });
});

/** What a writer keeps, by name, read out of the migration: the names after `marker` up to the end of the call. */
function keptAfter(sql: string, marker: string): string[] {
  const at = sql.indexOf(marker);
  assert.ok(at >= 0, `${marker} is not in the migration`);
  const from = sql.indexOf('jsonb_build_object(', at);
  const call = sql.slice(from, sql.indexOf('\n\n', from));
  return [...call.slice(0, call.search(/\)\);|\)\n\s+\) is not null/u)).matchAll(/'([A-Za-z]+)', /gu)].map((m) => m[1] as string).sort();
}

test('the names this code reads are the names the database keeps', () => {
  const sql = read(FACTS);
  const kept: Record<string, string[]> = {
    payout_paid: keptAfter(sql, "'payout_paid:' || p_payout_id::text,"),
    payout_failed: keptAfter(sql, "'payout_failed:' || p_payout_id::text,"),
    payout_cancelled: keptAfter(sql, "'payout_cancelled:' || p_payout_id::text,"),
    media_encode_failed: keptAfter(sql, "'/teach/media',"),
    live_cancelled: keptAfter(sql, "'live-cancel:' || v_row.id::text,"),
    live_recording_ready: keptAfter(sql, "'live-recording:' || v_row.id::text,"),
  };
  assert.deepEqual(kept, {
    payout_paid: ['amountMinor', 'currency', 'reference'],
    payout_failed: ['amountMinor', 'currency', 'reason'],
    payout_cancelled: ['amountMinor', 'currency'],
    media_encode_failed: ['name', 'part', 'reason'],
    live_cancelled: ['reason', 'startsAt', 'title', 'zone'],
    live_recording_ready: ['startsAt', 'title', 'zone'],
  });
  // The second writer about a recording keeps the same names, as the author.
  assert.deepEqual(keptAfter(sql, "|| '/preview',"), ['name', 'part', 'reason']);
  assert.match(sql, /jsonb_build_object\('part', 'uploader',/u);
  assert.match(sql, /jsonb_build_object\('part', 'author',/u);
  // A value for each of those names makes facts this code will say.
  const sample: Record<string, unknown> = { amountMinor: '1', currency: 'UGX', reference: 'r', reason: 'r', part: 'author', name: 'n', ...CLASS };
  for (const [kind, names] of Object.entries(kept)) {
    const facts = factsOf(kind, Object.fromEntries(names.map((name) => [name, sample[name]])));
    assert.deepEqual(Object.keys(facts ?? {}).sort(), [...names, 'kind'].sort(), kind);
  }
  // And the centre hands them over.
  assert.match(centreFunction, /'facts',\s+v_row\.facts,/u);
});

test('each writer is its earlier definition with the facts added, and nothing else', () => {
  // PostgreSQL cannot wrap the function it replaces, so each was copied whole.
  // A copy can lose a line. This reads both and allows only the facts.
  const ADDED = /^\s+(?:jsonb_build_object\()?'[A-Za-z]+', \S.*$/u;
  const before: [string, string][] = [
    ['complete_instructor_payout', '20261261000100_notifications.sql'],
    ['fail_instructor_payout', '20261261000100_notifications.sql'],
    ['cancel_instructor_payout', '20261261000100_notifications.sql'],
    ['notify_media_encode_failed', '20261281004100_media_encode_notifications.sql'],
    ['cancel_live_session', '20261281005000_live_cancel.sql'],
    ['attach_live_recording', '20261281009000_live_recording.sql'],
    ['my_notifications', '20261277000100_notification_preferences.sql'],
  ];
  for (const [name, migration] of before) {
    const old = functionIn(migration, name).split('\n');
    const now = functionIn(FACTS, name).replace('n.body, n.facts, n.href', 'n.body, n.href').split('\n');
    let i = 0;
    let added = 0;
    for (const line of now) {
      const was = old[i];
      if (was !== undefined && (line === was || line === `${was},` || (was.endsWith(');') && line === `${was.slice(0, -2)},`))) {
        i += 1;
      } else if (ADDED.test(line) || /^\s+'facts',\s+v_row\.facts,$/u.test(line)) {
        added += 1;
      } else {
        assert.fail(`${name}(): a line that is neither the earlier one nor a fact: ${line}`);
      }
    }
    assert.equal(i, old.length, `${name}(): the earlier definition has ${old.length - i} lines the new one lost`);
    assert.ok(added >= 1 && added <= 8, `${name}(): ${added} lines were added`);
  }
  // No later migration defines any of them again without this test being told.
  const names = readdirSync(MIGRATIONS).filter((n) => n.endsWith('.sql')).sort();
  for (const [name] of before) {
    const last = names.filter((n) => read(n).includes(`create or replace function public.${name}(`)).at(-1);
    assert.equal(last, FACTS, `${name}() is defined again in ${last}`);
  }
});

test('the message is still written in English beside its facts, and an old message is given none', () => {
  const sql = read(FACTS);
  // Title and body are still passed by every writer: the export and an older reader read them.
  for (const words of ["'Your payout has been sent'", "'A payout did not go through'", "'A payout request was cancelled'", "'A recording of yours will not play'",
    "'A lesson of yours has nothing to play'", "format('Class cancelled: %s', v_row.title)", "format('Recording ready: %s', v_row.title)"]) {
    assert.ok(sql.includes(words), words);
  }
  // Nothing fills in facts for rows already there.
  assert.doesNotMatch(sql, /update public\.notifications/u);
  assert.match(sql, /add column if not exists facts jsonb;/u);
});
