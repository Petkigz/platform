// The subject vocabulary, as a screen can change it.
//
// subject_areas is read by the catalogue filter, the subject badges and every
// card. It had no writer outside SQL, and its write policies admitted any staff
// role. These tests cover the three things a screen needs from the database:
// who may write, what retiring a subject is allowed to do, and what gets
// recorded.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    committed, bootstrapAdmin, newUser, newProfile, grantRole,
    newInstructor, newReviewer, satisfyReview, newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('vocab-admin@example.com');
  const teacher = await newInstructor('vocab-teacher@example.com', admin);
  const reviewer = await newReviewer('vocab-reviewer@example.com', admin);

  const governance = await newUser('vocab-gov@example.com');
  await newProfile(governance, 'Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  const support = await newUser('vocab-support@example.com');
  await newProfile(support, 'Support');
  await committed(() => grantRole(support, 'support_agent', admin));

  const learner = await newUser('vocab-learner@example.com');
  await newProfile(learner, 'Learner');

  /** Act as a user and COMMIT; the writers read the actor from the session. */
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

  const addSubject = (who, code, name, parentId = null) =>
    asActor(who, `insert into public.subject_areas (code, name, parent_subject_id)
                  values ($1, $2, $3) returning id`, [code, name, parentId]);

  const setStatus = (who, id, status) =>
    asActor(who, `update public.subject_areas set status = $2 where id = $1`, [id, status]);

  const subjectId = async (code) =>
    (await q(`select id from public.subject_areas where code = $1`, [code])).rows[0].id;

  const auditFor = async (id) =>
    (await q(
      `select action, actor, detail from public.governance_audit_events
        where target_type = 'subject_area' and target_id = $1 order by occurred_at`, [id])).rows;

  // -------------------------------------------------------------------
  console.log('\nWho may change the vocabulary');
  // -------------------------------------------------------------------

  await test('a governance admin can add a subject', async () => {
    const r = await addSubject(governance, 'vocab.good', 'A well-formed subject');

    const row = (await q(`select code, name, status from public.subject_areas where id = $1`,
      [r.rows[0].id])).rows[0];
    assert(row.code === 'vocab.good' && row.status === 'active',
      `added ${JSON.stringify(row)}`);
  });

  await test('a platform admin can add a subject', async () => {
    const r = await addSubject(admin, 'vocab.byowner', 'Added by the owner');

    assert(r.rows.length === 1, 'the owner could not add a subject');
  });

  await test('a support agent cannot — reaching a ticket is not owning the catalogue', async () => {
    await rejects(() => addSubject(support, 'vocab.support', 'Support special'),
      /row-level security|permission|policy/i);
  });

  await test('a learner cannot', async () => {
    await rejects(() => addSubject(learner, 'vocab.learner', 'Learner special'),
      /row-level security|permission|policy/i);
  });

  await test('a support agent cannot rename one either', async () => {
    const id = await subjectId('vocab.good');

    // An update RLS refuses is not an error: the row simply is not there to be
    // updated, so the statement changes nothing. Asserting on the outcome rather
    // than on an exception is the only honest way to test this.
    const changed = await asActor(support,
      `update public.subject_areas set name = 'renamed' where id = $1 returning id`, [id]);

    assert(changed.rows.length === 0, 'a support agent renamed a subject');
    const name = (await q(`select name from public.subject_areas where id = $1`, [id])).rows[0].name;
    assert(name === 'A well-formed subject', `the name is now ${name}`);
  });

  await test('the people who maintain the vocabulary can see retired subjects', async () => {
    const id = await subjectId('vocab.good');
    await q(`update public.subject_areas set status = 'retired' where id = $1`, [id]);

    const asGov = await asActor(governance,
      `select id, status from public.subject_areas where id = $1`, [id]);
    assert(asGov.rows.length === 1, 'a governance admin cannot see a subject they retired');

    const asLearner = await asActor(learner,
      `select id from public.subject_areas where id = $1`, [id]);
    assert(asLearner.rows.length === 0, 'a learner can see a retired subject');

    await q(`update public.subject_areas set status = 'active' where id = $1`, [id]);
  });

  await test('the code is still constrained by the table, whoever writes', async () => {
    await rejects(() => addSubject(governance, 'Not A Code', 'Bad code'),
      /violates check constraint|subject_areas_code_check/i);
  });

  await test('a duplicate code is refused even when written by a person', async () => {
    await rejects(() => addSubject(governance, 'vocab.good', 'Same code again'),
      /duplicate key|unique/i);
  });

  // -------------------------------------------------------------------
  console.log('\nRetiring a subject');
  // -------------------------------------------------------------------

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'subject vocabulary test']);

  /**
   * A course version tagged with `code`, left in the state asked for.
   *
   * Publication goes through the real path — submitted, approved by a reviewer,
   * scholarly approval recorded, published — because a direct status update is
   * refused by the publication guard. Reaching `published` any other way would
   * be testing a state the platform cannot actually produce.
   */
  async function taggedVersion(code, state) {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    const id = await subjectId(code);
    await q(`insert into public.course_version_subjects (course_version_id, subject_area_id)
             values ($1, $2) on conflict do nothing`, [version, id]);

    if (state !== 'draft') {
      await transition(version, 'submitted', teacher);
      await transition(version, 'approved', reviewer);
      await satisfyReview(version, reviewer, admin);
      await transition(version, 'published', admin);
    }
    if (state === 'retired') {
      await transition(version, 'retired', admin);
    }
    return { course, version };
  }

  await test('an unused subject retires cleanly', async () => {
    const r = await addSubject(governance, 'vocab.unused', 'Nobody files here');
    const id = r.rows[0].id;

    await setStatus(governance, id, 'retired');

    const status = (await q(`select status from public.subject_areas where id = $1`, [id])).rows[0].status;
    assert(status === 'retired', `status is ${status}`);
  });

  await test('a subject a published course is filed under cannot be retired', async () => {
    const r = await addSubject(governance, 'vocab.live', 'Filed under a live course');
    const id = r.rows[0].id;
    await taggedVersion('vocab.live', 'published');

    await rejects(() => setStatus(governance, id, 'retired'),
      /retired subject is hidden from readers/i);

    const status = (await q(`select status from public.subject_areas where id = $1`, [id])).rows[0].status;
    assert(status === 'active', `the refusal left the subject ${status}`);
  });

  await test('the refusal counts the courses that block it', async () => {
    const r = await addSubject(governance, 'vocab.count', 'Two courses');
    const id = r.rows[0].id;
    await taggedVersion('vocab.count', 'published');
    await taggedVersion('vocab.count', 'draft');

    await rejects(() => setStatus(governance, id, 'retired'),
      /2 course version\(s\)/);
  });

  await test('a draft that uses it also blocks retirement, before publication can spring it', async () => {
    const r = await addSubject(governance, 'vocab.draft', 'Only a draft so far');
    const id = r.rows[0].id;
    await taggedVersion('vocab.draft', 'draft');

    await rejects(() => setStatus(governance, id, 'retired'), /still being written/i);
  });

  await test('a retired course does not block it — nothing live loses a badge', async () => {
    const r = await addSubject(governance, 'vocab.old', 'Only a retired course');
    const id = r.rows[0].id;
    await taggedVersion('vocab.old', 'retired');

    await setStatus(governance, id, 'retired');

    const status = (await q(`select status from public.subject_areas where id = $1`, [id])).rows[0].status;
    assert(status === 'retired', `status is ${status}`);
  });

  await test('a retired subject can be brought back', async () => {
    const id = await subjectId('vocab.unused');

    await setStatus(governance, id, 'active');

    const status = (await q(`select status from public.subject_areas where id = $1`, [id])).rows[0].status;
    assert(status === 'active', `status is ${status}`);
  });

  // -------------------------------------------------------------------
  console.log('\nThe audit trail');
  // -------------------------------------------------------------------

  await test('adding a subject is recorded, with the actor', async () => {
    const r = await addSubject(governance, 'vocab.audited', 'Recorded on the way in');
    const rows = await auditFor(r.rows[0].id);

    assert(rows.length === 1, `found ${rows.length} audit rows`);
    assert(rows[0].action === 'subject.created', `action is ${rows[0].action}`);
    assert(rows[0].actor === governance, 'the audit row does not name who added it');
    assert(rows[0].detail.code === 'vocab.audited', 'the audit row does not name the code');
  });

  await test('renaming records both names, so a reader can see what it was', async () => {
    const id = await subjectId('vocab.audited');
    await asActor(governance, `update public.subject_areas set name = 'Renamed once' where id = $1`, [id]);

    const rows = await auditFor(id);
    const last = rows[rows.length - 1];
    assert(last.action === 'subject.renamed', `action is ${last.action}`);
    assert(last.detail.name === 'Renamed once', 'the new name is missing');
    assert(last.detail.before.name === 'Recorded on the way in',
      'the previous name is missing, so the log cannot reconstruct what changed');
  });

  await test('retiring and reactivating are different actions, not one "updated"', async () => {
    const r = await addSubject(governance, 'vocab.cycle', 'Retired then restored');
    const id = r.rows[0].id;
    await setStatus(governance, id, 'retired');
    await setStatus(governance, id, 'active');

    const actions = (await auditFor(id)).map((row) => row.action);
    assert(actions.join(',') === 'subject.created,subject.retired,subject.reactivated',
      `actions are ${actions.join(', ')}`);
  });
}
