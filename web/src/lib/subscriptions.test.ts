import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import { SUB_STATUSES, addableLearners, standingOfSubscription, subscriptionCards } from './subscriptions.ts';

const NOW = Date.parse('2026-11-23T12:00:00Z');
const LATER = '2026-12-23T12:00:00Z';
const EARLIER = '2026-10-23T12:00:00Z';
const ME = 'user-1';

const MIGRATIONS = new URL('../../../supabase/migrations/', import.meta.url);
const sql = (): string =>
  readdirSync(MIGRATIONS).filter((name) => name.endsWith('.sql')).sort()
    .map((name) => readFileSync(new URL(name, MIGRATIONS), 'utf8')).join('\n');

const row = (more: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  status: 'active',
  plan_version_id: 'version-1',
  current_period_end: LATER,
  plans: { name: 'Family', tier: 'plus' },
  plan_versions: { adult_allowance: 1, child_allowance: 2 },
  family_plan_allocations: [],
  ...more,
});
const cards = (subscriptions: unknown, more: { summary?: unknown; entitlements?: unknown; offlineOn?: boolean } = {}) =>
  subscriptionCards(
    { subscriptions, summary: more.summary ?? [], entitlements: more.entitlements ?? [] },
    { offlineOn: more.offlineOn ?? true, now: NOW },
  );

test('the statuses are the database’s seven, and only three are ever written', () => {
  const source = sql();
  const table = source.slice(source.indexOf('create table public.subscriptions ('));
  const check = table.match(/status text not null default 'pending'\s+check \(status in\s+\(([^)]+)\)\)/u);
  assert.ok(check, 'the subscriptions status check was not found');
  assert.deepEqual(check![1]!.split(',').map((s) => s.trim().replaceAll("'", '')), [...SUB_STATUSES]);
  // What the page says is built on this: nothing sets a subscription to
  // expired, so a plan whose period is over still says active in its row.
  // When something does write another status, this fails and the page's
  // sentences are to be read again.
  const written = [...source.matchAll(/update public\.subscriptions\s+set status='([a-z_]+)'/gu)].map((m) => m[1]);
  assert.deepEqual([...new Set(written)].sort(), ['active', 'cancelled']);
});

test('what is said comes from the status and the date together', () => {
  assert.equal(standingOfSubscription('pending', null, NOW), 'waiting');
  assert.equal(standingOfSubscription('active', LATER, NOW), 'running');
  // Over, and still called active by its row.
  assert.equal(standingOfSubscription('active', EARLIER, NOW), 'ended');
  assert.equal(standingOfSubscription('cancelled', LATER, NOW), 'stopped');
  assert.equal(standingOfSubscription('cancelled', EARLIER, NOW), 'ended');
  assert.equal(standingOfSubscription('cancelled', null, NOW), 'withdrawn');
  // Words nothing writes yet: read by their date, and never guessed without one.
  assert.equal(standingOfSubscription('past_due', LATER, NOW), 'running');
  assert.equal(standingOfSubscription('paused', null, NOW), 'unknown');
  assert.equal(standingOfSubscription('expired', EARLIER, NOW), 'ended');
});

test('a list that makes no sense is not read, and is not a shorter list', () => {
  assert.equal(cards(null), null);
  assert.equal(cards({}), null);
  assert.equal(cards([row(), row({ id: 'sub-2', status: 'something_new' })]), null);
  assert.equal(cards([row({ id: '' })]), null);
  assert.equal(cards([row({ current_period_end: 'not a date' })]), null);
  assert.equal(cards([row({ family_plan_allocations: null })]), null);
  assert.equal(cards([row({ family_plan_allocations: [{ status: 'active', learner_profile_id: 'l-1', slot_type: 'seat' }] })]), null);
  assert.deepEqual(cards([]), []);
});

test('a card says who is on the plan, what is left, and what can be done', () => {
  const [card] = cards([row({
    family_plan_allocations: [
      { status: 'active', learner_profile_id: 'l-1', slot_type: 'child', learner_profiles: { display_name: 'Aisha', age_band: '8-10' } },
      { status: 'released', learner_profile_id: 'l-2', slot_type: 'child', learner_profiles: { display_name: 'Bilal' } },
      // A learner whose name the row policy does not show.
      { status: 'active', learner_profile_id: 'l-3', slot_type: 'adult', learner_profiles: null },
    ],
  })])!;
  assert.deepEqual(card!.learners, [
    { id: 'l-1', name: 'Aisha', type: 'child', band: '8-10' },
    { id: 'l-3', name: null, type: 'adult', band: null },
  ]);
  assert.deepEqual(card!.places, { adult: 1, child: 2 });
  assert.deepEqual(card!.left, { adult: 0, child: 1 });
  assert.equal(card!.standing, 'running');
  assert.equal(card!.takesLearners, true);
  assert.equal(card!.cancel, 'plan');
  assert.equal(card!.name, 'Family');
  assert.equal(card!.tier, 'plus');
});

