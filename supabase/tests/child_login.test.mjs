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

import { handleChildLoginCreation } from '../../web/src/lib/child-login-handler.ts';
import { childLoginCreatePorts } from '../../web/src/lib/child-login-ports.ts';
import { removeTrustedChildAuth } from '../../web/src/lib/child-login-auth-removal.ts';

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, committed,
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
    await committed(async () => {
      await q("select set_config('app.bypassing_code_flag','on',true)");
      await q(`update public.platform_settings set value_text = $2 where key = $1`,
        [key, on ? 'true' : 'false']);
    });
  }

  let seq = 0;
  async function person(label) {
    seq += 1;
    const id = await newUser(`cl-${seq}@example.com`);
    await newProfile(id, label);
    return id;
  }

  /** A family owned by `owner`, with one child in it. */
  async function familyWithChild(owner, name = 'Amina', { verified = true } = {}) {
    const familyId = (await asActor(owner, 'select public.create_family($1) id',
      [`Family ${name}`])).rows[0].id;
    const childId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, family_id)
       values ($1,'child','8-10',$2) returning id`, [name, familyId])).rows[0].id;
    if (verified) await q(`insert into public.guardian_relationships
      (guardian_user_id,learner_profile_id,relationship_type,status,can_manage_profile,verified_at,consent_expires_at)
      values($1,$2,'parent','active',true,now()-interval '1 day',now()+interval '1 year')`, [owner,childId]);
    return { familyId, childId };
  }

  const reserve = (who, learnerId, username) => committed(async () => {
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: who, role: 'authenticated' })]);
    return (await q('select public.reserve_child_login($1,$2) id', [learnerId, username])).rows[0].id;
  });

  // Test legacy function internals as the database owner, never as an application
  // role. Production callers cannot execute it while creation is contained.
  const attach = (who, loginId, userId) => committed(async () => {
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: who, role: 'authenticated' })]);
    return (await q('select public.attach_child_login($1,$2) r', [loginId, userId])).rows[0].r;
  });

  const state = (who, learnerId) =>
    asActor(who, 'select public.child_login_state($1) s', [learnerId])
      .then((r) => r.rows[0].s);

  const owner = await person('The Owner');
  const { childId } = await familyWithChild(owner);

  // ---------------------------------------------------------------------------
  // The register and the constraint
  // ---------------------------------------------------------------------------

  await test('child login creation ships off with its setup and limits written down', async () => {
    const row = await scalar(
      `select value_text, gate_type, preconditions, description
         from public.platform_settings where key = 'family.child_login'`);
    assert(row.value_text === 'false', `ships as ${row.value_text}`);
    assert(row.gate_type === 'admin_setup', `gated as ${row.gate_type}`);
    assert(/guardian/i.test(row.description), 'the description names who makes one');
    assert(/verified/i.test(row.preconditions) && /identity/i.test(row.preconditions),
      'the linking and identity risks are absent from the register');
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

  await test('an authenticated guardian cannot attach an arbitrary existing account', async () => {
    const target = await person('Existing account');
    await rejects(() => asActor(owner, 'select public.attach_child_login($1,$2)', [childId, target]),
      /permission denied/i);
    await rejects(() => asActor(owner, 'select public.reserve_child_login($1,$2)', [childId, 'blocked-user']),
      /permission denied/i);
  });

  await setFlag('family.child_login', true);

  try {
    await test('a verified guardian can see the creation form only while the switch is on', async () => {
      const available = await state(owner, childId);
      assert(available && available.canCreate === true, 'verified guardian cannot create with the switch on');
      await setFlag('family.child_login', false);
      try { assert((await state(owner, childId)).canCreate === false, 'creation is offered while switched off'); }
      finally { await setFlag('family.child_login', true); }
    });

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
    assert(removed.databaseAccessBlocked === false, 'an unmarked legacy account was blocked automatically');

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

  await test('detachment and login visibility require a current verified guardian', async () => {
    const guardian = await person('Detachment guardian');
    const theirs = await familyWithChild(guardian, 'Detachment child');
    await setFlag('family.child_login', true);
    try {
      const id = await reserve(guardian, theirs.childId, 'detach.test');
      const child = await newUser('detach-test@learners.example.test');
      await attach(guardian, id, child);
    } finally { await setFlag('family.child_login', false); }
    await committed(async () => {
      await q("select set_config('app.account_erasure','on',true)");
      await q("update public.user_profiles set account_status='suspended' where user_id=$1", [guardian]);
    });
    try {
      assert(await state(guardian, theirs.childId) === null, 'suspended guardian could see the login');
      await rejects(() => asActor(guardian, 'select public.remove_child_login($1,$2)', [theirs.childId, null]), /verified_guardian_required/);
    } finally {
      await committed(async () => {
        await q("select set_config('app.account_erasure','on',true)");
        await q("update public.user_profiles set account_status='active' where user_id=$1", [guardian]);
      });
    }
    await q("update public.guardian_relationships set consent_expires_at=now()-interval '1 second' where guardian_user_id=$1 and learner_profile_id=$2", [guardian,theirs.childId]);
    assert(await state(guardian, theirs.childId) === null, 'expired guardian could see the login');
    await rejects(() => asActor(guardian, 'select public.remove_child_login($1,$2)', [theirs.childId, null]), /verified_guardian_required/);
    await rejects(() => asActor(guardian, 'select public.remove_child_login_internal($1,$2)', [theirs.childId, null]), /permission denied/i);
    await q("update public.guardian_relationships set consent_expires_at=now()+interval '1 year' where guardian_user_id=$1 and learner_profile_id=$2", [guardian,theirs.childId]);
    assert((await state(guardian, theirs.childId)).canManage, 'renewed guardian did not regain visibility');
    await asActor(guardian, 'select public.remove_child_login($1,$2)', [theirs.childId, null]);
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

    const whileOff = await state(other, theirs.childId);
    assert(whileOff && whileOff.hasLogin && whileOff.canManage && whileOff.canCreate === false,
      'the guardian cannot find detachment while creation is paused');
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

  await test('trusted child-login attempts require verified consent and a service-marked identity', async () => {
    const guardian = await person('Verified guardian');
    const { childId: learner } = await familyWithChild(guardian, 'Trusted', { verified: false });
    await setFlag('family.child_login', true);
    try {
      const prep = () => asActor(guardian, 'select public.prepare_child_login($1,$2) as id', [learner, 'trusted.child']);
      await rejects(prep, /verified_guardian_required/);
      await q(`insert into public.guardian_relationships
        (guardian_user_id,learner_profile_id,relationship_type,status,can_manage_profile,verified_at,consent_expires_at)
        values($1,$2,'parent','active',true,now()-interval '1 day',now()+interval '1 year')`, [guardian,learner]);
      const attempt = (await prep()).rows[0].id;
      assert((await prep()).rows[0].id === attempt, 'retry replaced the reservation');
      await rejects(() => asActor(guardian, 'select public.prepare_child_login($1,$2)', [learner, 'other.child']), /attempt_pending/);
      const child = await newUser('trusted.child@learners.ayahspring.com');
      await rejects(() => asActor(guardian, 'select public.complete_child_login_attempt($1,$2,$3)', [attempt,guardian,child]), /permission denied/i);
      await rejects(() => q('select public.complete_child_login_attempt($1,$2,$3)', [attempt,guardian,child]), /untrusted_identity/);
      await rejects(() => asActor(guardian, 'select public.child_login_attempt_identity($1,$2)', [attempt,guardian]), /permission denied/i);
      const find = (who) => committed(async () => {
        await q('set local role service_role');
        return (await q('select public.child_login_attempt_identity($1,$2) as id', [attempt,who])).rows[0].id;
      });
      assert(await find(guardian) === null, 'an unmarked identity was exposed for recovery');
      await rejects(() => find(child), /no_attempt/);
      await q("update auth.users set raw_app_meta_data=jsonb_build_object('ayahspring_child_attempt',$2::text) where id=$1", [child,attempt]);
      assert(await find(guardian) === child, 'the marked identity could not be recovered');
      await q("update public.guardian_relationships set consent_expires_at=now()-interval '1 second' where guardian_user_id=$1 and learner_profile_id=$2", [guardian,learner]);
      await rejects(() => q('select public.complete_child_login_attempt($1,$2,$3)', [attempt,guardian,child]), /verified_guardian_required/);
      await q("update public.guardian_relationships set consent_expires_at=now()+interval '1 year' where guardian_user_id=$1 and learner_profile_id=$2", [guardian,learner]);
      const done = await committed(async () => {
        await q('set local role service_role');
        return (await q('select public.complete_child_login_attempt($1,$2,$3) as result', [attempt,guardian,child])).rows[0].result;
      });
      assert(done.alreadyCompleted === false, 'first completion did not attach');
      assert((await q('select linked_user_id from public.learner_profiles where id=$1', [learner])).rows[0].linked_user_id === child, 'wrong user linked');
      const retry = (await q('select public.complete_child_login_attempt($1,$2,$3) as result', [attempt,guardian,child])).rows[0].result;
      assert(retry.alreadyCompleted === true, 'lost completion reply could not be retried');
      const audits = (await q("select count(*)::int as n from public.governance_audit_events where action='child_login.created' and target_id=$1", [learner])).rows[0].n;
      assert(audits === 1, 'retry duplicated the creation audit');
      await rejects(() => q('select public.complete_child_login_attempt($1,$2,$3)', [attempt,guardian,guardian]), /account_mismatch/);
    } finally { await setFlag('family.child_login', false); }
  });

  await test('a trusted identity with a separate role is not automatically blocked on detachment', async () => {
    const guardian = await person('Role guardian');
    const theirs = await familyWithChild(guardian, 'Role child');
    await setFlag('family.child_login', true);
    try {
      const attempt = (await asActor(guardian, 'select public.prepare_child_login($1,$2) id', [theirs.childId,'separate.role'])).rows[0].id;
      const user = await newUser('separate.role@learners.ayahspring.com');
      await q("update auth.users set raw_app_meta_data=jsonb_build_object('ayahspring_child_attempt',$2::text) where id=$1", [user,attempt]);
      await q('select public.complete_child_login_attempt($1,$2,$3)', [attempt,guardian,user]);
      await ctx.grantRole(user, 'instructor', admin);
      const result = (await asActor(guardian, 'select public.remove_child_login($1,$2) result', [theirs.childId,'requested'])).rows[0].result;
      assert(result.removed && result.identityRemovalPending && !result.databaseAccessBlocked, 'identity with another role was automatically blocked');
      assert((await asActor(user, 'select public.current_user_id() actor')).rows[0].actor === user, 'other role lost its session');
    } finally { await setFlag('family.child_login', false); }
  });

  await test('pending identity attempts are visible only to the named active safeguarding owner', async () => {
    const guardian = await person('Queue guardian');
    const theirs = await familyWithChild(guardian, 'Queue child');
    const prior = (await q('select owner_user_id from public.safeguarding_owner where singleton')).rows[0]?.owner_user_id ?? null;
    const otherAdmin = await bootstrapAdmin(`cl-other-admin-${++seq}@example.com`);
    await q('delete from public.safeguarding_owner where singleton');
    await q('select public.bootstrap_safeguarding_owner($1)', [admin]);
    await setFlag('family.child_login', true);
    try {
      const attempt = (await asActor(guardian, 'select public.prepare_child_login($1,$2) id', [theirs.childId, 'queue.child'])).rows[0].id;
      await rejects(() => asActor(otherAdmin, 'select * from public.child_login_pending_attempts($1)', [50]), /not_allowed/);
      await rejects(() => asActor(guardian, 'select * from public.child_login_pending_attempts($1)', [50]), /not_allowed/);
      await committed(async () => {
        await q("select set_config('app.account_erasure','on',true)");
        await q("update public.user_profiles set account_status='suspended' where user_id=$1", [admin]);
      });
      try { await rejects(() => asActor(admin, 'select * from public.child_login_pending_attempts($1)', [50]), /not_allowed/); }
      finally {
        await committed(async () => {
          await q("select set_config('app.account_erasure','on',true)");
          await q("update public.user_profiles set account_status='active' where user_id=$1", [admin]);
        });
      }
      const entries = (await asActor(admin, 'select * from public.child_login_pending_attempts($1)', [50])).rows;
      const row = entries.find(r => r.attempt_id === attempt);
      assert(row && row.marked_identity_present === false && row.learner_name === 'Queue child', 'owner queue lost the pending attempt');
      await rejects(() => asActor(admin, 'select public.reconcile_child_login_attempt($1)', [attempt]), /marked_identity_unavailable/);
      const user = await newUser('queue.child@learners.ayahspring.com');
      await q("update auth.users set raw_app_meta_data=jsonb_build_object('ayahspring_child_attempt',$2::text) where id=$1", [user,attempt]);
      const marked = (await asActor(admin, 'select * from public.child_login_pending_attempts($1)', [50])).rows.find(r => r.attempt_id === attempt);
      assert(marked && marked.marked_identity_present === true, 'the marked identity was not identified');
      await rejects(() => asActor(otherAdmin, 'select public.reconcile_child_login_attempt($1)', [attempt]), /not_allowed/);
      await rejects(() => asActor(guardian, 'select public.reconcile_child_login_attempt($1)', [attempt]), /not_allowed/);
      await q("update public.guardian_relationships set consent_expires_at=now()-interval '1 day' where guardian_user_id=$1 and learner_profile_id=$2", [guardian, theirs.childId]);
      await rejects(() => asActor(admin, 'select public.reconcile_child_login_attempt($1)', [attempt]), /verified_guardian_required/);
      await q("update public.guardian_relationships set consent_expires_at=now()+interval '1 year' where guardian_user_id=$1 and learner_profile_id=$2", [guardian, theirs.childId]);
      const done = (await asActor(admin, 'select public.reconcile_child_login_attempt($1) result', [attempt])).rows[0].result;
      assert(done.reconciled === true && done.alreadyCompleted === false, 'owner did not complete marked attempt');
      const retried = (await asActor(admin, 'select public.reconcile_child_login_attempt($1) result', [attempt])).rows[0].result;
      assert(retried.reconciled === true && retried.alreadyCompleted === true, 'owner retry was not idempotent');
      const linked = (await q('select linked_user_id from public.learner_profiles where id=$1', [theirs.childId])).rows[0];
      assert(linked.linked_user_id === user, 'wrong identity linked');
      const audit = (await q("select count(*)::int n from public.governance_audit_events where action='child_login.owner_reconciled' and actor=$1 and target_id=$2", [admin, attempt])).rows[0];
      assert(audit.n === 2, 'owner reconciliation audit not attributed to the owner');
      const removed = (await asActor(guardian, 'select public.remove_child_login($1,$2) result', [theirs.childId, 'family requested'])).rows[0].result;
      assert(removed.removed === true && removed.identityRemovalPending === true && removed.databaseAccessBlocked === true, 'detachment lost its identity task or database block');
      await rejects(() => q('select public.complete_child_login_attempt($1,$2,$3)', [attempt,guardian,user]), /login_no_longer_active/);
      await rejects(() => asActor(user, 'select public.current_user_id()'), /database_session_blocked/);
      await rejects(() => asActor(user, 'select * from public.user_profiles where user_id=$1', [user]), /database_session_blocked/);
      const guardianStillActive = (await asActor(guardian, 'select public.current_user_id() actor')).rows[0].actor;
      assert(guardianStillActive === guardian, 'guardian was blocked with the child');
      await rejects(() => asActor(otherAdmin, 'select * from public.child_login_removal_queue($1)', [50]), /not_allowed/);
      const task = (await asActor(admin, 'select * from public.child_login_removal_queue($1)', [50])).rows.find(r => r.child_user_id === user);
      assert(task && task.identity_present && task.marker_matches, 'queue did not show the marked identity');
      await rejects(() => asActor(otherAdmin, 'select public.block_child_login_task_database_access($1)', [task.task_id]), /not_allowed/);
      await rejects(() => asActor(guardian, 'select * from public.child_login_database_block_status($1::uuid[])', [[task.task_id]]), /not_allowed/);
      let blockStatus = (await asActor(admin, 'select * from public.child_login_database_block_status($1::uuid[])', [[task.task_id]])).rows[0];
      assert(blockStatus.blocked, 'owner cannot see the database block');
      // Simulate an older detached task created before this migration.
      await q('delete from public.child_login_database_denials where identity_id=$1', [user]);
      assert((await asActor(user, 'select public.current_user_id() actor')).rows[0].actor === user, 'older task unexpectedly blocked');
      const reapplied = (await asActor(admin, 'select public.block_child_login_task_database_access($1) result', [task.task_id])).rows[0].result;
      assert(reapplied.blocked, 'owner could not block a previously detached trusted identity');
      await rejects(() => asActor(user, 'select public.current_user_id()'), /database_session_blocked/);

      await rejects(() => asActor(otherAdmin, 'select public.authorize_child_login_auth_deletion($1)', [task.task_id]), /not_allowed/);
      const authorized = (await asActor(admin, 'select public.authorize_child_login_auth_deletion($1) result', [task.task_id])).rows[0].result;
      assert(authorized.identityId === user && authorized.attemptId === attempt && authorized.email === 'queue.child@learners.ayahspring.com', 'wrong deletion target authorized');
      // Recheck in the Auth deletion transaction, not just before the HTTP call.
      await q("update auth.users set raw_app_meta_data='{}'::jsonb where id=$1", [user]);
      await rejects(() => q('delete from auth.users where id=$1', [user]), /identity_changed/);
      await q("update auth.users set raw_app_meta_data=jsonb_build_object('ayahspring_child_attempt',$2::text) where id=$1", [user,attempt]);
      await ctx.grantRole(user, 'instructor', admin);
      await rejects(() => q('delete from auth.users where id=$1', [user]), /identity_needs_review/);
      await q(`update public.user_role_assignments set revoked_at=now(),revocation_reason='test cleanup'
        where user_id=$1 and role_id=(select id from public.roles where code='instructor')`, [user]);
      const membership = (await q(`insert into public.family_memberships(family_id,user_id,membership_type,status,joined_at)
        values($1,$2,'guardian','active',now()) returning id`, [theirs.familyId,user])).rows[0].id;
      await rejects(() => q('delete from auth.users where id=$1', [user]), /identity_needs_review/);
      await q('delete from public.family_memberships where id=$1', [membership]);
      await q('insert into public.user_contact_details(user_id) values($1)', [user]);
      await rejects(() => q('delete from auth.users where id=$1', [user]), /identity_needs_review/);
      await q('delete from public.user_contact_details where user_id=$1', [user]);
      const merge = (await q('insert into public.account_merge_requests(duplicate_user_id,target_user_id) values($1,$2) returning id', [user,guardian])).rows[0].id;
      await rejects(() => q('delete from auth.users where id=$1', [user]), /identity_needs_review/);
      await q('delete from public.account_merge_requests where id=$1', [merge]);

      await rejects(() => asActor(guardian, 'select public.record_child_login_identity_removed($1)', [task.task_id]), /not_allowed/);
      await rejects(() => asActor(admin, 'select public.record_child_login_identity_removed($1)', [task.task_id]), /identity_still_exists/);
      const providerCalls = [];
      const outcome = await removeTrustedChildAuth({
        async authorize(id) {
          return (await asActor(admin, 'select public.authorize_child_login_auth_deletion($1) result', [id])).rows[0].result;
        },
        async lookup(id) {
          const row = (await q("select id,email,raw_app_meta_data->>'ayahspring_child_attempt' marker from auth.users where id=$1", [id])).rows[0];
          if (!row) throw new Error('missing provider identity');
          return row;
        },
        async remove(id) {
          providerCalls.push(id);
          await q('delete from auth.users where id=$1', [id]);
          throw new Error('simulated lost provider reply');
        },
        async recordAbsence(id) {
          const result = (await asActor(admin, 'select public.record_child_login_identity_removed($1) result', [id])).rows[0].result;
          if (!result.recorded) throw new Error('not recorded');
        },
      }, task.task_id);
      assert(outcome.ok && providerCalls.length === 1 && providerCalls[0] === user, 'end-to-end marked deletion or lost-reply recovery failed');
      assert(!(await scalar('select id from auth.users where id=$1', [user])), 'Auth identity remains');
      assert((await scalar('select recorded_at from public.child_login_removal_tasks where id=$1', [task.task_id])).recorded_at, 'identity absence was not recorded');
      const recordedAgain = (await asActor(admin, 'select public.record_child_login_identity_removed($1) result', [task.task_id])).rows[0].result;
      assert(recordedAgain.recorded && recordedAgain.alreadyRecorded, 'recording is not idempotent');
      const reappeared = await newUser('queue.child@learners.ayahspring.com');
      await q("update auth.users set raw_app_meta_data=jsonb_build_object('ayahspring_child_attempt',$2::text) where id=$1", [reappeared,attempt]);
      const reopened = (await asActor(admin, 'select * from public.child_login_removal_queue($1)', [50])).rows.find(r => r.task_id === task.task_id);
      assert(reopened && reopened.identity_present && !reopened.marker_matches, 'a replacement marked identity was silently omitted');
      await rejects(() => asActor(admin, 'select public.record_child_login_identity_removed($1)', [task.task_id]), /identity_still_exists/);
      await q('delete from auth.users where id=$1', [reappeared]);
      const childRow = (await q('select linked_user_id,status from public.learner_profiles where id=$1', [theirs.childId])).rows[0];
      assert(childRow && childRow.linked_user_id === null && childRow.status !== 'erased', 'identity removal damaged learner record');
    } finally {
      await setFlag('family.child_login', false);
      await q('delete from public.safeguarding_owner where singleton');
      if (prior) await q('select public.bootstrap_safeguarding_owner($1)', [prior]);
    }
  });

  await test('child-record purge removes identifying attempt links but keeps a recoverable late-provider marker', async () => {
    const guardian = await person('Erasure guardian');
    const { childId } = await familyWithChild(guardian, 'Erasure child');
    const prior = (await q('select owner_user_id from public.safeguarding_owner where singleton')).rows[0]?.owner_user_id ?? null;
    const otherAdmin = await bootstrapAdmin(`cl-erasure-admin-${++seq}@example.com`);
    await q('delete from public.safeguarding_owner where singleton');
    await q('select public.bootstrap_safeguarding_owner($1)', [admin]);
    await setFlag('family.child_login', true);
    try {
      const attempt = (await asActor(guardian, 'select public.prepare_child_login($1,$2) id', [childId, 'late.erasure'])).rows[0].id;
      await committed(async () => {
        await q("select set_config('app.account_erasure','on',true)");
        await q("update public.learner_profiles set deleted_at=now()-interval '31 days' where id=$1", [childId]);
      });
      const result = (await q('select public.purge_learner_record($1) result', [childId])).rows[0].result;
      assert(result.erased === true && result.nothingLeft === false && result.identityRecoveryMarkersAdded === 1, 'purge did not report retained recovery data');
      const remaining = (await q('select count(*)::int n from public.child_login_attempts where learner_profile_id=$1', [childId])).rows[0].n;
      assert(remaining === 0, 'identifying attempt still names child');
      const recovery = (await q('select * from public.child_login_erasure_recovery where source_id=$1', [attempt])).rows[0];
      assert(recovery && recovery.attempt_marker === attempt && recovery.identity_id === null && recovery.address_hash.length === 64, 'recovery marker missing');
      assert(!('learner_profile_id' in recovery) && !('guardian_user_id' in recovery) && !('username' in recovery), 'marker kept identifying columns');
      await rejects(() => asActor(otherAdmin, 'select * from public.child_login_erasure_recovery_queue($1)', [50]), /not_allowed/);
      let listed = (await asActor(admin, 'select * from public.child_login_erasure_recovery_queue($1)', [50])).rows.find(r => r.source_id === attempt);
      assert(listed && !listed.identity_present && listed.matched_identity_ids.length === 0, 'empty lookup misreported');
      // A provider request can finish after the record was purged.
      const late = await newUser('late.erasure@learners.ayahspring.com');
      await q("update auth.users set raw_app_meta_data=jsonb_build_object('ayahspring_child_attempt',$2::text) where id=$1", [late,attempt]);
      listed = (await asActor(admin, 'select * from public.child_login_erasure_recovery_queue($1)', [50])).rows.find(r => r.source_id === attempt);
      assert(listed && listed.identity_present && listed.trusted_marker_matches && listed.matched_identity_ids.includes(late), 'late provider identity was lost');
      await q('delete from auth.users where id=$1', [late]);
    } finally {
      await setFlag('family.child_login', false);
      await q('delete from public.safeguarding_owner where singleton');
      if (prior) await q('select public.bootstrap_safeguarding_owner($1)', [prior]);
    }
  });

  await test('child-record purge retains recovery for completed and unmarked legacy removals', async () => {
    const guardian = await person('Completed erasure guardian');
    const { childId } = await familyWithChild(guardian, 'Completed erasure child');
    const trusted = await person('Trusted old identity');
    const legacy = await person('Legacy old identity');
    const attempt = (await q(`insert into public.child_login_attempts
      (learner_profile_id,guardian_user_id,username,status,user_id,completed_at)
      values($1,$2,'completed.erase','completed',$3,now()) returning id`, [childId,guardian,trusted])).rows[0].id;
    await q(`insert into public.child_login_removal_tasks
      (child_login_id,learner_profile_id,child_user_id,username,attempt_id)
      values (gen_random_uuid(),$1,$2,'completed.erase',$3)`, [childId,trusted,attempt]);
    const legacyTask = (await q(`insert into public.child_login_removal_tasks
      (child_login_id,learner_profile_id,child_user_id,username)
      values (gen_random_uuid(),$1,$2,'legacy.erase') returning id`, [childId,legacy])).rows[0].id;
    await committed(async () => {
      await q("select set_config('app.account_erasure','on',true)");
      await q("update public.learner_profiles set deleted_at=now()-interval '31 days' where id=$1", [childId]);
    });
    const result = (await q('select public.purge_learner_record($1) result', [childId])).rows[0].result;
    assert(result.erased && result.identityRecoveryMarkersAdded === 2, 'expected two recovery records');
    const links = (await q(`select (select count(*) from public.child_login_attempts where learner_profile_id=$1)
      + (select count(*) from public.child_login_removal_tasks where learner_profile_id=$1) n`, [childId])).rows[0];
    assert(Number(links.n) === 0, 'identifying child links remain');
    const records = (await q('select * from public.child_login_erasure_recovery where source_id in ($1,$2)', [attempt,legacyTask])).rows;
    assert(records.length === 2 && records.some(r => r.source_kind === 'attempt' && r.identity_id === trusted)
      && records.some(r => r.source_kind === 'legacy_removal' && r.identity_id === legacy && r.attempt_marker === null),
      'trusted or legacy identity evidence was lost');
  });

  await test('owner can reconcile identifying rows on already-erased children without purging live children', async () => {
    const guardian = await person('Legacy erasure guardian');
    const { childId } = await familyWithChild(guardian, 'Legacy erasure child');
    const prior = (await q('select owner_user_id from public.safeguarding_owner where singleton')).rows[0]?.owner_user_id ?? null;
    const otherAdmin = await bootstrapAdmin(`cl-legacy-erasure-admin-${++seq}@example.com`);
    await q('delete from public.safeguarding_owner where singleton');
    await q('select public.bootstrap_safeguarding_owner($1)', [admin]);
    try {
      await rejects(() => asActor(admin, 'select public.reconcile_legacy_child_login_erasure($1)', [childId]), /record_not_erased/);
      await committed(async () => {
        await q("select set_config('app.account_erasure','on',true)");
        await q("update public.learner_profiles set deleted_at=now()-interval '31 days' where id=$1", [childId]);
      });
      await q('select public.purge_learner_record($1)', [childId]);
      // Reproduce a row left by a pre-680 purge.
      const attempt = (await q(`insert into public.child_login_attempts
        (learner_profile_id,guardian_user_id,username) values($1,$2,'old.erasure') returning id`, [childId,guardian])).rows[0].id;
      await rejects(() => asActor(otherAdmin, 'select * from public.child_login_legacy_erasure_queue($1)', [50]), /not_allowed/);
      await rejects(() => asActor(guardian, 'select public.reconcile_legacy_child_login_erasure($1)', [childId]), /not_allowed/);
      const listed = (await asActor(admin, 'select * from public.child_login_legacy_erasure_queue($1)', [50])).rows.find(r => r.learner_id === childId);
      assert(listed && listed.attempt_count === 1 && listed.coursework_held === false, 'old residue was not listed');
      const result = (await asActor(admin, 'select public.reconcile_legacy_child_login_erasure($1) result', [childId])).rows[0].result;
      assert(result.reconciled && result.identityRecoveryMarkersAdded === 1, 'old residue was not reconciled');
      assert(!(await scalar('select id from public.child_login_attempts where id=$1', [attempt])), 'identifying attempt survived');
      assert(await scalar('select source_id from public.child_login_erasure_recovery where source_id=$1', [attempt]), 'late identity recovery was discarded');
      const after = (await asActor(admin, 'select * from public.child_login_legacy_erasure_queue($1)', [50])).rows;
      assert(!after.some(r => r.learner_id === childId), 'finished residue is still listed');
    } finally {
      await q('delete from public.safeguarding_owner where singleton');
      if (prior) await q('select public.bootstrap_safeguarding_owner($1)', [prior]);
    }
  });

  await test('owner queues page past unresolved entries and preserve their authorization', async () => {
    const prior = (await q('select owner_user_id from public.safeguarding_owner where singleton')).rows[0]?.owner_user_id ?? null;
    const outsider = await bootstrapAdmin(`cl-page-admin-${++seq}@example.com`);
    const guardian = await person('Page guardian');
    await familyWithChild(guardian, 'Page child');
    let legacy = [];
    await q('delete from public.safeguarding_owner where singleton');
    await q('select public.bootstrap_safeguarding_owner($1)', [admin]);
    try {
      legacy = (await q(`insert into public.learner_profiles(display_name,learner_type,status,erased_at)
        select 'Deleted learner','child','erased',now()-interval '3 days' from generate_series(1,2) returning id`)).rows.map(r => r.id);
      for (const [index, id] of legacy.entries()) {
        await q('insert into public.child_login_attempts(learner_profile_id,guardian_user_id,username) values($1,$2,$3)', [id,guardian,`pages.${index}`]);
        await q(`insert into public.child_login_removal_tasks(child_login_id,learner_profile_id,child_user_id,username)
          values(gen_random_uuid(),$1,$2,$3)`, [id,guardian,`pages.${index}`]);
      }
      await q(`insert into public.child_login_erasure_recovery(source_kind,source_id,attempt_marker,address_hash,created_at)
        select 'attempt',id,id,repeat('f',64),now()+n*interval '1 second'
        from (select gen_random_uuid() id,n from generate_series(1,205) n) generated`);
      for (const [oldName, pageName, idColumn] of [
        ['child_login_pending_attempts','child_login_pending_attempts_page','attempt_id'],
        ['child_login_removal_queue','child_login_removal_queue_page','task_id'],
        ['child_login_erasure_recovery_queue','child_login_erasure_recovery_queue_page','source_id'],
        ['child_login_legacy_erasure_queue','child_login_legacy_erasure_queue_page','learner_id'],
      ]) {
        await rejects(() => asActor(outsider, `select * from public.${pageName}($1,$2)`, [1,0]), /not_allowed/);
        const firstTwo = (await asActor(admin, `select * from public.${oldName}($1)`, [2])).rows;
        const second = (await asActor(admin, `select * from public.${pageName}($1,$2)`, [1,1])).rows;
        assert(firstTwo.length === 2 && second.length === 1 && firstTwo[1][idColumn] === second[0][idColumn], `${pageName} returned wrong offset`);
      }
      const later = (await asActor(admin, 'select * from public.child_login_erasure_recovery_queue_page($1,$2)', [10,200])).rows;
      assert(later.length >= 5, 'recovery entries after 200 remain hidden');
    } finally {
      await q("delete from public.child_login_erasure_recovery where address_hash=repeat('f',64)");
      await q('delete from public.child_login_removal_tasks where learner_profile_id=any($1::uuid[])', [legacy]);
      await q('delete from public.child_login_attempts where learner_profile_id=any($1::uuid[])', [legacy]);
      await q('delete from public.learner_profiles where id=any($1::uuid[])', [legacy]);
      await q('delete from public.safeguarding_owner where singleton');
      if (prior) await q('select public.bootstrap_safeguarding_owner($1)', [prior]);
    }
  });

  await test('the creation handler reaches the real database boundary, including a lost provider reply', async () => {
    await setFlag('family.child_login', true);
    try {
      for (const loseReply of [false, true]) {
        const guardian = await person(`Integration guardian ${loseReply}`);
        const { childId: learner } = await familyWithChild(guardian, `Integration child ${loseReply}`);
        const username = loseReply ? 'integration.lost' : 'integration.normal';
        const calls = [];
        // The session and service wrappers execute the real migration functions
        // under their actual DB roles. Only Supabase Auth's HTTP endpoint is a
        // fake: it inserts an auth identity with server-controlled app metadata.
        const session = { rpc: async (name, args) => {
          try {
            const result = await asActor(guardian, `select public.${name}($1,$2) as value`, [args.p_learner,args.p_username]);
            return { data: result.rows[0].value, error: null };
          } catch (e) { return { data: null, error: { message: e.message } }; }
        } };
        const service = {
          rpc: async (name, args) => {
            try {
              const result = await committed(async () => {
                await q('set local role service_role');
                const params = name === 'child_login_attempt_identity'
                  ? [args.p_attempt,args.p_guardian]
                  : [args.p_attempt,args.p_guardian,args.p_user];
                const slots = params.map((_, n) => `$${n+1}`).join(',');
                return q(`select public.${name}(${slots}) as value`, params);
              });
              return { data: result.rows[0].value, error: null };
            } catch (e) { return { data: null, error: { message: e.message } }; }
          },
          auth: { admin: { createUser: async (payload) => {
            calls.push(payload);
            const id = await newUser(payload.email);
            await q('update auth.users set raw_app_meta_data=$2::jsonb where id=$1', [id,JSON.stringify(payload.app_metadata)]);
            if (loseReply) return { data: null, error: { message: 'simulated lost provider response' } };
            return { data: { user: { id } }, error: null };
          } } },
        };
        if (!loseReply) {
          await setFlag('family.child_login', false);
          const blocked = await handleChildLoginCreation(childLoginCreatePorts(session,service), guardian,
            { learnerId: learner, username, password: 'test-password-42' });
          assert(blocked.status !== 200 && calls.length === 0, 'switch-off still reached the auth provider');
          await setFlag('family.child_login', true);
        }
        const result = await handleChildLoginCreation(childLoginCreatePorts(session,service), guardian,
          { learnerId: learner, username, password: 'test-password-42', guardianId: 'not-the-actor' });
        assert(result.status === 200 && result.body.ok && result.body.recovered === loseReply,
          `unexpected outcome: ${JSON.stringify(result)}`);
        assert(calls.length === 1 && calls[0].app_metadata.ayahspring_child_attempt,
          'the provider did not receive the trusted attempt marker');
        const linked = (await q(`select lp.linked_user_id, u.email, a.status
          from public.learner_profiles lp
          join auth.users u on u.id=lp.linked_user_id
          join public.child_login_attempts a on a.learner_profile_id=lp.id
          where lp.id=$1`, [learner])).rows[0];
        assert(linked && linked.email === `${username}@learners.ayahspring.com` && linked.status === 'completed',
          'the database did not link the intended identity and complete the attempt');
      }
    } finally { await setFlag('family.child_login', false); }
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
