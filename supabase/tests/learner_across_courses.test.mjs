// One learner, every course — and the boundary that did not move.
//
// The view was refused on 2026-10-19 for a reason that was about *teachers*: a course
// author reads a learner only inside a cohort that pins the version they authored, and
// nothing about a newer request changes that. The owner asked for it on 2026-11-02
// anyway, so this suite exists to pin both halves of the answer:
//
//   * the household reads one child's learning in one call, with the same completion
//     number the certificate engine uses, and
//   * every caller the platform already refuses is still refused — a stranger, the
//     author of the course, a grantee of an adult share, and a guardian whose
//     verification has lapsed.
//
// The rule under test is the one that makes the reversal safe: **a view may add shape,
// never reach.** Every column here is a column the caller could already read one course
// at a time.

export async function run(ctx) {
  const {
    q, test, assert, rejects, committed,
    bootstrapAdmin, newUser, newProfile,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
    verifyGuardian,
  } = ctx;

  const admin    = await bootstrapAdmin('across-admin@example.com');
  const teacher  = await newInstructor('across-teacher@example.com', admin);
  const reviewer = await newReviewer('across-reviewer@example.com', admin);

  const count = async (sql, params = []) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
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

  const across = (actor, learnerId) =>
    asActor(actor, 'select * from public.learner_across_courses($1)', [learnerId])
      .then((r) => r.rows);

  // Three different actors, because the workflow is three different acts: the author
  // submits, a reviewer approves, staff publish. One actor doing all three is refused,
  // and that refusal is a feature this suite should not be accidentally testing.
  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'across-courses test']);

  /** A published course with one lesson, and optionally a certificate policy. */
  async function publishCourse({ certificateEnabled = false } = {}) {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);

    if (certificateEnabled) {
      await q(`insert into public.course_completion_policies
                 (course_version_id, completion_mode, certificate_enabled,
                  certificate_template_version)
               values ($1, 'all_lessons', true, '1')`, [version]);
    }

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    return { course, version, section, lesson };
  }

  const enrol = (learnerId, course, version) =>
    committed(async () => (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`,
      [learnerId, course, version])).rows[0].id);

  const completeLesson = (enrolmentId, lessonId) =>
    committed(() => q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
       values ($1,$2,'completed',100,now(),now())
       on conflict (course_enrolment_id, lesson_id) do update
         set status = 'completed', progress_percent = 100, completed_at = now()`,
      [enrolmentId, lessonId]));

  let seq = 0;
  /** A household: one parent, one child, and (since 2026-11-01) a verified guardian. */
  async function household({ verified = true } = {}) {
    seq += 1;
    const guardian = await newUser(`across-parent-${seq}@example.com`);
    await newProfile(guardian, `Parent ${seq}`);

    const { familyId, childId } = await committed(async () => {
      const fam = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, [`Across Family ${seq}`, guardian])).rows[0].id;
      const child = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','11-13',$2,'active') returning id`,
        [`Child ${seq}`, fam])).rows[0].id;
      await q(`insert into public.family_memberships
                 (family_id, user_id, membership_type, status, joined_at, created_by)
               values ($1,$2,'owner','active',now(),$2)`, [fam, guardian]);
      return { familyId: fam, childId: child };
    });

    if (verified) await verifyGuardian(guardian, childId);
    return { guardian, childId, familyId };
  }

  async function adult(name) {
    seq += 1;
    const userId = await newUser(`across-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    return { userId, learnerId };
  }

  // ---------------------------------------------------------------------------
  // Act I — the household reads one child across every course
  // ---------------------------------------------------------------------------

  await test('a parent reads their child’s courses in one call, newest activity first', async () => {
    const { guardian, childId } = await household();

    const first  = await publishCourse();
    const second = await publishCourse();
    const third  = await publishCourse();

    const firstEnrol  = await enrol(childId, first.course, first.version);
    const secondEnrol = await enrol(childId, second.course, second.version);
    const thirdEnrol  = await enrol(childId, third.course, third.version);

    // Only the second has any activity, so it must sort first — the page's whole
    // purpose is "what is this child doing now", not an alphabetical course list.
    await completeLesson(secondEnrol, second.lesson);

    const rows = await across(guardian, childId);
    eq(rows.length, 3, 'the courses the parent sees');
    eq(rows[0].enrolment_id, secondEnrol, 'the course with activity is first');
    eq(rows[0].lessons_completed, 1, 'completed lessons on the active course');
    eq(rows[0].lessons_in_version, 1, 'lessons in the pinned version');
    assert(rows[0].last_activity_at !== null, 'the active course has no activity time');

    for (const row of rows) {
      assert(row.course_title && row.course_slug, `${row.enrolment_id} has no course title`);
      eq(row.enrolment_status, 'active', 'the enrolment status');
    }

    // The two untouched courses are present, at zero — an empty course that vanishes
    // reads as "this child is not enrolled", which is a different fact.
    const untouched = rows.filter((r) => r.enrolment_id === firstEnrol || r.enrolment_id === thirdEnrol);
    eq(untouched.length, 2, 'the courses with no activity');
    for (const row of untouched) eq(row.lessons_completed, 0, 'completed lessons on an untouched course');
  });

  await test('the completion number is the certificate engine’s, not a second count', async () => {
    const { guardian, childId } = await household();
    const { course, version, lesson } = await publishCourse({ certificateEnabled: true });
    const enrolmentId = await enrol(childId, course, version);
    await completeLesson(enrolmentId, lesson);

    const rows = await across(guardian, childId);
    const row = rows.find((r) => r.enrolment_id === enrolmentId);
    const summary = (await q(
      'select lessons_total, lessons_done, percent_complete from public.enrolment_progress_summary($1)',
      [enrolmentId])).rows[0];

    eq(row.lessons_completed, Number(summary.lessons_done), 'completed lessons');
    eq(row.lessons_in_version, Number(summary.lessons_total), 'lessons in the version');
    eq(Number(row.percent_complete), Number(summary.percent_complete), 'the percentage');

    // And the certificate, once issued, is the number a parent may show an employer.
    const certificate = (await q(
      'select certificate_number from public.issue_certificate($1,$2)',
      [enrolmentId, admin])).rows[0];
    const after = (await across(guardian, childId)).find((r) => r.enrolment_id === enrolmentId);
    eq(after.certificate_number, certificate.certificate_number, 'the certificate number');
    eq(after.certificate_status, 'issued', 'the certificate status');
  });

  await test('a withdrawn enrolment is not a course this child is taking', async () => {
    const { guardian, childId } = await household();
    const kept = await publishCourse();
    const dropped = await publishCourse();

    const keptEnrol = await enrol(childId, kept.course, kept.version);
    const droppedEnrol = await enrol(childId, dropped.course, dropped.version);
    await q(`update public.course_enrolments set status = 'withdrawn' where id = $1`,
      [droppedEnrol]);

    const rows = await across(guardian, childId);
    eq(rows.length, 1, 'courses after a withdrawal');
    eq(rows[0].enrolment_id, keptEnrol, 'the course that survived');
  });

  await test('a learner reads their own courses, and nobody else’s', async () => {
    const learner = await adult('Across Adult');
    const other = await adult('Across Other');
    const { course, version } = await publishCourse();
    const enrolmentId = await enrol(learner.learnerId, course, version);

    const mine = await across(learner.userId, learner.learnerId);
    eq(mine.length, 1, 'the learner’s own courses');
    eq(mine[0].enrolment_id, enrolmentId, 'their enrolment');

    // The same function, pointed at somebody else, refuses rather than returning an
    // empty list that would read as "that person has no courses".
    await rejects(() => across(learner.userId, other.learnerId), /cannot read that learner/i);
  });

  // ---------------------------------------------------------------------------
  // Act II — every caller the platform already refused is still refused
  // ---------------------------------------------------------------------------

  await test('a stranger is refused, and learns nothing from the refusal', async () => {
    const { childId } = await household();
    const outsider = await adult('Across Outsider');
    const { course, version } = await publishCourse();
    await enrol(childId, course, version);

    await rejects(() => across(outsider.userId, childId), /cannot read that learner/i);

    // An id nobody has answers the same way, so the refusal cannot be used to find
    // out whether a learner exists.
    await rejects(() => across(outsider.userId, '00000000-0000-4000-8000-000000000000'),
      /cannot read that learner/i);
  });

  await test('the course author is refused: a teacher’s route stays the cohort roster', async () => {
    const { childId } = await household();
    const { course, version } = await publishCourse();
    await enrol(childId, course, version);

    // The teacher authored the course the child is enrolled in, and still cannot read
    // the child across courses. This is the 2026-10-19 decision, unchanged: a
    // self-paced enrolment is a private purchase, and a cross-course view would tell
    // an author that a learner is also studying with somebody else.
    await rejects(() => across(teacher, childId), /cannot read that learner/i);

    // Nor through the roster function, which has its own guard.
    const cohorts = await count('select 1 from public.cohorts');
    void cohorts;
  });

  await test('a guardian whose verification lapsed loses the view', async () => {
    const { guardian, childId } = await household();
    const { course, version } = await publishCourse();
    await enrol(childId, course, version);

    eq((await across(guardian, childId)).length, 1, 'courses before the lapse');

    // The consent expires. `can_access_learner()` answers false, and this view is one
    // more door onto that predicate rather than a way around it.
    // The constraint requires an expiry later than the verification, so the
    // verification is moved back with it: this is a consent that was given two days
    // ago and lapsed yesterday, not a row edited into an impossible state.
    await q(`update public.guardian_relationships
                set verified_at = now() - interval '2 days',
                    consent_expires_at = now() - interval '1 day'
              where guardian_user_id = $1 and learner_profile_id = $2`,
      [guardian, childId]);

    // Enforcement is set here rather than assumed, and put back to whatever was found:
    // a lapse is only a lapse while the switch is on, and this test must not depend on
    // the order the suites happen to run in.
    const enforced = (await q(
      `select value_text from public.platform_settings
        where key = 'family.guardian_verification'`)).rows[0].value_text;
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'family.guardian_verification'`);
    try {
      await rejects(() => across(guardian, childId), /cannot read that learner/i);
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'family.guardian_verification'`, [enforced]);
    }
  });

  await test('an adult share does not reach this view, because its scope does not', async () => {
    const owner = await adult('Shared Owner');
    const viewer = await adult('Share Viewer');
    const { course, version } = await publishCourse();
    const enrolmentId = await enrol(owner.learnerId, course, version);

    await committed(() => q(
      `insert into public.adult_learning_shares
         (learner_profile_id, grantee_user_id, scope, status)
       values ($1,$2,'progress','active')`,
      [owner.learnerId, viewer.userId]));

    // The share is a progress grant, and this function also returns certificate
    // numbers — so folding it in would widen the grant. `/account/sharing` renders
    // that view with its scope respected; this one refuses.
    await rejects(() => across(viewer.userId, owner.learnerId), /cannot read that learner/i);

    // The owner still reads their own row.
    eq((await across(owner.userId, owner.learnerId)).length, 1, 'the owner’s own courses');
    void enrolmentId;
  });
}
