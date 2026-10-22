import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INVITE_EXPIRY_OPTIONS,
  INVITE_MAX_DAYS,
  SHARE_EXPIRY_OPTIONS,
  SHARE_SCOPES,
  SHARE_SCOPE_LABEL,
  SHARE_STATUS_LABEL,
  acceptShareInvitation,
  fetchMyLearningShares,
  fetchSharedLearningOverview,
  fetchSharedWithMe,
  inviteToShare,
  mapSharingError,
  revokeLearningShare,
  validateEmailInput,
  validateExpiryInput,
  validateInvitationToken,
  validateInviteInput,
  type ShareScope,
  type ShareStatus,
} from './sharing.ts';

// ---------------------------------------------------------------------------
// Sharing an adult's own learning.
//
// The rules under test:
//
//   * the form cannot offer a scope, a status or a length the database refuses
//   * sharing is by invitation, and nothing here asks whether an address has an account
//   * nobody sends an actor, and a refusal made here never costs a round trip
//   * the readers are strict: this is a privacy panel, and a row that quietly lost
//     its scope would tell somebody they had shared less than they had
//   * a lapsed share is not an error to show. The honest answer is that it is no
//     longer shared.
// ---------------------------------------------------------------------------

const LEARNER = '6f1a1b6a-0000-4000-8000-000000000c01';
const GRANTEE = '6f1a1b6a-0000-4000-8000-000000000c02';

type RpcCall = { fn: string; args: Record<string, unknown> };
type TableCall = { table: string; select?: string; filters: Array<{ kind: string; column: string; value: unknown }> };

