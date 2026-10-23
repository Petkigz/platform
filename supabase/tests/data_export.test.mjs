// The completeness of the export.
//
// `export_my_data()` was built with its boundaries documented and tested; what
// it did not carry was most of what a person actually did here. These tests are
// about the added halves — what you wrote and were marked on, what you bought
// with money you earned, what support told you — and about the three promises
// around them: a row limit that admits it was hit, a list of what is left out,
// and a record of every copy taken.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor,
    newCourse, newVersion,
  } = ctx;

  const admin = await bootstrapAdmin('expc-admin@example.com');
  const teacher = await newInstructor('expc-teacher@example.com', admin);

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
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

  const exportOf = (actor) =>
    asActor(actor, 'select public.export_my_data() d').then((r) => r.rows[0].d);

  async function adult(name) {
    const userId = await newUser(`expc-${crypto.randomUUID().slice(0, 8)}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (linked_user_id, display_name, learner_type)
       values ($1,$2,'adult') returning id`, [userId, name])).id;
    return { userId, learnerId };
  }

  async function withFlag(key, on, fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = $1`, [key])).value_text;
    await q('update public.platform_settings set value_text = $1 where key = $2', [on ? 'true' : 'false', key]);
    try {
      return await fn();
    } finally {
      await q('update public.platform_settings set value_text = $1 where key = $2', [before, key]);
    }
  }

  await test('the export is not behind a switch, and a signed-out caller is refused', async () => {
    // A right behind a flag that ships off is not a right. The flag covers the
    // part that is still unbuilt: CSV and PDF renderings, and an import path.
    const person = await adult('Ungated');
    const flag = await scalar(
      `select value_text from public.platform_settings where key = 'platform.data_export'`);
    assert(flag.value_text === 'false', `the flag ships ${flag.value_text}`);
    const doc = await exportOf(person.userId);
    assert(doc.formatVersion === 1, 'the export was refused while its flag was off');

    await rejects(() => q('select public.export_my_data()'), /sign in to/i);
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat you did here');
  // -------------------------------------------------------------------------
  await test('a review and a discussion post you wrote are in it', async () => {
    const person = await adult('Reviewer Of Courses');
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await scalar(
      `insert into public.course_sections (course_version_id, title, position)
       values ($1,'One',1) returning id`, [version]);
    const lesson = (await scalar(
      `insert into public.lessons (section_id, title, position, type)
       values ($1,'A lesson',1,'text') returning id`, [section.id])).id;

    await q(`insert into public.course_reviews
               (course_id, course_version_id, learner_profile_id, written_by, rating, body)
             values ($1,$2,$3,$4,5,'A good course')`,
      [course, version, person.learnerId, person.userId]);

    await withFlag('learning.discussion', true, async () => {
      await q(`insert into public.discussion_posts (lesson_id, author_user_id, body, author_kind)
               values ($1,$2,'A question','learner')`, [lesson, person.userId]);
    });

    const doc = await exportOf(person.userId);
    assert(doc.reviews.length === 1, `${doc.reviews.length} reviews`);
    assert(doc.reviews[0].body === 'A good course');
    assert(doc.reviews[0].rating === 5);
    assert(doc.discussion.length === 1, `${doc.discussion.length} posts`);
    assert(doc.discussion[0].body === 'A question');
    assert(doc.discussion[0].lesson === 'A lesson');
  });

  await test('somebody else\'s reply under your post is not in it', async () => {
    const person = await adult('Post Owner');
    const other = await adult('Reply Owner');
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await scalar(
      `insert into public.course_sections (course_version_id, title, position)
       values ($1,'One',1) returning id`, [version]);
    const lesson = (await scalar(
      `insert into public.lessons (section_id, title, position, type)
       values ($1,'A lesson',1,'text') returning id`, [section.id])).id;

    await withFlag('learning.discussion', true, async () => {
      const mine = (await scalar(
        `insert into public.discussion_posts (lesson_id, author_user_id, body, author_kind)
         values ($1,$2,'My own words','learner') returning id`, [lesson, person.userId])).id;
      await q(`insert into public.discussion_posts (lesson_id, parent_id, author_user_id, body, author_kind)
               values ($1,$2,$3,'A reply that is not mine','learner')`, [lesson, mine, other.userId]);
    });

    const doc = await exportOf(person.userId);
    assert(doc.discussion.length === 1, `the export held ${doc.discussion.length} posts`);
    assert(!JSON.stringify(doc).includes('not mine'), "another person's reply was exported");
  });

  await test('internal staff notes on your support case stay internal', async () => {
    const person = await adult('Supported Person');
    const caseId = (await scalar(
      `insert into public.support_cases
         (case_number, requested_by, category, subject, body)
       values ('SC-' || lpad(nextval('public.support_case_number_seq')::text, 6, '0'),
               $1,'account','A question','Please help') returning id`,
      [person.userId])).id;
    await q(`insert into public.support_case_messages (case_id, author_user_id, author_kind, body)
             values ($1,$2,'requester','Here is my question')`, [caseId, person.userId]);
    await q(`insert into public.support_case_messages (case_id, author_user_id, author_kind, body, is_internal)
             values ($1,$2,'staff','Internal note nobody should read','true')`, [caseId, person.userId]);

    const doc = await exportOf(person.userId);
    assert(doc.support.length === 1, `support held ${doc.support.length} cases`);
    assert(doc.support[0].body === 'Please help');
    assert(JSON.stringify(doc.support[0].messages).includes('Here is my question'));
    assert(!JSON.stringify(doc).includes('nobody should read'), 'an internal note was exported');
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat it says about itself');
  // -------------------------------------------------------------------------
  await test('it names what it left out, in words', async () => {
    const person = await adult('Curious Reader');
    const doc = await exportOf(person.userId);
    assert(Array.isArray(doc.notIncluded) && doc.notIncluded.length >= 5,
      `notIncluded held ${JSON.stringify(doc.notIncluded)}`);
    for (const entry of doc.notIncluded) {
      assert(entry.what && entry.why, `an entry lacks a reason: ${JSON.stringify(entry)}`);
    }
    const subjects = doc.notIncluded.map((e) => e.what).join(' | ');
    assert(/other people/i.test(subjects), 'other people\'s words are not named');
    assert(/sign-in address/i.test(subjects), 'the sign-in address is not named');
    assert(/staff notes/i.test(subjects), 'internal notes are not named');
  });

  await test('a list at the limit is cut, and says so', async () => {
    const person = await adult('Prolific');
    for (let i = 0; i < 1005; i += 1) {
      await q(`insert into public.notifications (user_id, kind, title, body, href)
               values ($1,'payout_paid',$2,'A message','/teach/payouts')`,
        [person.userId, `Message ${i}`]);
    }

    const doc = await exportOf(person.userId);
    assert(doc.notifications.length === 1000, `${doc.notifications.length} notifications`);
    assert(doc.meta.rowLimit === 1000);
    assert(doc.meta.truncated.includes('notifications'),
      `truncated was ${JSON.stringify(doc.meta.truncated)}`);
    assert(doc.meta.counts.notifications === 1005, `counts said ${doc.meta.counts.notifications}`);
    assert(/cut at the limit/i.test(doc.meta.note), `note was ${doc.meta.note}`);
  });

  await test('a complete export says it is complete', async () => {
    const person = await adult('Tidy Person');
    const doc = await exportOf(person.userId);
    assert(doc.meta.truncated.length === 0,
      `a fresh account had a cut list: ${JSON.stringify(doc.meta.truncated)}`);
    assert(doc.meta.note === 'Every list is complete.');
  });

  // -------------------------------------------------------------------------
  console.log('\nEvery copy is recorded');
  // -------------------------------------------------------------------------
  await test('each export writes an audit event with its counts', async () => {
    const person = await adult('Audited Person');
    const before = (await scalar(
      `select count(*)::int n from public.governance_audit_events
        where actor = $1 and action = 'data.exported'`, [person.userId])).n;
    await exportOf(person.userId);
    const row = await scalar(
      `select detail from public.governance_audit_events
        where actor = $1 and action = 'data.exported'
        order by occurred_at desc limit 1`, [person.userId]);
    const after = (await scalar(
      `select count(*)::int n from public.governance_audit_events
        where actor = $1 and action = 'data.exported'`, [person.userId])).n;
    assert(after === before + 1, `audit events went from ${before} to ${after}`);
    assert(row.detail.formatVersion === 1);
    assert(row.detail.counts, 'the audit event did not record the counts');
  });

  await test('ten an hour is the limit, and the eleventh is refused', async () => {
    const person = await adult('Busy Person');
    for (let i = 0; i < 10; i += 1) {
      await exportOf(person.userId);
    }
    await rejects(() => exportOf(person.userId), /ten exports in the last hour/i);
  });

}
