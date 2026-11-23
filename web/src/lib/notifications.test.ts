import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import { NOTIFICATION_KINDS } from './notification-prefs.ts';
import {
  MARK_READ_MOST,
  PLAN_REMINDER_SUFFIX,
  REMINDER_KINDS,
  centreOf,
  internalHrefOf,
  markReadIdsOf,
  planNameOf,
} from './notifications.ts';

const MIGRATIONS = new URL('../../../supabase/migrations/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, MIGRATIONS), 'utf8');
const CENTRE = read('20261277000100_notification_preferences.sql');
const centreFunction = CENTRE.slice(CENTRE.indexOf('create or replace function public.my_notifications('), CENTRE.indexOf('revoke all on function public.my_notifications(integer)'));

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
    href: '/teach/payouts', createdAt: '2026-11-20T10:00:00Z', read: false,
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
  assert.equal(writesNotification.length, 4);
  for (const name of writesNotification) {
    assert.doesNotMatch(read(name), /queue_message\(|insert into public\.outbound_messages/u, `${name} writes a notification and queues a message`);
  }
  const notify = read('20261261000100_notifications.sql');
  const body = notify.slice(notify.indexOf('create or replace function public.notify_user('), notify.indexOf('revoke all on function public.notify_user('));
  assert.ok(body.length > 300);
  assert.doesNotMatch(body, /outbound_messages|enqueue/u);
});
