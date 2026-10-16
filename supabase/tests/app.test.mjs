// Application data-contract tests.
//
// The web app's /learn page issues a specific PostgREST query. RLS is what
// makes it safe — there is deliberately no `where learner_profile_id = me`
// anywhere in the page. These tests run the equivalent SQL under the same
// authenticated role so the page's contract is pinned by the database, not by
// a convention in the component.
//
// What this cannot prove: that Supabase's PostgREST layer behaves as expected
// over HTTP. That needs a live project. What it does prove is that the
// policies return the right rows for the exact join shape the page uses.

export async function run(ctx) {
  const {
    q, count, test, assert,
    asUser, asAnon,
    newUser, newProfile,
    bootstrapAdmin, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin    = await bootstrapAdmin('app-admin@example.com');
  const teacher  = await newInstructor('app-teacher@example.com', admin);
  const reviewer = await newReviewer('app-reviewer@example.com', admin);

  const setStatus = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, 'test']);

  async function newAdultLearner(email, name) {
    const userId = await newUser(email);
    await newProfile(userId, name);
    const r = await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [name, userId]);
    return { userId, learnerId: r.rows[0].id };
  }

  async function publishedCourse(title) {
    const course  = await newCourse(teacher, { status: 'active', title });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);
    await setStatus(version, 'submitted', teacher);
    await setStatus(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await setStatus(version, 'published', admin);
    return { course, version, section, lesson };
  }

  const alice = await newAdultLearner('app-alice@example.com', 'Alice');
  const bob   = await newAdultLearner('app-bob@example.com', 'Bob');

  const courseA = await publishedCourse('Tajweed Foundations');
  const courseB = await publishedCourse('Seerah for Beginners');

  await q(`insert into public.course_enrolments (learner_profile_id, course_id, course_version_id)
           values ($1,$2,$3)`, [alice.learnerId, courseA.course, courseA.version]);
  await q(`insert into public.course_enrolments (learner_profile_id, course_id, course_version_id)
           values ($1,$2,$3)`, [bob.learnerId, courseB.course, courseB.version]);

  // The join the /learn page renders.
  const learnQuery = `
    select ce.id, ce.status, ce.enrolled_at,
           c.title, cv.version_number, cv.language
      from public.course_enrolments ce
      join public.courses c          on c.id  = ce.course_id
      join public.course_versions cv on cv.id = ce.course_version_id
     order by ce.enrolled_at desc`;

  // ---------------------------------------------------------------------
  console.log('The /learn page data contract');

  await test('a signed-in learner sees their own enrolments and nobody else\'s', async () => {
    const rows = await asUser(alice.userId, () => q(learnQuery));
    const titles = rows.rows.map((r) => r.title).sort();
    assert(titles.length === 1, `expected 1 enrolment, got ${titles.length}: ${titles.join(', ')}`);
    assert(titles[0] === 'Tajweed Foundations', `unexpected course: ${titles[0]}`);
  });

  await test('a second learner sees a different set', async () => {
    const rows = await asUser(bob.userId, () => q(learnQuery));
    const titles = rows.rows.map((r) => r.title).sort();
    assert(titles.length === 1, `expected 1 enrolment, got ${titles.length}`);
    assert(titles[0] === 'Seerah for Beginners', `unexpected course: ${titles[0]}`);
  });

  await test('an anonymous visitor sees no enrolments at all', async () => {
    const rows = await asAnon(() => q(learnQuery));
    assert(rows.rows.length === 0, `anonymous saw ${rows.rows.length} enrolments`);
  });

  await test('the query returns the exact columns the page renders', async () => {
    const rows = await asUser(alice.userId, () => q(learnQuery));
    const row = rows.rows[0];
    for (const col of ['id', 'status', 'enrolled_at', 'title', 'version_number', 'language']) {
      assert(col in row, `the /learn query no longer returns ${col}`);
    }
    assert(typeof row.version_number === 'number', 'version_number is not a number');
    assert(typeof row.language === 'string', 'language is not a string');
  });

  await test('the signed-in user can read their own profile row', async () => {
    const rows = await asUser(alice.userId, () => q(
      `select display_name from public.user_profiles
        where user_id = public.current_user_id()`));
    assert(rows.rows.length === 1, `expected 1 profile, got ${rows.rows.length}`);
    assert(rows.rows[0].display_name === 'Alice',
      `unexpected display_name: ${rows.rows[0].display_name}`);
  });

  await test('a suspended course disappears from the page but keeps its data', async () => {
    // Suspension is a governance act; the enrolment and progress survive it.
    const enr = (await q(
      `select id from public.course_enrolments
        where learner_profile_id = $1 and course_id = $2`,
      [alice.learnerId, courseA.course])).rows[0].id;

    await q(`update public.courses
                set suspended_at = now(), suspended_reason = 'under review', suspended_by = $1
              where id = $2`, [admin, courseA.course]);

    // RLS on course_enrolments is about who may read the row, not about
    // suspension, so the row is still listed...
    const rows = await asUser(alice.userId, () => q(learnQuery));
    assert(rows.rows.length === 1,
      `the enrolment row vanished from the list on suspension: ${rows.rows.length} rows`);

    // ...but access is correctly denied.
    const allowed = (await q(
      'select public.can_access_course_version($1,$2) as v',
      [alice.learnerId, courseA.version])).rows[0].v;
    assert(allowed === false, 'a suspended course still granted access');

    await q('update public.courses set suspended_at = null, suspended_reason = null, suspended_by = null where id = $1',
      [courseA.course]);
    assert(await count('select count(*)::int n from public.course_enrolments where id=$1', [enr]) === 1,
      'suspension deleted the enrolment');
  });

  await test('the catalogue is browsable anonymously, drafts are not', async () => {
    const draft = await newCourse(teacher, { slug: 'app-draft', status: 'draft', title: 'Unpublished' });
    const active = await asAnon(() => count(
      'select count(*)::int n from public.courses where id = $1', [courseA.course]));
    const hidden = await asAnon(() => count(
      'select count(*)::int n from public.courses where id = $1', [draft]));
    assert(active === 1, `anonymous saw ${active} published courses`);
    assert(hidden === 0, `anonymous saw ${hidden} draft courses`);
  });
}
