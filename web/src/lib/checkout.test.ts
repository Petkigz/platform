import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOrder,
  createPlanOrder,
  describeOrderAdjustment,
  describeOrderBreakdown,
  recordPaymentAttempt,
  resolveBillingAccount,
  resolveOpenAttempts,
} from './checkout.ts';

// ---------------------------------------------------------------------------
// The rule under test: the client supplies a price id and never an amount. The
// amount is resolved here from the price row. These tests aim at the ways that
// can go wrong — a price for the wrong course, a dead price, a subscription
// sold as a purchase — because every one of them is a way to charge the wrong
// amount or to charge for nothing.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

/**
 * A Supabase stub that records every call and answers per table.
 *
 * It implements the chainable shape rather than mocking the library, because
 * the chain is the thing that breaks silently: a missing `.eq()` does not throw,
 * it widens the query, and a widened query here means a price that was not
 * filtered by status.
 */
function stubClient(
  data: Record<string, Row[] | Row | null>,
  /** Table -> error message, so a failing write can be modelled at all. */
  errors: Record<string, string> = {},
) {
  const calls: { table: string; filters: Record<string, unknown>; method: string; insert?: Row }[] = [];

  const make = (table: string, filters: Record<string, unknown>, method = 'select') => {
    const chain: Record<string, unknown> = {};
    chain.eq = (col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    };
    chain.is = (col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    };
    chain.in = (col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    };
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.select = () => chain;
    chain.update = (patch: Row) => {
      calls.push({ table, filters, method: 'update', insert: patch });
      return chain;
    };
    chain.insert = (row: Row) => {
      calls.push({ table, filters, method: 'insert', insert: row });
      return make(table, filters, 'insert');
    };
    chain.single = async () => {
      calls.push({ table, filters, method: 'single' });
      // An insert followed by .select().single() echoes the row back. Without
      // this, a successful insert looks like a failure to the caller.
      if (method === 'insert') {
        const err = errors[table] ? { message: errors[table] } : null;
        if (err) return { data: null, error: err };
        // Prefer the canned row when the test supplied one, so callers that
        // depend on a specific id still get it; otherwise echo a synthetic one.
        const dd = data[table];
        const canned = Array.isArray(dd) ? dd[0] ?? null : dd ?? null;
        return { data: canned ?? { id: `inserted-${table}` }, error: null };
      }
      const d = data[table];
      const row = Array.isArray(d) ? d[0] ?? null : d ?? null;
      if (!row) return { data: null, error: { message: `${table}: no row` } };
      return { data: row, error: null };
    };
    chain.maybeSingle = async () => {
      calls.push({ table, filters, method: 'maybeSingle' });
      const d = data[table];
      const row = Array.isArray(d) ? d[0] ?? null : d ?? null;
      return { data: row ?? null, error: null };
    };
    chain.then = (resolve: (v: unknown) => unknown) => {
      calls.push({ table, filters, method });
      const d = data[table];
      const rows = Array.isArray(d) ? d : d ? [d] : [];
      const err = errors[table] ? { message: errors[table] } : null;
      return Promise.resolve({ data: rows, error: err }).then(resolve);
    };
    return chain;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = { from: (t: string) => make(t, {}) } as any;
  return { client, calls };
}

const ACTIVE_PRICE = {
  id: 'price-1',
  product_id: 'prod-1',
  amount_minor: '30000',
  currency_code: 'UGX',
  billing_interval: 'one_time',
  status: 'active',
  effective_from: null,
  effective_until: null,
  products: [{ id: 'prod-1', status: 'active', name: 'Tajweed basics' }],
};

const LINKED = [{ product_id: 'prod-1' }];

const baseData = (over: Partial<Record<string, Row[] | Row | null>> = {}) => ({
  // publishedVersionId
  course_versions: { id: 'v-1', version_number: 1 },
  prices: ACTIVE_PRICE,
  product_course_versions: LINKED,
  billing_account_memberships: [],
  billing_accounts: { id: 'acct-1' },
  orders: { id: 'order-1' },
  order_items: { id: 'item-1' },
  ...over,
});

// ---------------------------------------------------------------------------
// Since 20261224000100_course_order_writer.sql the offer is resolved in SQL, by
// create_course_order(), and the two insert policies that made a client-written
// order possible are gone. So the tests that used to sit here — an inactive
// price, a price for another course, a price outside its window, a subscription
// sold as a purchase — are no longer this file's to make: they are made against
// a real database in supabase/tests/course_order.test.mjs, where a stub cannot
// answer whatever columns happen to be asked for.
//
// What is left here is the part that genuinely lives in TypeScript: the writer
// is handed ids and nothing else, and its refusal keys become sentences.
// ---------------------------------------------------------------------------

const ORDER_ROW: Row = {
  orderId: 'order-1',
  orderItemId: 'item-1',
  billingAccountId: 'acct-1',
  productId: 'prod-1',
  priceId: 'price-1',
  courseVersionId: 'v-1',
  amountMinor: '30000',
  currencyCode: 'UGX',
  title: 'Tajweed basics',
};

/** A client whose only capability is calling the writer. */
function writerClient(
  result: { data: unknown; error: { message: string } | null },
) {
  const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  const calls: { table: string; method: string }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return result;
    },
    // Any table access at all during createOrder would mean the client is
    // still resolving something the writer is supposed to resolve.
    from: (t: string) => {
      calls.push({ table: t, method: 'from' });
      throw new Error(`createOrder read or wrote '${t}' directly`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, rpcCalls, calls };
}

test('the order is created by the writer, from ids and nothing else', async () => {
  const { client, rpcCalls, calls } = writerClient({ data: ORDER_ROW, error: null });

  const result = await createOrder(client, { courseId: 'course-1', priceId: 'price-1' });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.orderId, 'order-1');
  assert.equal(result.amount.amountMinor, 30000n);
  assert.equal(result.currencyCode, 'UGX');

  assert.deepEqual(rpcCalls, [{
    fn: 'create_course_order',
    args: { p_course_id: 'course-1', p_price_id: 'price-1' },
  }]);

  const argKeys = Object.keys(rpcCalls[0]?.args ?? {});
  for (const forbidden of ['amount_minor', 'amountMinor', 'total_minor', 'currency_code',
                           'product_id', 'billing_account_id', 'user_id', 'status']) {
    assert.equal(argKeys.includes(forbidden), false,
      `the client sent '${forbidden}' to the writer — that is a value the payer could choose`);
  }
  assert.equal(calls.length, 0, 'createOrder touched a table directly');
});