function stubSharing(specs: Record<string, { data: unknown; error?: { message: string } }> = {}) {
  const tables: TableCall[] = [];
  const rpcCalls: RpcCall[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    from: (table: string) => {
      const call: TableCall = { table, filters: [] };
      tables.push(call);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = (cols?: string) => {
        if (typeof cols === 'string') call.select = cols;
        return chain;
      };
      chain.eq = (column: string, value: unknown) => {
        call.filters.push({ kind: 'eq', column, value });
        return chain;
      };
      chain.order = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => {
        const spec = specs[table] ?? { data: [] };
        return Promise.resolve({ data: spec.data, error: spec.error ?? null }).then(resolve);
      };
      return chain;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      const spec = specs[`rpc:${fn}`];
      if (!spec) return { data: null, error: null };
      return { data: spec.data, error: spec.error ?? null };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return { client, rpcCalls, tables };
}

test('every scope and status has a label, and the lengths are the ones offered', () => {
  for (const scope of SHARE_SCOPES) {
    assert.ok(SHARE_SCOPE_LABEL[scope], `${scope} has no label`);
  }
  for (const status of ['active', 'revoked', 'expired'] as ShareStatus[]) {
    assert.ok(SHARE_STATUS_LABEL[status], `${status} has no label`);
  }
  // "Until I end it" has to be an option, because a share with no end is what a person
  // means by "my brother can see how I am doing".
  assert.ok(SHARE_EXPIRY_OPTIONS.some((o) => o.days === 0), 'there was no open-ended choice');
  assert.equal(SHARE_EXPIRY_OPTIONS[0]?.days, 0, 'the open-ended choice was not the default');
});

test('an email address is checked before it is looked up', () => {
  assert.equal(validateEmailInput({}).ok, false);
  assert.equal(validateEmailInput({ email: '   ' }).ok, false);
  assert.equal(validateEmailInput({ email: 'not an email' }).ok, false);
  assert.equal(validateEmailInput({ email: 'a@b' }).ok, false);
  assert.deepEqual(validateEmailInput({ email: '  Friend@Example.COM ' }),
    { ok: true, value: 'friend@example.com' });
  assert.equal(validateEmailInput({ email: `a@${'b'.repeat(400)}.com` }).ok, false);
});

test('a length is one of the ones offered, and cannot already have passed', () => {
  assert.deepEqual(validateExpiryInput({ days: 0 }), { ok: true, value: null });
  for (const option of SHARE_EXPIRY_OPTIONS) {
    assert.equal(validateExpiryInput({ days: option.days }).ok, true,
      `${option.days} days was not accepted`);
  }
  assert.equal(validateExpiryInput({ days: 3 }).ok, false, 'a length nobody offered was accepted');
  assert.equal(validateExpiryInput({ days: -1 }).ok, false);
  assert.equal(validateExpiryInput({}).ok, false);

  const month = validateExpiryInput({ days: 30 });
  assert.equal(month.ok, true);
  if (month.ok && month.value) {
    const until = new Date(month.value).getTime();
    assert.ok(until > Date.now(), 'a share was offered that had already ended');
    assert.ok(until - Date.now() > 29 * 24 * 60 * 60 * 1000, 'a month was shorter than a month');
  }
});

test('an invitation needs an address, a scope and a length it can actually keep', () => {
  assert.equal(validateInviteInput({ scope: 'progress', days: 7 }).ok, false);
  assert.equal(validateInviteInput({ email: 'nope', scope: 'progress', days: 7 }).ok, false);
  assert.equal(validateInviteInput({ email: 'a@b.com', scope: 'everything', days: 7 }).ok, false);
  assert.equal(validateInviteInput({ email: 'a@b.com', scope: 'progress', days: 0 }).ok, false);
  assert.equal(validateInviteInput({ email: 'a@b.com', scope: 'progress', days: 91 }).ok, false);
  // The form offers a week, a month and three months; the database accepts any whole
  // number of days in 1..90, and so does this — a length the panel does not offer is
  // not a length the platform refuses.
  assert.deepEqual(validateInviteInput({ email: 'a@b.com', scope: 'progress', days: 14 }),
    { ok: true, value: { email: 'a@b.com', scope: 'progress' as ShareScope, days: 14 } });
  assert.equal(validateInviteInput({ email: 'a@b.com', scope: 'progress', days: 7.5 }).ok, false,
    'half a day was accepted');

  assert.deepEqual(
    validateInviteInput({ email: '  Friend@Example.COM ', scope: 'achievements', days: '30' }),
    { ok: true, value: { email: 'friend@example.com', scope: 'achievements' as ShareScope, days: 30 } },
  );

  // An invitation is a link in a mailbox, so it always has an end.
  assert.equal(INVITE_EXPIRY_OPTIONS.some((o) => o.days === 0), false,
    'an invitation was offered with no end date');
  for (const option of INVITE_EXPIRY_OPTIONS) {
    assert.ok(option.days > 0 && option.days <= INVITE_MAX_DAYS, `${option.days} days is out of range`);
  }
});

test('a token is a uuid or it is not a token', () => {
  const good = '6f1a1b6a-0000-4000-8000-000000000c03';
  assert.deepEqual(validateInvitationToken(good), { ok: true, value: good });
  assert.deepEqual(validateInvitationToken(` ${good.toUpperCase()} `), { ok: true, value: good });

  for (const bad of ['', '   ', 'not-a-token', '6f1a1b6a-0000-4000-8000', null, 42, good + 'x']) {
    const checked = validateInvitationToken(bad);
    assert.equal(checked.ok, false, `${String(bad)} was accepted as a token`);
    if (!checked.ok) assert.match(checked.message, /not complete/);
  }
});

test('sharing is an invitation, and nobody sends an actor', async () => {
  const stub = stubSharing({
    'rpc:invite_learning_share': {
      data: { invitationId: 'i-1', expiresAt: '2027-01-01T10:00:00Z' },
    },
    'rpc:accept_learning_share': { data: { shareId: 's-1', scope: 'progress' } },
    'rpc:revoke_adult_learning_share': { data: { shareId: 's-1', changed: true, note: null } },
  });

  const invited = await inviteToShare(stub.client, {
    email: 'Friend@Example.com', scope: 'progress', days: 7,
  });
  assert.equal(invited.ok, true);
  if (invited.ok) {
    assert.equal(invited.value.invitationId, 'i-1');
    assert.equal(invited.value.expiresAt, '2027-01-01T10:00:00Z');
  }

  const accepted = await acceptShareInvitation(stub.client, '6f1a1b6a-0000-4000-8000-000000000c03');
  assert.equal(accepted.ok, true);
  if (accepted.ok) assert.equal(accepted.value.scope, 'progress');

  await revokeLearningShare(stub.client, 's-1');

  assert.deepEqual(stub.rpcCalls.map((c) => c.fn), [
    'invite_learning_share', 'accept_learning_share', 'revoke_adult_learning_share',
  ]);
  // The address is normalised before it leaves, and the token is sent as given.
  assert.equal(stub.rpcCalls[0]?.args.p_email, 'friend@example.com');
  assert.equal(stub.rpcCalls[0]?.args.p_days, 7);
  assert.equal(stub.rpcCalls[1]?.args.p_token, '6f1a1b6a-0000-4000-8000-000000000c03');

  for (const call of stub.rpcCalls) {
    for (const key of Object.keys(call.args)) {
      assert.equal(/actor|p_user|current_user|on_behalf/i.test(key), false,
        `${call.fn} was sent ${key}`);
    }
  }

  // Nothing that could answer "does this address have an account" is ever asked.
  assert.equal(stub.rpcCalls.some((c) => /resolve|lookup|find/i.test(c.fn)), false,
    'a lookup was made');

  const before = stub.rpcCalls.length;
  const badEmail = await inviteToShare(stub.client, { email: 'nope', scope: 'progress', days: 7 });
  const badShare = await inviteToShare(stub.client, { email: 'a@b.com', scope: 'everything', days: 7 });
  const badAccept = await acceptShareInvitation(stub.client, 'nonsense');
  const badRevoke = await revokeLearningShare(stub.client, '');
  assert.equal(badEmail.ok, false);
  assert.equal(badShare.ok, false);
  assert.equal(badAccept.ok, false);
  assert.equal(badRevoke.ok, false);
  assert.equal(stub.rpcCalls.length, before, 'a form the database would refuse was sent anyway');
});

test('a stranger and a member get the same shape of answer', async () => {
  const reply = { invitationId: 'i-1', expiresAt: '2027-01-01T10:00:00Z' };
  const stub = stubSharing({ 'rpc:invite_learning_share': { data: reply } });

  const stranger = await inviteToShare(stub.client, {
    email: 'nobody@example.com', scope: 'progress', days: 7,
  });
  const member = await inviteToShare(stub.client, {
    email: 'somebody@example.com', scope: 'progress', days: 7,
  });

  assert.equal(stranger.ok, true);
  assert.equal(member.ok, true);
  if (stranger.ok && member.ok) {
    assert.deepEqual(Object.keys(stranger.value).sort(), Object.keys(member.value).sort());
  }

  const broken = stubSharing({ 'rpc:invite_learning_share': { data: {} } });
  const noId = await inviteToShare(broken.client, {
    email: 'friend@example.com', scope: 'progress', days: 7,
  });
  assert.equal(noId.ok, false, 'an invitation with no id was accepted by the client');
});

test('a refusal from the token comes back as the sentence it is', async () => {
  const wrongAddress = stubSharing({
    'rpc:accept_learning_share': {
      data: null, error: { message: 'that invitation was sent to a different address' },
    },
  });

  const outcome = await acceptShareInvitation(wrongAddress.client,
    '6f1a1b6a-0000-4000-8000-000000000c03');
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, 'forbidden',
      'a link for somebody else was treated as a malformed form');
    assert.match(outcome.message, /different address/);
  }

  const spent = stubSharing({
    'rpc:accept_learning_share': {
      data: null, error: { message: 'that invitation has already been accepted' },
    },
  });
  const second = await acceptShareInvitation(spent.client,
    '6f1a1b6a-0000-4000-8000-000000000c03');
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.code, 'rejected');

  const malformed = stubSharing({
    'rpc:accept_learning_share': { data: { shareId: 's-1', scope: 'everything' } },
  });
  const junk = await acceptShareInvitation(malformed.client,
    '6f1a1b6a-0000-4000-8000-000000000c03');
  assert.equal(junk.ok, false, 'a share with an unknown scope was accepted');
});

