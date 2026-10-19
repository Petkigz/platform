// Authorable source citations for Islamic learning content; D5 locks them with
// the version so a published citation cannot be rewritten after learners rely
// on it.
export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newInstructor, newReviewer,
    newUser, newProfile, newCourse, newVersion, newSection, newLesson,
    satisfyReview } = ctx;
  const admin = await bootstrapAdmin('sources-admin@example.com');
  const author = await newInstructor('sources-author@example.com', admin);
  const other = await newInstructor('sources-other@example.com', admin);
  const reviewer = await newReviewer('sources-reviewer@example.com', admin);
  const outsider = await newUser('sources-outsider@example.com');
  await newProfile(outsider, 'Sources outsider');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const result = await q(sql, params); await q('commit'); return result; }
    catch (error) { await q('rollback'); throw error; }
  }
  async function makeDraft(owner = author) {
    const course = await newCourse(owner, { status: 'active' });
    const version = await newVersion(course, owner);
    const section = await newSection(version);
    const lesson = await newLesson(section);
    return { course, version, section, lesson };
  }
  async function publish(owner = author) {
    const row = await makeDraft(owner);
    const transition = (state, actor) => q(
      'select id from public.set_course_version_status($1,$2,$3,$4)',
      [row.version, state, actor, 'provenance test']);
    await transition('submitted', owner);
    await transition('approved', reviewer);
    await satisfyReview(row.version, reviewer, admin);
    await transition('published', admin);
    return row;
  }
  const add = (actor, row) => asActor(actor,
    `select public.add_content_source_for_lesson(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10) id`,
    [row.version, row.lesson, 'quran', 'Tafsir al-Tabari', 'Muhammad ibn Jarir al-Tabari',
      'Cairo edition', 'Surah 2:255', 'https://example.org/tafsir', 'paragraph 2', 'Contextual note']);

  await test('a source and lesson link are created atomically with an audit event', async () => {
    const row = await makeDraft();
    const id = (await add(author, row)).rows[0].id;
    const source = (await q(`select cs.title,cs.source_type,cs.author_or_compiler,cs.edition_or_version,
        cs.reference_locator,cs.url,cs.notes,cs.created_by,csl.lesson_id,csl.anchor
      from public.content_sources cs join public.content_source_links csl on csl.content_source_id=cs.id
      where cs.id=$1`, [id])).rows[0];
    assert(source.title === 'Tafsir al-Tabari' && source.source_type === 'quran');
    assert(source.author_or_compiler === 'Muhammad ibn Jarir al-Tabari');
    assert(source.edition_or_version === 'Cairo edition' && source.reference_locator === 'Surah 2:255');
    assert(source.url === 'https://example.org/tafsir' && source.notes === 'Contextual note');
    assert(source.created_by === author && source.lesson_id === row.lesson && source.anchor === 'paragraph 2');
    const audit = await q("select count(*)::int n from public.governance_audit_events where action='content_source.added' and target_id=$1", [id]);
    assert(audit.rows[0].n === 1);
  });

  await test('only the course author or privileged staff may add a source', async () => {
    const row = await makeDraft();
    await rejects(() => add(outsider, row), /only the course author may add sources/i);
    const id = (await add(admin, row)).rows[0].id;
    assert(id, 'privileged staff should be able to assist an author');
  });

  await test('an authenticated author cannot forge source attribution', async () => {
    const row = await makeDraft();
    await rejects(() => asActor(author,
      `insert into public.content_sources(course_version_id,source_type,title,created_by)
       values($1,'book','Forged author',$2)`, [row.version, other]), /signed-in author/i);
  });

  await test('a draft author can remove a mistaken citation, with links and audit cleaned up', async () => {
    const row = await makeDraft();
    const source = (await add(author, row)).rows[0].id;
    await rejects(() => asActor(outsider,
      'select public.remove_content_source($1)', [source]), /only the course author may remove/i);
    const removed = (await asActor(author,
      'select public.remove_content_source($1) removed', [source])).rows[0].removed;
    assert(removed === true);
    assert((await q('select count(*)::int n from public.content_sources where id=$1', [source])).rows[0].n === 0);
    assert((await q('select count(*)::int n from public.content_source_links where content_source_id=$1', [source])).rows[0].n === 0);
    assert((await q("select count(*)::int n from public.governance_audit_events where action='content_source.removed' and target_id=$1", [source])).rows[0].n === 1);
    assert((await asActor(author, 'select public.remove_content_source($1) removed', [source])).rows[0].removed === false);
  });

  await test('source and lesson must belong to the same version', async () => {
    const row = await makeDraft();
    const otherVersion = await makeDraft();
    await rejects(() => asActor(author,
      `select public.add_content_source_for_lesson($1,$2,'quran','Wrong lesson')`,
      [row.version, otherVersion.lesson]), /lesson must belong to this course version/i);
  });

  await test('required title and supported source type are enforced', async () => {
    const row = await makeDraft();
    await rejects(() => asActor(author,
      `select public.add_content_source_for_lesson($1,$2,'quran','  ')`,
      [row.version, row.lesson]), /source needs a title/i);
    await rejects(() => asActor(author,
      `select public.add_content_source_for_lesson($1,$2,'unknown','Source')`,
      [row.version, row.lesson]), /check constraint/i);
  });

  await test('invalid URLs are rejected by the source constraint', async () => {
    const row = await makeDraft();
    await rejects(() => asActor(author,
      `select public.add_content_source_for_lesson($1,$2,'book','Book',null,null,null,'http://example.org')`,
      [row.version, row.lesson]), /check constraint/i);
  });

  await test('direct source writes are author-scoped and published versions reject new citations', async () => {
    const row = await makeDraft();
    await rejects(() => asActor(outsider,
      `insert into public.content_sources(course_version_id,source_type,title,created_by)
       values($1,'book','Forged',$2)`, [row.version, outsider]), /row-level security|permission/i);
    const live = await publish();
    await rejects(() => asActor(author,
      `insert into public.content_sources(course_version_id,source_type,title,created_by)
       values($1,'book','Late citation',$2)`, [live.version, author]), /locked with its course version/i);
  });

  await test('published citations and their links cannot be changed or removed', async () => {
    // Build a valid citation in a draft, publish the version, then prove both
    // subtree guards prevent later edits.
    const draft = await makeDraft();
    const draftId = (await add(author, draft)).rows[0].id;
    const transition = (state, actor) => q(
      'select id from public.set_course_version_status($1,$2,$3,$4)',
      [draft.version, state, actor, 'provenance test']);
    await transition('submitted', author);
    await transition('approved', reviewer);
    await satisfyReview(draft.version, reviewer, admin);
    await transition('published', admin);
    await rejects(() => q("update public.content_sources set title='Changed' where id=$1", [draftId]), /locked with its course version/i);
    await rejects(() => q('delete from public.content_source_links where content_source_id=$1', [draftId]), /locked with its course version/i);
    await rejects(() => asActor(author, 'select public.remove_content_source($1)', [draftId]), /locked with its course version/i);
  });
}
