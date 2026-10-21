import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BODY_MAX,
  closeSupportCase,
  fetchCaseHistory,
  fetchCaseMessages,
  fetchSupportQueue,
  HISTORY_ENROLMENT_STATUS_LABEL,
  HISTORY_ENTITLEMENT_EVENT_LABEL,
  HISTORY_ENTITLEMENT_STATUS_LABEL,
  HISTORY_ORDER_STATUS_LABEL,
  HISTORY_PUBLICATION_EVENT_LABEL,
  HISTORY_REPIN_METHOD_LABEL,
  HISTORY_SHARE_SCOPE_LABEL,
  HISTORY_SHARE_STATUS_LABEL,
  HISTORY_SUBSCRIPTION_STATUS_LABEL,
  mapSupportError,
  openSupportCase,
  readCaseHistory,
  replyToSupportCase,
  resolveSupportCase,
  SUBJECT_MAX,
  validateOpenCaseInput,
  validateReason,
  validateReplyBody,
} from './support.ts';

// ---------------------------------------------------------------------------
// The rules worth pinning here are the ones that fail silently:
//
//   * a malformed case must never reach the database, because the refusal that
//     comes back would be a check-constraint sentence on a form already filled
//   * no writer may send an actor id — identity comes from the session, and a
//     parameter here would be a parameter somebody could change
//   * a database refusal has to arrive as a status that means something, since
//     "only staff may resolve" and "case not found" need different responses
//   * the queue must narrow to unresolved cases, or the admin page shows
//     closed work as though it were waiting
// ---------------------------------------------------------------------------

type RpcCall = { fn: string; args: Record<string, unknown> };

function stubRpc(result: { data?: unknown; error?: { message: string; code?: string } } = { data: 'case-1' }) {
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

function one<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`expected at least one ${label}, got none`);
  return row;
}

/** A stub for the chained queue/message queries. */
function stubQuery(rows: unknown[], error: { message: string } | null = null) {
  const state: { select: string; filters: Record<string, unknown> } = { select: '', filters: {} };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = (s: string) => { state.select = s; return chain; };
  chain.eq = (col: string, val: unknown) => { state.filters[col] = val; return chain; };
  chain.in = (col: string, val: unknown) => { state.filters[col] = val; return chain; };
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.maybeSingle = async () => ({ data: rows[0] ?? null, error });
  // The real client's builder is thenable, and both fetchers await it directly
  // rather than calling a terminal method — so the stub has to be too.
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: rows, error }).then(resolve);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = { from: () => chain } as any;
  return { client, state };
}

test('a well-formed case request is trimmed and normalized', () => {
  const valid = validateOpenCaseInput({
    category: 'payment',
    subject: '  Charged twice  ',
    body: '  One course, two charges.  ',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.subject, 'Charged twice');
    assert.equal(valid.body, 'One course, two charges.');
    assert.equal(valid.learnerProfileId, null);
    assert.equal(valid.orderId, null);
  }
});

test('every supported category is accepted and an unknown one is refused by name', () => {
  for (const category of ['account', 'payment', 'access', 'content', 'certificate', 'family', 'other']) {
    assert.equal(validateOpenCaseInput({ category, subject: 'A subject', body: 'A body' }).ok, true, category);
  }
  const bad = validateOpenCaseInput({ category: 'telepathy', subject: 'A subject', body: 'A body' });
  assert.equal(bad.ok, false);
});

test('a blank or overlong subject and body never reach the database', () => {
  assert.equal(validateOpenCaseInput({ category: 'other', subject: '  ', body: 'Text' }).ok, false);
  assert.equal(validateOpenCaseInput({ category: 'other', subject: 'x'.repeat(SUBJECT_MAX + 1), body: 'Text' }).ok, false);
  assert.equal(validateOpenCaseInput({ category: 'other', subject: 'Fine', body: '   ' }).ok, false);
  assert.equal(validateOpenCaseInput({ category: 'other', subject: 'Fine', body: 'x'.repeat(BODY_MAX + 1) }).ok, false);
  assert.equal(validateOpenCaseInput({ subject: 'No category at all', body: 'Text' }).ok, false);
});

test('opening a case sends no actor id and no invented context', async () => {
  const { client, calls } = stubRpc({ data: 'case-1' });
  const result = await openSupportCase(client, { category: 'access', subject: 'Locked lesson', body: 'It will not open.' });
  assert.equal(result.ok, true);

  const call = one(calls, 'rpc call');
  assert.equal(call.fn, 'open_support_case');
  assert.deepEqual(Object.keys(call.args).sort(), [
    'p_body', 'p_category', 'p_learner_profile_id', 'p_order_id', 'p_subject',
  ]);
  assert.equal(call.args.p_learner_profile_id, null);
  assert.equal(call.args.p_order_id, null);
  assert.ok(!('p_actor' in call.args) && !('p_user_id' in call.args));
});

