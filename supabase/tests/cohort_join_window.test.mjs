// When a cohort stops accepting joiners.
//
// The rule that was built first — join any time until the class ends — let
// somebody arrive in the final week of a group whose conversation and markbook
// had moved on without them. The teacher now sets the window per cohort, and it
// defaults to the start date. What is worth pinning is that the default is
// strict, that only the teacher who opened the class can move it, that moving it
// is what lets a refused learner in, and that shutting the window governs
// arriving rather than staying.

export async function run(ctx) {
  const {
    q, test, assert, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('joinwindow-admin@example.com');
  const teacher = await newInstructor('joinwindow-teacher@example.com', admin);
  const otherTeacher = await newInstructor('joinwindow-other@example.com', admin);
  const reviewer = await newReviewer('joinwindow-reviewer@example.com', admin);

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'cohort join window test']);

  async function publishedCourse(author = teacher) {
    const course = await newCourse(author, { status: 'active' });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);
    await transition(version, 'submitted', author);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version };
  }

  let seq = 0;
  async function learner(enrolIn, name = 'Learner') {
    seq += 1;
    const userId = await newUser(`joinwindow-${seq}@example.com`);
    await newProfile(userId, `${name} ${seq}`);
    const learnerId = await committed(async () => {
      const id = (await q(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [`${name} ${seq}`, userId])).rows[0].id;
      await q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [id, enrolIn.course, enrolIn.version]);
      return id;
    });
    return { userId, learnerId };
  }

  async function asActor(actor, fn) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await fn(); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  async function refused(actor, sql, params, pattern) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [actor === null ? '' : JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    await q('savepoint window_refusal');
    let caught;
    try { await q(sql, params); } catch (e) { caught = e; }
    await q('rollback to savepoint window_refusal');
    await q('rollback');
    assert(caught, `expected a refusal matching ${pattern}`);
    const message = String(caught.message ?? caught);
    assert(pattern.test(message),
      `expected ${pattern}; got: ${message.slice(0, 240)}`);
    return message;
  }

  // Starts in two days, ends in thirty: a class that is open for joining but has
  // not begun, which is the state the window governs.
  const SQL_CREATE = `select public.create_cohort($1,$2,$3,$4,
                        now() + interval '2 days', now() + interval '30 days', $5, $6) as id`;
  const SQL_OPEN = "select public.set_cohort_status($1,'open')";
  const SQL_CLOSE = "select public.set_cohort_status($1,'closed')";
  const SQL_JOIN = 'select public.join_cohort($1,$2) as id';
  const SQL_LEAVE = 'select public.leave_cohort($1,$2)';
  const SQL_WINDOW = 'select public.set_cohort_join_window($1,$2) as closes_at';

  const create = (over = {}) => asActor(teacher, async () =>
    (await q(SQL_CREATE, [
      fixture.course,
      fixture.version,
      over.title ?? 'Join window cohort',
      over.description ?? null,
      over.capacity ?? null,
      Object.prototype.hasOwnProperty.call(over, 'joinClosesAt') ? over.joinClosesAt : null,
    ])).rows[0].id);

  /** An open cohort with a window that has not shut. */
  async function openCohort(over = {}) {
    const cohort = await create(over);
    await asActor(teacher, async () => q(SQL_OPEN, [cohort]));
    return cohort;
  }

  const windowOf = async (id) =>
    (await q('select starts_at, ends_at, join_closes_at, status from public.cohorts where id=$1', [id])).rows[0];

  /** Let time pass without waiting for it: shut the window from the past. */
  const shutWindow = (id) =>
    q(`update public.cohorts set join_closes_at = now() - interval '1 hour' where id=$1`, [id]);

  const activeMembers = async (id) =>
    (await q(`select count(*)::int n from public.cohort_members
               where cohort_id=$1 and status='active'`, [id])).rows[0].n;

  /** Days from now, as a real timestamp: an SQL expression cannot ride in as a parameter. */
  const iso = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

  const fixture = await publishedCourse();

  await q("update public.platform_settings set value_text='true' where key='learning.cohorts'");
  try {
    await test('a cohort takes its join window from its start date unless the teacher says otherwise', async () => {
      const cohort = await create();
      const row = await windowOf(cohort);
      assert(row.join_closes_at !== null, 'the window was left unset');
      assert(new Date(row.join_closes_at).getTime() === new Date(row.starts_at).getTime(),
        `the window closes at ${row.join_closes_at}, not at the ${row.starts_at} start`);

      const audit = (await q(
        `select detail from public.governance_audit_events
          where target_type='cohort' and action='cohort.created' and target_id=$1`, [cohort])).rows[0];
      assert(audit.detail.join_window_defaulted === true,
        'the log does not say the teacher left the window at its default');
    });

    await test('the teacher can close registration before the class begins, or hold it open longer', async () => {
      const early = await create({ joinClosesAt: iso(1) });
      let row = await windowOf(early);
      assert(new Date(row.join_closes_at) < new Date(row.starts_at),
        'registration could not close before the start date');

      const late = await create({ joinClosesAt: iso(10) });
      row = await windowOf(late);
      assert(new Date(row.join_closes_at) > new Date(row.starts_at),
        'the window could not be held open past the start');
      assert(new Date(row.join_closes_at) <= new Date(row.ends_at),
        'the window outlived the class');
    });

    await test('a window that has already shut, or that outlives the class, is refused at creation', async () => {
      await refused(teacher, SQL_CREATE,
        [fixture.course, fixture.version, 'Shut on arrival', null, null, iso(-1 / 24)],
        /must close later than now/i);
      await refused(teacher, SQL_CREATE,
        [fixture.course, fixture.version, 'After the end', null, null, iso(40)],
        /cannot close after the cohort ends/i);
    });

    await test('a learner joins while the window is open and is refused once it shuts', async () => {
      const cohort = await openCohort();
      const who = await learner({ course: fixture.course, version: fixture.version });

      await shutWindow(cohort);
      const message = await refused(who.userId, SQL_JOIN, [cohort, who.learnerId],
        /stopped accepting joiners/i);
      assert(/\d{4}-\d{2}-\d{2}/.test(message),
        'the refusal did not tell the learner when the window shut');
      assert(!/already ended/i.test(message),
        'the refusal claimed the class had ended when it had only stopped taking joiners');
      assert(await activeMembers(cohort) === 0, 'a refused joiner was still added');
    });

    await test('extending the window is how a refused learner gets in', async () => {
      const cohort = await openCohort();
      const who = await learner({ course: fixture.course, version: fixture.version });

      await shutWindow(cohort);
      await refused(who.userId, SQL_JOIN, [cohort, who.learnerId], /stopped accepting joiners/i);

      // The teacher's actual use: two more days, because the opening is slow.
      await asActor(teacher, async () => q(SQL_WINDOW, [cohort, iso(5)]));

      await asActor(who.userId, async () => q(SQL_JOIN, [cohort, who.learnerId]));
      assert(await activeMembers(cohort) === 1,
        'the learner could not join after the window was extended');

      const audit = (await q(
        `select actor, detail from public.governance_audit_events
          where target_type='cohort' and action='cohort.join_window_set' and target_id=$1`,
        [cohort])).rows[0];
      assert(audit.actor === teacher);
      assert(audit.detail.previous_join_closes_at !== null,
        'the log did not record the window that was replaced');
    });

    await test('only the teacher who opened the cohort can move the window', async () => {
      const cohort = await openCohort();
      const who = await learner({ course: fixture.course, version: fixture.version });
      const future = iso(5);

      await refused(otherTeacher, SQL_WINDOW, [cohort, future], /only the teacher who opened/i);
      await refused(who.userId, SQL_WINDOW, [cohort, future], /only the teacher who opened/i);
      await refused(null, SQL_WINDOW, [cohort, future], /sign in to change a cohort/i);
      await refused(teacher, SQL_WINDOW, [cohort, null], /choose when the cohort stops/i);

      // A privileged account acting for the teacher may, as elsewhere.
      await asActor(admin, async () => q(SQL_WINDOW, [cohort, future]));
      assert(new Date((await windowOf(cohort)).join_closes_at).getTime() === new Date(future).getTime());
    });

    await test('a window cannot be moved into the past or past the end of the class', async () => {
      const cohort = await openCohort();
      await refused(teacher, SQL_WINDOW, [cohort, iso(-1 / 24)], /must close later than now/i);
      await refused(teacher, SQL_WINDOW, [cohort, iso(40)], /cannot close after the cohort ends/i);
    });

    await test('a class that has stopped taking joiners cannot have its window moved', async () => {
      const cohort = await openCohort();
      await asActor(teacher, async () => q(SQL_CLOSE, [cohort]));
      await refused(teacher, SQL_WINDOW, [cohort, iso(5)],
        /closed cohort is not accepting joiners/i);
    });

    await test('shutting the window governs arriving, not staying', async () => {
      const cohort = await openCohort();
      const who = await learner({ course: fixture.course, version: fixture.version });
      await asActor(who.userId, async () => q(SQL_JOIN, [cohort, who.learnerId]));
      assert(await activeMembers(cohort) === 1);

      await shutWindow(cohort);
      assert(await activeMembers(cohort) === 1,
        'closing the window removed somebody who was already in the class');

      // And they can still leave: a window that has shut is not a locked door.
      await asActor(who.userId, async () => q(SQL_LEAVE, [cohort, who.learnerId]));
      assert(await activeMembers(cohort) === 0, 'the member could not leave a class that stopped taking joiners');
    });

    await test('the window cannot outlive the class even through a direct write', async () => {
      const cohort = await openCohort();
      let caught;
      try {
        await q(`update public.cohorts set join_closes_at = ends_at + interval '1 day' where id=$1`,
          [cohort]);
      } catch (e) { caught = e; }
      assert(caught && /cohorts_join_window_fits_the_class/i.test(String(caught.message)),
        'the table let a join window extend past the end of the class');
      const row = await windowOf(cohort);
      assert(new Date(row.join_closes_at) <= new Date(row.ends_at));
    });

  } finally {
    await q("update public.platform_settings set value_text='false' where key='learning.cohorts'");
  }

  await test('the register no longer calls the late-join rule open, and cohorts still ship off', async () => {
    const flag = (await q(
      `select value_text, preconditions from public.platform_settings
        where key='learning.cohorts'`)).rows[0];
    assert(flag.value_text === 'false', 'settling the late-join rule must not switch cohorts on');
    assert(/join_closes_at/i.test(flag.preconditions),
      'the register does not describe the window it now has');
    assert(!/review that late-join rule/i.test(flag.preconditions),
      'the register still names the late-join rule as something to review');

    const assignments = (await q(
      `select preconditions from public.platform_settings
        where key='learning.assignments'`)).rows[0].preconditions;
    assert(!/late-join/i.test(assignments),
      'the assignment preconditions still wait on a cohort rule that is now settled');
    assert(/revision loop/i.test(assignments),
      'the assignment preconditions lost the revision loop');
  });
}
