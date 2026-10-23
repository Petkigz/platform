import assert from 'node:assert/strict';
import test from 'node:test';

import { requestRefund, decideRefund, fetchRefundQueue } from './refunds.ts';

// ---------------------------------------------------------------------------
// The rules under test are the ones that are easy to get wrong silently:
//
//   * money never becomes a float on the way to the database (D4)
//   * a declined refund cannot go out without a written reason
//   * a database refusal is translated to a status that means something, rather
//     than arriving as a bare 400 that tells nobody anything
//
// A validation that is wrong here is invisible: the RPC would still be called,
// and the failure would surface to a customer as a generic error.
// ---------------------------------------------------------------------------

type RpcCall = { fn: string; args: Record<string, unknown> };
/** Indexing with noUncheckedIndexedAccess on: fail loudly, not with a cast. */
function one<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`expected at least one ${label}, got none`);
  return row;
}


/**
 * A Supabase stub that records RPC calls.
 *
 * The arguments matter more than the return value here — the point is to see
 * what would have been sent to the database.
 */
function stubRpc(
  result: { data?: unknown; error?: { message: string } } = { data: 'req-1' },
) {
  const calls: RpcCall[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

/** A stub for the queue query, which chains rather than calling an RPC. */
function stubQueue(rows: unknown[], error: { message: string } | null = null) {
  let select = '';
  const filters: Record<string, unknown> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = (s: string) => {
    select = s;
    return chain;
  };
  chain.eq = (col: string, val: unknown) => {
    filters[col] = val;
    return chain;
  };
  chain.order = () => chain;
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: rows, error }).then(resolve);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = { from: () => chain } as any;
  return { client, filters, selectArg: () => select };
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

test('an amount with a decimal point is refused rather than rounded', async () => {
  const { client, calls } = stubRpc();

  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '300.5',
    reason: 'Duplicate charge',
  });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0, 'a malformed amount must not reach the database');
  if (!res.ok) assert.match(res.error, /whole number of minor units/);
});

test('a float amount is refused rather than silently truncated', async () => {
  const { client, calls } = stubRpc();

  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: 300.5,
    reason: 'Duplicate charge',
  });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0, 'a float must not reach the database');
});

test('a whole minor-unit amount is passed through exactly', async () => {
  const { client, calls } = stubRpc();

  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    reason: 'Duplicate charge',
  });

  assert.equal(res.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(one(calls, 'rpc call').fn, 'request_refund');
  assert.equal(one(calls, 'rpc call').args.p_amount_minor, 30000);
  assert.equal(one(calls, 'rpc call').args.p_order_id, 'order-1');
});

test('a string amount stays exact past Number.MAX_SAFE_INTEGER reasoning', async () => {
  // A large UGX amount. The point is not the size, it that the string path and
  // the numeric path agree rather than one rounding and the other not.
  const { client, calls } = stubRpc();

  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '1250000',
    reason: 'Course not as described',
  });

  assert.equal(res.ok, true);
  assert.equal(one(calls, 'rpc call').args.p_amount_minor, 1250000);
});

test('a zero or negative amount is refused', async () => {
  const { client, calls } = stubRpc();

  const zero = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '0',
    reason: 'Nothing',
  });
  assert.equal(zero.ok, false);

  const negative = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '-500',
    reason: 'Nothing',
  });
  assert.equal(negative.ok, false);
  assert.equal(calls.length, 0, 'neither should reach the database');
});

test('the currency is never taken from the caller', async () => {
  const { client, calls } = stubRpc();

  await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    reason: 'Duplicate charge',
    // Deliberately not part of RequestInput: the point is that an extra field
    // is ignored rather than forwarded. Cast so the excess is the test's, not
    // a typing mistake elsewhere.
    currencyCode: 'USD',
  } as unknown as Parameters<typeof requestRefund>[1]);

  assert.equal(
    'p_currency_code' in one(calls, 'rpc call').args,
    false,
    'the function must take the currency from the order, not the request',
  );
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

test('a missing order id never reaches the database', async () => {
  const { client, calls } = stubRpc();
  const res = await requestRefund(client, { amountMinor: '30000', reason: 'x' });
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
});

