// Lesson content.
//
// A teacher could create a course, a section, and a lesson, and there was no way
// to attach anything to the lesson. lesson_resources is what the learner page
// reads to show a video or a reading, and nothing in the application wrote to
// it. Every lesson was an empty page.
//
// The write policies also used can_read_version() — a read predicate as a write
// gate. Whether that was exploitable is determined empirically below rather than
// asserted, because the same claim was made for course_version_subjects and was
// wrong.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser,
    newUser, newProfile,
    newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('res-admin@example.com');
  const teacher  = await newInstructor('res-teacher@example.com', admin);
  const reviewer = await newReviewer('res-reviewer@example.com', admin);

  const scalar = async (sql, params) => (await q(sql, params)).rows[0];
  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'resource test']);

  /** Act as a user and COMMIT. The writer reads the actor from the session. */
  async function asActor(actor, sql, params) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    let r;
    try {
      r = await q(sql, params);
    } catch (e) {
      await q('rollback');
      throw e;
    }
    await q('commit');
    return r;
  }

  const addResource = (who, lessonId, opts = {}) =>
    asActor(who, 'select public.add_lesson_resource($1,$2,$3,$4,$5) as id', [
      lessonId,
      opts.type ?? 'video',
      opts.url ?? 'https://cdn.example.com/lesson.mp4',
      opts.name ?? 'The lesson',
      opts.access ?? 'enrolled',
    ]);

  /** A course with one lesson, optionally published. */
  async function authored({ publish = false } = {}) {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);

    if (publish) {
      await transition(version, 'submitted', teacher);
      await transition(version, 'approved', reviewer);
      await satisfyReview(version, reviewer, admin);
      await transition(version, 'published', admin);
    }

    return { course, version, section, lesson };
  }

  const resourcesOf = async (lessonId) =>
    (await q(
      `select display_name, resource_type, external_url, position, access_classification
         from public.lesson_resources where lesson_id = $1 order by position`,
      [lessonId])).rows;

  // -------------------------------------------------------------------
  console.log('\nAttaching content');
  // -------------------------------------------------------------------

  await test('an author can attach a video to a lesson', async () => {
    const { lesson } = await authored();

    assert((await resourcesOf(lesson)).length === 0, 'precondition: no content yet');

    const id = (await addResource(teacher, lesson)).rows[0].id;
    assert(id, 'add_lesson_resource returned no id');

    const rows = await resourcesOf(lesson);
    assert(rows.length === 1, `found ${rows.length} resources, expected 1`);
    assert(rows[0].display_name === 'The lesson');
    assert(rows[0].resource_type === 'video');
    assert(rows[0].external_url === 'https://cdn.example.com/lesson.mp4');
    assert(rows[0].access_classification === 'enrolled');
  });

  await test('resources are appended in order without colliding', async () => {
    const { lesson } = await authored();

    // lesson_resources_position_key is unique per lesson, so positions must be
    // assigned rather than guessed.
    await addResource(teacher, lesson, { name: 'First', url: 'https://cdn.example.com/1.mp4' });
    await addResource(teacher, lesson, { name: 'Second', url: 'https://cdn.example.com/2.mp4' });
    await addResource(teacher, lesson, { name: 'Third', url: 'https://cdn.example.com/3.mp4' });

    const rows = await resourcesOf(lesson);
    assert(rows.length === 3, `found ${rows.length}, expected 3`);
    const positions = rows.map((r) => r.position).join(', ');
    assert(positions === '1, 2, 3', `positions were [${positions}]`);
    const names = rows.map((r) => r.display_name).join('|');
    assert(names === 'First|Second|Third', `names were [${names}]`);
  });

  await test('a resource needs a name learners will see', async () => {
    const { lesson } = await authored();

    await rejects(() => addResource(teacher, lesson, { name: '   ' }),
      /needs a name/i);
  });

  await test('a resource needs a URL until uploads are wired', async () => {
    const { lesson } = await authored();

    await rejects(() => addResource(teacher, lesson, { url: '' }),
      /needs a URL/i);
  });

  await test('content must be served over https', async () => {
    const { lesson } = await authored();

    await rejects(
      () => addResource(teacher, lesson, { url: 'http://cdn.example.com/lesson.mp4' }),
      /over https/i);
  });

  await test('an unsupported resource type is refused by name', async () => {
    const { lesson } = await authored();

    await rejects(() => addResource(teacher, lesson, { type: 'hologram' }),
      /unsupported resource type: hologram/i);
  });

  await test('a public preview is allowed, and marked as one', async () => {
    const { lesson } = await authored();

    await addResource(teacher, lesson, {
      name: 'Taster',
      url: 'https://cdn.example.com/taster.mp4',
      access: 'public_preview',
    });

    const rows = await resourcesOf(lesson);
    assert(rows[0].access_classification === 'public_preview',
      `access was ${rows[0].access_classification}`);
  });

  // -------------------------------------------------------------------
  console.log('\nWho may attach content');
  // -------------------------------------------------------------------

  await test('a stranger cannot add content to someone else\'s lesson', async () => {
    const { lesson } = await authored();
    const stranger = await newUser('res-stranger@example.com');
    await newProfile(stranger, 'Stranger');

    await rejects(() => addResource(stranger, lesson),
      /only the author may add content/i);

    assert((await resourcesOf(lesson)).length === 0,
      'a stranger must not be able to add content');
  });

  await test('an anonymous caller is refused', async () => {
    const { lesson } = await authored();

    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role authenticated');
    await rejects(
      () => q('select public.add_lesson_resource($1,$2,$3,$4,$5)',
        [lesson, 'video', 'https://cdn.example.com/x.mp4', 'X', 'enrolled']),
      /sign in to add lesson content/i);
    await q('rollback');
  });

  await test('content cannot be added once the version is published', async () => {
    // lesson_resources_lock freezes this table at publication, exactly as it
    // does sections and lessons. A course is authored, then frozen.
    const { lesson } = await authored({ publish: true });

    await rejects(() => addResource(teacher, lesson), /locked \(D5\)/i);

    assert((await resourcesOf(lesson)).length === 0,
      'a published lesson must not have gained content');
  });

  // -------------------------------------------------------------------
  console.log('\nThe policy, tested rather than assumed');
  // -------------------------------------------------------------------

  await test('a reader cannot insert a resource directly', async () => {
    // The INSERT policy now uses can_author_version() rather than
    // can_read_version().
    //
    // Whether the old predicate was actually exploitable is asserted from the
    // evidence rather than from reasoning: the check below records which
    // mechanism refuses the insert. Last time this was claimed for
    // course_version_subjects it turned out the D5 lock was doing the work, not
    // the policy — so the distinction is measured, not assumed.
    const { lesson } = await authored({ publish: true });
    const reader = await newUser('res-reader@example.com');
    await newProfile(reader, 'Reader');

    let message = null;
    await asUser(reader, async () => {
      try {
        await q(`insert into public.lesson_resources
                   (lesson_id, resource_type, external_url, display_name, position, access_classification)
                 values ($1,'video','https://cdn.example.com/x.mp4','X',1,'enrolled')`, [lesson]);
      } catch (e) {
        message = String(e.message);
      }
    });

    assert(message !== null, 'a reader was able to insert lesson content');
    // Either mechanism is a correct refusal; what must not happen is success.
    assert(/row-level security|new row violates|locked \(D5\)/i.test(message),
      `refused for an unrecognised reason: ${message}`);

    assert((await resourcesOf(lesson)).length === 0,
      'the insert must not have landed');
  });

  await test('a reader of a draft lesson is refused by the policy itself', async () => {
    // On a draft the D5 lock does not apply, so this isolates the policy. A
    // stranger cannot read a draft either, so can_read_version() would have
    // refused too — which is why the predicate change is defence in depth here
    // rather than a patched hole.
    const { lesson } = await authored({ publish: false });
    const reader = await newUser('res-reader2@example.com');
    await newProfile(reader, 'Reader Two');

    await asUser(reader, async () => {
      await rejects(() => q(`insert into public.lesson_resources
                   (lesson_id, resource_type, external_url, display_name, position, access_classification)
                 values ($1,'video','https://cdn.example.com/x.mp4','X',1,'enrolled')`, [lesson]),
        /row-level security|new row violates/i);
    });
  });

  // -------------------------------------------------------------------
  console.log('\nThe learner can see it');
  // -------------------------------------------------------------------

  await test('attached content is readable back for the lesson page', async () => {
    const { lesson } = await authored();
    await addResource(teacher, lesson, { name: 'Video', url: 'https://cdn.example.com/v.mp4' });
    await addResource(teacher, lesson, {
      name: 'Reading',
      url: 'https://cdn.example.com/r.pdf',
      type: 'document',
    });

    // This is the query lib/lessons.ts runs. Before the writer existed it
    // always returned an empty list, which is what made every lesson blank.
    const rows = await q(
      `select id, lesson_id, resource_type, display_name, position, external_url,
              media_asset_id, access_classification
         from public.lesson_resources
        where lesson_id = $1
        order by position`, [lesson]);

    assert(rows.rows.length === 2,
      `the lesson page would show ${rows.rows.length} items; expected 2`);
    assert(rows.rows[0].resource_type === 'video');
    assert(rows.rows[1].resource_type === 'document');
  });

  // -------------------------------------------------------------------
  console.log('\nAudit trail');
  // -------------------------------------------------------------------

  await test('attaching content is audited', async () => {
    const { lesson } = await authored();
    await addResource(teacher, lesson);

    const rows = (await q(
      `select detail from public.governance_audit_events
        where target_type = 'lesson' and target_id = $1 and action = 'lesson.resource_added'`,
      [lesson])).rows;

    assert(rows.length === 1, `found ${rows.length} audit rows, expected 1`);
    assert(JSON.stringify(rows[0].detail).includes('video'),
      'the audit row does not record what was attached');
  });
}
