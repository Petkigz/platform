// Optional transcripts are authored text, not public course-outline metadata.
export async function run(ctx) {
  const { q, test, assert, rejects, asUser, asAnon, bootstrapAdmin, newInstructor,
    newReviewer, satisfyReview, newUser, newProfile, newCourse, newVersion,
    newSection, newLesson } = ctx;
  const admin = await bootstrapAdmin('transcript-admin@example.com');
  const teacher = await newInstructor('transcript-teacher@example.com', admin);
  const other = await newInstructor('transcript-other@example.com', admin);
  const reviewer = await newReviewer('transcript-reviewer@example.com', admin);
  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lesson = await newLesson(section, { title: 'Transcript lesson' });
  const learner = await newUser('transcript-learner@example.com');
  const stranger = await newUser('transcript-stranger@example.com');
  await newProfile(learner, 'Transcript learner');
  await newProfile(stranger, 'Transcript stranger');
  const lp = (await q(`insert into public.learner_profiles (display_name,learner_type,age_band,linked_user_id)
    values ('Learner','adult','18+',$1) returning id`, [learner])).rows[0].id;

  async function actor(who, sql, args = []) {
    await q('begin');
    try {
      await q("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: who, role: 'authenticated' })]);
      await q('set local role authenticated');
      const result = await q(sql, args);
      await q('commit');
      return result;
    } catch (error) { await q('rollback'); throw error; }
  }
  const save = (who, body) => actor(who, 'select public.save_lesson_transcript($1,$2)', [lesson, body]);
  const read = (who, id = lesson) => asUser(who, () => q('select body from public.lesson_transcripts where lesson_id=$1', [id]));
  const transition = (status, who) => q('select id from public.set_course_version_status($1,$2,$3,$4)', [version, status, who, 'transcript test']);

  await test('the author saves optional plain text, and the audit does not copy it', async () => {
    await save(teacher, '  Carefully reviewed text.\nSecond line.  ');
    const row = (await read(teacher)).rows[0];
    assert(row.body === 'Carefully reviewed text.\nSecond line.', 'the author cannot read the saved text');
    const event = (await q("select detail from public.governance_audit_events where action='lesson.transcript_saved' and target_id=$1", [lesson])).rows[0];
    assert(event && !JSON.stringify(event).includes('Carefully reviewed text'), 'audit leaked transcript contents');
  });
  await test('another teacher cannot write and clients cannot directly write the table', async () => {
    await rejects(() => save(other, 'Unapproved'), /only the course author/i);
    await rejects(() => asUser(teacher, () => q("update public.lesson_transcripts set body='Bypass' where lesson_id=$1", [lesson])), /permission denied/i);
    assert((await read(teacher)).rows[0].body.startsWith('Carefully'), 'unauthorized edit changed the text');
  });
  await test('unentitled users cannot read a draft transcript', async () => {
    assert((await read(stranger)).rows.length === 0, 'a stranger read the draft');
    assert((await asAnon(() => q('select body from public.lesson_transcripts where lesson_id=$1', [lesson]))).rows.length === 0, 'session without a user read the transcript');
    await q('begin');
    await q('set local role anon');
    try { await rejects(() => q('select body from public.lesson_transcripts where lesson_id=$1', [lesson]), /permission denied/i); }
    finally { await q('rollback'); }
  });
  await test('the author can remove and restore an optional transcript', async () => {
    await save(teacher, '');
    assert((await read(teacher)).rows.length === 0, 'clearing did not remove it');
    await save(teacher, 'Distinctive transcript text.');
    await rejects(() => save(teacher, 'x'.repeat(100001)), /100000 characters/i);
  });
  await test('the transcript freezes when the version is submitted and is visible to its assigned reviewer', async () => {
    await transition('submitted', teacher);
    await satisfyReview(version, reviewer, admin);
    assert((await read(reviewer)).rows[0]?.body === 'Distinctive transcript text.', 'assigned reviewer cannot read it');
    await rejects(() => save(teacher, 'Changed after submission'), /only a draft/i);
    await transition('approved', reviewer);
    await transition('published', admin);
    await rejects(() => save(teacher, 'Changed after publication'), /only a draft/i);
  });
  await test('a published transcript is readable to an entitled learner, not a stranger', async () => {
    await q(`insert into public.entitlement_grants (learner_profile_id, scope_type, course_version_id, source_type, status)
      values ($1,'course_version',$2,'free','active')`, [lp, version]);
    assert((await read(learner)).rows[0]?.body === 'Distinctive transcript text.', 'entitled learner cannot read it');
    assert((await read(stranger)).rows.length === 0, 'stranger read the transcript');
  });
  await test('a new draft copies the transcript but leaves the published copy unchanged', async () => {
    const copied = (await actor(teacher, 'select version_id from public.create_course_version_from($1)', [version])).rows[0].version_id;
    const newLesson = (await q(`select l.id from public.lessons l join public.course_sections s on s.id=l.section_id
      where s.course_version_id=$1`, [copied])).rows[0].id;
    assert(newLesson !== lesson, 'copy reused the old lesson');
    assert((await read(teacher, newLesson)).rows[0]?.body === 'Distinctive transcript text.', 'transcript not copied');
    await actor(teacher, 'select public.save_lesson_transcript($1,$2)', [newLesson, 'Updated draft']);
    assert((await read(teacher)).rows[0]?.body === 'Distinctive transcript text.', 'published transcript was changed');
  });
}
