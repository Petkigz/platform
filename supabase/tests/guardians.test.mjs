// Guardian verification — verifiable parental consent.
//
// COPPA requires this before a US under-13 enrolls, which is what the machinery
// was built for. The tables and the decision trigger were complete and correct
// all along; what was missing was anything connecting them, so a request had
// nowhere to go. Measured before the UI existed:
//
//   parent creates guardian_relationship  -> allowed
//   parent creates verification case      -> refused (gvc_admin)
//   staff creates case and approves       -> works
//   ...and there was no UI for any of it
//
// These tests pin the invariants that make the workflow safe, because the
// consequence of getting them wrong is granting an unrelated adult access to a
// child's record.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, bootstrapAdmin,
  } = ctx;

  const admin = await bootstrapAdmin('gv-admin@example.com');

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  /** A child learner profile inside a family the given user owns. */
  async function familyWithChild(ownerEmail, childName = 'GV Child') {
    const userId = await newUser(ownerEmail);
    await newProfile(userId, ownerEmail);
    const { familyId, childId } = await committed(async () => {
      const fam = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, ['GV Family', userId])).rows[0].id;
      const child = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','8-10',$2,'active') returning id`, [childName, fam])).rows[0].id;
      // fm_joined_when_active requires joined_at on an active membership.
      await q(`insert into public.family_memberships
                 (family_id, user_id, membership_type, status, joined_at, created_by)
               values ($1,$2,'owner','active',now(),$3)`, [fam, userId, userId]);
      return { familyId: fam, childId: child };
    });
    return { userId, familyId, childId };
  }

  /**
   * Create a pending request that outlives the call.
   *
   * Deliberately not asUser(): that rolls back, and every test below goes on to
   * insert a guardian_verification_cases row pointing at this one, which then
   * fails on the foreign key. The policy itself is proven separately, in its own
   * test, where the assertion lives inside the block.
   */
  async function requestAs(userId, childId, type = 'parent') {
    return committed(async () => (await q(
      `insert into public.guardian_relationships
         (guardian_user_id, learner_profile_id, relationship_type, status,
          can_manage_profile, can_view_progress, can_manage_learning)
       values ($1,$2,$3,'pending_verification',true,true,true) returning id`,
      [userId, childId, type])).rows[0].id);
  }

  // -------------------------------------------------------------------
  // What a parent may and may not do
  // -------------------------------------------------------------------
  await test('a family member can ask to be a child’s guardian', async () => {
    const fam = await familyWithChild('gv-owner-1@example.com');

    // Asserted inside the block, via RETURNING. Inside asUser() the first error
    // aborts the transaction, so a write proven by reading it back afterwards
    // proves nothing at all.
    await asUser(fam.userId, async () => {
      const relationshipId = (await q(
        `insert into public.guardian_relationships
           (guardian_user_id, learner_profile_id, relationship_type, status,
            can_manage_profile, can_view_progress, can_manage_learning)
         values ($1,$2,$3,'pending_verification',true,true,true)
         returning id, status, verified_at`,
        [fam.userId, fam.childId, 'parent'])).rows[0];

      assert(relationshipId.id, 'the request was not recorded');
      assert(relationshipId.status === 'pending_verification',
        `status is '${relationshipId.status}'`);
      assert(relationshipId.verified_at === null,
        'a pending relationship was already verified');
    });
  });

  await test('a relationship cannot be created already active', async () => {
    // This is what makes self-service escalation impossible: an active
    // relationship must carry verified_at, and only a reviewer's decision
    // sets it.
    const fam = await familyWithChild('gv-owner-2@example.com');

    await asUser(fam.userId, async () => {
      await rejects(() => q(
        `insert into public.guardian_relationships
           (guardian_user_id, learner_profile_id, relationship_type, status,
            can_manage_profile, can_view_progress, can_manage_learning)
         values ($1,$2,'parent','active',true,true,true)`,
        [fam.userId, fam.childId]),
        'a guardian relationship was created active without verification');
    });
  });

  await test('a parent cannot create the review case for their own request', async () => {
    // The split is deliberate. "Who may decide that this adult is this child's
    // parent" is a governance question, not a self-service one.
    const fam = await familyWithChild('gv-owner-3@example.com');
    const relationshipId = await requestAs(fam.userId, fam.childId);

    await asUser(fam.userId, async () => {
      await rejects(() => q(
        `insert into public.guardian_verification_cases
           (guardian_relationship_id, status) values ($1,'pending')`, [relationshipId]),
        'a parent opened their own verification case');
    });
  });

  await test('an unrelated adult cannot ask about someone else’s child', async () => {
    // 20261029000300 removed the self-nomination branch from gr_insert. Before
    // that, any signed-in account could queue a claim against any child. It
    // granted no access — is_verified_guardian_of() stayed false — but it put
    // junk into the COPPA consent queue that a human has to work.
    const fam = await familyWithChild('gv-owner-4@example.com');
    const stranger = await newUser('gv-stranger@example.com');
    await newProfile(stranger, 'GV Stranger');

    await asUser(stranger, async () => {
      await rejects(() => q(
        `insert into public.guardian_relationships
           (guardian_user_id, learner_profile_id, relationship_type, status,
            can_manage_profile, can_view_progress, can_manage_learning)
         values ($1,$2,'parent','pending_verification',true,true,true)`,
        [stranger, fam.childId]),
        'an unrelated adult created a guardian relationship for someone else’s child');
    });

    await asUser(stranger, async () => {
      const visible = (await q(
        'select id from public.guardian_relationships where learner_profile_id=$1',
        [fam.childId])).rows.length;
      assert(visible === 0,
        `an unrelated adult could read guardian relationships for someone else's child (${visible} row)`);
    });
  });

  // -------------------------------------------------------------------
  // The decision
  // -------------------------------------------------------------------
  await test('approving a case makes the guardian active and verified', async () => {
    const fam = await familyWithChild('gv-owner-5@example.com');
    const relationshipId = await requestAs(fam.userId, fam.childId);

    await committed(async () => {
      const caseId = (await q(
        `insert into public.guardian_verification_cases
           (guardian_relationship_id, status) values ($1,'pending') returning id`,
        [relationshipId])).rows[0].id;
      await q(`update public.guardian_verification_cases
                 set status='verified', reviewed_at=now(), reviewed_by=$2,
                     decision_reason='Identity documents checked'
               where id=$1`, [caseId, admin]);
    });

    const row = (await q(
      'select status, verified_at is not null as v from public.guardian_relationships where id=$1',
      [relationshipId])).rows[0];
    assert(row.status === 'active', `status is '${row.status}', expected active`);
    assert(row.v === true, 'verified_at was not stamped on approval');

    // And the helper the access rules actually consult now agrees.
    await asUser(fam.userId, async () => {
      const allowed = (await q(
        'select public.is_verified_guardian_of($1) v', [fam.childId])).rows[0].v;
      assert(allowed === true, 'is_verified_guardian_of was false after approval');
    });
  });

  await test('rejecting a case revokes the relationship and strips access', async () => {
    const fam = await familyWithChild('gv-owner-6@example.com');
    const relationshipId = await requestAs(fam.userId, fam.childId);

    await committed(async () => {
      const caseId = (await q(
        `insert into public.guardian_verification_cases
           (guardian_relationship_id, status) values ($1,'pending') returning id`,
        [relationshipId])).rows[0].id;
      await q(`update public.guardian_verification_cases
                 set status='rejected', reviewed_at=now(), reviewed_by=$2,
                     decision_reason='Could not establish relationship'
               where id=$1`, [caseId, admin]);
    });

    const row = (await q(
      `select status, can_manage_profile, can_view_progress, can_manage_learning
         from public.guardian_relationships where id=$1`, [relationshipId])).rows[0];
    assert(row.status === 'revoked', `status is '${row.status}', expected revoked`);
    // A rejection is not a soft no. Every requested capability must be gone,
    // or a rejected adult keeps the access they were refused.
    assert(row.can_manage_profile === false, 'a rejected guardian can still manage the profile');
    assert(row.can_view_progress === false, 'a rejected guardian can still view progress');
    assert(row.can_manage_learning === false, 'a rejected guardian can still manage learning');
  });

  await test('a rejection needs a written reason', async () => {
    const fam = await familyWithChild('gv-owner-7@example.com');
    const relationshipId = await requestAs(fam.userId, fam.childId);

    await rejects(() => committed(async () => {
      const caseId = (await q(
        `insert into public.guardian_verification_cases
           (guardian_relationship_id, status) values ($1,'pending') returning id`,
        [relationshipId])).rows[0].id;
      await q(`update public.guardian_verification_cases
                 set status='rejected', reviewed_at=now(), reviewed_by=$2
               where id=$1`, [caseId, admin]);
    }), 'a rejection was recorded with no reason');
  });

  await test('a terminal decision names who made it', async () => {
    // Without reviewed_by the record cannot answer the only question that
    // matters later: who consented to this?
    const fam = await familyWithChild('gv-owner-8@example.com');
    const relationshipId = await requestAs(fam.userId, fam.childId);

    await rejects(() => committed(async () => {
      const caseId = (await q(
        `insert into public.guardian_verification_cases
           (guardian_relationship_id, status) values ($1,'pending') returning id`,
        [relationshipId])).rows[0].id;
      await q(`update public.guardian_verification_cases
                 set status='verified', reviewed_at=now(),
                     decision_reason='checked'
               where id=$1`, [caseId]);
    }), 'a verified decision was recorded with no reviewer');
  });

  await test('only one live relationship per adult and child', async () => {
    const fam = await familyWithChild('gv-owner-9@example.com');
    const relationshipId = await requestAs(fam.userId, fam.childId);

    // Approve the first, so it is live; then a second request must not create
    // a parallel live claim.
    await committed(async () => {
      const caseId = (await q(
        `insert into public.guardian_verification_cases
           (guardian_relationship_id, status) values ($1,'pending') returning id`,
        [relationshipId])).rows[0].id;
      await q(`update public.guardian_verification_cases
                 set status='verified', reviewed_at=now(), reviewed_by=$2,
                     decision_reason='checked'
               where id=$1`, [caseId, admin]);
    });

    await asUser(fam.userId, async () => {
      await rejects(() => q(
        `insert into public.guardian_relationships
           (guardian_user_id, learner_profile_id, relationship_type, status,
            can_manage_profile, can_view_progress, can_manage_learning)
         values ($1,$2,'guardian','pending_verification',true,true,true)`,
        [fam.userId, fam.childId]),
        'a second live guardian relationship was created for the same pair');
    });

    const live = await count(
      `select 1 from public.guardian_relationships
        where guardian_user_id=$1 and learner_profile_id=$2
          and status <> 'revoked'`, [fam.userId, fam.childId]);
    assert(live === 1, `${live} live relationships for one adult and child`);
  });
}
