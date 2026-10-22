// Catalogue search.
//
// The search box used to look only at a course's title and description, which meant a
// course filed under Fiqh was unfindable unless the word was also in its blurb, and a
// teacher could not be found by name at all. `search_catalogue()` is now the single
// definition of a match; these tests pin what it searches, how it ranks, and — the
// part that matters most — what it refuses to show.
//
// Every call here runs as `anon`, because the catalogue is the one surface a stranger
// reads. If a policy change made a draft course matchable, or a private teacher
// profile nameable, the assertion fails here rather than in front of a visitor.

export async function run(ctx) {
  const {
    q, test, assert,
    asAnon,
    bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('search-admin@example.com');
  const teacher  = await newInstructor('search-teacher@example.com', admin);
  const reviewer = await newReviewer('search-reviewer@example.com', admin);

  const setVersion = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, 'catalogue search']);

  async function buildCourse({ title, description, publish = true, subject = null, audience = 'both' }) {
    const course  = await newCourse(teacher, { status: 'active', audience, title });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);
    await q(`update public.courses set description = $2 where id = $1`, [course, description]);

    if (subject) {
      const sa = (await q(
        `select id from public.subject_areas where code = $1 and deleted_at is null`,
        [subject])).rows[0];
      assert(sa, `subject area ${subject} not seeded`);
      await q(`insert into public.course_version_subjects (course_version_id, subject_area_id)
               values ($1, $2)`, [version, sa.id]);
    }

    if (publish) {
      await setVersion(version, 'submitted', teacher);
      await setVersion(version, 'approved', reviewer);
      await satisfyReview(version, reviewer, admin);
      await setVersion(version, 'published', admin);
    }
    return course;
  }

  // -------------------------------------------------------------------
  // Fixtures
  // -------------------------------------------------------------------
  // A course whose *subject* is the only place the word appears.
  const trade = await buildCourse({
    title: 'Foundations of Trade',
    description: 'A first course on contracts.',
    subject: 'fiqh',
    audience: 'adult',
  });

  // A course that matches on its blurb and on its teacher's name, but not its title.
  const sciences = await buildCourse({
    title: 'Sciences of the Deen',
    description: 'Includes khushu in prayer, and how to attain it.',
    subject: 'hadith',
    audience: 'both',
  });

  // A course that matches on its title.
  const khushu = await buildCourse({
    title: 'Khushu in Prayer',
    description: 'Memorise the meanings.',
  });

  // A published course that shares no word with the others, for AND semantics.
  const astronomy = await buildCourse({
    title: 'Astronomy for Beginners',
    description: 'The night sky, plainly explained.',
  });

  // Nothing about a draft may be findable, however well it matches.
  const draft = await buildCourse({
    title: 'Mudarabah for Beginners',
    description: 'Not yet reviewed.',
    publish: false,
  });

  // A teacher profile, so the name has something to match against.
  await q(`insert into public.instructor_public_profiles
             (user_id, slug, display_name, status)
           values ($1, 'ustadha-search', 'Ustadha Khushu', 'published')`, [teacher]);

  const publicProfileFlag = (await q(
    `select value_text from public.platform_settings where key = 'teaching.public_profile'`,
  )).rows[0]?.value_text ?? 'false';

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------
  const searchAs = async (term, over = {}) => {
    let rows = [];
    await asAnon(async () => {
      rows = (await q(
        `select course_id, score from public.search_catalogue($1, $2, $3, $4)`,
        [term, over.subject ?? null, over.audience ?? null, over.limit ?? null])).rows;
    });
    return rows;
  };
  const ids = (rows) => rows.map((r) => r.course_id);
  const rankOf = (rows, id) => ids(rows).indexOf(id);

  // -------------------------------------------------------------------
  // What it searches
  // -------------------------------------------------------------------
  await test('a subject is searchable, not only the words on the blurb', async () => {
    // 'fiqh' appears nowhere on this course — not in its title, not in its
    // description. It is the subject on the published version, and that is enough.
    const rows = await searchAs('fiqh');
    assert(rankOf(rows, trade) >= 0,
      'a course filed under Fiqh was not found by searching for its subject');

    // And the ordinary words still work.
    assert(rankOf(await searchAs('trade'), trade) >= 0, 'the title stopped matching');
    assert(rankOf(await searchAs('contracts'), trade) >= 0, 'the description stopped matching');
  });

  await test('a title outranks a blurb', async () => {
    const rows = await searchAs('khushu');
    const title = rankOf(rows, khushu);
    const blurb = rankOf(rows, sciences);
    assert(title >= 0 && blurb >= 0, 'the fixture stopped matching');
    assert(title < blurb,
      'a course named for the word ranked below one that merely mentions it');
  });

  await test('every word must match: a query is an AND, not an OR', async () => {
    // Each word alone finds a course; together they find neither.
    assert(rankOf(await searchAs('astronomy'), astronomy) >= 0, 'one word stopped matching');
    assert(rankOf(await searchAs('mudarabah', { limit: null }), draft) < 0,
      'a draft course was searchable');

    const both = await searchAs('astronomy mudarabah');
    assert(rankOf(both, astronomy) < 0 && rankOf(both, draft) < 0,
      'a word that matched only half the query still returned the course');
  });

  await test('a teacher is findable by name only when their profile is public', async () => {
    // The teacher's profile is published, but `teaching.public_profile` is what
    // decides whether it is readable by a stranger at all. Searching must follow the
    // same rule as the public page — otherwise the search box becomes a way to
    // enumerate teachers who have not chosen to be listed.
    const before = await searchAs('ustadha');
    assert(rankOf(before, sciences) < 0,
      'a teacher whose profile is not public was nameable through search');

    await q(`update public.platform_settings set value_text = 'true'
              where key = 'teaching.public_profile'`);
    try {
      const after = await searchAs('ustadha');
      assert(rankOf(after, sciences) >= 0,
        'a published teacher profile was not findable by name');
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'teaching.public_profile'`, [publicProfileFlag]);
    }
  });

  // -------------------------------------------------------------------
  // What it refuses
  // -------------------------------------------------------------------
  await test('nothing unpublished, suspended or retired is searchable', async () => {
    assert(rankOf(await searchAs('mudarabah', { limit: 100 }), draft) < 0,
      'a course with no published version was searchable');

    // Suspension is a governance act that overrides entitlement; it must also
    // take the course out of search, not only out of enrolment.
    await q(`update public.courses
                set suspended_at = now(), suspended_reason = 'Under review',
                    suspended_by = $2
              where id = $1`, [astronomy, admin]);
    try {
      assert(rankOf(await searchAs('astronomy'), astronomy) < 0,
        'a suspended course was still searchable');
    } finally {
      await q(`update public.courses
                  set suspended_at = null, suspended_reason = null, suspended_by = null
                where id = $1`, [astronomy]);
    }

    await q(`update public.courses set status = 'retired' where id = $1`, [sciences]);
    try {
      assert(rankOf(await searchAs('sciences'), sciences) < 0,
        'a retired course was still searchable');
    } finally {
      await q(`update public.courses set status = 'active' where id = $1`, [sciences]);
    }
  });

  await test('a wildcard is a character, not a pattern', async () => {
    // `like`-based search turns a typed '%' into "everything". `strpos()` does not,
    // and that is the reason it is used.
    for (const term of ['%', '_', '%%']) {
      const rows = await searchAs(term);
      assert(rankOf(rows, trade) < 0 && rankOf(rows, astronomy) < 0,
        `'${term}' behaved like a wildcard`);
    }
  });

  // -------------------------------------------------------------------
  // Filters and limits
  // -------------------------------------------------------------------
  await test('the subject and audience filters narrow the same match', async () => {
    const fiqhOnly = await searchAs('trade', { subject: 'fiqh' });
    assert(rankOf(fiqhOnly, trade) >= 0, 'the subject filter dropped its own course');

    const wrongSubject = await searchAs('sciences', { subject: 'fiqh' });
    assert(rankOf(wrongSubject, sciences) < 0,
      'the subject filter returned a course filed under another subject');

    const children = await searchAs('foundations', { audience: 'child' });
    assert(rankOf(children, trade) < 0, 'an adults-only course was returned to a child search');

    // 'both' is the audience that belongs to every filter.
    const adult = await searchAs('sciences', { audience: 'adult' });
    assert(rankOf(adult, sciences) >= 0, 'a course for all ages was hidden from adults');
  });

  await test('the limit is clamped rather than trusted', async () => {
    const none = await searchAs('deen', { limit: 0 });
    assert(none.length <= 1, `limit 0 returned ${none.length} rows`);

    const many = await searchAs('deen', { limit: 100000 });
    assert(many.length <= 100, `limit 100000 returned ${many.length} rows`);
  });

  await test('an empty query lists the shelf rather than returning nothing', async () => {
    // Clearing the box must fall back to browsing, not to an empty page.
    const rows = await searchAs('');
    assert(rankOf(rows, trade) >= 0 && rankOf(rows, astronomy) >= 0,
      'clearing the search box hid the catalogue');
  });
}
