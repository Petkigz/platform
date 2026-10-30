// A child may hold a login, and only a guardian may make one.
//
// For most of this platform's life a database constraint said a child could
// never be a user. The owner reversed that on 2026-10-30, and the interesting
// part of the reversal is not the removal — it is everything that has to be true
// instead. These tests are about the instead:
//
//   * a guardian can reserve a username before any account exists, so two
//     guardians cannot both half-create one;
//   * attaching re-checks the permission rather than trusting the reservation;
//   * one account is one learner, and a child cannot inherit a sibling's name;
//   * removing a login removes nothing else — the lessons, the progress and the
//     certificate were never the account's;
//   * and with the feature off, a guardian can still end a login. A privacy
//     control with no way to switch it off unless the feature is on is worse
//     than the feature.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile,
  } = ctx;

  const admin = await bootstrapAdmin('cl-admin@example.com');

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

  async function setFlag(key, on) {
    await q(`update public.platform_settings set value_text = $2 where key = $1`,
      [key, on ? 'true' : 'false']);
  }

  let seq = 0;
  async function person(label) {
    seq += 1;
    const id = await newUser(`cl-${seq}@example.com`);
    await newProfile(id, label);
    return id;
  }

  /** A family owned by `owner`, with one child in it. */
  async function familyWithChild(owner, name = 'Amina') {
    const familyId = (await asActor(owner, 'select public.create_family($1) id',
      [`Family ${name}`])).rows[0].id;
    const childId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, family_id)
       values ($1,'child','8-10',$2) returning id`, [name, familyId])).rows[0].id;
    return { familyId, childId };
  }

  const reserve = (who, learnerId, username) =>
    asActor(who, 'select public.reserve_child_login($1,$2) id', [learnerId, username])
      .then((r) => r.rows[0].id);

  const attach = (who, loginId, userId) =>
    asActor(who, 'select public.attach_child_login($1,$2) r', [loginId, userId])
      .then((r) => r.rows[0].r);

  const state = (who, learnerId) =>
    asActor(who, 'select public.child_login_state($1) s', [learnerId])
      .then((r) => r.rows[0].s);

  const owner = await person('The Owner');
  const { childId } = await familyWithChild(owner);

  // ---------------------------------------------------------------------------
  // The register and the constraint
  // ---------------------------------------------------------------------------

  await test('the flag is now a switch, with the trade-off written down', async () => {
    const row = await scalar(
      `select value_text, gate_type, preconditions, description
         from public.platform_settings where key = 'family.child_login'`);
    assert(row.value_text === 'false', `ships as ${row.value_text}`);
    assert(row.gate_type === 'admin', `gated as ${row.gate_type}`);
    assert(/guardian/i.test(row.description), 'the description names who makes one');
    assert(/no mailbox/i.test(row.preconditions),
      'and the recovery trade-off is in the register, not only in a comment');
    assert(/remove_child_login/.test(row.preconditions),
      'and says that removing one takes nothing away');
  });

  await test('the constraint that forbade a child login is gone', async () => {
    const n = (await scalar(
      `select count(*)::int n from pg_constraint where conname = 'lp_no_child_login_yet'`)).n;
    assert(n === 0, 'a child could still not hold a login');
  });

  // ---------------------------------------------------------------------------
  // Creating one
  // ---------------------------------------------------------------------------

  await test('while the switch is off, no login can be reserved', async () => {
    await rejects(() => reserve(owner, childId, 'amina.k'), /child_login:disabled/);
  });

  await setFlag('family.child_login', true);

  try {
    await test('a stranger cannot reserve a username for somebody else\'s child', async () => {
      const stranger = await person('A Stranger');
      await rejects(() => reserve(stranger, childId, 'amina.k'), /child_login:not_your_child/);
    });

    await test('a username has a shape, and a child cannot be given one that does not', async () => {
      for (const bad of ['ab', 'Amina K', '-amina', 'amina k', 'a'.repeat(31)]) {
        await rejects(() => reserve(owner, childId, bad), /child_login:username_shape/,
          `"${bad}" was accepted`);
      }
    });

    await test('the guardian reserves a username before any account exists', async () => {
      const loginId = await reserve(owner, childId, 'Amina.K');
      assert(loginId, 'no reservation id');

      const row = await scalar(
        `select username, user_id, attached_at from public.child_logins
          where learner_profile_id = $1`, [childId]);
      assert(row.username === 'amina.k', `stored as ${row.username}`);
      assert(row.user_id === null, 'a reservation already had an account');
      assert(row.attached_at === null, 'and claimed to be attached');

      // And the child's profile still has no login, because none exists yet.
      const profile = await scalar(
        `select linked_user_id from public.learner_profiles where id = $1`, [childId]);
      assert(profile.linked_user_id === null, 'the learner was linked too early');
    });

    await test('one username belongs to one child', async () => {
      const other = await person('Another Owner');
      const theirs = await familyWithChild(other, 'Yusuf');
      await rejects(() => reserve(other, theirs.childId, 'amina.k'),
        /child_login:username_taken/);
    });

    await test('attaching links the account, records who made it, and reports the name', async () => {
      const loginId = (await scalar(
        `select id from public.child_logins where learner_profile_id = $1`, [childId])).id;

      // An account created the way the route creates one: an auth user, whose
      // profile a trigger makes.
      const childUser = await newUser('amina-k@learners.example.test');

      const result = await attach(owner, loginId, childUser);
      assert(result.username === 'amina.k', `returned ${result.username}`);
      assert(result.learnerProfileId === childId, 'returned another learner');

      const profile = await scalar(
        `select linked_user_id from public.learner_profiles where id = $1`, [childId]);
      assert(profile.linked_user_id === childUser, 'the child was not linked to the account');

      const audit = await scalar(
        `select detail from public.governance_audit_events
          where action = 'child_login.created' and target_id = $1
          order by occurred_at desc limit 1`, [childId]);
      assert(audit && audit.detail.username === 'amina.k', 'the creation was not audited');
      assert(!('password' in (audit?.detail ?? {})),
        'the audit row recorded a password, which the database must never see');
    });

    await test('the account a child is linked to cannot be swapped by an edit', async () => {
      const second = await person('Somebody Else');
      await rejects(() => asActor(owner,
        'update public.learner_profiles set linked_user_id = $2 where id = $1',
        [childId, second]),
        /cannot change how it is linked|permission denied/i);
    });

    await test('a child signed in as themselves can read their own profile', async () => {
      const childUser = (await scalar(
        `select linked_user_id from public.learner_profiles where id = $1`, [childId]))
        .linked_user_id;
      const asChild = await asActor(childUser,
        'select public.is_own_learner_profile($1) mine', [childId]);
      assert(asChild.rows[0].mine === true, 'the child cannot read their own profile');
    });

    await test('the state a screen reads names the login and who may change it', async () => {
      const asGuardian = await state(owner, childId);
      assert(asGuardian.hasLogin === true, 'the login was not reported');
      assert(asGuardian.username === 'amina.k', `reported ${asGuardian.username}`);
      assert(asGuardian.canManage === true, 'the guardian was not told they may change it');
      assert(asGuardian.isSelf === false, 'a guardian was reported as the child');

      const childUser = (await scalar(
        `select linked_user_id from public.learner_profiles where id = $1`, [childId]))
        .linked_user_id;
      const asChild = await state(childUser, childId);
      assert(asChild.isSelf === true, 'the child was not recognised as themselves');

      const stranger = await person('A Nobody');
      const asStranger = await state(stranger, childId);
      assert(asStranger === null, `a stranger could read the login state: ${JSON.stringify(asStranger)}`);
    });

    await test('one account cannot become the login of a second child', async () => {
      const other = await person('Second Owner');
      const theirs = await familyWithChild(other, 'Bilal');
      const loginId = await reserve(other, theirs.childId, 'bilal.h');

      const childUser = (await scalar(
        `select linked_user_id from public.learner_profiles where id = $1`, [childId]))
        .linked_user_id;
      await rejects(() => attach(other, loginId, childUser),
        /child_login:account_already_linked/);
    });

    await test('a reservation nobody completed can be abandoned, freeing the name', async () => {
      const other = await person('Third Owner');
      const theirs = await familyWithChild(other, 'Sumayya');
      const loginId = await reserve(other, theirs.childId, 'sumayya.b');
      await asActor(other, 'select public.abandon_child_login($1)', [loginId]);

      const n = (await scalar(
        `select count(*)::int n from public.child_logins where learner_profile_id = $1`,
        [theirs.childId])).n;
      assert(n === 0, 'the reservation survived being abandoned');

      // And the same name is free for the child it was meant for.
      const again = await reserve(other, theirs.childId, 'sumayya.b');
      assert(again, 'the name could not be reserved again');
    });
  } finally {
    await setFlag('family.child_login', false);
  }

  // ---------------------------------------------------------------------------
  // Removing one
  // ---------------------------------------------------------------------------

  await test('removing a login detaches the account and leaves the learning alone', async () => {
    // Give the child a finished lesson first, so "leaves the learning alone" has
    // something to be wrong about.
    const course = (await scalar(
      `insert into public.courses (title, slug, created_by)
       values ('Child Course', 'child-course', $1) returning id`,
      [owner])).id;
    const version = (await scalar(
      `insert into public.course_versions (course_id, created_by, version_number)
       values ($1,$2,1) returning id`, [course, owner])).id;
    const section = (await scalar(
      `insert into public.course_sections (course_version_id, title, position)
       values ($1,'One',1) returning id`, [version])).id;
    const lesson = (await scalar(
      `insert into public.lessons (section_id, title, position) values ($1,'L1',1) returning id`,
      [section])).id;
    const enrolment = (await scalar(
      `insert into public.course_enrolments (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`, [childId, course, version])).id;
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
             values ($1,$2,'completed',100, now(), now())`, [enrolment, lesson]);

    const before = (await scalar(
      `select count(*)::int n from public.lesson_progress where course_enrolment_id = $1`,
      [enrolment])).n;
    assert(before === 1, 'the fixture did not record a lesson');

    const removed = await asActor(owner,
      'select public.remove_child_login($1,$2) r', [childId, 'The tablet was sold'])
      .then((r) => r.rows[0].r);
    assert(removed.removed === true, 'the removal did not report success');
    assert(removed.username === 'amina.k', 'the removal did not say which login it ended');

    const profile = await scalar(
      `select linked_user_id from public.learner_profiles where id = $1`, [childId]);
    assert(profile.linked_user_id === null, 'the child is still linked to the account');

    const after = (await scalar(
      `select count(*)::int n from public.lesson_progress where course_enrolment_id = $1`,
      [enrolment])).n;
    assert(after === before, 'removing a login deleted learning');

    const audit = await scalar(
      `select detail from public.governance_audit_events
        where action = 'child_login.removed' and target_id = $1
        order by occurred_at desc limit 1`, [childId]);
    assert(audit && audit.detail.reason === 'The tablet was sold',
      'the removal kept no reason');
  });

  await test('a removed username cannot be handed to a different child', async () => {
    const other = await person('Fourth Owner');
    const theirs = await familyWithChild(other, 'Khadija');
    await setFlag('family.child_login', true);
    try {
      await rejects(() => reserve(other, theirs.childId, 'amina.k'),
        /child_login:username_taken/);
    } finally {
      await setFlag('family.child_login', false);
    }
  });

  await test('a login can be ended while the feature is switched off', async () => {
    // The flag is off at this point. Put a login back on a fresh child, then end
    // it with the switch off — a guardian must not be stuck holding a login they
    // cannot remove because somebody else turned a feature off.
    const other = await person('Fifth Owner');
    const theirs = await familyWithChild(other, 'Zainab');

    await setFlag('family.child_login', true);
    const loginId = await reserve(other, theirs.childId, 'zainab.a');
    const childUser = await newUser('zainab-a@learners.example.test');
    await attach(other, loginId, childUser);
    await setFlag('family.child_login', false);

    const removed = await asActor(other,
      'select public.remove_child_login($1,$2) r', [theirs.childId, 'No longer needed'])
      .then((r) => r.rows[0].r);
    assert(removed.removed === true, 'the login could not be ended while the switch was off');

    // And no new one can be made while it is off.
    await rejects(() => reserve(other, theirs.childId, 'zainab.b'), /child_login:disabled/);
  });

  // ---------------------------------------------------------------------------
  // The adult declaration, where age assurance is on
  // ---------------------------------------------------------------------------

  await test('where age assurance is on, a guardian must have declared they are an adult', async () => {
    const sixth = await person('Sixth Owner');
    const theirs = await familyWithChild(sixth, 'Halima');

    await setFlag('family.child_login', true);
    await setFlag('platform.age_assurance', true);
    try {
      await rejects(() => reserve(sixth, theirs.childId, 'halima.m'),
        /age:declare_before_creating_a_child_login/);

      // The declaration is the same one the add-a-child form asks for.
      await asActor(sixth, 'select public.declare_adult()');
      const loginId = await reserve(sixth, theirs.childId, 'halima.m');
      assert(loginId, 'a declared adult still could not reserve a username');
    } finally {
      await setFlag('platform.age_assurance', false);
      await setFlag('family.child_login', false);
    }
  });

  // ---------------------------------------------------------------------------
  // No password anywhere near the database
  // ---------------------------------------------------------------------------

  await test('no table holds anything that could be used to sign in', async () => {
    const columns = (await q(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'child_logins'`)).rows
      .map((r) => r.column_name);
    for (const forbidden of ['password', 'password_hash', 'pin', 'secret', 'token']) {
      assert(!columns.includes(forbidden),
        `child_logins has a ${forbidden} column: the database must never hold one`);
    }
  });
}
