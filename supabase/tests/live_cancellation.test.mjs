// A cancelled class, and the people who were going to be there.
//
// `cancel_live_session()` has existed since live classes were built. It demands a
// reason, refuses a second cancellation, audits itself, and is covered by
// `live_classes.test.mjs`. What no test could cover is the two things that were
// missing around it, because neither existed:
//
//   1. **Nothing in the product could reach it.** The teacher's screen renders a
//      cancelled class and its reason — a branch that had never run — and offers
//      no way to make one. That is the same class of defect as a certificate that
//      can be issued but never asked for, and the test for it is simply that the
//      screen's own path works.
//   2. **Cancelling told nobody.** A learner found out by opening the room and
//      finding it shut, which means they found out on arrival. The platform has a
//      notification centre; a class being cancelled was not one of the things in
//      it.
//
// The second one carries all the judgement, so most of this suite is about who is
// told: the adult themselves, the *guardian* of a child rather than the child,
// one message per person however many of their children are enrolled, the teacher
// when staff cancel, and never the person who pressed the button. Then the cap —
// because a cancellation that writes a thousand rows in one transaction is a
// cancellation that can half-happen — and the honest reporting of it.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('cancel-admin@example.com');
  const teacher = await newInstructor('cancel-teacher@example.com', admin);
  const otherTeacher = await newInstructor('cancel-other@example.com', admin);
  const reviewer = await newReviewer('cancel-reviewer@example.com', admin);

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

  /** An adult who studies: an account and a learner profile joined to it. */
  async function adult(name) {
    seq += 1;
    const userId = await newUser(`cancel-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  /** A guardian: an account with no learner profile of its own. */
  async function guardian(name) {
    seq += 1;
    const userId = await newUser(`cancel-guardian-${seq}@example.com`);
    await newProfile(userId, name);
    return { userId, name };
  }

  /** A child in a family, with one or more verified guardians. */
  async function child(name, guardians) {
    seq += 1;
    const familyId = (await scalar(
      `insert into public.families (name, created_by) values ($1,$2) returning id`,
      [`Family ${seq}`, guardians[0].userId])).id;
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, family_id)
       values ($1,'child','8-10',$2) returning id`, [name, familyId])).id;
    for (const g of guardians) {
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
    const course = await newCourse(owner, { status: 'active', title: `Cancel Course ${seq}` });
    const version = await newVersion(course, owner);
    const section = await newSection(version);
    await newLesson(section);
    await q('select public.set_course_version_status($1,$2,$3,$4)',
      [version, 'submitted', owner, 'live cancel test']);
    await q('select public.set_course_version_status($1,$2,$3,$4)',
      [version, 'approved', reviewer, 'live cancel test']);
    await satisfyReview(version, reviewer, admin);
    await q('select public.set_course_version_status($1,$2,$3,$4)',
      [version, 'published', admin, 'live cancel test']);
    return { course, version };
  }

  const enrol = (learnerId, course, version) => q(
    `insert into public.course_enrolments
       (learner_profile_id, course_id, course_version_id, source, status)
     values ($1,$2,$3,'free','active') returning id`, [learnerId, course, version]);

  const schedule = async (owner, courseId, over = {}) =>
    (await asActor(owner,
      `select public.schedule_live_session($1,$2,$3,$4,$5,$6,null) r`,
      [courseId, over.title ?? 'Tafsir circle',
        over.starts ?? new Date(Date.now() + 3600_000).toISOString(),
        over.ends ?? new Date(Date.now() + 7200_000).toISOString(),
        over.zone ?? 'Africa/Kampala',
        null])).rows[0].r;

  const notifyCount = (userId) => count(
    `select count(*)::int n from public.notifications
      where user_id = $1 and kind = 'live_cancelled'`, [userId]);

  // -------------------------------------------------------------------------
  console.log('\nAct I — who a cancellation is about');
  // -------------------------------------------------------------------------

  await test('the teacher is told how many learners, and how many separate people', async () => {
    const { course, version } = await openCourse();
    const mother = await guardian('Mother Of Two');
    const one = await child('Child One', [mother]);
    const two = await child('Child Two', [mother]);
    const solo = await adult('Adult Learner');
    await enrol(one.learnerId, course, version);
    await enrol(two.learnerId, course, version);
    await enrol(solo.learnerId, course, version);
    const session = await schedule(teacher, course);

    const audience = await call(teacher, 'select public.live_session_audience($1) as r', [session.id]);
    assert(audience.learners === 3, `audience counted ${audience.learners} learners`);
    // Two children of one mother are two learners and one person to tell.
    assert(audience.people === 2,
      `audience counted ${audience.people} people for one adult plus one mother`);
    assert(audience.willTell === 2, `willTell ${audience.willTell}`);
    assert(audience.capped === false);
    assert(audience.title === 'Tafsir circle', `title ${audience.title}`);
  });

  await test('nobody else can read who is in a class', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);
    const stranger = await adult('Not Your Class');

    await rejects(() => call(stranger.userId, 'select public.live_session_audience($1) as r', [session.id]),
      /only the teacher hosting/i);
    // Staff may, because staff are who ends a teacher's account.
    const staffView = await call(admin, 'select public.live_session_audience($1) as r', [session.id]);
    assert(staffView.learners === 0, `staff read ${staffView.learners} learners from an empty class`);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — cancelling is the act of telling them');
  // -------------------------------------------------------------------------

  await test('an adult learner is told once, and the message says which class and why', async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Adult Who Was Coming');
    await enrol(learner.learnerId, course, version);
    const session = await schedule(teacher, course);

    const before = await notifyCount(learner.userId);
    const result = await call(teacher, 'select public.cancel_live_session($1,$2) as r',
      [session.id, 'Teacher is unwell']);

    assert(result.status === 'cancelled', `status ${result.status}`);
    assert(result.notified === 1, `notified ${result.notified}`);
    assert(result.people === 1, `people ${result.people}`);
    assert(result.capped === false);

    const note = (await scalar(
      `select title, body, href, severity, kind from public.notifications
        where user_id = $1 and kind = 'live_cancelled'`, [learner.userId]));
    assert(note, 'the learner was not told');
    assert(/Tafsir circle/.test(note.title), `title does not name the class: ${note.title}`);
    assert(/Teacher is unwell/.test(note.body), `body does not carry the reason: ${note.body}`);
    assert(/Africa\/Kampala/.test(note.body), `body does not say when it was: ${note.body}`);
    assert(note.href === `/live/${session.id}`, `href ${note.href}`);
    assert(note.severity === 'warning', `severity ${note.severity}`);
    assert(await notifyCount(learner.userId) === before + 1, 'the learner was told more than once');
  });

  await test('a child is not told: their guardian is, because a child profile has no login', async () => {
    const { course, version } = await openCourse();
    const mother = await guardian('Guardian Of One');
    const kid = await child('Child Learner', [mother]);
    await enrol(kid.learnerId, course, version);
    const session = await schedule(teacher, course);

    const result = await call(teacher, 'select public.cancel_live_session($1,$2) as r',
      [session.id, 'Room host is down']);
    assert(result.notified === 1, `notified ${result.notified}, expected the one guardian`);

    const toMother = await count(
      `select count(*)::int n from public.notifications
        where user_id = $1 and kind = 'live_cancelled'`, [mother.userId]);
    assert(toMother === 1, `the guardian received ${toMother} messages`);
    // The child profile is not. There is no account to write to, and the count
    // of people is a count of accounts — which is what made the fan-out honest.
    assert(result.people === 1, `people ${result.people}`);
  });

  await test('a guardian with two children in one class is told once, not twice', async () => {
    const { course, version } = await openCourse();
    const father = await guardian('Father Of Two');
    const a = await child('First Child', [father]);
    const b = await child('Second Child', [father]);
    await enrol(a.learnerId, course, version);
    await enrol(b.learnerId, course, version);
    const session = await schedule(teacher, course);

    const result = await call(teacher, 'select public.cancel_live_session($1,$2) as r',
      [session.id, 'Snow']);
    assert(result.notified === 1, `notified ${result.notified} for one parent of two children`);
    assert(await notifyCount(father.userId) === 1, 'the parent was told twice for two children');
  });

  await test('the person who cancelled is not told about their own act', async () => {
    const { course, version } = await openCourse();
    // A teacher who is also a learner on the course they teach: the case that
    // would otherwise send somebody a notification about a thing they just did.
    const ownLearnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Teacher As Learner','adult','18+',$1) returning id`, [teacher])).id;
    await enrol(ownLearnerId, course, version);
    const session = await schedule(teacher, course);

    const audience = await call(teacher, 'select public.live_session_audience($1) as r', [session.id]);
    assert(audience.people === 0,
      `the audience included the person about to press the button (${audience.people})`);

    const result = await call(teacher, 'select public.cancel_live_session($1,$2) as r',
      [session.id, 'Teacher unwell']);
    assert(result.notified === 0, `notified ${result.notified}`);
    assert(result.people === 0, `people ${result.people}`);
    const asTeacher = await count(
      `select count(*)::int n from public.notifications
        where user_id = $1 and kind = 'live_cancelled'`, [teacher]);
    assert(asTeacher === 0, `the cancelling teacher was sent ${asTeacher} message(s) about their own act`);
    // Enrolled learners are still counted: it is people who can be told that
    // the number is about, not learners.
    assert(audience.learners === 1, `audience counted ${audience.learners} learners`);
  });

  await test('staff cancelling a class tells the teacher who was going to teach it', async () => {
    const { course } = await openCourse();
    const session = await schedule(teacher, course);

    const result = await call(admin, 'select public.cancel_live_session($1,$2) as r',
      [session.id, 'Taken down after a safeguarding report']);
    assert(result.notified === 1, `notified ${result.notified}`);
    assert(await notifyCount(teacher) === 1,
      'a teacher whose class was cancelled by staff was not told');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — the refusals that must survive');
  // -------------------------------------------------------------------------

  await test('a refusal cancels nothing and tells nobody', async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Waited For A Class');
    await enrol(learner.learnerId, course, version);
    const session = await schedule(teacher, course);

    await rejects(() => call(teacher, 'select public.cancel_live_session($1,$2) as r',
      [session.id, '   ']), /say why/i);
    await rejects(() => call(otherTeacher, 'select public.cancel_live_session($1,$2) as r',
      [session.id, 'not mine']), /only the teacher hosting/i);

    const row = await scalar('select status from public.live_sessions where id = $1', [session.id]);
    assert(row.status === 'scheduled', `the class is ${row.status} after two refusals`);
    assert(await notifyCount(learner.userId) === 0, 'a refused cancellation still told a learner');
  });

  await test('cancelling twice is refused, and the audience hears from it once', async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Told Once');
    await enrol(learner.learnerId, course, version);
    const session = await schedule(teacher, course);

    await call(teacher, 'select public.cancel_live_session($1,$2) as r', [session.id, 'First']);
    await rejects(() => call(teacher, 'select public.cancel_live_session($1,$2) as r',
      [session.id, 'Second']), /already ended or cancelled/i);

    assert(await notifyCount(learner.userId) === 1,
      `the learner received ${await notifyCount(learner.userId)} messages`);
  });

  await test('a class that already ended cannot be cancelled as if it had not happened', async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Attended');
    await enrol(learner.learnerId, course, version);
    const session = await schedule(teacher, course, {
      starts: new Date(Date.now() - 7200_000).toISOString(),
      ends: new Date(Date.now() - 3600_000).toISOString(),
    });
    await q(`update public.live_sessions set status = 'ended' where id = $1`, [session.id]);

    await rejects(() => call(teacher, 'select public.cancel_live_session($1,$2) as r',
      [session.id, 'Too late']), /already ended or cancelled/i);
    assert(await notifyCount(learner.userId) === 0, 'a finished class was announced as cancelled');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — the cap, and saying so');
  // -------------------------------------------------------------------------

  await test('past the cap the class is still cancelled, 200 people are told, and it says so', async () => {
    // A course with a thousand enrolments would otherwise write a thousand rows
    // inside the transaction that cancels the class. The cap is 200; what
    // matters is that the return says how many were reached rather than
    // reporting the whole audience as told.
    const { course, version } = await openCourse();
    await q(`insert into auth.users (id, email)
             select gen_random_uuid(), 'cancel-bulk-' || g || '@example.com'
               from generate_series(1, 210) g`);
    await q(`insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
             select u.email, 'adult', '18+', u.id
               from auth.users u where u.email like 'cancel-bulk-%@example.com'`);
    await q(`insert into public.course_enrolments
               (learner_profile_id, course_id, course_version_id, source, status)
             select lp.id, $1, $2, 'free', 'active'
               from public.learner_profiles lp
               join auth.users u on u.id = lp.linked_user_id
              where u.email like 'cancel-bulk-%@example.com'`, [course, version]);
    const session = await schedule(teacher, course);

    const result = await call(teacher, 'select public.cancel_live_session($1,$2) as r',
      [session.id, 'Cap test']);
    assert(result.status === 'cancelled', 'the class was not cancelled because it was large');
    assert(result.notified === 200, `notified ${result.notified}, expected the cap of 200`);
    assert(result.people > 200, `people ${result.people}`);
    assert(result.capped === true, 'the receipt did not admit that some people were not told');

    const written = await count(
      `select count(*)::int n from public.notifications where kind = 'live_cancelled'
        and dedupe_key = $1`, [`live-cancel:${session.id}`]);
    assert(written === 200, `${written} messages were written for a capped class`);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct V — the room is shut, and the record is honest');
  // -------------------------------------------------------------------------

  await test('the room refuses the moment the class is cancelled, before the reason is read', async () => {
    const { course, version } = await openCourse();
    const learner = await adult('Turned Away');
    await enrol(learner.learnerId, course, version);
    const session = await schedule(teacher, course, {
      starts: new Date(Date.now() - 60_000).toISOString(),
      ends: new Date(Date.now() + 3600_000).toISOString(),
    });
    await call(teacher, 'select public.cancel_live_session($1,$2) as r', [session.id, 'Power cut']);

    const state = await call(learner.userId,
      'select public.join_live_session($1,$2) as r', [session.id, learner.learnerId]);
    assert(state.joined === false, 'a cancelled class could still be entered');
    assert(state.reason === 'cancelled', `reason ${state.reason}`);
  });

  await test('the audit says how many people were told, not only that it happened', async () => {
    const { course, version } = await openCourse();
    const a = await adult('Audit One');
    const b = await adult('Audit Two');
    await enrol(a.learnerId, course, version);
    await enrol(b.learnerId, course, version);
    const session = await schedule(teacher, course);

    await call(teacher, 'select public.cancel_live_session($1,$2) as r', [session.id, 'Audit test']);

    const event = await scalar(
      `select detail from public.governance_audit_events
        where action = 'teaching.live_session_cancelled' and target_id = $1`, [session.id]);
    assert(event, 'the cancellation was not audited');
    assert(event.detail.notified === 2, `audit notified ${event.detail.notified}`);
    assert(event.detail.people === 2, `audit people ${event.detail.people}`);
    assert(event.detail.reason === 'Audit test', `audit reason ${event.detail.reason}`);
  });
}