test('a blank reason never reaches the database', async () => {
  const { client, calls } = stubRpc();
  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    reason: '    ',
  });
  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

test('the reason is trimmed before it is sent', async () => {
  const { client, calls } = stubRpc();
  await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    reason: '  Duplicate charge  ',
  });
  assert.equal(one(calls, 'rpc call').args.p_reason, 'Duplicate charge');
});

test('an overlong reason is refused', async () => {
  const { client, calls } = stubRpc();
  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    reason: 'x'.repeat(1001),
  });
  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

// ---------------------------------------------------------------------------
// Translating what the database says
// ---------------------------------------------------------------------------

test('an order that is not yours is a 403, not a generic failure', async () => {
  const { client } = stubRpc({
    error: { message: 'you are not on the billing account for this order' },
  });

  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    reason: 'Please',
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 403);
    assert.match(res.error, /not on your billing account/);
  }
});

test('an unpaid order is a 409 with an explanation', async () => {
  const { client } = stubRpc({
    error: { message: 'order is pending_payment, so there is nothing to refund' },
  });

  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    reason: 'Please',
  });

  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 409);
});

test('asking for more than is left is a 409', async () => {
  const { client } = stubRpc({
    error: { message: 'refund request of 99999 exceeds the refundable balance of 30000' },
  });

  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '99999',
    reason: 'Please',
  });

  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 409);
});

test('an unrecognised database error still surfaces its message', async () => {
  const { client } = stubRpc({ error: { message: 'something unexpected happened' } });

  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    reason: 'Please',
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 400);
    assert.match(res.error, /something unexpected/);
  }
});

// ---------------------------------------------------------------------------
// Deciding
// ---------------------------------------------------------------------------

test('declining without a reason never reaches the database', async () => {
  const { client, calls } = stubRpc({ data: null });

  const res = await decideRefund(client, { requestId: 'req-1', approve: false, notes: '   ' });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0, 'the function enforces this too, but it should not be reached');
});

test('approving without notes is allowed', async () => {
  const { client, calls } = stubRpc({ data: null });

  const res = await decideRefund(client, { requestId: 'req-1', approve: true });

  assert.equal(res.ok, true);
  assert.equal(one(calls, 'rpc call').fn, 'decide_refund_request');
  assert.equal(one(calls, 'rpc call').args.p_approve, true);
  assert.equal(one(calls, 'rpc call').args.p_notes, null);
});

test('a missing request id never reaches the database', async () => {
  const { client, calls } = stubRpc({ data: null });
  const res = await decideRefund(client, { approve: true });
  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

test('approving your own refund is a 403', async () => {
  const { client } = stubRpc({
    error: { message: 'you cannot decide a refund you requested yourself' },
  });

  const res = await decideRefund(client, { requestId: 'req-1', approve: true });

  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 403);
});

test('a non-privileged caller is a 403', async () => {
  const { client } = stubRpc({ error: { message: 'only staff may decide a refund' } });

  const res = await decideRefund(client, { requestId: 'req-1', approve: true });

  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 403);
});

test('a request that was already decided is a 409', async () => {
  const { client } = stubRpc({ error: { message: 'that refund is already approved' } });

  const res = await decideRefund(client, { requestId: 'req-1', approve: true });

  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 409);
});

// ---------------------------------------------------------------------------
// The queue
// ---------------------------------------------------------------------------

test('the queue asks only for pending requests', async () => {
  const { client, filters } = stubQueue([]);
  await fetchRefundQueue(client);
  assert.equal(filters.status, 'requested');
});

test('the queue flattens the requester join', async () => {
  const { client } = stubQueue([
    {
      id: 'req-1',
      order_id: 'order-1',
      requested_amount_minor: '30000',
      currency_code: 'UGX',
      reason: 'Duplicate',
      status: 'requested',
      requested_by: 'user-1',
      created_at: '2026-03-01T10:00:00Z',
      requested_by_profile: [{ display_name: 'Amina' }],
    },
  ]);

  const rows = await fetchRefundQueue(client);

  assert.equal(rows.length, 1);
  assert.equal(one(rows, 'queue row').requester?.display_name, 'Amina');
  // The raw nested array must not leak into the shape the page renders.
  assert.equal(
    'requested_by_profile' in one(rows, 'queue row'),
    false,
    'the nested join array should have been flattened away',
  );
});

