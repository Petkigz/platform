// Learner ratings and reviews.
//
// The rules worth pinning are the ones that decide whether the number on a
// course page means anything: who is allowed to have an opinion, which opinions
// are counted, and whether editing is a way round moderation.

export async function run(ctx) {
  const {
    q, test, assert, asUser, asAnon, committed,
    newUser, newProfile, grantRole, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('reviews-admin@example.com');
  const teacher = await newInstructor('reviews-teacher@example.com', admin);
  const reviewer = await newReviewer('reviews-reviewer@example.com', admin);

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'course reviews test']);

  /** A published, free course with one lesson, ready to be enrolled in. */
  async function publishedCourse(author = teacher) {
    const course = await newCourse(author, { status: 'active' });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);
    await transition(version, 'submitted', author);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version };
  }

  let seq = 0;
  /** An adult account with its own learner profile. */
  async function newLearner(name = 'Learner') {
    seq += 1;
    const userId = await newUser(`reviews-learner-${seq}@example.com`);
    await newProfile(userId, `${name} ${seq}`);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [`${name} ${seq}`, userId])).rows[0].id;
    return { userId, learnerId };
  }

  async function enrol(learnerId, course, version) {
    return committed(async () => (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`,
      [learnerId, course, version])).rows[0].id);
  }

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await q(sql, params); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  const write = (who, course, rating, body = null) =>
    asActor(who, 'select public.write_course_review($1,$2,$3) as id', [course, rating, body]);
  const moderate = (who, reviewId, state, note = null) =>
    asActor(who, 'select public.moderate_course_review($1,$2,$3)', [reviewId, state, note]);
  const remove = (who, reviewId) =>
    asActor(who, 'select public.remove_course_review($1) as ok', [reviewId]);
  const summary = async (course) =>
    (await q('select average_rating, review_count, rating_rows from public.course_review_summary($1)', [course])).rows[0];
  const reviewRow = async (id) =>
    (await q('select * from public.course_reviews where id=$1', [id])).rows[0];

  /** Expect a refusal, for the reason claimed, without poisoning the session. */
  async function refused(who, sql, params, pattern) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [who === null ? '' : JSON.stringify({ sub: who, role: 'authenticated' })]);
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

  const SQL_WRITE = 'select public.write_course_review($1,$2,$3) as id';

  const { course, version } = await publishedCourse();
  const learner = await newLearner('Reviewer');
  await enrol(learner.learnerId, course, version);

  // -------------------------------------------------------------------
  await test('reviews are off by default and refuse to be written', async () => {
    assert((await q("select value_text from public.platform_settings where key='learning.reviews'")).rows[0].value_text === 'false');
    await refused(learner.userId, SQL_WRITE, [course, 5, null], /not open yet/i);
    assert((await q('select count(*)::int n from public.course_reviews')).rows[0].n === 0);
  });

  await q("update public.platform_settings set value_text='true' where key='learning.reviews'");
  try {
    await test('a rating with no text is published immediately and counted', async () => {
      const id = (await write(learner.userId, course, 5)).rows[0].id;
      const row = await reviewRow(id);
      assert(row.visibility_state === 'visible', `state was ${row.visibility_state}`);
      assert(row.body === null);
      // The version actually studied is recorded next to the rating.
      assert(row.course_version_id === version && row.learner_profile_id === learner.learnerId);
      assert(row.written_by === learner.userId, 'the review was attributed to the wrong account');

      const s = await summary(course);
      assert(Number(s.average_rating) === 5 && Number(s.review_count) === 1);
      assert(JSON.stringify(s.rating_rows) === JSON.stringify({ 5: 1 }),
        `distribution was ${JSON.stringify(s.rating_rows)}`);
    });

    await test('a course with no reviews reports zero rather than nothing', async () => {
      const other = await publishedCourse();
      const s = await summary(other.course);
      assert(Number(s.average_rating) === 0 && Number(s.review_count) === 0);
      assert(JSON.stringify(s.rating_rows) === '{}',
        `distribution was ${JSON.stringify(s.rating_rows)}`);
    });

    await test('review text is held until a person publishes it', async () => {
      const second = await newLearner('Wordy');
      await enrol(second.learnerId, course, version);
      const id = (await write(second.userId, course, 2, 'The pacing was too fast for me.')).rows[0].id;
      const row = await reviewRow(id);
      assert(row.visibility_state === 'pending', `state was ${row.visibility_state}`);
      assert(row.moderated_by === null && row.moderated_at === null);

      // Held text is not in the number, and not on the public page.
      let s = await summary(course);
      assert(Number(s.review_count) === 1, 'a held review was counted');
      await asAnon(async () => {
        const visible = await q('select count(*)::int n from public.course_reviews where course_id=$1', [course]);
        assert(visible.rows[0].n === 1, `an anonymous visitor saw ${visible.rows[0].n} of 2 reviews`);
      });
      // The author can still see their own, so the page explains the delay.
      await asUser(second.userId, async () => {
        assert((await q('select count(*)::int n from public.course_reviews where id=$1', [id])).rows[0].n === 1);
      });

      await moderate(admin, id, 'visible', 'Reads as honest feedback.');
      assert((await reviewRow(id)).visibility_state === 'visible');
      s = await summary(course);
      assert(Number(s.review_count) === 2 && Number(s.average_rating) === 3.5,
        `summary was ${s.average_rating} from ${s.review_count}`);
      assert(JSON.stringify(s.rating_rows) === JSON.stringify({ 2: 1, 5: 1 }),
        `distribution was ${JSON.stringify(s.rating_rows)}`);
    });

    await test('withdrawing a review needs a reason and leaves the aggregate', async () => {
      const third = await newLearner('Withdrawn');
      await enrol(third.learnerId, course, version);
      const id = (await write(third.userId, course, 1, 'Not what I expected.')).rows[0].id;
      await moderate(admin, id, 'visible', null);
      assert(Number((await summary(course)).review_count) === 3);

      await refused(admin, 'select public.moderate_course_review($1,$2,$3)', [id, 'withdrawn', '  '],
        /written reason/i);
      await refused(admin, 'select public.moderate_course_review($1,$2,$3)', [id, 'hidden', 'No such state.'],
        /published or withdrawn/i);
      await refused(learner.userId, 'select public.moderate_course_review($1,$2,$3)', [id, 'visible', null],
        /only staff may moderate/i);

      await moderate(admin, id, 'withdrawn', 'Names another learner.');
      const row = await reviewRow(id);
      assert(row.visibility_state === 'withdrawn' && row.withdrawn_reason === 'Names another learner.');
      assert(Number((await summary(course)).review_count) === 2,
        'a withdrawn review was still counted');
      // The author can see why, rather than watching their review vanish.
      await asUser(third.userId, async () => {
        const mine = (await q('select withdrawn_reason from public.course_reviews where id=$1', [id])).rows[0];
        assert(mine && mine.withdrawn_reason === 'Names another learner.');
      });
      await asAnon(async () => {
        assert((await q('select count(*)::int n from public.course_reviews where id=$1', [id])).rows[0].n === 0,
          'a withdrawn review was still public');
      });
    });

    await test('only a learner enrolled in the course may review it', async () => {
      const passerby = await newLearner('Passerby');
      await refused(passerby.userId, SQL_WRITE, [course, 5, null],
        /only review a course you are enrolled in/i);

      // The author of the course is enrolled in nobody's opinion of it.
      const authorLearner = (await q(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ('Teacher','adult','18+',$1) returning id`, [teacher])).rows[0].id;
      await enrol(authorLearner, course, version);
      await refused(teacher, SQL_WRITE, [course, 5, 'My own course is excellent.'],
        /cannot review a course you wrote/i);

      await refused(learner.userId, SQL_WRITE, ['00000000-0000-0000-0000-000000000000', 5, null],
        /course not found/i);
    });

    await test('an account reviews as itself, never as a child in its family', async () => {
      // A parent whose only learner profile is a child has no voice of their own
      // here: children have no login (D2), and an adult's words behind a child's
      // enrolment is not what the aggregate claims to measure.
      const parent = await newUser('reviews-parent@example.com');
      await newProfile(parent, 'Parent');
      const familyId = await committed(async () => {
        const fam = (await q(
          `insert into public.families (name, created_by, status)
           values ('Review family',$1,'active') returning id`, [parent])).rows[0].id;
        await q(
          `insert into public.family_memberships
             (family_id, user_id, membership_type, status, joined_at, created_by)
           values ($1,$2,'owner','active',now(),$3)`, [fam, parent, parent]);
        const child = (await q(
          `insert into public.learner_profiles
             (display_name, learner_type, age_band, family_id, status)
           values ('Child','child','5-7',$1,'active') returning id`, [fam])).rows[0].id;
        await q(
          `insert into public.course_enrolments
             (learner_profile_id, course_id, course_version_id, source, status)
           values ($1,$2,$3,'free','active')`, [child, course, version]);
        return fam;
      });
      assert(familyId, 'the family fixture did not persist');

      await refused(parent, SQL_WRITE, [course, 5, 'My daughter loved it.'],
        /create your own learner profile/i);
    });

    await test('one review per learner, and editing text goes back through moderation', async () => {
      const id = (await write(learner.userId, course, 5)).rows[0].id;
      const again = (await write(learner.userId, course, 4)).rows[0].id;
      assert(id === again, 'a second review was created instead of updating the first');
      const row = await reviewRow(id);
      assert(row.rating === 4 && row.visibility_state === 'visible');

      // The edit adds words nobody has read, so it is held again — otherwise
      // updating is a way to publish an unmoderated sentence.
      await write(learner.userId, course, 4, 'Good, though the pacing is quick.');
      const held = await reviewRow(id);
      assert(held.visibility_state === 'pending', `state was ${held.visibility_state}`);
      assert(held.moderated_by === null && held.moderation_note === null);
      assert(Number((await summary(course)).review_count) === 1,
        'the edited review was still counted while held');
    });

    await test('a rating outside 1-5 is refused by name', async () => {
      await refused(learner.userId, SQL_WRITE, [course, 0, null], /between 1 and 5/i);
      await refused(learner.userId, SQL_WRITE, [course, 6, null], /between 1 and 5/i);
      await refused(learner.userId, SQL_WRITE, [course, 5, 'x'.repeat(2001)], /under 2000 characters/i);
    });

    await test('the author can remove their own review outright, and nobody else can', async () => {
      const mine = await newLearner('Remover');
      await enrol(mine.learnerId, course, version);
      const id = (await write(mine.userId, course, 3)).rows[0].id;

      await refused(learner.userId, 'select public.remove_course_review($1)', [id],
        /only remove your own review/i);
      await refused(admin, 'select public.remove_course_review($1)', [id],
        /only remove your own review/i);

      assert((await remove(mine.userId, id)).rows[0].ok === true);
      assert((await q('select count(*)::int n from public.course_reviews where id=$1', [id])).rows[0].n === 0);
      // The fact is audited; the words are not copied anywhere else.
      const detail = (await q(
        `select action, detail from public.governance_audit_events
          where target_type='course_review' and target_id=$1 order by occurred_at`, [id])).rows;
      assert(detail.some(d => d.action === 'course_review.removed'));
      assert(!JSON.stringify(detail).includes('Good, though'), 'removed text was copied into the audit log');
    });

    await test('nobody writes to the table directly', async () => {
      await refused(learner.userId,
        `insert into public.course_reviews
           (course_id, course_version_id, learner_profile_id, written_by, rating, visibility_state)
         values ($1,$2,$3,$4,5,'visible')`,
        [course, version, learner.learnerId, learner.userId], /permission denied/i);
      await refused(admin,
        `update public.course_reviews set visibility_state='visible'`, [], /permission denied/i);
    });

    await test('writing and moderating are audited', async () => {
      const fresh = await newLearner('Audited');
      await enrol(fresh.learnerId, course, version);
      const id = (await write(fresh.userId, course, 5, 'Clear and patient.')).rows[0].id;
      await moderate(admin, id, 'visible', 'Fine to publish.');
      await write(fresh.userId, course, 4, 'Clear, if a little long.');
      await moderate(admin, id, 'withdrawn', 'Superseded by the edit.');

      const actions = (await q(
        `select action from public.governance_audit_events
          where target_type='course_review' and target_id=$1 order by occurred_at`, [id]))
        .rows.map(x => x.action);
      assert(actions.join(',') === [
        'course_review.written',
        'course_review.published',
        'course_review.updated',
        'course_review.withdrawn',
      ].join(','), `actions were ${actions.join(',')}`);
    });

    await test('reviews never reach the publication workflow', async () => {
      // The recorded constraint: a satisfaction signal is not a scholarly
      // review. A five-star review must not satisfy anything a reviewer does.
      const before = (await q(
        'select count(*)::int n from public.content_review_decisions')).rows[0].n;
      const star = await newLearner('Fan');
      await enrol(star.learnerId, course, version);
      await write(star.userId, course, 5, 'Excellent.');
      const after = (await q(
        'select count(*)::int n from public.content_review_decisions')).rows[0].n;
      assert(before === after, 'writing a review created a scholarly review decision');

      // And a fresh draft still cannot be published on the strength of them:
      // the scholarly gate is untouched by anything a learner writes.
      const draft = await newVersion(course, teacher, { version_number: 2 });
      let caught = null;
      try {
        await q('select public.set_course_version_status($1,$2,$3,$4)',
          [draft, 'published', admin, 'The reviews are five stars']);
      } catch (e) { caught = e; }
      assert(caught, 'a draft version was published with no scholarly review');
      const state = (await q(
        'select version_status from public.course_versions where id=$1', [draft])).rows[0];
      assert(state.version_status !== 'published',
        `the draft reached ${state.version_status} on learner reviews alone`);
    });
  } finally {
    await q("update public.platform_settings set value_text='false' where key='learning.reviews'");
  }
}
