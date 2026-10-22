import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addChild,
  createFamily,
  inviteFamilyMember,
  acceptFamilyMembership,
  revokeFamilyMembership,
  MEMBERSHIP_TYPES,
} from './family.ts';

// ---------------------------------------------------------------------------
// Creating and managing the family itself.
//
// Until now a family could not be created at all: `fm_write_owner` requires
// `is_family_owner()`, which looks for an active owner row, so inserting the
// first owner membership required already being an active owner. That made the
// whole child path unreachable — `addChild` needs an active family membership,
// and `guardian_relationships` needs `is_learner_family_member`.
//
// The rules under test are the ones that are easy to get wrong silently:
//
//   * the writer is called with no actor argument, because the actor comes from
//     the session and an argument would be spoofable
//   * an invitation is not an acceptance — the invited person decides
//   * "you are not the owner" and "that is the last owner" must not be flattened
//     into one generic failure, because the remedy is different for each
// ---------------------------------------------------------------------------

type RpcCall = { fn: string; args: Record<string, unknown> };

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

function one<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`expected at least one ${label}, got none`);
  return row;
}

// ---------------------------------------------------------------------------
// createFamily
// ---------------------------------------------------------------------------

test('creating a family calls the writer with no actor argument', async () => {
  const { client, calls } = stubRpc({ data: 'fam-1' });

  const r = await createFamily(client, 'The Ahmeds');
  assert.equal(r.ok, true);

  const call = one(calls, 'rpc call');
  assert.equal(call.fn, 'create_family');
  assert.equal(call.args.p_name, 'The Ahmeds');

  // The actor comes from the session. If it were an argument, any caller could
  // name someone else and create a family they own.
  assert.deepEqual(Object.keys(call.args), ['p_name'],
    `arguments were [${Object.keys(call.args).join(', ')}]`);
});

test('a blank name becomes null rather than an empty string', async () => {
  const { client, calls } = stubRpc({ data: 'fam-1' });

  await createFamily(client, '   ');
  assert.equal(one(calls, 'rpc call').args.p_name, null,
    'a blank name should be stored as null, not whitespace');
});

test('an omitted name is allowed, because a family need not be named', async () => {
  const { client } = stubRpc({ data: 'fam-1' });
  assert.equal((await createFamily(client)).ok, true);
});

test('an over-long family name is refused before the request', async () => {
  const { client, calls } = stubRpc();

  const r = await createFamily(client, 'x'.repeat(121));
  assert.equal(r.ok, false);
  assert.equal(calls.length, 0, 'the request should not have been sent');
});

test('being told to sign in is reported as such', async () => {
  const { client } = stubRpc({ error: { message: 'sign in to create a family' } });

  const r = await createFamily(client, 'X');
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) assert.equal(r.message, 'Sign in first.');
});

// ---------------------------------------------------------------------------
// inviteFamilyMember
// ---------------------------------------------------------------------------

const FAMILY = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';

test('an invitation is sent with no actor argument', async () => {
  const { client, calls } = stubRpc({ data: 'mem-1' });

  const r = await inviteFamilyMember(client, {
    familyId: FAMILY,
    userId: USER,
    membershipType: 'guardian',
  });
  assert.equal(r.ok, true);

  const call = one(calls, 'rpc call');
  assert.equal(call.fn, 'invite_family_member');
  assert.equal(call.args.p_membership_type, 'guardian');
  assert.deepEqual(
    Object.keys(call.args).sort(),
    ['p_family_id', 'p_membership_type', 'p_user_id'],
  );
});

test('every supported membership type is accepted by the client', async () => {
  for (const membershipType of MEMBERSHIP_TYPES) {
    const { client, calls } = stubRpc({ data: 'mem-1' });
    const r = await inviteFamilyMember(client, { familyId: FAMILY, userId: USER, membershipType });
    assert.equal(r.ok, true, `${membershipType} should be accepted`);
    assert.equal(one(calls, 'rpc call').args.p_membership_type, membershipType);
  }
});

test('a missing family or person is refused before the request', async () => {
  const { client, calls } = stubRpc();

  assert.equal(
    (await inviteFamilyMember(client, { familyId: '', userId: USER, membershipType: 'guardian' })).ok,
    false,
  );
  assert.equal(
    (await inviteFamilyMember(client, { familyId: FAMILY, userId: '', membershipType: 'guardian' })).ok,
    false,
  );
  assert.equal(calls.length, 0, 'no request should have been sent');
});

test('only the owner is refused distinctly from a duplicate', async () => {
  // The remedies differ: one means "ask the owner", the other means "they are
  // already in". Flattening them into one message hides which.
  const { client: c1 } = stubRpc({
    error: { message: 'only the owner may invite someone to this family' },
  });
  const r1 = await inviteFamilyMember(c1, { familyId: FAMILY, userId: USER, membershipType: 'guardian' });
  assert.ok(!r1.ok);
  if (!r1.ok) assert.match(r1.message, /only the owner/i);

  const { client: c2 } = stubRpc({
    error: { message: 'that person is already a member of this family' },
  });
  const r2 = await inviteFamilyMember(c2, { familyId: FAMILY, userId: USER, membershipType: 'guardian' });
  assert.ok(!r2.ok);
  if (!r2.ok) assert.match(r2.message, /already a member/i);

  assert.notEqual(
    r1.ok === false && r1.message,
    r2.ok === false && r2.message,
    'the two refusals were reported identically',
  );
});

