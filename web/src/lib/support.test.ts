import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BODY_MAX,
  closeSupportCase,
  fetchCaseMessages,
  fetchSupportQueue,
  mapSupportError,
  openSupportCase,
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
