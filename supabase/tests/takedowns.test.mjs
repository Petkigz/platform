// A takedown: the distribution stops with the notice, and the decision comes after.
//
// The thing worth testing here is not the table. It is that one clause in
// `can_read_version()` takes a course out of the catalogue, out of enrolment, out of
// the player and out of offline downloads at the same moment — while leaving it
// readable to the author who has to answer the claim and to the staff who decide it.
//
// The other half is the shape of the decision: uphold keeps the hold, reject and
// withdrawal put the material back, and the person who took the notice does not get
// to decide it.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer, grantRole, committed,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('takedown-admin@example.com');

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

  const teacher = await newInstructor('takedown-teacher@example.com', admin);
  const otherTeacher = await newInstructor('takedown-teacher-two@example.com', admin);
  const learner = await newUser('takedown-learner@example.com');
  await newProfile(learner, 'Takedown Learner');

  const governance = await newUser('takedown-governance@example.com');
  await newProfile(governance, 'Takedown Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  // A reviewer holds the `reviewer` role, which is what lets them approve at all.
  const reviewer = await newReviewer('takedown-reviewer@example.com', admin);

  // Publishing through the real gate: the author submits, a reviewer approves, staff
  // publishes. A version published any other way would not be worth testing.
  async function publish(versionId, author) {
    // A version with no lessons is not publishable, and rightly so.
    const section = await newSection(versionId);
    await newLesson(section);
    await satisfyReview(versionId, reviewer, admin);
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, 'submitted', author, 'For the takedown suite.']);
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, 'approved', reviewer, 'Reviewed.']);
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, 'published', admin, 'Published for the takedown suite.']);
  }

  // A published version, through the real gate rather than by hand.
  const course = await newCourse(teacher, { title: 'Seerah for young learners', status: 'active' });
  const version = await newVersion(course, teacher);
  await publish(version, teacher);

  const readable = async (actor, which = version) =>
    (await asActor(actor, 'select public.can_read_version($1) as r', [which])).rows[0].r;

  let noticeId = '';
  const CLAIM = 'A lesson quotes twelve pages of a published book without permission, '
    + 'and the audio is a reading of it.';

  await test('before any notice, a published version is readable by a learner', async () => {
    eq(await readable(learner), true, 'a learner reading a published version');
  });

  await test('a notice needs staff, a published version and the claim in words', async () => {
    await rejects(() => call(teacher, 'open_takedown_notice($1,$2,$3,$4,$5,$6)',
      [version, 'A Publisher', null, 'A book', 'Lesson 3, from 4:10', CLAIM]),
    /takedown:not_allowed/);

    await rejects(() => call(admin, 'open_takedown_notice($1,$2,$3,$4,$5,$6)',
      ['00000000-0000-0000-0000-000000000000', 'A Publisher', null, 'A book',
        'Lesson 3, from 4:10', CLAIM]), /takedown:version_not_found/);
    await rejects(() => call(admin, 'open_takedown_notice($1,$2,$3,$4,$5,$6)',
      [version, 'A', null, 'A book', 'Lesson 3, from 4:10', CLAIM]),
    /takedown:claimant_required/);
    await rejects(() => call(admin, 'open_takedown_notice($1,$2,$3,$4,$5,$6)',
      [version, 'A Publisher', 'not-an-email', 'A book', 'Lesson 3, from 4:10', CLAIM]),
    /takedown:email_invalid/);
    await rejects(() => call(admin, 'open_takedown_notice($1,$2,$3,$4,$5,$6)',
      [version, 'A Publisher', null, 'x', 'Lesson 3, from 4:10', CLAIM]),
    /takedown:work_required/);
    await rejects(() => call(admin, 'open_takedown_notice($1,$2,$3,$4,$5,$6)',
      [version, 'A Publisher', null, 'A book', 'here', CLAIM]),
    /takedown:material_required/);
    await rejects(() => call(admin, 'open_takedown_notice($1,$2,$3,$4,$5,$6)',
      [version, 'A Publisher', null, 'A book', 'Lesson 3, from 4:10', 'too short']),
    /takedown:notice_required/);
    await rejects(() => call(admin, 'open_takedown_notice($1,$2,$3,$4,$5,$6,$7,$8)',
      [version, 'A Publisher', null, 'A book', 'Lesson 3, from 4:10', CLAIM, 'owner', '2020-01-01']),
    /takedown:review_in_the_past/);
  });

  await test('taking the notice withholds the version from learners, and not from its author', async () => {
    const opened = await call(governance, 'open_takedown_notice($1,$2,$3,$4,$5,$6,$7,$8)',
      [version, 'A Publisher', 'rights@example.com', 'The Sealed Nectar, 1976 edition',
        'Lesson 3, the narration from 4:10 to 9:30.', CLAIM, 'agent',
        new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)]);
    eq(opened.held, true, 'held on receipt');
    eq(/^TD-\d{4}-\d{4}$/.test(opened.reference), true, `the reference (${opened.reference})`);
    noticeId = opened.id;

    // The learner cannot read it any more — this is the whole takedown.
    eq(await readable(learner), false, 'a learner reading a held version');
    // The author can, because they have to answer the claim.
    eq(await readable(teacher), true, 'the author reading their own held version');
    // Staff can, because they have to decide.
    eq(await readable(admin), true, 'staff reading a held version');

    // The version row itself is gone from a learner's catalogue read.
    const seen = (await asActor(learner,
      'select count(*)::int n from public.course_versions where id = $1', [version])).rows[0].n;
    eq(seen, 0, 'the version in a learner’s catalogue query');

    // And a second notice against the same version is refused rather than stacked.
    await rejects(() => call(admin, 'open_takedown_notice($1,$2,$3,$4,$5,$6)',
      [version, 'Another Claimant', null, 'A different book', 'Lesson 5', CLAIM]),
    /takedown:already_held/);
  });

  await test('the teacher answers inside the product, once', async () => {
    await rejects(() => call(otherTeacher, 'record_takedown_response($1,$2)',
      [noticeId, 'It is my own recording of a public domain reading.']),
    /takedown:not_allowed/);
    await rejects(() => call(teacher, 'record_takedown_response($1,$2)',
      [noticeId, 'mine']), /takedown:response_required/);

    const answered = await call(teacher, 'record_takedown_response($1,$2)',
      [noticeId, 'The passage is quoted with attribution and the narration is my own recording, '
        + 'made in 2024. I can supply the original file.']);
    eq(answered.answered, true, 'answered');

    await rejects(() => call(teacher, 'record_takedown_response($1,$2)',
      [noticeId, 'On reflection, something else entirely.']), /takedown:already_answered/);

    const mine = await call(teacher, 'my_takedown_notices()');
    eq(mine.held, 1, 'the teacher sees one held version');
    eq(mine.notices[0].courseTitle, 'Seerah for young learners', 'and which course');
    eq(mine.notices[0].answered, true, 'with their answer on it');
    assert(/attribution/.test(mine.notices[0].response), 'the answer is kept as given');

    // Somebody else's page shows nothing of it.
    const theirs = await call(otherTeacher, 'my_takedown_notices()');
    eq(theirs.notices.length, 0, 'another teacher sees no notices');
  });

  await test('the person who took the notice does not decide it', async () => {
    await rejects(() => call(governance, 'decide_takedown_notice($1,$2,$3)',
      [noticeId, 'rejected', 'The quotation is fair and attributed.']),
    /takedown:self_decision/);
    await rejects(() => call(teacher, 'decide_takedown_notice($1,$2,$3)',
      [noticeId, 'rejected', 'The quotation is fair and attributed.']),
    /takedown:not_allowed/);
    await rejects(() => call(admin, 'decide_takedown_notice($1,$2,$3)',
      [noticeId, 'maybe', 'The quotation is fair and attributed.']),
    /takedown:outcome_invalid/);
    await rejects(() => call(admin, 'decide_takedown_notice($1,$2,$3)',
      [noticeId, 'rejected', 'fine']), /takedown:reason_required/);
  });

  await test('rejecting a notice puts the material back for learners', async () => {
    const decided = await call(admin, 'decide_takedown_notice($1,$2,$3)',
      [noticeId, 'rejected',
        'The quoted passage is twelve lines with attribution, and the narration was recorded by '
        + 'the teacher in 2024. Nothing here reproduces the work.']);
    eq(decided.status, 'rejected', 'rejected');
    eq(decided.released, true, 'and released');

    // The same clause runs backwards: the hold is a query, not a copy.
    eq(await readable(learner), true, 'a learner after the release');
    const seen = (await asActor(learner,
      'select count(*)::int n from public.course_versions where id = $1', [version])).rows[0].n;
    eq(seen, 1, 'the version back in a learner’s catalogue query');

    await rejects(() => call(admin, 'decide_takedown_notice($1,$2,$3)',
      [noticeId, 'upheld', 'Changed my mind about this one.']),
    /takedown:already_decided/);
    await rejects(() => call(teacher, 'record_takedown_response($1,$2)',
      [noticeId, 'One more thing.']), /takedown:already_decided/);
  });

  await test('upholding one keeps it out of distribution for good', async () => {
    const secondCourse = await newCourse(teacher, { title: 'Fiqh of worship', status: 'active' });
    const secondVersion = await newVersion(secondCourse, teacher);
    await publish(secondVersion, teacher);

    // Held by governance, upheld by the owner: the two roles of a real decision.
    const held = await call(governance, 'open_takedown_notice($1,$2,$3,$4,$5,$6)',
      [secondVersion, 'A Translator', null, 'A published translation of a classical text',
        'Every lesson, the whole text.', 'The entire translation is reproduced without licence.']);
    await call(admin, 'decide_takedown_notice($1,$2,$3)',
      [held.id, 'upheld', 'The translation is in copyright and the licence was never granted.']);

    eq(await readable(learner, secondVersion), false, 'a learner reading an upheld version');
    eq(await readable(teacher, secondVersion), true,
      'the author still reading it, to see what is wrong');
  });

  await test('the register says what is held, what is unanswered, and what could be taken down', async () => {
    const register = await call(admin, 'takedown_register()');
    eq(register.counts.upheld, 1, 'one was upheld');
    eq(register.counts.released, 1, 'and one was released');
    eq(register.counts.held, 0, 'nothing is waiting');
    assert(register.notices.some((n) => n.reference === 'TD-2026-0001' && n.status === 'rejected'),
      'the released notice is still on the register');
    // An upheld version is not offered as a candidate for a further notice.
    eq(register.candidates.some((c) => c.versionId === version), true,
      'the released version can be noticed again');
    eq(register.candidates.some((c) => c.title === 'Fiqh of worship'), false,
      'an upheld version is not offered');

    // A support agent may read the queue — they answer the phone — but not decide.
    const support = await newUser('takedown-support@example.com');
    await newProfile(support, 'Takedown Support');
    await committed(() => grantRole(support, 'support_agent', admin));
    const seenBySupport = await call(support, 'takedown_register()');
    eq(seenBySupport.notices.length >= 2, true, 'support can read the queue');
    await rejects(() => call(support, 'open_takedown_notice($1,$2,$3,$4,$5,$6)',
      [version, 'A Claimant', null, 'A book', 'Lesson 1', CLAIM]), /takedown:not_allowed/);

    // A learner cannot read the register at all.
    await rejects(() => call(learner, 'takedown_register()'), /takedown:not_allowed/);
  });

  await test('the timeline of a notice cannot be rewritten', async () => {
    const events = (await q(
      'select id from public.takedown_events where notice_id = $1 order by created_at limit 1',
      [noticeId])).rows[0].id;
    await rejects(() => q(`update public.takedown_events set body = 'Nothing happened.' where id = $1`,
      [events]), /takedown:event_append_only/);
    await rejects(() => q(`delete from public.takedown_events where id = $1`, [events]),
      /takedown:event_append_only/);
  });

  await test('the flag no longer says the action is missing', async () => {
    const row = (await q(
      `select gate_type, preconditions from public.platform_settings where key = 'platform.takedown'`)).rows[0];
    eq(row.gate_type, 'code', 'a public claim form and delivery are still missing');
    eq(/Not built: the withholding action itself/.test(row.preconditions), false,
      'the withholding action exists now');
    assert(/withholding action/i.test(row.preconditions), 'and the preconditions name it');
    assert(/claim form/i.test(row.preconditions), 'while naming what is still absent');
  });
}