test('invalid input never reaches the database', async () => {
  const { client, calls } = stubRpc();
  const result = await openSupportCase(client, { category: 'other', subject: '', body: '' });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

test('a database refusal arrives as a status the caller can act on', async () => {
  const flooded = await openSupportCase(
    stubRpc({ error: { message: 'you already have five open requests; wait for a reply or close one first', code: 'check_violation' } }).client,
    { category: 'other', subject: 'Sixth case', body: 'Still waiting.' },
  );
  assert.equal(flooded.ok, false);
  if (!flooded.ok) assert.equal(flooded.status, 409);

  const forbidden = await resolveSupportCase(
    stubRpc({ error: { message: 'only staff may resolve a support case', code: 'insufficient_privilege' } }).client,
    { caseId: 'case-1', note: 'Fixed it myself.' },
  );
  assert.equal(forbidden.ok, false);
  if (!forbidden.ok) assert.equal(forbidden.status, 403);

  const missing = mapSupportError({ message: 'support case not found', code: 'P0002' });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.status, 404);
});

test('a reply passes the internal flag through as a boolean', async () => {
  const { client, calls } = stubRpc({ data: 'msg-1' });
  await replyToSupportCase(client, { caseId: 'case-1', body: 'Checking now.', isInternal: true });
  await replyToSupportCase(client, { caseId: 'case-1', body: 'An answer.' });

  assert.equal(one(calls, 'call').args.p_is_internal, true);
  assert.equal(calls[1]?.args.p_is_internal, false);
  assert.equal(calls[1]?.args.p_body, 'An answer.');
});

test('a blank reply or reason is refused before the RPC', async () => {
  assert.equal(validateReplyBody('   ').ok, false);
  assert.equal(validateReason('', 'Resolving a case').ok, false);

  const { client, calls } = stubRpc({});
  assert.equal((await replyToSupportCase(client, { caseId: 'case-1', body: ' ' })).ok, false);
  assert.equal((await closeSupportCase(client, { caseId: 'case-1', reason: '' })).ok, false);
  assert.equal(calls.length, 0);
});

test('the queue narrows to unresolved cases unless asked for everything', async () => {
  const working = stubQuery([]);
  await fetchSupportQueue(working.client);
  assert.deepEqual(working.state.filters.status, ['open', 'assigned', 'waiting_on_user']);

  const everything = stubQuery([]);
  await fetchSupportQueue(everything.client, { scope: 'all' });
  assert.equal(everything.state.filters.status, undefined);
});

test('a queue error propagates rather than becoming an empty queue', async () => {
  const { client } = stubQuery([], { message: 'permission denied for table support_cases' });
  await assert.rejects(() => fetchSupportQueue(client), /permission denied/);
});

test('messages carry who wrote them, and internal notes are marked', async () => {
  const { client } = stubQuery([
    {
      id: 'm1', case_id: 'case-1', author_user_id: 'me', author_kind: 'requester',
      body: 'Where is my refund?', is_internal: false, created_at: '2026-10-01T09:00:00Z',
      author: [{ display_name: 'Asker' }],
    },
    {
      id: 'm2', case_id: 'case-1', author_user_id: 'agent', author_kind: 'staff',
      body: 'Escalate if not settled today.', is_internal: true, created_at: '2026-10-01T10:00:00Z',
      author: null,
    },
  ]);

  const messages = await fetchCaseMessages(client, { caseId: 'case-1', myUserId: 'me' });
  assert.equal(messages.length, 2);

  const first = one(messages, 'message');
  assert.equal(first.authorIsMe, true);
  assert.equal(first.authorIsStaff, false);
  assert.equal(first.authorName, 'Asker');

  const second = messages[1];
  assert.equal(second?.isInternal, true);
  assert.equal(second?.authorIsStaff, true);
  // A staff author whose profile row is not readable still renders, rather
  // than dropping the message the requester is waiting on.
  assert.equal(second?.authorName, null);
});

// ---------------------------------------------------------------------------
// The history behind a case
//
// `support_case_history()` is the only reader of six tables that nothing else can
// query, so what this module does with its answer is the last place a mistake can
// be caught. Two failure modes matter:
//
//   * inventing an empty section. A malformed or missing section defaulted to
//     "no rows" tells a support agent that nothing happened, which is the one wrong
//     answer they cannot recover from. It has to be a refusal.
//   * losing the total. Every section is capped in SQL and reports how many rows
//     exist beside the rows it returned; dropping the total makes the cap silent.
// ---------------------------------------------------------------------------

/** A bundle in the shape the function returns, with the quirks PostgREST adds:
 *  big integers arrive as strings and a missing join arrives as null. */
function bundle(over: Record<string, unknown> = {}) {
  return {
    generatedAt: '2026-10-21T09:00:00.000Z',
    requester: {
      userId: 'asker-1',
      displayName: 'Asker',
      accountStatus: 'active',
      createdAt: null,
    },
    learner: null,
    learners: [
      {
        id: 'learner-1',
        displayName: 'Child',
        learnerType: 'child',
        ageBand: '8-10',
        status: 'active',
        isRequester: false,
      },
    ],
    orders: {
      total: 1,
      rows: [
        {
          id: 'order-1',
          isCaseOrder: true,
          status: 'paid',
          currencyCode: 'UGX',
          subtotalMinor: '30000',
          discountMinor: 0,
          taxMinor: null,
          totalMinor: '30000',
          placedAt: '2026-10-01T09:00:00.000Z',
          paidAt: '2026-10-01T09:05:00.000Z',
          cancelledAt: null,
          billingAccountId: 'account-1',
          history: [
            {
              fromStatus: 'pending_payment',
              toStatus: 'paid',
              reason: 'Confirmed against a mobile money reference',
              changedBy: 'admin-1',
              changedByName: 'History Admin',
              occurredAt: '2026-10-01T09:05:00.000Z',
            },
          ],
        },
      ],
    },
    subscriptions: { total: 0, rows: [] },
    entitlements: { total: 0, rows: [] },
    enrolments: { total: 0, rows: [] },
    publicationEvents: { total: 0, rows: [] },
    shares: { total: 0, rows: [] },
    ...over,
  };
}

function readOk(value: unknown) {
  const read = readCaseHistory(value);
  if ('error' in read) throw new Error(`expected the bundle to be read, got: ${read.error}`);
  return read.history;
}

test('a bundle is read, and numbers that arrive as strings are numbers', () => {
  const history = readOk(bundle());
  assert.equal(history.requester?.userId, 'asker-1');
  assert.equal(history.learner, null);
  assert.equal(history.learners.length, 1);
  assert.equal(history.learners[0]?.isRequester, false);

  const order = history.orders.rows[0];
  assert.ok(order);
  assert.equal(order.totalMinor, 30000);
  assert.equal(order.taxMinor, null);
  assert.equal(order.isCaseOrder, true);
  assert.equal(order.history.length, 1);
  assert.equal(order.history[0]?.changedByName, 'History Admin');
});

test('a missing section is a refusal, not an empty list', () => {
  const payload = bundle();
  delete (payload as Record<string, unknown>).enrolments;
  const read = readCaseHistory(payload);
  assert.equal('error' in read, true);
  if ('error' in read) assert.match(read.error, /enrolments/);
});

test('a section that is not a section is a refusal', () => {
  for (const broken of [[], null, 'none', { total: 1 }, { rows: [] }]) {
    const read = readCaseHistory(bundle({ orders: broken }));
    assert.equal('error' in read, true, `orders as ${JSON.stringify(broken)} was accepted`);
  }
});

test('a row that is not a row is a refusal', () => {
  const read = readCaseHistory(bundle({ orders: { total: 1, rows: [{ status: 'paid' }] } }));
  assert.equal('error' in read, true);
  if ('error' in read) assert.match(read.error, /orders/);
});

test('a nested history that is not a list is a refusal', () => {
  const payload = bundle();
  const order = (payload.orders.rows[0] ?? {}) as Record<string, unknown>;
  order.history = { fromStatus: 'draft' };
  assert.equal('error' in readCaseHistory(payload), true);
});

test('the cap is reported, not hidden', () => {
  const rows = (bundle().orders.rows ?? []) as unknown[];
  const history = readOk(bundle({ orders: { total: 63, rows } }));
  assert.equal(history.orders.total, 63);
  assert.equal(history.orders.rows.length, 1);
});

test('a learner the payload cannot describe is a refusal', () => {
  assert.equal('error' in readCaseHistory(bundle({ learners: [{ displayName: 'Child' }] })), true);
  assert.equal('error' in readCaseHistory(bundle({ learners: 'nobody' })), true);
  assert.equal('error' in readCaseHistory(bundle({ learner: { displayName: 'Child' } })), true);
});

test('a requester may be absent but may not be unidentifiable', () => {
  assert.equal(readOk(bundle({ requester: null })).requester, null);
  assert.equal('error' in readCaseHistory(bundle({ requester: { displayName: 'Asker' } })), true);
});

test('something that is not a bundle at all is a refusal', () => {
  for (const broken of [null, undefined, 'history', [], 42]) {
    assert.equal('error' in readCaseHistory(broken), true, `${String(broken)} was accepted`);
  }
});

test('reading the history sends the case and no actor', async () => {
  const { client, calls } = stubRpc({ data: bundle() });
  const result = await fetchCaseHistory(client, 'case-1');
  assert.equal(result.ok, true);

  const call = one(calls, 'rpc call');
  assert.equal(call.fn, 'support_case_history');
  assert.deepEqual(Object.keys(call.args), ['p_case_id']);
  assert.equal(call.args.p_case_id, 'case-1');
});

test('a refusal to read the history keeps its sentence and becomes 403', async () => {
  const { client } = stubRpc({
    error: {
      message: 'only platform staff may read the history behind a support case',
      code: 'P0001',
    },
  });
  const result = await fetchCaseHistory(client, 'case-1');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 403);
    assert.match(result.error, /only platform staff/);
  }
});

