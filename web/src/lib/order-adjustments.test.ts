import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADJUSTMENT_TYPES,
  ADJUSTMENT_TYPE_VALUES,
  directionForType,
  isAdjustable,
  mapOrderAdjustmentError,
  normaliseOrdersOverview,
  QUEUE_LIMIT_MAX,
  REASON_MAX,
  summariseQueue,
  validateAdjustmentInput,
  validateVoidInput,
  type QueueOrder,
} from './order-adjustments.ts';

// ---------------------------------------------------------------------------
// The database owns every rule that matters. These tests hold the browser side
// to two things: it does not send something the writer would refuse, and it does
// not turn money into a JavaScript number on the way in or out.
// ---------------------------------------------------------------------------

const ORDER = '2b6d0f3a-6f1a-4c9e-9a2f-6c1d2e3f4a5b';
const ITEM = '9c1e2f3a-4b5c-4d6e-8f9a-0b1c2d3e4f5a';

const valid = (over: Record<string, unknown> = {}) => ({
  orderId: ORDER,
  adjustmentType: 'manual_discount',
  amountMinor: '5000',
  reason: 'Scholarship, approved by email',
  ...over,
});

const orderRow = (over: Partial<QueueOrder> = {}): QueueOrder => ({
  orderId: ORDER,
  status: 'pending_payment',
  createdAt: '2026-10-21T10:00:00Z',
  billingAccountName: 'Aisha',
  currencyCode: 'UGX',
  subtotalMinor: '30000',
  discountMinor: '0',
  taxMinor: '0',
  feeMinor: '0',
  totalMinor: '30000',
  items: [],
  adjustments: [],
  ...over,
});

test('a discount validates and implies its own direction', () => {
  const result = validateAdjustmentInput(valid());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.adjustmentType, 'manual_discount');
  assert.equal(result.value.amountMinor, '5000');
  // No sign is accepted and none is invented: the direction is the type's.
  assert.equal(result.value.direction, null);
  assert.equal(result.value.orderItemId, null);
});

test('every offered type is one the writer accepts', () => {
  // A dropdown that offers a type the writer refuses is a button that always
  // fails. `promotion` is refused by the writer, so it must not be offered.
  assert.deepEqual(ADJUSTMENT_TYPE_VALUES, [
    'manual_discount', 'tax', 'fee', 'shipping', 'rounding',
  ]);
  assert.equal(ADJUSTMENT_TYPE_VALUES.includes('promotion'), false);
  for (const option of ADJUSTMENT_TYPES) {
    assert.ok(option.explains.length > 20, `${option.value} does not say what it does`);
    assert.equal(directionForType(option.value), option.direction);
  }
  assert.equal(directionForType('promotion'), null, 'a refused type claims a direction');
});

