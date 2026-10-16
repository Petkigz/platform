// Role assignment.
//
// user_role_assignments had zero rows and no writer. The trigger guarding
// privileged grants was careful and thorough, and there was no way through the
// product to give anyone a role at all — so no admin could appoint an
// instructor, a reviewer, or another admin. The test harness grants roles with a
// direct INSERT, which is precisely the fixture state that hides a missing
// application path.
//
// Every test here drives the writers, as the session user, because that is the
// only way the product can reach them.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, bootstrapAdmin,
  } = ctx;

  const admin  = await bootstrapAdmin('role-admin@example.com');
  const second = await bootstrapAdmin('role-admin2@example.com');

  const scalar = async (sql, params) => (await q(sql, params)).rows[0];
  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  /**
   * Act as a user and COMMIT.
   *
   * The writers read the actor from request.jwt.claims, so there is no actor
   * argument to pass and no way to exercise them at superuser level — which is
   * exactly why the missing path was invisible to every other suite.
   */
  async function asActor(actor, sql, params) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    let r;
    try {
      r = await q(sql, params);
    } catch (e) {
      await q('rollback');
      throw e;
    }
    await q('commit');
    return r;
  }

  const assign = (who, userId, code, reason) =>
    asActor(who, 'select public.assign_role($1,$2,$3) as id', [userId, code, reason]);

  const revoke = (who, userId, code, reason) =>
    asActor(who, 'select public.revoke_role($1,$2,$3) as ok', [userId, code, reason]);

  const activeRoles = async (userId) =>
    (await q(
      `select r.code from public.user_role_assignments ura
         join public.roles r on r.id = ura.role_id
        where ura.user_id = $1 and ura.revoked_at is null order by r.code`,
      [userId])).rows.map((r) => r.code);

  const newPerson = async (email, name) => {
    const id = await newUser(email);
    await newProfile(id, name);
    return id;
  };

  // -------------------------------------------------------------------
  console.log('\nAssigning');
  // -------------------------------------------------------------------

  await test('an admin can make someone an instructor', async () => {
    const person = await newPerson('role-teach@example.com', 'New Teacher');

    assert((await activeRoles(person)).length === 0, 'precondition: no roles yet');

    const id = (await assign(admin, person, 'instructor', 'A teacher I know')).rows[0].id;
    assert(id, 'assign_role returned no id');

    const roles = await activeRoles(person);
    assert(roles.includes('instructor'),
      `roles are [${roles.join(', ')}]; instructor was not granted`);
  });

  await test('granting the same role twice is a no-op, not a collision', async () => {
    const person = await newPerson('role-teach2@example.com', 'Repeat Teacher');

    const a = (await assign(admin, person, 'instructor', 'First grant')).rows[0].id;
    const b = (await assign(admin, person, 'instructor', 'Second grant')).rows[0].id;

    assert(a === b, `a second grant produced a different row (${a} vs ${b})`);

    const n = await count(
      `select 1 from public.user_role_assignments
        where user_id = $1 and revoked_at is null`, [person]);
    assert(n === 1, `${n} active assignments after granting one role twice`);
  });

  await test('a role can be granted again after being revoked', async () => {
    const person = await newPerson('role-teach3@example.com', 'Returning Teacher');

    await assign(admin, person, 'instructor', 'First grant');
    await revoke(admin, person, 'instructor', 'Stepped away');

    assert((await activeRoles(person)).length === 0, 'the role should be gone');

    const c = (await assign(admin, person, 'instructor', 'Came back')).rows[0].id;
    assert(c, 're-granting a previously revoked role failed');

    const rows = await count(
      `select 1 from public.user_role_assignments where user_id = $1`, [person]);
    assert(rows === 2,
      `${rows} rows; the revoked grant must be kept as history rather than overwritten`);
  });

  await test('an unknown role code is refused clearly', async () => {
    const person = await newPerson('role-teach4@example.com', 'Unknown Role');

    await rejects(() => assign(admin, person, 'supreme_leader', 'Whatever'),
      /no such role/i);
  });

  await test('a privileged role requires a written reason', async () => {
    const person = await newPerson('role-admin3@example.com', 'New Admin');

    await rejects(() => assign(admin, person, 'platform_admin', '   '),
      /written reason/i);

    assert((await activeRoles(person)).length === 0,
      'the grant must not have gone through');
  });

  await test('a non-privileged user cannot assign roles', async () => {
    const actor   = await newPerson('role-learner@example.com', 'Just A Learner');
    const person  = await newPerson('role-target@example.com', 'Target');

    await rejects(() => assign(actor, person, 'instructor', 'Let me teach'),
      /only staff may assign/i);

    assert((await activeRoles(person)).length === 0,
      'a learner must not be able to grant a role');
  });

  await test('an anonymous caller is refused', async () => {
    const person = await newPerson('role-target2@example.com', 'Target Two');

    // No claims at all: current_user_id() is null, so there is nobody to check.
    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role authenticated');
    await rejects(
      () => q('select public.assign_role($1,$2,$3)', [person, 'instructor', 'Anon']),
      /sign in to assign/i);
    await q('rollback');
  });

  await test('a user cannot grant themselves a privileged role', async () => {
    // The trigger owns this one, and it must stay: assign_role refuses a
    // non-privileged actor, so the only way to reach the self-grant check is as
    // someone already privileged — which is exactly who must not be able to
    // elevate themselves further without another person involved.
    const person = await newPerson('role-self@example.com', 'Self Promoter');
    await assign(admin, person, 'support_agent', 'Starting them off');

    await rejects(
      () => assign(person, person, 'platform_admin', 'Promoting myself'),
      /may not assign a privileged role to themselves/i);
  });

  await test('the actor is the session, not an argument', async () => {
    // A learner naming an admin as the actor must get nowhere. The writers take
    // no actor parameter at all, so there is nothing to spoof — this asserts
    // that shape holds rather than testing a parameter that no longer exists.
    const learner = await newPerson('role-spoof@example.com', 'Spoofer');
    const person  = await newPerson('role-target3@example.com', 'Target Three');

    await asUser(learner, async () => {
      await rejects(
        () => q('select public.assign_role($1,$2,$3)', [person, 'instructor', 'Spoofed']),
        /only staff may assign/i);
    });

    assert((await activeRoles(person)).length === 0,
      'naming a privileged actor must not substitute for being one');
  });

  // -------------------------------------------------------------------
  console.log('\nRevoking');
  // -------------------------------------------------------------------

  await test('revoking is soft: the row stays, with a reason', async () => {
    const person = await newPerson('role-rev@example.com', 'Revoked Teacher');
    await assign(admin, person, 'instructor', 'Hired');

    const ok = (await revoke(admin, person, 'instructor', 'No longer teaching')).rows[0].ok;
    assert(ok === true, `revoke_role returned ${ok}`);

    const row = await scalar(
      `select revoked_at, revocation_reason from public.user_role_assignments
        where user_id = $1`, [person]);
    assert(row.revoked_at !== null, 'the revocation was not stamped');
    assert(row.revocation_reason === 'No longer teaching',
      `reason recorded as ${row.revocation_reason}`);

    const gone = await activeRoles(person);
    assert(gone.length === 0, `still active: [${gone.join(', ')}]`);
  });

  await test('revoking requires a written reason', async () => {
    const person = await newPerson('role-rev2@example.com', 'Unreasoned');
    await assign(admin, person, 'instructor', 'Hired');

    await rejects(() => revoke(admin, person, 'instructor', '  '),
      /written reason/i);

    assert((await activeRoles(person)).includes('instructor'),
      'the role must still be active after a refused revocation');
  });

  await test('revoking something already revoked is a no-op', async () => {
    const person = await newPerson('role-rev3@example.com', 'Twice Revoked');
    await assign(admin, person, 'instructor', 'Hired');
    await revoke(admin, person, 'instructor', 'Gone');

    const ok = (await revoke(admin, person, 'instructor', 'Gone again')).rows[0].ok;
    assert(ok === false, `a second revocation returned ${ok}, expected false`);
  });

  await test('a non-privileged user cannot revoke roles', async () => {
    const learner = await newPerson('role-revoker@example.com', 'Would-be Revoker');
    const person  = await newPerson('role-victim@example.com', 'Victim');
    await assign(admin, person, 'instructor', 'Hired');

    await rejects(() => revoke(learner, person, 'instructor', 'You are fired'),
      /only staff may revoke/i);

    assert((await activeRoles(person)).includes('instructor'),
      'a learner must not be able to take a role away');
  });

  // -------------------------------------------------------------------
  console.log('\nThe lockout guard');
  // -------------------------------------------------------------------

  await test('the last privileged account cannot be revoked', async () => {
    // The guard counts privileged accounts across the whole database, and by
    // this point other suites have bootstrapped thirty-odd. Stripping them for
    // real would wreck every later test, so the reduction happens inside a
    // transaction that is rolled back — the assertion is real, the side effects
    // are not.
    //
    // After the refused call the transaction is aborted, so nothing may run
    // before the rollback.
    await q('begin');
    let refusal = null;
    try {
      // Everything except `admin` loses their privileged roles, at superuser
      // level: this is fixture manipulation, not the path under test.
      await q(`update public.user_role_assignments ura
                  set revoked_at = now(),
                      revocation_reason = 'temporary, for the lockout test'
                 from public.roles r
                where r.id = ura.role_id
                  and r.is_privileged
                  and ura.revoked_at is null
                  and ura.user_id <> $1`, [admin]);

      const left = await count(
        `select 1 from public.user_role_assignments ura
           join public.roles r on r.id = ura.role_id
          where r.is_privileged and ura.revoked_at is null`);
      assert(left === 1,
        `expected exactly 1 privileged account left, found ${left}; this test is not testing the guard`);

      // Revoke it as that last admin. The writer reads the actor from the
      // session, so the claims have to be set inside this same transaction.
      await q(`select set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ sub: admin, role: 'authenticated' })]);
      await q('set local role authenticated');

      try {
        await q('select public.revoke_role($1,$2,$3)',
          [admin, 'platform_admin', 'Walking away']);
      } catch (e) {
        refusal = String(e.message);
      }
    } finally {
      await q('rollback');
    }

    assert(refusal !== null, 'revoking the last privileged account was allowed');
    assert(/last privileged account/i.test(refusal),
      `refused for the wrong reason: ${refusal}`);

    // Rolled back, so the shared admin is untouched.
    assert((await activeRoles(admin)).includes('platform_admin'),
      'the rollback did not restore the shared admin');
  });

  await test('a privileged role can be revoked while another admin remains', async () => {
    const a = await newPerson('role-pair-a@example.com', 'Admin A');
    const b = await newPerson('role-pair-b@example.com', 'Admin B');

    await assign(admin, a, 'platform_admin', 'Pair A');
    await assign(admin, b, 'platform_admin', 'Pair B');

    const ok = (await revoke(a, b, 'platform_admin', 'No longer staff')).rows[0].ok;
    assert(ok === true, 'revoking one of two admins should be allowed');
    assert((await activeRoles(b)).length === 0, 'admin B should have lost the role');
  });

  // -------------------------------------------------------------------
  console.log('\nThe trigger fix');
  // -------------------------------------------------------------------

  await test('a bootstrap-granted role can be revoked by someone else', async () => {
    // bootstrapAdmin() grants platform_admin with assigned_by = the user's own
    // id under the bootstrap GUC, so that row is self-assigned. Revoking it must
    // still work: the grant rules are about giving a privileged role, not taking
    // one back.
    //
    // This does not distinguish the explicit revocation guard in the trigger --
    // the UPDATE trigger's WHEN clause already only fires on reinstatement, so
    // the behaviour is the same with or without it. It is kept because the
    // self-assigned shape is the one that would break if that clause ever
    // changed.
    const boot = await bootstrapAdmin('role-boot@example.com');
    const selfAssigned = await scalar(
      `select assigned_by = user_id as self
         from public.user_role_assignments ura
         join public.roles r on r.id = ura.role_id
        where ura.user_id = $1 and r.code = 'platform_admin'`, [boot]);
    assert(selfAssigned.self === true,
      'precondition: the bootstrap grant is self-assigned, so this test would not exercise the fix');

    const ok = (await revoke(admin, boot, 'platform_admin', 'Bootstrap account retired')).rows[0].ok;
    assert(ok === true, 'revoking a self-assigned bootstrap role still fails');
  });

  // -------------------------------------------------------------------
  console.log('\nAudit trail');
  // -------------------------------------------------------------------

  await test('both directions are audited', async () => {
    const person = await newPerson('role-audit@example.com', 'Audited');

    await assign(admin, person, 'instructor', 'Auditing the grant');
    await revoke(admin, person, 'instructor', 'Auditing the revocation');

    const actions = (await q(
      `select action from public.governance_audit_events
        where target_type = 'user' and target_id = $1 order by action`,
      [person])).rows.map((r) => r.action);

    assert(actions.includes('role.assigned'),
      `actions were [${actions.join(', ')}]; the grant was not audited`);
    assert(actions.includes('role.revoked'),
      `actions were [${actions.join(', ')}]; the revocation was not audited`);
  });
}
