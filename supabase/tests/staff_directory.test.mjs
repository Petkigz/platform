// Two screens that are not queues: who has an account, and who teaches.
//
// The rules worth pinning are the ones that would embarrass the platform if
// they slipped: a child is not an account, no money appears in a directory, and
// who teaches is the owner's question rather than every staff member's.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    committed, bootstrapAdmin, newUser, newProfile, grantRole,
    newCourse, newVersion,
  } = ctx;

  const admin = await bootstrapAdmin('dir-admin@example.com');

  const person = async (email, name, role) => {
    const id = await newUser(email);
    await newProfile(id, name);
    if (role) await committed(() => grantRole(id, role, admin));
    return id;
  };

  const support = await person('dir-support@example.com', 'Sam Support', 'support_agent');
  const governance = await person('dir-gov@example.com', 'Amina Governance', 'governance_admin');
  const finance = await person('dir-finance@example.com', 'Yusuf Finance', 'finance_admin');
  const teacher = await person('dir-teacher@example.com', 'Ustadh Bilal', 'instructor');
  const learner = await person('dir-learner@example.com', 'A Learner');

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

  const dir = async (actor, kind, search = null, limit = 50) =>
    (await as(actor, 'select public.staff_directory($1,$2,$3) d', [kind, search, limit]))[0].d;

  // -------------------------------------------------------------------------
  console.log('\nWho may look at people');
  // -------------------------------------------------------------------------

  await test('a learner is refused both lists', async () => {
    await rejects(() => as(learner, `select public.staff_directory('accounts')`),
      /only platform staff/);
    await rejects(() => as(learner, `select public.staff_directory('teachers')`),
      /only platform staff/);
  });

  await test('a signed-out caller is told to sign in', async () => {
    await rejects(() => ctx.asAnon(() => q(`select public.staff_directory('accounts')`)),
      /sign in/);
  });

  await test('a support agent may find an account, because that is their job', async () => {
    const result = await dir(support, 'accounts');
    assert(result.rows.length >= 3, `saw ${result.rows.length} accounts`);
    assert(result.rows.some((r) => r.name === 'Ustadh Bilal'), 'the teacher is missing');
  });

  await test('who teaches is not a support question', async () => {
    await rejects(() => dir(support, 'teachers'), /platform admin or a governance admin/);
  });

  await test('the owner and governance may see the roster; finance may not', async () => {
    const seenByOwner = await dir(admin, 'teachers', 'Bilal');
    assert(seenByOwner.rows.some((r) => r.name === 'Ustadh Bilal'), 'the owner saw no teachers');

    const seenByGovernance = await dir(governance, 'teachers', 'Bilal');
    assert(seenByGovernance.rows.some((r) => r.name === 'Ustadh Bilal'),
      'governance saw no teachers');

    await rejects(() => dir(finance, 'teachers'), /platform admin or a governance admin/);
  });

  await test('a kind that is not a list is refused by name', async () => {
    await rejects(() => dir(admin, 'people'), /accounts or teachers/);
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat an account row says');
  // -------------------------------------------------------------------------

  await test('an account carries its roles, and the row holds no money', async () => {
    const result = await dir(admin, 'accounts');
    const row = result.rows.find((r) => r.name === 'Yusuf Finance');
    assert(row, 'the finance admin is missing');
    assert(Array.isArray(row.roles) && row.roles.includes('finance_admin'),
      `roles were ${JSON.stringify(row.roles)}`);

    // The directory is about people. A balance, a lifetime value or a total
    // spent would be the one screen where two currencies get added by eye.
    const keys = Object.keys(row).join(',');
    for (const forbidden of ['earnings', 'balance', 'spent', 'revenue', 'currency']) {
      assert(!keys.includes(forbidden), `an account row carries ${forbidden}`);
    }
  });

  await test('a person with no role has an empty list rather than a null', async () => {
    const result = await dir(admin, 'accounts');
    const row = result.rows.find((r) => r.name === 'A Learner');
    assert(row, 'the learner account is missing');
    assert(Array.isArray(row.roles) && row.roles.length === 0,
      `roles were ${JSON.stringify(row.roles)}`);
  });

  await test('an account that has been closed is still listed, with its status', async () => {
    // Erasing an account removes the profile; a closed one keeps it, and a
    // support agent asking "is this account still open" needs the answer.
    await committed(async () => {
      // `protect_account_status` refuses a status change to the account it
      // belongs to — including from a session-less superuser, because
      // `current_user_id()` coalesces to the row's own id. The erasure path
      // raises the same flag for the same reason.
      await q(`set local app.account_erasure = 'on'`);
      await q(`update public.user_profiles set account_status = 'suspended'
                where user_id = $1`, [learner]);
    });
    const result = await dir(admin, 'accounts');
    const row = result.rows.find((r) => r.name === 'A Learner');
    assert(row.status === 'suspended', `status was ${row.status}`);
    await committed(async () => {
      await q(`set local app.account_erasure = 'on'`);
      await q(`update public.user_profiles set account_status = 'active'
                where user_id = $1`, [learner]);
    });
  });

  await test('an erased account is not in the directory', async () => {
    const gone = await person('dir-gone@example.com', 'Deleted Person');
    await committed(async () => {
      await q('delete from auth.users where id = $1', [gone]);
    });
    const result = await dir(admin, 'accounts');
    assert(!result.rows.some((r) => r.name === 'Deleted Person'), 'an erased person is listed');
  });

  // -------------------------------------------------------------------------
  console.log('\nFinding one person');
  // -------------------------------------------------------------------------

  await test('a name is matched regardless of case, and in the middle of it', async () => {
    const byName = await dir(admin, 'accounts', 'BILAL');
    assert(byName.rows.some((r) => r.name === 'Ustadh Bilal'), 'case-insensitive search failed');

    const partial = await dir(admin, 'accounts', 'ilal');
    assert(partial.rows.some((r) => r.name === 'Ustadh Bilal'), 'substring search failed');
  });

  await test('an email is matched, because that is what a person quotes in a support message', async () => {
    const result = await dir(admin, 'accounts', 'dir-teacher@example');
    assert(result.rows.length === 1, `matched ${result.rows.length}`);
    assert(result.rows[0].name === 'Ustadh Bilal', `matched ${result.rows[0].name}`);
  });

  await test('a percent sign searches for a percent sign, not for everything', async () => {
    // The escaping matters: an unescaped `%` turns a search box into a full
    // dump of every account on the platform, which is how a directory leaks.
    const result = await dir(admin, 'accounts', '%');
    assert(result.rows.length === 0, `a search for % returned ${result.rows.length} rows`);
    assert(result.total === 0, `the total was ${result.total}`);
  });

  await test('the list says how many it is not showing', async () => {
    const limited = await dir(admin, 'accounts', null, 2);
    assert(limited.shown === 2, `showed ${limited.shown}`);
    assert(limited.total > 2, `total was ${limited.total}`);
    assert(limited.truncated === true, 'it did not admit to being cut short');

    // The full-run database has accounts from every suite that came before, so
    // "it fits" is not a safe assumption: what has to hold is that the flag
    // agrees with the arithmetic.
    const all = await dir(admin, 'accounts', null, 200);
    assert(all.truncated === (all.total > all.shown),
      `truncated=${all.truncated} with ${all.shown} of ${all.total}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat the teacher roster counts');
  // -------------------------------------------------------------------------

  await test('a teacher with no course is on the roster with a zero', async () => {
    // Searched, not listed: the roster is ordered by what a teacher has
    // published and cut at a limit, and earlier suites leave their own
    // instructors behind. A fixture has to be found the way a person finds one.
    const result = await dir(admin, 'teachers', 'Bilal');
    const row = result.rows.find((r) => r.name === 'Ustadh Bilal');
    assert(row, 'the teacher is missing');
    assert(row.courses === 0 && row.publishedCourses === 0,
      `counts were ${row.courses}/${row.publishedCourses}`);
    assert(row.profileStatus === null, 'no profile should read as no profile, not as draft');
  });

  await test('a draft version is a course but not a published one', async () => {
    const courseId = await newCourse(teacher);
    await newVersion(courseId, teacher);

    const row = (await dir(admin, 'teachers', 'Bilal')).rows.find((r) => r.name === 'Ustadh Bilal');
    assert(row.courses === 1, `courses was ${row.courses}`);
    assert(row.publishedCourses === 0, `published was ${row.publishedCourses}`);
  });

  await test('a published version is counted once, however many versions there are', async () => {
    const courseId = await newCourse(teacher);
    const v1 = await newVersion(courseId, teacher, { version_number: 1 });
    await newVersion(courseId, teacher, { version_number: 2 });
    // Publication is guarded: a version with no scholarly approval cannot be
    // published, so the fixture goes through the review machinery rather than
    // around it.
    const reviewer = await ctx.newReviewer('dir-reviewer@example.com', admin);
    await committed(() => ctx.satisfyReview(v1, reviewer, admin));
    await committed(async () => {
      await q(`update public.course_versions set version_status = 'published',
                 published_at = now() where id = $1`, [v1]);
    });

    const row = (await dir(admin, 'teachers', 'Bilal')).rows.find((r) => r.name === 'Ustadh Bilal');
    assert(row.publishedCourses === 1, `published was ${row.publishedCourses} for one course`);
    assert(row.courses === 2, `courses was ${row.courses}`);
  });

  await test('only someone holding instructor is on the roster', async () => {
    const people = (await dir(admin, 'teachers', 'Bilal')).rows.map((r) => r.name);
    assert(people.includes('Ustadh Bilal'), 'the teacher is missing');
    assert(!people.includes('Sam Support'), 'a support agent is on the teacher roster');
    assert(!people.includes('A Learner'), 'a learner is on the teacher roster');
  });

  await test('a revoked instructor role removes somebody from the roster', async () => {
    const temp = await person('dir-temp@example.com', 'Temp Teacher', 'instructor');
    assert((await dir(admin, 'teachers', 'Temp Teacher')).rows.some((r) => r.userId === temp),
      'the new teacher is not on the roster');

    await committed(async () => {
      await q(`update public.user_role_assignments a
                  set revoked_at = now(),
                      revocation_reason = 'Fixture: revoked for the roster test'
                 from public.roles r
                where r.id = a.role_id and r.code = 'instructor' and a.user_id = $1`, [temp]);
    });
    assert(!(await dir(admin, 'teachers', 'Temp Teacher')).rows.some((r) => r.userId === temp),
      'a revoked teacher is still on the roster');
  });
}
