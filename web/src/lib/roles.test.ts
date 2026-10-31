import assert from 'node:assert/strict';
import test from 'node:test';

import { assignRole, revokeRole, fetchRoleRoster } from './roles.ts';

// ---------------------------------------------------------------------------
// The rules under test are the ones that are easy to get wrong silently:
//
//   * a revocation without a reason must not reach the database
//   * the two refusals that must not be flattened into a 400 — "you are not
//     staff" and "that is the last privileged account" — because they need
//     different responses from the person reading them
//   * the writer is called with no actor argument at all, because the actor
//     comes from the session and an argument would be spoofable
// ---------------------------------------------------------------------------

type RpcCall = { fn: string; args: Record<string, unknown> };

/** Indexing with noUncheckedIndexedAccess on: fail loudly, not with a cast. */
function one<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`expected at least one ${label}, got none`);
  return row;
}

function stubRpc(
  result: { data?: unknown; error?: { message: string } } = { data: 'id-1' },
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

/** A stub for the two chained roster queries, in order. */
function stubChain(queries: { rows: unknown[]; error?: { message: string } | null }[]) {
  let i = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    from: (table: string) => {
      const spec = queries[i++] ?? { rows: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = () => chain;
      chain.is = () => chain;
      chain.in = () => chain;
      chain.order = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: spec.rows, error: spec.error ?? null }).then(resolve);
      return chain;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, tables: () => i };
}

// ---------------------------------------------------------------------------
// Assigning
// ---------------------------------------------------------------------------

test('assigning sends no actor argument', async () => {
  const { client, calls } = stubRpc();

  const res = await assignRole(client, {
    userId: 'u-1',
    roleCode: 'instructor',
    reason: 'A teacher I know',
  });

  assert.equal(res.ok, true);
  const args = one(calls, 'rpc call').args;
  assert.deepEqual(
    Object.keys(args).sort(),
    ['p_reason', 'p_role_code', 'p_user_id'],
    'the writer must take no actor: it reads the session, and an argument could be spoofed',
  );
});

test('a missing role code is refused before the RPC', async () => {
  const { client, calls } = stubRpc();

  const res = await assignRole(client, { userId: 'u-1', roleCode: '', reason: 'x' });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

test('an empty reason is allowed for a non-privileged grant', async () => {
  // The database only demands a reason for privileged roles. Refusing an empty
  // one here would block the common case of appointing an instructor.
  const { client, calls } = stubRpc();

  const res = await assignRole(client, {
    userId: 'u-1',
    roleCode: 'instructor',
    reason: '   ',
  });

  assert.equal(res.ok, true);
  assert.equal(one(calls, 'rpc call').args.p_reason, null);
});

test('a self-grant refusal is a 403, not a bad form', async () => {
  const { client } = stubRpc({
    error: { message: 'a user may not assign a privileged role to themselves' },
  });

  const res = await assignRole(client, {
    userId: 'u-1',
    roleCode: 'platform_admin',
    reason: 'Promoting myself',
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 403);
    assert.match(res.error, /someone else has to/i);
  }
});

test('a privileged role is the owner’s to give, and the refusal says so', async () => {
  const { client } = stubRpc({
    error: { message: 'only the platform admin may grant the privileged role platform_admin' },
  });

  const res = await assignRole(client, {
    userId: 'u-1',
    roleCode: 'platform_admin',
    reason: 'A friend needs admin',
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 403);
    assert.match(res.error, /only the platform admin/i);
  }
});

test('a missing reason for a privileged grant is explained', async () => {
  const { client } = stubRpc({
    error: { message: 'granting the privileged role platform_admin requires a written reason' },
  });

  const res = await assignRole(client, {
    userId: 'u-1',
    roleCode: 'platform_admin',
    reason: '',
  });

  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /audit trail/i);
});

test('an unknown role is a 400 that says so', async () => {
  const { client } = stubRpc({ error: { message: 'no such role: supreme_leader' } });

  const res = await assignRole(client, {
    userId: 'u-1',
    roleCode: 'supreme_leader',
    reason: 'x',
  });

  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /not a role this platform has/i);
});

