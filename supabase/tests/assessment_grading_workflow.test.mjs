// End-to-end assessment flow: learner submits, automatic questions grade on the
// server, and the course author sees and marks only pending manual answers.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newUser, newProfile, newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('grading-flow-admin@example.com');
  const teacher = await newInstructor('grading-flow-teacher@example.com', admin);
  const stranger = await newInstructor('grading-flow-stranger@example.com', admin);
  const reviewer = await newReviewer('grading-flow-reviewer@example.com', admin);

  async function newAdult(email) {
    const userId = await newUser(email);
    await newProfile(userId, email);
    const learnerId = (await q(
      `insert into public.learner_profiles(display_name,learner_type,age_band,linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [email,userId])).rows[0].id;
    return { userId, learnerId };
  }

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const result = await q(sql, params);
      await q('commit');
      return result;
    } catch (error) {
      await q('rollback');
      throw error;
    }
  }

  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lesson = await newLesson(section);
  const assessment = (await q(
    `insert into public.assessments
       (course_version_id,lesson_id,title,type,pass_threshold,status)
     values ($1,$2,'Knowledge check','graded',50,'active') returning id`,
    [version,lesson])).rows[0].id;
  const autoQuestion = (await q(
    `insert into public.assessment_questions
       (assessment_id,type,content,answer_key,points,position,grading_method)
     values ($1,'single_choice','{"prompt":"Choose the correct answer","choices":[{"id":"yes","text":"Yes"},{"id":"no","text":"No"}]}',
             '"yes"'::jsonb,2,1,'automatic') returning id`, [assessment])).rows[0].id;
  const manualQuestion = (await q(
    `insert into public.assessment_questions
       (assessment_id,type,content,points,position,grading_method)
     values ($1,'short_answer','{"prompt":"Explain your reasoning"}',3,2,'manual') returning id`,
    [assessment])).rows[0].id;
  const automaticOnly = (await q(
    `insert into public.assessments
       (course_version_id,title,type,pass_threshold,status)
     values ($1,'Automatic check','graded',50,'active') returning id`, [version])).rows[0].id;
  const automaticOnlyQuestion = (await q(
    `insert into public.assessment_questions
       (assessment_id,type,content,answer_key,points,position,grading_method)
     values ($1,'single_choice','{"prompt":"Choose yes","choices":[{"id":"yes","text":"Yes"},{"id":"no","text":"No"}]}',
             '"yes"'::jsonb,2,1,'automatic') returning id`, [automaticOnly])).rows[0].id;

  await q('select id from public.set_course_version_status($1,$2,$3,$4)',
    [version,'submitted',teacher,'manual grading fixture']);
  await q('select id from public.set_course_version_status($1,$2,$3,$4)',
    [version,'approved',reviewer,'manual grading fixture']);
  await satisfyReview(version,reviewer,admin);
  await q('select id from public.set_course_version_status($1,$2,$3,$4)',
    [version,'published',admin,'manual grading fixture']);

  const learner = await newAdult('grading-flow-learner@example.com');
  const enrolment = (await q(
    `insert into public.course_enrolments(learner_profile_id,course_id,course_version_id,source)
     values ($1,$2,$3,'free') returning id`, [learner.learnerId,course,version])).rows[0].id;
  const attempt = (await q(
    `insert into public.assessment_attempts
       (assessment_id,learner_profile_id,course_enrolment_id,attempt_number)
     values ($1,$2,$3,1) returning id`, [assessment,learner.learnerId,enrolment])).rows[0].id;
  await q(`insert into public.assessment_responses(assessment_attempt_id,question_id,response_content)
           values ($1,$2,'"yes"'::jsonb),($1,$3,'"My reasoning"'::jsonb)`,
    [attempt,autoQuestion,manualQuestion]);
  const autoAttempt = (await q(
    `insert into public.assessment_attempts
       (assessment_id,learner_profile_id,course_enrolment_id,attempt_number)
     values ($1,$2,$3,1) returning id`, [automaticOnly,learner.learnerId,enrolment])).rows[0].id;
  await q(`insert into public.assessment_responses(assessment_attempt_id,question_id,response_content)
           values ($1,$2,'"yes"'::jsonb)`, [autoAttempt,automaticOnlyQuestion]);

  await test('automatic-only submissions are scored and finalized by the server', async () => {
    const submitted = await asActor(learner.userId,
      'select status,score_earned,score_possible,passed from public.submit_assessment_attempt($1)',
      [autoAttempt]);
    assert(submitted.rows[0].status==='graded','automatic attempt did not finalize');
    assert(Number(submitted.rows[0].score_earned)===2 && Number(submitted.rows[0].score_possible)===2
      && submitted.rows[0].passed===true,'automatic result was incorrect');
  });

  await test('only the learner who owns an attempt can submit it', async () => {
    await rejects(() => asActor(stranger,
      'select status from public.submit_assessment_attempt($1)',[attempt]),
      /cannot submit this learner/i);
    const submitted = await asActor(learner.userId,
      'select status,score_earned,score_possible,passed from public.submit_assessment_attempt($1)',[attempt]);
    assert(submitted.rows[0].status==='awaiting_manual_grading',
      'mixed attempt did not wait for its manual answer');
    const automatic = (await q(
      `select score,is_correct from public.assessment_responses
        where assessment_attempt_id=$1 and question_id=$2`,[attempt,autoQuestion])).rows[0];
    assert(Number(automatic.score)===2 && automatic.is_correct===true,
      'automatic answer was not graded on submission');
    assert(submitted.rows[0].score_earned===null && submitted.rows[0].score_possible===null,
      'a partial attempt was finalized before manual grading');
  });

  await test('only the course author can read pending manual answers, with no learner identity or answer key', async () => {
    const rows = await asActor(teacher,
      'select response_id,assessment_title,course_version_number,question_prompt,response_content,max_points from public.list_pending_manual_assessment_responses($1)',
      [course]);
    assert(rows.rows.length===1,'manual answer did not appear in the teacher queue');
    assert(rows.rows[0].question_prompt==='Explain your reasoning'
      && rows.rows[0].response_content==='My reasoning'
      && Number(rows.rows[0].max_points)===3,'queue returned incomplete or malformed marking data');
    await rejects(() => asActor(stranger,
      'select * from public.list_pending_manual_assessment_responses($1)',[course]),
      /only the course author/i);
    await rejects(() => asActor(learner.userId,
      'select * from public.list_pending_manual_assessment_responses($1)',[course]),
      /only the course author/i);
  });

  await test('the author marks the response and the attempt finalizes exactly once', async () => {
    const responseId = (await q(
      `select id from public.assessment_responses
        where assessment_attempt_id=$1 and question_id=$2`,[attempt,manualQuestion])).rows[0].id;
    const receipt = await asActor(teacher,
      'select public.mark_manual_assessment_response($1,$2,$3) as receipt',[responseId,2,true]);
    assert(!JSON.stringify(receipt.rows[0]).includes(learner.learnerId),
      'marking returned the learner profile identifier');
    const graded = (await q(
      `select status,score_earned,score_possible,passed
         from public.assessment_attempts where id=$1`,[attempt])).rows[0];
    assert(graded.status==='graded','attempt did not finalize after the last manual answer');
    assert(Number(graded.score_earned)===4 && Number(graded.score_possible)===5
      && graded.passed===true,'final score or pass verdict was incorrect');
    await rejects(() => asActor(teacher,
      'select public.mark_manual_assessment_response($1,$2,$3)',[responseId,2,true]),
      /already been marked|cannot be finalised/i);
    const audit = await q(
      `select detail from public.governance_audit_events
        where actor=$1 and action='assessment.manual_response_graded' and target_id=$2`,
      [teacher,responseId]);
    assert(audit.rows.length===1 && audit.rows[0].detail.is_correct===true,
      'manual grade was not audited');
  });

  await test('clients cannot call the low-level actor-argument grading functions', async () => {
    const privileges = (await q(
      `select has_function_privilege('authenticated','public.grade_response(uuid,uuid,numeric,boolean)','execute') as can_grade,
              has_function_privilege('authenticated','public.finalize_attempt_grading(uuid)','execute') as can_finalize,
              has_function_privilege('authenticated','public.submit_attempt(uuid)','execute') as can_submit`)).rows[0];
    assert(privileges.can_grade===false && privileges.can_finalize===false && privileges.can_submit===false,
      'a client can bypass the identity-checked grading workflow');
    await rejects(() => asActor(teacher,
      'select public.grade_response($1,$2,$3,$4)',[autoQuestion,admin,1,true]),
      /permission denied/i);
  });
}
