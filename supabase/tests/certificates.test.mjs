// Certificates.
//
// The properties worth pinning are the ones that make a certificate mean
// something:
//
//   - it cannot be minted for work that was not finished
//   - it cannot be minted by someone who is not staff
//   - asking twice does not produce two
//   - what it says is frozen at issue time, so renaming the course later
//     cannot rewrite what someone was awarded
//   - anyone holding a number can check it, but nobody can enumerate them
//
// That last pair is the privacy design: the number is the capability.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile, grantRole, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('cert-admin@example.com');
  const teacher  = await newInstructor('cert-teacher@example.com', admin);
  const reviewer = await newReviewer('cert-reviewer@example.com', admin);

  const supportId = await newUser('cert-support@example.com');
  await newProfile(supportId, 'Support');
  await committed(async () => { await grantRole(supportId, 'support_agent', admin); });

  const learnerId = await newUser('cert-learner@example.com');
  await newProfile(learnerId, 'Learner');

  const outsiderId = await newUser('cert-outsider@example.com');
  await newProfile(outsiderId, 'Outsider');

  // A user may have at most one linked learner profile
  // (learner_profiles_linked_user_key), so each learner in these fixtures
  // needs their own auth user rather than sharing one.
  let learnerSeq = 0;
  async function newAdult(name) {
    learnerSeq += 1;
    const userId = await newUser(`cert-learner-${learnerSeq}@example.com`);
    await newProfile(userId, name);
    return (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
  }

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'certificate test']);

  /** A course with one lesson, published, plus a completion policy. */
  async function publishCourse({ certificateEnabled, templateVersion = 1 }) {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);

    // The policy must exist while the version is still a draft, because
    // publication freezes the whole subtree (D5).
    if (certificateEnabled !== null) {
      await q(`insert into public.course_completion_policies
                 (course_version_id, completion_mode, certificate_enabled,
                  certificate_template_version)
               values ($1, 'all_lessons', $2, $3)`,
        [version, certificateEnabled, certificateEnabled ? templateVersion : null]);
    }

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version, section, lesson };
  }

  const enrol = (learnerProfileId, course, version) =>
    committed(async () => (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`,
      [learnerProfileId, course, version])).rows[0].id);

  const completeLesson = (enrolmentId, lessonId) =>
    committed(async () => {
      await q(`insert into public.lesson_progress
                 (course_enrolment_id, lesson_id, status, progress_percent,
                  started_at, completed_at)
               values ($1,$2,'completed',100,now(),now())
               on conflict (course_enrolment_id, lesson_id) do update
                 set status = 'completed', progress_percent = 100, completed_at = now()`,
        [enrolmentId, lessonId]);
    });

  // -------------------------------------------------------------------
  // Eligibility
  // -------------------------------------------------------------------
  await test('certificates need a completion policy that enables them', async () => {
    const none = await publishCourse({ certificateEnabled: null });
    const learner = await newAdult('C');
    const enrolmentId = await enrol(learner, none.course, none.version);
    await completeLesson(enrolmentId, none.lesson);

    await rejects(() => q(
      `select id from public.issue_certificate($1, $2)`, [enrolmentId, admin]),
      'a certificate was issued for a version with no certificate policy');

    const disabled = await publishCourse({ certificateEnabled: false });
    const e2 = await enrol(learner, disabled.course, disabled.version);
    await completeLesson(e2, disabled.lesson);

    await rejects(() => q(
      `select id from public.issue_certificate($1, $2)`, [e2, admin]),
      'a certificate was issued where certificate_enabled was false');
  });

  await test('enabling certificates requires a template version', async () => {
    // The constraint, so that a certificate can never be issued against
    // nothing to render it with.
    const c = await newCourse(teacher, { status: 'active' });
    const v = await newVersion(c, teacher);
    await rejects(() => q(
      `insert into public.course_completion_policies
         (course_version_id, completion_mode, certificate_enabled, certificate_template_version)
       values ($1, 'all_lessons', true, null)`, [v]),
      'certificate_enabled was accepted with no template version');
  });

  await test('an incomplete enrolment cannot be awarded a certificate', async () => {
    const c = await publishCourse({ certificateEnabled: true });
    const learner = await newAdult('Halfway');
    const enrolmentId = await enrol(learner, c.course, c.version);

    // Started but not finished.
    await committed(async () => {
      await q(`insert into public.lesson_progress
                 (course_enrolment_id, lesson_id, status, progress_percent, started_at)
               values ($1,$2,'in_progress',40,now())`, [enrolmentId, c.lesson]);
    });

    await rejects(() => q(
      `select id from public.issue_certificate($1, $2)`, [enrolmentId, admin]),
      'a certificate was issued for an incomplete enrolment');

    // Scoped to this enrolment: other suites in the same run legitimately
    // issue certificates, so a global count proves nothing here.
    const issued = await count(
      'select 1 from public.certificates where course_enrolment_id = $1', [enrolmentId]);
    assert(issued === 0, `${issued} certificate(s) were issued for it anyway`);
  });

  // -------------------------------------------------------------------
  // Who may issue
  // -------------------------------------------------------------------
  const good = await publishCourse({ certificateEnabled: true });
  const goodLearner = await newAdult('Awarded');
  const goodEnrolment = await enrol(goodLearner, good.course, good.version);
  await completeLesson(goodEnrolment, good.lesson);

  await test('only staff may issue a certificate', async () => {
    await rejects(() => q(
      `select id from public.issue_certificate($1, $2)`, [goodEnrolment, learnerId]),
      'a learner issued themselves a certificate');

    await rejects(() => q(
      `select id from public.issue_certificate($1, $2)`, [goodEnrolment, teacher]),
      'the course author issued a certificate');
  });

  await test('a support agent may issue one', async () => {
    const r = await q(`select id, certificate_number from public.issue_certificate($1, $2)`,
      [goodEnrolment, supportId]);
    assert(r.rows.length === 1, 'a support agent could not issue a certificate');
    assert(/^AS-\d{4}-\d{8}$/.test(r.rows[0].certificate_number),
      `unexpected certificate number '${r.rows[0].certificate_number}'`);
  });

  await test('issuing twice returns the same certificate', async () => {
    const before = (await q(
      'select certificate_number n from public.certificates where course_enrolment_id = $1',
      [goodEnrolment])).rows[0].n;

    await q(`select id from public.issue_certificate($1, $2)`, [goodEnrolment, admin]);

    const n = await count('select 1 from public.certificates where course_enrolment_id = $1',
      [goodEnrolment]);
    assert(n === 1, `a second call produced ${n} certificates`);

    const after = (await q(
      'select certificate_number n from public.certificates where course_enrolment_id = $1',
      [goodEnrolment])).rows[0].n;
    assert(before === after, `the number changed from ${before} to ${after}`);
  });

  // -------------------------------------------------------------------
  // The snapshot
  // -------------------------------------------------------------------
  await test('the certificate keeps what was true when it was issued', async () => {
    const cert = (await q(
      'select course_title, learner_display_name from public.certificates where course_enrolment_id = $1',
      [goodEnrolment])).rows[0];

    // Rename the course and the learner afterwards.
    await q(`update public.courses set title = 'Renamed Later' where id = $1`, [good.course]);
    await q(`update public.learner_profiles set display_name = 'Someone Else' where id = $1`,
      [goodLearner]);

    const after = (await q(
      'select course_title, learner_display_name from public.certificates where course_enrolment_id = $1',
      [goodEnrolment])).rows[0];

    assert(after.course_title === cert.course_title,
      `the certificate's course title changed to '${after.course_title}'`);
    assert(after.learner_display_name === cert.learner_display_name,
      `the holder's name changed to '${after.learner_display_name}'`);
  });

  await test('the snapshot columns cannot be edited directly', async () => {
    const id = (await q(
      'select id from public.certificates where course_enrolment_id = $1', [goodEnrolment])).rows[0].id;

    await rejects(() => q(
      `update public.certificates set course_title = 'Forged' where id = $1`, [id]),
      'the course title on a certificate was edited');

    await rejects(() => q(
      `update public.certificates set learner_display_name = 'Forged' where id = $1`, [id]),
      'the holder name on a certificate was edited');
  });

  // -------------------------------------------------------------------
  // Verification
  // -------------------------------------------------------------------
  const number = (await q(
    'select certificate_number n from public.certificates where course_enrolment_id = $1',
    [goodEnrolment])).rows[0].n;

  await test('anyone holding the number can verify it, anonymously', async () => {
    // verify_certificate is granted to anon. That is the only reason a public
    // verification page can exist, and it is safe because the number is the
    // capability — see the next test.
    await asAnon(async () => {
      const r = (await q('select * from public.verify_certificate($1)', [number])).rows[0];
      assert(r, 'verification returned nothing for a real certificate');
      assert(r.valid === true, `valid was ${r.valid}`);
      assert(r.status === 'issued', `status was '${r.status}'`);
      assert(r.course_title, 'the course title was missing');
      assert(r.learner_name, 'the holder name was missing');
    });
  });

  await test('an unknown number verifies as nothing rather than erroring', async () => {
    await asAnon(async () => {
      const rows = (await q('select * from public.verify_certificate($1)', ['AS-1999-99999999'])).rows;
      assert(rows.length === 0, `an unknown number returned ${rows.length} row(s)`);
    });
  });

  await test('nobody can enumerate certificates', async () => {
    // The privacy half of the design. If this ever passes for anon, the public
    // verification page becomes a directory of every learner on the platform.
    await asAnon(async () => {
      const n = await count('select 1 from public.certificates');
      assert(n === 0, `an anonymous visitor read ${n} certificate(s)`);
    });

    await asUser(outsiderId, async () => {
      const n = await count('select 1 from public.certificates');
      assert(n === 0, `an unrelated signed-in user read ${n} certificate(s)`);
    });
  });

  await test('the holder can read their own certificate', async () => {
    const certId = (await q(
      'select id from public.certificates where course_enrolment_id = $1',
      [goodEnrolment])).rows[0].id;
    const holderUserId = (await q(
      'select linked_user_id u from public.learner_profiles where id = $1',
      [goodLearner])).rows[0].u;

    await asUser(holderUserId, async () => {
      const n = await count('select 1 from public.certificates where id = $1', [certId]);
      assert(n === 1, `the holder read ${n} rows of their own certificate`);
    });
  });

  await test('revoking makes verification fail, and says why', async () => {
    const id = (await q(
      'select id from public.certificates where course_enrolment_id = $1', [goodEnrolment])).rows[0].id;

    await q('select id from public.revoke_certificate($1, $2, $3)',
      [id, admin, 'Issued in error']);

    await asAnon(async () => {
      const r = (await q('select * from public.verify_certificate($1)', [number])).rows[0];
      assert(r.valid === false, `a revoked certificate still verified as valid`);
      assert(r.status === 'revoked', `status was '${r.status}'`);
      assert(r.revoked_reason === 'Issued in error',
        `the reason came back as '${r.revoked_reason}'`);
    });

    // The record stays. Revoking is not deleting (D7).
    const still = await count('select 1 from public.certificates where id = $1', [id]);
    assert(still === 1, 'the revoked certificate was removed');
  });
}
