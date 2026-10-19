// Teacher feedback on manually marked answers.
//
// What is worth pinning is not that a text column can be written. It is that the
// comment is part of the mark and not a separate editable thing, that it can
// never appear on an answer a machine graded, and that the audit log records
// that a teacher said something without keeping a copy of what they said.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newUser, newProfile, newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('feedback-admin@example.com');
  const teacher = await newInstructor('feedback-teacher@example.com', admin);
  const stranger = await newInstructor('feedback-stranger@example.com', admin);
  const reviewer = await newReviewer('feedback-reviewer@example.com', admin);

  async function newAdult(email, name) {
    const userId = await newUser(email);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles(display_name,learner_type,age_band,linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    return { userId, learnerId };
  }

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await q(sql, params); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  /** Expect a refusal, for the reason claimed, without poisoning the session. */
  async function refused(who, sql, params, pattern) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: who, role: 'authenticated' })]);
    await q('set local role authenticated');
    await q('savepoint expected_refusal');
    let caught;
    try { await q(sql, params); } catch (e) { caught = e; }
    await q('rollback to savepoint expected_refusal');
    await q('rollback');
    assert(caught, `expected a refusal matching ${pattern}`);
    const text = String(caught.message ?? caught);
    assert(pattern.test(text),
      `refused, but not for the reason asserted: expected ${pattern}, got: ${text.slice(0, 200)}`);
  }

  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lesson = await newLesson(section);

  const assessment = (await q(
    `insert into public.assessments
       (course_version_id,lesson_id,title,type,pass_threshold,status)
     values ($1,$2,'Written work','graded',50,'active') returning id`,
    [version, lesson])).rows[0].id;
  const manualQuestion = (await q(
    `insert into public.assessment_questions
       (assessment_id,type,content,points,position,grading_method)
     values ($1,'short_answer','{"prompt":"Explain your reasoning"}',3,1,'manual') returning id`,
    [assessment])).rows[0].id;

  const automatic = (await q(
    `insert into public.assessments
       (course_version_id,title,type,pass_threshold,status)
     values ($1,'Automatic check','graded',50,'active') returning id`, [version])).rows[0].id;
  const autoQuestion = (await q(
    `insert into public.assessment_questions
       (assessment_id,type,content,answer_key,points,position,grading_method)
     values ($1,'single_choice','{"prompt":"Choose yes","choices":[{"id":"yes","text":"Yes"},{"id":"no","text":"No"}]}',
             '"yes"'::jsonb,2,1,'automatic') returning id`, [automatic])).rows[0].id;

  await q('select id from public.set_course_version_status($1,$2,$3,$4)',
    [version, 'submitted', teacher, 'feedback fixture']);
  await q('select id from public.set_course_version_status($1,$2,$3,$4)',
    [version, 'approved', reviewer, 'feedback fixture']);
  await satisfyReview(version, reviewer, admin);
  await q('select id from public.set_course_version_status($1,$2,$3,$4)',
    [version, 'published', admin, 'feedback fixture']);

  const learner = await newAdult('feedback-learner@example.com', 'Learner');
  const other = await newAdult('feedback-other@example.com', 'Other Learner');

  const enrolment = (await q(
    `insert into public.course_enrolments(learner_profile_id,course_id,course_version_id,source)
     values ($1,$2,$3,'free') returning id`, [learner.learnerId, course, version])).rows[0].id;

  const attempt = (await q(
    `insert into public.assessment_attempts
       (assessment_id,learner_profile_id,course_enrolment_id,attempt_number)
     values ($1,$2,$3,1) returning id`, [assessment, learner.learnerId, enrolment])).rows[0].id;
  const manualResponse = (await q(
    `insert into public.assessment_responses(assessment_attempt_id,question_id,response_content)
     values ($1,$2,'"Because the verse is about patience."'::jsonb) returning id`,
    [attempt, manualQuestion])).rows[0].id;

  const autoAttempt = (await q(
    `insert into public.assessment_attempts
       (assessment_id,learner_profile_id,course_enrolment_id,attempt_number)
     values ($1,$2,$3,1) returning id`, [automatic, learner.learnerId, enrolment])).rows[0].id;
  const autoResponse = (await q(
    `insert into public.assessment_responses(assessment_attempt_id,question_id,response_content)
     values ($1,$2,'"yes"'::jsonb) returning id`, [autoAttempt, autoQuestion])).rows[0].id;

  await asActor(learner.userId,
    'select status from public.submit_assessment_attempt($1)', [attempt]);

  const MARK = 'select public.mark_manual_assessment_response($1,$2,$3,$4)';
  const responseRow = async (id) =>
    (await q('select score,is_correct,graded_by,graded_at,grading_feedback from public.assessment_responses where id=$1', [id])).rows[0];

  // -------------------------------------------------------------------
  await test('there is exactly one marking function and one grader', async () => {
    // Two signatures differing only by a defaulted argument would both match a
    // three-argument call, and whichever Postgres resolved would decide whether
    // a teacher's comment was silently thrown away.
    const rows = (await q(
      `select p.proname, pg_get_function_identity_arguments(p.oid) args
         from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public'
          and p.proname in ('mark_manual_assessment_response','grade_response')
        order by p.proname`)).rows;
    assert(rows.length === 2, `expected one of each, got ${JSON.stringify(rows)}`);
    assert(/p_feedback text/.test(rows.find((r) => r.proname === 'mark_manual_assessment_response').args),
      'the marking function lost its feedback argument');
  });

  await test('overlong feedback is refused before anything is written', async () => {
    await refused(teacher, MARK, [manualResponse, 2, true, 'x'.repeat(5001)],
      /5000 characters or fewer/i);
    const row = await responseRow(manualResponse);
    assert(row.graded_at === null, 'a refused mark still graded the response');
  });

  await test('the ceiling is the one assignment marking uses', async () => {
    // 5000 characters, matching `assignment_submissions.feedback`. A teacher
    // marking work should meet one limit, not one per surface. Pinned on its own
    // attempt so the boundary case does not consume a response another test
    // needs unmarked.
    const attemptId = (await q(
      `insert into public.assessment_attempts
         (assessment_id,learner_profile_id,course_enrolment_id,attempt_number)
       values ($1,$2,$3,9) returning id`, [assessment, learner.learnerId, enrolment])).rows[0].id;
    const responseId = (await q(
      `insert into public.assessment_responses(assessment_attempt_id,question_id,response_content)
       values ($1,$2,'"Boundary case."'::jsonb) returning id`, [attemptId, manualQuestion])).rows[0].id;
    await asActor(learner.userId,
      'select status from public.submit_assessment_attempt($1)', [attemptId]);

    await asActor(teacher, MARK, [responseId, 3, true, 'x'.repeat(5000)]);
    const row = await responseRow(responseId);
    assert(row.grading_feedback.length === 5000,
      `a 5000-character comment was stored as ${row.grading_feedback.length} characters`);
  });

  await test('only the course author can leave feedback', async () => {
    await refused(stranger, MARK, [manualResponse, 2, true, 'Well argued.'],
      /only the course author/i);
    await refused(learner.userId, MARK, [manualResponse, 2, true, 'Marked it myself.'],
      /only the course author/i);
  });

  await test('feedback cannot be attached to an answer a machine graded', async () => {
    await asActor(learner.userId,
      'select status from public.submit_assessment_attempt($1)', [autoAttempt]);
    // Either refusal is the right one: an automatic answer is graded during
    // submission, so by the time a teacher could reach it, it is already marked.
    // What matters is that no comment can be attached to it.
    await refused(teacher, MARK, [autoResponse, 2, true, 'Nice.'],
      /already been marked|only a manually graded response/i);
    const row = await responseRow(autoResponse);
    assert(row.graded_at !== null, 'the automatic answer was not graded on submission');
    assert(row.grading_feedback === null,
      `an automatic answer carries feedback: ${JSON.stringify(row.grading_feedback)}`);
  });

  await test('marking without feedback still works', async () => {
    // A caller that has not been updated must not break: the argument defaults.
    await asActor(teacher, 'select public.mark_manual_assessment_response($1,$2,$3)',
      [manualResponse, 1, false]);
    const row = await responseRow(manualResponse);
    assert(Number(row.score) === 1 && row.is_correct === false);
    assert(row.grading_feedback === null, 'a mark with no comment invented one');
  });

  await test('feedback is written with the mark and cannot be changed afterwards', async () => {
    const second = (await q(
      `insert into public.assessment_attempts
         (assessment_id,learner_profile_id,course_enrolment_id,attempt_number)
       values ($1,$2,$3,2) returning id`, [assessment, learner.learnerId, enrolment])).rows[0].id;
    const response = (await q(
      `insert into public.assessment_responses(assessment_attempt_id,question_id,response_content)
       values ($1,$2,'"A second attempt."'::jsonb) returning id`, [second, manualQuestion])).rows[0].id;
    await asActor(learner.userId,
      'select status from public.submit_assessment_attempt($1)', [second]);

    await asActor(teacher, MARK, [response, 3, true, '  Clearer this time — cite the verse next time.  ']);
    const row = await responseRow(response);
    assert(row.grading_feedback === 'Clearer this time — cite the verse next time.',
      `feedback was not trimmed and stored as written: ${JSON.stringify(row.grading_feedback)}`);

    // The attempt is graded and immutable now, and the comment is protected two
    // ways over. A client has no update policy on responses at all, so the edit
    // matches no rows; a superuser, who bypasses RLS, is stopped by the lock
    // trigger that protects the learner's answers.
    const asClient = await asActor(teacher,
      'update public.assessment_responses set grading_feedback=$1 where id=$2 returning id',
      ['Retracted.', response]);
    assert(asClient.rows.length === 0,
      `a client updated a graded response (${asClient.rows.length} rows)`);

    await rejects(() => q(
      'update public.assessment_responses set grading_feedback=$1 where id=$2',
      ['Retracted.', response]), /immutable/i);

    assert((await responseRow(response)).grading_feedback === row.grading_feedback,
      'the teacher\'s comment was changed after the mark');

    await refused(teacher, MARK, [response, 0, false, 'Changed my mind.'],
      /already been marked/i);
  });

  await test('a blank comment is stored as no comment', async () => {
    const third = (await q(
      `insert into public.assessment_attempts
         (assessment_id,learner_profile_id,course_enrolment_id,attempt_number)
       values ($1,$2,$3,3) returning id`, [assessment, learner.learnerId, enrolment])).rows[0].id;
    const response = (await q(
      `insert into public.assessment_responses(assessment_attempt_id,question_id,response_content)
       values ($1,$2,'"Third."'::jsonb) returning id`, [third, manualQuestion])).rows[0].id;
    await asActor(learner.userId,
      'select status from public.submit_assessment_attempt($1)', [third]);
    await asActor(teacher, MARK, [response, 2, true, '   ']);
    assert((await responseRow(response)).grading_feedback === null);
  });

  await test('the audit records that a comment was given, not what it says', async () => {
    const events = (await q(
      `select detail from public.governance_audit_events
        where target_type='assessment_response' and action='assessment.manual_response_graded'
        order by occurred_at desc limit 3`)).rows;
    assert(events.length >= 2, 'marking was not audited');
    const withFeedback = events.find((e) => e.detail.has_feedback === true);
    assert(withFeedback, 'no audit event recorded that feedback was given');
    const flat = JSON.stringify(events.map((e) => e.detail));
    assert(!/Clearer this time/.test(flat), 'the feedback text was copied into the audit log');
  });

  await test('the learner can read their own feedback and nobody else can', async () => {
    const mine = await asActor(learner.userId,
      `select ar.id, ar.grading_feedback, aq.content->>'prompt' as prompt
         from public.assessment_responses ar
         join public.assessment_questions aq on aq.id=ar.question_id
        where ar.assessment_attempt_id in (
          select id from public.assessment_attempts where learner_profile_id=$1)
          and ar.grading_feedback is not null`, [learner.learnerId]);
    assert(mine.rows.length >= 1, 'the learner could not read the comment on their own work');

    const theirs = await asActor(other.userId,
      'select id, grading_feedback from public.assessment_responses where grading_feedback is not null');
    assert(theirs.rows.length === 0,
      `another learner read ${theirs.rows.length} marked answers that were not theirs`);
  });
}
