// The switch that decides whether a course ends with a certificate.
//
// Found while walking the first day end to end: the certificate machinery was
// complete and nothing could produce one, because `course_completion_policies`
// had a read policy, an insert policy, **no update policy**, and no screen. The
// only writer in the product was a human in the SQL editor.
//
// So this suite is about a writer that behaves like every other writer here: the
// actor comes from the session, the governing policy is restated inside it, the
// refusals are sentences, and the audit remembers.
//
// The last group is the one that matters most for the screen: three different
// situations were being reported with one empty state.

export async function run(ctx) {
  const {
    q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, newInstructor,
    newCourse, newVersion, newSection, newLesson, newReviewer, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('cert-policy-admin@example.com');
  const teacher = await newInstructor('cert-policy-teacher@example.com', admin);
  const otherTeacher = await newInstructor('cert-policy-other@example.com', admin);
  const reviewer = await newReviewer('cert-policy-reviewer@example.com', admin);
  await newProfile(teacher, 'Certificate Teacher');

  /** Run `sql` as this person, committed. The whole point: act as the human. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const r = await q(sql, params);
      await q('commit');
      return r;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const policy = (actor, version, enabled, template = null) =>
    asActor(actor, 'select public.set_course_certificate_policy($1,$2,$3) as r',
      [version, enabled, template]).then((r) => r.rows[0].r);

  const standing = (actor) =>
    asActor(actor, 'select public.certificate_shelf_standing() as r').then((r) => r.rows[0].r);

  /** A version with one lesson, approved and published, ready to be finished. */
  async function shelfReady(owner = teacher, audience = 'adult') {
    const course = await newCourse(owner, { status: 'active', audience });
    const version = await newVersion(course, owner);
    const section = await newSection(version);
    const lessons = [await newLesson(section, { position: 1 })];
    await satisfyReview(version, reviewer, admin);
    await q(`select public.set_course_version_status($1,'submitted',$2,'ready')`, [version, owner]);
    await q(`select public.set_course_version_status($1,'approved',$2,'approved')`, [version, reviewer]);
    await q(`select public.set_course_version_status($1,'published',$2,'published')`, [version, admin]);
    return { course, version, section, lessons };
  }

  /** An adult with a learner profile of their own. */
  async function adult(email) {
    const userId = await newUser(email);
    await newProfile(userId, email);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [email, userId])).rows[0].id;
    return { userId, learnerId };
  }

  /** Enrols and finishes every lesson, as the learner, through RLS. */
  async function finish(learner, built) {
    const enrolmentId = (await asActor(learner.userId,
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`,
      [learner.learnerId, built.course, built.version])).rows[0].id;

    for (const lesson of built.lessons) {
      await asActor(learner.userId,
        `insert into public.lesson_progress
           (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
         values ($1,$2,'completed',100,now(),now())`, [enrolmentId, lesson]);
    }
    return enrolmentId;
  }

  // -------------------------------------------------------------------------
  // Who may decide
  // -------------------------------------------------------------------------

  await test('a signed-out caller is told to sign in', async () => {
    const { version } = await shelfReady();
    await rejects(() => ctx.asAnon(() => q('select public.set_course_certificate_policy($1,true,$2)',
      [version, 'standard-v1'])), /sign in to decide/i);
  });

  await test('the author decides, and the answer names the design', async () => {
    const { version } = await shelfReady();
    const answer = await policy(teacher, version, true, 'standard-v1');
    assert(answer.enabled === true, 'not enabled');
    assert(answer.templateVersion === 'standard-v1', `template: ${answer.templateVersion}`);
    assert(answer.changed === true, 'the first decision is a change');
  });

  await test('another teacher cannot decide what somebody else’s course finishes with', async () => {
    const { version } = await shelfReady();
    await rejects(() => policy(otherTeacher, version, true, 'standard-v1'),
      /only the author/i);
    const rows = (await q(
      'select 1 from public.course_completion_policies where course_version_id = $1', [version])).rows;
    assert(rows.length === 0, 'the refused call wrote a policy anyway');
  });

  await test('the owner can, because a course whose author has gone quiet still needs a decision', async () => {
    const { version } = await shelfReady();
    const answer = await policy(admin, version, true, 'standard-v1');
    assert(answer.enabled === true);
  });

  await test('a learner cannot', async () => {
    const { version } = await shelfReady();
    const learner = await adult('cert-policy-learner@example.com');
    await rejects(() => policy(learner.userId, version, true, 'standard-v1'), /only the author/i);
  });

  // -------------------------------------------------------------------------
  // The refusals, in sentences
  // -------------------------------------------------------------------------

  await test('a certificate needs the name of the design it was made from', async () => {
    const { version } = await shelfReady();
    // The table's own constraint would say `ccp_certificate_needs_template`,
    // which is not a sentence a teacher can act on. The writer says it first.
    await rejects(() => policy(teacher, version, true, ''), /name of the design/i);
    await rejects(() => policy(teacher, version, true, '   '), /name of the design/i);
  });

  await test('a design name is at most eighty characters', async () => {
    const { version } = await shelfReady();
    await rejects(() => policy(teacher, version, true, 'x'.repeat(81)), /at most 80/i);
    const ok = await policy(teacher, version, true, 'x'.repeat(80));
    assert(ok.templateVersion.length === 80);
  });

  await test('turning it off keeps the design, so turning it back on does not ask again', async () => {
    const { version } = await shelfReady();
    await policy(teacher, version, true, 'standard-v1');
    const off = await policy(teacher, version, false, null);
    assert(off.enabled === false);
    assert(off.templateVersion === 'standard-v1', 'the design was thrown away');
    const on = await policy(teacher, version, true, null);
    assert(on.enabled === true, 're-enabling without repeating the name failed');
    assert(on.templateVersion === 'standard-v1');
  });

  await test('a second identical decision is reported as no change, and audited once', async () => {
    const { version } = await shelfReady();
    await policy(teacher, version, true, 'standard-v1');
    const again = await policy(teacher, version, true, 'standard-v1');
    assert(again.changed === false, 'an identical write reported a change');
    const audited = (await q(
      `select count(*)::int n from public.governance_audit_events
        where action = 'certificate.policy_changed' and target_id = $1`, [version])).rows[0].n;
    assert(audited === 1, `audited ${audited} times`);
  });

  await test('a retired version cannot change what it promises', async () => {
    const { version } = await shelfReady();
    await q(`select public.set_course_version_status($1,'retired',$2,'done')`, [version, admin]);
    await rejects(() => policy(teacher, version, true, 'standard-v1'), /retired/i);
  });

  await test('the switch cannot be turned off while somebody holds a certificate', async () => {
    const { course, version, section, lessons } = await shelfReady();
    void course; void section;
    await policy(teacher, version, true, 'standard-v1');

    const learner = await adult('cert-policy-holder@example.com');
    const enrolmentId = await finish(learner, { course, version, lessons });

    await asActor(admin, 'select public.issue_certificate_for_session($1) as n', [enrolmentId]);

    await rejects(() => policy(teacher, version, false, null),
      /1 learner is already holding a certificate/i);

    // And the certificate still verifies, because turning a switch off was never
    // going to be how a promise is withdrawn.
    const number = (await q(
      'select certificate_number from public.certificates where course_enrolment_id = $1',
      [enrolmentId])).rows[0].certificate_number;
    const verified = (await q('select * from public.verify_certificate($1)', [number])).rows[0];
    assert(verified.valid === true, 'the certificate stopped verifying');
  });

  // -------------------------------------------------------------------------
  // Three situations, told apart
  // -------------------------------------------------------------------------

  await test('the standing is staff-only', async () => {
    await rejects(() => standing(teacher), /only platform staff/i);
  });

  await test('it reports what the screen needs, and nothing a learner could read', async () => {
    const facts = await standing(admin);
    for (const key of ['publishedVersions', 'issuingVersions', 'waiting', 'finishedWithout',
      'issued', 'revoked']) {
      assert(typeof facts[key] === 'number', `${key} is not a number: ${facts[key]}`);
    }
    // No names, no addresses, no certificate numbers: a count is a fact about
    // the platform, a name is a fact about a person.
    assert(!/name|email|learner_/i.test(JSON.stringify(facts)), JSON.stringify(facts));
  });

  await test('a learner who finished a course that issues nothing is counted, not hidden', async () => {
    const before = await standing(admin);
    const built = await shelfReady();
    const learner = await adult('cert-policy-ungraded@example.com');
    await finish(learner, built);

    const after = await standing(admin);
    assert(after.waiting === before.waiting,
      'somebody became eligible without a course that issues certificates');
    assert(after.finishedWithout === before.finishedWithout + 1,
      `finishedWithout went ${before.finishedWithout} -> ${after.finishedWithout}; the person who did the work is invisible`);
  });

  await test('turning the switch on moves them from unnoticed to waiting', async () => {
    const built = await shelfReady();
    const learner = await adult('cert-policy-promoted@example.com');
    await finish(learner, built);

    const before = await standing(admin);
    await policy(teacher, built.version, true, 'standard-v1');
    const after = await standing(admin);

    assert(after.issuingVersions === before.issuingVersions + 1);
    assert(after.waiting === before.waiting + 1,
      `waiting went ${before.waiting} -> ${after.waiting}`);
    assert(after.finishedWithout === before.finishedWithout - 1,
      'the learner is counted as finished-without and as waiting at once');
  });

  await test('issuing removes them from waiting and shows on the shelf', async () => {
    const built = await shelfReady();
    await policy(teacher, built.version, true, 'standard-v1');
    const learner = await adult('cert-policy-issued@example.com');
    const enrolmentId = await finish(learner, built);

    const before = await standing(admin);
    await asActor(admin, 'select public.issue_certificate_for_session($1) as n', [enrolmentId]);
    const after = await standing(admin);

    assert(after.waiting === before.waiting - 1, 'the learner is still waiting');
    assert(after.issued === before.issued + 1, 'the issued count did not move');
  });
}
