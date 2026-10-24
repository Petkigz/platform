// A course says who it is for.
//
// `courses.audience` and `learner_profiles.age_band` have both existed since the
// first schema and nothing joined them. `age_bands` is the missing half, and the
// rule that matters is the one refusing an audience and a band that disagree: a
// child course claiming 18+ makes the safeguarding signal useless exactly when
// somebody relies on it.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    committed, bootstrapAdmin, newUser, newProfile, grantRole,
    newInstructor, newCourse,
  } = ctx;

  const admin = await bootstrapAdmin('bands-admin@example.com');
  const author = await newInstructor('bands-author@example.com', admin);
  const otherAuthor = await newInstructor('bands-other@example.com', admin);
  const governance = await newUser('bands-gov@example.com');
  await newProfile(governance, 'Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));
  const learner = await newUser('bands-learner@example.com');
  await newProfile(learner, 'Learner');

  const courseId = await newCourse(author, { status: 'active' });
  const otherCourse = await newCourse(otherAuthor, { status: 'active' });

  async function as(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      return (await q(sql, params)).rows;
    } finally {
      await q('rollback');
    }
  }

  /** Same, but committed — these tests are about a row that has to survive. */
  async function asCommitted(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
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

  const setAudience = async (actor, id, audience, bands = []) =>
    (await asCommitted(actor, 'select public.set_course_audience($1,$2,$3) r',
      [id, audience, bands])).rows[0].r;

  const current = async (id) =>
    (await q('select audience, age_bands from public.courses where id = $1', [id])).rows[0];

  // -------------------------------------------------------------------------
  console.log('\nSaying who it is for');
  // -------------------------------------------------------------------------

  await test('every existing course means "any band its audience allows"', async () => {
    // Empty is not "unknown": it is the widest the audience permits, which is
    // what every course written before today means.
    assert((await current(courseId)).age_bands.length === 0, 'a new course claims bands');
    assert(
      JSON.stringify((await q(`select public.age_bands_for_audience('child') b`)).rows[0].b)
        === JSON.stringify(['5-7', '8-10', '11-13', '14-17']),
      'the child bands are wrong');
    assert(
      JSON.stringify((await q(`select public.age_bands_for_audience('adult') b`)).rows[0].b)
        === JSON.stringify(['18+']),
      'the adult bands are wrong');
    assert(
      JSON.stringify((await q(`select public.age_bands_for_audience('both') b`)).rows[0].b)
        === JSON.stringify(['5-7', '8-10', '11-13', '14-17', '18+']),
      'the bands for both audiences are wrong');
    assert(
      (await q(`select public.age_bands_for_audience('grownups') b`)).rows[0].b === null,
      'an unknown audience should have no bands',
    );
  });

  await test('the author sets an audience and its bands', async () => {
    const result = await setAudience(author, courseId, 'child', ['8-10', '5-7']);
    assert(result.changed === true, 'nothing was written');
    assert(result.audience === 'child', `audience was ${result.audience}`);
    // Normalised into the canonical order rather than the order sent.
    assert(JSON.stringify(result.ageBands) === JSON.stringify(['5-7', '8-10']), `bands were ${JSON.stringify(result.ageBands)}`);

    const row = await current(courseId);
    assert(row.audience === 'child', `stored audience ${row.audience}`);
    assert(JSON.stringify(row.age_bands) === JSON.stringify(['5-7', '8-10']), `stored ${JSON.stringify(row.age_bands)}`);
  });

  await test('the same values again change nothing and write no audit row', async () => {
    const before = (await q(
      `select count(*)::int n from public.governance_audit_events
        where action = 'course.audience_changed'`)).rows[0].n;
    const result = await setAudience(author, courseId, 'child', ['5-7', '8-10', '8-10']);
    assert(result.changed === false, 'a no-op claimed to change something');
    const after = (await q(
      `select count(*)::int n from public.governance_audit_events
        where action = 'course.audience_changed'`)).rows[0].n;
    assert(after === before, `a no-op wrote ${after - before} audit row(s)`);
  });

  await test('the change is audited with both sides', async () => {
    await setAudience(author, courseId, 'both', ['18+', '11-13']);
    const event = (await q(
      `select detail from public.governance_audit_events
        where action = 'course.audience_changed'
        order by occurred_at desc limit 1`)).rows[0];
    assert(event, 'no audit row');
    assert(event.detail.from_audience === 'child', `from ${event.detail.from_audience}`);
    assert(event.detail.to_audience === 'both', `to ${event.detail.to_audience}`);
    assert(JSON.stringify(event.detail.to_age_bands) === JSON.stringify(['11-13', '18+']), `to ${JSON.stringify(event.detail.to_age_bands)}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nAn audience and a band that disagree');
  // -------------------------------------------------------------------------

  await test('a child course may not claim an adult band', async () => {
    await rejects(
      () => as(author, 'select public.set_course_audience($1,$2,$3)',
        [courseId, 'child', ['18+']]),
      /18\+ is not a band the child audience may claim/);
  });

  await test('an adult course may not claim a child band', async () => {
    await rejects(
      () => as(author, 'select public.set_course_audience($1,$2,$3)',
        [courseId, 'adult', ['5-7']]),
      /5-7 is not a band the adult audience may claim/);
  });

  await test('a band that is not one of the five is refused by name', async () => {
    await rejects(
      () => as(author, 'select public.set_course_audience($1,$2,$3)',
        [courseId, 'both', ['9-11']]),
      /9-11 is not a band/);
  });

  await test('an audience that is not one of the three is refused', async () => {
    await rejects(
      () => as(author, 'select public.set_course_audience($1,$2,$3)',
        [courseId, 'grownups', ['18+']]),
      /child, adult or both/);
  });

  await test('the table refuses an unknown band even when the writer is bypassed', async () => {
    // The function is one door. The constraint is the door being locked.
    await rejects(
      () => q(`update public.courses set age_bands = array['9-11'] where id = $1`, [courseId]),
      /courses_age_bands_known/);
  });

  await test('bands may be emptied, which widens the course to its whole audience', async () => {
    const result = await setAudience(author, courseId, 'adult', []);
    assert(result.changed === true, 'emptying the bands changed nothing');
    assert(Array.isArray(result.ageBands) && result.ageBands.length === 0, 'the bands were not emptied');
    assert((await current(courseId)).age_bands.length === 0, 'the row kept its bands');
  });

  // -------------------------------------------------------------------------
  console.log('\nWho may say it');
  // -------------------------------------------------------------------------

  await test('another author cannot say who your course is for', async () => {
    await rejects(
      () => as(otherAuthor, 'select public.set_course_audience($1,$2,$3)',
        [courseId, 'adult', ['18+']]),
      /only the author, the platform admin or a governance admin/);
  });

  await test('a governance admin may, because it is an editorial decision', async () => {
    const result = await setAudience(governance, otherCourse, 'child', ['11-13']);
    assert(result.changed === true, 'governance was refused');
  });

  await test('a learner may not, and a signed-out caller is told to sign in', async () => {
    await rejects(
      () => as(learner, 'select public.set_course_audience($1,$2,$3)', [courseId, 'both', []]),
      /only the author/);
    await rejects(
      () => ctx.asAnon(() => q('select public.set_course_audience($1,$2,$3)', [courseId, 'both', []])),
      /sign in/);
  });

  await test('a course that does not exist says so', async () => {
    await rejects(
      () => as(author, 'select public.set_course_audience($1,$2,$3)',
        ['00000000-0000-0000-0000-000000000000', 'both', []]),
      /no such course/);
  });

  // -------------------------------------------------------------------------
  console.log('\nThe doors have switches');
  // -------------------------------------------------------------------------

  // Both doors read a flag, and a flag that is not in the register is a flag
  // nobody can find in the dashboard. They are seeded off, and they are the
  // owner's to flip — which is the whole reason this platform has a register.
  await test('both doors are in the register, off, and the owner may flip them', async () => {
    const { rows } = await q(
      `select key, value_type, value_text, gate_type from public.platform_settings
        where key in ('learning.audience_sections', 'learning.age_bands')
        order by key`,
    );
    assert(rows.length === 2, 'one of the two door switches is not in the register');
    for (const row of rows) {
      assert(row.value_type === 'boolean', `${row.key} is not a boolean`);
      assert(row.value_text === 'false', `${row.key} ships switched on`);
      assert(row.gate_type === 'admin', `${row.key} is not the owner's to flip`);
    }
  });
}
