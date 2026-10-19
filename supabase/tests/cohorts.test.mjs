// Cohorts: a dated group taking a published course together.
//
// The rules worth pinning are the ones that decide who a class belongs to, who
// can be in it, and — the one that would be quietly harmful if it were wrong —
// who can see the names of the children in it.

export async function run(ctx) {
  const {
    q, test, assert, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('cohorts-admin@example.com');
  const teacher = await newInstructor('cohorts-teacher@example.com', admin);
  const otherTeacher = await newInstructor('cohorts-other@example.com', admin);
  const reviewer = await newReviewer('cohorts-reviewer@example.com', admin);

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'cohorts test']);

  /** A published, free course with one lesson. */
  async function publishedCourse(author = teacher) {
    const course = await newCourse(author, { status: 'active' });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);
    await transition(version, 'submitted', author);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version };
  }

  let seq = 0;
  /** An adult account with its own learner profile, enrolled if asked. */
  async function learner(name = 'Learner', enrolIn = null) {
    seq += 1;
    const userId = await newUser(`cohorts-${seq}@example.com`);
    await newProfile(userId, `${name} ${seq}`);
    const learnerId = await committed(async () => {
      const id = (await q(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [`${name} ${seq}`, userId])).rows[0].id;
      if (enrolIn) {
        await q(
          `insert into public.course_enrolments
             (learner_profile_id, course_id, course_version_id, source, status)
           values ($1,$2,$3,'free','active')`, [id, enrolIn.course, enrolIn.version]);
      }
      return id;
    });
    return { userId, learnerId };
  }

  /** A parent account with a child learner profile in its family. */
  async function parentWithChild(enrolIn = null) {
    seq += 1;
    const userId = await newUser(`cohorts-parent-${seq}@example.com`);
    await newProfile(userId, `Parent ${seq}`);
    const childId = await committed(async () => {
      const fam = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, [`Family ${seq}`, userId])).rows[0].id;
      await q(
        `insert into public.family_memberships
           (family_id, user_id, membership_type, status, joined_at, created_by)
         values ($1,$2,'owner','active',now(),$3)`, [fam, userId, userId]);
      const child = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','8-10',$2,'active') returning id`, [`Child ${seq}`, fam])).rows[0].id;
      if (enrolIn) {
        await q(
          `insert into public.course_enrolments
             (learner_profile_id, course_id, course_version_id, source, status)
           values ($1,$2,$3,'free','active')`, [child, enrolIn.course, enrolIn.version]);
      }
      return child;
    });
    return { userId, childId };
  }

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await q(sql, params); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  /** Expect a refusal, for the reason claimed, without poisoning the session. */
  async function refused(who, sql, params, pattern) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [who === null ? '' : JSON.stringify({ sub: who, role: 'authenticated' })]);
    await q('set local role authenticated');
    await q('savepoint expected_refusal');
    let caught;
    try { await q(sql, params); } catch (e) { caught = e; }
    await q('rollback to savepoint expected_refusal');
    await q('rollback');
    assert(caught, `expected a refusal matching ${pattern}`);
    const text = String(caught.message ?? caught);
    assert(pattern.test(text),
      `refused, but not for the reason asserted: expected ${pattern}, got: ${text.slice(0, 200)}`);
  }

  const SQL_CREATE = `select public.create_cohort($1,$2,$3,$4, now() + interval '2 days',
                        now() + interval '30 days', $5) as id`;
  const SQL_STATUS = 'select public.set_cohort_status($1,$2)';
  const SQL_JOIN = 'select public.join_cohort($1,$2) as id';
  const SQL_LEAVE = 'select public.leave_cohort($1,$2)';

  const create = (who, course, version, title, capacity = null) =>
    asActor(who, SQL_CREATE, [course, version, title, null, capacity]);
  const { course, version } = await publishedCourse();

  // -------------------------------------------------------------------
  await test('cohorts are off by default and refuse to be created', async () => {
    assert((await q("select value_text from public.platform_settings where key='learning.cohorts'")).rows[0].value_text === 'false');
    await refused(teacher, SQL_CREATE, [course, version, 'Ramadan cohort', null, null],
      /not enabled/i);
    assert((await q('select count(*)::int n from public.cohorts')).rows[0].n === 0);
  });

  await q("update public.platform_settings set value_text='true' where key='learning.cohorts'");
  let cohort;
  try {
    await test('the course author opens a cohort, and it starts as a draft', async () => {
      cohort = (await create(teacher, course, version, 'Ramadan cohort', 12)).rows[0].id;
      const row = (await q('select status, created_by, capacity from public.cohorts where id=$1', [cohort])).rows[0];
      assert(row.status === 'draft');
      assert(row.created_by === teacher);
      assert(row.capacity === 12);
    });

    await test('direct authenticated writes cannot bypass the cohort functions', async () => {
      await refused(teacher,
        `insert into public.cohorts (course_id,course_version_id,title,created_by,starts_at)
         values ($1,$2,'Forged cohort',$3,now() + interval '2 days')`,
        [course, version, teacher], /permission denied/i);
      await refused(teacher,
        `insert into public.cohort_members (cohort_id,learner_profile_id,added_by)
         values ($1,$2,$3)`,
        [crypto.randomUUID(), crypto.randomUUID(), teacher], /permission denied/i);
    });

    await test('another teacher cannot open a cohort for someone else’s course', async () => {
      await refused(otherTeacher, SQL_CREATE, [course, version, 'Rival cohort', null, null],
        /only the course author/i);
    });

    await test('a cohort needs a published version of that course', async () => {
      const draftVersion = await newVersion(course, teacher, { version_number: 2 });
      await refused(teacher, SQL_CREATE, [course, draftVersion, 'Too early', null, null],
        /published course version/i);

      const other = await publishedCourse(otherTeacher);
      await refused(teacher, SQL_CREATE, [course, other.version, 'Wrong course', null, null],
        /course version not found/i);
    });

    await test('a cohort and its members stay pinned to one exact course version', async () => {
      const edition = await publishedCourse();
      const oldClass = (await create(teacher, edition.course, edition.version, 'Old edition class')).rows[0].id;
      await asActor(teacher, SQL_STATUS, [oldClass, 'open']);
      const oldLearner = await learner('Old edition learner', edition);

      const newer = await newVersion(edition.course, teacher, { version_number: 2 });
      const newerSection = await newSection(newer);
      await newLesson(newerSection);
      await transition(edition.version, 'retired', admin);
      await transition(newer, 'submitted', teacher);
      await transition(newer, 'approved', reviewer);
      await satisfyReview(newer, reviewer, admin);
      await transition(newer, 'published', admin);

      const newLearner = await learner('New edition learner', { course: edition.course, version: newer });
      await refused(newLearner.userId, SQL_JOIN, [oldClass, newLearner.learnerId],
        /enrolled in this course version first/i);
      await asActor(oldLearner.userId, SQL_JOIN, [oldClass, oldLearner.learnerId]);
    });

    await test('the dates have to make sense', async () => {
      await refused(teacher,
        `select public.create_cohort($1,$2,$3,$4, now() - interval '1 day', null, null)`,
        [course, version, 'Already started', null], /must start now or later/i);
      await refused(teacher,
        `select public.create_cohort($1,$2,$3,$4, now() + interval '5 days', now() + interval '1 day', null)`,
        [course, version, 'Ends first', null], /must end after it starts/i);
      await refused(teacher, SQL_CREATE, [course, version, 'No room', null, 0],
        /capacity must be at least one/i);
    });

    await test('a draft cohort opens, and only forwards', async () => {
      await asActor(teacher, SQL_STATUS, [cohort, 'open']);
      assert((await q('select status from public.cohorts where id=$1', [cohort])).rows[0].status === 'open');

      await refused(teacher, SQL_STATUS, [cohort, 'draft'], /cannot move from open to draft/i);

      await asActor(teacher, SQL_STATUS, [cohort, 'closed']);
      await refused(teacher, SQL_STATUS, [cohort, 'open'], /cannot move from closed to open/i);
    });

    await test('a draft cohort cannot open after its course version is retired', async () => {
      const edition = await publishedCourse();
      const stale = (await create(teacher, edition.course, edition.version, 'Retired edition')).rows[0].id;
      await transition(edition.version, 'retired', admin);
      await refused(teacher, SQL_STATUS, [stale, 'open'],
        /active course and a published course version/i);
    });

    await test('a cohort whose start date has passed cannot be opened', async () => {
      const late = (await create(teacher, course, version, 'Late start')).rows[0].id;
      await q("update public.cohorts set starts_at = now() - interval '1 hour' where id=$1", [late]);
      await refused(teacher, SQL_STATUS, [late, 'open'], /due to start already/i);
    });

    await test('only the teacher who opened it can change it', async () => {
      const stranger = await learner('Stranger', { course, version });
      await refused(stranger.userId, SQL_STATUS, [cohort, 'cancelled'], /only the teacher/i);
    });

    // A closed cohort was left closed above; open a fresh one for the join tests.
    let open;
    let raised;
    open = (await create(teacher, course, version, 'Open class', 2)).rows[0].id;
    await asActor(teacher, SQL_STATUS, [open, 'open']);

    await test('a learner must be enrolled in the course to join', async () => {
      const outsider = await learner('Outsider');
      await refused(outsider.userId, SQL_JOIN, [open, outsider.learnerId],
        /must be enrolled in this course version first/i);
    });

    await test('an enrolled learner joins an open cohort', async () => {
      const one = await learner('First', { course, version });
      const memberId = (await asActor(one.userId, SQL_JOIN, [open, one.learnerId])).rows[0].id;
      const row = (await q('select status, added_by from public.cohort_members where id=$1', [memberId])).rows[0];
      assert(row.status === 'active');
      assert(row.added_by === one.userId, 'the joiner was not recorded as the person who joined');

      await refused(one.userId, SQL_JOIN, [open, one.learnerId], /already in the cohort/i);
    });

    await test('a parent joins a child, and a stranger cannot', async () => {
      const family = await parentWithChild({ course, version });
      await asActor(family.userId, SQL_JOIN, [open, family.childId]);
      assert((await q(
        'select count(*)::int n from public.cohort_members where cohort_id=$1 and learner_profile_id=$2 and status=$3',
        [open, family.childId, 'active'])).rows[0].n === 1);

      const stranger = await learner('Stranger2', { course, version });
      await refused(stranger.userId, SQL_JOIN, [open, family.childId],
        /a learner you are responsible for/i);
    });

    await test('capacity is enforced, and the course author cannot enrol a learner for them', async () => {
      // Two places, both now taken by the tests above.
      const third = await learner('Third', { course, version });
      await refused(third.userId, SQL_JOIN, [open, third.learnerId], /cohort is full/i);

      // The class remains full for a learner with a valid course enrolment.
      // The author has a separate test below: they cannot silently add them.
      raised = (await create(teacher, course, version, 'Open class with room', 5)).rows[0].id;
      await asActor(teacher, SQL_STATUS, [raised, 'open']);
      await refused(teacher, SQL_JOIN, [raised, third.learnerId],
        /only join a learner you are responsible for/i);
      await asActor(third.userId, SQL_JOIN, [raised, third.learnerId]);
    });

    await test('a draft or closed cohort takes no joiners', async () => {
      const draftCohort = (await create(teacher, course, version, 'Still a draft')).rows[0].id;
      const joiner = await learner('Joiner', { course, version });
      await refused(joiner.userId, SQL_JOIN, [draftCohort, joiner.learnerId], /not open to joiners/i);

      await asActor(teacher, SQL_STATUS, [draftCohort, 'open']);
      await asActor(teacher, SQL_STATUS, [draftCohort, 'closed']);
      await refused(joiner.userId, SQL_JOIN, [draftCohort, joiner.learnerId], /not open to joiners/i);
    });

    await test('leaving keeps the record, and rejoining is allowed', async () => {
      const one = await learner('Leaver', { course, version });
      await asActor(one.userId, SQL_JOIN, [raised, one.learnerId]);
      await asActor(one.userId, SQL_LEAVE, [raised, one.learnerId]);

      const rows = (await q(
        'select status, left_by from public.cohort_members where cohort_id=$1 and learner_profile_id=$2 order by joined_at',
        [raised, one.learnerId])).rows;
      assert(rows.length === 1 && rows[0].status === 'left', 'leaving deleted the membership');
      assert(rows[0].left_by === one.userId);

      await asActor(one.userId, SQL_JOIN, [raised, one.learnerId]);
      assert((await q(
        `select count(*)::int n from public.cohort_members
          where cohort_id=$1 and learner_profile_id=$2 and status='active'`,
        [raised, one.learnerId])).rows[0].n === 1);

      const stranger = await learner('Leaver-stranger', { course, version });
      await refused(stranger.userId, SQL_LEAVE, [raised, one.learnerId],
        /learner you are responsible for/i);
    });

    await test('a learner cannot see the roster; the teacher can', async () => {
      const second = await learner('Second', { course, version });
      await asActor(second.userId, SQL_JOIN, [raised, second.learnerId]);

      const seenByLearner = await asActor(second.userId,
        'select learner_profile_id from public.cohort_members where cohort_id=$1', [raised]);
      assert(seenByLearner.rows.length === 1,
        `a learner saw ${seenByLearner.rows.length} roster rows, expected only their own`);
      assert(seenByLearner.rows[0].learner_profile_id === second.learnerId);

      const seenByTeacher = await asActor(teacher,
        'select learner_profile_id from public.cohort_members where cohort_id=$1', [raised]);
      assert(seenByTeacher.rows.length >= 2,
        `the teacher saw ${seenByTeacher.rows.length} roster rows`);
    });

    await test('a parent sees their own child on the roster and nobody else’s', async () => {
      const family = await parentWithChild({ course, version });
      const otherFamily = await parentWithChild({ course, version });
      await asActor(family.userId, SQL_JOIN, [raised, family.childId]);
      await asActor(otherFamily.userId, SQL_JOIN, [raised, otherFamily.childId]);

      const seen = await asActor(family.userId,
        'select learner_profile_id from public.cohort_members where cohort_id=$1', [raised]);
      assert(seen.rows.length === 1, `a parent saw ${seen.rows.length} children, expected 1`);
      assert(seen.rows[0].learner_profile_id === family.childId);

      const bystander = await learner('Count-only bystander');
      const count = await asActor(bystander.userId,
        'select public.cohort_member_count($1) as n', [raised]);
      assert(count.rows[0].n === 5,
        'the cohort-size helper must reveal a count but not the roster');
    });

    await test('an open cohort is visible to any signed-in learner, a draft is not', async () => {
      const bystander = await learner('Bystander');
      const visible = await asActor(bystander.userId, 'select id from public.cohorts where id=$1', [raised]);
      assert(visible.rows.length === 1, 'an open cohort was hidden from a signed-in learner');

      const hidden = (await create(teacher, course, version, 'Unannounced')).rows[0].id;
      const unseen = await asActor(bystander.userId, 'select id from public.cohorts where id=$1', [hidden]);
      assert(unseen.rows.length === 0, 'a draft cohort was visible to a stranger');

      const seenByTeacher = await asActor(teacher, 'select id from public.cohorts where id=$1', [hidden]);
      assert(seenByTeacher.rows.length === 1, 'the teacher could not see their own draft');
    });

    await test('every act is audited', async () => {
      const events = (await q(
        `select action from public.governance_audit_events
          where target_type in ('cohort','cohort_member') order by occurred_at`)).rows.map((r) => r.action);
      for (const expected of ['cohort.created', 'cohort.open', 'cohort.joined', 'cohort.left']) {
        assert(events.includes(expected), `no audit event for ${expected}`);
      }
    });
  } finally {
    await q("update public.platform_settings set value_text='false' where key='learning.cohorts'");
  }

  // -------------------------------------------------------------------
  await test('turning cohorts off does not trap anyone in a class', async () => {
    const stuck = await learner('Stuck', { course, version });
    await q("update public.platform_settings set value_text='true' where key='learning.cohorts'");
    const id = (await create(teacher, course, version, 'Trapped class')).rows[0].id;
    const draft = (await create(teacher, course, version, 'Still a draft')).rows[0].id;
    await asActor(teacher, SQL_STATUS, [id, 'open']);
    await asActor(stuck.userId, SQL_JOIN, [id, stuck.learnerId]);
    await q("update public.platform_settings set value_text='false' where key='learning.cohorts'");

    await refused(stuck.userId, SQL_JOIN, [id, stuck.learnerId], /not enabled/i);
    const bystander = await learner('Flag-off bystander');
    const hidden = await asActor(bystander.userId,
      'select id from public.cohorts where id=$1', [id]);
    assert(hidden.rows.length === 0, 'an off feature still advertised its open cohort');
    const visibleToMember = await asActor(stuck.userId,
      'select id from public.cohorts where id=$1', [id]);
    assert(visibleToMember.rows.length === 1, 'turning the flag off hid a class from an existing member');
    await refused(teacher, SQL_STATUS, [draft, 'open'], /not enabled/i);
    // Staff may still close a class that was already open; turning the feature
    // off must not take the teacher's cleanup controls away.
    await asActor(teacher, SQL_STATUS, [id, 'closed']);
    await asActor(stuck.userId, SQL_LEAVE, [id, stuck.learnerId]);
    assert((await q(
      `select count(*)::int n from public.cohort_members
        where cohort_id=$1 and learner_profile_id=$2 and status='active'`,
      [id, stuck.learnerId])).rows[0].n === 0, 'a learner could not leave once the flag was off');
  });
}