test('a promotion is refused with the reason it is refused', () => {
  const result = validateAdjustmentInput(valid({ adjustmentType: 'promotion' }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.message, /promotions policy is undecided/i);
});

test('rounding has to say which way it goes', () => {
  const asked = validateAdjustmentInput(
    valid({ adjustmentType: 'rounding', amountMinor: '47' }),
  );
  assert.equal(asked.ok, false);
  if (!asked.ok) assert.match(asked.message, /needs a direction/i);

  const down = validateAdjustmentInput(
    valid({ adjustmentType: 'rounding', amountMinor: '47', direction: 'credit' }),
  );
  assert.equal(down.ok, true);
  if (down.ok) assert.equal(down.value.direction, 'credit');

  const up = validateAdjustmentInput(
    valid({ adjustmentType: 'rounding', amountMinor: '100', direction: 'debit' }),
  );
  assert.equal(up.ok, true);
  if (up.ok) assert.equal(up.value.direction, 'debit');
});

test('a direction that contradicts the type is refused rather than sent', () => {
  const result = validateAdjustmentInput(
    valid({ adjustmentType: 'manual_discount', direction: 'debit' }),
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.message, /always a credit/i);
});

test('an amount is a positive whole number of minor units and stays a string', () => {
  for (const amountMinor of ['0', '-5000', '50.00', '5,000', '1e3', '', '  ']) {
    const result = validateAdjustmentInput(valid({ amountMinor }));
    assert.equal(result.ok, false, `'${amountMinor}' was accepted as an amount`);
  }

  const big = validateAdjustmentInput(valid({ amountMinor: '1234567890123' }));
  assert.equal(big.ok, true);
  // Not a Number(): this string goes to a bigint column.
  if (big.ok) assert.equal(big.value.amountMinor, '1234567890123');
});

test('a reason is required and bounded', () => {
  for (const reason of ['', '   ']) {
    const result = validateAdjustmentInput(valid({ reason }));
    assert.equal(result.ok, false, 'an adjustment with no reason was accepted');
  }
  const long = validateAdjustmentInput(valid({ reason: 'x'.repeat(REASON_MAX + 1) }));
  assert.equal(long.ok, false);
  const atLimit = validateAdjustmentInput(valid({ reason: 'x'.repeat(REASON_MAX) }));
  assert.equal(atLimit.ok, true);
});

test('ids are checked before anything is sent', () => {
  for (const orderId of ['', 'not-a-uuid', ORDER.slice(0, -1)]) {
    const result = validateAdjustmentInput(valid({ orderId }));
    assert.equal(result.ok, false, `'${orderId}' was accepted as an order id`);
  }
  const item = validateAdjustmentInput(valid({ orderItemId: 'not-a-uuid' }));
  assert.equal(item.ok, false, 'a malformed line item id was accepted');
  const good = validateAdjustmentInput(valid({ orderItemId: ITEM }));
  assert.equal(good.ok, true);
  if (good.ok) assert.equal(good.value.orderItemId, ITEM);
});

test('withdrawing an adjustment needs an id and a reason', () => {
  const noId = validateVoidInput({ reason: 'wrong order' });
  assert.equal(noId.ok, false);
  const noReason = validateVoidInput({ adjustmentId: ITEM });
  assert.equal(noReason.ok, false);
  if (!noReason.ok) assert.match(noReason.message, /say why/i);
  const good = validateVoidInput({ adjustmentId: ITEM, reason: 'Applied to OA-2291 instead' });
  assert.equal(good.ok, true);
});

// ---------------------------------------------------------------------------
// Reading the queue
// ---------------------------------------------------------------------------

test('the reader response is parsed defensively and recounted', () => {
  const overview = normaliseOrdersOverview({
    // A count that disagrees with the array must not be believed.
    count: 99,
    limit: 25,
    orders: [
      {
        orderId: ORDER,
        status: 'pending_payment',
        createdAt: '2026-10-21T10:00:00Z',
        billingAccountName: 'Aisha',
        currencyCode: 'UGX',
        subtotalMinor: '30000',
        discountMinor: '5000',
        taxMinor: 0,
        feeMinor: '1250',
        totalMinor: '26250',
        items: [{ itemId: ITEM, title: 'Tajweed basics', lineTotalMinor: '30000' }],
        adjustments: [
          {
            adjustmentId: 'a-1',
            adjustmentType: 'manual_discount',
            direction: 'credit',
            amountMinor: '5000',
            currencyCode: 'UGX',
            description: 'Scholarship',
            voidedAt: null,
            voidedReason: null,
            createdAt: '2026-10-21T09:00:00Z',
          },
          // No id: not renderable, and inventing one would make a withdraw
          // button point at nothing.
          { adjustmentType: 'fee', direction: 'debit', amountMinor: '1250' },
        ],
      },
      // No currency: cannot be rendered as money, and guessing one turns a
      // missing total into a wrong one.
      { orderId: 'x-1', status: 'pending_payment', totalMinor: '100' },
      'not an object',
    ],
  });

  assert.equal(overview.count, 1, `count is ${overview.count}`);
  assert.equal(overview.limit, 25);
  assert.equal(overview.orders.length, 1);

  const order = overview.orders[0];
  assert.ok(order);
  if (!order) return;
  // Money stays a decimal integer string, whatever the reader sent.
  assert.equal(order.taxMinor, '0', 'a JSON 0 became something other than "0"');
  assert.equal(order.feeMinor, '1250');
  assert.equal(order.totalMinor, '26250');
  assert.equal(order.items.length, 1);
  assert.equal(order.adjustments.length, 1, 'an adjustment with no id was rendered');
  assert.equal(order.adjustments[0]?.voidedAt, null);
});

test('an empty or malformed response is an empty queue, not a crash', () => {
  assert.equal(normaliseOrdersOverview(null).count, 0);
  assert.equal(normaliseOrdersOverview({}).count, 0);
  assert.equal(normaliseOrdersOverview({ orders: null }).count, 0);
  assert.equal(normaliseOrdersOverview('nope').orders.length, 0);
});

test('the queue is summed per currency and never as one number', () => {
  const totals = summariseQueue([
    orderRow({ orderId: 'o1', currencyCode: 'UGX', totalMinor: '30000' }),
    orderRow({ orderId: 'o2', currencyCode: 'UGX', totalMinor: '12500' }),
    orderRow({ orderId: 'o3', currencyCode: 'USD', totalMinor: '4500' }),
  ]);

  // Sorted by code, and one row per code: two currencies are two numbers.
  assert.deepEqual(totals, [
    { currencyCode: 'UGX', orders: 2, totalMinor: '42500' },
    { currencyCode: 'USD', orders: 1, totalMinor: '4500' },
  ]);
  assert.equal(totals.length, 2, 'two currencies were added together');
});

test('a huge total is summed exactly', () => {
  const totals = summariseQueue([
    orderRow({ orderId: 'o1', totalMinor: '9007199254740993' }),
    orderRow({ orderId: 'o2', totalMinor: '1' }),
  ]);
  // Past 2^53, where a Number would quietly round.
  assert.equal(totals[0]?.totalMinor, '9007199254740994');
});

test('only an unpaid order is adjustable', () => {
  assert.equal(isAdjustable(orderRow({ status: 'pending_payment' })), true);
  assert.equal(isAdjustable(orderRow({ status: 'draft' })), true);
  assert.equal(isAdjustable(orderRow({ status: 'awaiting_confirmation' })), true);
  for (const status of ['paid', 'partially_refunded', 'refunded', 'cancelled', 'expired']) {
    assert.equal(isAdjustable(orderRow({ status })), false,
      `'${status}' was offered as adjustable, and its total is history`);
  }
});

test('a refusal from the writer becomes a status a screen can act on', () => {
  const cases: [string, number][] = [
    ['only a finance admin or platform admin may adjust an order', 403],
    ['sign in to adjust an order', 401],
    ['that order does not exist', 404],
    ['that adjustment was already voided on 2026-10-21', 409],
    ['this order is already paid, so its total is history — record a financial adjustment', 409],
    ['that line item is not on this order', 409],
    ['promotion adjustments are not recorded yet: the promotions policy is undecided', 409],
    ['the adjustments on this order reduce it below zero', 409],
    ['unknown adjustment type goodwill', 400],
    ['a rounding adjustment needs a direction: debit or credit', 400],
    ['a manual_discount adjustment is always a credit, not a debit', 400],
    ['give a written reason for the adjustment', 400],
    ['the reason must be 500 characters or fewer', 400],
    ['an adjustment needs a positive whole amount in minor units', 400],
  ];
  for (const [message, status] of cases) {
    const mapped = mapOrderAdjustmentError(message);
    assert.equal(mapped.status, status, `'${message}' mapped to ${mapped.status}`);
    assert.equal(mapped.message, message, 'the writer’s own words were replaced');
  }

  const unknown = mapOrderAdjustmentError('connection terminated unexpectedly');
  assert.equal(unknown.code, 'error');
  assert.equal(unknown.status, 400);
  assert.equal(mapOrderAdjustmentError('').message.length > 0, true,
    'an empty error became an empty message');
});

test('the reader will not be asked for more orders than it returns', () => {
  assert.equal(QUEUE_LIMIT_MAX, 200);
});