test('what can be done follows the writers, not the stored word', () => {
  const of = (more: Record<string, unknown>) => cards([row(more)])![0]!;
  // Ordered, not paid: the order can be cancelled, and nobody can be added.
  let card = of({ status: 'pending', current_period_end: null });
  assert.deepEqual([card.standing, card.takesLearners, card.cancel], ['waiting', false, 'order']);
  // Cancelled and still paid for: nobody else, and nothing left to cancel.
  card = of({ status: 'cancelled' });
  assert.deepEqual([card.standing, card.takesLearners, card.cancel], ['stopped', false, null]);
  // Over, though the row says active: the writer refuses an allocation by the date.
  card = of({ current_period_end: EARLIER });
  assert.deepEqual([card.standing, card.takesLearners, card.cancel], ['ended', false, null]);
  // A word nothing writes yet: the allocation writer takes `active` only.
  card = of({ status: 'past_due' });
  assert.deepEqual([card.standing, card.takesLearners, card.cancel], ['running', false, 'plan']);
  const source = sql();
  assert.match(source, /if not found or v_sub\.status<>'active' or v_sub\.current_period_end<=now\(\) then\s+raise exception 'that subscription is not active'/u);
  assert.match(source, /if v_sub\.status in \('cancelled','expired'\) then return false; end if;/u);
});

test('a plan that is no longer on sale takes its name and places from the summary', () => {
  const summary = [{ subscriptionId: 'sub-1', planName: 'Old family', tier: 'basic', adultAllowance: 1, childAllowance: 0 }];
  let [card] = cards([row({ plans: null, plan_versions: null })], { summary })!;
  assert.equal(card!.name, 'Old family');
  assert.equal(card!.tier, 'basic');
  assert.deepEqual(card!.places, { adult: 1, child: 0 });
  // Neither holds it: the card is drawn without, and no place is counted.
  [card] = cards([row({ plans: null, plan_versions: null })], { summary: null })!;
  assert.equal(card!.name, null);
  assert.equal(card!.places, null);
  assert.equal(card!.left, null);
  // What the page read itself wins over the summary.
  [card] = cards([row()], { summary })!;
  assert.equal(card!.name, 'Family');
});

test('what a plan opens is said in sentences the page has, and a stored code is never one', () => {
  const entitlements = [
    { plan_version_id: 'version-1', scope_type: 'catalogue', subject_areas: { name: 'Tajwid' } },
    { plan_version_id: 'version-1', scope_type: 'product', products: [{ name: 'Arabic year one' }] },
    { plan_version_id: 'version-1', scope_type: 'feature', feature_code: 'offline_downloads' },
    { plan_version_id: 'version-1', scope_type: 'feature', feature_code: 'something_new' },
    { plan_version_id: 'version-2', scope_type: 'catalogue', subject_areas: { name: 'Another plan’s' } },
  ];
  assert.deepEqual(cards([row()], { entitlements })![0]!.includes, [
    { kind: 'subject', name: 'Tajwid' },
    { kind: 'product', name: 'Arabic year one' },
    { kind: 'offline' },
  ]);
  // Saving a lesson is said only while it is switched on.
  assert.deepEqual(cards([row()], { entitlements, offlineOn: false })![0]!.includes!.map((i) => i.kind), ['subject', 'product']);
  // Not read is not "opens nothing".
  assert.equal(subscriptionCards({ subscriptions: [row()], summary: [], entitlements: null }, { offlineOn: true, now: NOW })![0]!.includes, null);
});

