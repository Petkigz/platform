// Every course, and who it is for.
//
// The shelf exists because a power with no screen is not a power: the platform
// admin and a governance admin may set a course's audience, and until this
// function they had no page that showed every course at all. The tests below
// are about the two things that make such a list safe — who may read it, and
// what it refuses to say about the people studying.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    committed, bootstrapAdmin, newUser, newProfile, grantRole,
    newInstructor, newCourse,
  } = ctx;

  const admin = await bootstrapAdmin('shelf-admin@example.com');
  const author = await newInstructor('shelf-author@example.com', admin);
  const otherAuthor = await newInstructor('shelf-other@example.com', admin);
  await q(`update public.user_profiles set display_name = 'Fatima Nur' where user_id = $1`, [author]);
  await q(`update public.user_profiles set display_name = 'Yusuf Ali' where user_id = $1`, [otherAuthor]);

  const governance = await newUser('shelf-gov@example.com');
  await newProfile(governance, 'Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  const support = await newUser('shelf-support@example.com');
  await newProfile(support, 'Support');
  await committed(() => grantRole(support, 'support_agent', admin));

  const learner = await newUser('shelf-learner@example.com');
  await newProfile(learner, 'Learner');

  // One of each audience, plus a retired course that must stay visible: a
  // course behind the wrong door that nobody can browse to is exactly the one
  // this shelf is for.
  const childCourse = await newCourse(author, {
    title: 'The alphabet, for little ones', audience: 'child', status: 'active',
  });
  const adultCourse = await newCourse(author, {
    title: 'Fiqh for adults', audience: 'adult', status: 'active',
  });
  const bothCourse = await newCourse(otherAuthor, {
    title: 'Stories of the prophets', audience: 'both', status: 'active',
  });
  const retiredCourse = await newCourse(otherAuthor, {
    title: 'An old course, retired', audience: 'both', status: 'retired',
  });

  async function as(userId, sql, params) {
    let out;
    await ctx.asUser(userId, async () => {
      out = await q(sql, params);
    });
    return out;
  }

  const shelf = async (who, search = null, audience = null, limit = 50) => {
    const r = await as(who, 'select public.course_shelf($1,$2,$3) v', [search, audience, limit]);
    return r.rows[0].v;
  };

  // -------------------------------------------------------------------------
  console.log('\nWho may read it');
  // -------------------------------------------------------------------------

  await test('a signed-out caller is told to sign in', async () => {
    await rejects(
      () => ctx.asAnon(() => q(`select public.course_shelf(null, null, 50)`)),
      /sign in/);
  });

  await test('a learner cannot read the unpublished shelf', async () => {
    await rejects(
      () => as(learner, 'select public.course_shelf($1,$2,$3)', [null, null, 50]),
      /only the platform admin or a governance admin/);
  });

  await test('support is staff but the shelf is not theirs', async () => {
    // The sharper boundary: support is privileged, and `is_privileged` would
    // have let them in. The shelf gates on the two roles that may change an
    // audience instead.
    await rejects(
      () => as(support, 'select public.course_shelf($1,$2,$3)', [null, null, 50]),
      /only the platform admin or a governance admin/);
  });

  await test('an author cannot read everybody else\u2019s courses', async () => {
    await rejects(
      () => as(author, 'select public.course_shelf($1,$2,$3)', [null, null, 50]),
      /only the platform admin or a governance admin/);
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat it shows');
  // -------------------------------------------------------------------------

  await test('the owner sees every course, retired ones included', async () => {
    const result = await shelf(admin);
    assert(result.total >= 4, `the shelf showed only ${result.total} courses`);
    const ids = result.rows.map((r) => r.courseId);
    for (const id of [childCourse, adultCourse, bothCourse, retiredCourse]) {
      assert(ids.includes(id), 'a course is missing from the shelf');
    }
    const retired = result.rows.find((r) => r.courseId === retiredCourse);
    assert(retired.status === 'retired', 'the retired course lost its status');
  });

  await test('governance sees the same shelf', async () => {
    const result = await shelf(governance);
    assert(result.total >= 4, 'governance saw a shorter shelf than the owner');
  });

  await test('every row says who it is for', async () => {
    const result = await shelf(admin);
    const child = result.rows.find((r) => r.courseId === childCourse);
    assert(child.audience === 'child', 'the audience is wrong');
    assert(Array.isArray(child.ageBands), 'age_bands did not arrive as an array');
    assert(child.author === 'Fatima Nur', `the author is ${child.author}`);
  });

  await test('filtering by audience leaves "both" out of each half', async () => {
    const children = await shelf(admin, null, 'child');
    assert(children.rows.every((r) => r.audience === 'child'), 'a non-child course was listed');
    assert(!children.rows.some((r) => r.courseId === bothCourse), 'a "both" course counted as a child course');
    const adults = await shelf(admin, null, 'adult');
    assert(adults.rows.every((r) => r.audience === 'adult'), 'a non-adult course was listed');
    assert(!adults.rows.some((r) => r.courseId === bothCourse), 'a "both" course counted as an adult course');
  });

  await test('an audience that is not one says so', async () => {
    await rejects(
      () => as(admin, 'select public.course_shelf($1,$2,$3)', [null, 'grownups', 50]),
      /an audience is child, adult or both/);
  });

  await test('search matches the title, and the author', async () => {
    const byTitle = await shelf(admin, 'alphabet');
    assert(byTitle.total >= 1 && byTitle.total < 4, 'the title search did not narrow the shelf');
    assert(byTitle.rows[0].courseId === childCourse, 'the wrong course came back');

    const byAuthor = await shelf(admin, 'Fatima Nur');
    assert(byAuthor.total === 2, `searching the author found ${byAuthor.total} courses`);
    assert(byAuthor.rows.every((r) => r.author === 'Fatima Nur'), 'a course by somebody else came back');
  });

  await test('a cut-off list says it was cut off', async () => {
    const result = await shelf(admin, null, null, 1);
    assert(result.shown === 1, 'the limit was not applied');
    assert(result.total >= 4, 'the total was lost');
    assert(result.truncated === (result.total > result.shown), 'truncated disagrees with the numbers');
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat it refuses to say');
  // -------------------------------------------------------------------------

  await test('it counts learners and names none', async () => {
    const result = await shelf(admin);
    const row = result.rows[0];
    const keys = Object.keys(row).sort();
    assert(
      JSON.stringify(keys) === JSON.stringify([
        'ageBands', 'audience', 'author', 'authorId', 'courseId', 'createdAt',
        'lastPublishedAt', 'learners', 'publishedVersions', 'slug', 'status', 'title',
      ]),
      `the shelf row grew a column: ${keys.join(', ')}`);
    assert(typeof row.learners === 'number', 'the learner count is not a number');
    const text = JSON.stringify(result);
    assert(!text.includes('learner_profile_id') && !text.includes('learnerProfileId'),
      'a learner identifier is somewhere in the payload');
    assert(!/price|revenue|amount|total_paid/i.test(text), 'money appeared in the shelf');
  });
}
