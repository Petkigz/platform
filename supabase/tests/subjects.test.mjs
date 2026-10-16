// Subject tagging.
//
// subject_areas is seeded with 37 entries and the catalogue has a working
// subject filter plus subject badges on every card. Both read
// course_version_subjects, which had zero rows and no writer — so the filter
// narrowed against an empty set and returned nothing, forever.
//
// There was a second defect underneath: the write policies used
// can_read_version(), which is true for every published version to anyone, so
// any signed-in user could tag anyone else's course. Both are covered here.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser,
    newUser, newProfile,
    newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('subj-admin@example.com');
  const teacher  = await newInstructor('subj-teacher@example.com', admin);
  const reviewer = await newReviewer('subj-reviewer@example.com', admin);

  const scalar = async (sql, params) => (await q(sql, params)).rows[0];
  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'subject test']);

  /** Act as a user and COMMIT. The writer reads the actor from the session. */
  async function asActor(actor, sql, params) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    let r;
    try {
      r = await q(sql, params);
    } catch (e) {
      await q('rollback');
      throw e;
    }
    await q('commit');
    return r;
  }

  const tag = (who, versionId, codes) =>
    asActor(who, 'select public.set_version_subjects($1,$2) as n', [versionId, codes]);

  /**
   * A published course version, tagged while still a draft.
   *
   * The order matters: D5 freezes subject mapping the moment a version leaves
   * draft, so tagging has to happen before publication. An earlier version of
   * this suite published first and every tagging test failed on the lock.
   */
  async function publishedCourse(author, codes = null) {
    const course  = await newCourse(author, { status: 'active' });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);

    if (codes) await tag(author, version, codes);

    await transition(version, 'submitted', author);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    return { course, version };
  }

  const subjectsOf = async (versionId) =>
    (await q(
      `select sa.code from public.course_version_subjects cvs
         join public.subject_areas sa on sa.id = cvs.subject_area_id
        where cvs.course_version_id = $1 order by sa.code`,
      [versionId])).rows.map((r) => r.code);

  // -------------------------------------------------------------------
  console.log('\nTagging');
  // -------------------------------------------------------------------

  await test('an author can tag their own course version', async () => {
    const { version } = await publishedCourse(teacher, ['quran', 'arabic']);

    const n = (await count(
      'select 1 from public.course_version_subjects where course_version_id = $1', [version]));
    assert(n === 2, `found ${n} subject rows, expected 2`);

    const codes = await subjectsOf(version);
    assert(codes.includes('quran') && codes.includes('arabic'),
      `subjects are [${codes.join(', ')}]`);
  });

  await test('setting again replaces the set rather than merging', async () => {
    // Both taggings happen while the version is a draft, because D5 freezes
    // the mapping at publication.
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    await tag(teacher, version, ['quran', 'arabic']);
    await tag(teacher, version, ['fiqh']);

    const codes = await subjectsOf(version);
    assert(codes.length === 1 && codes[0] === 'fiqh',
      `subjects are [${codes.join(', ')}]; a merge would make removing a mistagging impossible`);
  });

  await test('a course needs at least one subject', async () => {
    const { version } = await publishedCourse(teacher);

    await rejects(() => tag(teacher, version, []), /at least one subject/i);
  });

  await test('an unknown subject code is reported by name', async () => {
    const { version } = await publishedCourse(teacher);

    // A typo must be legible. Without this the caller gets a foreign key
    // violation on a uuid, which tells them nothing about which code was wrong.
    await rejects(() => tag(teacher, version, ['quran', 'astrology']),
      /no such subject area\(s\): astrology/i);

    assert((await subjectsOf(version)).length === 0,
      'a refused tagging must not partially apply');
  });

  await test('the same subject cannot be attached twice', async () => {
    // Enforced by the pre-existing course_version_subjects_key unique index,
    // not by anything this migration added. An earlier draft added a duplicate
    // index on the same columns; removing it changed nothing here, which is how
    // the redundancy was found.
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const subjectId = (await q(
      "select id from public.subject_areas where code = 'quran'")).rows[0].id;

    await q(`insert into public.course_version_subjects (course_version_id, subject_area_id)
             values ($1,$2)`, [version, subjectId]);

    await rejects(() => q(`insert into public.course_version_subjects (course_version_id, subject_area_id)
             values ($1,$2)`, [version, subjectId]),
      /duplicate key/i);
  });

  // -------------------------------------------------------------------
  console.log('\nWho may tag');
  // -------------------------------------------------------------------

  await test('a stranger cannot tag someone else\'s course', async () => {
    const { version } = await publishedCourse(teacher);
    const stranger = await newUser('subj-stranger@example.com');
    await newProfile(stranger, 'Stranger');

    await rejects(() => tag(stranger, version, ['quran']),
      /only the author may tag/i);

    assert((await subjectsOf(version)).length === 0,
      'a stranger must not be able to tag a course');
  });

  await test('a reader cannot insert a tag directly, whatever the version state', async () => {
    // The policy now uses can_author_version() rather than can_read_version().
    //
    // This is defence in depth rather than a patched hole, and the test says so
    // because the distinction matters. Verified by restoring the old policy: a
    // stranger inserting into a PUBLISHED version was still refused, by the D5
    // lock rather than by RLS. A draft is refused by RLS, because
    // can_read_version() is false for a stranger there. So both states were
    // already covered — by two different mechanisms, neither of which is a
    // write predicate.
    const { version } = await publishedCourse(teacher);
    const reader = await newUser('subj-reader@example.com');
    await newProfile(reader, 'Reader');
    const subjectId = (await q(
      "select id from public.subject_areas where code = 'quran'")).rows[0].id;

    // First confirm the premise: the reader really can read this version, so
    // the old policy would have let them write.
    const canRead = await scalar(
      'select public.can_read_version($1) as r', [version]);
    assert(canRead.r === true,
      'precondition failed: the reader cannot read this version, so this test proves nothing about the old policy');

    await asUser(reader, async () => {
      await rejects(() => q(`insert into public.course_version_subjects
                 (course_version_id, subject_area_id) values ($1,$2)`,
        [version, subjectId]),
        /row-level security|new row violates|locked \(D5\)/i);
    });

    assert((await subjectsOf(version)).length === 0,
      'a direct insert by a reader must not have landed');
  });

  await test('a published version cannot be retagged, even by its author', async () => {
    // D5 freezes subject mapping at publication, exactly as it does sections
    // and lessons. An earlier draft of this suite asserted the opposite, on my
    // own reasoning that tags are only discovery metadata — but the freeze
    // already existed and is deliberate, and overriding it for one table is not
    // a call to make quietly.
    //
    // The consequence is real and worth stating: a mis-tagged published course
    // cannot be corrected without cutting a new version.
    const { version } = await publishedCourse(teacher, ['quran']);
    const status = await scalar(
      'select version_status from public.course_versions where id = $1', [version]);
    assert(status.version_status === 'published',
      'precondition: this test is about a published version');

    await rejects(() => tag(teacher, version, ['seerah']), /locked \(D5\)/i);

    const codes = await subjectsOf(version);
    assert(codes.includes('quran') && !codes.includes('seerah'),
      `subjects became [${codes.join(', ')}]; the frozen mapping changed`);
  });

  await test('an anonymous caller is refused', async () => {
    const { version } = await publishedCourse(teacher);

    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role authenticated');
    await rejects(
      () => q('select public.set_version_subjects($1,$2)', [version, ['quran']]),
      /sign in to tag/i);
    await q('rollback');
  });

  // -------------------------------------------------------------------
  console.log('\nThe catalogue can actually find it');
  // -------------------------------------------------------------------

  await test('a tagged course is reachable by subject', async () => {
    const { course } = await publishedCourse(teacher, ['quran']);

    // This is the join the catalogue filter narrows on. Before the writer
    // existed it returned nothing at all, which is why every subject filter
    // came back empty however many courses were published.
    const found = await count(
      `select 1
         from public.courses c
         join public.course_versions cv on cv.course_id = c.id
         join public.course_version_subjects cvs on cvs.course_version_id = cv.id
         join public.subject_areas sa on sa.id = cvs.subject_area_id
        where c.id = $1
          and cv.version_status = 'published'
          and sa.code = 'quran'`, [course]);

    assert(found === 1,
      `the subject join matched ${found} rows; the catalogue filter would still return nothing`);
  });

  await test('an untagged course is not matched by any subject', async () => {
    const { course } = await publishedCourse(teacher);

    const found = await count(
      `select 1
         from public.courses c
         join public.course_versions cv on cv.course_id = c.id
         join public.course_version_subjects cvs on cvs.course_version_id = cv.id
        where c.id = $1`, [course]);

    assert(found === 0, 'an untagged course must not match a subject filter');
  });

  // -------------------------------------------------------------------
  console.log('\nAudit trail');
  // -------------------------------------------------------------------

  await test('tagging is audited', async () => {
    const { version } = await publishedCourse(teacher, ['quran']);

    const rows = (await q(
      `select detail from public.governance_audit_events
        where target_type = 'course_version' and target_id = $1 and action = 'course.subjects_set'`,
      [version])).rows;

    assert(rows.length === 1, `found ${rows.length} audit rows, expected 1`);
    assert(JSON.stringify(rows[0].detail).includes('quran'),
      'the audit row does not name the subjects that were set');
  });
}