test('the refusals that mean "not yours" are the ones about ownership', () => {
  const cases: Array<[string, 'forbidden' | 'rejected']> = [
    ['only the learner whose progress this is may share it', 'forbidden'],
    ['sharing an adult\'s learning is not enabled on this platform', 'forbidden'],
    ['this person has not shared their learning with you', 'forbidden'],
    ['only the person who granted this share, or governance staff, may revoke it', 'forbidden'],
    ['new row violates row-level security policy for table "adult_learning_shares"', 'forbidden'],
    ['a share that has already ended is not a share', 'rejected'],
    ['that is not an email address', 'rejected'],
    ['that invitation was sent to a different address', 'forbidden'],
    ['that invitation has already been accepted', 'rejected'],
    ['that invitation has expired', 'rejected'],
    ['that invitation does not exist', 'rejected'],
    ['that is your own address', 'rejected'],
    ['an invitation lasts between 1 and 90 days', 'rejected'],
  ];
  for (const [message, code] of cases) {
    const mapped = mapSharingError({ message });
    assert.equal(mapped.ok, false);
    if (!mapped.ok) assert.equal(mapped.code, code, `${message} was mapped to ${mapped.code}`);
  }
  const policy = mapSharingError({ message: 'permission denied for table adult_learning_shares' });
  if (!policy.ok) assert.equal(policy.message, 'That is not yours to decide.');
});

