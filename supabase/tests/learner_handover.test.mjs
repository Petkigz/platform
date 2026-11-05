// Eighteen: the record becomes theirs, or it is not kept.
//
// The owner decided this on 2026-10-27 and it lived in a binding document with
// nothing behind it until now. The platform records no date of birth — by design —
// so nothing can notice a birthday; what happens instead is that somebody says so,
// and the platform records the statement rather than pretending to check it.
//
// These tests are about the two outcomes being real rather than symbolic:
//
//   * `keep` moves the learner out of the family, makes the account their own, and
//     takes the guardian's reach away through the predicate thirteen policies read.
//   * `delete` does not delete anything itself — it starts the thirty-day clock that
//     already exists, because a second clock would be a second answer to "when".
//
// And about the refusals: a stranger, a declaration nobody made, a record with no
// account to keep it in, and an adult profile that has nothing to hand over.

export async function run(ctx) {
  // The flag this suite turns on is a family-wide switch that other suites read as
  // shipped (`child_login` asserts it is `false`). Turning it on is not optional
  // here — a family cannot make a child a login without it — so it is turned off
  // again even if a fixture throws. `run.mjs` lists it in `GLOBAL_SETTINGS` too, so
  // a leak is reported against this suite rather than silently repaired.
  await ctx.committed(async () => {
    await ctx.q("select set_config('app.bypassing_code_flag','on',true)");
    await ctx.q("update public.platform_settings set value_text='true' where key='family.child_login'");
  });
  try {
    await handover(ctx);
  } finally {
    await ctx.q(
      "update public.platform_settings set value_text='false' where key='family.child_login'");
  }
}

