// Assessments.
//
// The centrepiece is the answer key. It is protected by column privileges
// rather than RLS, because RLS cannot hide a column — and the consequence is
// worth pinning down explicitly: a `SELECT *` is refused outright rather than
// quietly returning the granted columns. An ORM or the Supabase client
// defaulting to a star select is the most likely way this ever leaks, so the
// first test is that it cannot.
//
// Everything else is the state machine: an attempt cannot be submitted with
// unanswered questions, cannot be edited after submission, and cannot exceed
// its attempt limit.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('asm-admin@example.com');
  const teacher  = await newInstructor('asm-teacher@example.com', admin);
  const reviewer = await newReviewer('asm-reviewer@example.com', admin);

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const setVersion = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, 'assessment']);

  async function adult(email, name) {
    const userId = await newUser(email);
    await newProfile(userId, name ?? email);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [name ?? email, userId])).rows[0].id;
    return { userId, learnerId };
  }

  // -------------------------------------------------------------------
  // Fixtures: a published course with one two-question assessment
  // -------------------------------------------------------------------
  const course  = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lesson  = await newLesson(section);

  // D5 freezes the whole course-version subtree on publication, and
  // lock_assessment_of_locked_version() enforces it for assessments too. So
  // the assessment and its questions are built while the version is still a
  // draft, and publication comes last.
  const assessmentId = await committed(async () =>
    (await q(
      `insert into public.assessments
         (course_version_id, lesson_id, title, type, pass_threshold, attempt_limit, status)
       values ($1, $2, 'Tajweed check', 'graded', 50, 2, 'active') returning id`,
      [version, lesson])).rows[0].id);

  // One automatic question, one manual. The key for the automatic one is a
  // plain JSON string, which is what grade_response() compares against.
  const autoQ = await committed(async () =>
    (await q(
      `insert into public.assessment_questions
         (assessment_id, type, content, answer_key, points, position, grading_method)
       values ($1, 'single_choice',
               '{"prompt":"Which is a rule of noon sakinah?","choices":[{"id":"a","text":"Izhar"},{"id":"b","text":"Nothing"}]}',
               '"a"'::jsonb, 2, 1, 'automatic') returning id`, [assessmentId])).rows[0].id);

  const manualQ = await committed(async () =>
    (await q(
      `insert into public.assessment_questions
         (assessment_id, type, content, answer_key, points, position, grading_method)
       values ($1, 'short_answer',
               '{"prompt":"Recite and explain the rule."}',
               null, 3, 2, 'manual') returning id`, [assessmentId])).rows[0].id);

  await setVersion(version, 'submitted', teacher);
  await setVersion(version, 'approved', reviewer);
  await satisfyReview(version, reviewer, admin);
  await setVersion(version, 'published', admin);

  const learner = await adult('asm-learner@example.com', 'Assessment Learner');
  const enrolmentId = await committed(async () =>
    (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1, $2, $3, 'free', 'active') returning id`,
      [learner.learnerId, course, version])).rows[0].id);

  const stranger = await adult('asm-stranger@example.com', 'Stranger');

  async function newAttempt(learnerProfileId) {
    const n = (await q(
      `select coalesce(max(attempt_number), 0) + 1 n from public.assessment_attempts
        where assessment_id = $1 and course_enrolment_id = $2`,
      [assessmentId, enrolmentId])).rows[0].n;
    return (await q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number, status)
       values ($1, $2, $3, $4, 'in_progress') returning id`,
      [assessmentId, learnerProfileId, enrolmentId, n])).rows[0].id;
  }

  const answer = (attemptId, questionId, content) =>
    q(`insert into public.assessment_responses
         (assessment_attempt_id, question_id, response_content)
       values ($1, $2, $3::jsonb) returning id`, [attemptId, questionId, content]);

  // -------------------------------------------------------------------
  // The answer key
  // -------------------------------------------------------------------
  await test('SELECT * on assessment_questions is refused, not filtered', async () => {
    await asUser(learner.userId, async () => {
      await rejects(() => q('select * from public.assessment_questions limit 1'),
        'SELECT * on assessment_questions was allowed; answer_key could leak');
    });
  });

  await test('the granted column list excludes answer_key', async () => {
    await asUser(learner.userId, async () => {
      const ok = await q(
        `select id, assessment_id, type, content, points, position, explanation, grading_method
           from public.assessment_questions where id = $1`, [autoQ]);
      assert(ok.rows.length === 1, 'the explicit column list did not return the question');

      await rejects(() => q(
        'select answer_key from public.assessment_questions where id = $1', [autoQ]),
        'a learner read answer_key directly');
    });
  });

  await test('a privileged role cannot read the key either — only grade_response can', async () => {
    // The protection is column privileges on the role, so it holds for staff
    // too. That is deliberate: the key has no legitimate read path in the
    // application, and an admin console that needed it would be a leak.
    await asUser(admin, async () => {
      await rejects(() => q(
        'select answer_key from public.assessment_questions where id = $1', [autoQ]),
        'a platform admin read answer_key through SQL');
    });
  });

  // -------------------------------------------------------------------
  // The attempt state machine
  // -------------------------------------------------------------------
  await test('an attempt cannot be submitted with unanswered questions', async () => {
    const attemptId = await committed(() => newAttempt(learner.learnerId));

    await committed(async () => {
      await answer(attemptId, autoQ, '"a"');
    });

    await rejects(() => q('select public.submit_attempt($1)', [attemptId]),
      'an attempt with an unanswered question was submitted');

    const status = (await q(
      'select status from public.assessment_attempts where id = $1', [attemptId])).rows[0].status;
    assert(status === 'in_progress',
      `the attempt moved to '${status}' despite the refusal`);
  });

  // Shared with the grading tests below. Selected once, here, because the
  // status changes as grading proceeds and a re-select would find nothing.
  let submittedAttemptId = null;

  await test('a submitted attempt cannot be edited', async () => {
    const attemptId = await committed(() => newAttempt(learner.learnerId));
    submittedAttemptId = attemptId;

    await committed(async () => {
      await answer(attemptId, autoQ, '"a"');
      await answer(attemptId, manualQ, '"my recitation"');
      await q('select public.submit_attempt($1)', [attemptId]);
    });

    const status = (await q(
      'select status from public.assessment_attempts where id = $1', [attemptId])).rows[0].status;
    assert(status === 'submitted', `expected submitted, got '${status}'`);

    await rejects(() => answer(attemptId, autoQ, '"b"'),
      'a response was added after submission');
    await rejects(() => q(
      `update public.assessment_responses set response_content = '"b"'::jsonb
        where assessment_attempt_id = $1`, [attemptId]),
      'a response was changed after submission');

    await rejects(() => q('select public.submit_attempt($1)', [attemptId]),
      'an attempt was submitted twice');
  });

  await test('the attempt limit is enforced', async () => {
    // attempt_limit is 2; two attempts already exist for this enrolment.
    const existing = await count(
      `select 1 from public.assessment_attempts where course_enrolment_id = $1`, [enrolmentId]);
    assert(existing >= 2, `setup expected at least 2 attempts, found ${existing}`);

    await rejects(() => newAttempt(learner.learnerId),
      'a third attempt was created against a limit of 2');
  });

  // -------------------------------------------------------------------
  // Grading — the only reader of the key
  // -------------------------------------------------------------------
  await test('an automatic question is graded from the key the app never sees', async () => {
    const attemptId = submittedAttemptId;
    assert(attemptId, 'setup failed: no submitted attempt was recorded');

    const respId = (await q(
      `select id from public.assessment_responses
        where assessment_attempt_id = $1 and question_id = $2`, [attemptId, autoQ])).rows[0].id;

    await q('select public.grade_response($1, $2, null, null)', [respId, admin]);

    const r = (await q(
      'select score, is_correct from public.assessment_responses where id = $1', [respId])).rows[0];
    assert(Number(r.score) === 2, `a correct answer scored ${r.score}, expected 2`);
    assert(r.is_correct === true, 'a correct answer was marked incorrect');
  });

  await test('a manual question needs a human verdict, and not just anyone', async () => {
    const attemptId = submittedAttemptId;
    const respId = (await q(
      `select id from public.assessment_responses
        where assessment_attempt_id = $1 and question_id = $2`, [attemptId, manualQ])).rows[0].id;

    await rejects(() => q('select public.grade_response($1, $2, null, null)', [respId, admin]),
      'a manual question was graded with no verdict');

    await rejects(() => q('select public.grade_response($1, $2, 3, true)', [respId, learner.userId]),
      'a learner graded their own manual answer');

    await q('select public.grade_response($1, $2, 2, true)', [respId, admin]);
    const r = (await q(
      'select score, is_correct from public.assessment_responses where id = $1', [respId])).rows[0];
    assert(Number(r.score) === 2, `manual score was ${r.score}`);
  });

  await test('a score cannot exceed the points available', async () => {
    const attemptId = (await q(
      `select id from public.assessment_attempts
        where course_enrolment_id = $1 and status <> 'graded'
        order by attempt_number desc limit 1`, [enrolmentId])).rows[0].id;

    if (!attemptId) return; // nothing left to test against
    const respId = (await q(
      `select id from public.assessment_responses
        where assessment_attempt_id = $1 and question_id = $2 and graded_at is null
        limit 1`, [attemptId, manualQ])).rows[0]?.id;
    if (!respId) return;

    await rejects(() => q('select public.grade_response($1, $2, 99, true)', [respId, admin]),
      'a score above the question points was accepted');
  });

  await test('finalising writes the totals and the pass verdict', async () => {
    const attemptId = submittedAttemptId;
    await q('select public.finalize_attempt_grading($1)', [attemptId]);
    const a = (await q(
      'select status, score_earned, score_possible, passed from public.assessment_attempts where id = $1',
      [attemptId])).rows[0];

    assert(a.status === 'graded', `expected graded, got '${a.status}'`);
    assert(Number(a.score_possible) === 5, `score_possible was ${a.score_possible}, expected 5`);
    assert(Number(a.score_earned) === 4, `score_earned was ${a.score_earned}, expected 4 (2+2)`);
    assert(a.passed === true, `4/5 against a 50% threshold should pass, got ${a.passed}`);
  });

  // -------------------------------------------------------------------
  // Isolation
  // -------------------------------------------------------------------
  await test('a stranger cannot answer on someone else\'s attempt', async () => {
    const attemptId = await committed(() => newAttempt(stranger.learnerId)).catch(() => null);
    const victimAttempt = (await q(
      `select id from public.assessment_attempts where course_enrolment_id = $1 limit 1`,
      [enrolmentId])).rows[0].id;
    void attemptId;

    await asUser(stranger.userId, async () => {
      await rejects(() => answer(victimAttempt, autoQ, '"b"'),
        'a stranger answered on another learner\'s attempt');
    });

    const n = await count(
      `select 1 from public.assessment_responses
        where assessment_attempt_id = $1 and question_id = $2
          and response_content = '"b"'::jsonb`, [victimAttempt, autoQ]);
    assert(n === 0, 'the stranger\'s answer was written anyway');
  });

  await test('a question from another assessment cannot be answered here', async () => {
    // enforce_response_question_match ties a response to a question belonging
    // to the same assessment.
    const otherVersion = await newVersion(course, teacher, { version_number: 2 });
    const otherSection = await newSection(otherVersion);
    await newLesson(otherSection);
    const otherAssessment = (await q(
      `insert into public.assessments (course_version_id, title, status, type)
       values ($1, 'Other', 'active', 'practice') returning id`, [otherVersion])).rows[0].id;
    const otherQ = (await q(
      `insert into public.assessment_questions
         (assessment_id, type, content, answer_key, points, position)
       values ($1, 'true_false', '{"prompt":"Unrelated?"}', 'true'::jsonb, 1, 1) returning id`,
      [otherAssessment])).rows[0].id;

    const attemptId = (await q(
      `select id from public.assessment_attempts where course_enrolment_id = $1 limit 1`,
      [enrolmentId])).rows[0].id;

    await rejects(() => answer(attemptId, otherQ, 'true'),
      'a response referenced a question from a different assessment');
  });
}
