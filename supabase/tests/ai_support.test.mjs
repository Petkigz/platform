// The study assistant's boundary.
//
// `learning.ai_support` has always said the assistant "must refuse to issue
// rulings and refer to a teacher", which no prompt can promise. What can be
// promised is what this suite pins:
//
//   1. **Retrieval only.** An answer is a citation to a lesson the caller may open
//      right now. There is no model and no generated paragraph, and the response
//      says so in a field a screen can print.
//   2. **Ruling-shaped questions fail closed.** No best guess, no hedged answer, no
//      citation that happens to contain the word — "ask a teacher", and a support
//      case when the desk is open to take one.
//   3. **No citation, no answer.** A question no lesson matches gets "nothing
//      covers this" rather than a general-knowledge paragraph.
//   4. **A title is not an entitlement.** The catalogue shows a title to anybody;
//      the assistant must not, because a citation to a lesson you cannot open is a
//      teaser dressed as an answer.
//   5. **Everything is recorded**, and what was refused is countable — a boundary
//      nobody can audit is a claim, not a control.

export async function run(ctx) {
  const {
    q, test, assert, rejects, asUser, committed, asSuperuser,
    newUser, newProfile, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('ai-admin@example.com');
  const teacher = await newInstructor('ai-teacher@example.com', admin);
  const reviewer = await newReviewer('ai-reviewer@example.com', admin);

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'ai support test']);

  /** The code-gated flag cannot be flipped from the dashboard; a test may. */
  async function withFlags(flags, fn) {
    const before = (await q(
      `select key, value_text from public.platform_settings where key = any($1::text[])`,
      [flags])).rows;
    await q("select set_config('app.bypassing_code_flag','on',false)");
    await q(`update public.platform_settings set value_text = 'true' where key = any($1::text[])`,
      [flags]);
    try {
      return await fn();
    } finally {
      for (const row of before) {
        await q('update public.platform_settings set value_text = $2 where key = $1',
          [row.key, row.value_text]);
      }
      // Leave the session as it was found. A setting left 'on' would let a later
      // suite flip a CODE flag without noticing it had.
      await q("select set_config('app.bypassing_code_flag','',false)");
    }
  }

  /** A published course with two lessons: one about letters, one about prayer. */
  async function courseWithLessons() {
    const course = await newCourse(teacher, { status: 'active' });
    const slug = (await q('select slug from public.courses where id = $1', [course])).rows[0].slug;
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const letters = await newLesson(section, {
      title: 'Pronouncing the letters correctly', position: 1,
    });
    await q('update public.lessons set description = $2 where id = $1', [
      letters,
      'Makharij: where each Arabic letter is produced in the mouth and throat.',
    ]);
    const prayer = await newLesson(section, {
      title: 'The positions of the prayer', position: 2,
    });
    await q('update public.lessons set description = $2 where id = $1', [
      prayer,
      'Standing, bowing, prostrating and sitting, and what is said in each position.',
    ]);
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, slug, version, letters, prayer };
  }

  async function learnerOf(email, { version, course } = {}) {
    const userId = await newUser(email);
    await newProfile(userId, email);
    const learnerId = (await q(
      `insert into public.learner_profiles
         (display_name, learner_type, age_band, linked_user_id, status)
       values ($1,'adult','18+',$2,'active') returning id`, [email, userId])).rows[0].id;
    if (version) {
      await q(`insert into public.entitlement_grants
                 (learner_profile_id, scope_type, course_version_id, source_type, status)
               values ($1,'course_version',$2,'free','active')`, [learnerId, version]);
      await q(`insert into public.course_enrolments
                 (learner_profile_id, course_id, course_version_id, source, status)
               values ($1,$2,$3,'free','active')`, [learnerId, course, version]);
    }
    return { userId, learnerId };
  }

  /** As a real session, and committed: a question that rolls back is no question. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
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

  const ask = async (actor, question) => (await asActor(actor,
    'select public.ai_support_ask($1,$2) as r', [question, null])).rows[0].r;

  const readOwnQuestions = async (actor) => (await asActor(actor,
    'select asked_by from public.ai_support_questions')).rows;

  // -------------------------------------------------------------------------
  console.log('\nAct I — the flag, and what a closed assistant does');
  // -------------------------------------------------------------------------

  await test('the assistant ships off, and says so instead of failing', async () => {
    const flag = (await q(
      `select value_text from public.platform_settings where key = 'learning.ai_support'`)).rows[0];
    assert(flag.value_text === 'false', `the flag was seeded '${flag.value_text}'`);

    const L = await courseWithLessons();
    const learner = await learnerOf('ai-off@example.com', L);

    const answer = await ask(learner.userId, 'How do I pronounce the letter ha?');
    assert(answer.status === 'closed', `status ${answer.status}`);
    assert(/not switched on/.test(answer.message), answer.message);

    const rows = (await q(
      `select count(*)::int n from public.ai_support_questions where asked_by = $1`,
      [learner.userId])).rows[0].n;
    assert(rows === 0, 'a closed assistant recorded a question as though it had answered');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — a citation, or nothing');
  // -------------------------------------------------------------------------

  await withFlags(['learning.ai_support'], async () => {
    await test('a question is answered with a lesson the learner can open, and nothing else', async () => {
      const L = await courseWithLessons();
      const learner = await learnerOf('ai-answer@example.com', L);

      const answer = await ask(learner.userId, 'pronouncing the letters');
      assert(answer.status === 'answered', `${answer.status}: ${answer.message}`);
      assert(answer.citations.length >= 1, 'an answer with no citation');
      const first = answer.citations[0];
      assert(first.lessonTitle.length > 0);
      assert(first.courseSlug === L.slug, `cited ${first.courseSlug}, expected ${L.slug}`);
      assert(first.href.startsWith('/courses/'), first.href);

      // The boundary is on the response, so a screen cannot imply a model wrote
      // this without contradicting the payload it was given.
      assert(answer.boundary.retrievalOnly === true);
      assert(answer.boundary.model === null);
      assert(answer.boundary.generatedText === false);
      assert(!('answer' in answer) || answer.answer === undefined,
        'the response carries a generated answer field');

      const row = (await q(
        `select status, citation_count, matched_phrases from public.ai_support_questions
          where asked_by = $1 order by created_at desc limit 1`, [learner.userId])).rows[0];
      assert(row.status === 'answered');
      assert(row.citation_count >= 1);
      assert(Array.isArray(row.matched_phrases) && row.matched_phrases.length === 0);
    });

    await test('a lesson the learner is not enrolled in is not cited', async () => {
      const L = await courseWithLessons();
      // A learner with no entitlement at all: they may see the title in the
      // catalogue, and must not see it here.
      const outsider = await learnerOf('ai-outsider@example.com');

      const answer = await ask(outsider.userId, 'pronouncing the letters');
      assert(answer.status === 'no_match', `${answer.status}: ${answer.citations.length} citations`);
      assert(answer.citations.length === 0, 'a lesson the caller cannot open was cited');
      assert(/Nothing in your courses covers this/.test(answer.message), answer.message);
    });

    await test('a question nothing covers gets no answer at all', async () => {
      const L = await courseWithLessons();
      const learner = await learnerOf('ai-nomatch@example.com', L);

      const answer = await ask(learner.userId, 'zebras and the migration of swallows');
      assert(answer.status === 'no_match', answer.status);
      assert(answer.citations.length === 0);
      assert(/teacher/.test(answer.message), 'the dead end does not offer a way to a person');
    });

    // -----------------------------------------------------------------------
    console.log('\nAct III — a ruling-shaped question fails closed');
    // -----------------------------------------------------------------------

    await test('the phrases are matched as typed, case-insensitively', async () => {
      const isRuling = async (text) => (await q(
        'select public.ai_support_is_ruling($1) as r', [text])).rows[0].r;
      assert(await isRuling('Is it haram to skip the sunnah?') === true);
      assert(await isRuling('WHAT IS THE RULING on combining prayers') === true);
      assert(await isRuling('is this permissible for me') === true);
      assert(await isRuling('How do I pronounce the letter ha?') === false);
      assert(await isRuling('What does lesson four say about charity?') === false);
    });

    await test('and the answer is "ask a teacher", with a case when the desk is open', async () => {
      const L = await courseWithLessons();
      const learner = await learnerOf('ai-ruling@example.com', L);

      const answer = await withFlags(['platform.support'], async () =>
        ask(learner.userId, 'Is it haram to miss the sunnah prayer?'));

      assert(answer.status === 'refused_ruling', answer.status);
      assert(answer.citations.length === 0, 'a ruling question was answered with a citation');
      assert(answer.matchedPhrases.length > 0, 'the refusal does not say what it matched');
      assert(/question for a teacher/.test(answer.message), answer.message);

      // The question reaches a person rather than a sentence telling the learner
      // to go and find one.
      assert(answer.supportCaseId, 'no support case was opened');
      assert(/^SC-\d+$/.test(answer.supportCaseNumber), answer.supportCaseNumber);

      const row = (await q(
        `select status, support_case_id, matched_phrases from public.ai_support_questions
          where asked_by = $1 order by created_at desc limit 1`, [learner.userId])).rows[0];
      assert(row.status === 'refused_ruling');
      assert(row.support_case_id === answer.supportCaseId);
      assert(row.matched_phrases.includes('is it haram'));
    });

    await test('with the desk closed, the refusal says so rather than promising a reply', async () => {
      const L = await courseWithLessons();
      const learner = await learnerOf('ai-ruling-closed@example.com', L);

      const answer = await ask(learner.userId, 'What is the ruling on this?');
      assert(answer.status === 'refused_ruling');
      assert(answer.supportCaseId === null, 'a case was opened while the desk is closed');
      assert(/help desk is not taking cases/.test(answer.message), answer.message);
    });

    await test('a short question is refused before it is recorded', async () => {
      const L = await courseWithLessons();
      const learner = await learnerOf('ai-short@example.com', L);
      await rejects(() => ask(learner.userId, 'ha'), /ai_support:too_short/);
    });
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — what the owner reads');
  // -------------------------------------------------------------------------

  await test('only staff can read the summary, and it counts what the boundary did', async () => {
    const L = await courseWithLessons();
    const learner = await learnerOf('ai-summary@example.com', L);

    await rejects(
      () => asActor(learner.userId, 'select public.ai_support_summary(30)'),
      /only staff may read the assistant summary/);

    const summary = (await asActor(admin,
      'select public.ai_support_summary(30) as s')).rows[0].s;
    assert(typeof summary.asked === 'number');
    assert(summary.refused >= 2, `refusals counted: ${summary.refused}`);
    assert(summary.withCase >= 1, 'the cases opened by refusals are not counted');
    assert(Array.isArray(summary.topPhrases) && summary.topPhrases.length >= 1);
    // Recitation is a different feature and stays off until ASR is validated.
    assert(summary.recitation === false, 'recitation is on, and this migration never turned it on');
  });

  await test('a learner can read their own questions and nobody else\'s', async () => {
    const L = await courseWithLessons();
    const mine = await learnerOf('ai-mine@example.com', L);
    const theirs = await learnerOf('ai-theirs@example.com', L);

    await withFlags(['learning.ai_support'], async () => {
      await ask(mine.userId, 'the positions of the prayer');
    });

    const own = await readOwnQuestions(mine.userId);
    assert(own.length >= 1, 'the asker cannot read their own question');
    const other = await readOwnQuestions(theirs.userId);
    assert(other.length === 0, "a learner read somebody else's questions");
  });
}