test('who can be added is the caller’s own adult profile and a child, while a place of that kind is free', () => {
  const learners = [
    { id: 'me', display_name: 'Me', learner_type: 'adult', linked_user_id: ME },
    { id: 'spouse', display_name: 'Spouse', learner_type: 'adult', linked_user_id: 'user-2' },
    { id: 'aisha', display_name: 'Aisha', learner_type: 'child', linked_user_id: null, age_band: '5-7' },
    { id: 'bilal', display_name: 'Bilal', learner_type: 'child', linked_user_id: null },
  ];
  const on = (allocations: unknown[], more: Record<string, unknown> = {}) => cards([row({ family_plan_allocations: allocations, ...more })])![0]!;
  const ids = (card: ReturnType<typeof on>) => addableLearners(card, learners, ME)?.map((l) => l.id);
  assert.deepEqual(ids(on([])), ['me', 'aisha', 'bilal']);
  // On it already, and the adult place taken by them.
  assert.deepEqual(ids(on([{ status: 'active', learner_profile_id: 'me', slot_type: 'adult' }])), ['aisha', 'bilal']);
  // Both child places taken.
  assert.deepEqual(ids(on([
    { status: 'active', learner_profile_id: 'aisha', slot_type: 'child' },
    { status: 'active', learner_profile_id: 'bilal', slot_type: 'child' },
  ])), ['me']);
  // A plan that takes nobody offers nobody.
  assert.deepEqual(ids(on([], { status: 'cancelled' })), []);
  assert.deepEqual(ids(on([], { status: 'pending', current_period_end: null })), []);
  // Not read, or places not known: null, which the page says as missing.
  assert.equal(addableLearners(on([]), null, ME), null);
  assert.equal(addableLearners(on([]), [{ id: 'x', display_name: 'X', learner_type: 'robot' }], ME), null);
  assert.equal(addableLearners(on([], { plans: null, plan_versions: null }), learners, ME), null);
});

test('the specifics a card carries: when the paid period began, and what the other shelf adds', () => {
  const START = '2026-11-01T00:00:00+00:00';
  const of = (more: Record<string, unknown>, offlineOn = true) => cards([row({ current_period_start: START, ...more })], { offlineOn })![0]!;
  // Running, cancelled and over: each was paid for from a day, and says it.
  assert.equal(of({}).from, START);
  assert.equal(of({ status: 'cancelled' }).from, START);
  assert.equal(of({ current_period_end: EARLIER }).from, START);
  // Never paid for: no paid period began, whatever the row holds.
  assert.equal(of({ status: 'pending', current_period_end: null }).from, null);
  assert.equal(of({ status: 'cancelled', current_period_end: null }).from, null);
  // A start that is missing or is not a date is left out; the card is still drawn.
  assert.equal(of({ current_period_start: null }).from, null);
  assert.equal(of({ current_period_start: 'not a date' }).from, null);

  // What Plus adds is said on a Basic plan that is running or waiting, while saving lessons is on.
  const basic = { plans: { name: 'Starter', tier: 'basic' } };
  assert.equal(of(basic).plusAdds, true);
  assert.equal(of({ ...basic, status: 'pending', current_period_end: null }).plusAdds, true);
  assert.equal(of(basic, false).plusAdds, false, 'said while saving lessons is switched off');
  assert.equal(of({}).plusAdds, false, 'said to somebody who has Plus');
  assert.equal(of({ ...basic, status: 'cancelled' }).plusAdds, false);
  assert.equal(of({ ...basic, current_period_end: EARLIER }).plusAdds, false);
  assert.equal(of({ plans: null }).plusAdds, false, 'said about a plan whose shelf is not known');
  // Saving lessons is the one thing the database gives only to Plus.
  const offline = readFileSync(new URL('20261251000100_offline_downloads.sql', MIGRATIONS), 'utf8');
  assert.match(offline, /tier is plus AND whose live version carries the offline_downloads feature/u);
});

test('a learner who can be added carries their age band, to tell two children apart', () => {
  const card = cards([row({ family_plan_allocations: [] })])![0]!;
  const found = addableLearners(card, [
    { id: 'me', display_name: 'Me', learner_type: 'adult', linked_user_id: 'user-1', age_band: '18+' },
    { id: 'a', display_name: 'Yusuf', learner_type: 'child', linked_user_id: null, age_band: '5-7' },
    { id: 'b', display_name: 'Yusuf', learner_type: 'child', linked_user_id: null, age_band: '11-13' },
    { id: 'c', display_name: 'Maryam', learner_type: 'child', linked_user_id: null },
  ], 'user-1');
  assert.deepEqual(found, [
    { id: 'me', name: 'Me', type: 'adult', band: '18+' },
    { id: 'a', name: 'Yusuf', type: 'child', band: '5-7' },
    { id: 'b', name: 'Yusuf', type: 'child', band: '11-13' },
    { id: 'c', name: 'Maryam', type: 'child', band: null },
  ]);
});
