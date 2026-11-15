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
    const resources = [];
    for (let i = 1; i <= 2; i++) {
      resources.push((await q(`insert into public.lesson_resources
        (lesson_id, resource_type, display_name, external_url, position)
        values ($1, 'audio', $2, $3, $4) returning id`,
      [ids[0], `Recording ${i}`, `https://example.invalid/${i}.mp3`, i])).rows[0].id);
    }
    if (ids[4]) resources.push((await q(`insert into public.lesson_resources
      (lesson_id, resource_type, display_name, external_url, position)
      values ($1, 'audio', 'Fresh', 'https://example.invalid/fresh.mp3', 1) returning id`, [ids[4]])).rows[0].id);
    await setVersion(version, 'submitted', teacher);
    await setVersion(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await setVersion(version, 'published', admin);
    return { section, lessons: ids, resources };
  }

  const course = await newCourse(teacher, { status: 'active' });
  const v1 = await newVersion(course, teacher);
  const built = await publish(v1, { lessons: 5 });

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

  const record = async (actor, enrolment, lesson, seconds) => {
    const snapshot = (await asCommitted(actor, 'select public.resume_position_snapshot($1,$2) r', [enrolment, lesson])).rows[0].r;
    const result = (await asCommitted(actor, 'select public.compare_record_lesson_position($1,$2,$3,$4) r',
      [enrolment, lesson, seconds, snapshot.revision])).rows[0].r;
    const row = (await asCommitted(actor, 'select status from public.lesson_progress where course_enrolment_id=$1 and lesson_id=$2', [enrolment, lesson])).rows[0];
    return { ...result, status: row?.status };
  };

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
      'select public.compare_record_lesson_position($1,$2,$3,$4)', [enrolmentId, built.lessons[0], 5, null])),
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
    await ctx.verifyGuardian(parent.userId, childId);
    const childEnrolment = (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1, $2, $3, 'free', 'active') returning id`,
      [childId, course, v1])).rows[0].id;

    const result = await record(parent.userId, childEnrolment, built.lessons[0], 42);
    assert(result.seconds === 42, `stored ${result.seconds}`);
  });

  const snapshot = async (actor, lesson = built.lessons[0]) =>
    (await asCommitted(actor, 'select public.resume_position_snapshot($1,$2) r', [enrolmentId, lesson])).rows[0].r;
  const compare = async (actor, lesson, seconds, revision) =>
    (await asCommitted(actor, 'select public.compare_record_lesson_position($1,$2,$3,$4) r',
      [enrolmentId, lesson, seconds, revision])).rows[0].r;

  await test('revision comparison detects stale devices and allows deliberate rewind after review', async () => {
    const initial = await snapshot(learner.userId);
    const saved = await compare(learner.userId, built.lessons[0], 1900, initial.revision);
    assert(saved.ok && saved.seconds === 1900 && saved.revision !== initial.revision, 'first save failed');
    const stale = await compare(learner.userId, built.lessons[0], 20, initial.revision);
    assert(!stale.ok && stale.seconds === 1900 && stale.revision === saved.revision, 'stale write overwrote');
    const rewind = await compare(learner.userId, built.lessons[0], 20, stale.revision);
    assert(rewind.ok && rewind.seconds === 20, 'reviewed rewind failed');
    const delayed = await compare(learner.userId, built.lessons[0], 1900, initial.revision);
    assert(!delayed.ok && delayed.seconds === 20, 'delayed write overwrote rewind');
  });

  await test('null revision creates only an absent row and completion stays complete', async () => {
    const fresh = built.lessons[3];
    const before = await snapshot(learner.userId, fresh);
    assert(before.revision === null && before.seconds === null, 'expected no row');
    const first = await compare(learner.userId, fresh, 15, null);
    assert(first.ok && first.seconds === 15 && first.revision, 'initial write failed');
    const stale = await compare(learner.userId, fresh, 25, null);
    assert(!stale.ok && stale.seconds === 15, 'second absent-row write overwrote');
    const done = await snapshot(learner.userId, built.lessons[2]);
    const changed = await compare(learner.userId, built.lessons[2], 1, done.revision);
    assert(changed.ok && (await stored(built.lessons[2])).status === 'completed', 'completion changed');
  });

  await test('ordinary progress writes rotate revision without changing the place', async () => {
    const initial = await snapshot(learner.userId);
    await asCommitted(learner.userId, 'update public.lesson_progress set last_seen_at = now() where course_enrolment_id = $1 and lesson_id = $2', [enrolmentId, built.lessons[0]]);
    const stale = await compare(learner.userId, built.lessons[0], 12, initial.revision);
    assert(!stale.ok && stale.seconds === initial.seconds, 'status write did not rotate revision');
  });

  await test('legacy RPC and direct writes cannot bypass revision comparison', async () => {
    await rejects(() => asCommitted(learner.userId, 'select public.record_lesson_position($1,$2,$3)', [enrolmentId, built.lessons[0], 80]), /permission denied/);
    await rejects(() => asCommitted(learner.userId, 'update public.lesson_progress set last_video_position = 80 where course_enrolment_id=$1 and lesson_id=$2', [enrolmentId, built.lessons[0]]), /permission denied/);
    await rejects(() => asCommitted(learner.userId, 'update public.lesson_progress set position_revision = gen_random_uuid() where course_enrolment_id=$1 and lesson_id=$2', [enrolmentId, built.lessons[0]]), /permission denied/);
    await rejects(() => asCommitted(learner.userId, 'update public.lesson_progress set lesson_id = $3 where course_enrolment_id=$1 and lesson_id=$2', [enrolmentId, built.lessons[0], built.lessons[1]]), /permission denied/);
    await rejects(() => asCommitted(learner.userId, 'insert into public.lesson_progress (course_enrolment_id, lesson_id, last_video_position) values ($1,$2,80)', [enrolmentId, built.lessons[0]]), /permission denied/);
    await rejects(() => asCommitted(learner.userId, 'delete from public.lesson_progress where course_enrolment_id=$1 and lesson_id=$2', [enrolmentId, built.lessons[0]]), /permission denied/);
    assert(!await q("select has_column_privilege('authenticated','public.lesson_progress','last_video_position','UPDATE') allowed").then(r => r.rows[0].allowed), 'position grant remains');
  });

  await test('revision read and write refuse another learner and anonymous callers', async () => {
    await rejects(() => snapshot(stranger.userId), /not your learning/);
    await rejects(() => compare(stranger.userId, built.lessons[0], 10, null), /not your learning/);
    await rejects(() => ctx.asAnon(() => q('select public.resume_position_snapshot($1,$2)', [enrolmentId, built.lessons[0]])), /sign in/);
    await rejects(() => ctx.asAnon(() => q('select public.compare_record_lesson_position($1,$2,$3,$4)', [enrolmentId, built.lessons[0], 10, null])), /sign in/);
  });

  const resourceSnapshot = async (actor, lesson, resource) =>
    (await asCommitted(actor, 'select public.resume_resource_snapshot($1,$2,$3) r', [enrolmentId, lesson, resource])).rows[0].r;
  const resourceWrite = async (actor, lesson, resource, seconds, revision) =>
    (await asCommitted(actor, 'select public.compare_record_resource_position($1,$2,$3,$4,$5) r',
      [enrolmentId, lesson, resource, seconds, revision])).rows[0].r;
  const grant = (await q(`insert into public.entitlement_grants
    (learner_profile_id, scope_type, course_version_id, source_type, status)
    values ($1, 'course_version', $2, 'free', 'active') returning id`, [learner.learnerId, v1])).rows[0].id;

  await test('each recording has a separate revision and old lesson positions are not guessed', async () => {
    const [a, b] = built.resources;
    const first = await resourceSnapshot(learner.userId, built.lessons[0], a);
    const second = await resourceSnapshot(learner.userId, built.lessons[0], b);
    assert(first.seconds === null && first.revision === null && second.seconds === null, 'legacy position copied into a resource');
    const savedA = await resourceWrite(learner.userId, built.lessons[0], a, 100, null);
    const savedB = await resourceWrite(learner.userId, built.lessons[0], b, 200, null);
    assert(savedA.ok && savedB.ok, 'separate first writes failed');
    const rewind = await resourceWrite(learner.userId, built.lessons[0], a, 15, savedA.revision);
    assert(rewind.ok && rewind.seconds === 15, 'rewind failed');
    const stale = await resourceWrite(learner.userId, built.lessons[0], a, 40, savedA.revision);
    assert(!stale.ok && stale.seconds === 15 && stale.revision === rewind.revision, 'stale writer overwrote rewind');
    const untouched = await resourceSnapshot(learner.userId, built.lessons[0], b);
    assert(untouched.seconds === 200 && untouched.revision === savedB.revision, 'other recording changed or conflicted');
  });

  await test('a stale revision for an absent parent does not create progress', async () => {
    const lesson = built.lessons[4], resource = built.resources[2];
    const stale = await resourceWrite(learner.userId, lesson, resource, 10, crypto.randomUUID());
    assert(!stale.ok && stale.revision === null, 'expected a conflict');
    const count = (await q('select count(*)::int n from public.lesson_progress where course_enrolment_id=$1 and lesson_id=$2', [enrolmentId, lesson])).rows[0].n;
    assert(count === 0, 'conflict unexpectedly created progress');
    const fresh = await resourceWrite(learner.userId, lesson, resource, 10, null);
    assert(fresh.ok && fresh.seconds === 10, 'fresh resource write failed');
  });

  await test('resource positions require the learner, lesson entitlement and visible matching resource', async () => {
    const resource = built.resources[0];
    await rejects(() => resourceSnapshot(stranger.userId, built.lessons[0], resource), /not your learning/);
    await rejects(() => resourceSnapshot(learner.userId, built.lessons[1], resource), /resource is not available/);
    await rejects(() => ctx.asAnon(() => q('select public.resume_resource_snapshot($1,$2,$3)', [enrolmentId, built.lessons[0], resource])), /sign in/);
    await rejects(() => asCommitted(learner.userId, 'select * from public.lesson_resource_positions'), /permission denied/);
    await rejects(() => asCommitted(learner.userId, 'update public.lesson_resource_positions set seconds = 7'), /permission denied/);
    const suspended = (await q(`update public.entitlement_grants set status = 'suspended'
      where learner_profile_id = $1 and course_version_id = $2 and status = 'active' returning id`, [learner.learnerId, v1])).rows.map((row) => row.id);
    assert(suspended.includes(grant), 'test grant was not suspended');
    try { await rejects(() => resourceSnapshot(learner.userId, built.lessons[0], resource), /cannot access that lesson/); }
    finally { await q("update public.entitlement_grants set status = 'active' where id = any($1::uuid[])", [suspended]); }
  });

  await test('resource records follow progress erasure and status remains completed', async () => {
    await asCommitted(learner.userId, `update public.lesson_progress set status='completed', progress_percent=100, completed_at=now()
      where course_enrolment_id=$1 and lesson_id=$2`, [enrolmentId, built.lessons[0]]);
    const current = await resourceSnapshot(learner.userId, built.lessons[0], built.resources[0]);
    const saved = await resourceWrite(learner.userId, built.lessons[0], built.resources[0], 8, current.revision);
    assert(saved.ok && (await stored(built.lessons[0])).status === 'completed', 'resource save changed completion');
    await ctx.asSuperuser(async () => {
      await q('delete from public.lesson_progress where course_enrolment_id=$1 and lesson_id=$2', [enrolmentId, built.lessons[0]]);
      const count = (await q('select count(*)::int n from public.lesson_resource_positions where lesson_resource_id = any($1::uuid[])', [built.resources.slice(0, 2)])).rows[0].n;
      assert(count === 0, 'position rows survived parent deletion');
    });
  });
}
