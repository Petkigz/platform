// Who is learning.
//
// A child is a learner_profile under a family, never a user account (D2). So a
// child cannot sign in, and cannot enrol themselves. Which means the parent has
// to be able to — and until now the application never asked. Measured at the
// database level, the path was already permitted and working:
//
//   parent ENROLs their child at the DB level -> YES
//     free-enrolment entitlement granted      -> 1
//     child can access the course             -> true
//
// course_enrolments_insert is gated on can_access_learner(learner_profile_id),
// which already covers family members. enrolInFreeCourse() simply always used
// the caller's own profile. So no child could ever be enrolled through the
// product, despite the family dashboard and guardian verification both existing.
//
// These tests pin both halves: family membership allows child enrolment while
// the guardian-consent flag is off; once enabled, a verified, session-linked
// guardian relationship becomes a database precondition. No client-supplied
// actor id or UI-only check can substitute for that verification.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('ls-admin@example.com');
  const teacher = await newInstructor('ls-teacher@example.com', admin);
  const reviewer = await newReviewer('ls-reviewer@example.com', admin);

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'learner switcher test']);

  async function freeCourse() {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await newLesson(section);
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version, lesson };
  }

  /** A parent account owning a family with one child profile in it. */
  async function parentWithChild(email) {
    const userId = await newUser(email);
    await newProfile(userId, email);
    const { childId, familyId } = await committed(async () => {
      const fam = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, ['LS Family', userId])).rows[0].id;
      const child = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','8-10',$2,'active') returning id`, ['LS Child', fam])).rows[0].id;
      // fm_joined_when_active requires joined_at on an active membership.
      await q(`insert into public.family_memberships
                 (family_id, user_id, membership_type, status, joined_at, created_by)
               values ($1,$2,'owner','active',now(),$3)`, [fam, userId, userId]);
      return { childId: child, familyId: fam };
    });
    return { userId, childId, familyId };
  }

  // -------------------------------------------------------------------
  await test('a parent can enrol their own child', async () => {
    const pc = await freeCourse();
    const fam = await parentWithChild('ls-parent-1@example.com');

    await asUser(fam.userId, async () => {
      const enrolment = (await q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active') returning id, learner_profile_id`,
        [fam.childId, pc.course, pc.version])).rows[0];

      assert(enrolment.id, 'the parent could not enrol their child');
      // It has to be the child's enrolment, not silently the parent's. A
      // parent's course list quietly absorbing a child's progress is the
      // failure this whole feature exists to avoid.
      assert(enrolment.learner_profile_id === fam.childId,
        'the enrolment was recorded against the wrong learner');
    });
  });

  await test('enabling guardian verification blocks unverified child enrolment until staff verifies the guardian', async () => {
    const pc = await freeCourse();
    const fam = await parentWithChild('ls-consent-parent@example.com');
    await q(`update public.platform_settings set value_text='true' where key='family.guardian_verification'`);
    try {
      await asUser(fam.userId, async () => {
        await rejects(() => q(
          `insert into public.course_enrolments
             (learner_profile_id,course_id,course_version_id,source,status)
           values ($1,$2,$3,'free','active')`,[fam.childId,pc.course,pc.version]),
          'a parent enrolled a child without verified consent while the gate was enabled');
      });

      const relationshipId = (await q(
        `insert into public.guardian_relationships
           (guardian_user_id,learner_profile_id,relationship_type,status,
            can_manage_profile,can_view_progress,can_manage_learning)
         values ($1,$2,'parent','pending_verification',true,true,true) returning id`,
        [fam.userId,fam.childId])).rows[0].id;
      await q(
        `insert into public.guardian_verification_cases
           (guardian_relationship_id,status,reviewed_by,reviewed_at,decision_reason)
         values ($1,'verified',$2,now(),'guardian identity reviewed')`,
        [relationshipId,admin]);

      await asUser(fam.userId, async () => {
        const enrolled = (await q(
          `insert into public.course_enrolments
             (learner_profile_id,course_id,course_version_id,source,status)
           values ($1,$2,$3,'free','active') returning id,learner_profile_id`,
          [fam.childId,pc.course,pc.version])).rows[0];
        assert(enrolled.id && enrolled.learner_profile_id===fam.childId,
          'a verified guardian could not enrol the child profile');
      });
    } finally {
      await q(`update public.platform_settings set value_text='false' where key='family.guardian_verification'`);
    }
  });

  await test('enrolling a child grants the child access, not the parent’s', async () => {
    const pc = await freeCourse();
    const fam = await parentWithChild('ls-parent-2@example.com');

    await committed(async () => {
      await q(`insert into public.course_enrolments
                 (learner_profile_id, course_id, course_version_id, source, status)
               values ($1,$2,$3,'free','active')`, [fam.childId, pc.course, pc.version]);
    });

    // The free-enrolment trigger grants to the learner on the enrolment row.
    const childGrants = await count(
      'select 1 from public.entitlement_grants where learner_profile_id=$1 and status=$2',
      [fam.childId, 'active']);
    assert(childGrants === 1, `the child got ${childGrants} grants, expected 1`);

    const childAccess = (await q(
      'select public.can_access_course_version($1,$2) v', [fam.childId, pc.version])).rows[0].v;
    assert(childAccess === true, 'the child could not access the course they were enrolled in');

    const parentAccess = (await q(
      'select public.can_access_course_version($1,$2) v', [fam.userId, pc.version])).rows[0].v;
    // fam.userId is a user id, not a learner profile id, so this is not a
    // meaningful access question — but it must not accidentally be true, which
    // would mean the grant landed on the wrong row.
    assert(parentAccess === false,
      'enrolling a child granted access to the parent’s id as well');
  });

  await test('an unrelated user cannot enrol someone else’s child', async () => {
    // This is the check that makes accepting a client-supplied learner id
    // safe. The application passes it through; this policy is the only thing
    // deciding.
    const pc = await freeCourse();
    const fam = await parentWithChild('ls-parent-3@example.com');
    const intruder = await newUser('ls-intruder@example.com');
    await newProfile(intruder, 'LS Intruder');

    await asUser(intruder, async () => {
      await rejects(() => q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [fam.childId, pc.course, pc.version]),
        'an unrelated user enrolled someone else’s child');
    });

    const grants = await count(
      'select 1 from public.entitlement_grants where learner_profile_id=$1', [fam.childId]);
    assert(grants === 0, `${grants} grant(s) appeared for a refused enrolment`);
  });

  await test('a billing-only family member cannot enrol the child', async () => {
    // Paying is not parenting. is_learner_family_member() excludes billing-only
    // members, and enrolment inherits that through can_access_learner().
    const pc = await freeCourse();
    const fam = await parentWithChild('ls-parent-4@example.com');
    const payer = await newUser('ls-payer@example.com');
    await newProfile(payer, 'LS Payer');

    await committed(async () => {
      await q(`insert into public.family_memberships
                 (family_id, user_id, membership_type, status, joined_at, created_by)
               values ($1,$2,'billing_manager','active',now(),$3)`,
        [fam.familyId, payer, fam.userId]);
    });

    await asUser(payer, async () => {
      await rejects(() => q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [fam.childId, pc.course, pc.version]),
        'a billing-only family member enrolled the child');
    });
  });

  await test('a child cannot enrol themselves, because a child is not a user', async () => {
    // D2. There is no linked_user_id on a child profile, so there is no session
    // that could ever act as the child. Asserting it here keeps the invariant
    // visible rather than leaving it to be rediscovered.
    const fam = await parentWithChild('ls-parent-5@example.com');

    const linked = (await q(
      'select linked_user_id from public.learner_profiles where id=$1', [fam.childId]))
      .rows[0].linked_user_id;
    assert(linked === null, 'a child profile has a linked user, which D2 forbids');

    const own = await count(
      'select 1 from public.learner_profiles where linked_user_id is null and learner_type=$1',
      ['child']);
    assert(own > 0, 'no unlinked child profiles exist to check against');
  });

  await test('the parent can see the child’s enrolment afterwards', async () => {
    const pc = await freeCourse();
    const fam = await parentWithChild('ls-parent-6@example.com');

    await committed(async () => {
      await q(`insert into public.course_enrolments
                 (learner_profile_id, course_id, course_version_id, source, status)
               values ($1,$2,$3,'free','active')`, [fam.childId, pc.course, pc.version]);
    });

    await asUser(fam.userId, async () => {
      const visible = (await q(
        'select learner_profile_id from public.course_enrolments where course_version_id=$1',
        [pc.version])).rows;
      assert(visible.length === 1,
        `the parent saw ${visible.length} enrolment(s), expected 1`);
      assert(visible[0].learner_profile_id === fam.childId,
        'the visible enrolment belongs to someone other than the child');
    });
  });
}
