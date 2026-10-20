// Cohort-scoped learner analytics: what a teacher may see about a learner.
//
// The decision (DECISIONS.md, 2026-10-19) is per-learner progress inside an
// opted-in cohort only. The tests that matter most here are the negative ones: a
// self-paced learner staying invisible, a learner who left a class stopping being
// watched, a teacher who did not author the version seeing nothing, a version pin
// that does not leak into the edition it does not teach, and a roster that carries
// a child's name but not the family that child belongs to.
//
// A widening of a read policy is the kind of change that is easy to get slightly
// wrong and impossible to notice afterwards, because nothing fails — somebody just
// sees a row they should not.

export async function run(ctx) {
  const {
    q, test, assert, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('analytics-admin@example.com');
  const teacher = await newInstructor('analytics-teacher@example.com', admin);
  const outsider = await newInstructor('analytics-outsider@example.com', admin);
  const reviewer = await newReviewer('analytics-reviewer@example.com', admin);

  const ANALYTICS = 'delivery.analytics';
  const COHORTS = 'learning.cohorts';

  /** `delivery.analytics` is CODE-gated: only a deploy-shaped update may flip it. */
  async function setFlag(key, value) {
    await committed(async () => {
      await q("set local app.bypassing_code_flag = 'on'");
      await q('update public.platform_settings set value_text=$1 where key=$2', [value, key]);
    });
  }

  const flagValue = async (key) =>
    (await q('select value_text v from public.platform_settings where key=$1', [key])).rows[0].v;

  /** A signed-in call that commits, because cohorts are written by people. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [actor === null ? '' : JSON.stringify({ sub: actor, role: 'authenticated' })]);
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
      `refused, but not for the reason asserted: expected ${pattern}, got ${text.slice(0, 200)}`);
  }

  /** Rows a caller can actually see, which is the only answer that matters. */
  const visibleEnrolments = (who, learnerId) =>
    asActor(who,
      `select id from public.course_enrolments
        where learner_profile_id = $1 and deleted_at is null`, [learnerId])
      .then((r) => r.rows.length);

  const visibleProgress = (who, enrolmentId) =>
    asActor(who,
      'select id from public.lesson_progress where course_enrolment_id = $1', [enrolmentId])
      .then((r) => r.rows.length);

  const roster = (who, cohortId) =>
    asActor(who, 'select * from public.cohort_learner_progress($1)', [cohortId])
      .then((r) => r.rows);

  const names = (rows) => rows.map((r) => r.display_name).sort();

  // Both flags on before anything is built: opening a cohort is itself refused
  // while `learning.cohorts` is off, and the gating is tested separately below.
  await setFlag(COHORTS, 'true');
  await setFlag(ANALYTICS, 'true');

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'learner analytics test']);

  async function publish(version) {
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return version;
  }

  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lessonA = await newLesson(section, { title: 'First lesson', position: 1 });
  const lessonB = await newLesson(section, { title: 'Second lesson', position: 2 });
  const lessonC = await newLesson(section, { title: 'Third lesson', position: 3 });
  await publish(version);

  let seq = 0;

  /** An adult account with its own learner profile, enrolled in the version. */
  async function adult(name) {
    seq += 1;
    const display = `${name} ${seq}`;
    const userId = await newUser(`analytics-${seq}@example.com`);
    await newProfile(userId, display);
    const learnerId = await committed(async () => {
      const id = (await q(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [display, userId])).rows[0].id;
      await q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [id, course, version]);
      return id;
    });
    const enrolmentId = (await q(
      'select id from public.course_enrolments where learner_profile_id=$1', [learnerId]
    )).rows[0].id;
    return { userId, learnerId, enrolmentId, name: display };
  }

  /** A child in a family, with the parent account that is responsible for them. */
  async function child() {
    seq += 1;
    const display = `Child ${seq}`;
    const parentId = await newUser(`analytics-parent-${seq}@example.com`);
    await newProfile(parentId, `Parent ${seq}`);
    const childId = await committed(async () => {
      const fam = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, [`Family ${seq}`, parentId])).rows[0].id;
      await q(
        `insert into public.family_memberships
           (family_id, user_id, membership_type, status, joined_at, created_by)
         values ($1,$2,'owner','active',now(),$3)`, [fam, parentId, parentId]);
      const kid = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','8-10',$2,'active') returning id`, [display, fam])).rows[0].id;
      await q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [kid, course, version]);
      return kid;
    });
    const enrolmentId = (await q(
      'select id from public.course_enrolments where learner_profile_id=$1', [childId]
    )).rows[0].id;
    return { parentId, childId, enrolmentId, name: display };
  }

  const member = await adult('Member');
  const selfPaced = await adult('SelfPaced');
  const leaver = await adult('Leaver');
  const kid = await child();

  // Progress: one lesson finished, one started, one never opened.
  await committed(async () => {
    await q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent,
          started_at, completed_at, last_seen_at)
       values ($1,$2,'completed',100,
          now() - interval '3 days', now() - interval '2 days', now() - interval '2 days')`,
      [member.enrolmentId, lessonA]);
    await q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, started_at, last_seen_at)
       values ($1,$2,'in_progress',40, now() - interval '1 day', now() - interval '1 day')`,
      [member.enrolmentId, lessonB]);
    await q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent,
          started_at, completed_at, last_seen_at)
       values ($1,$2,'completed',100,
          now() - interval '5 days', now() - interval '4 days', now() - interval '4 days')`,
      [selfPaced.enrolmentId, lessonA]);
  });

  // A class the teacher opened. Joining is the learner's or guardian's act, never
  // the teacher's, so each of them joins as themselves.
  const cohort = (await asActor(teacher,
    `select public.create_cohort($1,$2,$3,$4, now() + interval '1 day',
        now() + interval '30 days', null, now() + interval '7 days') as id`,
    [course, version, 'Analytics class', null])).rows[0].id;

  await asActor(teacher, 'select public.set_cohort_status($1,$2)', [cohort, 'open']);
  await asActor(member.userId, 'select public.join_cohort($1,$2)', [cohort, member.learnerId]);
  await asActor(kid.parentId, 'select public.join_cohort($1,$2)', [cohort, kid.childId]);
  await asActor(leaver.userId, 'select public.join_cohort($1,$2)', [cohort, leaver.learnerId]);
  await asActor(teacher, 'select public.leave_cohort($1,$2)', [cohort, leaver.learnerId]);

  try {
    // -----------------------------------------------------------------
    console.log('\nEither flag closes it');
    // -----------------------------------------------------------------

    await test('turning analytics off closes the roster and the widened policies', async () => {
      await setFlag(ANALYTICS, 'false');
      try {
        assert((await roster(teacher, cohort)).length === 0,
          'the roster survived turning analytics off');
        assert(await visibleEnrolments(teacher, member.learnerId) === 0,
          'enrolments stayed readable with analytics off');
        assert(await visibleProgress(teacher, member.enrolmentId) === 0,
          'progress stayed readable with analytics off');
        // A learner's sight of their own progress is not a feature flag's business.
        assert(await visibleProgress(member.userId, member.enrolmentId) === 2,
          'turning analytics off cost a learner their own progress');
        assert(await visibleEnrolments(kid.parentId, kid.childId) === 1,
          'turning analytics off cost a parent their child');
      } finally {
        await setFlag(ANALYTICS, 'true');
      }
    });

    await test('turning cohorts off closes it too', async () => {
      await setFlag(COHORTS, 'false');
      try {
        assert((await roster(teacher, cohort)).length === 0,
          'the roster survived turning cohorts off');
        assert(await visibleEnrolments(teacher, member.learnerId) === 0,
          'enrolments stayed readable with cohorts off');
      } finally {
        await setFlag(COHORTS, 'true');
      }
    });

    // -----------------------------------------------------------------
    console.log('\nThe boundary');
    // -----------------------------------------------------------------

    await test('the author sees the roster of a class they opened', async () => {
      const rows = await roster(teacher, cohort);
      assert(rows.length === 2,
        `expected the member and the child, got ${JSON.stringify(names(rows))}`);
      assert(names(rows).includes(member.name), 'a member of the class is missing');
      assert(names(rows).includes(kid.name), 'a child in the class is missing');
    });

    await test('a learner who left the class stops being visible', async () => {
      // The case where continuing to watch somebody's pace would be wrong.
      const rows = await roster(teacher, cohort);
      assert(names(rows).includes(leaver.name) === false,
        'a learner who left is still on the roster');
      assert(await visibleEnrolments(teacher, leaver.learnerId) === 0,
        'the author can still read the enrolment of a learner who left');
      assert(await visibleProgress(teacher, leaver.enrolmentId) === 0,
        'the author can still read the progress of a learner who left');
    });

    await test('a self-paced learner is invisible to the author', async () => {
      // The whole point of the decision: a catalogue purchase is private, and a
      // person's pace is data about them that nobody agreed to share.
      assert(await visibleEnrolments(teacher, selfPaced.learnerId) === 0,
        'the author can read a self-paced learner\'s enrolment');
      assert(await visibleProgress(teacher, selfPaced.enrolmentId) === 0,
        'the author can read a self-paced learner\'s progress');
      assert((await asActor(teacher,
        'select public.can_read_learner_course_progress($1,$2) as ok',
        [selfPaced.learnerId, version])).rows[0].ok === false,
        'the predicate said yes about a self-paced learner');
    });

    await test('the author can read the enrolment and progress of a cohort member', async () => {
      assert(await visibleEnrolments(teacher, member.learnerId) === 1,
        'the author cannot read a cohort member\'s enrolment');
      assert(await visibleProgress(teacher, member.enrolmentId) === 2,
        'the author cannot read a cohort member\'s progress');
      assert(await visibleEnrolments(teacher, kid.childId) === 1,
        'the author cannot read a child in the class');
    });

    await test('a teacher who did not author the version sees nothing', async () => {
      const rows = await roster(outsider, cohort);
      assert(rows.length === 0, `another teacher saw ${rows.length} rows`);
      assert(await visibleEnrolments(outsider, member.learnerId) === 0,
        'another teacher could read a cohort member\'s enrolment');
      assert(await visibleProgress(outsider, member.enrolmentId) === 0,
        'another teacher could read a cohort member\'s progress');
    });

    await test('platform staff can read it, because they can read everything', async () => {
      const rows = await roster(admin, cohort);
      assert(rows.length === 2, `staff saw ${rows.length} rows`);
    });

    await test('the learner and the parent keep the access they already had', async () => {
      // A widening must not be a change for anybody it was not about.
      assert(await visibleEnrolments(member.userId, member.learnerId) === 1,
        'an adult learner lost sight of their own enrolment');
      assert(await visibleProgress(member.userId, member.enrolmentId) === 2,
        'an adult learner lost sight of their own progress');
      assert(await visibleEnrolments(selfPaced.userId, selfPaced.learnerId) === 1,
        'a self-paced learner lost sight of their own enrolment');
      assert(await visibleProgress(selfPaced.userId, selfPaced.enrolmentId) === 1,
        'a self-paced learner lost sight of their own progress');
      assert(await visibleEnrolments(kid.parentId, kid.childId) === 1,
        'a parent lost sight of their child\'s enrolment');
      assert(await visibleProgress(kid.parentId, kid.enrolmentId) === 0,
        'a parent gained progress rows that do not exist');
    });

    await test('an anonymous caller sees nothing at all', async () => {
      assert(await visibleEnrolments(null, member.learnerId) === 0,
        'an anonymous caller read an enrolment');
      const rows = await roster(null, cohort);
      assert(rows.length === 0, 'an anonymous caller reached the roster');
    });

    // -----------------------------------------------------------------
    console.log('\nWhat the roster carries');
    // -----------------------------------------------------------------

    await test('the roster is four columns of a profile, not the row', async () => {
      const rows = await roster(teacher, cohort);
      const columns = Object.keys(rows[0]).sort();
      const expected = [
        'age_band', 'display_name', 'enrolment_id', 'enrolment_status', 'joined_at',
        'last_seen_at', 'learner_profile_id', 'learner_type', 'lessons_completed',
        'lessons_in_progress', 'lessons_in_version',
      ];
      assert(JSON.stringify(columns) === JSON.stringify(expected),
        `the roster returned ${JSON.stringify(columns)}`);
      // family_id would connect a child to a household and linked_user_id to an
      // account. Neither is a teacher's business, and the function cannot return
      // them because it does not select them.
      assert(columns.includes('family_id') === false, 'the roster exposes a family');
      assert(columns.includes('linked_user_id') === false, 'the roster exposes an account link');
    });

    await test('the progress numbers are the ones the rows say', async () => {
      const rows = await roster(teacher, cohort);
      const mine = rows.find((r) => r.display_name === member.name);
      assert(mine, 'the member is not on the roster');
      assert(Number(mine.lessons_completed) === 1, `completed was ${mine.lessons_completed}`);
      assert(Number(mine.lessons_in_progress) === 1,
        `in progress was ${mine.lessons_in_progress}`);
      assert(Number(mine.lessons_in_version) === 3,
        `the version counted ${mine.lessons_in_version} lessons`);
      assert(mine.enrolment_status === 'active', `enrolment status was ${mine.enrolment_status}`);
      assert(mine.learner_type === 'adult', `learner type was ${mine.learner_type}`);
      assert(mine.enrolment_id === member.enrolmentId, 'the enrolment is not the member\'s');
      assert(mine.last_seen_at, 'no last-seen time for a learner who has been seen');
      assert(mine.joined_at, 'no join time for somebody who joined');
    });

    await test('a child who has not started is on the roster with zeroes', async () => {
      const rows = await roster(teacher, cohort);
      const kidRow = rows.find((r) => r.display_name === kid.name);
      assert(kidRow, 'the child is not on the roster');
      assert(Number(kidRow.lessons_completed) === 0, `completed was ${kidRow.lessons_completed}`);
      assert(Number(kidRow.lessons_in_progress) === 0,
        `in progress was ${kidRow.lessons_in_progress}`);
      assert(Number(kidRow.lessons_in_version) === 3,
        `the version counted ${kidRow.lessons_in_version} lessons`);
      assert(kidRow.last_seen_at === null, 'a learner who never started has been "seen"');
      assert(kidRow.learner_type === 'child', `learner type was ${kidRow.learner_type}`);
      assert(kidRow.age_band === '8-10', `age band was ${kidRow.age_band}`);
    });

    await test('a learner who withdrew is still on the roster, with what they did', async () => {
      // Somebody who stopped is the person most worth chasing, so withdrawing from
      // the course must not remove them from the class the teacher is looking at.
      const dropped = await adult('Dropped');
      await asActor(dropped.userId, 'select public.join_cohort($1,$2)', [cohort, dropped.learnerId]);
      await committed(async () => {
        await q(
          `insert into public.lesson_progress
             (course_enrolment_id, lesson_id, status, progress_percent,
              started_at, completed_at, last_seen_at)
           values ($1,$2,'completed',100,
              now() - interval '2 days', now() - interval '1 day', now() - interval '1 day')`,
          [dropped.enrolmentId, lessonA]);
        await q(`update public.course_enrolments set status='withdrawn' where id=$1`,
          [dropped.enrolmentId]);
      });

      const rows = await roster(teacher, cohort);
      const row = rows.find((r) => r.display_name === dropped.name);
      assert(row, 'a learner who withdrew disappeared from the roster');
      assert(row.enrolment_status === 'withdrawn',
        `enrolment status was ${row.enrolment_status}`);
      assert(Number(row.lessons_completed) === 1,
        `what they finished was lost: ${row.lessons_completed}`);
      assert(await visibleEnrolments(teacher, dropped.learnerId) === 1,
        'the author cannot read the enrolment of a member who withdrew');
    });

    // -----------------------------------------------------------------
    console.log('\nThe version pin');
    // -----------------------------------------------------------------

    await test('a cohort pins one version, and so does the visibility', async () => {
      const secondVersion = await newVersion(course, teacher, { version_number: 2 });
      const secondSection = await newSection(secondVersion);
      await newLesson(secondSection);
      await publish(secondVersion);

      // A learner who moved to the new edition: one live enrolment per learner per
      // course, so the old one is withdrawn before the new one exists.
      const mover = await adult('Mover');
      const oldEnrolment = mover.enrolmentId;
      // There is no update policy on course_enrolments — only re_pin_enrolment()
      // and issue_certificate() write it — so a fixture changes status as
      // superuser, which is the same privilege the fulfilment path uses.
      await committed(async () => {
        await q(`update public.course_enrolments set status='withdrawn' where id=$1`,
          [oldEnrolment]);
      });
      const newEnrolment = (await committed(async () => {
        const id = (await q(
          `insert into public.course_enrolments
             (learner_profile_id, course_id, course_version_id, source, status)
           values ($1,$2,$3,'free','active') returning id`,
          [mover.learnerId, course, secondVersion])).rows[0].id;
        return id;
      }));

      const secondCohort = (await asActor(teacher,
        `select public.create_cohort($1,$2,$3,$4, now() + interval '1 day',
            now() + interval '30 days', null, now() + interval '7 days') as id`,
        [course, secondVersion, 'Second edition class', null])).rows[0].id;
      await asActor(teacher, 'select public.set_cohort_status($1,$2)', [secondCohort, 'open']);
      await asActor(mover.userId, 'select public.join_cohort($1,$2)',
        [secondCohort, mover.learnerId]);

      // Only the enrolment in the pinned edition is readable, even though both
      // enrolment rows still exist.
      assert(await visibleEnrolments(teacher, mover.learnerId) === 1,
        'the author can read both editions of a learner who is in one class');
      const readable = await asActor(teacher,
        `select course_version_id from public.course_enrolments
          where learner_profile_id = $1 and deleted_at is null`, [mover.learnerId]);
      assert(readable.rows[0].course_version_id === secondVersion,
        'the readable enrolment is not the one the class pins');
      assert(await visibleProgress(teacher, oldEnrolment) === 0,
        'progress in the unpinned edition is readable');

      const secondRows = await roster(teacher, secondCohort);
      assert(secondRows.length === 1,
        `the second class returned ${secondRows.length} rows`);
      assert(Number(secondRows[0].lessons_in_version) === 1,
        `the second edition counted ${secondRows[0].lessons_in_version} lessons`);

      const firstRows = await roster(teacher, cohort);
      assert(names(firstRows).includes(mover.name) === false,
        'a learner appeared under a class pinning an edition they are not in');
      assert(newEnrolment, 'no enrolment was created in the second edition');
    });

    // -----------------------------------------------------------------
    console.log('\nRead only');
    // -----------------------------------------------------------------

    await test('the author may read progress and may not write it', async () => {
      const before = (await q(
        `select progress_percent from public.lesson_progress
          where course_enrolment_id=$1 and lesson_id=$2`,
        [member.enrolmentId, lessonB])).rows[0].progress_percent;

      // No update policy matches, so this changes zero rows rather than raising.
      await asActor(teacher,
        `update public.lesson_progress set progress_percent = 99
          where course_enrolment_id = $1`, [member.enrolmentId]);

      const after = (await q(
        `select progress_percent from public.lesson_progress
          where course_enrolment_id=$1 and lesson_id=$2`,
        [member.enrolmentId, lessonB])).rows[0].progress_percent;
      assert(String(after) === String(before),
        `a teacher changed a learner's progress from ${before} to ${after}`);

      // Writing is refused outright, not silently dropped: there is no insert
      // policy a teacher matches, and there never was one to widen.
      await refused(teacher,
        `insert into public.lesson_progress
           (course_enrolment_id, lesson_id, status, progress_percent)
         values ($1,$2,'in_progress',10)`,
        [member.enrolmentId, lessonC], /row-level security/i);

      const inserted = (await q(
        `select count(*)::integer n from public.lesson_progress
          where course_enrolment_id=$1`, [member.enrolmentId])).rows[0].n;
      assert(inserted === 2, `a teacher wrote progress: ${inserted} rows now`);
    });

    await test('the predicate refuses a null rather than answering yes', async () => {
      const a = (await asActor(teacher,
        'select public.can_read_learner_course_progress(null,$1) as ok', [version])).rows[0].ok;
      const b = (await asActor(teacher,
        'select public.can_read_learner_course_progress($1,null) as ok',
        [member.learnerId])).rows[0].ok;
      assert(a === false && b === false, 'a null argument was treated as a match');

      const yes = (await asActor(teacher,
        'select public.can_read_learner_course_progress($1,$2) as ok',
        [member.learnerId, version])).rows[0].ok;
      assert(yes === true, 'the author cannot read a cohort member\'s progress');
    });

    await test('the roster is callable by a signed-in person and by nobody else', async () => {
      const allowed = (await q(
        `select has_function_privilege('authenticated',
           'public.cohort_learner_progress(uuid)','EXECUTE') as ok`)).rows[0].ok;
      assert(allowed === true, 'authenticated lost execute on the roster function');
      for (const role of ['public', 'anon']) {
        const no = (await q(
          `select has_function_privilege($1,
             'public.cohort_learner_progress(uuid)','EXECUTE') as ok`, [role])).rows[0].ok;
        assert(no === false, `${role} can execute the roster function`);
      }
      const predicate = (await q(
        `select has_function_privilege('authenticated',
           'public.can_read_learner_course_progress(uuid,uuid)','EXECUTE') as ok`)).rows[0].ok;
      assert(predicate === true, 'authenticated lost execute on the predicate');
    });

    await test('a cohort the caller does not manage returns nothing', async () => {
      // `can_manage_cohort()` already answers this; the roster asks it rather than
      // restating it, so the two cannot drift apart.
      const rows = await roster(member.userId, cohort);
      assert(rows.length === 0, `a learner saw ${rows.length} rows of the roster`);
    });
  } finally {
    // Everything ships off, and the "nothing was released by accident" test in
    // flags.test.mjs depends on this suite putting both flags back.
    await setFlag(ANALYTICS, 'false');
    await setFlag(COHORTS, 'false');
    assert(await flagValue(ANALYTICS) === 'false', 'delivery.analytics was left on');
    assert(await flagValue(COHORTS) === 'false', 'learning.cohorts was left on');
  }
}
