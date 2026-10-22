// Sharing with an address that has no account, by invitation.
//
// The property that matters most is the one that is easiest to lose: the reply
// must look the same whether or not the address has an account. These tests
// invite both kinds of address and compare the replies, then hold the token to
// its three promises — it is bound to the address, it works once, and it expires.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('invite-admin@example.com');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
    await q('set local role authenticated');
    try {
      const result = await q(sql, params);
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  /** A signed-in adult with a learner profile, and the flag on for the duration. */
  async function adult(email, name) {
    const id = await newUser(email);
    await newProfile(id, name);
    await q(`insert into public.learner_profiles
               (display_name, learner_type, age_band, linked_user_id)
             values ($1,'adult','18+',$2)`, [name, id]);
    return id;
  }

  const flag = async (on) =>
    q(`update public.platform_settings set value_text = $1 where key = 'family.adult_shares'`,
      [on ? 'true' : 'false']);

  await flag(true);
  try {
    const sharer = await adult('inviter@example.com', 'Inviter');

    await test('an unknown address and a known one get the same reply', async () => {
      const knownEmail = 'has-account@example.com';
      const known = await newUser(knownEmail);

      const nobody = (await asActor(sharer,
        "select public.invite_learning_share('nobody@example.com','progress',7) r")).rows[0].r;
      const somebody = (await asActor(sharer,
        `select public.invite_learning_share($1,'progress',7) r`, [knownEmail])).rows[0].r;

      // Same keys, and nothing in either that could be used to tell them apart.
      assert(Object.keys(nobody).sort().join(',') === Object.keys(somebody).sort().join(','),
        `the replies differ: ${Object.keys(nobody)} vs ${Object.keys(somebody)}`);
      assert(nobody.invitationId && somebody.invitationId, 'an invitation was not recorded');
      assert(known, 'the fixture did not create an account');

      // And a message was queued for each, both still unsent.
      const queued = await q(
        `select to_address, status from public.outbound_messages
          where template_code = 'invite_email' order by created_at`);
      assert(queued.rows.length === 2, `${queued.rows.length} invitations were queued`);
      assert(queued.rows.every((r) => r.status === 'queued'),
        'a message was recorded as sent with no provider');
    });

    await test('the token is stored as a hash, never as itself', async () => {
      const row = await scalar(
        `select token_hash from public.share_invitations order by created_at limit 1`);
      assert(/^[0-9a-f]{32}$/.test(row.token_hash), `stored '${row.token_hash}'`);
    });

    await test('accepting requires being signed in as the address it was sent to', async () => {
      const wrong = await adult('wrong-person@example.com', 'Wrong Person');

      // Recover the token from the queued message, which is the only place it
      // exists in clear — exactly like a real inbox.
      const message = await scalar(
        `select body from public.outbound_messages
          where template_code = 'invite_email' order by created_at limit 1`);
      const token = /\/share\/invite\/([0-9a-f-]{36})/.exec(message.body)?.[1];
      assert(token, 'the queued message has no invitation link');

      await rejects(() => asActor(wrong,
        'select public.accept_learning_share($1)', [token]),
      /sent to a different address/);

      const shares = await q(
        'select id from public.adult_learning_shares where grantee_user_id = $1', [wrong]);
      assert(shares.rows.length === 0, 'a refused acceptance granted a share anyway');
    });

    await test('the right person accepts once, and the share is live', async () => {
      const invitee = await newUser('invitee@example.com');
      await newProfile(invitee, 'Invitee');
      const invited = (await asActor(sharer,
        "select public.invite_learning_share('invitee@example.com','progress',7) r")).rows[0].r;

      const message = await scalar(
        `select body from public.outbound_messages
          where to_address = 'invitee@example.com' order by created_at desc limit 1`);
      const token = /\/share\/invite\/([0-9a-f-]{36})/.exec(message.body)?.[1];
      assert(token, 'no token in the message');

      const accepted = (await asActor(invitee,
        'select public.accept_learning_share($1) r', [token])).rows[0].r;
      assert(accepted.shareId, 'accepting returned no share');

      const share = await scalar(
        `select status, scope, grantee_user_id from public.adult_learning_shares where id = $1`,
        [accepted.shareId]);
      assert(share.status === 'active' && share.scope === 'progress');
      assert(share.grantee_user_id === invitee);

      await rejects(() => asActor(invitee,
        'select public.accept_learning_share($1)', [token]),
      /already been accepted/);

      const invitation = await scalar(
        'select status, accepted_by from public.share_invitations where id = $1',
        [invited.invitationId]);
      assert(invitation.status === 'accepted' && invitation.accepted_by === invitee);
    });

    await test('an expired invitation is refused, not silently accepted', async () => {
      const invitee = await newUser('late@example.com');
      await newProfile(invitee, 'Late');
      const invited = (await asActor(sharer,
        "select public.invite_learning_share('late@example.com','achievements',1) r")).rows[0].r;

      await q(`update public.share_invitations set expires_at = now() - interval '1 hour'
                where id = $1`, [invited.invitationId]);

      const message = await scalar(
        `select body from public.outbound_messages
          where to_address = 'late@example.com' order by created_at desc limit 1`);
      const token = /\/share\/invite\/([0-9a-f-]{36})/.exec(message.body)?.[1];

      await rejects(() => asActor(invitee,
        'select public.accept_learning_share($1)', [token]),
      /has expired/);
    });

    await test('the sharer can see their invitations, and nobody else can', async () => {
      const stranger = await newUser('stranger-invites@example.com');
      await newProfile(stranger, 'Stranger');

      const mine = (await asActor(sharer,
        'select id from public.share_invitations')).rows.length;
      assert(mine >= 3, `the sharer saw only ${mine} of their invitations`);

      const theirs = (await asActor(stranger,
        'select id from public.share_invitations')).rows.length;
      assert(theirs === 0, `a stranger saw ${theirs} invitations`);
    });

    await test('sharing your own address is refused', async () => {
      await rejects(() => asActor(sharer,
        "select public.invite_learning_share('inviter@example.com','progress',7)"),
      /your own address/);
    });

    await test('an accepted invitation actually opens the learning it named', async () => {
      const row = await scalar(
        `select als.id, als.learner_profile_id, als.grantee_user_id, up.user_id
           from public.adult_learning_shares als
           join public.user_profiles up on up.user_id = als.grantee_user_id
          where up.user_id in (select id from auth.users where email = 'invitee@example.com')
          limit 1`);

      const reads = async (kind) => (await q(
        'select public.may_read_shared_learning($1,$2,$3) r',
        [row.learner_profile_id, kind, row.grantee_user_id])).rows[0].r;

      // The scope was 'progress', and a scope means what it says.
      assert(await reads('progress') === true, 'the accepted share does not grant progress');
      assert(await reads('achievements') === false, 'the accepted share grants more than it named');
      const nobody = (await q('select public.may_read_shared_learning($1,$2,$3) r',
        [row.learner_profile_id, 'progress', null])).rows[0].r;
      assert(nobody === false, 'a share became readable by nobody in particular');
    });

    await test('with the flag off, neither inviting nor accepting works', async () => {
      const invitee = await newUser('flag-off@example.com');
      await newProfile(invitee, 'Flag Off');
      const invited = (await asActor(sharer,
        "select public.invite_learning_share('flag-off@example.com','progress',7) r")).rows[0].r;
      const message = await scalar(
        `select body from public.outbound_messages
          where to_address = 'flag-off@example.com' order by created_at desc limit 1`);
      const token = /\/share\/invite\/([0-9a-f-]{36})/.exec(message.body)?.[1];

      await flag(false);
      try {
        await rejects(() => asActor(sharer,
          "select public.invite_learning_share('somebody@example.com','progress',7)"),
        /not enabled on this platform/);
        await rejects(() => asActor(invitee,
          'select public.accept_learning_share($1)', [token]),
        /not enabled on this platform/);
      } finally {
        await flag(true);
      }

      // The invitation is still pending and still usable once the flag returns.
      const after = await scalar('select status from public.share_invitations where id = $1',
        [invited.invitationId]);
      assert(after.status === 'pending', `the row became '${after.status}' while off`);
    });

    await test('an unknown token is "does not exist", not a hint', async () => {
      const invitee = await newUser('guesser@example.com');
      await newProfile(invitee, 'Guesser');
      for (const token of ['', 'not-a-token', '00000000-0000-4000-8000-000000000000']) {
        await rejects(() => asActor(invitee,
          'select public.accept_learning_share($1)', [token]),
        /not complete|does not exist/);
      }
    });
  } finally {
    await flag(false);
  }
}
