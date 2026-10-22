// Course authoring — the teacher's side.
//
// Three invariants carry the weight here:
//
// 1. Only the author (or platform staff) may write a course and its subtree.
//    The write policies on sections and lessons are phrased as
//    can_read_version(), which is true for anyone on a *published* version, so
//    the thing actually stopping a learner from injecting content into someone
//    else's published course is the D5 lock trigger — not the policy. Both are
//    asserted below, because a trigger is the real control and a future
//    refactor of the policy would not be caught by the policy test alone.
//
// 2. set_course_version_status() is the only path between states, and the
//    transition table decides who may take each step. An author may submit; a
//    reviewer may approve; an admin may publish.
//
// 3. A published version is frozen. You do not edit it, you make a new one.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('auth-admin@example.com');
  const teacher  = await newInstructor('auth-teacher@example.com', admin);
  const other    = await newInstructor('auth-other@example.com', admin);
  const reviewer = await newReviewer('auth-reviewer@example.com', admin);

  const learnerId = await newUser('auth-learner@example.com');
  await newProfile(learnerId, 'Learner');
  const learner = (await q(
    `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
     values ('L','adult','18+',$1) returning id`, [learnerId])).rows[0].id;

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'authoring test']);

  const statusOf = async (versionId) =>
    (await q('select version_status s from public.course_versions where id = $1',
      [versionId])).rows[0].s;

  // -------------------------------------------------------------------
  // An author writes their own draft
  // -------------------------------------------------------------------
  const mine = await newCourse(teacher, { status: 'active' });
  const myDraft = await newVersion(mine, teacher);

  await test('an author can build out their own draft version', async () => {
    // asUser() rolls back, so what is being asserted is that the policy
    // admits the write — a row comes back. Persistence of the same shape is
    // covered by the superuser fixtures this suite is built from.
    await asUser(teacher, async () => {
      const sec = await q(
        `insert into public.course_sections (course_version_id, title, position)
         values ($1, 'Basics', 1) returning id`, [myDraft]);
      assert(sec.rows.length === 1, 'the author could not add a section');

      const les = await q(
        `insert into public.lessons (section_id, title, position)
         values ($1, 'First lesson', 1) returning id`, [sec.rows[0].id]);
      assert(les.rows.length === 1, 'the author could not add a lesson');
    });
  });

  await test('a learner cannot open a course, and a teacher can', async () => {
    // The role boundary: teaching is an appointment. A signed-in person with no
    // instructor role is a learner, and a learner's account is not a shop.
    const learner = await newUser('authoring-learner@example.com');
    await newProfile(learner, 'Learner');

    await asUser(learner, async () => {
      await rejects(() => q(
        `insert into public.courses (slug, title, created_by)
         values ('learner-course', 'A learner course', $1)`, [learner]),
        /row-level security|violates row-level security/i);
    });

    // An instructor still can, and the row names them.
    await asUser(teacher, async () => {
      const made = await q(
        `insert into public.courses (slug, title, created_by)
         values ('teacher-course', 'A teacher course', $1) returning id`, [teacher]);
      assert(made.rows.length === 1, 'a teacher could not open a course');
    });
  });

  await test('a course cannot be created by anyone but its author', async () => {
    await asUser(other, async () => {
      await rejects(() => q(
        `insert into public.courses (slug, title, created_by)
         values ('impersonated', 'Impersonated', $1)`, [teacher]),
        'a teacher created a course attributed to another teacher');
    });
  });

  await test('an author cannot write into someone else\'s draft', async () => {
    const theirs = await newCourse(other, { status: 'active' });
    const theirDraft = await newVersion(theirs, other);

    await asUser(teacher, async () => {
      await rejects(() => q(
        `insert into public.course_sections (course_version_id, title, position)
         values ($1, 'Injected', 1)`, [theirDraft]),
        'a teacher added a section to another teacher\'s draft');
    });

    // Separate block, because the refused insert above aborted that
    // transaction. The row is read back as superuser rather than as the
    // teacher: an active course with no published version is not readable by
    // a non-author at all, so the teacher cannot even see the title they were
    // trying to change.
    const before = (await q('select title from public.courses where id = $1', [theirs])).rows[0].title;

    await asUser(teacher, async () => {
      // An RLS-blocked UPDATE matches zero rows and raises nothing, so the
      // absence of an error here proves nothing on its own.
      await q(`update public.courses set title = 'Taken over' where id = $1`, [theirs]);
    });

    const after = (await q('select title from public.courses where id = $1', [theirs])).rows[0].title;
    assert(before === after, `a teacher renamed another teacher's course to '${after}'`);
  });

  // -------------------------------------------------------------------
  // D5 — the published subtree is frozen
  // -------------------------------------------------------------------
  const frozen = await newCourse(teacher, { status: 'active' });
  const frozenVersion = await newVersion(frozen, teacher);
  const frozenSection = await newSection(frozenVersion);
  await newLesson(frozenSection);
  await transition(frozenVersion, 'submitted', teacher);
  await transition(frozenVersion, 'approved', reviewer);
  await satisfyReview(frozenVersion, reviewer, admin);
  await transition(frozenVersion, 'published', admin);

  await committed(async () => {
    await q(`insert into public.course_enrolments
               (learner_profile_id, course_id, course_version_id, source, status)
             values ($1,$2,$3,'free','active')`, [learner, frozen, frozenVersion]);
  });

  await test('a published version refuses new content, even from its own author', async () => {
    // The author passes can_read_version() on their own published version, so
    // only the D5 lock trigger is standing between them and a live edit.
    await asUser(teacher, async () => {
      await rejects(() => q(
        `insert into public.course_sections (course_version_id, title, position)
         values ($1, 'Sneaked in', 9)`, [frozenVersion]),
        'the author added a section to their own published version');

      await rejects(() => q(
        `insert into public.lessons (section_id, title, position)
         values ($1, 'Sneaked in', 9)`, [frozenSection]),
        'the author added a lesson to their own published version');

      await rejects(() => q(
        `update public.course_sections set title = 'Changed' where id = $1`, [frozenSection]),
        'the author renamed a section in their own published version');
    });
  });

  await test('a learner cannot inject content into a course they are enrolled in', async () => {
    // can_read_version() is true for any signed-in user on a published
    // version, so the INSERT policy passes. The lock trigger is what refuses.
    // This is asserted as behaviour, not as policy shape, precisely so that a
    // future tightening of the policy does not silently become the only thing
    // holding.
    const before = await count(
      `select 1 from public.course_sections where course_version_id = $1`, [frozenVersion]);

    await asUser(learnerId, async () => {
      await rejects(() => q(
        `insert into public.course_sections (course_version_id, title, position)
         values ($1, 'Injected by learner', 9)`, [frozenVersion]),
        'a learner injected a section into a published course');
    });

    const after = await count(
      `select 1 from public.course_sections where course_version_id = $1`, [frozenVersion]);
    assert(before === after, `section count moved ${before} -> ${after}`);
  });

  await test('a learner cannot edit the course row either', async () => {
    await asUser(learnerId, async () => {
      const before = (await q('select title from public.courses where id = $1', [frozen])).rows[0].title;
      // An RLS-blocked UPDATE matches zero rows and raises nothing, so the
      // row itself is the assertion.
      await q(`update public.courses set title = 'Hijacked' where id = $1`, [frozen]);
      const after = (await q('select title from public.courses where id = $1', [frozen])).rows[0].title;
      assert(before === after, `the course title changed to '${after}'`);
    });
  });

  // -------------------------------------------------------------------
  // The transition table
  // -------------------------------------------------------------------
  await test('an empty version cannot be published', async () => {
    const c = await newCourse(teacher, { status: 'active' });
    const v = await newVersion(c, teacher);
    await transition(v, 'submitted', teacher);
    await transition(v, 'approved', reviewer);
    await satisfyReview(v, reviewer, admin);

    await rejects(() => transition(v, 'published', admin),
      'a version with no lessons was published');
    assert((await statusOf(v)) === 'approved', 'the status moved anyway');
  });

  await test('an author cannot approve or publish their own course', async () => {
    const c = await newCourse(teacher, { status: 'active' });
    const v = await newVersion(c, teacher);
    const s = await newSection(v);
    await newLesson(s);
    await transition(v, 'submitted', teacher);

    await rejects(() => transition(v, 'approved', teacher),
      'the author approved their own course');

    // And even after a reviewer approves, publishing is an admin step.
    await transition(v, 'approved', reviewer);
    await satisfyReview(v, reviewer, admin);
    await rejects(() => transition(v, 'published', teacher),
      'the author published their own course');

    await transition(v, 'published', admin);
    assert((await statusOf(v)) === 'published', 'the admin could not publish it');
  });

  await test('a reviewer cannot publish either', async () => {
    const c = await newCourse(teacher, { status: 'active' });
    const v = await newVersion(c, teacher);
    const s = await newSection(v);
    await newLesson(s);
    await transition(v, 'submitted', teacher);
    await transition(v, 'approved', reviewer);
    await satisfyReview(v, reviewer, admin);

    await rejects(() => transition(v, 'published', reviewer),
      'a reviewer published a course');
  });

  // -------------------------------------------------------------------
  // Visibility
  // -------------------------------------------------------------------
  await test('a draft is invisible to everyone but its author', async () => {
    const secret = await newVersion(mine, teacher, { version_number: 2 });

    await asUser(other, async () => {
      const n = await count('select 1 from public.course_versions where id = $1', [secret]);
      assert(n === 0, 'another teacher could read a draft version');
    });

    await asAnon(async () => {
      const n = await count('select 1 from public.course_versions where id = $1', [secret]);
      assert(n === 0, 'an anonymous visitor could read a draft version');
    });

    await asUser(teacher, async () => {
      const n = await count('select 1 from public.course_versions where id = $1', [secret]);
      assert(n === 1, 'the author could not read their own draft');
    });
  });

  await test('a course with no published version is not in the public catalogue', async () => {
    const c = await newCourse(teacher, { status: 'active' });
    await newVersion(c, teacher);

    await asAnon(async () => {
      const n = await count('select 1 from public.courses where id = $1', [c]);
      assert(n === 0, 'an unpublished course was visible anonymously');
    });

    await asUser(teacher, async () => {
      const n = await count('select 1 from public.courses where id = $1', [c]);
      assert(n === 1, 'the author could not see their own unpublished course');
    });
  });

  await test('a slug cannot be reused', async () => {
    const existing = (await q('select slug from public.courses where id = $1', [mine])).rows[0].slug;
    await rejects(() => q(
      `insert into public.courses (slug, title, created_by) values ($1, 'Duplicate', $2)`,
      [existing, other]),
      'a duplicate slug was accepted');
  });
}
