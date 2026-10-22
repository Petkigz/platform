// A teacher's own numbers.
//
// The question `delivery.analytics` raised once it started recording: what may
// an author know about their own course? The answer this suite pins is narrow on
// purpose —
//
//   - the author of the course, or staff, and nobody else;
//   - aggregates only: counts, distinct learners, per-lesson opens, and never a
//     learner reference anywhere in the result;
//   - with the flag off, a sentence rather than zeros, because an empty report
//     and a switched-off report are different facts.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('reports-admin@example.com');
  const teacher = await newInstructor('reports-teacher@example.com', admin);
  const otherTeacher = await newInstructor('reports-other@example.com', admin);

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
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

  let seq = 0;
  async function adult(name) {
    seq += 1;
    const userId = await newUser(`reports-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  async function courseOf(owner, title) {
    seq += 1;
    const course = await newCourse(owner, { status: 'active', title });
    const version = await newVersion(course, owner);
    const section = await newSection(version);
    const first = await newLesson(section, { title: `${title} — lesson one` });
    const second = await newLesson(section, { title: `${title} — lesson two`, position: 2 });
    return { course, version, first, second };
  }

  const record = (actor, code, subjectId, learnerId) =>
    asActor(actor, 'select public.record_analytics_event($1,$2,$3,$4) r',
      [code, subjectId, learnerId, '{}']).then((r) => r.rows[0].r);

  const report = (actor, courseId, days = 30) =>
    asActor(actor, 'select public.teacher_course_analytics($1,$2) r', [courseId, days])
      .then((r) => r.rows[0].r);

  async function withAnalytics(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'delivery.analytics'`)).value_text;
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'delivery.analytics'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'delivery.analytics'`, [before ?? 'false']);
    }
  }

  await test('the author reads their own course, in aggregates', async () => {
    const person = await adult('Report Reader');
    const mine = await courseOf(teacher, 'Reported Course');
    await withAnalytics(async () => {
      await record(person.userId, 'lesson.opened', mine.first, person.learnerId);
      await record(person.userId, 'lesson.opened', mine.second, person.learnerId);
      await record(person.userId, 'course.viewed', mine.version);

      const result = await report(teacher, mine.course);
      assert(result.title === 'Reported Course', JSON.stringify(result.title));
      assert(Number(result.events) === 3, `counted ${result.events} events`);
      assert(Number(result.learners) === 1, `counted ${result.learners} learners`);
      assert(result.aggregateOnly === true);

      const ids = result.byEvent.map((e) => e.code).sort();
      assert(ids.join(',') === 'course.viewed,lesson.opened', `byEvent was ${ids.join(',')}`);
      // The per-lesson breakdown is by lesson, not by learner.
      assert(result.lessons.length === 2, `expected two lessons, got ${result.lessons.length}`);
      assert(result.lessons.every((l) => Number(l.opens) === 1));
      assert(result.daily.length === 1, 'lesson opens did not bucket into one UTC day');
    });
  });

  await test('no learner or actor reference appears anywhere in the report', async () => {
    const person = await adult('Unlisted Learner');
    const mine = await courseOf(teacher, 'Anonymous Numbers');
    await withAnalytics(async () => {
      await record(person.userId, 'lesson.opened', mine.first, person.learnerId);
      const result = JSON.stringify(await report(teacher, mine.course));
      assert(!result.includes(person.userId), 'the report contains the signed-in user id');
      assert(!result.includes(person.learnerId), 'the report contains the learner profile id');
    });
  });

  await test('another teacher cannot read it, and neither can a learner', async () => {
    const mine = await courseOf(teacher, 'Somebody Elses Course');
    const person = await adult('Curious');
    await withAnalytics(async () => {
      await rejects(() => report(otherTeacher, mine.course), /belongs to the teacher/i);
      await rejects(() => report(person.userId, mine.course), /belongs to the teacher/i);
    });
  });

  await test('staff may read any course report, for the support case', async () => {
    const mine = await courseOf(teacher, 'Staff Readable');
    await withAnalytics(async () => {
      const result = await report(admin, mine.course);
      assert(result.courseId === mine.course);
    });
  });

  await test('with capture off a teacher is told, not shown zeros', async () => {
    const mine = await courseOf(teacher, 'Switched Off');
    await rejects(() => report(teacher, mine.course), /analytics is not enabled/i);
  });

  await test('another course\'s events are not in the numbers', async () => {
    const person = await adult('Two Courses');
    const mine = await courseOf(teacher, 'Mine');
    const theirs = await courseOf(otherTeacher, 'Theirs');
    await withAnalytics(async () => {
      await record(person.userId, 'lesson.opened', theirs.first, person.learnerId);
      const result = await report(teacher, mine.course);
      assert(Number(result.events) === 0, `a foreign event counted ${result.events} times`);
      assert(result.byEvent.length === 0 && result.lessons.length === 0);
    });
  });

  await test('enrolments and certificates are counted, as stocks', async () => {
    const mine = await courseOf(teacher, 'Stock Course');
    const person = await adult('Enrolled Learner');
    await q(`insert into public.course_enrolments
               (learner_profile_id, course_id, course_version_id, source, status)
             values ($1,$2,$3,'free','active')`, [person.learnerId, mine.course, mine.version]);
    const enrolment = await scalar(
      `select id from public.course_enrolments
        where learner_profile_id = $1 and course_id = $2`, [person.learnerId, mine.course]);

    await q(`update public.course_enrolments
                set status='completed', completed_at=now() where id=$1`, [enrolment.id]);
    await q(`insert into public.certificates
               (learner_profile_id, course_enrolment_id, certificate_number, issued_by,
                learner_display_name, course_title, course_version_number, course_language,
                criteria_snapshot, template_version)
             values ($1,$2,$3,$4,'Enrolled Learner','Stock Course',1,'en','{}'::jsonb,1)`,
    [person.learnerId, enrolment.id, `AS-STOCK-${seq}`, admin]);

    await withAnalytics(async () => {
      const result = await report(teacher, mine.course);
      assert(Number(result.enrolments.total) === 1, `total was ${result.enrolments.total}`);
      assert(Number(result.enrolments.completed) === 1, 'a completed enrolment was not counted');
      assert(Number(result.enrolments.active) === 0);
      assert(Number(result.certificates.issued) === 1, 'the certificate was not counted');
      assert(Number(result.certificates.revoked) === 0);
      // Stocks, not flows: an enrolment older than the window still counts.
      assert(Number(result.enrolments.joinedInWindow) === 1);
    });
  });

  await test('the window and the course id are validated', async () => {
    const mine = await courseOf(teacher, 'Validated');
    await withAnalytics(async () => {
      await rejects(() => report(teacher, mine.course, 0), /between 1 and 3650/i);
      await rejects(() => report(teacher, '00000000-0000-0000-0000-000000000000'),
        /course does not exist/i);
    });
  });
}