test('the list of shares is read strictly', async () => {
  const good = stubSharing({
    'rpc:my_learning_shares': {
      data: {
        learnerProfileId: LEARNER,
        shares: [
          {
            shareId: 's-1', granteeUserId: GRANTEE, granteeName: 'A Friend',
            scope: 'progress', status: 'active', grantedAt: '2026-12-22T10:00:00Z',
            expiresAt: null, revokedAt: null,
          },
          {
            shareId: 's-2', granteeUserId: GRANTEE, granteeName: null,
            scope: 'progress_and_achievements', status: 'revoked',
            grantedAt: '2026-11-22T10:00:00Z', expiresAt: null,
            revokedAt: '2026-12-01T10:00:00Z',
          },
        ],
      },
    },
  });

  const outcome = await fetchMyLearningShares(good.client, LEARNER);
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.value.length, 2);
    assert.equal(outcome.value[0]?.granteeName, 'A Friend');
    assert.equal(outcome.value[1]?.status, 'revoked');
  }

  for (const broken of [
    { data: { shares: 'no' } },
    { data: { shares: [{ shareId: 's-1', granteeUserId: GRANTEE, scope: 'everything', status: 'active' }] } },
    { data: { shares: [{ granteeUserId: GRANTEE, scope: 'progress', status: 'active' }] } },
  ]) {
    const stub = stubSharing({ 'rpc:my_learning_shares': broken });
    const refused = await fetchMyLearningShares(stub.client, LEARNER);
    assert.equal(refused.ok, false, 'a malformed share list was accepted');
  }

  const noProfile = await fetchMyLearningShares(good.client, '');
  assert.equal(noProfile.ok, false);
});

const OVERVIEW = {
  data: {
    learner: { id: LEARNER, displayName: 'The Adult Learner' },
    seesProgress: true,
    seesAchievements: false,
    shares: [{ scope: 'progress', grantedAt: '2026-12-22T10:00:00Z', expiresAt: null }],
    progress: {
      total: 2,
      rows: [
        {
          enrolmentId: 'e-1', courseTitle: 'Tajweed', courseSlug: 'tajweed',
          status: 'active', enrolledAt: '2026-12-01T10:00:00Z', completedAt: null,
          lessonsCompleted: 3, lessonsTotal: 12, lastActivityAt: '2026-12-20T10:00:00Z',
        },
      ],
    },
    achievements: { total: 0, rows: [] },
  },
};

test('the overview carries the terms the reader is reading under', async () => {
  const stub = stubSharing({ 'rpc:shared_learning_overview': OVERVIEW });

  const outcome = await fetchSharedLearningOverview(stub.client, LEARNER);

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.value.learnerName, 'The Adult Learner');
  assert.equal(outcome.value.seesProgress, true);
  assert.equal(outcome.value.seesAchievements, false);
  assert.equal(outcome.value.terms.length, 1);
  assert.equal(outcome.value.progress.total, 2, 'a cap was not reported beside the rows');
  assert.equal(outcome.value.progress.rows.length, 1);
  assert.equal(outcome.value.progress.rows[0]?.lessonsCompleted, 3);
  assert.equal(outcome.value.achievements.total, 0);

  for (const broken of [
    { data: { ...OVERVIEW.data, learner: {} } },
    { data: { ...OVERVIEW.data, progress: null } },
    {
      data: {
        ...OVERVIEW.data,
        progress: { total: 1, rows: [{ enrolmentId: 'e-1' }] },
      },
    },
    {
      data: {
        ...OVERVIEW.data,
        seesAchievements: true,
        achievements: { total: 1, rows: [{ certificateId: 'c-1' }] },
      },
    },
  ]) {
    const stub = stubSharing({ 'rpc:shared_learning_overview': broken });
    const refused = await fetchSharedLearningOverview(stub.client, LEARNER);
    assert.equal(refused.ok, false, 'a malformed overview was accepted');
  }
});

test('what has been shared with me skips a share that has lapsed, and says nothing else', async () => {
  const stub = stubSharing({
    adult_learning_shares: {
      data: [
        { learner_profile_id: LEARNER, scope: 'progress', granted_at: '2026-12-22T10:00:00Z', expires_at: null },
        // Lapsed: listed as active by the column, over by the clock.
        { learner_profile_id: GRANTEE, scope: 'progress', granted_at: '2026-09-01T10:00:00Z', expires_at: '2026-10-01T10:00:00Z' },
        { learner_profile_id: LEARNER, scope: 'achievements', granted_at: '2026-12-22T10:00:00Z', expires_at: null },
      ],
    },
    'rpc:shared_learning_overview': OVERVIEW,
  });

  const outcome = await fetchSharedWithMe(stub.client, GRANTEE);

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  // Two live rows for the same learner, one lapsed row for another: one overview each,
  // and the lapsed one is dropped rather than shown as an error.
  assert.equal(outcome.value.length, 1, 'a lapsed share was shown as somebody to look at');
  assert.equal(stub.rpcCalls.filter((c) => c.fn === 'shared_learning_overview').length, 1,
    'a lapsed share was read anyway');
  assert.equal(stub.tables[0]?.table, 'adult_learning_shares');
});

test('a read error is not swallowed', async () => {
  const stub = stubSharing({
    adult_learning_shares: { data: [], error: { message: 'permission denied for table adult_learning_shares' } },
  });

  const outcome = await fetchSharedWithMe(stub.client, GRANTEE);

  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.code, 'forbidden');
});