test('a queue row with no requester profile still renders', async () => {
  const { client } = stubQueue([
    {
      id: 'req-2',
      order_id: 'order-2',
      requested_amount_minor: '5000',
      currency_code: 'UGX',
      reason: 'x',
      status: 'requested',
      requested_by: 'user-2',
      created_at: '2026-03-01T10:00:00Z',
      requested_by_profile: null,
    },
  ]);

  const rows = await fetchRefundQueue(client);
  assert.equal(one(rows, 'queue row').requester, null);
});

test('a queue error propagates rather than becoming an empty queue', async () => {
  // An empty list and a failed query look identical on screen. Throwing is the
  // only way the page can tell the difference.
  const { client } = stubQueue([], { message: 'permission denied' });
  await assert.rejects(() => fetchRefundQueue(client), /permission denied/);
});

// ---------------------------------------------------------------------------
// The 72-hour window
// ---------------------------------------------------------------------------
//
// The clock is the database's, and the screen only phrases what it is told.
// These tests exist because the alternative — subtracting `paid_at` from
// `Date.now()` in the browser — usually agrees and is wrong exactly when it
// matters: a laptop that has been asleep, a wrong time zone, a page left open
// across the boundary.

import {
  describeRemaining,
  fetchRefundStanding,
  normaliseStanding,
  openRefundOnBehalf,
} from './refunds.ts';

const standingRow = {
  orderId: 'order-1',
  orderNumber: 'AS-00001234',
  status: 'paid',
  allowed: true,
  reason: 'allowed',
  message: 'A refund can be asked for until 26 Oct 2026 at 09:14 UTC.',
  windowHours: 72,
  paidAt: '2026-10-23T09:14:00Z',
  closesAt: '2026-10-26T09:14:00Z',
  remainingHours: 71,
  refundableMinor: '30000',
  currencyCode: 'UGX',
  asStaff: false,
};

test('a standing is read as the database shaped it', () => {
  const standing = normaliseStanding(standingRow);
  assert.equal(standing.allowed, true);
  assert.equal(standing.windowHours, 72);
  assert.equal(standing.remainingHours, 71);
  assert.equal(standing.refundableMinor, '30000');
});

test('a closed window keeps its sentence and its date', () => {
  const closed = normaliseStanding({
    ...standingRow,
    allowed: false,
    reason: 'window_closed',
    remainingHours: 0,
    message: 'A refund can be asked for within 72 hours of payment, and that window closed on 26 Oct 2026 at 09:14 UTC.',
  });
  assert.equal(closed.allowed, false);
  assert.match(closed.message, /closed on/);
});

test('a malformed standing is refused rather than rendered as zero', () => {
  assert.throws(() => normaliseStanding({ orderId: 'x' }), /malformed/);
  assert.throws(
    () => normaliseStanding({ ...standingRow, refundableMinor: '300.5' }),
    /minor units/,
  );
});

test('hours left is said in a way a person reads quickly', () => {
  assert.equal(describeRemaining(0), 'The window has closed.');
  assert.equal(describeRemaining(-3), 'The window has closed.');
  assert.equal(describeRemaining(null), '');
  assert.equal(describeRemaining(1), '1 hour left.');
  assert.equal(describeRemaining(23), '23 hours left.');
  assert.equal(describeRemaining(24), '1 day left.');
  assert.equal(describeRemaining(71), '2 days and 23 hours left.');
});

test('the form only appears when the database says the window is open', async () => {
  const { client } = stubRpc({ data: standingRow });
  const standing = await fetchRefundStanding(client, 'order-1');
  assert.equal(standing?.allowed, true);

  const { client: closedClient } = stubRpc({
    data: { ...standingRow, allowed: false, reason: 'window_closed' },
  });
  const closed = await fetchRefundStanding(closedClient, 'order-1');
  assert.equal(closed?.allowed, false);
});

