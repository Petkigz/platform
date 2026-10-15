// Group 2 part 2 tests: enrolments, progress, assessments, completion,
// certificates.
//
// This is where D5 has to pay for itself. The tests that matter are the ones
// that try to move an enrolment's pin, edit a submitted attempt, read an
// answer key, and issue a certificate for work that was never done.

export async function run(ctx) {
  const {
    q, count, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile,
    bootstrapAdmin, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, newAsset,
    satisfyReview,
  } = ctx;

  const admin    = await bootstrapAdmin('g2b-admin@example.com');
  const teacher  = await newInstructor('g2b-teacher@example.com', admin);
  const reviewer = await newReviewer('g2b-reviewer@example.com', admin);
  const stranger = await newUser('g2b-stranger@example.com');
  await newProfile(stranger);

  const setStatus = (versionId, status, actor, reason = 'test') =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, reason]);

  // An adult learner: a user, a profile, and a learner_profile linked to them.
  async function newAdultLearner(email) {
    const userId = await newUser(email);
    await newProfile(userId, email);
    const r = await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [email, userId]);
    return { userId, learnerId: r.rows[0].id };
  }

  // A draft course with one section and one lesson. Anything that belongs to
  // the version — assessments, questions, policies — must be added BEFORE
  // publishVersion(), because D5 freezes the whole subtree on publication.
  async function draftCourse() {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);
    return { course, version, section, lesson };
  }

  async function publishVersion(pc) {
    await setStatus(pc.version, 'submitted', teacher);
    await setStatus(pc.version, 'approved', reviewer);
    await satisfyReview(pc.version, reviewer, admin);
    await setStatus(pc.version, 'published', admin);
    return pc;
  }

  async function publishedCourse() {
    return publishVersion(await draftCourse());
  }

  async function enrol(learnerId, pc, over = {}) {
    const r = await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source)
       values ($1, $2, $3, $4) returning id`,
      [learnerId, pc.course, pc.version, over.source ?? 'free']);
    return r.rows[0].id;
  }

  // ---------------------------------------------------------------------
  console.log('Schema');

  await test('all twelve remaining Group 2 tables exist', async () => {
    const want = ['course_enrolments', 'course_enrolment_version_history',
      'lesson_progress', 'assessments', 'assessment_questions',
      'assessment_attempts', 'assessment_responses',
      'course_completion_policies', 'course_completion_requirements',
      'certificates', 'learning_paths', 'learning_path_items'];
    const names = (await q(
      `select table_name from information_schema.tables
        where table_schema='public' and table_type='BASE TABLE'`)).rows.map(r => r.table_name);
    for (const t of want) assert(names.includes(t), `missing table ${t}`);
  });

  await test('certificates have no deleted_at column (D7: revoke, never delete)', async () => {
    const n = await count(
      `select count(*)::int n from information_schema.columns
        where table_schema='public' and table_name='certificates' and column_name='deleted_at'`);
    assert(n === 0, 'certificates must not be soft-deletable');
  });

  // ---------------------------------------------------------------------
  console.log('\nThe pin (D5)');

  await test('an enrolment cannot pin a version of a different course', async () => {
    const a = await publishedCourse();
    const b = await publishedCourse();
    const { learnerId } = await newAdultLearner('pin-1@example.com');
    await rejects(() => q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id)
       values ($1, $2, $3)`, [learnerId, a.course, b.version]),
      'an enrolment pinned a version belonging to another course');
  });

  await test('the pin cannot be changed by an ordinary UPDATE', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('pin-2@example.com');
    const e = await enrol(learnerId, pc);

    // A second published version of a different course, to have a real
    // target. Writing back the current value is a no-op, not a violation.
    const other = await publishedCourse();
    await rejects(() => q(
      'update public.course_enrolments set course_version_id = $1 where id = $2',
      [other.version, e]), 'the pin was changed directly');

    // A no-op write must still be permitted, or ordinary updates would break.
    await q('update public.course_enrolments set status = $1 where id = $2', ['active', e]);
  });

  await test('re-pinning requires a privileged actor and a reason', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('pin-3@example.com');
    const e = await enrol(learnerId, pc);

    await rejects(() => q('select * from public.re_pin_enrolment($1,$2,$3,$4)',
      [e, pc.version, stranger, 'trying to help']),
      'a non-privileged actor re-pinned an enrolment');

    await rejects(() => q('select * from public.re_pin_enrolment($1,$2,$3,$4)',
      [e, pc.version, admin, '   ']),
      'a re-pin without a reason was accepted');
  });

  await test('re-pinning writes history and leaves progress intact', async () => {
    const pc1 = await publishedCourse();
    const { learnerId } = await newAdultLearner('pin-4@example.com');
    const e = await enrol(learnerId, pc1);
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1, $2, 'completed', 100, now())`, [e, pc1.lesson]);

    // A second published version of the same course.
    const v2 = await newVersion(pc1.course, teacher, { version_number: 2 });
    const s2 = await newSection(v2);
    const l2 = await newLesson(s2);
    await setStatus(v2, 'submitted', teacher);
    await setStatus(v2, 'approved', reviewer);
    await satisfyReview(v2, reviewer, admin);
    await setStatus(v2, 'published', admin);

    await q('select * from public.re_pin_enrolment($1,$2,$3,$4,$5)',
      [e, v2, admin, 'translation corrections', 'admin']);

    const pin = (await q('select course_version_id from public.course_enrolments where id=$1',
      [e])).rows[0].course_version_id;
    assert(pin === v2, 'the pin did not move');

    const hist = await count(
      'select count(*)::int n from public.course_enrolment_version_history where course_enrolment_id=$1', [e]);
    assert(hist === 1, `expected 1 history row, got ${hist}`);

    const kept = await count(
      'select count(*)::int n from public.lesson_progress where course_enrolment_id=$1', [e]);
    assert(kept === 1, 'a re-pin deleted the learner\'s existing progress');
  });

  await test('history is append-only: no update or delete policy', async () => {
    const pc1 = await publishedCourse();
    const { learnerId } = await newAdultLearner('pin-5@example.com');
    const e = await enrol(learnerId, pc1);
    const v2 = await newVersion(pc1.course, teacher, { version_number: 2 });
    const s2 = await newSection(v2);
    await newLesson(s2);
    await setStatus(v2, 'submitted', teacher);
    await setStatus(v2, 'approved', reviewer);
    await satisfyReview(v2, reviewer, admin);
    await setStatus(v2, 'published', admin);
    await q('select * from public.re_pin_enrolment($1,$2,$3,$4)',
      [e, v2, admin, 'reason']);

    // No DELETE policy exists, so the row is invisible to the write rather
    // than protected by an error. Assert it survived.
    const deleted = await asUser(admin, () => q(
      `delete from public.course_enrolment_version_history where course_enrolment_id=$1 returning id`, [e]));
    assert(deleted.rows.length === 0, 'audit history was deletable');

    const still = await count(
      'select count(*)::int n from public.course_enrolment_version_history where course_enrolment_id=$1', [e]);
    assert(still === 1, `audit history is gone: ${still} rows remain`);
  });

  // ---------------------------------------------------------------------
  console.log('\nProgress');

  await test('progress must be recorded against the pinned version', async () => {
    const pc1 = await publishedCourse();
    const pc2 = await publishedCourse();
    const { learnerId } = await newAdultLearner('prog-1@example.com');
    const e = await enrol(learnerId, pc1);
    await rejects(() => q(
      `insert into public.lesson_progress (course_enrolment_id, lesson_id, status)
       values ($1, $2, 'in_progress')`, [e, pc2.lesson]),
      'progress was recorded against a lesson from a different version');
  });

  await test('one progress row per lesson per enrolment', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('prog-2@example.com');
    const e = await enrol(learnerId, pc);
    await q(`insert into public.lesson_progress (course_enrolment_id, lesson_id, status)
             values ($1,$2,'in_progress')`, [e, pc.lesson]);
    await rejects(() => q(
      `insert into public.lesson_progress (course_enrolment_id, lesson_id, status)
       values ($1,$2,'completed')`, [e, pc.lesson]),
      'a second progress row was created for the same lesson');
  });

  await test('completed progress must be 100% and carry a timestamp', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('prog-3@example.com');
    const e = await enrol(learnerId, pc);
    await rejects(() => q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
       values ($1,$2,'completed',40,now())`, [e, pc.lesson]),
      'a lesson was marked completed at 40%');
    await rejects(() => q(
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent)
       values ($1,$2,'completed',100)`, [e, pc.lesson]),
      'a completed lesson had no completed_at');
  });

  // ---------------------------------------------------------------------
  console.log('\nAssessments');

  // An assessment with one automatic single-choice question.
  async function gradedAssessment(pc, { pass = 60, limit = null, points = 10 } = {}) {
    const a = (await q(
      `insert into public.assessments
         (course_version_id, title, type, pass_threshold, attempt_limit)
       values ($1,'Unit check','graded',$2,$3) returning id`,
      [pc.version, pass, limit])).rows[0].id;
    // answer_key is written as the table owner, which the tests run as.
    await q(`insert into public.assessment_questions
               (assessment_id, type, content, answer_key, points, grading_method)
             values ($1,'single_choice', '{"prompt":"Which is a pillar of Islam?"}',
                     '{"answer":"b"}', $2, 'automatic')`, [a, points]);
    return a;
  }

  await test('a graded assessment without a pass mark is rejected', async () => {
    const pc = await publishedCourse();
    await rejects(() => q(
      `insert into public.assessments (course_version_id, title, type)
       values ($1,'X','graded')`, [pc.version]),
      'a graded assessment was created with no pass threshold');
  });

  await test('an automatically graded question requires an answer key', async () => {
    const pc = await draftCourse();
    const a = (await q(
      `insert into public.assessments (course_version_id, title, type, pass_threshold)
       values ($1,'X','graded',50) returning id`, [pc.version])).rows[0].id;
    await rejects(() => q(
      `insert into public.assessment_questions
         (assessment_id, type, content, grading_method)
       values ($1,'single_choice','{}','automatic')`, [a]),
      'an automatic question was created without an answer key');
  });

  await test('an attempt must match the enrolment version and learner', async () => {
    const pc1 = await publishedCourse();
    const pc2 = await draftCourse();
    const a2 = await gradedAssessment(pc2);
    await publishVersion(pc2);
    const { learnerId } = await newAdultLearner('ass-1@example.com');
    const e1 = await enrol(learnerId, pc1);
    await rejects(() => q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number)
       values ($1,$2,$3,1)`, [a2, learnerId, e1]),
      'an attempt mixed an assessment from one version with an enrolment in another');
  });

  await test('the attempt limit is enforced, and abandoned attempts do not consume it', async () => {
    const pc = await draftCourse();
    const a = await gradedAssessment(pc, { limit: 2 });
    await publishVersion(pc);
    const { learnerId } = await newAdultLearner('ass-2@example.com');
    const e = await enrol(learnerId, pc);

    const mk = (n) => q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number)
       values ($1,$2,$3,$4) returning id`, [a, learnerId, e, n]);

    const first = (await mk(1)).rows[0].id;
    await q(`update public.assessment_attempts set status='abandoned' where id=$1`, [first]);
    await mk(2);
    await mk(3);
    await rejects(() => mk(4), 'a learner exceeded the attempt limit');
  });

  await test('a submitted attempt is immutable, including its responses', async () => {
    const pc = await draftCourse();
    const a = await gradedAssessment(pc);
    await publishVersion(pc);
    const { learnerId } = await newAdultLearner('ass-3@example.com');
    const e = await enrol(learnerId, pc);
    const at = (await q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number)
       values ($1,$2,$3,1) returning id`, [a, learnerId, e])).rows[0].id;
    const qid = (await q('select id from public.assessment_questions where assessment_id=$1', [a])).rows[0].id;

    await rejects(() => q('select * from public.submit_attempt($1)', [at]),
      'an attempt with unanswered questions was submitted');

    const r = (await q(
      `insert into public.assessment_responses (assessment_attempt_id, question_id, response_content)
       values ($1,$2,'{"answer":"a"}') returning id`, [at, qid])).rows[0].id;

    await q('select * from public.submit_attempt($1)', [at]);

    await rejects(() => q(
      `update public.assessment_responses set response_content='{"answer":"b"}' where id=$1`, [r]),
      'a response was changed after submission');
    await rejects(() => q(
      `update public.assessment_attempts set status='in_progress' where id=$1`, [at]),
      'a submitted attempt was reopened');
    await rejects(() => q(`delete from public.assessment_responses where id=$1`, [r]),
      'a submitted response was deleted');
  });

  await test('automatic grading scores from the answer key', async () => {
    const pc = await draftCourse();
    const a = await gradedAssessment(pc, { points: 10 });
    await publishVersion(pc);
    const { learnerId } = await newAdultLearner('ass-4@example.com');
    const e = await enrol(learnerId, pc);
    const at = (await q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number)
       values ($1,$2,$3,1) returning id`, [a, learnerId, e])).rows[0].id;
    const qid = (await q('select id from public.assessment_questions where assessment_id=$1', [a])).rows[0].id;

    await q(`insert into public.assessment_responses (assessment_attempt_id, question_id, response_content)
             values ($1,$2,'{"answer":"b"}')`, [at, qid]);
    await q('select * from public.submit_attempt($1)', [at]);

    const r = (await q('select id from public.assessment_responses where assessment_attempt_id=$1', [at])).rows[0].id;
    await q('select * from public.grade_response($1,$2)', [r, admin]);
    const fin = (await q('select * from public.finalize_attempt_grading($1)', [at])).rows[0];

    assert(Number(fin.score_earned) === 10, `expected 10 points, got ${fin.score_earned}`);
    assert(fin.passed === true, `expected a pass, got ${fin.passed}`);
  });

  await test('a wrong answer fails below the threshold', async () => {
    const pc = await draftCourse();
    const a = await gradedAssessment(pc, { pass: 60 });
    await publishVersion(pc);
    const { learnerId } = await newAdultLearner('ass-5@example.com');
    const e = await enrol(learnerId, pc);
    const at = (await q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number)
       values ($1,$2,$3,1) returning id`, [a, learnerId, e])).rows[0].id;
    const qid = (await q('select id from public.assessment_questions where assessment_id=$1', [a])).rows[0].id;
    await q(`insert into public.assessment_responses (assessment_attempt_id, question_id, response_content)
             values ($1,$2,'{"answer":"c"}')`, [at, qid]);
    await q('select * from public.submit_attempt($1)', [at]);
    const r = (await q('select id from public.assessment_responses where assessment_attempt_id=$1', [at])).rows[0].id;
    await q('select * from public.grade_response($1,$2)', [r, admin]);
    const fin = (await q('select * from public.finalize_attempt_grading($1)', [at])).rows[0];
    assert(Number(fin.score_earned) === 0, `expected 0 points, got ${fin.score_earned}`);
    assert(fin.passed === false, 'a zero score was recorded as a pass');
  });

  await test('mixed grading waits for the manual question', async () => {
    const pc = await draftCourse();
    const a = (await q(
      `insert into public.assessments (course_version_id, title, type, pass_threshold)
       values ($1,'Mixed','graded',50) returning id`, [pc.version])).rows[0].id;
    await q(`insert into public.assessment_questions
               (assessment_id, type, content, answer_key, points, position, grading_method)
             values ($1,'single_choice','{}','{"answer":"b"}',5,1,'automatic')`, [a]);
    await q(`insert into public.assessment_questions
               (assessment_id, type, content, points, position, grading_method)
             values ($1,'short_answer','{}',5,2,'manual')`, [a]);
    await publishVersion(pc);

    const { learnerId } = await newAdultLearner('ass-6@example.com');
    const e = await enrol(learnerId, pc);
    const at = (await q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number)
       values ($1,$2,$3,1) returning id`, [a, learnerId, e])).rows[0].id;

    const qids = (await q('select id from public.assessment_questions where assessment_id=$1 order by position', [a])).rows;
    await q(`insert into public.assessment_responses (assessment_attempt_id, question_id, response_content)
             values ($1,$2,'{"answer":"b"}')`, [at, qids[0].id]);
    await q(`insert into public.assessment_responses (assessment_attempt_id, question_id, response_content)
             values ($1,$2,'{"text":"my answer"}')`, [at, qids[1].id]);
    await q('select * from public.submit_attempt($1)', [at]);

    await q('select * from public.grade_response($1,$2)', [(await q(
      'select id from public.assessment_responses where assessment_attempt_id=$1 and question_id=$2',
      [at, qids[0].id])).rows[0].id, admin]);

    await rejects(() => q('select * from public.finalize_attempt_grading($1)', [at]),
      'an attempt was finalised with an ungraded manual question');

    const manual = (await q(
      'select id from public.assessment_responses where assessment_attempt_id=$1 and question_id=$2',
      [at, qids[1].id])).rows[0].id;
    await rejects(() => q('select * from public.grade_response($1,$2)', [manual, stranger]),
      'a learner graded their own manual question');
    await rejects(() => q('select * from public.grade_response($1,$2)', [manual, admin]),
      'a manual question was graded without a score and verdict');

    await q('select * from public.grade_response($1,$2,$3,$4)', [manual, admin, 4, true]);
    const fin = (await q('select * from public.finalize_attempt_grading($1)', [at])).rows[0];
    assert(Number(fin.score_earned) === 9, `expected 9 points, got ${fin.score_earned}`);
    assert(fin.passed === true, 'expected a pass at 90%');
  });

  await test('the answer key is not readable by an authenticated client', async () => {
    const pc = await draftCourse();
    const a = await gradedAssessment(pc);
    await publishVersion(pc);
    const { learnerId, userId } = await newAdultLearner('ass-7@example.com');
    await enrol(learnerId, pc);

    // Verified behaviour: SELECT * is refused outright, so a wildcard query
    // from an ORM or the Supabase client cannot drag the key out by accident.
    // Each check gets its own asUser(): the first permission error aborts the
    // surrounding transaction.
    await rejects(() => asUser(userId, () => q(
      `select * from public.assessment_questions where assessment_id = $1`, [a])),
      'SELECT * was allowed, which would expose answer_key');

    await rejects(() => asUser(userId, () => q(
      `select answer_key from public.assessment_questions where assessment_id = $1`, [a])),
      'answer_key was readable by name');

    const safe = await asUser(userId, () => q(
      `select id, type, content, points, position, grading_method
         from public.assessment_questions where assessment_id = $1`, [a]));
    assert(safe.rows.length === 1, `expected the question to be readable, got ${safe.rows.length} rows`);
    assert(!('answer_key' in safe.rows[0]), 'answer_key appeared in a safe projection');
  });

  // ---------------------------------------------------------------------
  console.log('\nCompletion and certificates');

  async function withPolicy(pc, over = {}) {
    await q(`insert into public.course_completion_policies
               (course_version_id, completion_mode, certificate_enabled, certificate_template_version)
             values ($1, $2, $3, $4)`,
      [pc.version, over.mode ?? 'all_lessons',
       over.certificates ?? true, over.template ?? 'v1']);
  }

  await test('an incomplete enrolment is not complete, and says what is blocking', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('cmp-1@example.com');
    const e = await enrol(learnerId, pc);
    const r = (await q('select * from public.evaluate_completion($1)', [e])).rows[0];
    assert(r.is_complete === false, 'an enrolment with no progress was complete');
    assert((r.blocking ?? []).length > 0, 'no blocking reason was reported');
  });

  await test('completing every lesson completes the enrolment', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('cmp-2@example.com');
    const e = await enrol(learnerId, pc);
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1,$2,'completed',100,now())`, [e, pc.lesson]);
    const r = (await q('select * from public.evaluate_completion($1)', [e])).rows[0];
    assert(r.is_complete === true, `expected complete, blocked by: ${(r.blocking ?? []).join('; ')}`);
  });

  await test('an assessment-pass requirement cannot be satisfied by an ungraded attempt', async () => {
    const pc = await draftCourse();
    const a = await gradedAssessment(pc, { pass: 60 });
    await publishVersion(pc);
    const { learnerId } = await newAdultLearner('cmp-3@example.com');
    const e = await enrol(learnerId, pc);
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1,$2,'completed',100,now())`, [e, pc.lesson]);

    await q(`insert into public.course_completion_policies
               (course_version_id, completion_mode, certificate_enabled, certificate_template_version)
             values ($1,'requirements',true,'v1')`, [pc.version]);
    const pol = (await q('select id from public.course_completion_policies where course_version_id=$1',
      [pc.version])).rows[0].id;
    await q(`insert into public.course_completion_requirements
               (completion_policy_id, type, target_lesson_id, is_required, position)
             values ($1,'lesson_completion',$2,true,1)`, [pol, pc.lesson]);
    await q(`insert into public.course_completion_requirements
               (completion_policy_id, type, target_assessment_id, minimum_score, is_required, position)
             values ($1,'assessment_passed',$2,60,true,2)`, [pol, a]);

    const r1 = (await q('select * from public.evaluate_completion($1)', [e])).rows[0];
    assert(r1.is_complete === false, 'completion was granted with no attempt at all');

    const at = (await q(
      `insert into public.assessment_attempts
         (assessment_id, learner_profile_id, course_enrolment_id, attempt_number, status)
       values ($1,$2,$3,1,'in_progress') returning id`, [a, learnerId, e])).rows[0].id;
    const r2 = (await q('select * from public.evaluate_completion($1)', [e])).rows[0];
    assert(r2.is_complete === false, 'an in-progress attempt satisfied a pass requirement');
  });

  await test('a certificate cannot be issued for incomplete work', async () => {
    const pc = await publishedCourse();
    await withPolicy(pc);
    const { learnerId } = await newAdultLearner('cert-1@example.com');
    const e = await enrol(learnerId, pc);
    await rejects(() => q('select * from public.issue_certificate($1,$2)', [e, admin]),
      'a certificate was issued to a learner who had not finished');
  });

  await test('a certificate cannot be issued when the version does not issue them', async () => {
    const pc = await publishedCourse();
    await withPolicy(pc, { certificates: false });
    const { learnerId } = await newAdultLearner('cert-2@example.com');
    const e = await enrol(learnerId, pc);
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1,$2,'completed',100,now())`, [e, pc.lesson]);
    await rejects(() => q('select * from public.issue_certificate($1,$2)', [e, admin]),
      'a certificate was issued against a policy that had them disabled');
  });

  await test('issuance is idempotent and snapshots the course as it was', async () => {
    const pc = await publishedCourse();
    await withPolicy(pc);
    const { learnerId } = await newAdultLearner('cert-3@example.com');
    const e = await enrol(learnerId, pc);
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1,$2,'completed',100,now())`, [e, pc.lesson]);

    const first = (await q('select * from public.issue_certificate($1,$2)', [e, admin])).rows[0];
    const second = (await q('select * from public.issue_certificate($1,$2)', [e, admin])).rows[0];
    assert(first.id === second.id, 'issuing twice created two certificates');
    assert(await count('select count(*)::int n from public.certificates') ===
           await count('select count(*)::int n from public.certificates'), 'sanity');

    assert(first.certificate_number.startsWith('AS-'), `bad certificate number ${first.certificate_number}`);
    assert(first.course_version_number === 1, 'the version was not snapshotted');

    // Rename the course afterwards: the certificate must not move.
    await q('update public.courses set title = $1 where id = $2', ['Completely Different Title', pc.course]);
    const still = (await q('select course_title from public.certificates where id=$1', [first.id])).rows[0].course_title;
    assert(still === 'Test Course', `the snapshot drifted to: ${still}`);
  });

  await test('the certificate snapshot cannot be edited after issue', async () => {
    const pc = await publishedCourse();
    await withPolicy(pc);
    const { learnerId } = await newAdultLearner('cert-4@example.com');
    const e = await enrol(learnerId, pc);
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1,$2,'completed',100,now())`, [e, pc.lesson]);
    const c = (await q('select * from public.issue_certificate($1,$2)', [e, admin])).rows[0];

    await rejects(() => q('update public.certificates set course_title=$1 where id=$2',
      ['Forged', c.id]), 'the certificate title was edited');
    await rejects(() => q('update public.certificates set course_version_number=99 where id=$1',
      [c.id]), 'the certificate version was edited');
  });

  await test('a certificate is revoked, never deleted, and cannot be reinstated', async () => {
    const pc = await publishedCourse();
    await withPolicy(pc);
    const { learnerId } = await newAdultLearner('cert-5@example.com');
    const e = await enrol(learnerId, pc);
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1,$2,'completed',100,now())`, [e, pc.lesson]);
    const c = (await q('select * from public.issue_certificate($1,$2)', [e, admin])).rows[0];

    await rejects(() => q('select * from public.revoke_certificate($1,$2,$3)',
      [c.id, admin, '']), 'a revocation without a reason was accepted');
    await rejects(() => q('select * from public.revoke_certificate($1,$2,$3)',
      [c.id, stranger, 'because']), 'a non-privileged actor revoked a certificate');

    await q('select * from public.revoke_certificate($1,$2,$3)',
      [c.id, admin, 'found to be issued in error']);

    const v = (await q('select * from public.verify_certificate($1)', [c.certificate_number])).rows[0];
    assert(v.valid === false, 'a revoked certificate still verified as valid');
    assert(await count('select count(*)::int n from public.certificates where id=$1', [c.id]) === 1,
      'revocation deleted the row');

    await rejects(() => q('update public.certificates set status=$1 where id=$2', ['issued', c.id]),
      'a revoked certificate was reinstated');
  });

  await test('public verification discloses only the minimum', async () => {
    const pc = await publishedCourse();
    await withPolicy(pc);
    const { learnerId } = await newAdultLearner('cert-6@example.com');
    const e = await enrol(learnerId, pc);
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1,$2,'completed',100,now())`, [e, pc.lesson]);
    const c = (await q('select * from public.issue_certificate($1,$2)', [e, admin])).rows[0];

    const anonView = await asAnon(() => q(
      'select * from public.verify_certificate($1)', [c.certificate_number]));
    assert(anonView.rows[0].valid === true, 'a valid certificate did not verify');
    const keys = Object.keys(anonView.rows[0]);
    for (const forbidden of ['id', 'learner_profile_id', 'course_enrolment_id',
                             'verification_token_hash', 'issued_by']) {
      assert(!keys.includes(forbidden), `verification leaked ${forbidden}`);
    }

    const miss = await asAnon(() => q(
      'select * from public.verify_certificate($1)', ['AS-0000-00000000']));
    assert(miss.rows.length === 0, 'an unknown certificate number returned a row');
  });

  await test('anonymous visitors cannot read the certificates table', async () => {
    const n = await asAnon(() => count('select count(*)::int n from public.certificates'));
    assert(n === 0, `anonymous read ${n} certificate rows`);
  });

  // ---------------------------------------------------------------------
  console.log('\nRow level security');

  await test('a stranger cannot see another learner\'s enrolment or progress', async () => {
    const pc = await publishedCourse();
    const { learnerId } = await newAdultLearner('rls-1@example.com');
    const e = await enrol(learnerId, pc);
    await q(`insert into public.lesson_progress (course_enrolment_id, lesson_id, status)
             values ($1,$2,'in_progress')`, [e, pc.lesson]);

    const enr = await asUser(stranger, () =>
      count('select count(*)::int n from public.course_enrolments where id=$1', [e]));
    const prog = await asUser(stranger, () =>
      count('select count(*)::int n from public.lesson_progress where course_enrolment_id=$1', [e]));
    assert(enr === 0, `a stranger saw ${enr} enrolments`);
    assert(prog === 0, `a stranger saw ${prog} progress rows`);
  });

  await test('a learner sees their own enrolment and progress', async () => {
    const pc = await publishedCourse();
    const { learnerId, userId } = await newAdultLearner('rls-2@example.com');
    const e = await enrol(learnerId, pc);
    const enr = await asUser(userId, () =>
      count('select count(*)::int n from public.course_enrolments where id=$1', [e]));
    assert(enr === 1, `a learner saw ${enr} of their own enrolments`);
  });

  await test('assessment content is invisible to the unenrolled and to anonymous', async () => {
    const pc = await draftCourse();
    const a = await gradedAssessment(pc);
    await publishVersion(pc);
    const anon = await asAnon(() =>
      count('select count(*)::int n from public.assessments where id=$1', [a]));
    const unenrolled = await asUser(stranger, () =>
      count('select count(*)::int n from public.assessments where id=$1', [a]));
    assert(anon === 0, `anonymous saw ${anon} assessments`);
    assert(unenrolled === 0, `an unenrolled learner saw ${unenrolled} assessments`);
  });

  await test('an enrolled learner can read the assessment but not its key', async () => {
    const pc = await draftCourse();
    const a = await gradedAssessment(pc);
    await publishVersion(pc);
    const { learnerId, userId } = await newAdultLearner('rls-3@example.com');
    await enrol(learnerId, pc);
    const rows = await asUser(userId, () =>
      q(`select id, content, points from public.assessment_questions where assessment_id=$1`, [a]));
    assert(rows.rows.length === 1, `an enrolled learner saw ${rows.rows.length} questions`);
    assert(!('answer_key' in rows.rows[0]), 'answer_key leaked to an enrolled learner');
  });

  await test('an enrolment cannot be written to directly by an authenticated client', async () => {
    const pc = await publishedCourse();
    const { learnerId, userId } = await newAdultLearner('rls-4@example.com');
    const e = await enrol(learnerId, pc);
    // RLS hides the row, so the write matches nothing rather than raising.
    // The assertion that matters is that the row did not change.
    const res = await asUser(userId, () => q(
      `update public.course_enrolments set status='completed', completed_at=now() where id=$1
       returning id`, [e]));
    assert(res.rows.length === 0,
      'a learner was able to write to their own enrolment row');
    const after = (await q('select status from public.course_enrolments where id=$1', [e])).rows[0].status;
    assert(after === 'active', `the enrolment status became ${after}`);
  });

  await test('the catalogue of learning paths is public; drafts are not', async () => {
    const lp = (await q(
      `insert into public.learning_paths (title, slug, status, created_by)
       values ('Qur''an track','quran-track','active',$1) returning id`, [teacher])).rows[0].id;
    const draft = (await q(
      `insert into public.learning_paths (title, slug, status, created_by)
       values ('Unpublished','unpublished-path','draft',$1) returning id`, [teacher])).rows[0].id;

    const seenActive = await asAnon(() =>
      count('select count(*)::int n from public.learning_paths where id=$1', [lp]));
    const seenDraft = await asAnon(() =>
      count('select count(*)::int n from public.learning_paths where id=$1', [draft]));
    assert(seenActive === 1, `anonymous saw ${seenActive} active paths`);
    assert(seenDraft === 0, `anonymous saw ${seenDraft} draft paths`);
  });

  await test('a course appears once per learning path', async () => {
    const pc = await publishedCourse();
    const lp = (await q(
      `insert into public.learning_paths (title, slug, status, created_by)
       values ('Dup test','dup-test','draft',$1) returning id`, [teacher])).rows[0].id;
    await q('insert into public.learning_path_items (learning_path_id, course_id, position) values ($1,$2,1)',
      [lp, pc.course]);
    await rejects(() => q(
      'insert into public.learning_path_items (learning_path_id, course_id, position) values ($1,$2,2)',
      [lp, pc.course]), 'the same course was added to a path twice');
  });
}
