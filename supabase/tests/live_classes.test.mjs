// Live classes.
//
// The properties, in the order a class meets them:
//
//   - only the course author may schedule a room on it;
//   - a session is stored in UTC and remembers the zone it was typed in;
//   - a learner who is not enrolled cannot enter, whatever the clock says;
//   - the room opens for a window and not before;
//   - with no room host configured, joining refuses with a sentence rather than
//     handing out a URL that does not carry a class;
//   - attendance is written on arrival, and only the teacher can read the roll;
//   - cancelling needs a reason a learner can read.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('live-admin@example.com');
  const teacher = await newInstructor('live-teacher@example.com', admin);
  const reviewer = await newReviewer('live-reviewer@example.com', admin);

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
    const userId = await newUser(`live-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  /** A published, free course the learner can enrol in without a purchase. */
  async function openCourse() {
    seq += 1;
    const course = await newCourse(teacher, { status: 'active', title: `Live Course ${seq}` });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [version, 'submitted', teacher, 'live test']);
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [version, 'approved', reviewer, 'live test']);
    await satisfyReview(version, reviewer, admin);
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [version, 'published', admin, 'live test']);
    return { course, version };
  }

  const enrol = (actor, learnerId, course, version) => asActor(actor,
    `insert into public.course_enrolments
       (learner_profile_id, course_id, course_version_id, source, status)
     values ($1,$2,$3,'free','active') returning id`, [learnerId, course, version]);

  /** Turn the feature on for one test and put the setting back afterwards. */
  async function withLive(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'delivery.live_classes'`)).value_text;
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'delivery.live_classes'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'delivery.live_classes'`, [before]);
    }
  }

  async function withRoomHost(base, fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'delivery.live_room_base'`)).value_text;
    await q(`update public.platform_settings set value_text = $1
              where key = 'delivery.live_room_base'`, [base]);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'delivery.live_room_base'`, [before ?? '']);
    }
  }

  const schedule = async (actor, courseId, over = {}) =>
    (await asActor(actor,
      `select public.schedule_live_session($1,$2,$3,$4,$5,$6,null) r`,
      [courseId, over.title ?? 'Tafsir circle',
        over.starts ?? new Date(Date.now() + 3600_000).toISOString(),
        over.ends ?? new Date(Date.now() + 7200_000).toISOString(),
        over.zone ?? 'Africa/Kampala',
        over.description ?? null])).rows[0].r;

  // ---------------------------------------------------------------------------
  // Scheduling
  // ---------------------------------------------------------------------------
  await test('a class keeps its zone and its room, and only the author can open one', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);

    assert(session.scheduled_zone === 'Africa/Kampala', `zone ${session.scheduled_zone}`);
    assert(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(session.room_slug),
      `room slug ${session.room_slug}`);

    const stranger = await adult('Not The Teacher');
    await rejects(() => schedule(stranger.userId, course),
      'a stranger scheduled a live class on somebody else\'s course');

    await rejects(() => schedule(teacher, course, { zone: 'Mars/Olympus' }),
      'a class was scheduled in a time zone that does not exist');
    await rejects(() => schedule(teacher, course, {
      starts: new Date(Date.now() + 7200_000).toISOString(),
      ends: new Date(Date.now() + 3600_000).toISOString(),
    }), 'a class was scheduled to end before it starts');
  });

  // ---------------------------------------------------------------------------
  // Joining
  // ---------------------------------------------------------------------------
  await test('an unenrolled learner cannot enter, whatever the clock says', async () => withLive(async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course, {
      starts: new Date(Date.now() - 60_000).toISOString(),
      ends: new Date(Date.now() + 3600_000).toISOString(),
    });
    const outsider = await adult('Outsider');

    const state = await scalar(
      'select public.live_session_joinable($1,$2) s', [session.id, outsider.learnerId]);
    assert(state.s.joinable === false, 'an unenrolled learner was told they could join');
    assert(state.s.reason === 'not_enrolled', `reason ${state.s.reason}`);

    // The refusal is a returned state, not an exception: a screen has to be able
    // to say why the door is shut, and a learner who has not bought the course
    // deserves the sentence rather than a database error.
    const attempt = (await asActor(outsider.userId,
      'select public.join_live_session($1,$2) r', [session.id, outsider.learnerId])).rows[0].r;
    assert(attempt.joined === false, 'an unenrolled learner joined a live class');
    assert(attempt.reason === 'not_enrolled', `reason ${attempt.reason}`);
  }));

  await test('the room opens inside its window and not before', async () => withLive(async () => {
    const { course, version } = await openCourse();
    const me = await adult('Punctual Learner');
    await enrol(me.userId, me.learnerId, course, version);

    const future = await schedule(teacher, course, {
      starts: new Date(Date.now() + 6 * 3600_000).toISOString(),
      ends: new Date(Date.now() + 7 * 3600_000).toISOString(),
    });
    const early = await scalar(
      'select public.live_session_joinable($1,$2) s', [future.id, me.learnerId]);
    assert(early.s.joinable === false && early.s.reason === 'not_open_yet',
      `early join said ${early.s.reason}`);

    const now = await schedule(teacher, course, {
      starts: new Date(Date.now() - 5 * 60_000).toISOString(),
      ends: new Date(Date.now() + 3600_000).toISOString(),
    });
    const open = await scalar(
      'select public.live_session_joinable($1,$2) s', [now.id, me.learnerId]);
    assert(open.s.joinable === true, `an open class refused: ${open.s.reason}`);
  }));

  await test('with no room host, joining says so instead of handing out a URL', async () => withLive(async () => {
    const { course, version } = await openCourse();
    const me = await adult('Waiting Learner');
    await enrol(me.userId, me.learnerId, course, version);
    const session = await schedule(teacher, course, {
      starts: new Date(Date.now() - 60_000).toISOString(),
      ends: new Date(Date.now() + 3600_000).toISOString(),
    });

    const result = (await asActor(me.userId,
      'select public.join_live_session($1,$2) r', [session.id, me.learnerId])).rows[0].r;

    assert(result.joined === false, 'a room was handed out with no host configured');
    assert(result.reason === 'no_room_host', `reason ${result.reason}`);
    assert(result.roomUrl === undefined, 'a URL was returned anyway');
  }));

  await test('with a room host, joining records the arrival and returns the address', async () => withLive(async () => {
    await withRoomHost('https://meet.example.org/', async () => {
      const { course, version } = await openCourse();
      const me = await adult('Arriving Learner');
      await enrol(me.userId, me.learnerId, course, version);
      const session = await schedule(teacher, course, {
        starts: new Date(Date.now() - 60_000).toISOString(),
        ends: new Date(Date.now() + 3600_000).toISOString(),
      });

      const result = (await asActor(me.userId,
        'select public.join_live_session($1,$2) r', [session.id, me.learnerId])).rows[0].r;

      assert(result.joined === true, `join failed: ${result.reason}`);
      assert(result.roomUrl === `https://meet.example.org/room/${session.room_slug}`,
        `url ${result.roomUrl}`);

      const attendance = await scalar(
        `select joined_at, left_at from public.live_session_attendance
          where session_id = $1 and learner_profile_id = $2`,
        [session.id, me.learnerId]);
      assert(attendance !== undefined, 'arriving did not record attendance');
      assert(attendance.left_at === null, 'the learner was marked gone on arrival');

      // A second press is the same arrival, not a second one.
      await asActor(me.userId, 'select public.join_live_session($1,$2)', [session.id, me.learnerId]);
      const count = await scalar(
        `select count(*)::int n from public.live_session_attendance
          where session_id = $1 and learner_profile_id = $2`, [session.id, me.learnerId]);
      assert(count.n === 1, `${count.n} attendance rows for one learner`);
    });
  }));

  await test('leaving records how long they were there, and the roll is the teacher\'s', async () => withLive(async () => {
    await withRoomHost('https://meet.example.org', async () => {
      const { course, version } = await openCourse();
      const me = await adult('Attending Learner');
      await enrol(me.userId, me.learnerId, course, version);
      const session = await schedule(teacher, course, {
        starts: new Date(Date.now() - 60_000).toISOString(),
        ends: new Date(Date.now() + 3600_000).toISOString(),
      });

      await asActor(me.userId, 'select public.join_live_session($1,$2)', [session.id, me.learnerId]);
      const left = (await asActor(me.userId,
        'select public.record_live_attendance($1,$2,true) r', [session.id, me.learnerId])).rows[0].r;
      assert(left.left_at !== null, 'leaving did not stamp a departure');
      assert(left.minutes_present === 0, `minutes ${left.minutes_present}`);

      const roll = (await asActor(teacher,
        'select * from public.live_session_roster($1)', [session.id])).rows;
      assert(roll.length === 1, `the teacher saw ${roll.length} attendees`);
      assert(roll[0].display_name === 'Attending Learner', `name ${roll[0].display_name}`);

      const outsider = await adult('Curious');
      const empty = (await asActor(outsider.userId,
        'select * from public.live_session_roster($1)', [session.id])).rows;
      assert(empty.length === 0, 'a stranger read the class roll');
    });
  }));

  // ---------------------------------------------------------------------------
  // The learner's list
  // ---------------------------------------------------------------------------
  await test('the class list appears only while the feature is on, and only for entitled learners', async () => {
    const { course, version } = await openCourse();
    const me = await adult('Listed Learner');
    await enrol(me.userId, me.learnerId, course, version);
    await schedule(teacher, course);

    const off = (await asActor(me.userId,
      'select * from public.my_live_sessions(null)')).rows;
    assert(off.length === 0, 'sessions were listed with delivery.live_classes off');

    await withLive(async () => {
      const on = (await asActor(me.userId,
        'select * from public.my_live_sessions(null)')).rows;
      assert(on.length === 1, `${on.length} sessions listed`);
      assert(on[0].course_title.startsWith('Live Course'), `title ${on[0].course_title}`);
      assert(on[0].scheduled_zone === 'Africa/Kampala', `zone ${on[0].scheduled_zone}`);
      assert(on[0].attended === false, 'a learner who never came was marked present');

      const outsider = await adult('No Course');
      const theirs = (await asActor(outsider.userId,
        'select * from public.my_live_sessions(null)')).rows;
      assert(theirs.length === 0, 'a learner outside the course saw its sessions');
    });
  });

  // ---------------------------------------------------------------------------
  // Cancelling
  // ---------------------------------------------------------------------------
  await test('cancelling needs a reason, and the reason reaches the learner', async () => withLive(async () => {
    const { course, version } = await openCourse();
    const me = await adult('Disappointed Learner');
    await enrol(me.userId, me.learnerId, course, version);
    const session = await schedule(teacher, course);

    await rejects(() => asActor(teacher,
      'select public.cancel_live_session($1,$2)', [session.id, '  ']),
      'a class was cancelled with no reason');

    await asActor(teacher, 'select public.cancel_live_session($1,$2)',
      [session.id, 'Teacher is unwell']);

    const row = (await asActor(me.userId,
      'select status, cancelled_reason, joinable from public.my_live_sessions(null)')).rows[0];
    assert(row.status === 'cancelled', `status ${row.status}`);
    assert(row.cancelled_reason === 'Teacher is unwell', `reason ${row.cancelled_reason}`);
    assert(row.joinable === false, 'a cancelled class was still joinable');

    await rejects(() => asActor(teacher,
      'select public.cancel_live_session($1,$2)', [session.id, 'again']),
      'a class was cancelled twice');
  }));

  await test('nobody can join a learner they are not responsible for', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);
    const stranger = await adult('Interloper');

    // `can_access_learner` is the boundary, and it is a refusal rather than a
    // state: asking about somebody else's child is not a legitimate question.
    await rejects(() => asActor(stranger.userId,
      'select public.join_live_session($1,$2)', [session.id, teacher]),
      'a stranger joined a class on somebody else\'s behalf');
  });
}
