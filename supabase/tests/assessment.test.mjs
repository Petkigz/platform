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
    asUser, asAnon, committed,
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

  // -------------------------------------------------------------------
  // The answer sheet, written as a learner
  //
  // Everything above writes responses as the database owner. That is how
  // three defects stood for a month: a learner could insert a response with
  // its mark already on it, could not change an answer and was not told, and
  // could never hand in a practice assessment. These tests act as the
  // learner, commit, and read back what is there.
  // -------------------------------------------------------------------
  const course2  = await newCourse(teacher, { status: 'active' });
  const version2 = await newVersion(course2, teacher);
  const section2 = await newSection(version2);
  await newLesson(section2);

  const question = async (assessment, position, key) =>
    (await q(
      `insert into public.assessment_questions
         (assessment_id, type, content, answer_key, points, position, grading_method)
       values ($1, 'single_choice',
               '{"prompt":"Pick one","choices":[{"id":"a","text":"A"},{"id":"b","text":"B"}]}',
               $3::jsonb, 1, $2, 'automatic') returning id`, [assessment, position, key])).rows[0].id;

  // Graded, pass at 50%, no attempt limit; and a practice one, which by rule
  // has no pass mark.
  const graded = await committed(async () =>
    (await q(
      `insert into public.assessments (course_version_id, title, type, pass_threshold, status)
       values ($1, 'Sheet check', 'graded', 50, 'active') returning id`, [version2])).rows[0].id);
  const gradedQ1 = await committed(() => question(graded, 1, '"b"'));
  const gradedQ2 = await committed(() => question(graded, 2, '"b"'));
  const practice = await committed(async () =>
    (await q(
      `insert into public.assessments (course_version_id, title, type, status)
       values ($1, 'Practice sheet', 'practice', 'active') returning id`, [version2])).rows[0].id);
  const practiceQ = await committed(() => question(practice, 1, '"b"'));

  await setVersion(version2, 'submitted', teacher);
  await setVersion(version2, 'approved', reviewer);
  await satisfyReview(version2, reviewer, admin);
  await setVersion(version2, 'published', admin);

  const sitter = await adult('asm-sitter@example.com', 'Sitter');
  const sitterEnrolment = await committed(async () =>
    (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1, $2, $3, 'free', 'active') returning id`,
      [sitter.learnerId, course2, version2])).rows[0].id);

  // As a signed-in user, and kept. `asUser` rolls back, which is right for a
  // single look and useless for a sequence that has a refusal in the middle:
  // a refused statement ends its transaction.
  async function acting(userId, fn) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: userId })]);
    await q('set local role authenticated');
    try { const r = await fn(); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  // The attempt is opened the way the page opens it: by the learner.
  const openAttempt = (assessment) => acting(sitter.userId, async () => {
    const n = (await q(
      `select coalesce(max(attempt_number), 0) + 1 n from public.assessment_attempts
        where assessment_id = $1 and learner_profile_id = $2`, [assessment, sitter.learnerId])).rows[0].n;
    return (await q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number, status)
       values ($1, $2, $3, $4, 'in_progress') returning id`,
      [assessment, sitter.learnerId, sitterEnrolment, n])).rows[0].id;
  });

  const save = (userId, attempt, questionId, content) => acting(userId, async () =>
    (await q('select public.save_assessment_response($1, $2, $3::jsonb) as held',
      [attempt, questionId, content])).rows[0].held);
  const submit = (userId, attempt) => acting(userId, async () =>
    (await q('select (public.submit_assessment_attempt($1)).status as status', [attempt])).rows[0].status);
  const sheet = async (attempt) => (await q(
    `select question_id, response_content, score, is_correct, graded_by, graded_at
       from public.assessment_responses where assessment_attempt_id = $1 order by created_at`, [attempt])).rows;
  const attemptRow = async (attempt) => (await q(
    'select status, score_earned, score_possible, passed from public.assessment_attempts where id = $1',
    [attempt])).rows[0];

  await test('a learner cannot write to the answer sheet directly', async () => {
    const attempt = await openAttempt(graded);
    // Not even an honest row: the table is written through one function.
    await rejects(() => acting(sitter.userId, () => q(
      `insert into public.assessment_responses (assessment_attempt_id, question_id, response_content)
       values ($1, $2, '"a"'::jsonb)`, [attempt, gradedQ1])), /permission denied/i);
    assert(await save(sitter.userId, attempt, gradedQ1, '"a"') === true, 'the writer did not hold the answer');
    const [row] = await sheet(attempt);
    await rejects(() => acting(sitter.userId, () => q(
      `update public.assessment_responses set response_content = '"b"'::jsonb
        where assessment_attempt_id = $1`, [attempt])), /permission denied/i);
    await rejects(() => acting(sitter.userId, () => q(
      `update public.assessment_responses set score = 1, is_correct = true
        where assessment_attempt_id = $1`, [attempt])), /permission denied/i);
    await rejects(() => acting(sitter.userId, () => q(
      'delete from public.assessment_responses where assessment_attempt_id = $1', [attempt])), /permission denied/i);
    const after = await sheet(attempt);
    assert(after.length === 1 && after[0].response_content === row.response_content && after[0].score === null,
      `the sheet changed: ${JSON.stringify(after)}`);
  });

  await test('a wrong answer cannot be given a mark by the learner who wrote it', async () => {
    // What worked before: the wrong answer, with a mark of 1 written beside it
    // by the learner, skipped by the marking because it looked marked already.
    const attempt = await openAttempt(graded);
    await rejects(() => acting(sitter.userId, () => q(
      `insert into public.assessment_responses
         (assessment_attempt_id, question_id, response_content, score, is_correct, graded_by, graded_at)
       values ($1, $2, '"a"'::jsonb, 1, true, $3, now())`, [attempt, gradedQ1, sitter.userId])),
      /permission denied/i);
    assert((await sheet(attempt)).length === 0, 'a self-marked response was written');

    await save(sitter.userId, attempt, gradedQ1, '"a"');
    await save(sitter.userId, attempt, gradedQ2, '"a"');
    assert(await submit(sitter.userId, attempt) === 'graded', 'the attempt was not graded');
    const result = await attemptRow(attempt);
    assert(Number(result.score_earned) === 0 && result.passed === false,
      `two wrong answers came out as ${JSON.stringify(result)}`);
  });

  await test('a mark cannot be written with an answer, whoever is asking', async () => {
    // The privileges stop a browser. This is the lock that does not depend on
    // the role: the database owner, outside grading, is refused as well.
    const attempt = await openAttempt(graded);
    await rejects(() => q(
      `insert into public.assessment_responses
         (assessment_attempt_id, question_id, response_content, score, is_correct, graded_by, graded_at)
       values ($1, $2, '"a"'::jsonb, 1, true, $3, now())`, [attempt, gradedQ1, sitter.userId]),
      /marked by grading, not when it is written/i);
    await rejects(() => q(
      `insert into public.assessment_responses
         (assessment_attempt_id, question_id, response_content, grading_feedback)
       values ($1, $2, '"a"'::jsonb, 'Well done')`, [attempt, gradedQ1]),
      /marked by grading, not when it is written/i);
    await save(sitter.userId, attempt, gradedQ1, '"a"');
    await rejects(() => q(
      `update public.assessment_responses set score = 1, is_correct = true
        where assessment_attempt_id = $1`, [attempt]),
      /marked by grading, not by editing it/i);
    // An owner may still correct the answer itself on an open attempt; only
    // the marks are closed.
    await q(`update public.assessment_responses set response_content = '"b"'::jsonb
              where assessment_attempt_id = $1`, [attempt]);
    const [row] = await sheet(attempt);
    assert(row.response_content === 'b' && row.score === null && row.graded_at === null,
      `unexpected row ${JSON.stringify(row)}`);
  });

  await test('an answer is saved, changed, and taken back', async () => {
    const attempt = await openAttempt(graded);
    assert(await save(sitter.userId, attempt, gradedQ1, '"a"') === true);
    assert((await sheet(attempt))[0].response_content === 'a', 'the first answer was not saved');

    // The change that used to be dropped without a word.
    assert(await save(sitter.userId, attempt, gradedQ1, '"b"') === true);
    let rows = await sheet(attempt);
    assert(rows.length === 1, `changing an answer left ${rows.length} rows`);
    assert(rows[0].response_content === 'b', `the answer is still ${JSON.stringify(rows[0].response_content)}`);

    // Every way of answering nothing removes the row, so the question counts
    // as unanswered when the attempt is handed in.
    for (const empty of ['""', '"   "', '[]', 'null', null]) {
      await save(sitter.userId, attempt, gradedQ1, '"a"');
      const held = await save(sitter.userId, attempt, gradedQ1, empty);
      assert(held === false, `${empty} was held as an answer`);
      assert((await sheet(attempt)).length === 0, `${empty} left a row behind`);
    }
    await save(sitter.userId, attempt, gradedQ2, '"b"');
    await rejects(() => submit(sitter.userId, attempt), /unanswered questions/i);

    // A multiple-choice answer is a list and is kept as one.
    assert(await save(sitter.userId, attempt, gradedQ1, '["a","b"]') === true);
    rows = await sheet(attempt);
    assert(JSON.stringify(rows.find((r) => r.question_id === gradedQ1).response_content) === '["a","b"]');
  });

  await test('the answer that is marked is the last one given', async () => {
    const attempt = await openAttempt(graded);
    await save(sitter.userId, attempt, gradedQ1, '"a"');
    await save(sitter.userId, attempt, gradedQ2, '"a"');
    await save(sitter.userId, attempt, gradedQ1, '"b"');
    await save(sitter.userId, attempt, gradedQ2, '"b"');
    assert(await submit(sitter.userId, attempt) === 'graded');
    const result = await attemptRow(attempt);
    assert(Number(result.score_earned) === 2 && Number(result.score_possible) === 2 && result.passed === true,
      `two corrected answers came out as ${JSON.stringify(result)}`);
    const rows = await sheet(attempt);
    assert(rows.every((r) => r.is_correct === true && r.graded_by === sitter.userId && r.graded_at !== null),
      'the marking did not record itself on the responses');
  });

  await test('nothing is saved once the attempt is handed in', async () => {
    const attempt = await openAttempt(graded);
    await save(sitter.userId, attempt, gradedQ1, '"a"');
    await save(sitter.userId, attempt, gradedQ2, '"b"');
    await submit(sitter.userId, attempt);
    await rejects(() => save(sitter.userId, attempt, gradedQ1, '"b"'), /already been submitted/i);
    await rejects(() => save(sitter.userId, attempt, gradedQ1, '""'), /already been submitted/i);
    const rows = await sheet(attempt);
    assert(rows.find((r) => r.question_id === gradedQ1).response_content === 'a', 'an answer changed after submission');
    const result = await attemptRow(attempt);
    assert(Number(result.score_earned) === 1 && result.passed === true, `expected 1 of 2 and a pass at 50%, got ${JSON.stringify(result)}`);
  });

  await test('nobody saves an answer on an attempt that is not theirs', async () => {
    const attempt = await openAttempt(graded);
    await rejects(() => save(stranger.userId, attempt, gradedQ1, '"b"'), /that attempt was not found/i);
    // The same words for an attempt that does not exist, so the refusal does
    // not say which ids are real.
    await rejects(() => save(stranger.userId, '00000000-0000-4000-8000-000000000000', gradedQ1, '"b"'),
      /that attempt was not found/i);
    await rejects(() => asAnon(() => q(
      'select public.save_assessment_response($1, $2, $3::jsonb)', [attempt, gradedQ1, '"b"'])),
      /sign in to answer|permission denied/i);
    // A question from another assessment is refused by the rule that ties a
    // response to its attempt's assessment.
    await rejects(() => save(sitter.userId, attempt, practiceQ, '"b"'), /does not belong/i);
    assert((await sheet(attempt)).length === 0, 'something was written');
  });

  await test('a practice assessment can be handed in: a score, and no verdict', async () => {
    // No pass mark, so no pass and no fail. The old constraint demanded a
    // verdict on every graded attempt and refused the submission instead.
    const attempt = await openAttempt(practice);
    await save(sitter.userId, attempt, practiceQ, '"b"');
    assert(await submit(sitter.userId, attempt) === 'graded', 'a practice attempt was not graded');
    const result = await attemptRow(attempt);
    assert(Number(result.score_earned) === 1 && Number(result.score_possible) === 1, `score ${JSON.stringify(result)}`);
    assert(result.passed === null, `a practice attempt was given a verdict: ${result.passed}`);

    const wrong = await openAttempt(practice);
    await save(sitter.userId, wrong, practiceQ, '"a"');
    await submit(sitter.userId, wrong);
    const missed = await attemptRow(wrong);
    assert(Number(missed.score_earned) === 0 && missed.passed === null, `wrong practice answer: ${JSON.stringify(missed)}`);

    // A graded attempt still needs its score.
    await rejects(() => q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number, status, submitted_at, graded_at)
       values ($1, $2, $3, 99, 'graded', now(), now())`, [practice, sitter.learnerId, sitterEnrolment]),
      /aa_graded_has_score/i);
  });

  await test('the writer is the only way in, and only for somebody signed in', async () => {
    const privilege = async (role, what) => (await q(
      `select has_table_privilege($1, 'public.assessment_responses', $2) as held`, [role, what])).rows[0].held;
    for (const role of ['anon', 'authenticated']) {
      for (const what of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
        assert(await privilege(role, what) === false, `${role} holds ${what} on assessment_responses`);
      }
    }
    assert(await privilege('authenticated', 'SELECT') === true, 'a learner can no longer read their own answers');
    const columns = await count(
      `select 1 from information_schema.column_privileges
        where table_schema = 'public' and table_name = 'assessment_responses'
          and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE')`);
    assert(columns === 0, `${columns} column-level write privileges remain`);
    const execute = async (role) => (await q(
      `select has_function_privilege($1, 'public.save_assessment_response(uuid, uuid, jsonb)', 'EXECUTE') as held`,
      [role])).rows[0].held;
    assert(await execute('authenticated') === true);
    assert(await execute('anon') === false, 'somebody not signed in may call the writer');
    const policies = (await q(
      `select policyname, cmd from pg_policies
        where schemaname = 'public' and tablename = 'assessment_responses' order by policyname`)).rows;
    assert(JSON.stringify(policies) === JSON.stringify([{ policyname: 'assessment_responses_read', cmd: 'SELECT' }]),
      `policies are ${JSON.stringify(policies)}`);
  });
}
