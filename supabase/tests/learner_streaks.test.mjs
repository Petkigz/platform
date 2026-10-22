// Streaks and badges.
//
// The learner dashboard could say what somebody had enrolled in and nothing about
// returning. A streak is what makes "come back tomorrow" a thing a child can feel.
//
// Two properties are load-bearing and both are tested here: nothing is stored (so the
// number cannot disagree with the lessons), and the day boundary is the learner's time
// zone rather than the server's — a lesson finished at 23:59 in Kampala must count for
// that day, and a server in UTC would otherwise break the streak every night.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('streak-admin@example.com');
  const teacher = await newInstructor('streak-teacher@example.com', admin);
  const reviewer = await newReviewer('streak-reviewer@example.com', admin);

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

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function withStreaksOn(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'learning.streaks'`)).value_text;
    await q(`update public.platform_settings set value_text = 'true' where key = 'learning.streaks'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1 where key = 'learning.streaks'`,
        [before]);
    }
  }

  async function transition(versionId, status, actor) {
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'streak test']);
  }

  let seq = 0;
  async function learnerAdult(name, timezone = null) {
    seq += 1;
    const userId = await newUser(`streak-adult-${seq}@example.com`);
    await newProfile(userId, name);
    if (timezone) {
      await q(`update public.user_profiles set timezone = $2 where user_id = $1`, [userId, timezone]);
    }
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  /** A published course with `count` lessons, all in one section. */
  async function courseWithLessons(count) {
    seq += 1;
    const course = await newCourse(teacher, { status: 'active', title: `Streak Course ${seq}` });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lessons = [];
    for (let i = 1; i <= count; i += 1) {
      lessons.push(await newLesson(section, { position: i }));
    }
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version, lessons };
  }

  async function enrol(learnerId, course, version) {
    return (await scalar(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`, [learnerId, course, version])).id;
  }

  /** Finish a lesson `daysAgo` days ago at 10:00 UTC (the default learner zone). */
  async function finish(enrolmentId, lessonId, daysAgo) {
    await q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
       values ($1, $2, 'completed', 100,
               (((now() at time zone 'UTC')::date - $3::int)::timestamp + time '10:00') at time zone 'UTC',
               (((now() at time zone 'UTC')::date - $3::int)::timestamp + time '10:00') at time zone 'UTC')`,
      [enrolmentId, lessonId, daysAgo]);
  }

  const engagement = async (actor, learnerId) =>
    (await asActor(actor, 'select public.learner_engagement($1) e', [learnerId])).rows[0].e;

  // ---------------------------------------------------------------------------
  // The streak
  // ---------------------------------------------------------------------------
  await test('consecutive days count, and a quiet day does not end the streak', async () => withStreaksOn(async () => {
    const me = await learnerAdult('Streaky', 'UTC');
    const course = await courseWithLessons(4);
    const enrolmentId = await enrol(me.learnerId, course.course, course.version);

    // Today, yesterday, and the day before: three consecutive days.
    await finish(enrolmentId, course.lessons[0], 0);
    await finish(enrolmentId, course.lessons[1], 1);
    await finish(enrolmentId, course.lessons[2], 2);

    const e = await engagement(me.userId, me.learnerId);
    assert(e.streakDays === 3, `streak ${e.streakDays}`);
    assert(e.longestStreakDays === 3, `longest ${e.longestStreakDays}`);
    assert(e.lessonsCompleted === 3, `lessons ${e.lessonsCompleted}`);
    assert(e.timezone === 'UTC', `timezone ${e.timezone}`);
  }));

  await test('a missed day splits the streak, and the longest is remembered', async () => withStreaksOn(async () => {
    const me = await learnerAdult('Gappy');
    const course = await courseWithLessons(6);
    const enrolmentId = await enrol(me.learnerId, course.course, course.version);

    // A run of three, a gap, then today alone.
    await finish(enrolmentId, course.lessons[0], 6);
    await finish(enrolmentId, course.lessons[1], 5);
    await finish(enrolmentId, course.lessons[2], 4);
    await finish(enrolmentId, course.lessons[3], 0);

    const e = await engagement(me.userId, me.learnerId);
    assert(e.streakDays === 1, `current streak ${e.streakDays}`);
    assert(e.longestStreakDays === 3, `longest ${e.longestStreakDays}`);
  }));

  await test('the day is the learner\'s, not the server\'s', async () => withStreaksOn(async () => {
    // Two lessons finished twenty minutes apart, at 23:59 and 00:19 Kampala. In UTC
    // both fall on the same calendar day; in Kampala they are two consecutive days.
    // A server-side count would call this a one-day streak and break it every night
    // for the learners most likely to study late.
    const me = await learnerAdult('Late Student', 'Africa/Kampala');
    const course = await courseWithLessons(2);
    const enrolmentId = await enrol(me.learnerId, course.course, course.version);

    const at = async (daysAgo, clock) => (await scalar(
      `select ((((now() at time zone 'Africa/Kampala')::date - $1::int)::timestamp + $2::time)
               at time zone 'Africa/Kampala') t`, [daysAgo, clock])).t;

    const first = await at(2, '23:59');
    const second = await at(1, '00:19');
    for (const [lessonId, when] of [[course.lessons[0], first], [course.lessons[1], second]]) {
      await q(`insert into public.lesson_progress
                 (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
               values ($1,$2,'completed',100,$3,$3)`, [enrolmentId, lessonId, when]);
    }

    const e = await engagement(me.userId, me.learnerId);
    assert(e.timezone === 'Africa/Kampala', `timezone ${e.timezone}`);
    assert(e.lessonsCompleted === 2, `lessons ${e.lessonsCompleted}`);
    assert(e.longestStreakDays === 2,
      `longest ${e.longestStreakDays} — the day boundary followed UTC, not Kampala`);
  }));

  // ---------------------------------------------------------------------------
  // Badges
  // ---------------------------------------------------------------------------
  await test('a badge appears at its threshold and carries the day it was earned', async () => withStreaksOn(async () => {
    const me = await learnerAdult('Badged');
    const course = await courseWithLessons(12);
    const enrolmentId = await enrol(me.learnerId, course.course, course.version);

    const before = await engagement(me.userId, me.learnerId);
    assert(before.badges.length === 0, `${before.badges.length} badges before any lesson`);

    await finish(enrolmentId, course.lessons[0], 5);
    const one = await engagement(me.userId, me.learnerId);
    const codes = one.badges.map((b) => b.code);
    assert(codes.includes('first_lesson'), `codes ${codes.join(',')}`);
    const earned = await scalar(
      `select (((now() at time zone 'UTC')::date - 5)::date)::text d`);
    assert(one.badges.find((b) => b.code === 'first_lesson').earnedOn === earned.d,
      'the badge did not carry the day it was earned');

    for (let i = 1; i < 10; i += 1) await finish(enrolmentId, course.lessons[i], 4);
    const ten = await engagement(me.userId, me.learnerId);
    assert(ten.badges.map((b) => b.code).includes('ten_lessons'), 'ten lessons did not earn a badge');
    assert(!ten.badges.map((b) => b.code).includes('first_course'),
      'a badge for finishing a course was given for finishing lessons');

    // Finishing the enrolment itself is what earns it.
    await q(`update public.course_enrolments
                set status = 'completed', completed_at = now()
              where id = $1`, [enrolmentId]);
    const done = await engagement(me.userId, me.learnerId);
    assert(done.badges.map((b) => b.code).includes('first_course'), 'a finished course earned nothing');
    assert(done.coursesCompleted === 1);
  }));

  // ---------------------------------------------------------------------------
  // Refusals
  // ---------------------------------------------------------------------------
  await test('another person\'s learner cannot be read', async () => withStreaksOn(async () => {
    const mine = await learnerAdult('Mine');
    const stranger = await learnerAdult('Stranger');

    await rejects(() => engagement(stranger.userId, mine.learnerId),
      /you cannot read this learner/);
  }));

  await test('with the flag off, nothing is answered at all', async () => {
    const me = await learnerAdult('Switched Off');
    // The default is off; the point is that the refusal comes from the database rather
    // than from a screen remembering not to ask.
    const off = (await scalar(
      `select value_text from public.platform_settings where key = 'learning.streaks'`)).value_text;
    assert(off === 'false', `the flag was already ${off}`);

    await rejects(() => engagement(me.userId, me.learnerId),
      /streaks and badges are not enabled/);
  });
}
