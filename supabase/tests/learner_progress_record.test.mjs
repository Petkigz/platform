// Progress and achievements — screen 18, as a record rather than a strip.
//
// The mechanics are new here, so most of these tests are about the *decisions*:
// that an unearned badge still says what it needs, that a badge carries the day
// it was actually earned, that a broken streak does not take one away, and that
// "today" is the learner's own day rather than the server's.
//
// Nothing is stored: every number below is derived from lesson_progress and the
// other rows the platform already writes, which is why the fixtures are ordinary
// progress rather than achievement rows.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('lpr-admin@example.com');

  let seq = 0;
  async function person(label, timezone = 'Africa/Kampala') {
    seq += 1;
    const id = await newUser(`lpr-${seq}@example.com`);
    await newProfile(id, label);
    if (timezone) {
      await q(`update public.user_profiles set timezone = $2 where user_id = $1`, [id, timezone]);
    }
    return id;
  }

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    let r;
    try {
      r = await q(sql, params);
    } catch (e) {
      await q('rollback');
      throw e;
    }
    await q('commit');
    return r;
  }

  const record = (who, learnerId) =>
    asActor(who, 'select public.learner_progress_record($1) r', [learnerId])
      .then((r) => r.rows[0].r);

  /** An adult learner of their own. */
  async function adultLearner(who, timezone = 'Africa/Kampala') {
    const userId = await person(who, timezone);
    const r = await asActor(userId, 'select public.claim_own_learner_profile() p');
    return { userId, learnerId: r.rows[0].p.learnerProfileId };
  }

  const teacher = await newInstructor('lpr-teacher@example.com', admin);
  const reviewer = await newReviewer('lpr-reviewer@example.com', admin);

  /** A published course with N lessons, enrolled into by a given learner. */
  async function publishedCourse({ title = 'Fiqh', lessons = 12 } = {}) {
    const course = await newCourse(teacher, { title, status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const ids = [];
    for (let i = 1; i <= lessons; i += 1) {
      ids.push(await newLesson(section, { title: `Lesson ${i}`, position: i }));
    }
    return { course, version, ids };
  }

  // The version helpers above need the real transition path; do it once for all.
  async function publish(version) {
    await q('select public.set_course_version_status($1,$2,$3,$4)',
      [version, 'submitted', teacher, 'Ready']);
    await q('select public.set_course_version_status($1,$2,$3,$4)',
      [version, 'approved', reviewer, 'Scholar approved']);
    await ctx.satisfyReview(version, reviewer, admin);
    await q('select public.set_course_version_status($1,$2,$3,$4)',
      [version, 'published', admin, 'Publish']);
  }

  async function enrol(learnerId, course, version) {
    return (await q(
      `insert into public.course_enrolments (learner_profile_id, course_id, course_version_id)
       values ($1,$2,$3) returning id`, [learnerId, course, version])).rows[0].id;
  }

  /** Finish a lesson at a given moment. */
  const finish = (enrolmentId, lessonId, at) =>
    q(`insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
       values ($1,$2,'completed',100,$3,$3)`, [enrolmentId, lessonId, at]);

  const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

  /**
   * The calendar day a moment falls on *for a learner in Kampala*.
   *
   * Expectations must be computed the same way the function computes them. A
   * timestamp two days ago is often still "today" in UTC while it is already
   * tomorrow in Kampala, and comparing a UTC date against a local one turns a
   * correct answer into a failure.
   */
  const localDay = (iso, tz = 'Africa/Kampala') =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(iso));

  // -------------------------------------------------------------------------
  // The gate, and whose record it is
  // -------------------------------------------------------------------------

  const student = await adultLearner('Student');
  const built = await publishedCourse({ lessons: 12 });
  await publish(built.version);
  const studentEnrolment = await enrol(student.learnerId, built.course, built.version);
  await finish(studentEnrolment, built.ids[0], daysAgo(0));

  await test('the record is refused while learning.streaks is off', async () => {
    const off = (await q(
      `select value_text from public.platform_settings where key = 'learning.streaks'`)).rows[0].value_text;
    assert(off === 'false', `learning.streaks ships as ${off}`);

    await rejects(() => record(student.userId, student.learnerId), /streaks and badges are not enabled/);
  });

  // Everything below runs with the feature on; restored at the end.
  await q(`update public.platform_settings set value_text = 'true' where key = 'learning.streaks'`);

  // A child's record needs both switches, and the children's one ships off
  // (2026-10-30). The guardian test below is the only one that reads a child, so
  // it runs with the second key on; `child_engagement` owns the gate itself.
  await q(`update public.platform_settings set value_text = 'true' where key = 'family.engagement'`);

  await test('a stranger cannot read somebody else\'s record', async () => {
    const stranger = await adultLearner('Stranger');

    await rejects(() => record(stranger.userId, student.learnerId),
      /you cannot read this learner's progress/);
  });

  await test('a learner can read their own record', async () => {
    const r = await record(student.userId, student.learnerId);

    assert(r.enabled === true, 'the record did not report itself as enabled');
    assert(r.displayName === 'Student', `display name was ${r.displayName}`);
    assert(r.timezone === 'Africa/Kampala', `timezone was ${r.timezone}`);
    assert(r.totals.lessonsCompleted === 1, `lessons was ${r.totals.lessonsCompleted}`);
  });

  // -------------------------------------------------------------------------
  // Badges: earned, and not yet
  // -------------------------------------------------------------------------

  await test('the catalogue is eight badges in a fixed order', async () => {
    const rows = (await q('select code, sort_order from public.learner_badge_catalogue() order by sort_order')).rows;

    assert(rows.length === 8, `the catalogue has ${rows.length} badges`);
    assert(rows[0].code === 'first_lesson', `the first badge is ${rows[0].code}`);
    assert(new Set(rows.map((r) => r.code)).size === 8, 'two badges share a code');
  });

  await test('an earned badge carries the day it was earned', async () => {
    const r = await record(student.userId, student.learnerId);
    const first = r.badges.find((b) => b.code === 'first_lesson');

    assert(first.earned === true, 'finishing a lesson did not earn "first step"');
    assert(first.earnedOn === localDay(new Date().toISOString()),
      `earned on ${first.earnedOn}, which is not today in Kampala`);
  });

  await test('a badge not yet earned is still shown, with what it needs', async () => {
    const r = await record(student.userId, student.learnerId);
    const ten = r.badges.find((b) => b.code === 'ten_lessons');

    assert(ten, 'an unearned badge was omitted — a badge you cannot see is not a goal');
    assert(ten.earned === false, 'ten lessons was earned after one');
    assert(ten.earnedOn === null, 'an unearned badge carried an earned date');
    assert(ten.have === 1 && ten.need === 10, `progress was ${ten.have}/${ten.need}`);
    assert(ten.unit === 'lesson', `unit was ${ten.unit}`);
  });

  // -------------------------------------------------------------------------
  // The dates are read back from the rows, not from "now"
  // -------------------------------------------------------------------------

  await test('ten lessons are dated on the day the tenth was finished', async () => {
    const other = await adultLearner('Ten Lessons');
    const course = await publishedCourse({ title: 'Ten lessons course', lessons: 12 });
    await publish(course.version);
    const e = await enrol(other.learnerId, course.course, course.version);

    // Ten lessons on ten different days, oldest first, so "the tenth" is
    // unambiguous: it is the one finished yesterday.
    for (let i = 0; i < 10; i += 1) {
      await finish(e, course.ids[i], daysAgo(10 - i));
    }
    const tenthDay = localDay(daysAgo(1));

    const r = await record(other.userId, other.learnerId);
    const ten = r.badges.find((b) => b.code === 'ten_lessons');

    assert(ten.earned === true, 'the tenth lesson did not earn the badge');
    assert(ten.earnedOn === tenthDay, `earned on ${ten.earnedOn}, expected ${tenthDay}`);
  });

  await test('a streak badge is dated on the day the run reached it', async () => {
    const runner = await adultLearner('Runner');
    const course = await publishedCourse({ title: 'Streak course', lessons: 12 });
    await publish(course.version);
    const e = await enrol(runner.learnerId, course.course, course.version);

    // Seven consecutive days, the first of them exactly seven days ago, and
    // nothing since — the run is over, but the badge stands.
    for (let i = 0; i < 7; i += 1) {
      await finish(e, course.ids[i], daysAgo(7 - i));
    }

    const r = await record(runner.userId, runner.learnerId);
    const week = r.badges.find((b) => b.code === 'seven_day_streak');
    const expected = localDay(daysAgo(1)); // the seventh day

    assert(week.earned === true, 'seven days in a row did not earn the week badge');
    assert(week.earnedOn === expected, `earned on ${week.earnedOn}, expected ${expected}`);
    assert(r.longestStreakDays === 7, `longest was ${r.longestStreakDays}`);
    assert(r.badges.find((b) => b.code === 'thirty_day_streak').earned === false,
      'seven days earned the thirty-day badge');
  });

  await test('a streak that ended is not a streak that is live today', async () => {
    const lapsed = await adultLearner('Lapsed');
    const course = await publishedCourse({ title: 'Lapsed course', lessons: 12 });
    await publish(course.version);
    const e = await enrol(lapsed.learnerId, course.course, course.version);

    // Four days ending four days ago: the run is over.
    for (let i = 0; i < 4; i += 1) {
      await finish(e, course.ids[i], daysAgo(7 - i));
    }

    const r = await record(lapsed.userId, lapsed.learnerId);
    assert(r.longestStreakDays === 4, `longest was ${r.longestStreakDays}`);
    assert(r.streakDays === 0, `a run that ended four days ago reports ${r.streakDays} live`);
  });

  await test('finishing yesterday keeps the streak alive until the end of today', async () => {
    const evening = await adultLearner('Evening');
    const course = await publishedCourse({ title: 'Evening course', lessons: 12 });
    await publish(course.version);
    const e = await enrol(evening.learnerId, course.course, course.version);

    await finish(e, course.ids[0], daysAgo(2));
    await finish(e, course.ids[1], daysAgo(1));

    const r = await record(evening.userId, evening.learnerId);
    assert(r.streakDays === 2, `a streak finished yesterday reported ${r.streakDays}`);
  });

  // -------------------------------------------------------------------------
  // Days are the learner's days
  // -------------------------------------------------------------------------

  await test('a lesson finished late in the evening counts for that local day', async () => {
    // Kampala is UTC+3: 21:30 local on the 10th is 18:30 UTC on the 10th, and
    // 23:30 local is 20:30 UTC — still the same local day either way. What must
    // not happen is the reverse: 00:30 local on the 11th is 21:30 UTC on the
    // 10th, so a learner studying just after midnight must not be told they
    // studied yesterday.
    const night = await adultLearner('Night Owl');
    const course = await publishedCourse({ title: 'Night course', lessons: 12 });
    await publish(course.version);
    const e = await enrol(night.learnerId, course.course, course.version);

    // Half past midnight, local, yesterday — inside the twelve-week window and
    // in the past whenever this suite runs. In UTC that moment is still the day
    // before, which is exactly the mis-attribution the test is for.
    const yesterdayLocal = localDay(daysAgo(1));
    const justAfterMidnight = `${yesterdayLocal}T00:30:00+03:00`;
    const dayBefore = localDay(daysAgo(2));

    await finish(e, course.ids[0], justAfterMidnight);

    const r = await record(night.userId, night.learnerId);
    assert(r.studyDays.includes(yesterdayLocal),
      `the day was not ${yesterdayLocal}; study days were ${r.studyDays.join(', ')}`);
    assert(!r.studyDays.includes(dayBefore),
      'a lesson just after local midnight was counted on the previous day');
  });

  // -------------------------------------------------------------------------
  // The rest of the record
  // -------------------------------------------------------------------------

  await test('only the last twelve weeks are drawn on the calendar', async () => {
    const old = await adultLearner('Old Timer');
    const course = await publishedCourse({ title: 'Old course', lessons: 12 });
    await publish(course.version);
    const e = await enrol(old.learnerId, course.course, course.version);

    await finish(e, course.ids[0], daysAgo(200)); // outside the window
    await finish(e, course.ids[1], daysAgo(3));   // inside it

    const r = await record(old.userId, old.learnerId);
    assert(r.studyDays.length === 1, `the calendar showed ${r.studyDays.length} days`);
    assert(r.totals.studyDays === 2,
      `the lifetime count was ${r.totals.studyDays}; the window must not change the total`);
    assert(r.totals.lessonsCompleted === 2, 'lessons outside the window stopped counting');
  });

  await test('current courses are listed with how far each has got', async () => {
    const r = await record(student.userId, student.learnerId);
    const row = r.courses.find((c) => c.courseTitle === 'Fiqh');

    assert(row, 'the enrolled course is missing from the record');
    assert(row.lessonsDone === 1, `lessonsDone was ${row.lessonsDone}`);
    assert(Number(row.lessonsTotal) === 12, `lessonsTotal was ${row.lessonsTotal}`);
    assert(row.status === 'active', `status was ${row.status}`);
    assert(row.courseSlug.length > 0, 'the course has no slug, so the screen cannot link to it');
  });

  await test('a certificate appears in the record with its number and date', async () => {
    const certified = await adultLearner('Certified');
    const course = await publishedCourse({ title: 'Certified course', lessons: 2 });
    await publish(course.version);
    const e = await enrol(certified.learnerId, course.course, course.version);
    await finish(e, course.ids[0], daysAgo(1));

    const number = `LPR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    // `course_title` here is the certificate's own snapshot, not a lookup, so
    // renaming the course later cannot rewrite what it says.
    await q(`insert into public.certificates
               (learner_profile_id, course_enrolment_id, certificate_number, issued_by,
                template_version, course_title, course_version_number, course_language,
                learner_display_name)
             values ($1,$2,$3,$4,'v1','Certified course',1,'en','Certified')`,
      [certified.learnerId, e, number, admin]);

    const r = await record(certified.userId, certified.learnerId);
    const cert = r.certificates.find((c) => c.certificateNumber === number);

    assert(cert, 'the issued certificate is missing from the record');
    assert(cert.courseTitle === 'Certified course', `course title was ${cert.courseTitle}`);
    assert(r.badges.find((b) => b.code === 'first_certificate').earned === true,
      'a certificate did not earn the "Certified" badge');
  });

  await test('a completed course counts once, whatever its percentage says', async () => {
    const finisher = await adultLearner('Finisher');
    const course = await publishedCourse({ title: 'Finished course', lessons: 3 });
    await publish(course.version);
    const e = await enrol(finisher.learnerId, course.course, course.version);
    for (const id of course.ids) await finish(e, id, daysAgo(2));
    await q(`update public.course_enrolments set status = 'completed', completed_at = $2 where id = $1`,
      [e, daysAgo(1)]);

    const r = await record(finisher.userId, finisher.learnerId);
    assert(r.totals.coursesCompleted === 1, `courses was ${r.totals.coursesCompleted}`);
    assert(r.badges.find((b) => b.code === 'first_course').earned === true,
      'a completed course did not earn the "Course complete" badge');
    assert(r.courses.some((c) => c.status === 'completed'),
      'a completed course vanished from the record');
  });

  // -------------------------------------------------------------------------
  // A guardian reads a child's record
  // -------------------------------------------------------------------------

  await test('a guardian reads a child\'s record, and the child is not an account', async () => {
    const guardian = await person('Guardian');
    const family = (await asActor(guardian, 'select public.create_family($1) id', ['Record family'])).rows[0].id;
    const child = (await asActor(guardian,
      'select public.add_child_to_family($1,$2,$3) id', [family, 'Amina', '8-10'])).rows[0].id;

    const course = await publishedCourse({ title: 'Children course', lessons: 4 });
    await publish(course.version);
    const e = await enrol(child, course.course, course.version);
    await finish(e, course.ids[0], daysAgo(1));

    const r = await record(guardian, child);
    assert(r.displayName === 'Amina', `display name was ${r.displayName}`);
    assert(r.totals.lessonsCompleted === 1, 'the child\'s lesson was not counted');
    assert(r.badges.find((b) => b.code === 'first_lesson').earned === true,
      'the child did not earn "first step"');

    // A child has no login of their own, so no other account should reach them.
    const outsider = await adultLearner('Outsider');
    await rejects(() => record(outsider.userId, child), /you cannot read this learner's progress/);
  });

  // Restore both flags so the next suite meets the platform as it ships.
  await q(`update public.platform_settings set value_text = 'false' where key = 'learning.streaks'`);
  await q(`update public.platform_settings set value_text = 'false' where key = 'family.engagement'`);
}
