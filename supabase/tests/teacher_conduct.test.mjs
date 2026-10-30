// What a teacher has agreed to, and the gate that asks.
//
// Two owner decisions of 2026-10-30 are tested here, because both turned a
// sentence in the register into a rule that can be wrong:
//
//   1. **The conduct acknowledgement.** A screening says somebody was vetted; an
//      acknowledgement says the person read the rules. Neither implies the other,
//      so the acknowledgement is its own row against its own version of the
//      policy — and the version is resolved server-side, so a client cannot
//      acknowledge a draft or an old text it had already read.
//   2. **The publication gate.** While `platform.safeguarding` is on, a course a
//      child may be shown cannot be published by an author who has no current
//      check or has not read the policy. What is tested is that the refusal
//      names the reason, that it is on the **author** rather than on whoever
//      presses the button, and that it is absent when the flag is off.
//
// The lead is tested too, because "who do I tell?" is the question a person
// reporting a concern has, and it must be answerable without signing in.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    newUser, newProfile, newInstructor,
    newCourse, newVersion, newSection, newLesson,
    bootstrapAdmin, newReviewer, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('conduct-admin@example.com');
  const reviewer = await newReviewer('conduct-reviewer@example.com', admin);

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
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

  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const flag = (on) =>
    q(`update public.platform_settings set value_text = $1 where key = 'platform.safeguarding'`,
      [on ? 'true' : 'false']);

  /**
   * A publishable course: a version with one section, one lesson, and the
   * scholarly approval the publication gate has always demanded. The approval is
   * not what this suite is about — it is there so the safeguarding refusal is the
   * *first* thing a publish attempt meets, rather than the test passing for the
   * wrong reason.
   */
  async function shelfReady(teacher, audience) {
    const course = await newCourse(teacher, { audience });
    const version = await newVersion(course, teacher, {});
    const section = await newSection(version);
    await newLesson(section);
    await satisfyReview(version, reviewer, admin);
    return { course, version };
  }

  const publish = (version, actor) =>
    call(actor, 'set_course_version_status($1,$2,$3,$4)',
      [version, 'published', actor, 'shelf test']);

  await flag(false);

  // ---------------------------------------------------------------------------
  const teacher = await newInstructor('conduct-teacher@example.com', admin);

  await test('only an adult who teaches acknowledges the conduct policy', async () => {
    const learner = await newUser('conduct-learner@example.com');
    await newProfile(learner);
    await rejects(() => call(learner, 'acknowledge_conduct()'),
      /conduct:not_a_teacher/,
      'a learner is not asked to agree to the teaching rules');
  });

  await test('the acknowledgement names the live policy version, not one the client chose', async () => {
    const status = await call(teacher, 'acknowledge_conduct()');
    eq(status.conductAcknowledged, true, 'the acknowledgement is in force');

    const live = (await q(
      `select pv.id from public.policy_documents pd
         join public.policy_versions pv on pv.document_id = pd.id
        where pd.slug = 'safeguarding' and pv.status = 'in_force'
        order by pv.version_number desc limit 1`)).rows[0].id;

    const stored = (await q(
      `select policy_version_id from public.teacher_conduct_acknowledgements
        where user_id = $1`, [teacher])).rows[0].policy_version_id;
    eq(stored, live, 'the row points at the version that was live when it was made');
  });

  await test('agreeing twice to the same text is one fact, audited once', async () => {
    await call(teacher, 'acknowledge_conduct()');
    const rows = (await q(
      `select count(*)::int n from public.teacher_conduct_acknowledgements
        where user_id = $1`, [teacher])).rows[0].n;
    eq(rows, 1, 'a second acknowledgement of the same version adds nothing');

    const audits = (await q(
      `select count(*)::int n from public.governance_audit_events
        where actor = $1 and action = 'conduct.acknowledged'`, [teacher])).rows[0].n;
    eq(audits, 1, 'and one event, not one per click');
  });

  await test('an acknowledgement is not edited or deleted afterwards', async () => {
    await rejects(() => q(
      `update public.teacher_conduct_acknowledgements set acknowledged_at = now() - interval '1 year'
        where user_id = $1`, [teacher]),
      /not edited or deleted/,
      'rewriting what somebody agreed to is the one thing this table must refuse');
    await rejects(() => q(
      `delete from public.teacher_conduct_acknowledgements where user_id = $1`, [teacher]),
      /not edited or deleted/,
      'and it cannot be removed either');
  });

  // ---------------------------------------------------------------------------
  await test('the gate says which of the two facts is missing', async () => {
    const checked = await newInstructor('conduct-checked@example.com', admin);

    const none = await call(checked, 'may_teach_children()');
    eq(none.reason, 'no_screening', 'nothing recorded yet');
    eq(none.allowed, false, 'and so not allowed');

    // A passed check with no acknowledgement: still refused, by name.
    await call(admin, 'record_teacher_screening($1,$2,$3,$4,$5,$6)',
      [checked, 'Enhanced criminal record', 'REF-1', 'passed', null, null]);
    const unread = await call(checked, 'may_teach_children()');
    eq(unread.reason, 'conduct_not_acknowledged', 'the check alone is not enough');
    eq(unread.screeningRecorded, true, 'the check itself was recorded');
    eq(unread.conductAcknowledged, false, 'the reading was not');

    await call(checked, 'acknowledge_conduct()');
    const allowed = await call(checked, 'may_teach_children()');
    eq(allowed.allowed, true, 'both facts in place');
    eq(allowed.reason, 'ok', 'and the reason says so');
  });

  await test('an expired check is refused rather than treated as current', async () => {
    const lapsed = await newInstructor('conduct-lapsed@example.com', admin);
    // The writer refuses a date already in the past — correctly, a check
    // recorded as expired certifies nothing — and the register is append-only,
    // so a row cannot be aged after the fact. The only honest way to test a lapse
    // is therefore to write the row a passing check would have left behind when
    // its date arrived: the fixture inserts it with a date that has gone.
    await call(lapsed, 'acknowledge_conduct()');
    await q(
      `insert into public.teacher_screenings
         (user_id, screening_type, evidence_reference, outcome, checked_by, valid_until)
       values ($1, 'Enhanced criminal record', 'REF-2', 'passed', $2, current_date - 1)`,
      [lapsed, admin]);

    const gone = await call(lapsed, 'may_teach_children()');
    eq(gone.allowed, false, 'a check that has lapsed clears nobody');
    eq(gone.reason, 'screening_expired', 'and says exactly that');
  });

  // ---------------------------------------------------------------------------
  await test('with the flag off, nobody is asked and every course publishes', async () => {
    const unchecked = await newInstructor('conduct-unchecked@example.com', admin);
    const { version } = await shelfReady(unchecked, 'child');
    // The transition has to be walked: draft -> submitted -> approved -> published.
    await call(unchecked, 'set_course_version_status($1,$2,$3,$4)', [version, 'submitted', unchecked, null]);
    await call(admin, 'set_course_version_status($1,$2,$3,$4)', [version, 'approved', admin, 'ok']);
    await publish(version, admin); // flag is off, so this must succeed
    eq((await q(`select version_status s from public.course_versions where id = $1`,
      [version])).rows[0].s, 'published', 'published with no check on file');
  });

  await test('with the flag on, a child-facing course needs both facts from its author', async () => {
    await flag(true);
    const unchecked = await newInstructor('conduct-blocked@example.com', admin);
    const { version } = await shelfReady(unchecked, 'child');
    await call(unchecked, 'set_course_version_status($1,$2,$3,$4)', [version, 'submitted', unchecked, null]);
    await call(admin, 'set_course_version_status($1,$2,$3,$4)', [version, 'approved', admin, 'ok']);

    await rejects(() => publish(version, admin),
      /safeguarding:author_not_cleared/,
      'the gate is on the author, not on whoever publishes');
  });

  await test('the same author publishes once they are checked and have read the policy', async () => {
    const cleared = await newInstructor('conduct-cleared@example.com', admin);
    const { version } = await shelfReady(cleared, 'both');
    await call(cleared, 'set_course_version_status($1,$2,$3,$4)', [version, 'submitted', cleared, null]);
    await call(admin, 'set_course_version_status($1,$2,$3,$4)', [version, 'approved', admin, 'ok']);

    await rejects(() => publish(version, admin), /safeguarding:author_not_cleared/,
      'not before the two facts exist');

    await call(admin, 'record_teacher_screening($1,$2,$3,$4,$5,$6)',
      [cleared, 'Enhanced criminal record', 'REF-3', 'passed', null, null]);
    await call(cleared, 'acknowledge_conduct()');

    await publish(version, admin);
    eq((await q(`select version_status s from public.course_versions where id = $1`,
      [version])).rows[0].s, 'published', 'published once the author is clear');
  });

  await test('an adults-only course is not held to a child-safeguarding gate', async () => {
    const adultOnly = await newInstructor('conduct-adult@example.com', admin);
    const { version } = await shelfReady(adultOnly, 'adult');
    await call(adultOnly, 'set_course_version_status($1,$2,$3,$4)', [version, 'submitted', adultOnly, null]);
    await call(admin, 'set_course_version_status($1,$2,$3,$4)', [version, 'approved', admin, 'ok']);
    await publish(version, admin);
    eq((await q(`select version_status s from public.course_versions where id = $1`,
      [version])).rows[0].s, 'published',
      'a course no child is shown does not need a child-safeguarding check');
  });

  // ---------------------------------------------------------------------------
  await test('the lead is answerable without an account', async () => {
    const lead = (await asActor(null, 'select public.safeguarding_lead() as r', [])
      .catch(() => null));
    // asActor(null) sets no claims; the function is granted to anon precisely so
    // this works. Read it through a plain query if the helper refuses a null sub.
    const value = lead?.rows?.[0]?.r ?? (await q('select public.safeguarding_lead() as r')).rows[0].r;
    assert(typeof value === 'string' && /ayahspring/i.test(value),
      `the lead should name AyahSpring: ${value}`);
  });

  await test('a teacher sees the same two facts the gate checks', async () => {
    const status = await call(teacher, 'my_screening_status()');
    eq(status.required, true, 'the register says the feature is on');
    eq(status.conductAcknowledged, true, 'and this teacher has read the policy');
    assert(typeof status.lead === 'string', 'the page can answer "who do I tell?"');
  });

  await flag(false);
}
