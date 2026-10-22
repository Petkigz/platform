// Families and children.
//
// The centrepiece is D2: a child is a `learner_profile` under a `family`,
// never a `user`. That single choice is what makes it possible to teach a
// seven-year-old without giving them an email address, and it is enforced by
// constraints rather than by convention.
//
// The second thing worth pinning is the boundary that was once a defect: a
// family member whose membership_type is 'billing_manager' can see the family
// and none of its children. Paying for a family is not parenting it.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('fam-admin@example.com');
  const teacher  = await newInstructor('fam-teacher@example.com', admin);
  const reviewer = await newReviewer('fam-reviewer@example.com', admin);

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const setVersion = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, 'family']);

  async function adult(email, name) {
    const userId = await newUser(email);
    await newProfile(userId, name ?? email);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [name ?? email, userId])).rows[0].id;
    return { userId, learnerId };
  }

  // committed() matters here: asUser() and asAnon() roll back, so an
  // uncommitted membership row would be undone by the first test that runs as
  // a user, and the owner would quietly stop being an owner.
  async function familyOwnedBy(userId, name) {
    return committed(async () => {
      const fam = (await q(
        `insert into public.families (name, created_by) values ($1, $2) returning id`,
        [name, userId])).rows[0].id;
      await q(`insert into public.family_memberships
                 (family_id, user_id, membership_type, status, joined_at)
               values ($1, $2, 'owner', 'active', now())`, [fam, userId]);
      return fam;
    });
  }

  const addChild = (familyId, name, ageBand = '8-10') =>
    q(`insert into public.learner_profiles
         (family_id, display_name, learner_type, age_band)
       values ($1, $2, 'child', $3) returning id`, [familyId, name, ageBand]);

  // -------------------------------------------------------------------
  // Fixtures
  // -------------------------------------------------------------------
  const parent  = await adult('fam-parent@example.com', 'Parent');
  const payer   = await adult('fam-payer@example.com', 'Payer');
  const grandma = await adult('fam-grandma@example.com', 'Grandma');
  const outsider= await adult('fam-outsider@example.com', 'Outsider');

  const familyId = await familyOwnedBy(parent.userId, 'Family of Parent');
  const kidId = (await committed(() => addChild(familyId, 'Kid'))).rows[0].id;

  await committed(async () => {
    await q(`insert into public.family_memberships
               (family_id, user_id, membership_type, status, joined_at)
             values ($1, $2, 'billing_manager', 'active', now())`, [familyId, payer.userId]);
  });

  // A published course the child is enrolled in.
  const course  = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lesson  = await newLesson(section);
  await setVersion(version, 'submitted', teacher);
  await setVersion(version, 'approved', reviewer);
  await satisfyReview(version, reviewer, admin);
  await setVersion(version, 'published', admin);

  const enrolmentId = await committed(async () =>
    (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1, $2, $3, 'free', 'active') returning id`, [kidId, course, version])).rows[0].id);

  await committed(async () => {
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
             values ($1, $2, 'completed', 100, now(), now())`, [enrolmentId, lesson]);
  });

  // -------------------------------------------------------------------
  // D2
  // -------------------------------------------------------------------
  await test('a child is a learner_profile, never a user', async () => {
    const row = (await q(
      `select learner_type, linked_user_id, family_id from public.learner_profiles where id = $1`,
      [kidId])).rows[0];

    assert(row.learner_type === 'child', `learner_type was '${row.learner_type}'`);
    assert(row.linked_user_id === null, 'a child had a login attached');
    assert(row.family_id === familyId, 'the child was not attached to the family');

    const authRow = await count(`select 1 from auth.users where id = $1`, [kidId]);
    assert(authRow === 0, 'a child existed in auth.users');
  });

  await test('a child cannot be given a login yet', async () => {
    // lp_no_child_login_yet. Drop this constraint in the migration that
    // enables child login — not before.
    await rejects(() => q(
      `insert into public.learner_profiles
         (family_id, display_name, learner_type, age_band, linked_user_id)
       values ($1, 'Sneaky', 'child', '8-10', $2)`, [familyId, outsider.userId]),
      'a child profile was given a linked_user_id');
  });

  await test('a child must have an age band', async () => {
    await rejects(() => q(
      `insert into public.learner_profiles (family_id, display_name, learner_type)
       values ($1, 'NoAge', 'child')`, [familyId]),
      'a child was created with no age band');
  });

  await test('a child must belong to a family or have a login', async () => {
    await rejects(() => q(
      `insert into public.learner_profiles (display_name, learner_type, age_band)
       values ('Orphan', 'child', '8-10')`),
      'a child was created with neither a family nor a login');
  });

  // -------------------------------------------------------------------
  // Who can see the child
  // -------------------------------------------------------------------
  await test('the family owner sees their children and their progress', async () => {
    await asUser(parent.userId, async () => {
      const kids = await count(
        `select 1 from public.learner_profiles
          where family_id = $1 and learner_type = 'child'`, [familyId]);
      assert(kids === 1, `the owner saw ${kids} children, expected 1`);

      const prog = await count(
        `select 1 from public.lesson_progress lp
           join public.course_enrolments ce on ce.id = lp.course_enrolment_id
          where ce.learner_profile_id = $1`, [kidId]);
      assert(prog === 1, `the owner saw ${prog} progress rows for their child`);
    });
  });

  await test('a family billing_manager sees the family and none of its children', async () => {
    // This is the defect that was fixed in 20261021000100_authz_fixes.sql.
    // It is re-asserted here because the family dashboard depends on it: the
    // page renders children for whoever can read them, and a billing manager
    // must get an empty list rather than someone else's child.
    await asUser(payer.userId, async () => {
      const fam = await count(`select 1 from public.families where id = $1`, [familyId]);
      assert(fam === 1, 'the billing manager could not see the family at all');

      const kids = await count(
        `select 1 from public.learner_profiles
          where family_id = $1 and learner_type = 'child'`, [familyId]);
      assert(kids === 0, `the billing manager saw ${kids} child profile(s)`);

      const prog = await count(
        `select 1 from public.lesson_progress lp
           join public.course_enrolments ce on ce.id = lp.course_enrolment_id
          where ce.learner_profile_id = $1`, [kidId]);
      assert(prog === 0, `the billing manager saw ${prog} progress rows`);
    });
  });

  await test('an unrelated adult sees nothing', async () => {
    await asUser(outsider.userId, async () => {
      const fam = await count(`select 1 from public.families where id = $1`, [familyId]);
      assert(fam === 0, 'an unrelated adult read the family');

      const kid = await count(`select 1 from public.learner_profiles where id = $1`, [kidId]);
      assert(kid === 0, 'an unrelated adult read the child profile');
    });
  });

  await test('anonymous sees no family data at all', async () => {
    await asAnon(async () => {
      for (const t of ['families', 'family_memberships', 'learner_profiles',
                       'guardian_relationships']) {
        const n = await count(`select 1 from public.${t}`);
        assert(n === 0, `anonymous read ${n} rows from ${t}`);
      }
    });
  });

  // -------------------------------------------------------------------
  // Guardians — the COPPA path
  // -------------------------------------------------------------------
  await test('a verified guardian sees the child; an unverified one does not', async () => {
    const rel = await committed(async () => (await q(
      `insert into public.guardian_relationships
         (guardian_user_id, learner_profile_id, relationship_type, status, can_view_progress)
       values ($1, $2, 'other', 'pending_verification', true) returning id`,
      [grandma.userId, kidId])).rows[0].id);

    await asUser(grandma.userId, async () => {
      const n = await count(`select 1 from public.learner_profiles where id = $1`, [kidId]);
      assert(n === 0, `an unverified guardian saw ${n} rows`);
    });

    // The trigger reacts to a pending -> verified transition, so the case is
    // inserted pending and then moved. Inserting it as 'verified' does nothing.
    const c = (await q(
      `insert into public.guardian_verification_cases (guardian_relationship_id)
       values ($1) returning id`, [rel])).rows[0].id;
    await q(`update public.guardian_verification_cases
                set status = 'verified', reviewed_by = $1, reviewed_at = now()
              where id = $2`, [admin, c]);

    await asUser(grandma.userId, async () => {
      const n = await count(`select 1 from public.learner_profiles where id = $1`, [kidId]);
      assert(n === 1, `a verified guardian saw ${n} rows, expected 1`);

      const prog = await count(
        `select 1 from public.lesson_progress lp
           join public.course_enrolments ce on ce.id = lp.course_enrolment_id
          where ce.learner_profile_id = $1`, [kidId]);
      assert(prog === 1, `a verified guardian saw ${prog} progress rows, expected 1`);
    });

    // Revocation closes it again, and the constraint requires the permission
    // flag to be cleared with the status.
    await q(`update public.guardian_relationships
                set status = 'revoked', can_view_progress = false where id = $1`, [rel]);

    await asUser(grandma.userId, async () => {
      const n = await count(`select 1 from public.learner_profiles where id = $1`, [kidId]);
      assert(n === 0, `a revoked guardian still saw ${n} rows`);
    });
  });

  // -------------------------------------------------------------------
  // Writing
  // -------------------------------------------------------------------
  await test('a family owner adds a child through the one writer; an outsider cannot', async () => {
    await asUser(parent.userId, async () => {
      const r = await q('select public.add_child_to_family($1,$2,$3) id',
        [familyId, 'Second Kid', '5-7']);
      assert(r.rows.length === 1, 'the owner could not add a child');
    });

    await asUser(outsider.userId, async () => {
      await rejects(
        () => q('select public.add_child_to_family($1,$2,$3)', [familyId, 'Intruder', '8-10']),
        /only the owner may add a child/,
      );
    });

    // Both calls ran inside asUser(), which rolls back. What is being asserted is who
    // was *allowed* to write, not the resulting row count.
    const kids = await count(
      `select 1 from public.learner_profiles
        where family_id = $1 and learner_type = 'child'`, [familyId]);
    assert(kids === 1, `expected the child count to be unchanged at 1, found ${kids}`);
  });

  await test('the table takes no child insert from anybody but staff', async () => {
    // `lp_insert` used to admit any active family member, which is how the screen
    // bypassed the writer: no audit row, no owner check, and a billing manager could
    // create a profile they could not then read. It is staff-only now.
    await asUser(parent.userId, async () => {
      await rejects(() => q(
        `insert into public.learner_profiles
           (family_id, display_name, learner_type, age_band)
         values ($1, 'Direct Kid', 'child', '11-13') returning id`, [familyId]),
      /row-level security|permission denied/);
    });

    await asUser(payer.userId, async () => {
      await rejects(() => q(
        `insert into public.learner_profiles
           (family_id, display_name, learner_type, age_band)
         values ($1, 'Payer Kid', 'child', '8-10') returning id`, [familyId]),
      /row-level security|permission denied/);
    });
  });

  await test('the owner can read back the child the writer just added', async () => {
    // The read-back is the shape every client library uses, and it is what broke once
    // before: `lp_read` joined back through `learner_profiles`, so a fresh row was
    // invisible to its own RETURNING. The writer inserts and the owner reads, in one
    // transaction, as the product does.
    await asUser(parent.userId, async () => {
      const made = await q('select public.add_child_to_family($1,$2,$3) id',
        [familyId, 'Readable Kid', '11-13']);
      const id = made.rows[0].id;
      const seen = await q(
        'select id, display_name from public.learner_profiles where id = $1', [id]);
      assert(seen.rows.length === 1, 'the owner could not read back the child they added');
      assert(seen.rows[0].display_name === 'Readable Kid');
    });
  });

  await test('a billing_manager cannot add a child either', async () => {
    // Paying for a family is not parenting it. The writer refuses because they are not
    // the owner, and the table refuses because it is no longer a second door.
    await asUser(payer.userId, async () => {
      await rejects(
        () => q('select public.add_child_to_family($1,$2,$3)', [familyId, 'Payer Kid', '8-10']),
        /only the owner may add a child/,
      );
    });

    // A refused statement aborts the transaction asUser() opened, so the second
    // assertion needs a transaction of its own.
    await asUser(payer.userId, async () => {
      await rejects(() => q(
        `insert into public.learner_profiles
           (family_id, display_name, learner_type, age_band)
         values ($1, 'Payer Kid', 'child', '8-10') returning id`, [familyId]),
      /row-level security|permission denied/);
    });
  });

  await test('a rename is an edit; becoming a different person is not', async () => {
    await asUser(parent.userId, async () => {
      // The owner may correct the name — that is what editing a profile is for.
      const renamed = await q(
        `update public.learner_profiles set display_name = 'Renamed Kid'
          where id = $1 returning id`, [kidId]);
      assert(renamed.rows.length === 1, 'the owner could not rename their child');

      // But not turn them into an adult profile attached to another account, which
      // would hand that child's progress and certificates to somebody else.
    });

    await asUser(parent.userId, async () => {
      await rejects(() => q(
        `update public.learner_profiles
            set learner_type = 'adult', linked_user_id = $2
          where id = $1`, [kidId, grandma.userId]),
      /cannot change how it is linked/);
    });

    await asUser(parent.userId, async () => {
      await rejects(() => q(
        `update public.learner_profiles set family_id = null where id = $1`, [kidId]),
      /cannot change how it is linked/);
    });
  });

  await test('the summary a parent sees counts only the pinned version', async () => {
    const s = (await q(
      'select * from public.enrolment_progress_summary($1)', [enrolmentId])).rows[0];
    assert(Number(s.lessons_total) === 1, `lessons_total was ${s.lessons_total}`);
    assert(Number(s.lessons_done) === 1, `lessons_done was ${s.lessons_done}`);
    assert(Number(s.percent_complete) === 100, `percent_complete was ${s.percent_complete}`);
  });
}
