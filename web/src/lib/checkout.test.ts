import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOrder,
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

const ARGS = { courseId: 'course-1', priceId: 'price-1', userId: 'user-1' };

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

test('the amount comes from the price row, not from the caller', async () => {
  const { client, calls } = stubClient(baseData());

  const result = await createOrder(client, ARGS);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.amount.amountMinor, 30000n);
  assert.equal(result.currencyCode, 'UGX');

  const order = calls.find((c) => c.table === 'orders' && c.method === 'insert');
  assert.ok(order?.insert, 'no order was inserted');
  // Sent as a string so the bigint survives to the bigint column. A Number
  // here would be the one lossy step in an otherwise exact money path.
  assert.equal(order.insert?.total_minor, '30000');
  assert.equal(order.insert?.subtotal_minor, '30000');
  assert.equal(order.insert?.discount_minor, 0);
  assert.equal(order.insert?.tax_minor, 0);
  assert.equal(order.insert?.status, 'pending_payment');
});

test('a pending order confers nothing, and the item carries the snapshot', async () => {
  const { client, calls } = stubClient(baseData());

  await createOrder(client, ARGS);

  const item = calls.find((c) => c.table === 'order_items' && c.method === 'insert');
  assert.ok(item?.insert, 'no order item was inserted');
  // line_total = unit_price * quantity - discount is a CHECK on the table, so
  // getting it wrong is a database error rather than a wrong charge. Still
  // worth asserting the arithmetic is stated consistently.
  assert.equal(item.insert?.unit_price_minor, '30000');
  assert.equal(item.insert?.quantity, 1);
  assert.equal(item.insert?.discount_minor, 0);
  assert.equal(item.insert?.line_total_minor, '30000');

  const snap = item.insert?.item_snapshot as { course_version_id: string };
  assert.equal(snap.course_version_id, 'v-1');
});

test('a price that does not sell this course version is refused', async () => {
  // The load-bearing check. Without it, a valid price id for course A can be
  // posted while buying course B.
  const { client } = stubClient(baseData({ product_course_versions: [] }));

  const result = await createOrder(client, ARGS);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'price_not_for_this_course');
});

test('an inactive price is refused', async () => {
  const { client } = stubClient(
    baseData({ prices: { ...ACTIVE_PRICE, status: 'archived' } }),
  );

  const result = await createOrder(client, ARGS);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'price_not_available');
});

test('a price outside its validity window is refused', async () => {
  const { client } = stubClient(
    baseData({
      prices: {
        ...ACTIVE_PRICE,
        effective_from: '2020-01-01T00:00:00Z',
        effective_until: '2020-12-31T00:00:00Z',
      },
    }),
  );

  const result = await createOrder(client, ARGS);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'price_not_available');
});

test('a subscription is not sold as a one-off purchase', async () => {
  // Fulfilment reads order_items to work out what was bought and grants a
  // course version. A subscription has its own lifecycle and expiry, and
  // record_payment_success() does not create one — so taking the money would
  // grant nothing, or worse, grant forever.
  const { client } = stubClient(
    baseData({ prices: { ...ACTIVE_PRICE, billing_interval: 'monthly' } }),
  );

  const result = await createOrder(client, ARGS);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'not_paid_course');
});

test('a price that no longer exists is refused', async () => {
  const { client } = stubClient(baseData({ prices: null }));

  const result = await createOrder(client, ARGS);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'price_not_available');
});

test('a course with no published version cannot be bought', async () => {
  const { client } = stubClient(baseData({ course_versions: null }));

  const result = await createOrder(client, ARGS);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'not_found');
});

test('an existing billing account is reused rather than duplicated', async () => {
  const { client, calls } = stubClient(
    baseData({ billing_account_memberships: [{ billing_account_id: 'acct-existing' }] }),
  );

  const result = await createOrder(client, ARGS);
  assert.equal(result.ok, true);

  const created = calls.filter((c) => c.table === 'billing_accounts' && c.method === 'insert');
  assert.equal(created.length, 0, 'a second billing account was opened for one person');

  const order = calls.find((c) => c.table === 'orders' && c.method === 'insert');
  assert.equal(order?.insert?.billing_account_id, 'acct-existing');
});

test('a billing account is created when the payer has none', async () => {
  const { client, calls } = stubClient(baseData());

  const accountId = await resolveBillingAccount(client, 'user-1');
  assert.equal(accountId, 'acct-1');

  const created = calls.find((c) => c.table === 'billing_accounts' && c.method === 'insert');
  assert.ok(created?.insert, 'no billing account was created');
  // created_by is what billing_accounts_insert enforces, and what the creator
  // membership trigger keys off. Getting this wrong means the account cannot
  // be read or ordered against — the dead end that migration fixed.
  assert.equal(created.insert?.created_by, 'user-1');
});

test('a failed line item is reported rather than silently dropped', async () => {
  // An order with no item cannot be fulfilled, because fulfilment reads
  // order_items to work out what was bought. Swallowing this would take money
  // for nothing.
  const { client } = stubClient(
    baseData({ order_items: null }),
    { order_items: 'violates check constraint "order_items_line_total_matches"' },
  );

  const result = await createOrder(client, ARGS);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'error');
  assert.match(result.message, /line item/i);
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
