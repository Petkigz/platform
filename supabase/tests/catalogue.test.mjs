// Catalogue contract.
//
// The catalogue is the one surface that is deliberately public, so its
// invariants are the mirror image of the authorization suite: what a stranger
// CAN see, and the precise point at which content stops being visible.
//
// These tests pin the joins that web/src/lib/catalogue.ts and
// web/src/app/courses/[slug]/page.tsx rely on. If a policy changes such that a
// draft becomes anonymously visible, the assertion fails here rather than in
// front of a user.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asAnon, asUser,
    newUser, newProfile, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('cat-admin@example.com');
  const teacher  = await newInstructor('cat-teacher@example.com', admin);
  const reviewer = await newReviewer('cat-reviewer@example.com', admin);

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const setVersion = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, 'catalogue']);

  async function buildCourse({ publish = true, subject = null, audience = 'both' } = {}) {
    const course  = await newCourse(teacher, { status: 'active', audience });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);
    await newLesson(section, { position: 2, is_preview: true });

    if (subject) {
      const sa = (await q(
        `select id from public.subject_areas where code = $1 and deleted_at is null`,
        [subject])).rows[0];
      assert(sa, `subject area ${subject} not seeded`);
      await q(`insert into public.course_version_subjects (course_version_id, subject_area_id)
               values ($1, $2)`, [version, sa.id]);
    }

    if (publish) {
      await setVersion(version, 'submitted', teacher);
      await setVersion(version, 'approved', reviewer);
      await satisfyReview(version, reviewer, admin);
      await setVersion(version, 'published', admin);
    }
    return { course, version };
  }

  // -------------------------------------------------------------------
  // Seed
  // -------------------------------------------------------------------
  await test('subject taxonomy is seeded, two levels, no cycles', async () => {
    // This engine is shared with every other suite, and other fixtures insert
    // subject areas too. Assert on the codes the seed promises, not on a row
    // count that moves when an unrelated test runs.
    const want = ['quran','arabic','aqeedah','fiqh','hadith','seerah','history','akhlaq','worship'];
    const found = (await q(
      `select code from public.subject_areas
        where parent_subject_id is null and deleted_at is null`)).rows.map(r => r.code);
    for (const code of want) {
      assert(found.includes(code), `discipline '${code}' was not seeded`);
    }

    // Every discipline carries at least one subdivision, otherwise the filter
    // bar renders a heading with nothing under it.
    const barren = await count(
      `select 1 from public.subject_areas p
        where p.parent_subject_id is null and p.deleted_at is null
          and p.code = any($1::text[])
          and not exists (select 1 from public.subject_areas c
                           where c.parent_subject_id = p.id and c.deleted_at is null)`,
      [want]);
    assert(barren === 0, `${barren} discipline(s) have no subdivisions`);

    // Every subdivision points at a discipline, not at another subdivision.
    // The catalogue filter renders one level; a deeper tree would be silently
    // dropped by it.
    const deep = await count(
      `select 1
         from public.subject_areas c
         join public.subject_areas p on p.id = c.parent_subject_id
        where c.deleted_at is null and p.parent_subject_id is not null`);
    assert(deep === 0, `${deep} subject(s) sit three or more levels deep`);
  });

  await test('the seed is idempotent', async () => {
    const before = await count(`select 1 from public.subject_areas`);
    // Re-running the same insert must not duplicate. The conflict target has
    // to carry the partial index predicate, which is easy to get wrong.
    await q(`insert into public.subject_areas (code, name) values ('quran', 'Qur''an')
             on conflict (code) where deleted_at is null do nothing`);
    const after = await count(`select 1 from public.subject_areas`);
    assert(before === after, `re-seeding added rows (${before} -> ${after})`);
  });

  // -------------------------------------------------------------------
  // What a stranger can see
  // -------------------------------------------------------------------
  await test('a published course is in the catalogue, a draft is not', async () => {
    const pub   = await buildCourse({ publish: true, subject: 'quran.tajweed' });
    const draft = await buildCourse({ publish: false });

    await asAnon(async () => {
      const visible = await count(
        `select 1 from public.courses c
          where c.status = 'active' and c.deleted_at is null
            and exists (select 1 from public.course_versions cv
                         where cv.course_id = c.id
                           and cv.version_status = 'published')`);
      assert(visible >= 1, 'anonymous visitor saw no published course at all');

      const p = await count(`select 1 from public.courses where id = $1`, [pub.course]);
      assert(p === 1, 'the published course is not anonymously visible');

      const d = await count(`select 1 from public.courses where id = $1`, [draft.course]);
      assert(d === 0, `a draft course leaked to an anonymous visitor (${d} rows)`);

      const dv = await count(
        `select 1 from public.course_versions where id = $1`, [draft.version]);
      assert(dv === 0, 'a draft version leaked to an anonymous visitor');
    });
  });

  await test('the outline resolves anonymously: version -> sections -> lessons', async () => {
    const { course, version } = await buildCourse({ publish: true });

    await asAnon(async () => {
      const sections = await count(
        `select 1 from public.course_sections where course_version_id = $1`, [version]);
      assert(sections === 1, `expected 1 section, anonymous visitor saw ${sections}`);

      // lessons_read lets an anonymous visitor through only for preview
      // lessons. Both fixtures exist; exactly one is a preview.
      const lessons = await count(
        `select 1 from public.lessons l
           join public.course_sections cs on cs.id = l.section_id
          where cs.course_version_id = $1`, [version]);
      assert(lessons === 1,
        `an anonymous visitor saw ${lessons} lessons; only the preview is public`);

      const previews = await count(
        `select 1 from public.lessons l
           join public.course_sections cs on cs.id = l.section_id
          where cs.course_version_id = $1 and l.is_preview`, [version]);
      assert(previews === 1, `expected 1 preview lesson, saw ${previews}`);

      const bySlug = await count(
        `select 1 from public.courses where slug = (select slug from public.courses where id = $1)`,
        [course]);
      assert(bySlug === 1, 'the course page cannot resolve its own slug anonymously');
    });
  });

  await test('the subject mapping resolves through the version, not the course', async () => {
    const { course } = await buildCourse({ publish: true, subject: 'fiqh.prayer' });

    await asAnon(async () => {
      const n = await count(
        `select 1
           from public.courses c
           join public.course_versions cv on cv.course_id = c.id
           join public.course_version_subjects cvs on cvs.course_version_id = cv.id
           join public.subject_areas sa on sa.id = cvs.subject_area_id
          where c.id = $1 and sa.code = 'fiqh.prayer'`, [course]);
      assert(n === 1, `the subject filter would miss this course (${n} matches)`);
    });
  });

  // -------------------------------------------------------------------
  // Where visibility stops
  // -------------------------------------------------------------------
  await test('a suspended course leaves the catalogue but keeps its data', async () => {
    const { course, version } = await buildCourse({ publish: true });

    await q(`update public.courses
                set suspended_at = now(), suspended_reason = 'catalogue test', suspended_by = $1
              where id = $2`, [admin, course]);

    await asAnon(async () => {
      const onShelf = await count(
        `select 1 from public.courses c
          where c.id = $1 and c.status = 'active' and c.deleted_at is null
            and c.suspended_at is null`, [course]);
      assert(onShelf === 0, 'a suspended course is still on the public shelf');

      // D6: suspension stops new learners reaching it; it does not delete it.
      const stillThere = await count(
        `select 1 from public.courses where id = $1`, [course]);
      assert(stillThere === 1, 'suspending a course deleted its row');

      // The version is still published, so the outline is intact; an anonymous
      // visitor just sees the preview only.
      const lessons = await count(
        `select 1 from public.lessons l
           join public.course_sections cs on cs.id = l.section_id
          where cs.course_version_id = $1`, [version]);
      assert(lessons === 1,
        `suspending a course destroyed its outline (${lessons} preview lessons left)`);
    });
  });

  await test('a retired version stays reachable for the learner already enrolled', async () => {
    const { course, version } = await buildCourse({ publish: true });

    const learnerUserId = await newUser('cat-learner@example.com');
    await newProfile(learnerUserId, 'Cat Learner');
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Cat Learner', 'adult', '18+', $1) returning id`, [learnerUserId])).rows[0].id;
    await q(`insert into public.course_enrolments
               (learner_profile_id, course_id, course_version_id, status)
             values ($1, $2, $3, 'active')`, [learnerId, course, version]);

    await setVersion(version, 'retired', admin);

    // D6: retiring a version must not strand someone who already paid.
    await asUser(learnerUserId, async () => {
      const v = await count(
        `select 1 from public.course_versions where id = $1`, [version]);
      assert(v === 1, 'a retired version vanished from an enrolled learner (D6)');

      const l = await count(
        `select 1 from public.lessons l
           join public.course_sections cs on cs.id = l.section_id
          where cs.course_version_id = $1`, [version]);
      assert(l === 2, `an enrolled learner lost lessons on retirement (${l} rows)`);
    });

    // And it is off the public shelf.
    await asAnon(async () => {
      const onShelf = await count(
        `select 1 from public.courses c
          where c.id = $1 and c.status = 'active' and c.suspended_at is null
            and exists (select 1 from public.course_versions cv
                         where cv.course_id = c.id and cv.version_status = 'published')`,
        [course]);
      assert(onShelf === 0, 'a course with no published version is still on the shelf');
    });
  });

  await test('an author cannot approve their own course into the catalogue', async () => {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    await asUser(teacher, async () => {
      await setVersion(version, 'submitted', teacher);
      await rejects(() => setVersion(version, 'approved', teacher),
        'an author published their own course into the public catalogue');
    });
  });
}