// ---------------------------------------------------------------------------
// acceptFamilyMembership
// ---------------------------------------------------------------------------

test('accepting an invitation passes no actor argument', async () => {
  const { client, calls } = stubRpc({ data: true });

  assert.equal((await acceptFamilyMembership(client, 'mem-1')).ok, true);

  const call = one(calls, 'rpc call');
  assert.equal(call.fn, 'accept_family_membership');
  assert.deepEqual(Object.keys(call.args), ['p_membership_id']);
});

test('accepting on someone else\'s behalf is refused with a clear message', async () => {
  const { client } = stubRpc({
    error: { message: 'only the invited person may accept this invitation' },
  });

  const r = await acceptFamilyMembership(client, 'mem-1');
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) assert.match(r.message, /only the invited person/i);
});

test('a withdrawn invitation is refused distinctly from a missing one', async () => {
  const { client: c1 } = stubRpc({ error: { message: 'that invitation was withdrawn' } });
  const r1 = await acceptFamilyMembership(c1, 'mem-1');
  assert.ok(!r1.ok);
  if (!r1.ok) assert.match(r1.message, /withdrawn/i);

  const { client: c2 } = stubRpc({ error: { message: 'invitation x not found' } });
  const r2 = await acceptFamilyMembership(c2, 'mem-1');
  assert.ok(!r2.ok);
  if (!r2.ok) assert.match(r2.message, /no longer exists/i);
});

// ---------------------------------------------------------------------------
// revokeFamilyMembership
// ---------------------------------------------------------------------------

test('removing a member without a reason never reaches the database', async () => {
  const { client, calls } = stubRpc({ data: true });

  for (const reason of ['', '   ', '\t']) {
    const r = await revokeFamilyMembership(client, { membershipId: 'mem-1', reason });
    assert.equal(r.ok, false, `${JSON.stringify(reason)} should be refused`);
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.message, /reason/i);
  }
  assert.equal(calls.length, 0, 'no request should have been sent');
});

test('the reason is trimmed before it is sent', async () => {
  const { client, calls } = stubRpc({ data: true });

  await revokeFamilyMembership(client, {
    membershipId: 'mem-1',
    reason: '  no longer part of the household  ',
  });
  assert.equal(one(calls, 'rpc call').args.p_reason, 'no longer part of the household');
});

test('the last-owner lockout is reported as a distinct, actionable failure', async () => {
  // Not a generic error: the remedy is "appoint another owner first", and a
  // person reading "that did not work" would not know that.
  const { client } = stubRpc({
    error: {
      message:
        'a family needs at least one owner; appoint another before removing this one',
    },
  });

  const r = await revokeFamilyMembership(client, {
    membershipId: 'mem-1',
    reason: 'leaving',
  });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) {
    assert.match(r.message, /at least one owner/i);
    assert.match(r.message, /appoint another/i);
  }
});

test('not being the owner is refused distinctly from the lockout', async () => {
  const { client } = stubRpc({
    error: { message: 'only the owner may remove a family member' },
  });

  const r = await revokeFamilyMembership(client, {
    membershipId: 'mem-1',
    reason: 'not needed',
  });
  assert.ok(!r.ok);
  if (!r.ok) {
    assert.match(r.message, /only the owner/i);
    assert.doesNotMatch(r.message, /at least one owner/i);
  }
});

// ---------------------------------------------------------------------------
// addChild
// ---------------------------------------------------------------------------

test('adding a child goes through the writer, with no actor and no id from the client', async () => {
  const { client, calls } = stubRpc({ data: 'child-1' });

  const result = await addChild(client, {
    familyId: 'fam-1', displayName: '  Aisha  ', ageBand: '8-10',
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.childId, 'child-1');

  assert.deepEqual(calls, [{
    fn: 'add_child_to_family',
    args: { p_family_id: 'fam-1', p_display_name: 'Aisha', p_age_band: '8-10' },
  }]);
  for (const key of Object.keys(calls[0]?.args ?? {})) {
    assert.equal(/user|actor|linked/i.test(key), false, `the client chose '${key}'`);
  }

  // A blank name never becomes a round trip, and a missing family is said plainly.
  const before = calls.length;
  const blank = await addChild(client, { familyId: 'fam-1', displayName: '   ', ageBand: '8-10' });
  const noFamily = await addChild(client, { familyId: '', displayName: 'Aisha', ageBand: '8-10' });
  assert.equal(blank.ok, false);
  assert.equal(noFamily.ok, false);
  assert.equal(calls.length, before, 'a form the writer would refuse was sent anyway');
});

test('a refusal from the writer becomes a code the screen can act on', async () => {
  const cases: Array<[string, string]> = [
    ['only the owner may add a child to this family', 'not_owner'],
    ['sign in to add a child', 'not_owner'],
    ['family 00000000-0000-4000-8000-000000000000 not found', 'no_family'],
    ['unsupported age band for a child: 21-30', 'rejected'],
  ];

  for (const [message, code] of cases) {
    const { client } = stubRpc({ data: null, error: { message } });
    const result = await addChild(client, {
      familyId: 'fam-1', displayName: 'Aisha', ageBand: '8-10',
    });
    assert.equal(result.ok, false, `${message} was accepted`);
    if (!result.ok) assert.equal(result.code, code, `${message} mapped to ${result.code}`);
  }
});
