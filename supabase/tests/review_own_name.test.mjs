// A review is decided by the reviewer it was given to, in their own name
// (20261281164000). Every case here was first measured the other way round,
// on the 370 migrations before that one: an account with no role approved a
// version by naming an administrator, a reviewer pointed their assignment at
// another course, reopened one staff had cancelled, and decided an offer
// they had never accepted.
//
// What this cannot show: anything about the hosted project, where the
// migration has to be applied by its own approved step; and whether any of
// this was ever done there. There is no record either way.

export async function run(ctx) {
  const {
    q, test, assert, rejects, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer,
    ensureReviewerProfile, newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('ownname-admin@example.com');
  const teacher = await newInstructor('ownname-teacher@example.com', admin);
  const reviewer = await newReviewer('ownname-reviewer@example.com', admin);
  const second = await newReviewer('ownname-second@example.com', admin);
  // Somebody who holds the reviewer role and also wrote a course.
  const both = await newReviewer('ownname-both@example.com', admin);
  const outsider = await newUser('ownname-outsider@example.com');
  await newProfile(outsider, 'Own Name Outsider');
  const rp = await ensureReviewerProfile(reviewer, admin);
  const rpSecond = await ensureReviewerProfile(second, admin);
  const rpBoth = await ensureReviewerProfile(both, admin);

  let step = 0;
  /** One statement as a signed-in person; afterwards nobody is signed in again. */
  async function as(actor, sql, params = []) {
    const point = `ownname_${step += 1}`;
    await q(`savepoint ${point}`);
    await q(`select set_config('request.jwt.claims',$1,true)`, [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const result = await q(sql, params);
      await q('reset role');
      await q(`select set_config('request.jwt.claims','',true)`);
      await q(`release savepoint ${point}`);
      return result;
    } catch (e) {
      await q(`rollback to savepoint ${point}`);
      throw e;
    }
  }
  /** A test's own transaction, undone at the end. */
  async function scene(fn) {
    await q('begin');
    try { return await fn(); } finally { await q('rollback'); }
  }

  const move = (version, status, actor) => ['select version_status from public.set_course_version_status($1,$2,$3,$4)', [version, status, actor, 'own name suite']];
  async function submitted(by = teacher) {
    const course = await newCourse(by, { status: 'active' });
    const version = await newVersion(course, by);
    const section = await newSection(version);
    await newLesson(section);
    await q(...move(version, 'submitted', by));
    return version;
  }
  async function assigned(version, profile = rp, state = 'offered', scope = 'scholarly') {
    const open = state !== 'offered' && state !== 'declined';
    const closed = state === 'cancelled' || state === 'completed';
    return (await q(
      `insert into public.content_review_assignments
         (course_version_id, reviewer_profile_id, review_scope, assigned_by, assignment_status, accepted_at, completed_at)
       values ($1, $2, $3, $4, $5, ${open ? 'now()' : 'null'}, ${closed ? 'now()' : 'null'}) returning id`,
      [version, profile, scope, admin, state])).rows[0].id;
  }
  const decide = (assignment, version, by, decision = 'approved', scope = 'scholarly') => [
    `insert into public.content_review_decisions (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
     values ($1, $2, $3, $4, 'Read through, lesson by lesson.', $5) returning id`,
    [assignment, version, scope, decision, by]];
  const assignment = async (id) => (await q(
    `select course_version_id, review_scope, assignment_status, assigned_by, due_at, accepted_at, completed_at,
            accepted_at = now() as accepted_now, completed_at = now() as completed_now
       from public.content_review_assignments where id = $1`, [id])).rows[0];
  const statusOf = async (version) => (await q('select version_status s from public.course_versions where id = $1', [version])).rows[0].s;

  // -------------------------------------------------------------------
  // The actor is the caller
  // -------------------------------------------------------------------
  await test('an account with no role cannot move a version by naming an administrator', () => scene(async () => {
    const version = await submitted();
    for (const to of ['approved', 'rejected']) {
      await rejects(() => as(outsider, ...move(version, to, admin)), /in your own name/);
    }
    assert(await statusOf(version) === 'submitted', 'the version moved');
  }));

  await test('an author cannot approve their own course by naming an administrator, or a reviewer', () => scene(async () => {
    const version = await submitted();
    await rejects(() => as(teacher, ...move(version, 'approved', admin)), /in your own name/);
    await rejects(() => as(teacher, ...move(version, 'approved', reviewer)), /in your own name/);
    await rejects(() => as(teacher, ...move(version, 'approved', teacher)), /not permitted|may not approve/);
  }));

  await test('nobody submits a draft in its author\'s name', () => scene(async () => {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    await newLesson(await newSection(version));
    await rejects(() => as(outsider, ...move(version, 'submitted', teacher)), /in your own name/);
    const mine = await as(teacher, ...move(version, 'submitted', teacher));
    assert(mine.rows[0].version_status === 'submitted', 'the author could not submit their own draft');
  }));

  await test('an administrator still decides in their own name, and the server is believed as before', () => scene(async () => {
    const one = await submitted();
    const byAdmin = await as(admin, ...move(one, 'approved', admin));
    assert(byAdmin.rows[0].version_status === 'approved', 'an administrator could not approve');
    const two = await submitted();
    // No session at all: what the server's own key and a migration are.
    const byServer = await q(...move(two, 'rejected', admin));
    assert(byServer.rows[0].version_status === 'rejected', 'the server was not believed');
  }));

  await test('nobody re-pins an enrolment by naming an administrator', () => scene(async () => {
    const nothing = '00000000-0000-4000-8000-000000000000';
    await rejects(() => as(outsider,
      'select id from public.re_pin_enrolment($1,$2,$3,$4)', [nothing, nothing, admin, 'because']), /in your own name/);
    // In their own name the answer is the one it always was.
    await rejects(() => as(admin,
      'select id from public.re_pin_enrolment($1,$2,$3,$4)', [nothing, nothing, admin, 'because']), /not found/);
    await rejects(() => as(outsider,
      'select id from public.re_pin_enrolment($1,$2,$3,$4)', [nothing, nothing, outsider, 'because']), /not found|not privileged/);
  }));

  // -------------------------------------------------------------------
  // A reviewer moves a version with a decision, not with the role
  // -------------------------------------------------------------------
  await test('the reviewer role alone approves and returns nothing', () => scene(async () => {
    const version = await submitted();
    await rejects(() => as(second, ...move(version, 'approved', second)), /decision of their own/);
    await rejects(() => as(second, ...move(version, 'rejected', second)), /decision of their own/);
    // Assigned and accepted, and still nothing decided.
    const a = await assigned(version, rp, 'accepted');
    assert(a, 'no assignment');
    await rejects(() => as(reviewer, ...move(version, 'approved', reviewer)), /decision of their own/);
  }));

  await test('a reviewer moves the version the way their decision says, and no other way', () => scene(async () => {
    const approved = await submitted();
    await as(reviewer, ...decide(await assigned(approved, rp, 'accepted'), approved, reviewer, 'approved'));
    await rejects(() => as(reviewer, ...move(approved, 'rejected', reviewer)), /decision of their own/);
    // Somebody else's decision is not mine.
    await rejects(() => as(second, ...move(approved, 'approved', second)), /decision of their own/);
    assert((await as(reviewer, ...move(approved, 'approved', reviewer))).rows[0].version_status === 'approved', 'an approval did not move the version');

    for (const decision of ['revision_requested', 'rejected']) {
      const returned = await submitted();
      await as(reviewer, ...decide(await assigned(returned, rp, 'accepted'), returned, reviewer, decision));
      await rejects(() => as(reviewer, ...move(returned, 'approved', reviewer)), /decision of their own/);
      assert((await as(reviewer, ...move(returned, 'rejected', reviewer))).rows[0].version_status === 'rejected', `${decision} did not return the version`);
    }
  }));

  // Committed, because "since it was submitted" compares two times and every
  // statement of one transaction has the same one.
  await test('a decision from before a version was sent back does not move it a second time', async () => {
    const version = await committed(() => submitted());
    await committed(async () => {
      await as(reviewer, ...decide(await assigned(version, rp, 'accepted'), version, reviewer, 'rejected'));
      await as(reviewer, ...move(version, 'rejected', reviewer));
    });
    await committed(async () => {
      await as(teacher, ...move(version, 'draft', teacher));
      await as(teacher, ...move(version, 'submitted', teacher));
    });
    await scene(async () => {
      await rejects(() => as(reviewer, ...move(version, 'rejected', reviewer)), /decision of their own/);
      assert(await statusOf(version) === 'submitted', 'the resubmitted version moved on an old decision');
    });
  });

  // -------------------------------------------------------------------
  // What may change on an assignment
  // -------------------------------------------------------------------
  await test('a reviewer cannot point their assignment at another course, their own included', () => scene(async () => {
    const version = await submitted();
    const other = await submitted();
    const mine = await submitted(both);
    const a = await assigned(version, rpBoth, 'accepted');
    for (const target of [other, mine]) {
      await rejects(() => as(both,
        'update public.content_review_assignments set course_version_id = $2 where id = $1 returning id', [a, target]),
        /keeps its course version/);
    }
    assert((await assignment(a)).course_version_id === version, 'the assignment moved');
  }));

  await test('a reviewer cannot change the scope, who assigned it, or when it is due', () => scene(async () => {
    const version = await submitted();
    const a = await assigned(version, rp, 'offered', 'technical');
    await rejects(() => as(reviewer,
      `update public.content_review_assignments set review_scope = 'scholarly' where id = $1 returning id`, [a]), /keeps its course version/);
    await rejects(() => as(reviewer,
      'update public.content_review_assignments set assigned_by = $2 where id = $1 returning id', [a, reviewer]), /for staff to set/);
    await rejects(() => as(reviewer,
      `update public.content_review_assignments set due_at = now() + interval '10 years' where id = $1 returning id`, [a]), /for staff to set/);
    await rejects(() => as(reviewer,
      `update public.content_review_assignments set assigned_at = now() - interval '1 year' where id = $1 returning id`, [a]), /for staff to set/);
    const after = await assignment(a);
    assert(after.review_scope === 'technical' && after.assigned_by === admin && after.due_at === null, 'something changed');
  }));

  await test('a reviewer cannot reopen what staff cancelled or what they declined, or call a review complete', () => scene(async () => {
    const cancelled = await assigned(await submitted(), rp, 'cancelled');
    await rejects(() => as(reviewer,
      `update public.content_review_assignments set assignment_status = 'accepted', completed_at = null where id = $1 returning id`, [cancelled]),
      /is not made accepted by its reviewer/);
    const declined = await assigned(await submitted(), rp, 'declined');
    for (const to of ['accepted', 'offered', 'in_progress']) {
      await rejects(() => as(reviewer,
        `update public.content_review_assignments set assignment_status = $2, accepted_at = case when $2 = 'offered' then null else now() end where id = $1 returning id`, [declined, to]),
        /by its reviewer/);
    }
    const accepted = await assigned(await submitted(), rp, 'accepted');
    await rejects(() => as(reviewer,
      `update public.content_review_assignments set assignment_status = 'completed', completed_at = now() where id = $1 returning id`, [accepted]),
      /completed by recording a decision/);
    await rejects(() => as(reviewer,
      `update public.content_review_assignments set assignment_status = 'cancelled', completed_at = now() where id = $1 returning id`, [accepted]),
      /by its reviewer/);
    await rejects(() => as(reviewer,
      `update public.content_review_assignments set accepted_at = now() - interval '1 year' where id = $1 returning id`, [accepted]),
      /written when its state changes/);
  }));

  await test('a reviewer accepts or declines an offer and marks a review in progress; the database writes the times', () => scene(async () => {
    const taken = await assigned(await submitted(), rp);
    const r = await as(reviewer,
      `update public.content_review_assignments set assignment_status = 'accepted', accepted_at = '2001-01-01T00:00:00Z' where id = $1 returning assignment_status`, [taken]);
    assert(r.rows.length === 1 && r.rows[0].assignment_status === 'accepted', 'accepting did not work');
    assert((await assignment(taken)).accepted_now === true, 'the time of accepting was the one the browser sent');

    await as(reviewer, `update public.content_review_assignments set assignment_status = 'in_progress' where id = $1`, [taken]);
    const going = await assignment(taken);
    assert(going.assignment_status === 'in_progress' && going.accepted_now === true && going.completed_at === null, 'in progress lost or gained a time');

    const refused = await assigned(await submitted(), rp);
    await as(reviewer, `update public.content_review_assignments set assignment_status = 'declined', accepted_at = null where id = $1`, [refused]);
    const no = await assignment(refused);
    assert(no.assignment_status === 'declined' && no.accepted_at === null, 'declining did not work');
  }));

  await test('staff cancel a review and set when it is due, and cannot move it to another course or person either', () => scene(async () => {
    const version = await submitted();
    const a = await assigned(version, rp, 'accepted');
    await as(admin, `update public.content_review_assignments set due_at = now() + interval '7 days' where id = $1`, [a]);
    await as(admin, `update public.content_review_assignments set assignment_status = 'cancelled', completed_at = now() where id = $1`, [a]);
    const after = await assignment(a);
    assert(after.assignment_status === 'cancelled' && after.due_at !== null, 'staff could not cancel or set a deadline');
    const elsewhere = await submitted();
    await rejects(() => as(admin,
      'update public.content_review_assignments set course_version_id = $2 where id = $1', [a, elsewhere]), /cancel it and make another/);
    await rejects(() => as(admin,
      'update public.content_review_assignments set reviewer_profile_id = $2 where id = $1', [a, rpSecond]), /cancel it and make another/);
    // With no session the row is the server's to repair.
    await q('update public.content_review_assignments set reviewer_profile_id = $2 where id = $1', [a, rpSecond]);
  }));

  // -------------------------------------------------------------------
  // When a decision may be recorded
  // -------------------------------------------------------------------
  await test('no decision on an offer nobody accepted, or on a review declined or cancelled', () => scene(async () => {
    for (const state of ['offered', 'declined', 'cancelled']) {
      const version = await submitted();
      const a = await assigned(version, rp, state);
      await rejects(() => as(reviewer, ...decide(a, version, reviewer)), new RegExp(`still open; this one is ${state}`));
      const n = (await q('select count(*)::int n from public.content_review_decisions where review_assignment_id = $1', [a])).rows[0].n;
      assert(n === 0, `a decision was recorded on a review that is ${state}`);
    }
  }));

  await test('a decision completes its assignment, and a second one is refused', () => scene(async () => {
    for (const state of ['accepted', 'in_progress']) {
      const version = await submitted();
      const a = await assigned(version, rp, state);
      await as(reviewer, ...decide(a, version, reviewer, 'rejected'));
      const after = await assignment(a);
      assert(after.assignment_status === 'completed', `after a decision the review is ${after.assignment_status}`);
      assert(after.completed_now === true && after.accepted_at !== null, 'the times of a completed review are wrong');
      await rejects(() => as(reviewer, ...decide(a, version, reviewer, 'approved')), /still open; this one is completed/);
      const n = (await q('select count(*)::int n from public.content_review_decisions where review_assignment_id = $1', [a])).rows[0].n;
      assert(n === 1, `${n} decisions on one assignment`);
      // And the lessons stop playing: the review is no longer one of the open ones.
      const open = (await as(reviewer,
        `select count(*)::int n from public.content_review_assignments where id = $1 and assignment_status in ('accepted','in_progress')`, [a])).rows[0].n;
      assert(open === 0, 'the review still counts as open');
    }
  }));

  await test('the server may still record a decision on a review of any state, and it completes an open one', () => scene(async () => {
    const version = await submitted();
    const done = await assigned(version, rp, 'completed');
    await q(...decide(done, version, reviewer));
    assert((await assignment(done)).assignment_status === 'completed', 'a completed review changed state');
    const other = await submitted();
    const open = await assigned(other, rp, 'accepted');
    await q(...decide(open, other, reviewer));
    assert((await assignment(open)).assignment_status === 'completed', 'an open review was not completed');
  }));

  await test('a conflict declared about the course bars the decision until it is heard', () => scene(async () => {
    const version = await submitted();
    const a = await assigned(version, rp, 'accepted');
    const declared = await as(reviewer,
      'select public.declare_reviewer_conflict($1,$2,$3) as answer', ['financial', 'I am paid by the school that made this course.', version]);
    const id = (await q(
      'select id from public.reviewer_conflict_declarations where reviewer_profile_id = $1 and course_version_id = $2', [rp, version])).rows[0]?.id;
    assert(declared.rows.length === 1 && id, 'the declaration was not recorded');
    await rejects(() => as(reviewer, ...decide(a, version, reviewer)), /unresolved conflict declaration/);
    // Another course of theirs is untouched by a declaration about this one.
    const elsewhere = await submitted();
    await as(reviewer, ...decide(await assigned(elsewhere, rp, 'accepted'), elsewhere, reviewer));

    await as(admin, 'select public.assess_reviewer_conflict($1,$2,$3)', [id, 'disqualifying', 'Paid by the author.']);
    await rejects(() => as(reviewer, ...decide(a, version, reviewer)), /unresolved conflict declaration/);
    await as(admin, 'select public.assess_reviewer_conflict($1,$2,$3)', [id, 'resolved', 'The contract ended.']);
    await as(reviewer, ...decide(a, version, reviewer));
    assert((await assignment(a)).assignment_status === 'completed', 'a heard conflict still barred the decision');
  }));

  await test('a conflict declared about the reviewer, not one course, bars every decision of theirs', () => scene(async () => {
    const version = await submitted();
    const a = await assigned(version, rp, 'accepted');
    await as(reviewer, 'select public.declare_reviewer_conflict($1,$2,$3)', ['institutional', 'I now work for a publisher of courses.', null]);
    await rejects(() => as(reviewer, ...decide(a, version, reviewer)), /unresolved conflict declaration/);
    await rejects(() => q(...decide(a, version, reviewer)), /unresolved conflict declaration/);
  }));
}
