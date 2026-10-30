// Child engagement: a second key, held by the adults.
//
// Two flags claimed this feature and only one of them did anything.
// `learning.streaks` built the mechanics in full; `family.engagement` was read by
// no line of code and still said the mechanics were undesigned. The owner settled
// it on 2026-10-30: a child's engagement is a private streak and a shelf of
// badges, visible to the child and the adults in their family — no points, no
// leaderboards, nothing compared across children.
//
// So the two switches now mean different things, and the tests below are mostly
// about that difference, because getting it wrong is invisible: a page that
// forgot the second key still renders, and a flag that gates nothing still says
// it is on.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('ce-admin@example.com');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
    await q('set local role authenticated');
    try {
      const result = await q(sql, params);
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const flag = async (key) =>
    (await scalar(`select value_text, gate_type, preconditions, flag_group
                     from public.platform_settings where key = $1`, [key]));

  async function setFlag(key, on) {
    await q(`update public.platform_settings set value_text = $2 where key = $1`,
      [key, on ? 'true' : 'false']);
  }

  /** Run with both switches in a known state, then put them back. */
  async function withSwitches({ streaks, engagement }, fn) {
    const beforeStreaks = (await flag('learning.streaks')).value_text;
    const beforeEngagement = (await flag('family.engagement')).value_text;
    await setFlag('learning.streaks', streaks);
    await setFlag('family.engagement', engagement);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $2 where key = $1`,
        ['learning.streaks', beforeStreaks]);
      await q(`update public.platform_settings set value_text = $2 where key = $1`,
        ['family.engagement', beforeEngagement]);
    }
  }

  let seq = 0;
  async function person(label) {
    seq += 1;
    const id = await newUser(`ce-${seq}@example.com`);
    await newProfile(id, label);
    return id;
  }

  const engagement = (who, learnerId) =>
    asActor(who, 'select public.learner_engagement($1) e', [learnerId])
      .then((r) => r.rows[0].e);

  const record = (who, learnerId) =>
    asActor(who, 'select public.learner_progress_record($1) r', [learnerId])
      .then((r) => r.rows[0].r);

  // ---------------------------------------------------------------------------
  // The facts: an adult of their own, a family with one child, one lesson done
  // ---------------------------------------------------------------------------

  const guardianUserId = await person('The Guardian');
  const guardian = (await asActor(guardianUserId, 'select public.claim_own_learner_profile() p'))
    .rows[0].p.learnerProfileId;

  const familyId = (await q(
    `insert into public.families (name, created_by) values ('Engagement Family',$1)
     returning id`, [guardianUserId])).rows[0].id;

  await q(`insert into public.family_memberships
             (family_id, user_id, membership_type, status, joined_at, created_by)
           values ($1,$2,'guardian','active', now(), $2)`, [familyId, guardianUserId]);

  const child = (await q(
    `insert into public.learner_profiles (display_name, learner_type, age_band, family_id)
     values ('A Child','child','8-10',$1) returning id`, [familyId])).rows[0].id;

  const otherChild = (await q(
    `insert into public.learner_profiles (display_name, learner_type, age_band, family_id)
     values ('Another Child','child','11-13',$1) returning id`, [familyId])).rows[0].id;

  const strangerUserId = await person('A Stranger');

  const author = await person('The Author');
  const course = await newCourse(author, { title: 'Engagement Course' });
  const version = await newVersion(course, author);
  const section = await newSection(version);
  const first = await newLesson(section, { title: 'One', position: 1 });
  const second = await newLesson(section, { title: 'Two', position: 2 });

  async function learningDone(learnerId) {
    const enrolment = (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`,
      [learnerId, course, version])).rows[0].id;
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
             values ($1,$2,'completed',100, now(), now())`, [enrolment, first]);
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
             values ($1,$2,'completed',100, now(), now())`, [enrolment, second]);
    return enrolment;
  }

  await learningDone(child);
  await learningDone(guardian);

  // ---------------------------------------------------------------------------
  // The register
  // ---------------------------------------------------------------------------

  await test('family.engagement now says what it decides, and it still ships off', async () => {
    const row = await flag('family.engagement');
    assert(row.value_text === 'false', `ships as ${row.value_text}`);
    assert(row.gate_type === 'admin', `gated as ${row.gate_type}`);
    assert(/streak/i.test(row.preconditions), 'the precondition names a streak');
    assert(/leaderboard|compare/i.test(row.preconditions),
      'and says what is not allowed, which is the part a parent would ask about');
    assert(!/gamif: 0/.test(row.preconditions),
      'the old "mechanics undesigned" text is gone, because they are designed');
    assert(row.flag_group === 'Children and families', `grouped as ${row.flag_group}`);
  });

  await test('learning.streaks now says it is only half the decision for a child', async () => {
    const row = await flag('learning.streaks');
    assert(/family\.engagement/.test(row.preconditions),
      'the mechanics flag points at the children\'s switch, or an admin would never find it');
  });

  // ---------------------------------------------------------------------------
  // The gate
  // ---------------------------------------------------------------------------

  await test('a child gets no engagement while the children\'s switch is off', async () => {
    await withSwitches({ streaks: true, engagement: false }, async () => {
      await rejects(() => engagement(guardianUserId, child),
        /not enabled for children/i);
      await rejects(() => record(guardianUserId, child),
        /not enabled for children/i);
    });
  });

  await test('an adult learner is unaffected by the children\'s switch', async () => {
    await withSwitches({ streaks: true, engagement: false }, async () => {
      const mine = await engagement(guardianUserId, guardian);
      assert(mine.streakDays >= 1, `the adult's own streak came back as ${mine.streakDays}`);
      const full = await record(guardianUserId, guardian);
      assert(Array.isArray(full.studyDays), 'and so did their record');
    });
  });

  await test('with both switches on, a guardian sees the child\'s streak and record', async () => {
    await withSwitches({ streaks: true, engagement: true }, async () => {
      const strip = await engagement(guardianUserId, child);
      assert(strip.streakDays >= 1, `streak came back as ${strip.streakDays}`);
      assert(Array.isArray(strip.badges) && strip.badges.length >= 1,
        'and the badges the two lessons earned');

      const full = await record(guardianUserId, child);
      assert(full.learnerProfileId === child, 'the record is the child\'s');
      assert(Array.isArray(full.badges), 'and carries the shelf');
    });
  });

  await test('the mechanics switch alone still refuses everything, with the plain sentence', async () => {
    await withSwitches({ streaks: false, engagement: true }, async () => {
      // The children's switch on its own does nothing at all: there are no
      // mechanics to show. That is the whole reason the pair is ordered.
      await rejects(() => engagement(guardianUserId, child), /not enabled(?! for children)/i);
      await rejects(() => engagement(guardianUserId, guardian), /not enabled(?! for children)/i);
    });
  });

  await test('a stranger is refused for the access reason, not with news about the child', async () => {
    await withSwitches({ streaks: true, engagement: false }, async () => {
      await rejects(() => engagement(strangerUserId, child), /cannot read this learner/i);
      await rejects(() => record(strangerUserId, child), /cannot read this learner/i);
    });
  });

  await test('may_show_engagement() is internal — a signed-in user cannot probe a learner', async () => {
    await rejects(() => asActor(guardianUserId, 'select public.may_show_engagement($1)', [child]),
      /permission denied/i);
  });

  await test('a switch turned back off takes the display away again', async () => {
    await withSwitches({ streaks: true, engagement: true }, async () => {
      await engagement(guardianUserId, child);
    });
    await withSwitches({ streaks: true, engagement: false }, async () => {
      await rejects(() => engagement(guardianUserId, child), /not enabled for children/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Nothing compared, nothing counted against a child
  // ---------------------------------------------------------------------------

  await test('there is no ranking anywhere to compare two children with', async () => {
    const ranking = (await q(
      `select p.proname from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and (p.proname ~* 'leaderboard' or p.proname ~* 'ranking'
               or p.proname ~* 'highscore' or p.proname ~* 'points')`)).rows;
    assert(ranking.length === 0,
      `functions that could rank learners: ${ranking.map((r) => r.proname).join(', ')}`);
  });

  await test('no table puts a score on a learner', async () => {
    const columns = (await q(
      `select table_name, column_name from information_schema.columns
        where table_schema = 'public'
          and table_name in ('learner_profiles','lesson_progress','course_enrolments')
          and column_name ~* '(^score$|points|rank|xp|level)'`)).rows;
    assert(columns.length === 0,
      `score-like columns: ${columns.map((c) => `${c.table_name}.${c.column_name}`).join(', ')}`);
  });

  await test('one child\'s shelf is derived from their own work, never from the other\'s', async () => {
    await withSwitches({ streaks: true, engagement: true }, async () => {
      const mine = await engagement(guardianUserId, child);
      const theirs = await engagement(guardianUserId, otherChild);
      assert(theirs.learnerProfileId === otherChild, 'the second child is their own record');
      assert(theirs.streakDays === 0,
        `a child with no lessons has a streak of ${theirs.streakDays}`);
      assert(theirs.badges.length === 0, 'and no badges');
      assert(mine.badges.length >= 1,
        'so the first child\'s badges are theirs, not a family total');
    });
  });
}