// ---------------------------------------------------------------------------
// Revoking
// ---------------------------------------------------------------------------

test('revoking without a reason is refused before the RPC', async () => {
  const { client, calls } = stubRpc();

  const res = await revokeRole(client, {
    userId: 'u-1',
    roleCode: 'instructor',
    reason: '   ',
  });

  assert.equal(res.ok, false);
  assert.equal(calls.length, 0, 'a revocation with no reason must not reach the database');
  if (!res.ok) assert.match(res.error, /written reason/i);
});

test('revoking passes the reason through untouched', async () => {
  const { client, calls } = stubRpc({ data: true });

  const res = await revokeRole(client, {
    userId: 'u-1',
    roleCode: 'instructor',
    reason: 'No longer teaching',
  });

  assert.equal(res.ok, true);
  const args = one(calls, 'rpc call').args;
  assert.equal(args.p_reason, 'No longer teaching');
  assert.deepEqual(
    Object.keys(args).sort(),
    ['p_reason', 'p_role_code', 'p_user_id'],
    'no actor argument here either',
  );
});

test('removing the last privileged account is a 409 with the remedy', async () => {
  const { client } = stubRpc({
    error: {
      message: 'refusing to revoke the last privileged account; appoint someone else first',
    },
  });

  const res = await revokeRole(client, {
    userId: 'u-1',
    roleCode: 'platform_admin',
    reason: 'Walking away',
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(
      res.status,
      409,
      'this is a conflict with the state of the platform, not a malformed request',
    );
    assert.match(res.error, /appoint someone else first/i);
  }
});

test('a non-privileged caller is a 403', async () => {
  const { client } = stubRpc({ error: { message: 'only staff may revoke roles' } });

  const res = await revokeRole(client, {
    userId: 'u-1',
    roleCode: 'instructor',
    reason: 'You are fired',
  });

  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 403);
});

test('a signed-out caller is a 401', async () => {
  const { client } = stubRpc({ error: { message: 'sign in to assign a role' } });

  const res = await assignRole(client, {
    userId: 'u-1',
    roleCode: 'instructor',
    reason: 'x',
  });

  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 401);
});

// ---------------------------------------------------------------------------
// The roster
// ---------------------------------------------------------------------------

test('the roster flattens the joined role and assigner', async () => {
  const { client } = stubChain([
    {
      rows: [
        { code: 'instructor', name: 'Instructor', description: null, is_privileged: false },
        { code: 'platform_admin', name: 'Admin', description: null, is_privileged: true },
      ],
    },
    {
      rows: [
        {
          user_id: 'u-1',
          assigned_at: '2026-10-01T00:00:00Z',
          role: [{ code: 'instructor' }],
          assigner: [{ display_name: 'The Admin' }],
        },
        {
          user_id: 'u-2',
          assigned_at: '2026-10-02T00:00:00Z',
          role: [{ code: 'platform_admin' }],
          assigner: null,
        },
      ],
    },
  ]);

  const { roles, assignments } = await fetchRoleRoster(client);

  assert.equal(roles.length, 2);
  assert.equal(assignments.length, 2);
  assert.equal(one(assignments, 'assignment').role_code, 'instructor');
  assert.equal(assignments[1]?.assigner, null, 'a missing assigner must not become undefined');
});

test('an assignment whose role join came back empty is not dropped', async () => {
  // A dangling join would otherwise produce role_code: undefined and silently
  // hide an assignment from the page.
  const { client } = stubChain([
    { rows: [] },
    {
      rows: [
        {
          user_id: 'u-1',
          assigned_at: '2026-10-01T00:00:00Z',
          role: null,
          assigner: null,
        },
      ],
    },
  ]);

  const { assignments } = await fetchRoleRoster(client);

  assert.equal(assignments.length, 1);
  assert.equal(one(assignments, 'assignment').role_code, '');
});

test('a roster error propagates rather than becoming an empty page', async () => {
  const { client } = stubChain([{ rows: [], error: { message: 'permission denied' } }]);

  await assert.rejects(() => fetchRoleRoster(client), /permission denied/);
});