test('a refusal key becomes a code and a sentence, and the key never leaks', async () => {
  const expected: Record<string, string> = {
    not_signed_in: 'error',
    disabled: 'checkout_disabled',
    course_not_available: 'not_found',
    price_not_available: 'price_not_available',
    price_window: 'price_not_available',
    not_one_time: 'not_paid_course',
    price_not_for_this_course: 'price_not_for_this_course',
    already_owned: 'already_entitled',
  };

  for (const [key, code] of Object.entries(expected)) {
    const { client } = writerClient({
      data: null,
      error: { message: `checkout:${key}` },
    });
    const result = await createOrder(client, { courseId: 'course-1', priceId: 'price-1' });
    assert.equal(result.ok, false, `checkout:${key} was not refused`);
    if (result.ok) continue;
    assert.equal(result.code, code, `checkout:${key} mapped to '${result.code}'`);
    assert.equal(result.message.includes('checkout:'), false,
      `the payer was shown the raw refusal key: ${result.message}`);
    assert.ok(result.message.length > 12,
      `'${result.message}' is not a sentence a payer can act on`);
  }
});

test('an already-owned refusal reassures, and does not accuse the payer', async () => {
  // A course purchase grants every learner profile on the account that pays, so
  // the commonest way to meet this is a guardian who does not know the family is
  // already covered — including the case that looks like a second child. The
  // sentence has to say the account is covered, not that the person did
  // something wrong.
  const { client } = writerClient({
    data: null,
    error: { message: 'checkout:already_owned' },
  });
  const result = await createOrder(client, { courseId: 'course-1', priceId: 'price-1' });
  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.code, 'already_entitled');
  assert.match(result.message, /everyone on this account/i,
    'the refusal blames the person rather than describing the account');
  assert.match(result.message, /add nothing/i,
    'the refusal does not say why it was stopped, so it reads as an error');
  // "You already own this" is the wrong sentence here: it is not one person's
  // access that blocks the sale, and a parent buying for a second child would
  // read it as a refusal to let them.
  assert.equal(/^you already/i.test(result.message), false,
    `the refusal accuses the payer: '${result.message}'`);
  assert.equal(result.message.includes('checkout:'), false,
    'the payer was shown the raw refusal key');
});

