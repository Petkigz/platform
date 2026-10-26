// Searching inside a course, and who may hear what.
//
// The catalogue searched a course's cover: title, subject, teacher, blurb. A
// lesson called "The conditions of prayer" inside "Fiqh for adults" was
// unfindable, because the words a learner remembers are usually inside the
// course.
//
// The rule this suite exists to prove is the one that makes it safe to open that
// up: a lesson's TITLE is already public — the course page prints the whole
// outline — so titles match for anyone. A lesson's DESCRIPTION is not, so it
// matches only for somebody who may study that lesson, and the snippet is built
// from the visible text so there is no path that puts hidden words in a result.

export async function run(ctx) {
  const {
    q, test, assert,
    committed, bootstrapAdmin, newUser, newProfile, grantRole,
    newInstructor, newCourse, newVersion, newSection, newLesson,
    newReviewer, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('lessonsearch-admin@example.com');
  const teacher = await newInstructor('lessonsearch-teacher@example.com', admin);
  const reviewer = await newReviewer('lessonsearch-reviewer@example.com', admin);

  /** An adult with their own account and their own learner profile. */
  async function adultLearner(email, name) {
    const userId = await newUser(email);
    await newProfile(userId, name);
    const row = await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [name, userId]);
    return { userId, learnerId: row.rows[0].id };
  }

  const learner = await adultLearner('lessonsearch-learner@example.com', 'Learner');

  const stranger = await newUser('lessonsearch-stranger@example.com');
  await newProfile(stranger, 'Stranger');

  /**
   * A lesson with a description.
   *
   * `newLesson()` writes title, position, type and preview only, so a fixture
   * that passes `description` to it silently creates a lesson with none — which
   * is how the first version of this suite "proved" that descriptions were not
   * searchable. The description is set here, explicitly, and the check below
   * fails loudly if it did not take.
   */
  async function addLesson(sectionId, { title, description = null, position = 1, preview = false }) {
    const id = await newLesson(sectionId, { title, position, is_preview: preview });
    if (description !== null) {
      await q(`update public.lessons set description = $2 where id = $1`, [id, description]);
      const stored = (await q(`select description from public.lessons where id = $1`, [id])).rows[0].description;
      if (stored !== description) throw new Error('the fixture did not store a description');
    }
    return id;
  }

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'lesson search test']);

  /** A published course with one lesson, whose description says something distinctive. */
  async function publishedCourseWithLesson({ title, description }) {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await addLesson(section, { title, description });

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    return { course, version, lesson };
  }

  async function as(who, sql, params) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify(who ? { sub: who, role: 'authenticated' } : { role: 'anon' })]);
    await q(`set local role ${who ? 'authenticated' : 'anon'}`);
    try {
      return await q(sql, params);
    } finally {
      await q('rollback');
    }
  }

  const search = async (who, term) =>
    (await as(who, `select lesson_id, lesson_title, snippet, matched_in, course_id, rank, is_preview
                      from public.search_lessons($1, 20)`, [term])).rows;

  const fiqh = await publishedCourseWithLesson({
    title: 'What breaks the fast',
    description: 'A careful look at the things that invalidate a day of fasting, and what does not.',
  });

  // -------------------------------------------------------------------
  console.log('\nWhat matches');
  // -------------------------------------------------------------------

  await test('a lesson is findable by a word from its title', async () => {
    const rows = await search(learner.userId, 'fast');

    assert(rows.some((r) => r.lesson_id === fiqh.lesson), 'the lesson was not found by its own title');
    assert(rows.find((r) => r.lesson_id === fiqh.lesson).matched_in === 'title',
      'a title match was reported as something else');
  });

  await test('a lesson is findable by a word only its description contains, for somebody enrolled', async () => {
    // Enrolled, so `can_access_lesson_now()` is true for them. Nothing here acts
    // as the learner: the function is asked as the person who owns the profile.
    await q(`insert into public.course_enrolments (learner_profile_id, course_id, course_version_id)
             values ($1, $2, $3)`, [learner.learnerId, fiqh.course, fiqh.version]);

    const rows = await search(learner.userId, 'invalidate');

    assert(rows.length === 1, `found ${rows.length} rows`);
    assert(rows[0].matched_in === 'description', `matched_in is ${rows[0].matched_in}`);
    assert(/<mark>invalidate<\/mark>/.test(rows[0].snippet),
      `the snippet does not mark the match: ${rows[0].snippet}`);
  });

  await test('a description word is not findable by somebody who has not bought the lesson', async () => {
    const rows = await search(stranger, 'invalidate');

    assert(rows.length === 0,
      `a stranger matched hidden lesson text: ${JSON.stringify(rows.map((r) => r.snippet))}`);
  });

  await test('a title still matches for that stranger — the outline was never secret', async () => {
    const rows = await search(stranger, 'fast');

    assert(rows.some((r) => r.lesson_id === fiqh.lesson), 'the public outline became unsearchable');
  });

  // A visitor with no account. `lessons_read` allows an anonymous reader a
  // lesson only when it is a preview *and* `learning.previews` is on, so this is
  // two behaviours, not one: the flag decides whether previews exist at all.
  const visitorCourse = await newCourse(teacher, { status: 'active' });
  const visitorVersion = await newVersion(visitorCourse, teacher);
  const visitorSection = await newSection(visitorVersion);
  const sampleLesson = await addLesson(visitorSection, {
    title: 'A sample: the pillars', description: 'Free to watch.', position: 1, preview: true,
  });
  const closedLesson = await addLesson(visitorSection, {
    title: 'A members-only: the pillars in depth', description: 'For members.', position: 2,
  });

  await transition(visitorVersion, 'submitted', teacher);
  await transition(visitorVersion, 'approved', reviewer);
  await satisfyReview(visitorVersion, reviewer, admin);
  await transition(visitorVersion, 'published', admin);

  await test('an anonymous visitor sees no lessons at all while previews are off', async () => {
    const rows = await search(null, 'pillars');

    assert(rows.length === 0,
      `a visitor read lesson rows while learning.previews is off: ${JSON.stringify(rows.map((r) => r.lesson_title))}`);
  });

  await test('with previews on, a visitor sees the preview and not the members-only lesson', async () => {
    await q(`update public.platform_settings set value_text = 'true' where key = 'learning.previews'`);
    try {
      const rows = await search(null, 'pillars');
      const ids = rows.map((r) => r.lesson_id);

      assert(ids.includes(sampleLesson), 'the preview lesson is not searchable by a visitor');
      assert(!ids.includes(closedLesson), 'a members-only lesson was returned to an anonymous visitor');

      // The result says it is a preview, which is what lets the catalogue send
      // a visitor to the lesson itself rather than to the course outline.
      const preview = rows.find((r) => r.lesson_id === sampleLesson);
      assert(preview.is_preview === true, 'a preview lesson did not report itself as one');
    } finally {
      await q(`update public.platform_settings set value_text = 'false' where key = 'learning.previews'`);
    }
  });

  await test('a draft course is not searchable at all', async () => {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await addLesson(section, { title: 'An unreviewed draft about zakat', description: 'Not published.' });

    const rows = await search(learner.userId, 'unreviewed');

    assert(rows.length === 0, 'a draft lesson surfaced in search');
  });

  await test('an empty query returns nothing rather than everything', async () => {
    for (const term of ['', '   ', null]) {
      const rows = await search(learner.userId, term);
      assert(rows.length === 0, `empty query returned ${rows.length} rows`);
    }
  });

  await test('punctuation a person types does not raise', async () => {
    for (const term of ['"prayer', 'fasting - ramadan', 'what (is) this', 'a & b', "the prophet's"]) {
      // The assertion is that the call returns rather than raising 42601.
      const rows = await search(learner.userId, term);
      assert(Array.isArray(rows), `the query ${JSON.stringify(term)} did not parse`);
    }
  });

  await test('a title outranks a description that merely mentions the word', async () => {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const byTitle = await addLesson(section, {
      title: 'Tayammum', description: 'Dry ablution when water is unavailable.', position: 1,
    });
    await addLesson(section, {
      title: 'Cleanliness',
      description: 'A long lesson that ends up discussing tayammum once.',
      position: 2,
    });

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    const rows = await search(learner.userId, 'tayammum');
    const ranked = rows.filter((r) => r.course_id === course);

    assert(ranked[0].lesson_id === byTitle, 'the lesson named after the word did not come first');
    assert(ranked[0].rank >= ranked[ranked.length - 1].rank, 'rank is not descending');
  });

  await test('a hidden description cannot leak through the snippet', async () => {
    const rows = await search(stranger, 'fast');
    const row = rows.find((r) => r.lesson_id === fiqh.lesson);

    assert(row, 'the title match vanished');
    assert(!/invalidat/i.test(row.snippet),
      `a hidden description reached the snippet: ${row.snippet}`);
  });

  await test('a lesson behind its course is not reported as a preview', async () => {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const ordinary = await addLesson(section, {
      title: 'Rulings on travel', description: 'When a journey shortens a prayer.', position: 1,
    });

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    const hit = (await search(learner.userId, 'travel')).find((r) => r.lesson_id === ordinary);
    assert(hit, 'the fixture lesson was not found');
    assert(hit.is_preview === false, 'an ordinary lesson claimed to be a preview');
  });

  await test('the caller is told which of the two matched', async () => {
    const rows = await search(learner.userId, 'fast');
    const row = rows.find((r) => r.lesson_id === fiqh.lesson);

    assert(['title', 'description'].includes(row.matched_in), `matched_in is ${row.matched_in}`);
  });
}
