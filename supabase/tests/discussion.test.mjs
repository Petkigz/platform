// Per-lesson discussion.
//
// The moderation rule was settled before building, and it is the thing these
// tests exist to protect: a post by the course author or by staff is visible
// immediately; anything a learner writes — question or peer answer — is held
// until a person approves it.
//
// A moderation model that trusts the client is not a moderation model, so the
// interesting assertions here are the ones where the caller asks for something
// they should not get and does not get it.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('ds-admin@example.com');
  const teacher = await newInstructor('ds-teacher@example.com', admin);
  const reviewer = await newReviewer('ds-reviewer@example.com', admin);

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'discussion test']);

  /** Turn the feature on. Off by default, as the flag register seeds it. */
  const enableDiscussion = () =>
    q(`update public.platform_settings set value_text = 'true'
        where key = 'learning.discussion'`);

  async function lesson({ sold = false } = {}) {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lessonRow = await newLesson(section);
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version, lesson: lessonRow, teacher };
  }

  /** A learner enrolled in the version, so they may read and post. */
  async function enrolledLearner(email, version, course) {
    const userId = await newUser(email);
    await newProfile(userId, email);
    const learnerId = (await q(
      `insert into public.learner_profiles
         (display_name, learner_type, age_band, linked_user_id, status)
       values ($1,'adult','18+',$2,'active') returning id`, [email, userId])).rows[0].id;
    await q(`insert into public.entitlement_grants
               (learner_profile_id, scope_type, course_version_id, source_type, status)
             values ($1,'course_version',$2,'free','active')`, [learnerId, version]);
    await q(`insert into public.course_enrolments
               (learner_profile_id, course_id, course_version_id, source, status)
             values ($1,$2,$3,'free','active')`, [learnerId, course, version]);
    return { userId, learnerId };
  }

  // -------------------------------------------------------------------
  // The flag gate
  // -------------------------------------------------------------------
  await test('posting is refused while learning.discussion is off', async () => {
    const L = await lesson();
    const learner = await enrolledLearner('ds-l1@example.com', L.version, L.course);

    const off = (await q(
      `select value_text from public.platform_settings where key='learning.discussion'`))
      .rows[0].value_text;
    assert(off === 'false', `the flag was seeded '${off}', expected false`);

    await asUser(learner.userId, async () => {
      await rejects(() => q(
        `insert into public.discussion_posts (lesson_id, author_user_id, body)
         values ($1,$2,'Is this obligatory?')`, [L.lesson, learner.userId]),
        'a post was accepted while the feature flag was off');
    });
  });

  await enableDiscussion();

  // -------------------------------------------------------------------
  // The moderation rule
  // -------------------------------------------------------------------
  await test('a learner’s post is held even when it asks to be visible', async () => {
    // The assertion that matters most. The trigger overwrites the supplied
    // state, because a moderation model that trusts the client is not one.
    const L = await lesson();
    const learner = await enrolledLearner('ds-l2@example.com', L.version, L.course);

    const row = (await q(
      `insert into public.discussion_posts
         (lesson_id, author_user_id, body, visibility_state)
       values ($1,$2,'Can I shorten this prayer?','visible')
       returning visibility_state, author_kind, moderated_by`,
      [L.lesson, learner.userId])).rows[0];

    assert(row.visibility_state === 'pending',
      `a learner's post is '${row.visibility_state}', expected pending`);
    assert(row.author_kind === 'learner', `author_kind is '${row.author_kind}'`);
    assert(row.moderated_by === null, 'a held post already has a moderator');
  });

  await test('the course author’s post is visible immediately', async () => {
    const L = await lesson();

    const row = await asUser(L.teacher, async () => (await q(
      `insert into public.discussion_posts (lesson_id, author_user_id, body)
       values ($1,$2,'A note from the teacher')
       returning visibility_state, author_kind`, [L.lesson, L.teacher])).rows[0]);

    assert(row.visibility_state === 'visible',
      `the teacher's post is '${row.visibility_state}', expected visible`);
    assert(row.author_kind === 'teacher', `author_kind is '${row.author_kind}'`);
  });

  await test('a learner’s post cannot become visible without a named moderator', async () => {
    // Enforced by dp_learner_needs_moderator, not by convention.
    const L = await lesson();
    const learner = await enrolledLearner('ds-l3@example.com', L.version, L.course);

    const postId = (await q(
      `insert into public.discussion_posts (lesson_id, author_user_id, body)
       values ($1,$2,'A question') returning id`, [L.lesson, learner.userId])).rows[0].id;

    await rejects(() => q(
      `update public.discussion_posts set visibility_state='visible' where id=$1`,
      [postId]),
      'a learner post was published with no moderator recorded');
  });

  await test('staff approving a post records who approved it', async () => {
    const L = await lesson();
    const learner = await enrolledLearner('ds-l4@example.com', L.version, L.course);

    const postId = (await q(
      `insert into public.discussion_posts (lesson_id, author_user_id, body)
       values ($1,$2,'A question worth publishing') returning id`,
      [L.lesson, learner.userId])).rows[0].id;

    // Committed rather than inside asUser: the audit row is written by the
    // same call, and asUser rolls back, so asserting it afterwards would be
    // asserting against a row that no longer exists. The privileged-actor
    // check inside moderate_discussion_post reads request.jwt.claims, which the
    // harness sets for the duration of the call.
    // The idiom the suite already uses (authorization.test.mjs): a JSON string
    // as a single parameter, then the role. Setting role authenticated matters
    // — the function is granted to authenticated, not to the superuser role a
    // fixture runs as.
    // is_local=true is scoped to a transaction, so begin is not optional —
    // without it the claims are never set and the actor looks anonymous.
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: admin, role: 'authenticated' })]);
    await q('set local role authenticated');

    const row = (await q(
      `select visibility_state, moderated_by, moderated_at is not null as stamped
         from public.moderate_discussion_post($1,'visible','Accurate and on topic')`,
      [postId])).rows[0];

    assert(row.visibility_state === 'visible', 'the post was not published');
    assert(row.moderated_by === admin, 'the moderator was not recorded');
    assert(row.stamped === true, 'moderated_at was not stamped');

    await q('commit');

    const audited = await count(
      `select 1 from public.governance_audit_events
        where target_type='discussion_post' and target_id=$1 and action='discussion.moderated'`,
      [postId]);
    assert(audited === 1, `${audited} audit event(s), expected 1`);
  });

  await test('a non-privileged user cannot moderate', async () => {
    const L = await lesson();
    const learner = await enrolledLearner('ds-l5@example.com', L.version, L.course);
    const other = await enrolledLearner('ds-l6@example.com', L.version, L.course);

    const postId = (await q(
      `insert into public.discussion_posts (lesson_id, author_user_id, body)
       values ($1,$2,'Peer answer') returning id`, [L.lesson, other.userId])).rows[0].id;

    await asUser(learner.userId, async () => {
      await rejects(() => q(
        `select id from public.moderate_discussion_post($1,'visible','looks fine')`,
        [postId]),
        'a learner approved another learner’s post');
    });
  });

  await test('withdrawing a post requires a written reason', async () => {
    const L = await lesson();
    const learner = await enrolledLearner('ds-l7@example.com', L.version, L.course);

    const postId = (await q(
      `insert into public.discussion_posts (lesson_id, author_user_id, body)
       values ($1,$2,'Something to withdraw') returning id`,
      [L.lesson, learner.userId])).rows[0].id;

    await asUser(admin, async () => {
      await rejects(() => q(
        `select id from public.moderate_discussion_post($1,'removed',null)`, [postId]),
        'a post was withdrawn with no reason recorded');
    });
  });

  // -------------------------------------------------------------------
  // Reach
  // -------------------------------------------------------------------
  await test('someone with no entitlement cannot read or post', async () => {
    const L = await lesson({ sold: true });
    const stranger = await newUser('ds-stranger@example.com');
    await newProfile(stranger, 'DS Stranger');
    await q(`insert into public.learner_profiles
               (display_name, learner_type, age_band, linked_user_id, status)
             values ($1,'adult','18+',$2,'active')`, ['DS Stranger', stranger]);

    // Seed a visible post as the teacher so there is something to leak.
    await asUser(L.teacher, async () => {
      await q(`insert into public.discussion_posts (lesson_id, author_user_id, body)
               values ($1,$2,'Answer visible to the enrolled')`, [L.lesson, L.teacher]);
    });

    await asUser(stranger, async () => {
      const visible = await count(
        'select 1 from public.discussion_posts where lesson_id=$1', [L.lesson]);
      assert(visible === 0,
        `an unentitled user read ${visible} discussion post(s)`);
    });

    await asUser(stranger, async () => {
      await rejects(() => q(
        `insert into public.discussion_posts (lesson_id, author_user_id, body)
         values ($1,$2,'Let me in')`, [L.lesson, stranger]),
        'an unentitled user posted in a lesson they cannot access');
    });
  });

  await test('a learner sees their own held post but not another’s', async () => {
    const L = await lesson();
    const mine = await enrolledLearner('ds-l8@example.com', L.version, L.course);
    const theirs = await enrolledLearner('ds-l9@example.com', L.version, L.course);

    await q(`insert into public.discussion_posts (lesson_id, author_user_id, body)
             values ($1,$2,'My held question')`, [L.lesson, mine.userId]);
    await q(`insert into public.discussion_posts (lesson_id, author_user_id, body)
             values ($1,$2,'Their held question')`, [L.lesson, theirs.userId]);

    await asUser(mine.userId, async () => {
      const bodies = (await q(
        'select body from public.discussion_posts where lesson_id=$1', [L.lesson]))
        .rows.map((r) => r.body);
      assert(bodies.includes('My held question'),
        'a learner could not see their own held post');
      assert(!bodies.includes('Their held question'),
        `a learner saw someone else's held post (${bodies.join(' | ')})`);
    });
  });

  await test('a reply cannot be grafted onto another lesson', async () => {
    const L = await lesson();
    const other = await lesson();
    const learner = await enrolledLearner('ds-l10@example.com', L.version, L.course);
    await enrolledLearner('ds-l11@example.com', other.version, other.course);

    const parent = (await q(
      `insert into public.discussion_posts (lesson_id, author_user_id, body)
       values ($1,$2,'A question') returning id`, [L.lesson, learner.userId])).rows[0].id;

    await asUser(learner.userId, async () => {
      await rejects(() => q(
        `insert into public.discussion_posts (lesson_id, parent_id, author_user_id, body)
         values ($1,$2,$3,'A reply from elsewhere')`, [other.lesson, parent, learner.userId]),
        'a reply was attached to a post on a different lesson');
    });
  });

  await test('a post cannot be edited once it has been approved', async () => {
    // Otherwise "held until reviewed" is defeated by editing after approval.
    const L = await lesson();
    const learner = await enrolledLearner('ds-l12@example.com', L.version, L.course);

    const postId = (await q(
      `insert into public.discussion_posts (lesson_id, author_user_id, body)
       values ($1,$2,'Reviewed wording') returning id`, [L.lesson, learner.userId])).rows[0].id;

    await asUser(admin, async () => {
      await q(`select id from public.moderate_discussion_post($1,'visible','approved')`, [postId]);
    });

    // Not rejects(): an RLS-blocked UPDATE matches zero rows and raises
    // nothing, so the statement "succeeds" while changing nothing. The real
    // assertion is that the wording is still the reviewed one.
    await asUser(learner.userId, async () => {
      await q(`update public.discussion_posts
                 set body='Completely different claim' where id=$1`, [postId]);
    });

    const body = (await q('select body from public.discussion_posts where id=$1', [postId]))
      .rows[0].body;
    assert(body === 'Reviewed wording',
      `an approved post was edited by its author; body is now '${body}'`);
  });

  await test('the author is always the session, never the supplied id', async () => {
    const L = await lesson();
    const learner = await enrolledLearner('ds-l13@example.com', L.version, L.course);
    const victim = await enrolledLearner('ds-l14@example.com', L.version, L.course);

    // Inside a session, because that is the only place this proves anything:
    // at superuser level there is no subject to attribute to.
    await asUser(learner.userId, async () => {
      const row = (await q(
        `insert into public.discussion_posts (lesson_id, author_user_id, body)
         values ($1,$2,'Written by me, attributed to you')
         returning author_user_id`, [L.lesson, victim.userId])).rows[0];

      assert(row.author_user_id === learner.userId,
        'a post was attributed to someone other than the session that wrote it');
    });
  });
}
