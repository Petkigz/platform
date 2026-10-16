// Assessments, so a course can be assessed.
//
// assessments and assessment_questions both had zero rows and no writer, so no
// teacher could create a quiz. That cascades: completion rules of type
// 'assessment_submitted' and 'assessment_passed' carry a target_assessment_id
// with nothing to point at, submit_attempt() was unreachable, and certificates
// gated on completion could not be earned by any rule needing an assessment.
//
// A trap closed here as well as the missing writer: D5 freezes assessments at
// publication and the learner reader (fetchAssessmentsForVersion) only shows
// status='active'. So a draft left behind at publication would be invisible
// forever, with no way to fix it short of a new course version.
//
// The write policies on both tables already used can_author_version() — the
// correct predicate, not the read-predicate mistake found elsewhere. Nothing is
// corrected there.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    newUser, newProfile, newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('asm-admin@example.com');
  const teacher  = await newInstructor('asm-teacher@example.com', admin);
  const reviewer = await newReviewer('asm-reviewer@example.com', admin);

  /** Act as a user and COMMIT. The functions read the actor from the session. */
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

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'assessment test']);

  async function authored({ withLesson = true } = {}) {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = withLesson ? await newLesson(section) : null;
    return { course, version, section, lesson };
  }

  // `in opts` rather than `??`, because several tests pass an explicit null to
  // check a refusal. `opts.threshold ?? 60` would turn that null back into 60
  // and the refusal would never fire — a test that passes by proving nothing.
  const createAssessment = (who, version, opts = {}) =>
    asActor(who, 'select public.create_assessment($1,$2,$3,$4,$5,$6,$7) as id', [
      version,
      opts.title ?? 'Tajweed check',
      opts.type ?? 'graded',
      opts.lesson ?? null,
      'threshold' in opts ? opts.threshold : 60,
      'limit' in opts ? opts.limit : null,
      opts.instructions ?? null,
    ]);

  // Same reason as createAssessment: an explicit null answer key is the case
  // under test, not an omission.
  const addQuestion = (who, assessmentId, opts = {}) =>
    asActor(who, 'select public.add_assessment_question($1,$2,$3,$4,$5,$6,$7) as id', [
      assessmentId,
      opts.type ?? 'single_choice',
      opts.content ?? '{"prompt":"Which is a pillar of Islam?"}',
      'points' in opts ? opts.points : 10,
      opts.grading ?? 'automatic',
      'key' in opts ? opts.key : '{"answer":"b"}',
      opts.explanation ?? null,
    ]);

  const activate = (who, assessmentId) =>
    asActor(who, 'select public.activate_assessment($1) as ok', [assessmentId]);

  const row = async (id) =>
    (await q('select title, type, status, pass_threshold, attempt_limit, lesson_id, course_version_id from public.assessments where id=$1',
      [id])).rows[0];

  const questions = async (id) =>
    (await q('select type, position, points, grading_method from public.assessment_questions where assessment_id=$1 order by position',
      [id])).rows;

  // -------------------------------------------------------------------
  console.log('\nCreating an assessment');
  // -------------------------------------------------------------------

  await test('an author creates a draft assessment', async () => {
    const { version } = await authored();

    const id = (await createAssessment(teacher, version)).rows[0].id;
    assert(id, 'no assessment id returned');

    const r = await row(id);
    assert(r.title === 'Tajweed check', `title was ${r.title}`);
    assert(r.type === 'graded', `type was ${r.type}`);
    assert(r.status === 'draft',
      `a new assessment was ${r.status}; it must start as a draft, not visible to learners`);
    assert(Number(r.pass_threshold) === 60, `pass mark was ${r.pass_threshold}`);
  });

  await test('an assessment needs a title', async () => {
    const { version } = await authored();
    await rejects(() => createAssessment(teacher, version, { title: '   ' }),
      /needs a title/i);
  });

  await test('an unsupported assessment type is refused by name', async () => {
    const { version } = await authored();
    await rejects(() => createAssessment(teacher, version, { type: 'pop_quiz' }),
      /unsupported assessment type: pop_quiz/i);
  });

  await test('a practice assessment cannot have a pass mark', async () => {
    // assessments_pass_threshold_sensible: a practice one is not graded, so a
    // pass mark would be meaningless and misleading in the UI.
    const { version } = await authored();
    await rejects(() => createAssessment(teacher, version,
      { type: 'practice', threshold: 60 }),
      /practice assessment is not graded/i);

    const id = (await createAssessment(teacher, version,
      { type: 'practice', threshold: null })).rows[0].id;
    assert(id, 'a practice assessment with no pass mark should be created');
  });

  await test('a graded assessment needs a pass mark', async () => {
    const { version } = await authored();

    for (const type of ['graded', 'final']) {
      await rejects(() => createAssessment(teacher, version,
        { type, threshold: null }),
        new RegExp(`a ${type} assessment needs a pass mark`, 'i'));
    }
  });

  await test('a pass mark must be between 0 and 100', async () => {
    const { version } = await authored();

    for (const bad of [-1, 101, 250]) {
      await rejects(() => createAssessment(teacher, version, { threshold: bad }),
        /between 0 and 100/i);
    }
  });

  await test('an attempt limit must be at least 1', async () => {
    const { version } = await authored();

    await rejects(() => createAssessment(teacher, version, { limit: 0 }),
      /at least 1/i);
    await rejects(() => createAssessment(teacher, version, { limit: -3 }),
      /at least 1/i);

    const id = (await createAssessment(teacher, version, { limit: 3 })).rows[0].id;
    assert(Number((await row(id)).attempt_limit) === 3);
  });

  await test('an assessment may be attached to one lesson of its own version', async () => {
    const { version, lesson } = await authored();

    const id = (await createAssessment(teacher, version, { lesson })).rows[0].id;
    assert((await row(id)).lesson_id === lesson, 'the lesson was not attached');
  });

  await test('an assessment cannot be attached to a lesson from another version', async () => {
    // enforce_assessment_lesson_version() already enforces this; the test
    // records that it fires rather than leaving it assumed.
    const a = await authored();
    const b = await authored();

    await rejects(() => createAssessment(teacher, a.version, { lesson: b.lesson }),
      /belongs to version/i);
  });

  await test('a stranger cannot add an assessment', async () => {
    const { version } = await authored();
    const stranger = await newUser('asm-stranger@example.com');
    await newProfile(stranger, 'Stranger');

    await rejects(() => createAssessment(stranger, version),
      /only the author may add an assessment/i);
  });

  await test('an anonymous caller cannot create an assessment', async () => {
    const { version } = await authored();

    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role authenticated');
    await rejects(
      () => q('select public.create_assessment($1,$2,$3,null,null,null,null)',
        [version, 'X', 'practice']),
      /sign in to create an assessment/i);
    await q('rollback');
  });

  // -------------------------------------------------------------------
  console.log('\nAdding questions');
  // -------------------------------------------------------------------

  await test('questions are appended in order without colliding', async () => {
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;

    await addQuestion(teacher, a);
    await addQuestion(teacher, a, { type: 'true_false', key: 'true' });
    await addQuestion(teacher, a, { type: 'short_answer', grading: 'manual', key: null });

    const qs = await questions(a);
    assert(qs.length === 3, `found ${qs.length} questions, expected 3`);

    const positions = qs.map((x) => x.position).join(', ');
    assert(positions === '1, 2, 3', `positions were [${positions}]`);
  });

  await test('an automatically graded question needs an answer key', async () => {
    // aq_automatic_needs_key. Without a key the question can never be marked,
    // so the attempt would never resolve.
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;

    await rejects(() => addQuestion(teacher, a, { key: null }),
      /needs an answer key/i);

    const id = (await addQuestion(teacher, a,
      { grading: 'manual', key: null })).rows[0].id;
    assert(id, 'a manually graded question needs no key');
  });

  await test('question content must be a JSON object', async () => {
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;

    for (const bad of ['"just a string"', '[1,2,3]', '42']) {
      await rejects(() => addQuestion(teacher, a, { content: bad }),
        /content as a JSON object/i);
    }
  });

  await test('a question is worth at least one point', async () => {
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;

    await rejects(() => addQuestion(teacher, a, { points: 0 }), /at least one point/i);
    await rejects(() => addQuestion(teacher, a, { points: -5 }), /at least one point/i);
  });

  await test('an unsupported question type is refused by name', async () => {
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;

    await rejects(() => addQuestion(teacher, a, { type: 'essay' }),
      /unsupported question type: essay/i);
  });

  await test('a stranger cannot add questions', async () => {
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;

    const stranger = await newUser('asm-stranger2@example.com');
    await newProfile(stranger, 'Stranger Two');

    await rejects(() => addQuestion(stranger, a),
      /only the author may add questions/i);
  });

  // -------------------------------------------------------------------
  console.log('\nActivation');
  // -------------------------------------------------------------------

  await test('an empty assessment cannot be activated', async () => {
    // An assessment with no questions is not a quiz, and activating one would
    // produce a zero-mark attempt nobody could pass.
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;

    await rejects(() => activate(teacher, a), /at least one question/i);
    assert((await row(a)).status === 'draft', 'the status changed anyway');
  });

  await test('activating makes it visible to learners', async () => {
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;
    await addQuestion(teacher, a);

    const ok = (await activate(teacher, a)).rows[0].ok;
    assert(ok === true, 'activation reported no change');

    assert((await row(a)).status === 'active', `status was ${(await row(a)).status}`);

    // This is exactly what fetchAssessmentsForVersion() queries. Before this
    // migration it always returned an empty list.
    const visible = (await q(
      `select id from public.assessments
        where course_version_id=$1 and status='active'`, [version])).rows;
    assert(visible.length === 1,
      `the learner would see ${visible.length} assessments, expected 1`);
  });

  await test('activating twice reports no change rather than failing', async () => {
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;
    await addQuestion(teacher, a);
    await activate(teacher, a);

    const again = (await activate(teacher, a)).rows[0].ok;
    assert(again === false, 'a second activation should report no change');
  });

  await test('a stranger cannot activate an assessment', async () => {
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;
    await addQuestion(teacher, a);

    const stranger = await newUser('asm-stranger3@example.com');
    await newProfile(stranger, 'Stranger Three');

    await rejects(() => activate(stranger, a), /only the author may activate/i);
  });

  await test('an assessment cannot be created once the version is published', async () => {
    // assessments_lock freezes this table at publication, as with sections,
    // lessons and subject mapping.
    const { version, lesson } = await authored();
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    await rejects(() => createAssessment(teacher, version, { lesson }), /locked \(D5\)/i);
  });

  // -------------------------------------------------------------------
  console.log('\nThe publication trap');
  // -------------------------------------------------------------------

  await test('publishing is refused while an assessment is still a draft', async () => {
    // D5 would freeze it invisible: the learner reader only shows 'active', and
    // after publication the status can no longer change. Refusing costs the
    // teacher one click now; discovering it later costs a new course version.
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;
    await addQuestion(teacher, a);
    assert((await row(a)).status === 'draft', 'precondition: still a draft');

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);

    await rejects(() => transition(version, 'published', admin),
      /draft assessment\(s\) must be activated or removed/i);

    const v = (await q('select version_status from public.course_versions where id=$1',
      [version])).rows[0];
    assert(v.version_status !== 'published',
      `the version was published anyway, status=${v.version_status}`);
  });

  await test('publishing succeeds once the draft assessment is activated', async () => {
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;
    await addQuestion(teacher, a);
    await activate(teacher, a);

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    const v = (await q('select version_status from public.course_versions where id=$1',
      [version])).rows[0];
    assert(v.version_status === 'published',
      `the version was ${v.version_status}, expected published`);
  });

  await test('the refusal names the assessment that is blocking', async () => {
    // Naming it matters: "something is not ready" sends the teacher hunting.
    const { version } = await authored();
    const a = (await createAssessment(teacher, version, { title: 'Final exam' })).rows[0].id;
    await addQuestion(teacher, a);

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);

    let message = null;
    try {
      await transition(version, 'published', admin);
    } catch (e) {
      message = String(e.message);
    }

    assert(message !== null, 'publication was not refused');
    assert(message.includes('Final exam'),
      `the refusal did not name the assessment: ${message}`);
  });

  await test('a version with no assessments publishes as before', async () => {
    const { version } = await authored();
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    const v = (await q('select version_status from public.course_versions where id=$1',
      [version])).rows[0];
    assert(v.version_status === 'published');
  });

  // -------------------------------------------------------------------
  console.log('\nIt can now be sat');
  // -------------------------------------------------------------------

  await test('a learner can start and submit an attempt', async () => {
    // The end-to-end proof. submit_attempt() existed but was unreachable,
    // because no assessment could exist to attempt.
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;
    const qid = (await addQuestion(teacher, a)).rows[0].id;
    await activate(teacher, a);

    const learner = await newUser('asm-learner@example.com');
    await newProfile(learner, 'Learner');
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Learner','adult','18+',$1) returning id`, [learner])).rows[0].id;

    const enrolment = (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`,
      [learnerId, (await q('select course_id from public.course_versions where id=$1',
        [version])).rows[0].course_id, version])).rows[0].id;

    const attempt = (await q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number,
          status, started_at)
       values ($1,$2,$3,1,'in_progress',now()) returning id`,
      [a, learnerId, enrolment])).rows[0].id;

    // The response is written WITHOUT a score. Scoring belongs to
    // grade_response(), which is the only code allowed to read answer_key —
    // setting the score here would have bypassed the grading path entirely and
    // proven nothing about it.
    await q(
      `insert into public.assessment_responses
         (assessment_attempt_id, question_id, response_content)
       values ($1,$2,'{"answer":"b"}'::jsonb)`, [attempt, qid]);

    const submitted = (await q(
      `select status from public.submit_attempt($1)`, [attempt])).rows[0];
    assert(submitted.status === 'submitted', `status was ${submitted.status}`);

    const responseId = (await q(
      `select id from public.assessment_responses
        where assessment_attempt_id = $1 and question_id = $2`,
      [attempt, qid])).rows[0].id;

    await q('select * from public.grade_response($1,$2)', [responseId, admin]);

    const fin = (await q(
      `select score_earned, score_possible, passed
         from public.finalize_attempt_grading($1)`, [attempt])).rows[0];

    assert(Number(fin.score_earned) === 10,
      `earned ${fin.score_earned}, expected 10`);
    assert(Number(fin.score_possible) === 10,
      `possible was ${fin.score_possible}, expected 10`);
    assert(fin.passed === true, 'a perfect attempt did not pass');
  });

  // -------------------------------------------------------------------
  console.log('\nAudit trail');
  // -------------------------------------------------------------------

  await test('creation, questions and activation are audited', async () => {
    const { version } = await authored();
    const a = (await createAssessment(teacher, version)).rows[0].id;
    await addQuestion(teacher, a);
    await activate(teacher, a);

    const actions = (await q(
      `select action from public.governance_audit_events
        where target_type='assessment' and target_id=$1 order by occurred_at`,
      [a])).rows.map((x) => x.action);

    assert(actions.join(',') === 'assessment.created,assessment.question_added,assessment.activated',
      `audit actions were [${actions.join(', ')}]`);
  });
}
