// A recording of a class, and the one copy of it that exists.
//
// The feature is small and the boundary is not. Only the teacher is ever
// captured, so a recording holds no learner — but the *address* of one is a
// capability: whoever holds it can watch, whatever the platform thinks about
// them. So most of this suite is about the address never being in a row a
// learner can select, and about the difference between "there is no recording"
// and "it is not yours" being unobservable.
//
// What the tests pin, in order:
//
//   1. **The link is not on the session row.** The columns that promised one
//      were never written and are gone; the table that holds it has RLS on and
//      no policy, so no client can select it.
//   2. **Only the host, or staff, may attach it**, only to a class that has
//      ended, and never to a cancelled one.
//   3. **A URL a browser would execute is refused** — `https` only.
//   4. **Watching lasts as long as the enrolment does**, and no longer: a
//      withdrawn learner loses it in the same instant they lose the course.
//   5. **Telling the class is a choice**, deduped on the session, and the person
//      who attached it is never told about their own act.
//   6. **Taking one down needs a reason**, keeps the row, and does not put the
//      address in an append-only table.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('rec-admin@example.com');
  const teacher = await newInstructor('rec-teacher@example.com', admin);
  const otherTeacher = await newInstructor('rec-other@example.com', admin);
  const reviewer = await newReviewer('rec-reviewer@example.com', admin);

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const count = async (sql, params = []) => (await q(sql, params)).rows[0].n;

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

  const call = async (actor, sql, params = []) =>
    (await asActor(actor, sql, params)).rows[0].r;

  let seq = 0;

  async function adult(name) {
    seq += 1;
    const userId = await newUser(`rec-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  async function guardian(name) {
    seq += 1;
    const userId = await newUser(`rec-guardian-${seq}@example.com`);
    await newProfile(userId, name);
    return { userId, name };
  }

  async function child(name, owners) {
    seq += 1;
    const familyId = (await scalar(
      `insert into public.families (name, created_by) values ($1,$2) returning id`,
      [`Family ${seq}`, owners[0].userId])).id;
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, family_id)
       values ($1,'child','8-10',$2) returning id`, [name, familyId])).id;
    for (const g of owners) {
      await q(
        `insert into public.guardian_relationships
           (guardian_user_id, learner_profile_id, relationship_type, status,
            can_manage_profile, can_view_progress, can_manage_learning, verified_at)
         values ($1,$2,'parent','active',true,true,true,now())`,
        [g.userId, learnerId]);
    }
    return { learnerId, name, familyId };
  }

  async function openCourse(owner = teacher) {
    seq += 1;
    const course = await newCourse(owner, { status: 'active', title: `Recording Course ${seq}` });
    const version = await newVersion(course, owner);
    const section = await newSection(version);
    await newLesson(section);
    await q('select public.set_course_version_status($1,$2,$3,$4)',
      [version, 'submitted', owner, 'recording test']);
    await q('select public.set_course_version_status($1,$2,$3,$4)',
      [version, 'approved', reviewer, 'recording test']);
    await satisfyReview(version, reviewer, admin);
    await q('select public.set_course_version_status($1,$2,$3,$4)',
      [version, 'published', admin, 'recording test']);
    return { course, version };
  }

  const enrol = (learnerId, course, version) => q(
    `insert into public.course_enrolments
       (learner_profile_id, course_id, course_version_id, source, status)
     values ($1,$2,$3,'free','active') returning id`, [learnerId, course, version]);

  const schedule = async (owner, courseId, over = {}) =>
    (await asActor(owner,
      `select public.schedule_live_session($1,$2,$3,$4,$5,$6,$7) r`,
      [courseId, over.title ?? 'Tafsir circle',
        over.starts ?? new Date(Date.now() - 5400_000).toISOString(),
        over.ends ?? new Date(Date.now() - 1800_000).toISOString(),
        over.zone ?? 'Africa/Kampala',
        null,
        over.cohort ?? null])).rows[0].r;

  const attach = async (actor, sessionId, url, announce = false) =>
    call(actor, 'select public.attach_live_recording($1,$2,$3) as r', [sessionId, url, announce]);

  const canWatch = async (actor, sessionId) =>
    (await asActor(actor, 'select public.can_watch_live_recording($1) as ok', [sessionId]))
      .rows[0].ok;

  const link = async (actor, sessionId) =>
    (await asActor(actor, 'select public.live_recording_link($1) as l', [sessionId])).rows[0].l;

  const LINK = 'https://drive.example.com/ayahspring/tafsir-2026-11-01.mp4';

  async function withLive(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'delivery.live_classes'`)).value_text;
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'delivery.live_classes'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'delivery.live_classes'`, [before ?? 'false']);
    }
  }

  // -------------------------------------------------------------------------
  console.log('\nAct I — the address is not on the row');
  // -------------------------------------------------------------------------

  await test('the session row carries no recording address at all', async () => {
    // The two columns existed from the day live classes were built and were
    // never written. They are gone, because a column on a row an entitled
    // learner can select is a column that learner can read.
    const columns = (await q(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'live_sessions'
          and column_name like 'recording%'`)).rows.map((r) => r.column_name);
    assert(columns.length === 0, `live_sessions still has ${JSON.stringify(columns)}`);
  });

  await test('nobody can select the recording table directly', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);

    // `revoke all` is the first wall; RLS with no policy is the second. Either
    // answer is a refusal, and a learner must meet one of them.
    const learner = await adult('Curious Learner');
    let refused = false;
    try {
      await asActor(learner.userId, 'select reference from public.live_session_recordings');
    } catch {
      refused = true;
    }
    assert(refused, 'a learner could select the recording address out of the table');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — who may put one there');
  // -------------------------------------------------------------------------

  await test('the host attaches a recording to a class that has ended', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);

    const receipt = await attach(teacher, session.id, LINK);
    assert(receipt.sessionId === session.id, 'the receipt names another class');
    assert(receipt.replaced === false, 'a first attach was reported as a replacement');
    assert(receipt.announced === false, 'silence was not the default');

    const stored = await scalar(
      'select reference, attached_by, removed_at from public.live_session_recordings where session_id = $1',
      [session.id]);
    assert(stored.reference === LINK, `stored ${stored.reference}`);
    assert(stored.attached_by === teacher, 'the attach was recorded against somebody else');
    assert(stored.removed_at === null);
  });

  await test('a class that has not happened yet cannot have a recording', async () => {
    const { course } = await openCourse();
    const future = await schedule(teacher, course, {
      starts: new Date(Date.now() + 3600_000).toISOString(),
      ends: new Date(Date.now() + 7200_000).toISOString(),
    });
    await rejects(() => attach(teacher, future.id, LINK), /has not finished yet/i);
  });

  await test('a cancelled class has nothing to attach', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course, {
      starts: new Date(Date.now() - 5400_000).toISOString(),
      ends: new Date(Date.now() - 1800_000).toISOString(),
    });
    await asActor(teacher, 'select public.cancel_live_session($1,$2)',
      [session.id, 'the teacher was ill']);

    await rejects(() => attach(teacher, session.id, LINK), /was cancelled/i);
  });

  await test('only the host or staff may attach one, not the course author', async () => {
    const { course } = await openCourse(teacher);
    // Staff scheduled it, so staff is the host and the course author is not.
    const staffSession = await schedule(admin, course);
    await rejects(() => attach(teacher, staffSession.id, LINK),
      /only the teacher hosting a class/i);

    // And a stranger, and the learner in the class.
    const stranger = await adult('Not Your Teacher');
    await rejects(() => attach(stranger.userId, staffSession.id, LINK),
      /only the teacher hosting a class/i);

    // Staff may, which is how a school takes over when a teacher leaves.
    const receipt = await attach(admin, staffSession.id, LINK);
    assert(receipt.sessionId === staffSession.id, 'staff could not attach a recording');
  });

  await test('a link a browser would execute is not a recording link', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);

    await rejects(() => attach(teacher, session.id, 'javascript:alert(1)'),
      /must be an https address/i);
    await rejects(() => attach(teacher, session.id, 'data:text/html,<script>x</script>'),
      /must be an https address/i);
    await rejects(() => attach(teacher, session.id, 'http://drive.example.com/x.mp4'),
      /must be an https address/i);
    await rejects(() => attach(teacher, session.id, 'https://drive.example.com/a b.mp4'),
      /must be an https address/i);
    await rejects(() => attach(teacher, session.id, '   '), /link is required/i);
    await rejects(() => attach(teacher, session.id, `https://x.example/${'a'.repeat(2100)}`),
      /too long/i);

    const none = await count(
      'select count(*)::int n from public.live_session_recordings where session_id = $1',
      [session.id]);
    assert(none === 0, 'a refused address was written anyway');
  });

  await test('attaching again replaces the address and does not duplicate the row', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);

    await attach(teacher, session.id, LINK);
    const second = await attach(teacher, session.id, `${LINK}?v=2`);
    assert(second.replaced === true, 'a replacement was not reported as one');

    const rows = await count(
      'select count(*)::int n from public.live_session_recordings where session_id = $1',
      [session.id]);
    assert(rows === 1, `${rows} recording rows for one class`);

    const stored = await scalar(
      'select reference from public.live_session_recordings where session_id = $1', [session.id]);
    assert(stored.reference === `${LINK}?v=2`, 'the old address survived the replacement');
  });

  await test('the attach is on the record, and the record holds no address', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);

    const row = await scalar(
      `select actor, target_type, detail from public.governance_audit_events
        where action = 'teaching.live_recording_attached' and target_id = $1`, [session.id]);
    assert(row.actor === teacher, 'the attach was recorded against somebody else');
    assert(row.target_type === 'live_session', `target_type ${row.target_type}`);
    assert(row.detail.replaced === false, 'the detail lost whether this replaced one');
    assert(!JSON.stringify(row.detail).includes('https://'),
      'an audit event carries the recording address');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — who may watch');
  // -------------------------------------------------------------------------

  await test('an enrolled learner and their guardian may watch; a stranger may not', async () => withLive(async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Enrolled Learner');
    await enrol(learner.learnerId, course, version);

    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);

    assert(await canWatch(learner.userId, session.id) === true,
      'an enrolled learner could not watch the recording of their class');

    const outsider = await adult('Not Enrolled');
    assert(await canWatch(outsider.userId, session.id) === false,
      'a stranger could watch a class recording');
    await rejects(() => link(outsider.userId, session.id), /cannot watch that recording/i);

    // The teacher, staff and the author.
    assert(await canWatch(teacher, session.id) === true, 'the host could not watch');
    assert(await canWatch(admin, session.id) === true, 'staff could not watch');
  }));

  await test('a guardian watches on their child\'s enrolment, and the child has no login', async () => withLive(async () => {
    const { course, version } = await openCourse();
    const mother = await guardian('Mother');
    const kid = await child('Child', [mother]);
    await enrol(kid.learnerId, course, version);

    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);

    assert(await canWatch(mother.userId, session.id) === true,
      'a guardian could not watch the recording their child was entitled to');
    assert(await link(mother.userId, session.id) === LINK,
      'the guardian got a different address from the one the teacher attached');
  }));

  await test('watching lasts exactly as long as the enrolment does', async () => withLive(async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Leaving Learner');
    const enrolmentId = (await enrol(learner.learnerId, course, version)).rows[0].id;

    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);
    assert(await canWatch(learner.userId, session.id) === true, 'not watchable while enrolled');

    await q(`update public.course_enrolments set status = 'withdrawn' where id = $1`, [enrolmentId]);
    assert(await canWatch(learner.userId, session.id) === false,
      'a withdrawn learner could still watch the recording');

    await q(`update public.course_enrolments set status = 'active' where id = $1`, [enrolmentId]);
    assert(await canWatch(learner.userId, session.id) === true,
      'reinstating the enrolment did not restore the recording');
  }));

  await test('a cancelled class has no recording to watch, even with one attached', async () => withLive(async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Learner');
    await enrol(learner.learnerId, course, version);

    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);
    await asActor(teacher, 'select public.cancel_live_session($1,$2)',
      [session.id, 'a bereavement in the family']);

    assert(await canWatch(learner.userId, session.id) === false,
      'a recording stayed watchable after its class was cancelled');
  }));

  await test('"there is no recording" and "it is not yours" are the same answer', async () => withLive(async () => {
    const { course } = await openCourse();
    const withOne = await schedule(teacher, course, { title: 'With a recording' });
    await attach(teacher, withOne.id, LINK);
    const without = await schedule(teacher, course, { title: 'Without one' });

    const stranger = await adult('Nobody');

    let a = null;
    let b = null;
    try { await link(stranger.userId, withOne.id); } catch (e) { a = String(e.message); }
    try { await link(stranger.userId, without.id); } catch (e) { b = String(e.message); }
    assert(a !== null && b !== null, 'a stranger was handed a link');
    // The same sentence, so a stranger cannot use the difference to learn which
    // classes have recordings.
    assert(a === b, `two different answers: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }));

  await test('with live classes switched off, a learner stops watching and the teacher does not', async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Learner');
    await enrol(learner.learnerId, course, version);

    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);

    await q(`update public.platform_settings set value_text = 'false'
              where key = 'delivery.live_classes'`);
    try {
      assert(await canWatch(learner.userId, session.id) === false,
        'a learner could watch a recording with live classes switched off');
      // The teacher's own record is not a feature flag's business.
      assert(await canWatch(teacher, session.id) === true,
        'switching the feature off hid the teacher\'s own recording from them');
    } finally {
      await q(`update public.platform_settings set value_text = 'false'
                where key = 'delivery.live_classes'`);
    }
  });

  await test('a signed-out caller watches nothing', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);

    await q('begin');
    await q("select set_config('request.jwt.claims','',true)");
    await q('set local role authenticated');
    try {
      const ok = (await q('select public.can_watch_live_recording($1) as ok', [session.id]))
        .rows[0].ok;
      assert(ok === false, 'a signed-out caller was told they could watch a recording');
    } finally {
      await q('rollback');
    }
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — telling the class');
  // -------------------------------------------------------------------------

  await test('announcing reaches the adult, the guardian, and never the teacher', async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Adult Learner');
    const mother = await guardian('Mother');
    const kid = await child('Child', [mother]);
    await enrol(learner.learnerId, course, version);
    await enrol(kid.learnerId, course, version);

    const session = await schedule(teacher, course);
    const receipt = await attach(teacher, session.id, LINK, true);

    assert(receipt.announced === true);
    assert(receipt.people === 2, `expected two people, got ${receipt.people}`);
    assert(receipt.notified === 2, `expected two messages, got ${receipt.notified}`);

    const told = async (userId) => count(
      `select count(*)::int n from public.notifications
        where user_id = $1 and kind = 'live_recording_ready'`, [userId]);
    assert(await told(learner.userId) === 1, 'the adult learner was not told');
    assert(await told(mother.userId) === 1, 'the guardian was not told');
    assert(await told(teacher) === 0, 'the teacher was told about their own attach');

    const note = await scalar(
      `select title, href from public.notifications
        where user_id = $1 and kind = 'live_recording_ready'`, [mother.userId]);
    assert(note.href === `/live/${session.id}`, `the message points at ${note.href}`);
    assert(note.title.includes('Recording ready'), `title ${note.title}`);
  });

  await test('silence is the default, and attaching twice never sends twice', async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Learner');
    await enrol(learner.learnerId, course, version);
    const session = await schedule(teacher, course);

    const quiet = await attach(teacher, session.id, LINK);
    assert(quiet.announced === false && quiet.notified === 0, 'a silent attach sent something');

    const told = await count(
      `select count(*)::int n from public.notifications
        where user_id = $1 and kind = 'live_recording_ready'`, [learner.userId]);
    assert(told === 0, 'a silent attach wrote a message');

    await attach(teacher, session.id, LINK, true);
    await attach(teacher, session.id, `${LINK}?v=2`, true);

    const once = await count(
      `select count(*)::int n from public.notifications
        where user_id = $1 and kind = 'live_recording_ready'`, [learner.userId]);
    assert(once === 1, `the learner was told ${once} times about one class`);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct V — taking one down');
  // -------------------------------------------------------------------------

  await test('removing needs a reason and keeps the row', async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Learner');
    await enrol(learner.learnerId, course, version);
    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);

    await rejects(() => call(teacher, 'select public.remove_live_recording($1,$2) as r', [session.id, '']),
      /say why/i);
    await rejects(() => call(teacher, 'select public.remove_live_recording($1,$2) as r', [session.id, 'no']),
      /say why/i);

    const receipt = await call(teacher,
      'select public.remove_live_recording($1,$2) as r',
      [session.id, 'the wrong class was uploaded']);
    assert(receipt.removed === true);

    const row = await scalar(
      'select reference, removed_at, removed_by, removed_reason from public.live_session_recordings where session_id = $1',
      [session.id]);
    assert(row.removed_at !== null, 'the removal did not record when');
    assert(row.removed_by === teacher, 'the removal did not record who');
    assert(row.removed_reason === 'the wrong class was uploaded', `reason ${row.removed_reason}`);
    assert(row.reference === LINK, 'the row was deleted instead of withdrawn');

    await withLive(async () => {
      assert(await canWatch(learner.userId, session.id) === false,
        'a removed recording stayed watchable');
      await rejects(() => link(learner.userId, session.id), /cannot watch that recording/i);
    });

    await rejects(() => call(teacher, 'select public.remove_live_recording($1,$2) as r',
      [session.id, 'again']), /no recording on that class/i);
  });

  await test('a withdrawn recording can be put back, and the withdrawal is cleared', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);
    await call(teacher, 'select public.remove_live_recording($1,$2) as r',
      [session.id, 'pasted the wrong link']);

    const again = await attach(teacher, session.id, `${LINK}?fixed=1`);
    assert(again.replaced === true, 'restoring a withdrawn recording was reported as a first attach');

    const row = await scalar(
      'select reference, removed_at, removed_reason from public.live_session_recordings where session_id = $1',
      [session.id]);
    assert(row.removed_at === null && row.removed_reason === null,
      'a re-attached recording kept its withdrawal');
    assert(row.reference === `${LINK}?fixed=1`);
  });

  await test('the removal is on the record, with the reason and without the address', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);
    await call(teacher, 'select public.remove_live_recording($1,$2) as r',
      [session.id, 'wrong class']);

    const row = await scalar(
      `select actor, detail from public.governance_audit_events
        where action = 'teaching.live_recording_removed' and target_id = $1`, [session.id]);
    assert(row.actor === teacher);
    assert(row.detail.reason === 'wrong class', `detail ${JSON.stringify(row.detail)}`);
    assert(!JSON.stringify(row.detail).includes('https://'),
      'the removal record carries the address it removed');
  });

  await test('only the host or staff may take one down', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);

    const stranger = await adult('Stranger');
    await rejects(() => call(stranger.userId,
      'select public.remove_live_recording($1,$2) as r', [session.id, 'not mine']),
      /only the teacher hosting a class/i);

    const receipt = await call(admin,
      'select public.remove_live_recording($1,$2) as r',
      [session.id, 'safeguarding: withdrawing it']);
    assert(receipt.removed === true, 'staff could not take a recording down');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct VI — what the teacher\'s screen may know');
  // -------------------------------------------------------------------------

  await test('the teacher\'s list names which classes have a recording, and nobody else\'s does', async () => {
    const { course } = await openCourse();
    const withOne = await schedule(teacher, course, { title: 'Recorded' });
    await schedule(teacher, course, { title: 'Not recorded' });
    await attach(teacher, withOne.id, LINK);

    const list = (await asActor(teacher,
      'select session_id from public.teacher_live_recordings($1)', [course])).rows;
    assert(list.length === 1, `the teacher's list returned ${list.length} rows`);
    assert(list[0].session_id === withOne.id, 'the list names the wrong class');

    // Staff see it too; a learner and a stranger get an empty list rather than an
    // error that would tell them which classes have recordings.
    const staff = (await asActor(admin,
      'select session_id from public.teacher_live_recordings($1)', [course])).rows;
    assert(staff.length === 1, 'staff could not see which classes have recordings');

    const learner = await adult('Learner');
    const seen = (await asActor(learner.userId,
      'select session_id from public.teacher_live_recordings($1)', [course])).rows;
    assert(seen.length === 0, 'a learner could see which classes have recordings');
  });

  await test('a removed recording is not listed', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);
    await attach(teacher, session.id, LINK);
    await call(teacher, 'select public.remove_live_recording($1,$2) as r',
      [session.id, 'taken down']);

    const list = (await asActor(teacher,
      'select session_id from public.teacher_live_recordings($1)', [course])).rows;
    assert(list.length === 0, 'a removed recording is still listed as available');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct VII — the closed vocabulary');
  // -------------------------------------------------------------------------

  await test('the new kind is named by the preferences screen and can be switched off', async () => {
    const learner = await adult('Preference Reader');

    await withLive(async () => {
      const prefs = await call(learner.userId, 'select public.my_notification_preferences() as r');
      const kinds = prefs.map((p) => p.kind);
      assert(kinds.includes('live_recording_ready'),
        `the preferences screen does not name the new kind: ${kinds.join(', ')}`);

      const row = prefs.find((p) => p.kind === 'live_recording_ready');
      assert(row.available === true, 'the kind is unavailable while live classes are on');

      const set = await call(learner.userId,
        'select public.set_notification_preference($1,$2) as r',
        ['live_recording_ready', false]);
      assert(set.enabled === false, 'the kind could not be switched off');
      assert(set.locked === false, 'a class recording was treated as a locked message');

      await call(learner.userId,
        'select public.set_notification_preference($1,$2) as r',
        ['live_recording_ready', true]);
    });

    // Off with the feature: a switch for something the platform is not offering.
    const quiet = await call(learner.userId, 'select public.my_notification_preferences() as r');
    const row = quiet.find((p) => p.kind === 'live_recording_ready');
    assert(row.available === false, 'the kind is offered while live classes are off');
  });

  await test('the notifications table accepts the kind and refuses nonsense', async () => {
    await rejects(() => q(
      `insert into public.notifications (user_id, kind, title, body)
       values ($1, 'not_a_kind', 'x', 'y')`, [teacher]),
      /notifications_kind_check|violates check constraint/i);
  });

  // The flag has to go back to where it was found, because flags.test.mjs
  // asserts that nothing was released by accident.
  assert((await scalar(
    `select value_text from public.platform_settings where key = 'delivery.live_classes'`)).value_text
      === 'false', 'delivery.live_classes was left on');
}