test('a refusal nobody mapped is loud rather than friendly', async () => {
  // Degrading an unknown key to a nice sentence would hide a writer that has
  // grown a refusal this file does not know about. A 500 is the honest answer.
  const { client } = writerClient({
    data: null,
    error: { message: 'checkout:some_new_reason' },
  });

  const result = await createOrder(client, { courseId: 'course-1', priceId: 'price-1' });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'error');
  assert.match(result.message, /some_new_reason/);
});

test('a database error that is not a refusal is passed through as an error', async () => {
  const { client } = writerClient({
    data: null,
    error: { message: 'connection terminated unexpectedly' },
  });

  const result = await createOrder(client, { courseId: 'course-1', priceId: 'price-1' });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'error');
});

test('a result with no amount is refused rather than charged as zero', async () => {
  // The handoff charges `result.amount`. An order that came back without an
  // amount must not become a zero charge that fulfils everything.
  for (const data of [
    { ...ORDER_ROW, amountMinor: undefined },
    { ...ORDER_ROW, currencyCode: undefined },
    { amountMinor: '30000', currencyCode: 'UGX' },
    null,
  ]) {
    const { client } = writerClient({ data, error: null });
    const result = await createOrder(client, { courseId: 'course-1', priceId: 'price-1' });
    assert.equal(result.ok, false, `${JSON.stringify(data)} was accepted as an order`);
    if (result.ok) continue;
    assert.equal(result.code, 'error');
  }
});

