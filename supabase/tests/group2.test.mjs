// Group 2 migration tests: courses, versions, structure, media.
//
// The point of this suite is D5 and D9. Immutability of a published version is
// a database property, so it is tested as one: every test below attempts the
// write that must fail, rather than asserting that some application code
// remembered to check.

export async function run(ctx) {
  const {
    q, count, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile,
    bootstrapAdmin, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, newAsset,
  } = ctx;

  // ---------------------------------------------------------------------
  // shared actors
  // ---------------------------------------------------------------------
  const admin    = await bootstrapAdmin('g2-admin@example.com');
  const teacher  = await newInstructor('g2-teacher@example.com', admin);
  const teacher2 = await newInstructor('g2-teacher2@example.com', admin);
  const reviewer = await newReviewer('g2-reviewer@example.com', admin);
  const stranger = await newUser('g2-stranger@example.com');
  await newProfile(stranger);

  const setStatus = (versionId, status, actor, reason = 'test') =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, reason]);

  // Course -> version -> section -> lesson, created as the owning teacher.
  async function scaffold({ withLesson = true, language = 'en', versionNumber = 1 } = {}) {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher, { language, version_number: versionNumber });
    const section = await newSection(version);
    const lesson  = withLesson ? await newLesson(section) : null;
    return { course, version, section, lesson };
  }

  async function publish(s) {
    await setStatus(s.version, 'submitted', teacher);
    await setStatus(s.version, 'approved', reviewer);
    await setStatus(s.version, 'published', admin);
  }

  const versionStatus = async (id) =>
    (await q('select version_status from public.course_versions where id = $1', [id])).rows[0].version_status;

  // ---------------------------------------------------------------------
  console.log('Schema and seed');

  await test('all eight Group 2 tables exist', async () => {
    const want = ['media_assets', 'subject_areas', 'courses', 'course_versions',
      'course_sections', 'lessons', 'lesson_resources', 'course_version_subjects'];
    const names = (await q(
      `select table_name from information_schema.tables
        where table_schema='public' and table_type='BASE TABLE'`)).rows.map(r => r.table_name);
    for (const t of want) assert(names.includes(t), `missing table ${t}`);
  });

  await test('subject taxonomy seeded, including a second level', async () => {
    const top = await count(`select count(*)::int n from public.subject_areas where parent_subject_id is null`);
    const kid = await count(`select count(*)::int n from public.subject_areas where parent_subject_id is not null`);
    assert(top >= 8, `expected at least 8 top-level subjects, got ${top}`);
    assert(kid >= 5, `expected at least 5 child subjects, got ${kid}`);
  });

  await test('published versions carry no deleted_at column (D5: retire, never remove)', async () => {
    const n = await count(
      `select count(*)::int n from information_schema.columns
        where table_schema='public' and table_name='course_versions' and column_name='deleted_at'`);
    assert(n === 0, 'course_versions must not have a deleted_at column');
  });

  // ---------------------------------------------------------------------
  console.log('\nConstraints');

  await test('course slug is unique, and soft delete frees it (D7)', async () => {
    const a = await newCourse(teacher, { slug: 'unique-slug' });
    await rejects(() => newCourse(teacher, { slug: 'unique-slug' }),
      'a second live course took the same slug');
    await q('update public.courses set deleted_at = now() where id = $1', [a]);
    await newCourse(teacher, { slug: 'unique-slug' });
  });

  await test('a subject area cannot become its own ancestor, even indirectly', async () => {
    const a = (await q(
      `insert into public.subject_areas (code, name) values ('cycle-a', 'A') returning id`)).rows[0].id;
    const b = (await q(
      `insert into public.subject_areas (code, name) values ('cycle-b', 'B') returning id`)).rows[0].id;
    await q('update public.subject_areas set parent_subject_id = $1 where id = $2', [a, b]);
    await rejects(() => q('update public.subject_areas set parent_subject_id = $1 where id = $2', [b, a]),
      'a two-level cycle was accepted');
  });

  await test('two media assets cannot claim the same master location (D8)', async () => {
    await newAsset(teacher, { key: 'same/master.mp4' });
    await rejects(() => newAsset(teacher, { key: 'same/master.mp4' }),
      'a second row claimed the same master location');
  });

  await test('media asset checksum must be a sha256 hex digest', async () => {
    await rejects(() => q(
      `insert into public.media_assets
         (storage_backend, master_bucket, master_key, checksum, mime_type, byte_size, uploaded_by)
       values ('r2','b','k','not-a-checksum','video/mp4',1,$1)`, [teacher]),
      'a malformed checksum was accepted');
  });

  await test('a lesson resource needs exactly one source: asset or https URL', async () => {
    const { lesson } = await scaffold();
    const asset = await newAsset(teacher);
    // Both valid shapes: our own asset, or an approved https URL.
    await q(`insert into public.lesson_resources
               (lesson_id, resource_type, media_asset_id, external_url, display_name, position)
             values ($1,'video',$2,null,'Ours',1)`, [lesson, asset]);
    await q(`insert into public.lesson_resources
               (lesson_id, resource_type, media_asset_id, external_url, display_name, position)
             values ($1,'link',null,'https://example.com/a.mp4','Theirs',2)`, [lesson]);

    await rejects(() => q(
      `insert into public.lesson_resources
         (lesson_id, resource_type, media_asset_id, external_url, display_name, position)
       values ($1,'video',$2,'https://example.com/b.mp4','Both',3)`, [lesson, asset]),
      'a resource with both an asset and a URL was accepted');
    await rejects(() => q(
      `insert into public.lesson_resources
         (lesson_id, resource_type, media_asset_id, external_url, display_name, position)
       values ($1,'video',null,null,'Neither',4)`, [lesson]),
      'a resource with neither an asset nor a URL was accepted');
    await rejects(() => q(
      `insert into public.lesson_resources
         (lesson_id, resource_type, media_asset_id, external_url, display_name, position)
       values ($1,'link',null,'http://example.com/c','Insecure',5)`, [lesson]),
      'an insecure http external URL was accepted');
  });

  await test('a draft may not carry publication timestamps', async () => {
    const { course } = await scaffold();
    await rejects(() => q(
      `insert into public.course_versions (course_id, version_number, language, created_by, published_at)
       values ($1, 99, 'en', $2, now())`, [course, teacher]),
      'a draft version was allowed to carry published_at');
  });

  // ---------------------------------------------------------------------
  console.log('\nD5: a published version is immutable');

  await test('a draft version is freely editable', async () => {
    const s = await scaffold();
    await newLesson(s.section, { position: 2, title: 'Second' });
    await q('update public.lessons set title = $1 where id = $2', ['Renamed', s.lesson]);
    await q('insert into public.course_version_subjects (course_version_id, subject_area_id) ' +
            'select $1, id from public.subject_areas where code = $2 limit 1', [s.version, 'quran']);
    assert(true, 'draft edits should succeed');
  });

  await test('a submitted version is locked against ordinary editing', async () => {
    const s = await scaffold();
    await setStatus(s.version, 'submitted', teacher);
    await rejects(() => newLesson(s.section, { position: 2 }),
      'a lesson was added to a submitted version');
    await rejects(() => q('update public.lessons set title = $1 where id = $2', ['X', s.lesson]),
      'a lesson of a submitted version was edited');
    await rejects(() => q('delete from public.course_sections where id = $1', [s.section]),
      'a section of a submitted version was deleted');
  });

  await test('a published version row cannot be updated or deleted directly', async () => {
    const s = await scaffold();
    await publish(s);
    await rejects(() => q('update public.course_versions set change_summary = $1 where id = $2',
      ['rewritten after publication', s.version]), 'a published version row was edited');
    await rejects(() => q('delete from public.course_versions where id = $1', [s.version]),
      'a published version was deleted');
  });

  await test('a published version cannot be edited through its children', async () => {
    const s = await scaffold();
    const asset = await newAsset(teacher);
    await q(`insert into public.lesson_resources
               (lesson_id, resource_type, media_asset_id, display_name)
             values ($1,'video',$2,'Lecture')`, [s.lesson, asset]);
    await q(`insert into public.course_version_subjects (course_version_id, subject_area_id)
             select $1, id from public.subject_areas where code='quran' limit 1`, [s.version]);
    await publish(s);

    await rejects(() => newLesson(s.section, { position: 2 }),
      'a lesson was added to a published version');
    await rejects(() => q('update public.lesson_resources set display_name=$1 where lesson_id=$2',
      ['changed', s.lesson]), 'a published lesson resource was edited');
    await rejects(() => q('insert into public.course_version_subjects (course_version_id, subject_area_id) ' +
      'select $1, id from public.subject_areas where code=$2 limit 1', [s.version, 'fiqh']),
      'subject mapping of a published version was changed');
  });

  await test('retiring is the only way to remove a published version', async () => {
    const s = await scaffold();
    await publish(s);
    await setStatus(s.version, 'retired', admin, 'superseded');
    const st = await versionStatus(s.version);
    assert(st === 'retired', `expected retired, got ${st}`);
    const still = await count('select count(*)::int n from public.course_versions where id = $1', [s.version]);
    assert(still === 1, 'a retired version should still exist');
  });

  // ---------------------------------------------------------------------
  console.log('\nLifecycle and authority');

  await test('an author may submit their own draft', async () => {
    const s = await scaffold();
    await setStatus(s.version, 'submitted', teacher);
    assert(await versionStatus(s.version) === 'submitted', 'submission did not take effect');
  });

  await test('an author may not approve their own course', async () => {
    const s = await scaffold();
    await setStatus(s.version, 'submitted', teacher);
    await rejects(() => setStatus(s.version, 'approved', teacher),
      'an author approved their own submission');
  });

  await test('a stranger may not approve a submission', async () => {
    const s = await scaffold();
    await setStatus(s.version, 'submitted', teacher);
    await rejects(() => setStatus(s.version, 'approved', stranger),
      'a learner without the reviewer role approved a submission');
  });

  await test('a reviewer may approve someone else\u2019s submission', async () => {
    const s = await scaffold();
    await setStatus(s.version, 'submitted', teacher);
    await setStatus(s.version, 'approved', reviewer);
    assert(await versionStatus(s.version) === 'approved', 'reviewer approval did not take effect');
  });

  await test('an instructor may not publish; only a privileged role may', async () => {
    const s = await scaffold();
    await setStatus(s.version, 'submitted', teacher);
    await setStatus(s.version, 'approved', reviewer);
    await rejects(() => setStatus(s.version, 'published', teacher),
      'an instructor published a version themselves');
    await setStatus(s.version, 'published', admin);
    assert(await versionStatus(s.version) === 'published', 'admin publication did not take effect');
  });

  await test('an empty version cannot be published', async () => {
    const s = await scaffold({ withLesson: false });
    await setStatus(s.version, 'submitted', teacher);
    await setStatus(s.version, 'approved', reviewer);
    await rejects(() => setStatus(s.version, 'published', admin),
      'a version with no lessons was published');
  });

  await test('illegal transitions are refused', async () => {
    const s = await scaffold();
    await rejects(() => setStatus(s.version, 'published', admin), 'draft jumped straight to published');
    await rejects(() => setStatus(s.version, 'retired', admin), 'draft jumped straight to retired');
    await rejects(() => setStatus(s.version, 'approved', reviewer), 'draft jumped straight to approved');
  });

  await test('a rejected version can be returned to draft by its author', async () => {
    const s = await scaffold();
    await setStatus(s.version, 'submitted', teacher);
    await setStatus(s.version, 'rejected', reviewer, 'needs a stronger chain of narration');
    assert(await versionStatus(s.version) === 'rejected', 'rejection did not take effect');
    await setStatus(s.version, 'draft', teacher);
    assert(await versionStatus(s.version) === 'draft', 'reopen to draft did not take effect');
    await newLesson(s.section, { position: 2, title: 'Revised' });
  });

  await test('the review trail survives a rejection so the author can act on it', async () => {
    const s = await scaffold();
    await setStatus(s.version, 'submitted', teacher);
    await setStatus(s.version, 'rejected', reviewer, 'isnad needs checking');
    await setStatus(s.version, 'draft', teacher);

    const r = (await q(
      `select submitted_at, decision_by, decision_reason
         from public.course_versions where id = $1`, [s.version])).rows[0];
    assert(r.submitted_at !== null, 'submitted_at was erased on reopen');
    assert(r.decision_by !== null, 'decision_by was erased on reopen');
    assert(r.decision_reason === 'isnad needs checking',
      `the rejection reason was lost: ${r.decision_reason}`);
  });

  await test('publication history can never be forged on an unpublished version', async () => {
    const s = await scaffold();
    await rejects(() => q(
      `update public.course_versions set published_at = now() where id = $1`, [s.version]),
      'a draft was given a published_at');
  });

  // ---------------------------------------------------------------------
  console.log('\nD9: one course, many languages');

  await test('publishing a new version retires the one it replaces', async () => {
    const s1 = await scaffold({ versionNumber: 1 });
    await publish(s1);

    const s2 = await scaffold({ versionNumber: 2 });
    await q('update public.course_versions set course_id = $1 where id = $2', [s1.course, s2.version]);
    await q('update public.course_versions set created_by = $1 where id = $2', [teacher, s2.version]);
    await publish(s2);

    assert(await versionStatus(s1.version) === 'retired',
      `the displaced version should be retired, got ${await versionStatus(s1.version)}`);
    assert(await versionStatus(s2.version) === 'published', 'the new version was not published');
  });

  await test('at most one published version per course per language', async () => {
    const s1 = await scaffold({ versionNumber: 1 });
    await publish(s1);
    const s2 = await scaffold({ versionNumber: 2 });
    await q('update public.course_versions set course_id = $1 where id = $2', [s1.course, s2.version]);
    await publish(s2);

    // Force the old one back to published: the partial unique index must refuse.
    await q('begin');
    await q(`select set_config('app.bypassing_version_lock','on',true)`);
    await rejects(() => q(
      `update public.course_versions
          set version_status='published', published_at=now()
        where id = $1`, [s1.version]),
      'two versions of the same course and language were published at once');
    await q('rollback');
  });

  await test('the same language may be published for a different course', async () => {
    const a = await scaffold({ versionNumber: 1 });
    const b = await scaffold({ versionNumber: 1 });
    await publish(a);
    await publish(b);
    assert(await versionStatus(b.version) === 'published',
      'an unrelated course was blocked from publishing the same language');
  });

  await test('a translation is a version of the same course, not a new course', async () => {
    const en = await scaffold({ versionNumber: 1, language: 'en' });
    const ar = await scaffold({ versionNumber: 2, language: 'ar' });
    await q('update public.course_versions set course_id = $1 where id = $2', [en.course, ar.version]);
    await publish(en);
    await publish(ar);
    const n = await count(
      `select count(*)::int n from public.course_versions
        where course_id = $1 and version_status = 'published'`, [en.course]);
    assert(n === 2, `expected both languages published, got ${n}`);
  });

  // ---------------------------------------------------------------------
  console.log('\nRow level security');

  await test('a stranger cannot see an unpublished version', async () => {
    const s = await scaffold();
    const seen = await asUser(stranger, () =>
      count('select count(*)::int n from public.course_versions where id = $1', [s.version]));
    assert(seen === 0, `a stranger saw ${seen} unpublished versions`);
  });

  await test('the author can see their own draft', async () => {
    const s = await scaffold();
    const seen = await asUser(teacher, () =>
      count('select count(*)::int n from public.course_versions where id = $1', [s.version]));
    assert(seen === 1, `the author saw ${seen} of their own drafts`);
  });

  await test('another instructor cannot see a draft', async () => {
    const s = await scaffold();
    const seen = await asUser(teacher2, () =>
      count('select count(*)::int n from public.course_versions where id = $1', [s.version]));
    assert(seen === 0, `a second instructor saw ${seen} drafts that were not theirs`);
  });

  await test('an anonymous visitor sees published versions but not drafts', async () => {
    const pub = await scaffold();
    await publish(pub);
    const draft = await scaffold();
    const seen = await asAnon(() => count(
      'select count(*)::int n from public.course_versions where course_id in ($1, $2)',
      [pub.course, draft.course]));
    assert(seen === 1, `anonymous saw ${seen} versions, expected only the published one`);
  });

  await test('an anonymous visitor sees preview lessons only', async () => {
    const s = await scaffold();
    await newLesson(s.section, { position: 2, title: 'Preview', is_preview: true });
    await publish(s);
    const seen = await asAnon(() => count(
      'select count(*)::int n from public.lessons l ' +
      'join public.course_sections cs on cs.id = l.section_id ' +
      'where cs.course_version_id = $1', [s.version]));
    assert(seen === 1, `anonymous saw ${seen} lessons, expected only the preview`);
  });

  await test('media assets are invisible to everyone but the uploader and staff', async () => {
    const asset = await newAsset(teacher);
    const byStranger = await asUser(stranger, () =>
      count('select count(*)::int n from public.media_assets where id = $1', [asset]));
    const byTeacher = await asUser(teacher, () =>
      count('select count(*)::int n from public.media_assets where id = $1', [asset]));
    const byAdmin = await asUser(admin, () =>
      count('select count(*)::int n from public.media_assets where id = $1', [asset]));
    assert(byStranger === 0, `a stranger saw ${byStranger} media assets`);
    assert(byTeacher === 1, `the uploader saw ${byTeacher} of their own assets`);
    assert(byAdmin === 1, `an admin saw ${byAdmin} assets`);
  });

  await test('an anonymous visitor cannot read media assets at all', async () => {
    const asset = await newAsset(teacher);
    const seen = await asAnon(() =>
      count('select count(*)::int n from public.media_assets where id = $1', [asset]));
    assert(seen === 0, `anonymous saw ${seen} media assets`);
  });

  await test('the catalogue is browsable: active courses are public', async () => {
    const s = await scaffold();
    await publish(s);
    const seen = await asAnon(() =>
      count('select count(*)::int n from public.courses where id = $1', [s.course]));
    assert(seen === 1, `anonymous saw ${seen} active courses`);
  });
}