test('a case that does not exist becomes 404', async () => {
  const { client } = stubRpc({ error: { message: 'no support case 00000000', code: 'P0002' } });
  const result = await fetchCaseHistory(client, 'case-1');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test('a payload that cannot be read becomes 502 rather than an empty panel', async () => {
  const empty = await fetchCaseHistory(stubRpc({ data: {} }).client, 'case-1');
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.equal(empty.status, 502);
    assert.ok(empty.error.length > 0, 'the refusal was not a sentence');
  }

  const missing = bundle();
  delete (missing as Record<string, unknown>).shares;
  const result = await fetchCaseHistory(stubRpc({ data: missing }).client, 'case-1');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 502);
    assert.match(result.error, /could not be read: shares/);
  }
});

test('the labels cover every value the schema allows', () => {
  // Each list is the check constraint on the column, from the migration named.
  // A status the panel has no word for is shown as the raw value, which is
  // survivable; this exists so that adding one to the schema is a decision here.
  const vocabularies: Array<[Record<string, string>, string[], string]> = [
    // 20261020000100_orders.sql
    [HISTORY_ORDER_STATUS_LABEL,
      ['draft', 'pending_payment', 'awaiting_confirmation', 'paid', 'partially_refunded',
        'refunded', 'cancelled', 'failed', 'expired'], 'order status'],
    // 20261019000300_subscriptions.sql
    [HISTORY_SUBSCRIPTION_STATUS_LABEL,
      ['pending', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired'],
      'subscription status'],
    // 20261019000400_entitlements.sql
    [HISTORY_ENTITLEMENT_STATUS_LABEL, ['active', 'suspended', 'revoked', 'expired'],
      'entitlement status'],
    [HISTORY_ENTITLEMENT_EVENT_LABEL,
      ['granted', 'activated', 'suspended', 'restored', 'revoked', 'expired'],
      'entitlement event'],
    // 20261016000200_learning.sql
    [HISTORY_ENROLMENT_STATUS_LABEL,
      ['active', 'completed', 'withdrawn', 'suspended', 'expired'], 'enrolment status'],
    // 20261018000300_governance.sql
    [HISTORY_PUBLICATION_EVENT_LABEL,
      ['submitted', 'approved_for_publication', 'published', 'suspended', 'restored', 'retired'],
      'publication event'],
    // 20261028000100_entitlement_fulfilment.sql
    [HISTORY_REPIN_METHOD_LABEL,
      ['admin', 'learner_request', 'course_merge', 'data_repair'], 're-pin method'],
    // 20261015000600_guardians_and_privacy.sql
    [HISTORY_SHARE_SCOPE_LABEL, ['progress', 'achievements', 'progress_and_achievements'],
      'share scope'],
    [HISTORY_SHARE_STATUS_LABEL, ['active', 'revoked', 'expired'], 'share status'],
  ];

  for (const [labels, allowed, name] of vocabularies) {
    for (const value of allowed) {
      assert.ok(labels[value], `no word for the ${name} "${value}"`);
    }
    for (const key of Object.keys(labels)) {
      assert.ok(allowed.includes(key), `"${key}" is not a ${name} the schema allows`);
    }
  }
});