test('the amount stays exact whatever its size', async () => {
  // amountMinor comes back as a decimal integer string precisely so that this
  // is not a Number() at any point: 1234567890123 minor units of a zero-decimal
  // currency is past the point where a double starts approximating.
  const { client } = writerClient({
    data: { ...ORDER_ROW, amountMinor: '1234567890123', currencyCode: 'UGX' },
    error: null,
  });

  const result = await createOrder(client, { courseId: 'course-1', priceId: 'price-1' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.amount.amountMinor, 1234567890123n);
  assert.equal(result.amount.currency, 'UGX');
});

test('resolveBillingAccount reuses an account instead of opening a second one', async () => {
  // Now only the plan path resolves an account in TypeScript; the course writer
  // does it in SQL, where it can also refuse an account the caller may not pay
  // from and match the account currency to the price.
  const { client, calls } = stubClient(
    baseData({ billing_account_memberships: [{ billing_account_id: 'acct-existing' }] }),
  );

  const accountId = await resolveBillingAccount(client, 'user-1');
  assert.equal(accountId, 'acct-existing');

  const created = calls.filter((c) => c.table === 'billing_accounts' && c.method === 'insert');
  assert.equal(created.length, 0, 'a second billing account was opened for one person');
});

test('resolveBillingAccount creates an account when the payer has none', async () => {
  const { client, calls } = stubClient(baseData());

  const accountId = await resolveBillingAccount(client, 'user-1');
  assert.equal(accountId, 'acct-1');

  const created = calls.find((c) => c.table === 'billing_accounts' && c.method === 'insert');
  assert.ok(created, 'no billing account was created');
  // created_by is what billing_accounts_insert enforces, and what the creator
  // membership trigger keys off. Getting this wrong means the account cannot be
  // read or ordered against — the dead end that migration fixed.
  assert.equal(created.insert?.created_by, 'user-1');
  assert.equal(calls.some((c) => c.table === 'billing_accounts' && c.method === 'single'), false,
    'INSERT ... RETURNING would run before the creator membership trigger makes SELECT policy true');
  assert.equal(calls.some((c) => c.table === 'billing_accounts' && c.method === 'maybeSingle'), true,
    'the id should be selected only after the plain INSERT and trigger complete');
});

test('plan checkout sends ids, not an amount, and keeps pending orders payment-gated', async () => {
  const { client, calls } = stubClient(baseData());
  const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  client.rpc = async (fn: string, args: Record<string, unknown>) => {
    rpcCalls.push({ fn, args });
    return {
      data: [{ order_id: 'plan-order-1', subscription_id: 'sub-1', amount_minor: '125000', currency_code: 'UGX' }],
      error: null,
    };
  };

  const result = await createPlanOrder(client, {
    planVersionId: 'version-1',
    priceId: 'price-1',
    learnerProfileId: 'learner-1',
    userId: 'user-1',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.orderId, 'plan-order-1');
  assert.equal(result.amount.amountMinor, 125000n);
  assert.equal(result.currencyCode, 'UGX');
  assert.deepEqual(rpcCalls, [{
    fn: 'create_plan_order',
    args: {
      p_billing_account_id: 'acct-1',
      p_plan_version_id: 'version-1',
      p_price_id: 'price-1',
      p_learner_profile_id: 'learner-1',
    },
  }]);
  assert.equal(Object.hasOwn(rpcCalls[0]?.args ?? {}, 'amount_minor'), false,
    'the client must not supply or influence the amount');
});

test('a payment attempt is recorded with a stable idempotency key', async () => {
  const { client, calls } = stubClient({
    payment_attempts: [],
  });

  const id = await recordPaymentAttempt(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    currencyCode: 'UGX',
    providerId: 'mtn_momo',
    method: 'mobile_money',
  });
  assert.ok(id, 'no attempt id came back');

  const insert = calls.find(
    (c) => c.table === 'payment_attempts' && c.method === 'insert',
  );
  assert.ok(insert?.insert, 'no attempt was inserted');
  // The key is what a provider deduplicates on, so a payer pressing the button
  // twice must not mint a second charge.
  assert.equal(insert.insert?.idempotency_key, 'order-1:1');
  assert.equal(insert.insert?.status, 'pending');
  assert.equal(insert.insert?.method, 'mobile_money');
  // Amount stays a string all the way to the bigint column.
  assert.equal(insert.insert?.amount_minor, '30000');
});

test('a second attempt on the same order gets a distinct key', async () => {
  const { client, calls } = stubClient({
    payment_attempts: [{ id: 'a-1' }],
  });

  await recordPaymentAttempt(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    currencyCode: 'UGX',
    providerId: 'mtn_momo',
  });

  const insert = calls.find(
    (c) => c.table === 'payment_attempts' && c.method === 'insert',
  );
  // (order_id, idempotency_key) is unique, so reusing the key would be a
  // database error rather than a silent duplicate.
  assert.equal(insert?.insert?.idempotency_key, 'order-1:2');
});

test('the method is null when nothing implies one', async () => {
  // Guessing 'card' would put a falsehood in a support-facing record.
  const { client, calls } = stubClient({ payment_attempts: [] });

  await recordPaymentAttempt(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    currencyCode: 'UGX',
    providerId: 'mtn_momo',
  });

  const insert = calls.find(
    (c) => c.table === 'payment_attempts' && c.method === 'insert',
  );
  assert.equal(insert?.insert?.method, null);
});

test('a failed attempt write does not break checkout', async () => {
  // This is a diagnostic record. Refusing to take a payment because a log could
  // not be written would be the wrong trade.
  const { client } = stubClient(
    { payment_attempts: null },
    { payment_attempts: 'permission denied' },
  );

  const id = await recordPaymentAttempt(client, {
    orderId: 'order-1',
    amountMinor: '30000',
    currencyCode: 'UGX',
    providerId: 'mtn_momo',
  });
  assert.equal(id, null);
});

test('resolving attempts moves status and resolved_at together', async () => {
  // The table enforces resolved_at IS NULL exactly when the status is still
  // open, so setting one without the other is a CHECK violation.
  const { client, calls } = stubClient({ payment_attempts: [{ id: 'a-1' }] });

  await resolveOpenAttempts(client, {
    orderId: 'order-1',
    status: 'succeeded',
    providerReference: 'ref-9',
  });

  const update = calls.find(
    (c) => c.table === 'payment_attempts' && c.method === 'update',
  );
  assert.ok(update, 'no update was issued');
  // The stub records the patch in the same field it uses for inserts.
  const patch = update.insert;
  assert.equal(patch?.status, 'succeeded');
  assert.ok(patch?.resolved_at, 'resolved_at was not set alongside the terminal status');
  assert.equal(patch?.provider_reference, 'ref-9');

  // Only open attempts are touched, so a replay cannot rewrite a settled one.
  assert.deepEqual(update.filters.status, ['pending', 'requires_action', 'processing']);
  assert.equal(update.filters.order_id, 'order-1');
});

