import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { REFUND_STATES, minorOf, paidThroughOf, receiptRefundsOf, refundStateOf, returnedMinorOf } from './receipt.ts';

const MIGRATION = readFileSync(
  resolve(import.meta.dirname, '../../../supabase/migrations/20261020000300_refunds_and_payouts.sql'),
  'utf8',
);

test('every state a refund can be stored in has a name here, and no other does', () => {
  const at = MIGRATION.indexOf('create table public.refund_transactions');
  assert.ok(at > 0);
  const check = /status text not null default 'pending'\s+check \(status in \(([^)]+)\)\)/u.exec(MIGRATION.slice(at));
  assert.ok(check, 'the status check on refund_transactions is no longer where it was');
  const allowed = [...(check[1] ?? '').matchAll(/'([a-z_]+)'/gu)].map((m) => m[1] ?? '');
  assert.deepEqual([...allowed].sort(), [...REFUND_STATES].sort());
  for (const state of allowed) assert.equal(refundStateOf(state), state);
  assert.equal(refundStateOf('reversed'), null);
  assert.equal(refundStateOf('toString'), null);
  assert.equal(refundStateOf(null), null);
});

test('an amount is a whole number of minor units or it is nothing', () => {
  assert.equal(minorOf(50000), '50000');
  assert.equal(minorOf('50000'), '50000');
  assert.equal(minorOf(0), '0');
  assert.equal(minorOf(19.99), null);
  assert.equal(minorOf(-5), null);
  assert.equal(minorOf('12.5'), null);
  assert.equal(minorOf('1e3'), null);
  assert.equal(minorOf(Number.MAX_SAFE_INTEGER + 2), null);
  assert.equal(minorOf(null), null);
});

const row = (over: Record<string, unknown> = {}) => ({ id: 'r1', amount_minor: 12000, currency_code: 'UGX', status: 'completed', refunded_at: '2026-11-21T12:30:00Z', ...over });

test('refunds are read whole or not at all', () => {
  assert.deepEqual(receiptRefundsOf([]), []);
  assert.deepEqual(receiptRefundsOf([row()]), [{ id: 'r1', amountMinor: '12000', currencyCode: 'UGX', state: 'completed', refundedAt: '2026-11-21T12:30:00Z' }]);
  // A state with no sentence is a refund that cannot be shown: an amount with
  // nothing beside it reads as money returned.
  assert.equal(receiptRefundsOf([row({ status: 'reversed' })]), null);
  // What the table itself forbids: completed with no date, and a date on one that is not.
  assert.equal(receiptRefundsOf([row({ refunded_at: null })]), null);
  assert.equal(receiptRefundsOf([row({ refunded_at: 'yesterday' })]), null);
  assert.equal(receiptRefundsOf([row({ status: 'pending' })]), null);
  assert.equal(receiptRefundsOf([row({ status: 'failed', refunded_at: null })])?.[0]?.state, 'failed');
  // One row that cannot be shown makes the list unread, not shorter.
  assert.equal(receiptRefundsOf([row(), row({ amount_minor: '12.5' })]), null);
  assert.equal(receiptRefundsOf([row({ currency_code: 'ugx' })]), null);
  assert.equal(receiptRefundsOf([row({ id: 7 })]), null);
  assert.equal(receiptRefundsOf(null), null);
  assert.equal(receiptRefundsOf({}), null);
});

test('only a completed refund has returned anything', () => {
  const refunds = receiptRefundsOf([
    row({ id: 'a', amount_minor: 12000 }),
    row({ id: 'b', amount_minor: 3000, status: 'pending', refunded_at: null }),
    row({ id: 'c', amount_minor: 2000, status: 'failed', refunded_at: null }),
    row({ id: 'd', amount_minor: '500' }),
  ]);
  assert.ok(refunds);
  assert.equal(returnedMinorOf(refunds, 'UGX'), '12500');
  assert.equal(returnedMinorOf([], 'UGX'), '0');
  // A pending refund in another currency changes nothing; a completed one cannot be added.
  const pendingElsewhere = receiptRefundsOf([row(), row({ id: 'e', currency_code: 'USD', status: 'pending', refunded_at: null })]);
  assert.ok(pendingElsewhere);
  assert.equal(returnedMinorOf(pendingElsewhere, 'UGX'), '12000');
  const mixed = receiptRefundsOf([row(), row({ id: 'f', currency_code: 'USD' })]);
  assert.ok(mixed);
  assert.equal(returnedMinorOf(mixed, 'UGX'), null);
  // Larger than a JavaScript number holds exactly.
  const large = receiptRefundsOf([row({ amount_minor: '900000000000000000' }), row({ id: 'g', amount_minor: '900000000000000000' })]);
  assert.ok(large);
  assert.equal(returnedMinorOf(large, 'UGX'), '1800000000000000000');
});

test('the attempt that paid is the one that succeeded', () => {
  assert.deepEqual(
    paidThroughOf([
      { provider: 'airtel_money_ug', provider_reference: 'FIRST', status: 'failed' },
      { provider: 'mtn_momo_ug', provider_reference: ' REF-1 ', status: 'succeeded' },
    ]),
    { provider: 'mtn_momo_ug', providerReference: 'REF-1' },
  );
  assert.deepEqual(paidThroughOf([{ provider: 'mtn_momo_ug', provider_reference: null, status: 'succeeded' }]), { provider: 'mtn_momo_ug', providerReference: null });
  assert.equal(paidThroughOf([{ provider: 'mtn_momo_ug', provider_reference: 'X', status: 'processing' }]), null);
  assert.equal(paidThroughOf([]), null);
  assert.equal(paidThroughOf(null), null);
});
