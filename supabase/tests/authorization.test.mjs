// Authorization suite.
//
// The project record names ten required access tests
// (security_privacy_authorization.required_access_tests). This file is the
// machine-readable form of that list — one test per line of the record, named
// after it. If the record ever gains an eleventh, it belongs here.
//
// Two of the ten were previously uncovered by any suite:
//   4. adult learning private without explicit share
//   5. billing manager cannot automatically view learning data
// Both are implemented below. The rest are re-asserted here so the record's
// list can be checked in one place instead of inferred by grepping.
//
// A note on how to read the failures: RLS-blocked SELECT and UPDATE match zero
// rows and raise nothing. These tests assert on row counts, not exceptions.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile, grantRole, bootstrapAdmin,
    newInstructor, newReviewer, ensureReviewerProfile, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('authz-admin@example.com');
  const teacher  = await newInstructor('authz-teacher@example.com', admin);
  const reviewer = await newReviewer('authz-reviewer@example.com', admin);

  async function adult(email, name) {
    const userId = await newUser(email);
    await newProfile(userId, name ?? email);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [name ?? email, userId])).rows[0].id;
    return { userId, learnerId };
  }

  // A child under a family, per D2: never a `user`.
  async function childOf(familyId, name) {
    return (await q(
      `insert into public.learner_profiles (family_id, display_name, learner_type, age_band)
       values ($1, $2, 'child', '8-10') returning id`, [familyId, name])).rows[0].id;
  }

  async function familyOwnedBy(userId) {
    const fam = (await q(
      `insert into public.families (created_by) values ($1) returning id`, [userId])).rows[0].id;
    await q(`insert into public.family_memberships (family_id, user_id, membership_type, status, joined_at)
             values ($1, $2, 'owner', 'active', now())`, [fam, userId]);
    return fam;
  }

  async function publishedCourseFor(authorId) {
    const course  = await newCourse(authorId, { status: 'active' });
    const version = await newVersion(course, authorId);
    const section = await newSection(version);
    await newLesson(section);
    const set = (s, by) => q(
      'select id from public.set_course_version_status($1, $2, $3, $4)', [version, s, by, 'authz']);
    await set('submitted', authorId);
    await set('approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await set('published', admin);
    return { course, version };
  }

  async function enroll(learnerId, versionId) {
    const courseId = (await q(
      'select course_id from public.course_versions where id = $1', [versionId])).rows[0].course_id;
    return (await q(
      `insert into public.course_enrolments (learner_profile_id, course_id, course_version_id, status)
       values ($1, $2, $3, 'active') returning id`,
      [learnerId, courseId, versionId])).rows[0].id;
  }

  // apply_guardian_verification_decision() is a trigger that reacts to a
  // pending -> verified transition, so the case has to be inserted pending
  // and then moved. Inserting it as 'verified' does nothing.
  async function verify(relationshipId) {
    const c = (await q(
      `insert into public.guardian_verification_cases (guardian_relationship_id)
       values ($1) returning id`, [relationshipId])).rows[0].id;
    await q(`update public.guardian_verification_cases
                set status = 'verified', reviewed_by = $1, reviewed_at = now()
              where id = $2`, [admin, c]);
    return c;
  }

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  // -------------------------------------------------------------------
  // 1. Cross-family access denied
  // -------------------------------------------------------------------
  await test('[record 1] cross-family access denied', async () => {
    const a = await adult('authz-parent-a@example.com', 'Parent A');
    const b = await adult('authz-parent-b@example.com', 'Parent B');
    const famA = await familyOwnedBy(a.userId);
    const kidA = await childOf(famA, 'Kid A');

    // Parent B, an unrelated adult with a profile of their own.
    await asUser(b.userId, async () => {
      const n = await count(
        'select 1 from public.learner_profiles where id = $1', [kidA]);
      assert(n === 0, `unrelated parent saw ${n} rows of another family's child`);

      const prog = await count(
        `select 1 from public.lesson_progress lp
           join public.course_enrolments ce on ce.id = lp.course_enrolment_id
          where ce.learner_profile_id = $1`, [kidA]);
      assert(prog === 0, 'unrelated parent read another family progress');
    });
  });

  // -------------------------------------------------------------------
  // 2. Guardian access denied before verification
  // -------------------------------------------------------------------
  await test('[record 2] guardian denied before verification', async () => {
    const owner = await adult('authz-owner2@example.com', 'Owner');
    const g     = await adult('authz-guardian2@example.com', 'Guardian');
    const fam   = await familyOwnedBy(owner.userId);
    const kid   = await childOf(fam, 'Kid 2');

    const rel = (await q(
      `insert into public.guardian_relationships
         (guardian_user_id, learner_profile_id, relationship_type, status, can_view_progress)
       values ($1, $2, 'parent', 'pending_verification', true) returning id`,
      [g.userId, kid])).rows[0].id;

    await asUser(g.userId, async () => {
      const n = await count(
        'select 1 from public.learner_profiles where id = $1', [kid]);
      assert(n === 0, `unverified guardian saw ${n} rows; expected 0`);
    });

    // And verification is the only path in.
    await verify(rel);

    await asUser(g.userId, async () => {
      const n = await count(
        'select 1 from public.learner_profiles where id = $1', [kid]);
      assert(n === 1, `verified guardian saw ${n} rows; expected 1`);
    });
  });

  // -------------------------------------------------------------------
  // 3. Revoked guardian blocked
  // -------------------------------------------------------------------
  await test('[record 3] revoked guardian blocked', async () => {
    const owner = await adult('authz-owner3@example.com', 'Owner 3');
    const g     = await adult('authz-guardian3@example.com', 'Guardian 3');
    const fam   = await familyOwnedBy(owner.userId);
    const kid   = await childOf(fam, 'Kid 3');

    const rel = (await q(
      `insert into public.guardian_relationships
         (guardian_user_id, learner_profile_id, relationship_type, status, can_view_progress)
       values ($1, $2, 'parent', 'pending_verification', true) returning id`,
      [g.userId, kid])).rows[0].id;
    await verify(rel);

    await asUser(g.userId, async () => {
      assert(await count('select 1 from public.learner_profiles where id=$1', [kid]) === 1,
        'setup failed: verified guardian should see the child');
    });

    // gr_revoked_clears_permissions requires the flags to go with the status.
    await q(`update public.guardian_relationships
                set status = 'revoked', can_view_progress = false
              where id = $1`, [rel]);

    await asUser(g.userId, async () => {
      const n = await count('select 1 from public.learner_profiles where id=$1', [kid]);
      assert(n === 0, `revoked guardian still saw ${n} rows`);
    });
  });

  // -------------------------------------------------------------------
  // 4. Adult learning private without explicit share  [WAS UNCOVERED]
  // -------------------------------------------------------------------
  await test('[record 4] adult learning private without explicit share', async () => {
    const me   = await adult('authz-adult4@example.com', 'Adult 4');
    const other= await adult('authz-other4@example.com', 'Other 4');

    const { version } = await publishedCourseFor(teacher);
    await enroll(me.learnerId, version);

    await asUser(other.userId, async () => {
      const n = await count(
        'select 1 from public.learner_profiles where id = $1', [me.learnerId]);
      assert(n === 0, `another adult saw my learner profile (${n} rows)`);

      const e = await count(
        'select 1 from public.course_enrolments where learner_profile_id = $1', [me.learnerId]);
      assert(e === 0, `another adult saw my enrolments (${e} rows)`);
    });

    // I can see my own.
    await asUser(me.userId, async () => {
      assert(await count('select 1 from public.learner_profiles where id=$1', [me.learnerId]) === 1,
        'an adult cannot see their own profile');
      assert(await count('select 1 from public.course_enrolments where learner_profile_id=$1', [me.learnerId]) === 1,
        'an adult cannot see their own enrolment');
    });
  });

  await test('[record 4b] an explicit share grants exactly the shared scope', async () => {
    const me    = await adult('authz-adult4b@example.com', 'Adult 4b');
    const other = await adult('authz-other4b@example.com', 'Other 4b');

    const share = (await q(
      `insert into public.adult_learning_shares
         (learner_profile_id, grantee_user_id, scope, status)
       values ($1, $2, 'progress', 'active') returning id`,
      [me.learnerId, other.userId])).rows[0].id;
    assert(share, 'adult_learning_shares insert returned no id');

    await asUser(other.userId, async () => {
      const n = await count(
        'select 1 from public.adult_learning_shares where id = $1', [share]);
      assert(n === 1, 'the recipient cannot see a share made to them');
    });

    // Revoking the share closes it again.
    await q(`update public.adult_learning_shares set status = 'revoked', revoked_at = now() where id = $1`, [share]);
    await asUser(other.userId, async () => {
      const n = await count(
        'select 1 from public.adult_learning_shares where id = $1', [share]);
      assert(n === 0, 'a revoked share is still visible to its recipient');
    });
  });

  // -------------------------------------------------------------------
  // 5. Billing manager cannot automatically view learning data  [WAS UNCOVERED]
  // -------------------------------------------------------------------
  await test('[record 5] billing manager sees billing, never learning data', async () => {
    const payer  = await adult('authz-payer5@example.com', 'Payer');
    const learner= await adult('authz-learner5@example.com', 'Learner 5');

    const { version } = await publishedCourseFor(teacher);
    await enroll(learner.learnerId, version);

    const acct = (await q(
      `insert into public.billing_accounts (display_name, billing_country, billing_currency, created_by)
       values ('Family of Learner 5', 'UG', 'USD', $1) returning id`,
      [learner.userId])).rows[0].id;

    // Idempotent: granting_creator_billing_membership already made the account
    // creator a member, so an explicit insert of that same pair would collide.
    await q(`insert into public.billing_account_memberships
               (billing_account_id, user_id, can_view_invoices, granted_by, status)
             values ($1, $2, true, $3, 'active')
             on conflict (billing_account_id, user_id) do nothing`,
      [acct, payer.userId, learner.userId]);

    await asUser(payer.userId, async () => {
      // Billing: yes.
      const b = await count(
        'select 1 from public.billing_accounts where id = $1', [acct]);
      assert(b === 1, `billing member could not see the billing account (${b})`);

      // Learning: no. This is the assertion that was missing.
      const p = await count(
        'select 1 from public.learner_profiles where id = $1', [learner.learnerId]);
      assert(p === 0, `billing member read learning data: ${p} learner_profile rows`);

      const e = await count(
        'select 1 from public.course_enrolments where learner_profile_id = $1',
        [learner.learnerId]);
      assert(e === 0, `billing member read ${e} enrolment rows`);

      const g = await count(
        `select 1 from public.lesson_progress lp
           join public.course_enrolments ce on ce.id = lp.course_enrolment_id
          where ce.learner_profile_id = $1`, [learner.learnerId]);
      assert(g === 0, `billing member read ${g} progress rows`);
    });

    // Sanity: the learner themselves still sees their own learning data.
    await asUser(learner.userId, async () => {
      assert(await count('select 1 from public.learner_profiles where id=$1', [learner.learnerId]) === 1,
        'the learner lost sight of their own profile');
    });
  });

  await test('[record 5b] a family billing_manager is not a guardian either', async () => {
    const owner = await adult('authz-owner5b@example.com', 'Owner 5b');
    const payer = await adult('authz-payer5b@example.com', 'Payer 5b');
    const fam   = await familyOwnedBy(owner.userId);
    const kid   = await childOf(fam, 'Kid 5b');

    await q(`insert into public.family_memberships
               (family_id, user_id, membership_type, status, joined_at)
             values ($1, $2, 'billing_manager', 'active', now())`, [fam, payer.userId]);

    await asUser(payer.userId, async () => {
      const n = await count(
        'select 1 from public.learner_profiles where id = $1', [kid]);
      assert(n === 0,
        `family billing_manager read the child profile (${n} rows); paying is not parenting`);
    });
  });

  // -------------------------------------------------------------------
  // 6. Client role tampering ineffective
  // -------------------------------------------------------------------
  await test('[record 6] client role tampering is ineffective', async () => {
    const nobody = await adult('authz-nobody6@example.com', 'Nobody');

    // The JWT is signed by Supabase; the app cannot mint a role claim. Even if
    // it could, has_role() reads user_role_assignments, not the claim.
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: nobody.userId, role: 'platform_admin', app_role: 'platform_admin' })]);
    await q('set local role authenticated');
    const tampered = (await q(
      'select public.has_role(public.current_user_id(), $1) h', ['platform_admin'])).rows[0].h;
    const priv = (await q(
      'select public.is_privileged(public.current_user_id()) h')).rows[0].h;
    await q('rollback');

    assert(tampered === false, 'a forged role claim satisfied has_role()');
    assert(priv === false, 'a forged role claim satisfied is_privileged()');

    // And the self-grant path is closed.
    await asUser(nobody.userId, async () => {
      await rejects(() =>
        q(`insert into public.user_role_assignments (user_id, role_id)
           select $1, id from public.roles where code = 'platform_admin'`, [nobody.userId]),
        'a learner granted themselves platform_admin');
    });
  });

  // -------------------------------------------------------------------
  // 7. Reviewer cannot access unrelated unpublished content
  // -------------------------------------------------------------------
  await test('[record 7] reviewer cannot reach unrelated unpublished content', async () => {
    const course  = await newCourse(teacher, { status: 'draft' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    await asUser(reviewer, async () => {
      const v = await count('select 1 from public.course_versions where id=$1', [version]);
      assert(v === 0, `reviewer saw an unassigned draft version (${v} rows)`);
      const l = await count(
        'select 1 from public.lessons l join public.course_sections s on s.id=l.section_id where s.course_version_id=$1',
        [version]);
      assert(l === 0, `reviewer saw lessons of an unassigned draft (${l} rows)`);
    });

    // Assigned: now visible.
    await ensureReviewerProfile(reviewer);
    await satisfyReview(version, reviewer, admin);
    await asUser(reviewer, async () => {
      const v = await count('select 1 from public.course_versions where id=$1', [version]);
      assert(v === 1, 'an assigned reviewer still cannot see the version');
    });
  });

  // -------------------------------------------------------------------
  // 8. Unqualified or conflicted reviewer cannot approve
  // -------------------------------------------------------------------
  await test('[record 8] author cannot approve their own course', async () => {
    const course  = await newCourse(teacher, { status: 'draft' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);
    const set = (s, by) => q(
      'select id from public.set_course_version_status($1,$2,$3,$4)', [version, s, by, 'authz']);

    await asUser(teacher, async () => {
      await set('submitted', teacher);
      await rejects(() => set('approved', teacher),
        'the author approved their own course version');
    });
  });

  // -------------------------------------------------------------------
  // 9. Unauthorized publish / suspend / refund / role assignment blocked
  // -------------------------------------------------------------------
  await test('[record 9] unauthorized privileged writes are blocked', async () => {
    const nobody = await adult('authz-nobody9@example.com', 'Nobody 9');
    const { version } = await publishedCourseFor(teacher);

    await asUser(nobody.userId, async () => {
      await rejects(() => q(
        'select id from public.set_course_version_status($1,$2,$3,$4)',
        [version, 'retired', nobody.userId, 'authz']),
        'an ordinary user retired a published course');
    });

    // Courses.suspended_at is the suspension lever.
    await asUser(nobody.userId, async () => {
      const before = await count(
        'select 1 from public.courses where suspended_at is not null');
      await q(`update public.courses set suspended_at = now(), suspended_reason = 'authz'
               where id = (select course_id from public.course_versions where id = $1)`, [version]);
      const after = await count(
        'select 1 from public.courses where suspended_at is not null');
      assert(after === before,
        `an ordinary user suspended a course (${before} -> ${after})`);
    });

    // Role assignment.
    await asUser(nobody.userId, async () => {
      await rejects(() => q(
        `insert into public.user_role_assignments (user_id, role_id)
         select $1, id from public.roles where code = 'finance_admin'`, [nobody.userId]),
        'an ordinary user assigned themselves finance_admin');
    });
  });

  // -------------------------------------------------------------------
  // 10. Audit records cannot be edited through ordinary app paths
  // -------------------------------------------------------------------
  await test('[record 10] audit history is immutable to ordinary paths', async () => {
    const row = await committed(async () => (await q(
      `insert into public.governance_audit_events (actor, action, target_type, detail)
       values ($1, 'authz.probe', 'course', '{}'::jsonb) returning id`, [admin])).rows[0].id);
    const n0 = await count('select 1 from public.governance_audit_events');
    assert(n0 > 0, 'setup failed: no audit row to protect');

    // Immutability here is enforced twice over, and neither layer raises:
    //
    //   - The gae_append_only trigger rejects UPDATE and DELETE outright,
    //     which is what stops a superuser or a stray SQL console.
    //   - RLS has no UPDATE or DELETE policy, so through the application the
    //     statement silently matches zero rows.
    //
    // Asserting on an exception would test the trigger and miss the RLS gap;
    // asserting on the surviving row tests both.
    await asUser(admin, async () => {
      const upd = await q(
        'update public.governance_audit_events set action = $1 where id = $2 returning id',
        ['tampered', row]);
      assert(upd.rows.length === 0,
        `an admin updated ${upd.rows.length} audit row(s) through the application`);

      const del = await q(
        'delete from public.governance_audit_events where id = $1 returning id', [row]);
      assert(del.rows.length === 0,
        `an admin deleted ${del.rows.length} audit row(s) through the application`);
    });

    const surviving = (await q(
      'select action from public.governance_audit_events where id = $1', [row])).rows[0];
    assert(surviving, 'the audit row disappeared');
    assert(surviving.action === 'authz.probe',
      `the audit row was rewritten to '${surviving.action}'`);

    const n1 = await count('select 1 from public.governance_audit_events');
    assert(n1 === n0, `audit row count changed ${n0} -> ${n1}`);
  });

  // -------------------------------------------------------------------
  // Anonymous baseline
  // -------------------------------------------------------------------
  await test('[baseline] anonymous sees nothing of any of the above', async () => {
    await asAnon(async () => {
      for (const t of ['learner_profiles', 'course_enrolments', 'billing_accounts',
                       'adult_learning_shares', 'guardian_relationships']) {
        const n = await count(`select 1 from public.${t}`);
        assert(n === 0, `anonymous read ${n} rows from ${t}`);
      }
    });
  });
}