// ---------------------------------------------------------------------------
// Showing the parts of a total. An invoice that only shows a total on an order
// with a fee in it is an invoice nobody can check.
// ---------------------------------------------------------------------------

const TOTALS = {
  currencyCode: 'UGX',
  subtotalMinor: '30000',
  discountMinor: '0',
  taxMinor: '0',
  feeMinor: '0',
  totalMinor: '30000',
};

test('an order with nothing but a price shows no breakdown', async () => {
  assert.equal(describeOrderBreakdown(TOTALS), null);
});

test('a breakdown names every part that moved the total', async () => {
  const line = describeOrderBreakdown({
    ...TOTALS,
    discountMinor: '5000',
    taxMinor: '1000',
    feeMinor: '500',
    totalMinor: '26500',
  });
  assert.ok(line);
  assert.match(line, /Subtotal/);
  assert.match(line, /discount/);
  assert.match(line, /tax/);
  assert.match(line, /fee/);
  // The parts have to be the ones from the columns, formatted by the same
  // `format()` the total uses — not restated in some other unit, and not
  // grouped differently, because two renderings of one number read as two
  // numbers.
  for (const amount of ['UGX 30000', 'UGX 5000', 'UGX 1000', 'UGX 500']) {
    assert.ok(line.includes(amount), `${amount} is missing from '${line}'`);
  }
  // The total is already on the card; repeating it invites a reader to add it
  // to the parts.
  assert.equal(line.includes('26500'), false, `'${line}' repeats the total`);
});

test('a fee on its own is still shown', async () => {
  const line = describeOrderBreakdown({ ...TOTALS, feeMinor: '1250', totalMinor: '31250' });
  assert.ok(line);
  assert.match(line, /fee/);
  assert.equal(line.includes('discount'), false, 'a fee-only order claims a discount');
});

test('an adjustment reads as a line on the invoice, and a withdrawn one says so', async () => {
  const live = describeOrderAdjustment({
    id: 'a1',
    adjustment_type: 'manual_discount',
    direction: 'credit',
    amount_minor: '5000',
    currency_code: 'UGX',
    description: 'Scholarship, approved',
    voided_at: null,
    voided_reason: null,
  });
  assert.match(live, /Discount/);
  assert.match(live, /UGX 5000/);
  assert.match(live, /Scholarship, approved/);
  assert.equal(live.includes('withdrawn'), false);

  const voided = describeOrderAdjustment({
    id: 'a1',
    adjustment_type: 'manual_discount',
    direction: 'credit',
    amount_minor: '5000',
    currency_code: 'UGX',
    description: 'Scholarship, approved',
    voided_at: '2026-10-21T10:00:00Z',
    voided_reason: 'Applied to the wrong order',
  });
  assert.match(voided, /withdrawn/);
  assert.match(voided, /Applied to the wrong order/);
  // Still the amount and the reason it was made: a withdrawn row that hides its
  // own history leaves a total nobody can reconstruct.
  assert.match(voided, /UGX 5000/);
  assert.match(voided, /Scholarship, approved/);

  const debit = describeOrderAdjustment({
    id: 'a2',
    adjustment_type: 'fee',
    direction: 'debit',
    amount_minor: '1250',
    currency_code: 'UGX',
    description: null,
    voided_at: null,
    voided_reason: null,
  });
  assert.match(debit, /Fee/);
  assert.match(debit, /\+ UGX 1250/);
  assert.equal(debit.includes('·'), false, `'${debit}' shows a reason that was never given`);

  const unknown = describeOrderAdjustment({
    id: 'a3',
    adjustment_type: 'something_new',
    direction: 'debit',
    amount_minor: '100',
    currency_code: 'UGX',
    description: null,
    voided_at: null,
    voided_reason: null,
  });
  assert.match(unknown, /something_new/, 'an unlabelled type was silently renamed');
});
