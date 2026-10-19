// Private lesson notes and bookmarks must remain tied to the signed-in owner,
// an accessible learner profile, and the exact lesson version in an enrolment.
export async function run(ctx) {
  const {
    q, test, assert, newUser, newProfile, newInstructor, newReviewer,
    bootstrapAdmin, satisfyReview, newCourse, newVersion, newSection, newLesson,
    asUser,
  } = ctx;

  const admin = await bootstrapAdmin('study-tools-admin@example.com');
  const teacher = await newInstructor('study-tools-teacher@example.com', admin);
  const reviewer = await newReviewer('study-tools-reviewer@example.com', admin);
  const learnerUser = await newUser('study-tools-learner@example.com');
  await newProfile(learnerUser, 'Private Notes Learner');
  const outsider = await newUser('study-tools-outsider@example.com');
  await newProfile(outsider, 'Outsider');
  const learnerId = (await q(
    `insert into public.learner_profiles(display_name, learner_type, linked_user_id)
     values ('Study Tools Learner','adult',$1) returning id`, [learnerUser])).rows[0].id;

  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lesson = await newLesson(section);
  const transition = (status, actor) => q(
    'select id from public.set_course_version_status($1,$2,$3,$4)',
    [version, status, actor, 'lesson study tools test'],
  );
  await transition('submitted', teacher);
  await transition('approved', reviewer);
  await satisfyReview(version, reviewer, admin);
  await transition('published', admin);

  async function committedAsUser(userId, fn) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: userId })]);
    await q('set local role authenticated');
    try { const result = await fn(); await q('commit'); return result; }
    catch (error) { await q('rollback'); throw error; }
  }
  async function rejectInSavepoint(fn, pattern) {
    await q('savepoint expected_rejection');
    let caught;
    try { await fn(); } catch (error) { caught = error; }
    await q('rollback to savepoint expected_rejection');
    await q('release savepoint expected_rejection');
    assert(caught, 'expected statement to be rejected');
    assert(pattern.test(String(caught.message ?? caught)), `expected ${pattern}, got ${caught.message ?? caught}`);
  }
  const enrolmentId = await committedAsUser(learnerUser, async () => (await q(
    `insert into public.course_enrolments
       (learner_profile_id,course_id,course_version_id,source,status)
     values ($1,$2,$3,'free','active') returning id`,
    [learnerId, course, version],
  )).rows[0].id);

  await test('notes and bookmarks are unusable while their admin flag is off', async () => {
    assert((await q("select value_text from public.platform_settings where key='learning.notes_bookmarks'")).rows[0].value_text === 'false');
    await asUser(learnerUser, async () => {
      await rejectInSavepoint(() => q(
        `insert into public.lesson_notes(user_id,learner_profile_id,course_enrolment_id,lesson_id,body)
         values($1,$2,$3,$4,'A private note')`,
        [learnerUser, learnerId, enrolmentId, lesson],
      ), /not enabled/i);
      assert((await q('select count(*)::int n from public.lesson_notes')).rows[0].n === 0);
    });
  });

  await q("update public.platform_settings set value_text='true' where key='learning.notes_bookmarks'");
  try {
    await test('a learner can create a note and the database assigns the signed-in owner', async () => {
      await committedAsUser(learnerUser, async () => {
        const row = (await q(
          `insert into public.lesson_notes(user_id,learner_profile_id,course_enrolment_id,lesson_id,body)
           values($1,$2,$3,$4,'  Remember the main definition.  ') returning user_id,body`,
          [outsider, learnerId, enrolmentId, lesson],
        )).rows[0];
        assert(row.user_id === learnerUser, 'caller could save a note as somebody else');
        assert(row.body === 'Remember the main definition.', 'note whitespace was not normalized');
      });
    });

    await test('the owner can update or delete their note but another user cannot read it', async () => {
      await asUser(learnerUser, async () => {
        const update = await q(
          `update public.lesson_notes set body='Updated note' where user_id=$1 and course_enrolment_id=$2 and lesson_id=$3 returning body`,
          [learnerUser, enrolmentId, lesson],
        );
        assert(update.rows[0].body === 'Updated note');
      });
      await asUser(outsider, async () => {
        assert((await q('select count(*)::int n from public.lesson_notes')).rows[0].n === 0,
          'a different user could read the private note');
        assert((await q(
          'delete from public.lesson_notes where course_enrolment_id=$1 and lesson_id=$2 returning id',
          [enrolmentId, lesson],
        )).rows.length === 0, 'a different user deleted the private note');
      });
      await asUser(learnerUser, async () => {
        const deleted = await q(
          'delete from public.lesson_notes where course_enrolment_id=$1 and lesson_id=$2 returning id',
          [enrolmentId, lesson],
        );
        assert(deleted.rows.length === 1);
      });
    });

    await test('a lesson can be bookmarked once and only by its owner', async () => {
      await committedAsUser(learnerUser, async () => {
        const saved = await q(
          `insert into public.lesson_bookmarks(user_id,learner_profile_id,course_enrolment_id,lesson_id)
           values($1,$2,$3,$4) returning user_id,lesson_id`,
          [outsider, learnerId, enrolmentId, lesson],
        );
        assert(saved.rows[0].user_id === learnerUser);
      });
      await asUser(learnerUser, async () => {
        await rejectInSavepoint(() => q(
          `insert into public.lesson_bookmarks(user_id,learner_profile_id,course_enrolment_id,lesson_id)
           values($1,$2,$3,$4)`,
          [learnerUser, learnerId, enrolmentId, lesson],
        ), /unique/i);
      });
      await asUser(outsider, async () => {
        assert((await q('select count(*)::int n from public.lesson_bookmarks')).rows[0].n === 0);
      });
      await asUser(learnerUser, async () => {
        assert((await q('delete from public.lesson_bookmarks where course_enrolment_id=$1 and lesson_id=$2 returning id', [enrolmentId, lesson])).rows.length === 1);
      });
    });

    await test('blank and overlong notes are rejected', async () => {
      await asUser(learnerUser, async () => {
        await rejectInSavepoint(() => q(
          `insert into public.lesson_notes(user_id,learner_profile_id,course_enrolment_id,lesson_id,body)
           values($1,$2,$3,$4,'   ')`,
          [learnerUser, learnerId, enrolmentId, lesson],
        ), /check constraint/i);
        await rejectInSavepoint(() => q(
          `insert into public.lesson_notes(user_id,learner_profile_id,course_enrolment_id,lesson_id,body)
           values($1,$2,$3,$4,$5)`,
          [learnerUser, learnerId, enrolmentId, lesson, 'x'.repeat(4001)],
        ), /check constraint/i);
      });
    });

    await test('notes cannot be attached to a lesson outside the enrolment version', async () => {
      const otherCourse = await newCourse(teacher, { status: 'active' });
      const otherVersion = await newVersion(otherCourse, teacher);
      const otherSection = await newSection(otherVersion);
      const otherLesson = await newLesson(otherSection);
      await asUser(learnerUser, async () => {
        await rejectInSavepoint(() => q(
          `insert into public.lesson_notes(user_id,learner_profile_id,course_enrolment_id,lesson_id,body)
           values($1,$2,$3,$4,'Wrong version')`,
          [learnerUser, learnerId, enrolmentId, otherLesson],
        ), /active enrolment and access/i);
      });
    });
  } finally {
    await q("update public.platform_settings set value_text='false' where key='learning.notes_bookmarks'");
  }
}
