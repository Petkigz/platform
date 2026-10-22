// An adult becoming a learner.
//
// The point of the writer is that it is the only way an adult profile is created, that a
// second call is harmless, and that it cannot be used to overturn a moderation decision
// by clicking a button.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('claim-admin@example.com');

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
  const claim = (actor) =>
    asActor(actor, 'select public.claim_own_learner_profile() r').then((r) => r.rows[0].r);

  await test('an adult becomes a learner, in their own name', async () => {
    const userId = await newUser('claim-me@example.com');
    await newProfile(userId, 'Amina Nakato');

    const made = await claim(userId);
    assert(made.created === true, 'the first call did not create anything');
    assert(made.learnerType === 'adult');
    assert(made.ageBand === '18+', `age band ${made.ageBand}`);

    const row = await scalar(
      `select display_name, learner_type, age_band, status, linked_user_id, family_id
         from public.learner_profiles where id = $1`, [made.learnerProfileId]);
    assert(row.display_name === 'Amina Nakato', `named '${row.display_name}'`);
    assert(row.learner_type === 'adult');
    assert(row.age_band === '18+');
    assert(row.status === 'active');
    assert(row.linked_user_id === userId, 'the profile is not linked to the account');
    assert(row.family_id === null, 'a self-learner was put in a family');

    // And it is theirs to read, which is what every later page relies on.
    const seen = await asActor(userId,
      'select id from public.learner_profiles where id = $1', [made.learnerProfileId]);
    assert(seen.rows.length === 1, 'the creator cannot read their own new profile');
  });

  await test('asking twice is harmless and answers the same profile', async () => {
    const userId = await newUser('claim-twice@example.com');
    await newProfile(userId, 'Twice Clicked');

    const first = await claim(userId);
    const second = await claim(userId);

    assert(second.created === false, 'the second call claimed to create a profile');
    assert(second.learnerProfileId === first.learnerProfileId, 'a second profile was made');

    const rows = await scalar(
      'select count(*)::int n from public.learner_profiles where linked_user_id = $1',
      [userId]);
    assert(rows.n === 1, `${rows.n} profiles exist for one account`);
  });

  await test('the account name is required, so a profile always has one', async () => {
    const userId = await newUser('claim-blank@example.com');
    await newProfile(userId, 'Placeholder');

    // `user_profiles_display_name_not_blank` means the fallback in the writer cannot be
    // reached through the application. Held here anyway: it is the constraint, not the
    // fallback, that guarantees a learner has a name.
    await rejects(() => q(
      `update public.user_profiles set display_name = '   ' where user_id = $1`, [userId]),
    /display_name_not_blank/);
  });

  await test('a removed profile is not brought back by a button', async () => {
    const userId = await newUser('claim-removed@example.com');
    await newProfile(userId, 'Removed');
    const made = await claim(userId);

    // Archived by staff, as a moderation state rather than by the person.
    await q(`update public.learner_profiles set status = 'archived' where id = $1`,
      [made.learnerProfileId]);

    await rejects(() => claim(userId), /was removed/);

    const row = await scalar(
      'select status from public.learner_profiles where id = $1', [made.learnerProfileId]);
    assert(row.status === 'archived', 'the claim revived an archived profile');
  });

  await test('nobody can claim a profile for somebody else', async () => {
    const mine = await newUser('claim-mine@example.com');
    await newProfile(mine, 'Mine');
    const theirs = await newUser('claim-theirs@example.com');
    await newProfile(theirs, 'Theirs');

    const made = await claim(mine);

    // The function takes no arguments at all: there is nothing to point at another
    // person with, and claiming a second time returns your own.
    const again = await claim(theirs);
    assert(again.learnerProfileId !== made.learnerProfileId);
    assert(again.created === true);

    const stranger = await newUser('claim-stranger@example.com');
    await newProfile(stranger, 'Stranger');
    const seen = await asActor(stranger,
      'select id from public.learner_profiles where linked_user_id = $1', [mine]);
    assert(seen.rows.length === 0, 'a stranger can read somebody else’s learner profile');
  });

  await test('the creation is audited, once', async () => {
    const userId = await newUser('claim-audited@example.com');
    await newProfile(userId, 'Audited');

    const made = await claim(userId);
    await claim(userId);

    const events = await q(
      `select actor, detail from public.governance_audit_events
        where action = 'learner.profile_created' and target_id = $1`,
      [made.learnerProfileId]);
    assert(events.rows.length === 1, `${events.rows.length} creation events`);
    assert(events.rows[0].actor === userId);
    assert(events.rows[0].detail.source === 'self');
  });

  await test('signed out, there is nobody to become', async () => {
    await rejects(() => q('select public.claim_own_learner_profile()'), /sign in to start learning/);
    assert(admin, 'the fixture admin was not created');
  });
}