test('a standing that cannot be read does not break the order list', async () => {
  const { client } = stubRpc({ error: { message: 'permission denied' } });
  assert.equal(await fetchRefundStanding(client, 'order-1'), null);
});

test('a refund refused for the window is said in the database words', async () => {
  const { client } = stubRpc({
    error: { message: 'the refund window closed on 26 Oct 2026 at 09:14 UTC — a refund can be asked for within 72 hours of payment' },
  });
  const res = await requestRefund(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    reason: 'Please',
  });
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 409);
    assert.match(res.error, /^The refund window closed on 26 Oct 2026/);
  }
});

// A stub for the two queries on-behalf makes: the order lookup, then an RPC.
function stubBehalf(
  order: { id: string } | null,
  standing: unknown = standingRow,
  rpcError: { message: string } | null = null,
) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = {
    from: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: order, error: null }),
      };
      return chain;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === 'refund_standing') return { data: standing, error: null };
      return { data: rpcError ? null : 'req-9', error: rpcError };
    },
  };
  return { client, calls };
}

test('staff refunds what is left, without typing an amount', async () => {
  const { client, calls } = stubBehalf({ id: 'order-1' });
  const res = await openRefundOnBehalf(client, {
    orderNumber: 'as-00001234',
    reason: 'Course was sold with the wrong level; agreed on the call',
  });

  assert.equal(res.ok, true);
  const refund = one(calls.filter((c) => c.fn === 'request_refund'), 'request_refund call');
  assert.equal(refund.args.p_amount_minor, 30000);
  assert.equal(refund.args.p_order_id, 'order-1');
  // Nothing is decided here: the row it creates is a request.
  assert.equal(calls.some((c) => c.fn === 'decide_refund_request'), false);
});

test('an order number that is not one is refused before any query', async () => {
  const { client, calls } = stubBehalf({ id: 'order-1' });
  const res = await openRefundOnBehalf(client, { orderNumber: 'nope', reason: 'Because' });
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
});

test('a reason is required to open one on behalf', async () => {
  const { client, calls } = stubBehalf({ id: 'order-1' });
  const res = await openRefundOnBehalf(client, { orderNumber: 'AS-00001234', reason: '   ' });
  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

test('an order with nothing left is refused with the reason, not an opaque error', async () => {
  const { client, calls } = stubBehalf(
    { id: 'order-1' },
    { ...standingRow, allowed: false, reason: 'nothing_left', refundableMinor: '0' },
  );
  const res = await openRefundOnBehalf(client, { orderNumber: 'AS-00001234', reason: 'Goodwill' });
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /already been returned/);
  assert.equal(calls.some((c) => c.fn === 'request_refund'), false);
});

// ---------------------------------------------------------------------------
// Moving the window itself
// ---------------------------------------------------------------------------

import { setRefundWindow } from './refunds.ts';

test('a window change carries a reason to the database', async () => {
  const { client, calls } = stubRpc({ data: 48 });
  const res = await setRefundWindow(client, { hours: '48', reason: 'Eid weeks are busy' });
  assert.equal(res.ok, true);
  const call = one(calls, 'rpc call');
  assert.equal(call.fn, 'set_refund_window');
  assert.equal(call.args.p_hours, 48);
  assert.equal(call.args.p_reason, 'Eid weeks are busy');
});

test('a window with no reason never reaches the database', async () => {
  const { client, calls } = stubRpc({ data: 48 });
  const res = await setRefundWindow(client, { hours: '48', reason: '  ' });
  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

test('a window longer than a year is refused before the round trip', async () => {
  const { client, calls } = stubRpc({ data: 48 });
  const res = await setRefundWindow(client, { hours: '9000', reason: 'Forever' });
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /year/);
  assert.equal(calls.length, 0);
});

test('a negative window is refused, and zero is not', async () => {
  const { client, calls } = stubRpc({ data: 0 });
  const negative = await setRefundWindow(client, { hours: '-1', reason: 'Testing' });
  assert.equal(negative.ok, false);
  assert.equal(calls.length, 0);

  const zero = await setRefundWindow(client, { hours: '0', reason: 'Closing self-serve refunds' });
  assert.equal(zero.ok, true);
  assert.equal(zero.ok && zero.hours, 0);
});
