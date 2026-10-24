// A lesson can check you without grading you.
//
// The only way to find out whether an answer was right used to be a graded
// sitting: start an attempt, consume one of the limit, submit, be scored. This
// suite is about the other thing — a read-only check that writes nothing, reads
// the answer key, and returns only the verdict.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    committed, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson, newUser, newProfile,
  } = ctx;

  const admin = await bootstrapAdmin('practice-admin@example.com');
  const teacher = await newInstructor('practice-teacher@example.com', admin);
  const reviewer = await newReviewer('practice-reviewer@example.com', admin);

  const setVersion = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, 'practice check test']);

  async function adult(email, name) {
    const userId = await newUser(email);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [name, userId])).rows[0].id;
    return { userId, learnerId };
  }

  // -------------------------------------------------------------------------
  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lesson = await newLesson(section, { position: 1 });

  async function assessment(title, type) {
    return (await q(
      `insert into public.assessments
         (course_version_id, lesson_id, title, type, status, pass_threshold)
       values ($1, $2, $3, $4, 'active', $5) returning id`,
      [version, lesson, title, type, type === 'graded' ? 60 : null])).rows[0].id;
  }

  async function question(assessmentId, over) {
    return (await q(
      `insert into public.assessment_questions
         (assessment_id, type, content, answer_key, points, position, explanation, grading_method)
       values ($1, $2, $3, $4, 1, $5, $6, $7) returning id`,
      [assessmentId, over.type,
       JSON.stringify(over.content ?? { prompt: 'A question' }),
       JSON.stringify(over.key),
       over.position ?? 1,
       over.explanation ?? null,
       over.grading ?? 'automatic'])).rows[0].id;
  }

  const practice = await assessment('Practice as you read', 'practice');
  const single = await question(practice, {
    type: 'single_choice',
    key: 'b',
    content: { prompt: 'How many pillars?', choices: [{ id: 'a', text: 'Three' }, { id: 'b', text: 'Five' }] },
    explanation: 'Five, and the shahada is the first.',
  });
  const multi = await question(practice, {
    type: 'multiple_choice',
    key: ['prayer', 'zakat'],
    content: { prompt: 'Which are pillars?', choices: [{ id: 'prayer', text: 'Prayer' }, { id: 'zakat', text: 'Zakat' }] },
    position: 2,
  });
  const short = await question(practice, {
    type: 'short_answer',
    key: 'Iman',
    content: { prompt: 'Another word for faith' },
    position: 3,
  });
  const manual = await question(practice, {
    type: 'short_answer',
    key: 'anything',
    content: { prompt: 'Explain in your own words' },
    grading: 'manual',
    position: 4,
  });

  const graded = await assessment('The quiz', 'graded');
  const gradedQ = await question(graded, {
    type: 'single_choice',
    key: 'a',
    content: { prompt: 'Which is first?', choices: [{ id: 'a', text: 'Shahada' }] },
    explanation: 'The shahada comes first.',
  });

  // A second version that is never published, so its assessment stays a draft.
  // Publication freezes a version's subtree, which is also why this one cannot
  // be created after the publish below.
  const laterVersion = await newVersion(course, teacher, { version_number: 2 });
  const laterSection = await newSection(laterVersion);
  const laterLesson = await newLesson(laterSection, { position: 1 });
  const draftAssessment = (await q(
    `insert into public.assessments (course_version_id, lesson_id, title, type, status)
     select $1, $2, 'Not open yet', 'practice', 'draft' returning id`,
    [laterVersion, laterLesson])).rows[0].id;
  const draftQuestion = (await q(
    `insert into public.assessment_questions
       (assessment_id, type, content, answer_key, points, position)
     values ($1, 'true_false', '{"prompt":"A draft question"}'::jsonb, 'true'::jsonb, 1, 1)
     returning id`, [draftAssessment])).rows[0].id;

  // Publish, so the learner's enrolment is in a version that exists as a real
  // course rather than a draft fixture.
  await setVersion(version, 'submitted', teacher);
  await setVersion(version, 'approved', reviewer);
  await satisfyReview(version, reviewer, admin);
  await setVersion(version, 'published', admin);

  const learner = await adult('practice-learner@example.com', 'Practice Learner');
  await committed(() => q(
    `insert into public.course_enrolments
       (learner_profile_id, course_id, course_version_id, source, status)
     values ($1, $2, $3, 'free', 'active')`, [learner.learnerId, course, version]));

  const stranger = await adult('practice-stranger@example.com', 'Stranger');

  async function as(userId, sql, params) {
    let out;
    await ctx.asUser(userId, async () => { out = await q(sql, params); });
    return out;
  }

  const check = async (who, questionId, answer) => {
    const r = await as(who, 'select public.check_lesson_answer($1,$2) v',
      [questionId, JSON.stringify(answer)]);
    return r.rows[0].v;
  };

  // -------------------------------------------------------------------------
  console.log('\nWho may be checked');
  // -------------------------------------------------------------------------

  await test('a signed-out caller is told to sign in', async () => {
    await rejects(
      () => ctx.asAnon(() => q(`select public.check_lesson_answer($1,$2)`,
        [single, JSON.stringify('b')])),
      /sign in/);
  });

  await test('somebody who is not enrolled cannot check the lesson', async () => {
    await rejects(
      () => as(stranger.userId, 'select public.check_lesson_answer($1,$2)',
        [single, JSON.stringify('b')]),
      /not enrolled/);
  });

  await test('a question that does not exist says so', async () => {
    await rejects(
      () => as(learner.userId, 'select public.check_lesson_answer($1,$2)',
        ['00000000-0000-0000-0000-000000000000', JSON.stringify('b')]),
      /no such question/);
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat it answers');
  // -------------------------------------------------------------------------

  await test('a right answer is right, and the explanation comes with it', async () => {
    const result = await check(learner.userId, single, 'b');
    assert(result.correct === true, 'the right answer was marked wrong');
    assert(result.explanation === 'Five, and the shahada is the first.',
      'the explanation did not come back');
  });

  await test('a wrong answer is wrong, and practice still explains why', async () => {
    const result = await check(learner.userId, single, 'a');
    assert(result.correct === false, 'the wrong answer was marked right');
    assert(result.explanation === 'Five, and the shahada is the first.',
      'practice should explain a wrong answer too');
  });

  await test('multiple choice does not care what order it is ticked in', async () => {
    const a = await check(learner.userId, multi, ['prayer', 'zakat']);
    const b = await check(learner.userId, multi, ['zakat', 'prayer']);
    assert(a.correct === true && b.correct === true, 'order changed the verdict');
    const partial = await check(learner.userId, multi, ['prayer']);
    assert(partial.correct === false, 'half an answer was accepted');
  });

  await test('a short answer ignores the spaces around it', async () => {
    assert((await check(learner.userId, short, '  Iman ')).correct === true, 'trimming did not happen');
    assert((await check(learner.userId, short, 'iman')).correct === false, 'case was ignored');
  });

  await test('a graded question keeps its explanation until the answer is right', async () => {
    const wrong = await check(learner.userId, gradedQ, 'b');
    assert(wrong.correct === false && wrong.explanation === null,
      'a graded question leaked its explanation before the sitting');
    const right = await check(learner.userId, gradedQ, 'a');
    assert(right.correct === true && typeof right.explanation === 'string',
      'the explanation did not come back after a right answer');
  });

  await test('a question only a teacher marks is refused', async () => {
    await rejects(
      () => as(learner.userId, 'select public.check_lesson_answer($1,$2)',
        [manual, JSON.stringify('my words')]),
      /a teacher marks this question/);
  });

  await test('a draft assessment is not open', async () => {
    await rejects(
      () => as(learner.userId, 'select public.check_lesson_answer($1,$2)',
        [draftQuestion, JSON.stringify(true)]),
      /not open/);
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat it refuses to say');
  // -------------------------------------------------------------------------

  await test('the answer key never appears in the reply', async () => {
    const result = await check(learner.userId, single, 'a');
    const text = JSON.stringify(result);
    assert(text.includes('"correct":false'), 'the reply is not the shape asserted');
    assert(!text.includes('answer_key') && !text.includes('answerKey'),
      'the reply names the key');
    assert(!text.includes('"b"'), 'the correct choice is somewhere in a wrong answer');
  });

  await test('nothing is written: no attempt, no response, no score', async () => {
    const before = (await q(`select
        (select count(*) from public.assessment_attempts) as attempts,
        (select count(*) from public.assessment_responses) as responses`)).rows[0];

    await check(learner.userId, single, 'b');
    await check(learner.userId, multi, ['prayer']);
    await check(learner.userId, short, 'Iman');

    const after = (await q(`select
        (select count(*) from public.assessment_attempts) as attempts,
        (select count(*) from public.assessment_responses) as responses`)).rows[0];

    assert(Number(before.attempts) === Number(after.attempts), 'a check created an attempt');
    assert(Number(before.responses) === Number(after.responses), 'a check recorded a response');
  });
}
