// The language a course is taught in.
//
// Multi-language was registered as a flag with four preconditions, three of
// which need a translator. What needs none of them is the fact a learner asks
// first: what language is this course in, and does its script run the other way?
// This suite holds both halves of that — the declaration, and the refusal to
// pretend the interface has been translated.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('lang-admin@example.com');

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

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;
  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const teacher = await newInstructor('lang-teacher@example.com', admin);
  const stranger = await newUser('lang-stranger@example.com');
  await newProfile(stranger, 'Somebody Else');

  const reviewer = await newReviewer('lang-reviewer@example.com', admin);

  const publish = async (version, by) => {
    await satisfyReview(version, reviewer, admin);
    return q(
    `update public.course_versions
        set version_status = 'published', decision_by = $2,
            decision_reason = 'Approved for the language test'
      where id = $1`, [version, by]);
  };

  const english = await newCourse(teacher, { title: 'Arabic letters', status: 'active' });
  const englishVersion = await newVersion(english, teacher);
  await publish(englishVersion, admin);

  const arabic = await newCourse(teacher, { title: 'Tajweed for beginners', status: 'active' });
  const arabicVersion = await newVersion(arabic, teacher);
  await publish(arabicVersion, admin);

  await test('a new course is English, and its author says otherwise', async () => {
    const before = await scalar('select language_code from public.courses where id = $1', [arabic]);
    eq(before.language_code, 'en', 'the default');

    const out = await call(teacher, 'set_course_language($1,$2)', [arabic, 'ar']);
    eq(out.languageCode, 'ar', 'the new language');
    eq(out.changed, true, 'a change was recorded');

    const after = await scalar('select language_code from public.courses where id = $1', [arabic]);
    eq(after.language_code, 'ar', 'the stored language');

    const audit = await scalar(
      `select detail from public.governance_audit_events
        where action = 'course.language_changed' and target_id = $1`, [arabic]);
    eq(audit.detail.from, 'en', 'the audit records what it was');
    eq(audit.detail.to, 'ar', 'and what it became');
  });

  await test('setting the same language twice changes nothing', async () => {
    const out = await call(teacher, 'set_course_language($1,$2)', [arabic, 'ar']);
    eq(out.changed, false, 'a no-op is not a change');
  });

  await test('only the author or staff may say, and only an available language', async () => {
    await rejects(
      () => call(stranger, 'set_course_language($1,$2)', [arabic, 'ur']),
      /not_yours/);

    await rejects(
      () => call(teacher, 'set_course_language($1,$2)', [arabic, 'xx']),
      /not_available/);

    // Staff may correct it, which is the same pair `courses_update` allows.
    const out = await call(admin, 'set_course_language($1,$2)', [arabic, 'ar']);
    eq(out.languageCode, 'ar', 'staff may set it too');

    // A language nobody may choose today cannot be chosen — and a course that
    // is already filed under one is not rewritten when it is switched off.
    await q(`update public.languages set is_available = false where code = 'bn'`);
    try {
      await rejects(
        () => call(teacher, 'set_course_language($1,$2)', [english, 'bn']),
        /not_available/);
    } finally {
      await q(`update public.languages set is_available = true where code = 'bn'`);
    }
  });

  await test('the catalogue filter and its count agree', async () => {
    const all = await call(admin, 'catalogue_page($1,$2,$3,$4,$5,$6,$7)',
      [null, null, null, null, 24, 0, null]);
    const arabicOnly = await call(admin, 'catalogue_page($1,$2,$3,$4,$5,$6,$7)',
      [null, null, null, null, 24, 0, 'ar']);

    const ids = (page) => page.ordered.map((entry) => entry.courseId);
    assert(ids(arabicOnly).includes(arabic), 'the Arabic course is missing from its own filter');
    assert(!ids(arabicOnly).includes(english), 'an English course passed the Arabic filter');
    eq(arabicOnly.total, ids(arabicOnly).length, 'the count and the list disagree');

    // 'all' is the same as no filter, which is what the chip row's first chip is.
    const explicitAll = await call(admin, 'catalogue_page($1,$2,$3,$4,$5,$6,$7)',
      [null, null, null, null, 24, 0, 'all']);
    eq(explicitAll.total, all.total, '“all languages” narrowed the shelf');

    // A language nobody writes in returns nothing, with a count of zero rather
    // than an error or the whole shelf.
    const none = await call(admin, 'catalogue_page($1,$2,$3,$4,$5,$6,$7)',
      [null, null, null, null, 24, 0, 'he']);
    eq(none.total, 0, 'an unused language returned courses');
    eq(none.ordered.length, 0, 'an unused language returned a list');
  });

  await test('the chip row only offers a language somebody writes in', async () => {
    const chips = await call(admin, 'course_languages()');
    assert(Array.isArray(chips));
    const codes = chips.map((chip) => chip.code);
    assert(codes.includes('en'), 'English is missing');
    assert(codes.includes('ar'), 'Arabic is missing although a course uses it');
    assert(!codes.includes('he'), 'a language with no courses was offered as a filter');

    const ar = chips.find((chip) => chip.code === 'ar');
    eq(ar.direction, 'rtl', 'Arabic’s script direction');
    eq(ar.nativeName, 'العربية', 'the name a speaker reads');
    eq(ar.courses, 1, 'the number of courses in it');

    // The whole register is still readable — the chip row is a filter, not the
    // list of languages a course may use.
    const all = (await q('select count(*)::int n from public.languages')).rows[0].n;
    assert(all >= 14, 'the language register is too small to be a register');
  });

  await test('the flag says what is built, and what still needs a translator', async () => {
    const row = await scalar(
      `select gate_type, preconditions from public.platform_settings
        where key = 'learning.multi_language'`);
    eq(row.gate_type, 'admin', 'a built feature must not stay CODE-gated');
    assert(/dir="auto"/.test(row.preconditions), 'the precondition does not mention direction');
    assert(/translator/i.test(row.preconditions),
      'the precondition does not say what an interface translation needs');
  });
}
