// Progress and completion.
//
// The invariants that matter here are mostly about *which version* progress
// belongs to. D5 pins an enrolment to a course version; progress is recorded
// against that pin, so publishing v2 must neither invalidate v1 progress nor
// let a client record progress against the wrong version's lesson.
//
// The rest are the internal-consistency constraints: a completed lesson is at
// 100 percent and has a timestamp, and the two always agree. A progress bar
// that disagrees with a completion report is worse than either being wrong.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('prog-admin@example.com');
  const teacher  = await newInstructor('prog-teacher@example.com', admin);
  const reviewer = await newReviewer('prog-reviewer@example.com', admin);

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const setVersion = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, 'progress']);

  async function adult(email, name) {
    const userId = await newUser(email);
    await newProfile(userId, name ?? email);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [name ?? email, userId])).rows[0].id;
    return { userId, learnerId };
  }

  async function publish(course, version, { lessons = 3 } = {}) {
    const section = await newSection(version);
    const ids = [];
    for (let i = 1; i <= lessons; i++) ids.push(await newLesson(section, { position: i }));
    await setVersion(version, 'submitted', teacher);
    await setVersion(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await setVersion(version, 'published', admin);
    return { section, lessons: ids };
  }

  const completeLesson = (enrolmentId, lessonId) =>
    q(`insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
       values ($1, $2, 'completed', 100, now(), now()) returning id`,
      [enrolmentId, lessonId]);

  // -------------------------------------------------------------------
  // Fixtures
  // -------------------------------------------------------------------
  const course  = await newCourse(teacher, { status: 'active' });
  const v1      = await newVersion(course, teacher);
  const built1  = await publish(course, v1, { lessons: 3 });

  const learner = await adult('prog-learner@example.com', 'Progress Learner');
  const enrolmentId = await committed(async () =>
    (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1, $2, $3, 'free', 'active') returning id`,
      [learner.learnerId, course, v1])).rows[0].id);

  const stranger = await adult('prog-stranger@example.com', 'Stranger');

  // -------------------------------------------------------------------
  // Recording progress
  // -------------------------------------------------------------------
  await test('a learner records progress on their own pinned version', async () => {
    // The write itself is checked under RLS; the row is then committed, because
    // asUser rolls back and five later assertions need this row to exist.
    await asUser(learner.userId, async () => {
      const r = await completeLesson(enrolmentId, built1.lessons[0]);
      assert(r.rows.length === 1, 'a learner could not complete a lesson');
    });
    await committed(async () => {
      await completeLesson(enrolmentId, built1.lessons[0]);
    });

    const n = await count(
      `select 1 from public.lesson_progress
        where course_enrolment_id = $1 and status = 'completed'`, [enrolmentId]);
    assert(n === 1, `expected 1 completed lesson, found ${n}`);
  });

  await test('a completed lesson must be at 100 percent', async () => {
    await rejects(() => q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
       values ($1, $2, 'completed', 99.5, now(), now())`,
      [enrolmentId, built1.lessons[1]]),
      'a lesson was marked complete at 99.5%');
  });

  await test('completion and its timestamp must agree', async () => {
    await rejects(() => q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, started_at)
       values ($1, $2, 'completed', 100, now())`,
      [enrolmentId, built1.lessons[1]]),
      "status 'completed' was accepted with no completed_at");

    await rejects(() => q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
       values ($1, $2, 'in_progress', 50, now(), now())`,
      [enrolmentId, built1.lessons[1]]),
      "status 'in_progress' was accepted with a completed_at");
  });

  await test('a lesson cannot be completed before it started', async () => {
    await rejects(() => q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
       values ($1, $2, 'completed', 100, now(), now() - interval '1 hour')`,
      [enrolmentId, built1.lessons[1]]),
      'a lesson was completed before it started');
  });

  // -------------------------------------------------------------------
  // The version pin — the invariant that actually matters
  // -------------------------------------------------------------------
  await test('progress against another version\'s lesson is refused', async () => {
    // Publish a second version of the same course. Publishing auto-retires v1.
    // course_versions_number_key is unique per course, so the second version
    // has to declare its number rather than take the default.
    const v2 = await newVersion(course, teacher, { version_number: 2 });
    const built2 = await publish(course, v2, { lessons: 2 });

    await rejects(() => completeLesson(enrolmentId, built2.lessons[0]),
      'progress was recorded against a lesson from a different version');

    const leaked = await count(
      `select 1 from public.lesson_progress
        where course_enrolment_id = $1 and lesson_id = $2`,
      [enrolmentId, built2.lessons[0]]);
    assert(leaked === 0, 'the refused progress row was written anyway');
  });

  await test('D5: publishing v2 does not disturb v1 progress', async () => {
    const kept = await count(
      `select 1 from public.lesson_progress
        where course_enrolment_id = $1 and status = 'completed'`, [enrolmentId]);
    assert(kept === 1,
      `publishing a new version disturbed existing progress (${kept} completed rows left)`);

    // And the enrolment is still pinned to v1.
    const pinned = (await q(
      'select course_version_id v from public.course_enrolments where id = $1',
      [enrolmentId])).rows[0].v;
    assert(pinned === v1, 'the enrolment was silently moved to the new version');
  });

  await test('the summary counts the pinned version only', async () => {
    const s = (await q(
      'select * from public.enrolment_progress_summary($1)', [enrolmentId])).rows[0];

    assert(Number(s.lessons_total) === 3,
      `summary counted ${s.lessons_total} lessons; v1 has 3 and v2 has 2`);
    assert(Number(s.lessons_done) === 1,
      `summary counted ${s.lessons_done} done; expected 1`);
    assert(Number(s.percent_complete) === Number((100 / 3).toFixed(2)),
      `percent_complete was ${s.percent_complete}`);
  });

  // -------------------------------------------------------------------
  // Cross-learner isolation
  // -------------------------------------------------------------------
  await test('a stranger cannot write progress into someone else\'s enrolment', async () => {
    await asUser(stranger.userId, async () => {
      await rejects(() => completeLesson(enrolmentId, built1.lessons[2]),
        'a stranger wrote progress into another learner\'s enrolment');
    });

    const n = await count(
      `select 1 from public.lesson_progress
        where course_enrolment_id = $1 and lesson_id = $2`,
      [enrolmentId, built1.lessons[2]]);
    assert(n === 0, 'the stranger\'s progress row was written anyway');
  });

  await test('a stranger cannot read someone else\'s progress', async () => {
    await asUser(stranger.userId, async () => {
      const visible = await count(
        'select 1 from public.lesson_progress where course_enrolment_id = $1', [enrolmentId]);
      assert(visible === 0, `a stranger read ${visible} progress rows`);
    });
  });

  // -------------------------------------------------------------------
  // Completion evaluation
  // -------------------------------------------------------------------
  await test('evaluate_completion reports what is still blocking', async () => {
    await committed(async () => {
      // ccp_certificate_needs_template: a certificate needs a template version.
      await q(`insert into public.course_completion_policies
                 (course_version_id, completion_mode, certificate_enabled,
                  certificate_template_version)
               values ($1, 'all_lessons', true, 'v1')`, [v1]);
    });

    const before = (await q(
      'select * from public.evaluate_completion($1)', [enrolmentId])).rows[0];
    assert(before.is_complete === false, 'an unfinished course evaluated as complete');
    assert(Number(before.percent_complete) > 0, 'percent_complete did not reflect progress');
    assert(Array.isArray(before.blocking), 'blocking was not an array');
    assert(before.blocking.length > 0, 'an incomplete course reported nothing blocking');

    // Finish the remaining two lessons.
    await committed(async () => {
      await completeLesson(enrolmentId, built1.lessons[1]);
      await completeLesson(enrolmentId, built1.lessons[2]);
    });

    const after = (await q(
      'select * from public.evaluate_completion($1)', [enrolmentId])).rows[0];
    assert(after.is_complete === true,
      `a fully completed course was not complete; blocking: ${after.blocking}`);
    assert(Number(after.percent_complete) === 100,
      `percent_complete was ${after.percent_complete}`);
    assert(after.blocking.length === 0,
      `a complete course still reported blocking: ${after.blocking}`);
  });

  await test('completion is evaluated, not stored — nothing marks the enrolment', async () => {
    // There is deliberately no course_completions table. Completion is derived
    // from recorded facts each time, so it cannot drift out of sync with
    // progress. This test pins that: the enrolment row is not the record.
    const status = (await q(
      'select status from public.course_enrolments where id = $1', [enrolmentId])).rows[0].status;
    assert(status === 'active',
      `completing every lesson flipped the enrolment to '${status}'`);

    const stillThere = (await q(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_name = 'course_completions'`)).rows.length;
    assert(stillThere === 0,
      'a course_completions table appeared; completion is meant to be derived');
  });
}
