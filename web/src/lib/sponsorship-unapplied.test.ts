import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { PLEDGE_SINCE_WORDS, UNAPPLIED_ACTION, describeUnapplied, parseUnapplied, pledgeSince } from './sponsorship-unapplied.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const MIGRATION = read('../../../supabase/migrations/20261281147000_sponsorship_checkout.sql');
const PAGE = read('../app/admin/sponsorships/page.tsx');

const PLEDGE = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const ORDER = '77777777-7777-4777-8777-777777777777';
const line = (detail: unknown, over: Record<string, unknown> = {}) => ({ target_id: PLEDGE, detail, occurred_at: '2026-11-19T08:17:01Z', ...over });

test('the desk reads the action and the reasons the database writes', () => {
  assert.ok(MIGRATION.includes(`'${UNAPPLIED_ACTION}'`), 'the trigger no longer writes this action');
  // Every reason the trigger can record has a sentence of its own here.
  const literal = [...MIGRATION.matchAll(/v_why := '([a-z_]+)'(?: \|\| ([a-z_.]+))?;/gu)].map((m) => [m[1]!, m[2] ?? null] as const);
  assert.deepEqual(literal, [['pledge_', 'v_row.status'], ['request_', 'v_app.status'], ['course_not_available', null]]);
  const fallback = describeUnapplied('something_else').why;
  for (const reason of ['pledge_withdrawn', 'pledge_paid', 'request_submitted', 'request_declined', 'request_withdrawn', 'request_funded', 'course_not_available']) {
    const said = describeUnapplied(reason);
    assert.notEqual(said.why, fallback, reason);
    assert.ok(said.next.length > 20, reason);
  }
  // What the line carries is what the page reads.
  const written = MIGRATION.slice(MIGRATION.indexOf(`'${UNAPPLIED_ACTION}'`), MIGRATION.indexOf(`'${UNAPPLIED_ACTION}'`) + 400);
  for (const key of ['orderId', 'reason', 'amountMinor', 'currency']) assert.ok(written.includes(`'${key}'`), key);
});

test('a line becomes a payment with its amount in major units, and a line that names no pledge is left out', () => {
  assert.deepEqual(parseUnapplied([line({ orderId: ORDER.toUpperCase(), reason: 'pledge_withdrawn', amountMinor: '33000', currency: 'UGX' })]), [
    { sponsorshipId: PLEDGE, orderId: ORDER, reason: 'pledge_withdrawn', amount: 'UGX 33000', at: '2026-11-19T08:17:01Z' },
  ]);
  // 19.99, not 1999.
  assert.equal(parseUnapplied([line({ reason: 'pledge_paid', amountMinor: '1999', currency: 'USD' })])![0]!.amount, 'USD 19.99');
  // What cannot be read is left out of the line, not guessed at.
  assert.deepEqual(parseUnapplied([line({ orderId: 'ORD-1', reason: 'Refund NOW <b>', amountMinor: 'lots', currency: 'UGX' }, { occurred_at: null })]), [
    { sponsorshipId: PLEDGE, orderId: null, reason: 'unknown', amount: null, at: null },
  ]);
  assert.deepEqual(parseUnapplied([line(null), line('text'), line([])])!.map((p) => [p.reason, p.amount]), [['unknown', null], ['unknown', null], ['unknown', null]]);
  assert.deepEqual(parseUnapplied([null, 'x', {}, { target_id: 'not-an-id', detail: {} }, { target_id: 7 }]), []);
  assert.deepEqual(parseUnapplied([]), []);
  // Not a list is not "none".
  for (const bad of [null, undefined, {}, 'rows', 3]) assert.equal(parseUnapplied(bad), null);
});

test('what to do is said per reason, and never as though the money were not there', () => {
  assert.match(describeUnapplied('pledge_withdrawn').next, /refund the order/u);
  assert.match(describeUnapplied('pledge_paid').why, /second payment for one seat/u);
  // A withdrawn course is the one case where the money can still buy the seat.
  assert.match(describeUnapplied('course_not_available').next, /record this payment against the pledge with the order as its reference; otherwise refund the order/u);
  assert.match(describeUnapplied('request_withdrawn').why, /taken back by the family/u);
  assert.match(describeUnapplied('request_declined').why, /had been declined/u);
  // A reason nobody wrote a sentence for tells staff to look, not to act.
  assert.match(describeUnapplied('').next, /Look at the pledge and the order before doing anything/u);
  for (const reason of ['pledge_withdrawn', 'pledge_paid', 'course_not_available', 'request_declined', 'zzz']) {
    const said = describeUnapplied(reason);
    assert.doesNotMatch(`${said.why} ${said.next}`, /\b(he|she|his|her|him)\b/iu, reason);
  }
});

test('what happened to the pledge since is read from the desk\'s own list, and only as far as it goes', () => {
  const payment = (reason: string) => parseUnapplied([line({ reason })])![0]!;
  assert.equal(pledgeSince(payment('course_not_available'), [{ id: PLEDGE, status: 'pledged' }]), 'still_waiting');
  assert.equal(pledgeSince(payment('course_not_available'), [{ id: PLEDGE.toUpperCase(), status: 'paid' }]), 'applied_by_hand');
  assert.equal(pledgeSince(payment('pledge_paid'), [{ id: PLEDGE, status: 'paid' }]), 'paid_before');
  assert.equal(pledgeSince(payment('pledge_withdrawn'), []), 'called_off');
  assert.equal(pledgeSince(payment('pledge_withdrawn'), [{ id: ORDER, status: 'paid' }]), 'called_off');
  // "May already have been applied": the list cannot say that it was.
  assert.match(PLEDGE_SINCE_WORDS.applied_by_hand, /may already have been applied by hand/u);
});

test('the staff page shows the lines, says when it cannot read them, and does not claim to know about refunds', () => {
  assert.doesNotMatch(PAGE, /'use client'/u);
  assert.match(PAGE, /\.from\('governance_audit_events'\)\s*\.select\('target_id, detail, occurred_at'\)\s*\.eq\('action', UNAPPLIED_ACTION\)\s*\.eq\('target_type', 'sponsorship'\)/u);
  assert.match(PAGE, /const unapplied = late\.error \? null : parseUnapplied\(late\.data\);/u);
  // Unread is said aloud, and is not "none".
  assert.match(PAGE, /\{unapplied === null && \(\s*<div className="notice error" role="alert"/u);
  assert.match(PAGE, /This page cannot tell whether an order has since been refunded/u);
  // The sentence that used to be true of every sponsored seat is no longer said of one paid at checkout.
  assert.doesNotMatch(PAGE, /A sponsored seat creates <strong>no order<\/strong>/u);
  assert.match(PAGE, /A pledge paid at checkout has an order/u);
  // The database's own error text is not printed.
  assert.doesNotMatch(PAGE, /late\.error\.message/u);
});