async function handover(ctx) {
  const {
    q, test, assert, rejects, committed,
    bootstrapAdmin, newUser, newProfile,
  } = ctx;

  const admin = await bootstrapAdmin('handover-admin@example.com');

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  async function asActor(actor, fn) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const result = await fn();
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const call = async (actor, sql, params = []) =>
    (await asActor(actor, () => q(sql, params))).rows[0];

  // The handover is a switch on a family, so the fixture is one: child logins on
  // (set by `run`, and put back by it), guardian verification left as it ships
  // (off). While guardian verification is on, a guardian's reach into a child's
  // record needs a *verified* consent — a different rule, in a different suite.
  let seq = 0;
  /** A family with one child in it, and an optional login for that child. */
  async function family(childName, { login = false } = {}) {
    seq += 1;
    const guardian = await newUser(`handover-guardian-${seq}@example.com`);
    await newProfile(guardian, `Guardian ${seq}`);

    const { familyId, childId } = await committed(async () => {
      const fam = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, [`Family ${seq}`, guardian])).rows[0].id;
      const child = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','14-17',$2,'active') returning id`, [childName, fam])).rows[0].id;
      await q(`insert into public.family_memberships
                 (family_id, user_id, membership_type, status, joined_at, created_by)
               values ($1,$2,'owner','active',now(),$2)`, [fam, guardian]);
      return { familyId: fam, childId: child };
    });

    let childUser = null;
    if (login) {
      childUser = await newUser(`handover-learner-${seq}@example.com`);
      await newProfile(childUser, childName);
      // Construct a legacy linked-login fixture as database owner; application
      // callers cannot reserve or attach while the workflow is contained.
      await committed(async () => {
        await q("select set_config('request.jwt.claims',$1,true)",
          [JSON.stringify({ sub: guardian, role: 'authenticated' })]);
        const reserved = (await q('select public.reserve_child_login($1,$2) as r',
          [childId, `learner${seq}`])).rows[0].r;
        await q('select public.attach_child_login($1,$2) as r', [reserved, childUser]);
      });
    }

    return { guardian, familyId, childId, childUser };
  }

  const stranger = await newUser('handover-stranger@example.com');
  await newProfile(stranger, 'A Stranger');

  // -------------------------------------------------------------------------
  console.log('\nAct I — who may ask');
  // -------------------------------------------------------------------------

  await test('only the learner, or an adult in their family, may hand a record over', async () => {
    const { childId } = await family('Amina');

    await rejects(
      () => asActor(stranger, () => q(
        'select public.request_learner_handover($1,$2,$3)',
        [childId, 'delete', true])),
      /not_allowed/);

    // An adult's own record is not a thing to hand over: they already hold it.
    const adult = await newUser('handover-adult@example.com');
    await newProfile(adult, 'An Adult');
    const adultLearner = await committed(async () => {
      const id = (await q(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ('An Adult','adult','18+',$1) returning id`, [adult])).rows[0].id;
      return id;
    });
    await rejects(
      () => asActor(adult, () => q(
        'select public.request_learner_handover($1,$2,$3)',
        [adultLearner, 'keep', true])),
      /not_a_child/);
  });

  await test('the platform records a statement, and refuses one nobody made', async () => {
    const { guardian, childId } = await family('Bilal');

    await rejects(
      () => asActor(guardian, () => q(
        'select public.request_learner_handover($1,$2,$3)',
        [childId, 'delete', false])),
      /declaration_required/);

    // And the refusal left nothing behind.
    const rows = (await q(
      'select count(*)::int n from public.learner_handovers where learner_profile_id = $1',
      [childId])).rows[0].n;
    eq(rows, 0, 'handover rows after a refused declaration');
  });

  await test('keeping the record needs an account for it to become', async () => {
    const { guardian, childId } = await family('Khadija');

    await rejects(
      () => asActor(guardian, () => q(
        'select public.request_learner_handover($1,$2,$3)',
        [childId, 'keep', true])),
      /needs_an_account/);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — the learner takes their own record');
  // -------------------------------------------------------------------------

  await test('a learner who signs in as themselves becomes an adult learner', async () => {
    const { guardian, childId, childUser } = await family('Yusuf', { login: true });

    const out = (await call(childUser,
      'select public.request_learner_handover($1,$2,$3) as r',
      [childId, 'keep', true])).r;

    eq(out.status, 'completed', 'the handover status');
    eq(out.decision, 'keep', 'the decision');
    eq(out.requestedAs, 'self', 'who asked');
    eq(out.becameOwnAccount, childUser, 'the account the record became');
    eq(out.leftFamily, true, 'the record left the family');

    const learner = (await q(
      'select learner_type, age_band, family_id, linked_user_id, deleted_at from public.learner_profiles where id = $1',
      [childId])).rows[0];
    eq(learner.learner_type, 'adult', 'the profile is an adult learner');
    eq(learner.age_band, '18+', 'the age band');
    eq(learner.family_id, null, 'the profile left the family');
    eq(learner.linked_user_id, childUser, 'the account is still the learner’s');
    eq(learner.deleted_at, null, 'nothing was deleted');

    // The login stops being something a guardian manages.
    const login = (await q(
      'select disabled_at from public.child_logins where learner_profile_id = $1',
      [childId])).rows[0];
    assert(login.disabled_at !== null, 'the guardian still manages the login');

    const record = (await q(
      `select requested_as, decision, declaration, status, completed_at
         from public.learner_handovers where learner_profile_id = $1`, [childId])).rows[0];
    eq(record.requested_as, 'self', 'the record of who asked');
    eq(record.status, 'completed', 'the record of what happened');
    assert(/18 or older/.test(record.declaration), 'the declaration is not recorded');
    assert(record.completed_at !== null, 'the record has no completion time');
  });

  await test('the account that was a guardian’s responsibility stops being one', async () => {
    const { guardian, childId, childUser } = await family('Hafsah', { login: true });

    const guardianSaw = (await call(guardian, 'select public.can_access_learner($1) as v',
      [childId])).v;
    eq(guardianSaw, true, 'the guardian can reach the child before the handover');

    await call(guardian, 'select public.request_learner_handover($1,$2,$3) as r',
      [childId, 'keep', true]);

    const guardianAfter = (await call(guardian, 'select public.can_access_learner($1) as v',
      [childId])).v;
    eq(guardianAfter, false, 'the guardian still reaches the record after the handover');

    const learnerAfter = (await call(childUser, 'select public.can_access_learner($1) as v',
      [childId])).v;
    eq(learnerAfter, true, 'the learner cannot reach their own record');
  });

  await test('a guardian may hand a record over, and it is recorded as theirs doing', async () => {
    const { guardian, childId } = await family('Sumayyah', { login: true });

    const out = (await call(guardian, 'select public.request_learner_handover($1,$2,$3) as r',
      [childId, 'keep', true])).r;
    eq(out.requestedAs, 'guardian', 'who asked');
    eq(out.status, 'completed', 'the handover status');

    const record = (await q(
      'select declaration from public.learner_handovers where learner_profile_id = $1',
      [childId])).rows[0];
    assert(/adult in the learner's family/i.test(record.declaration),
      'the declaration does not say a guardian asked');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — not keeping it, which is the existing clock');
  // -------------------------------------------------------------------------

  await test('deciding the record is not kept starts the clock that already exists', async () => {
    const { guardian, childId } = await family('Ibrahim');

    const out = (await call(guardian, 'select public.request_learner_handover($1,$2,$3) as r',
      [childId, 'delete', true])).r;
    eq(out.decision, 'delete', 'the decision');
    assert(out.deletionDue !== null, 'the decision names no deletion date');

    const learner = (await q(
      'select learner_type, deleted_at, status from public.learner_profiles where id = $1',
      [childId])).rows[0];
    eq(learner.learner_type, 'child', 'a deleted record is still a child’s record');
    assert(learner.deleted_at !== null, 'the clock was not started');

    // The same view the retention run reads — not a second clock.
    const due = (await q(
      `select kind, due_on from public.retention_due_records where id = $1`, [childId])).rows[0];
    eq(due.kind, 'learner_record', 'the record the clock sees');
    const when = new Date(due.due_on);
    const expected = new Date(learner.deleted_at);
    expected.setUTCDate(expected.getUTCDate() + 30);
    eq(when.toISOString().slice(0, 10), expected.toISOString().slice(0, 10),
      'the date the learning record falls due');
  });

  await test('a record already on its way out cannot be handed over again', async () => {
    const { guardian, childId } = await family('Zaynab');
    await call(guardian, 'select public.request_learner_handover($1,$2,$3) as r',
      [childId, 'delete', true]);

    await rejects(
      () => asActor(guardian, () => q('select public.request_learner_handover($1,$2,$3)',
        [childId, 'delete', true])),
      /not_active/);
  });

  await test('one open request per learner, enforced by the table', async () => {
    const { guardian, childId } = await family('Maryam');

    // The function completes in the same transaction, so the index is proved
    // directly — it is the thing that would hold if a slower flow is ever added.
    await committed(() => q(
      `insert into public.learner_handovers
         (learner_profile_id, requested_by, requested_as, decision, declaration)
       values ($1,$2,'guardian','delete','An adult in the family states the learner is 18 or older.')`,
      [childId, guardian]));

    await rejects(
      () => committed(() => q(
        `insert into public.learner_handovers
           (learner_profile_id, requested_by, requested_as, decision, declaration)
         values ($1,$2,'guardian','delete','A second statement about the same learner.')`,
        [childId, guardian])),
      /duplicate key|unique/i);
  });
}
