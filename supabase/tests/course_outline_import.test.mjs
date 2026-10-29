// A teacher's outline, out of a spreadsheet and into a draft.
//
// The import is the second half of `platform.data_export`, which said import was
// refused because "a file from somewhere else has to be mapped into courses,
// learners and enrolments that nobody wrote". That is still true of a stranger's
// file. This suite is about the case where nothing is guessed: a teacher's own
// section and lesson titles, in a shape the header row names, appended to their
// own draft.
//
// Three rules are tested as hard as the happy path, because each would fail
// quietly:
//
//   * **all or nothing** — a file with one bad title writes nothing at all, so
//     there is never a half-outline to reconcile by hand;
//   * **a draft, or nothing** — a version that is published or under review is
//     refused by name, because an import would change what a reviewer is reading;
//   * **appended, not merged** — positions continue after the content already
//     there, so a half-written outline is never overwritten.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newCourse, newVersion,
    newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('import-admin@example.com');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
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

  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const importOutline = (actor, versionId, sections) =>
    call(actor, 'import_course_outline($1,$2::jsonb)', [versionId, JSON.stringify(sections)]);

  const sectionCount = async (versionId) =>
    (await q('select count(*)::int as n from public.course_sections where course_version_id = $1',
      [versionId])).rows[0].n;

  const lessonRows = async (versionId) =>
    (await q(
      `select l.title, l.position, l.is_preview, l.description, cs.title as section
         from public.lessons l
         join public.course_sections cs on cs.id = l.section_id
        where cs.course_version_id = $1
        order by cs.position, l.position`,
      [versionId])).rows;

  const audit = async (action) =>
    (await q(`select count(*)::int as n from public.governance_audit_events where action = $1`,
      [action])).rows[0].n;

  // -------------------------------------------------------------------------
  // Fixtures
  // -------------------------------------------------------------------------
  const teacher = await newInstructor('import-teacher@example.com', admin);
  const other = await newInstructor('import-other-teacher@example.com', admin);
  const stranger = await newUser('import-stranger@example.com');
  await newProfile(stranger);

  const courseId = await newCourse(teacher, { title: 'Import Course' });
  const versionId = await newVersion(courseId, teacher);

  const outline = [
    {
      title: 'Foundations',
      lessons: [
        { title: 'What tajweed means', description: 'An introduction to the word and its scope', preview: false },
        { title: 'The three lengths', description: null, preview: true },
      ],
    },
    {
      title: 'Application',
      lessons: [{ title: 'Reading Surah Al-Fatihah', description: 'Applying the rules', preview: false }],
    },
  ];

  // -------------------------------------------------------------------------
  // The happy path
  // -------------------------------------------------------------------------
  await test('an outline lands in order, at the end of the draft', async () => {
    // Something is already there, so "appended" is a fact that can be measured.
    const existing = await newSection(versionId, { title: 'Already written', position: 1 });
    await newLesson(existing, { title: 'Already there', position: 1 });

    const before = await audit('teaching.outline_imported');
    const result = await importOutline(teacher, versionId, outline);

    eq(result.sections, 2, 'sections created');
    eq(result.lessons, 3, 'lessons created');
    eq(await sectionCount(versionId), 3, 'sections in the version');

    const rows = await lessonRows(versionId);
    eq(rows.length, 4, 'lessons in the version');
    eq(rows[0].title, 'Already there', 'the existing lesson stayed first');
    eq(rows[1].title, 'What tajweed means', 'the first imported lesson follows it');
    eq(Number(rows[1].position), 1, 'positions restart inside a new section');
    eq(rows[1].section, 'Foundations', 'the section title from the file');
    eq(rows[2].title, 'The three lengths', 'the second lesson in the section');
    eq(rows[2].is_preview, true, 'the preview column is honoured');
    eq(rows[1].is_preview, false, 'and no is not a preview');
    eq(rows[1].description, 'An introduction to the word and its scope', 'the description');
    eq(rows[3].section, 'Application', 'the second section');
    eq(await audit('teaching.outline_imported'), before + 1, 'one audit row');
  });

  await test('the audit row carries counts and nothing about the content', async () => {
    const row = (await q(
      `select actor, target_type, detail from public.governance_audit_events
        where action = 'teaching.outline_imported'
        order by occurred_at desc limit 1`)).rows[0];
    eq(row.actor, teacher, 'the teacher is the actor');
    eq(row.target_type, 'course_version', 'what it was aimed at');
    eq(row.detail.sections, 2, 'sections in the detail');
    eq(row.detail.lessons, 3, 'lessons in the detail');
    // A title is somebody's writing, not an event. The log says how many, not
    // which — the draft itself is the record of the words.
    assert(!JSON.stringify(row.detail).includes('Foundations'),
      'the audit detail should not carry lesson or section text');
  });

  // -------------------------------------------------------------------------
  // Refusals that must write nothing
  // -------------------------------------------------------------------------
  await test('a published or submitted version is refused by name', async () => {
    const frozen = await newCourse(teacher, { title: 'Frozen Course' });
    const frozenVersion = await newVersion(frozen, teacher);
    await q(`update public.course_versions set version_status = 'submitted' where id = $1`,
      [frozenVersion]);

    await rejects(() => importOutline(teacher, frozenVersion, outline), /teaching:version_frozen/);
    eq(await sectionCount(frozenVersion), 0, 'a refused import created a section');
  });

  await test('somebody who does not author the course cannot import into it', async () => {
    const before = await sectionCount(versionId);

    await rejects(() => importOutline(other, versionId, outline), /teaching:not_allowed/);
    await rejects(() => importOutline(stranger, versionId, outline), /teaching:not_allowed/);
    eq(await sectionCount(versionId), before, 'a refused import created a section');
  });

  await test('one bad title refuses the whole file', async () => {
    const before = await sectionCount(versionId);
    const lessonCount = (await lessonRows(versionId)).length;

    const broken = [
      { title: 'Fine', lessons: [{ title: 'This one is fine', description: null, preview: false }] },
      { title: 'Blank', lessons: [{ title: '   ', description: null, preview: false }] },
    ];
    await rejects(() => importOutline(teacher, versionId, broken), /teaching:import_title_required/);

    eq(await sectionCount(versionId), before, 'sections after a refused import');
    eq((await lessonRows(versionId)).length, lessonCount, 'lessons after a refused import');
  });

  await test('a section with no lessons is refused rather than created empty', async () => {
    await rejects(
      () => importOutline(teacher, versionId, [{ title: 'Empty', lessons: [] }]),
      /teaching:import_section_empty/);
  });

  await test('a file past the limit is refused with the reason', async () => {
    const lessons = Array.from({ length: 301 }, (_, i) => ({
      title: `Lesson ${i}`, description: null, preview: false,
    }));
    await rejects(
      () => importOutline(teacher, versionId, [{ title: 'Too many', lessons }]),
      /teaching:import_too_large/);

    await rejects(
      () => importOutline(teacher, versionId, Array.from({ length: 51 }, (_, i) => ({
        title: `S${i}`, lessons: [{ title: 'L', description: null, preview: false }],
      }))),
      /teaching:import_too_large/);
  });

  await test('malformed structure is refused, not guessed at', async () => {
    await rejects(
      () => importOutline(teacher, versionId, { sections: [] }),
      /teaching:import_malformed/);
    await rejects(() => importOutline(teacher, versionId, []), /teaching:import_empty/);
    await rejects(
      () => importOutline(teacher, versionId, [{ title: 'A', lessons: 'nope' }]),
      /teaching:import_section_empty/);
    // A string where a boolean belongs is refused as malformed rather than
    // surfacing a cast error that names a type instead of the field.
    await rejects(
      () => importOutline(teacher, versionId, [{ title: 'A', lessons: [{ title: 'L', preview: 'yes' }] }]),
      /teaching:import_malformed/);
  });

  await test('the function is not callable without signing in', async () => {
    // Grants, not luck: `revoke all ... from public, anon` is the only thing that
    // stops an anonymous caller reaching a definer function.
    await q('begin');
    await q('set local role anon');
    try {
      await rejects(
        () => q('select public.import_course_outline($1,$2::jsonb)', [versionId, '[]']),
        /permission denied/i);
    } finally {
      await q('rollback');
    }
  });
}
