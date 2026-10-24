// Where the learner stopped.
//
// `last_video_position` has existed since the first progress migration and has
// never been written, so every player in the product starts at zero. This suite
// is about the writer that fixes it: who may write one, what it may not do, and
// the three ways a position row could lie.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson, newUser, newProfile,
  } = ctx;

  const admin = await bootstrapAdmin('resume-admin@example.com');
  const teacher = await newInstructor('resume-teacher@example.com', admin);
  const reviewer = await newReviewer('resume-reviewer@example.com', admin);

  const setVersion = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, 'resume test']);

  async function adult(email, name) {
    const userId = await newUser(email);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [name, userId])).rows[0].id;
    return { userId, learnerId };
  }

  async function publish(version, { lessons = 3 } = {}) {
    const section = await newSection(version);
    const ids = [];
    for (let i = 1; i <= lessons; i++) ids.push(await newLesson(section, { position: i }));
    await setVersion(version, 'submitted', teacher);
    await setVersion(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await setVersion(version, 'published', admin);
    return { section, lessons: ids };
  }

  const course = await newCourse(teacher, { status: 'active' });
  const v1 = await newVersion(course, teacher);
  const built = await publish(v1, { lessons: 3 });

  const learner = await adult('resume-learner@example.com', 'Resume Learner');
  const enrolmentId = await committed(async () =>
    (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1, $2, $3, 'free', 'active') returning id`,
      [learner.learnerId, course, v1])).rows[0].id);

  const stranger = await adult('resume-stranger@example.com', 'Stranger');

  /**
   * Run one statement as an actor and COMMIT it.
   *
   * `asUser` rolls back, which is right for most suites and wrong for this one:
   * "coming back to a lesson overwrites the place" is a test about a row that
   * has to survive. A position is one integer in a lesson-progress row; it
   * leaks into no later suite.
   */
  async function asCommitted(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
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

  const record = async (actor, enrolment, lesson, seconds) =>
    (await asCommitted(actor, 'select public.record_lesson_position($1,$2,$3) r',
      [enrolment, lesson, seconds])).rows[0].r;

  const positions = async (actor, enrolment) =>
    (await asCommitted(actor, 'select public.lesson_positions($1) p', [enrolment])).rows[0].p;

  const stored = async (lesson) =>
    (await q(`select status, last_video_position, progress_percent
                from public.lesson_progress
               where course_enrolment_id = $1 and lesson_id = $2`,
      [enrolmentId, lesson])).rows[0];

  // -------------------------------------------------------------------------
  console.log('\nKeeping a place');
  // -------------------------------------------------------------------------

  await test('a learner stops in a lesson and the position is kept', async () => {
    const result = await record(learner.userId, enrolmentId, built.lessons[0], 754);
    assert(result.seconds === 754, `stored ${result.seconds}`);
    assert(result.status === 'in_progress', `status was ${result.status}`);

    const row = await stored(built.lessons[0]);
    assert(row.last_video_position === 754, `row holds ${row.last_video_position}`);
    // Moving a player is not progress. The percentage stays where the lesson
    // machinery put it.
    assert(Number(row.progress_percent) === 0, `percent moved to ${row.progress_percent}`);
  });

  await test('coming back to a lesson overwrites the place rather than adding a row', async () => {
    await record(learner.userId, enrolmentId, built.lessons[0], 1200);
    const n = (await q(
      `select count(*)::int n from public.lesson_progress
        where course_enrolment_id = $1 and lesson_id = $2`,
      [enrolmentId, built.lessons[0]])).rows[0].n;
    assert(n === 1, `${n} rows for one lesson`);
    assert((await stored(built.lessons[0])).last_video_position === 1200, 'the place did not move');
  });

  await test('a negative or absurd position is clamped rather than refused', async () => {
    // A seek can land at -0.4 seconds and a broken player can report a huge
    // number. Neither is worth an error mid-playback; both are worth a bound.
    const neg = await record(learner.userId, enrolmentId, built.lessons[1], -5);
    assert(neg.seconds === 0, `negative became ${neg.seconds}`);

    const huge = await record(learner.userId, enrolmentId, built.lessons[1], 999999);
    assert(huge.seconds === 86400, `huge became ${huge.seconds}`);
  });

  await test('a completed lesson stays completed when it is reopened', async () => {
    await committed(async () => {
      await q(`insert into public.lesson_progress
                 (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
               values ($1, $2, 'completed', 100, now(), now())`,
        [enrolmentId, built.lessons[2]]);
    });

    const result = await record(learner.userId, enrolmentId, built.lessons[2], 30);
    assert(result.status === 'completed', `status became ${result.status}`);

    const row = await stored(built.lessons[2]);
    assert(row.status === 'completed', 'reopening un-completed a lesson');
    assert(Number(row.progress_percent) === 100, 'reopening moved the percentage');
    assert(row.last_video_position === 30, 'the place was not recorded');
  });

  await test('the enrolment knows where every lesson stopped, in one call', async () => {
    const map = await positions(learner.userId, enrolmentId);
    assert(map[built.lessons[0]] === 1200, `lesson one is at ${map[built.lessons[0]]}`);
    assert(map[built.lessons[1]] === 86400, `lesson two is at ${map[built.lessons[1]]}`);
    // The completed lesson that was reopened carries its new place, and the
    // status stayed completed — the map is about places, not about states.
    assert(map[built.lessons[2]] === 30, `lesson three is at ${map[built.lessons[2]]}`);
    // A lesson never opened has no entry, rather than a zero that reads as
    // "started and stopped at the beginning".
    assert(
      Object.values(map).every((seconds) => Number(seconds) > 0),
      `the map holds a zero: ${JSON.stringify(map)}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nWhose place it is');
  // -------------------------------------------------------------------------

  await test('a stranger cannot record against somebody else enrolment', async () => {
    await rejects(
      () => record(stranger.userId, enrolmentId, built.lessons[0], 60),
      /not your learning/);
  });

  await test('a stranger cannot read where somebody else stopped', async () => {
    await rejects(() => positions(stranger.userId, enrolmentId), /not your learning/);
  });

  await test('a signed-out caller is refused both ways', async () => {
    await rejects(() => ctx.asAnon(() => q(
      'select public.record_lesson_position($1,$2,$3)', [enrolmentId, built.lessons[0], 5])),
      /sign in/);
    await rejects(() => ctx.asAnon(() => q(
      'select public.lesson_positions($1)', [enrolmentId])), /sign in/);
  });

  await test('a lesson from another version is refused, because progress is pinned', async () => {
    // D5: an enrolment is bound to one version. A position against a lesson the
    // learner is not on is a row nobody can explain later.
    const v2 = await newVersion(course, teacher, { version_number: 2 });
    const other = await publish(v2, { lessons: 1 });

    await rejects(
      () => record(learner.userId, enrolmentId, other.lessons[0], 100),
      /not in the version this learner is on/);
  });

  await test('an enrolment that does not exist says so', async () => {
    await rejects(
      () => record(learner.userId, '00000000-0000-0000-0000-000000000000',
        built.lessons[0], 10),
      /no such enrolment/);
  });

  await test('a guardian may keep the place for a child on their family account', async () => {
    // The same helper the RLS policy uses, so the writer and the table agree
    // about who a family is — a parent listening along with a child included.
    const parent = await adult('resume-parent@example.com', 'Resume Parent');
    const familyId = (await q(
      `insert into public.families (name, created_by) values ('Resume family', $1)
       returning id`, [parent.userId])).rows[0].id;
    await q(`insert into public.family_memberships
              (family_id, user_id, membership_type, status, joined_at)
             values ($1, $2, 'guardian', 'active', now())`, [familyId, parent.userId]);
    const childId = (await q(
      `insert into public.learner_profiles (family_id, display_name, learner_type, age_band)
       values ($1, 'Resume Child', 'child', '8-10') returning id`, [familyId])).rows[0].id;
    const childEnrolment = (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1, $2, $3, 'free', 'active') returning id`,
      [childId, course, v1])).rows[0].id;

    const result = await record(parent.userId, childEnrolment, built.lessons[0], 42);
    assert(result.seconds === 42, `stored ${result.seconds}`);
  });
}
