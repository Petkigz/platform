// Closing an account.
//
// The two halves of the rule this suite pins:
//
//   what the person wrote is deleted
//   what the platform recorded is kept, and de-identified
//
// and the three refusals that keep it from being a way to walk away from work
// other people are relying on.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asAnon, bootstrapAdmin,
    newUser, newProfile, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('erase-admin@example.com');
  const teacher = await newInstructor('erase-teacher@example.com', admin);
  const reviewer = await newReviewer('erase-reviewer@example.com', admin);

  const count = async (sql, params = []) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

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

  const eraseAs = async (actor, confirm) =>
    (await asActor(actor, 'select public.erase_my_account($1) r', [confirm])).rows[0].r;

  let seq = 0;
  async function adult(name) {
    seq += 1;
    const userId = await newUser(`erase-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'erasure test']);

  async function publishedCourse({ certificate = false } = {}) {
    seq += 1;
    const course = await newCourse(teacher, { status: 'active', title: `Erase Course ${seq}` });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await newLesson(section);
    if (certificate) {
      await q(`insert into public.course_completion_policies
                 (course_version_id, completion_mode, certificate_enabled, certificate_template_version)
               values ($1,'all_lessons',true,1)`, [version]);
    }
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version, lesson };
  }

  async function enrolAs(actor, learnerId, course, version) {
    const result = await asActor(actor,
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`, [learnerId, course, version]);
    return result.rows[0].id;
  }

  /** Open a flag for the length of one test, then put it back. */
  async function withFlag(key, fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = $1`, [key])).value_text;
    await q(`update public.platform_settings set value_text = 'true' where key = $1`, [key]);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1 where key = $2`, [before, key]);
    }
  }

  // ---------------------------------------------------------------------------
  // What is deleted
  // ---------------------------------------------------------------------------
  await test('what the person wrote goes with them', async () => {
    const me = await adult('Erasing Adult');
    const course = await publishedCourse();
    const enrolmentId = await enrolAs(me.userId, me.learnerId, course.course, course.version);

    await withFlag('learning.notes_bookmarks', async () => {
      await asActor(me.userId,
        `insert into public.lesson_notes
           (user_id, learner_profile_id, course_enrolment_id, lesson_id, body)
         values ($1,$2,$3,$4,'a note')`,
        [me.userId, me.learnerId, enrolmentId, course.lesson]);
      await asActor(me.userId,
        `insert into public.lesson_bookmarks
           (user_id, learner_profile_id, course_enrolment_id, lesson_id)
         values ($1,$2,$3,$4)`,
        [me.userId, me.learnerId, enrolmentId, course.lesson]);
    });

    await withFlag('learning.wishlist', async () => {
      await asActor(me.userId,
        'insert into public.course_wishlist (user_id, course_id, note) values ($1,$2,$3)',
        [me.userId, course.course, 'for later']);
    });

    const result = await eraseAs(me.userId, 'Erasing Adult');

    assert(result.closed === true, 'the account did not report itself closed');
    assert(result.alreadyClosed === false, 'a first erase reported itself as a second');
    assert(result.removed.notes === 1, `notes removed: ${result.removed.notes}`);
    assert(result.removed.bookmarks === 1, `bookmarks removed: ${result.removed.bookmarks}`);
    assert(result.removed.savedCourses === 1, `saved: ${result.removed.savedCourses}`);

    assert(await count('select 1 from public.lesson_notes where user_id = $1', [me.userId]) === 0,
      'a note survived');
    assert(await count('select 1 from public.lesson_bookmarks where user_id = $1', [me.userId]) === 0,
      'a bookmark survived');
    assert(await count('select 1 from public.course_wishlist where user_id = $1', [me.userId]) === 0,
      'a saved course survived');
  });

  // ---------------------------------------------------------------------------
  // What is kept
  // ---------------------------------------------------------------------------
  await test('the account row stays, closed and without a name on it', async () => {
    const me = await adult('Anonymous Please');
    const result = await eraseAs(me.userId, 'Anonymous Please');
    assert(result.closed === true);

    const profile = await scalar(
      `select display_name, account_status, deleted_at, timezone, avatar_path
         from public.user_profiles where user_id = $1`, [me.userId]);
    assert(profile.display_name === 'Deleted account', `name is ${profile.display_name}`);
    assert(profile.account_status === 'closed', `status is ${profile.account_status}`);
    assert(profile.deleted_at !== null, 'deleted_at was not set');
    assert(profile.timezone === null, 'the time zone survived');

    assert(await count(
      `select 1 from public.governance_audit_events
        where action = 'account.closed_by_owner' and target_id = $1`, [me.userId]) === 1,
      'the closure was not audited');
  });

  await test('the study record survives the learner profile it belonged to', async () => {
    const me = await adult('Still Enrolled');
    const course = await publishedCourse();
    const enrolmentId = await enrolAs(me.userId, me.learnerId, course.course, course.version);

    await eraseAs(me.userId, 'Still Enrolled');

    const enrolment = await scalar(
      `select id, learner_profile_id from public.course_enrolments where id = $1`,
      [enrolmentId]);
    assert(enrolment !== undefined, 'the enrolment was deleted with the account');
    assert(enrolment.learner_profile_id === me.learnerId, 'the enrolment was re-pointed');

    const learner = await scalar(
      `select display_name, status, deleted_at from public.learner_profiles where id = $1`,
      [me.learnerId]);
    assert(learner.display_name === 'Deleted learner', `learner name is ${learner.display_name}`);
    assert(learner.deleted_at !== null, 'the learner profile was not closed');
  });

  await test('a certificate keeps its number and loses the holder', async () => {
    const me = await adult('Certified Adult');
    const course = await publishedCourse({ certificate: true });
    const enrolmentId = await enrolAs(me.userId, me.learnerId, course.course, course.version);

    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
             values ($1,$2,'completed',100,now(),now())`, [enrolmentId, course.lesson]);

    const before = await scalar(
      'select certificate_number, learner_display_name from public.certificates where id = $1',
      [(await scalar('select id from public.issue_certificate($1,$2)', [enrolmentId, admin])).id]);
    assert(before.learner_display_name === 'Certified Adult', 'the fixture certificate has no name');

    await eraseAs(me.userId, 'Certified Adult');

    const after = await scalar(
      'select certificate_number, learner_display_name from public.certificates where certificate_number = $1',
      [before.certificate_number]);
    assert(after !== undefined, 'the certificate was deleted with the account');
    assert(after.certificate_number === before.certificate_number, 'the number changed');
    assert(after.learner_display_name === 'Deleted learner',
      `the holder's name survived as ${after.learner_display_name}`);
  });

  // ---------------------------------------------------------------------------
  // Children
  // ---------------------------------------------------------------------------
  await test('a child goes with the last adult, not with the first', async () => {
    const first = await adult('First Parent');
    const second = await adult('Second Parent');

    const familyId = (await scalar(
      `insert into public.families (name, created_by) values ('Erase family', $1) returning id`,
      [first.userId])).id;
    for (const [who, type] of [[first, 'owner'], [second, 'guardian']]) {
      await q(`insert into public.family_memberships
                 (family_id, user_id, membership_type, status, joined_at)
               values ($1,$2,$3,'active',now())`, [familyId, who.userId, type]);
    }
    const childId = (await scalar(
      `insert into public.learner_profiles (family_id, display_name, learner_type, age_band)
       values ($1,'Child Of Two','child','8-10') returning id`, [familyId])).id;

    await eraseAs(first.userId, 'First Parent');
    assert(await count('select 1 from public.learner_profiles where id = $1 and deleted_at is null',
      [childId]) === 1, 'the child was erased while another adult still had them');

    await eraseAs(second.userId, 'Second Parent');
    const child = await scalar('select display_name, deleted_at from public.learner_profiles where id = $1',
      [childId]);
    assert(child.deleted_at !== null, 'the last adult left a live child profile behind');
    assert(child.display_name === 'Deleted learner', `child name is ${child.display_name}`);
  });

  // ---------------------------------------------------------------------------
  // Refusals
  // ---------------------------------------------------------------------------
  await test('a wrong confirmation closes nothing', async () => {
    const me = await adult('Exact Name');
    await rejects(() => eraseAs(me.userId, 'exact name'),
      'a mis-typed confirmation closed the account');
    await rejects(() => eraseAs(me.userId, ''),
      'an empty confirmation closed the account');

    const profile = await scalar(
      'select display_name, account_status, deleted_at from public.user_profiles where user_id = $1',
      [me.userId]);
    assert(profile.display_name === 'Exact Name', 'the account changed despite the refusal');
    assert(profile.account_status === 'active', 'the account was closed despite the refusal');
    assert(profile.deleted_at === null, 'the account was deleted despite the refusal');
  });

  await test('a teacher with work in flight cannot walk away from it', async () => {
    const course = await newCourse(teacher, { status: 'active', title: 'Erase Teacher Course' });
    const version = await newVersion(course, teacher);
    await transition(version, 'submitted', teacher);

    await rejects(() => eraseAs(teacher, 'Erase Teacher'),
      'a teacher closed an account holding a course in review');

    const profile = await scalar(
      'select account_status from public.user_profiles where user_id = $1', [teacher]);
    assert(profile.account_status === 'active', 'the refusal still closed the account');
  });

  await test('a second press answers the same way and changes nothing', async () => {
    const me = await adult('Twice Closed');
    await eraseAs(me.userId, 'Twice Closed');
    const again = await eraseAs(me.userId, 'Twice Closed');
    assert(again.closed === true, 'the second press did not answer closed');
    assert(again.alreadyClosed === true, 'the second press looked like a first');
    assert(again.learnersErased === 0, 'the second press erased learners again');
  });

  await test('a signed-out caller cannot close anything, and cannot reach the function', async () => {
    await rejects(() => asAnon('select public.erase_my_account($1)', ['nobody']),
      'an anonymous caller reached the erasure function');
  });
}
