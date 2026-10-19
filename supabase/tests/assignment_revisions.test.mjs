// The revision loop: acting on feedback.
//
// What is worth pinning is not that a row can be reopened. It is the four ways
// this could quietly go wrong: a mark surviving onto work that has changed, a
// learner trading a grade for nothing against a passed deadline, a snapshot that
// can be rewritten after the fact, and a teacher switching revisions off while a
// learner is mid-revision.

export async function run(ctx) {
  const {
    q, test, assert, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('revisions-admin@example.com');
  const teacher = await newInstructor('revisions-teacher@example.com', admin);
  const otherTeacher = await newInstructor('revisions-other@example.com', admin);
  const reviewer = await newReviewer('revisions-reviewer@example.com', admin);

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'assignment revisions test']);

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
  async function learner(enrolledDaysAgo = 0, name = 'Learner') {
    seq += 1;
    const userId = await newUser(`revisions-learner-${seq}@example.com`);
    await newProfile(userId, `${name} ${seq}`);
    const learnerId = await committed(async () => {
      const id = (await q(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [`${name} ${seq}`, userId])).rows[0].id;
      await q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status, enrolled_at)
         values ($1,$2,$3,'free','active',now() - make_interval(days => $4))`,
        [id, fixture.course, fixture.version, enrolledDaysAgo]);
      return id;
    });
    return { userId, learnerId };
  }

  async function parentWithChild() {
    seq += 1;
    const userId = await newUser(`revisions-parent-${seq}@example.com`);
    await newProfile(userId, `Parent ${seq}`);
    const childId = await committed(async () => {
      const familyId = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, [`Revision family ${seq}`, userId])).rows[0].id;
      await q(
        `insert into public.family_memberships
           (family_id, user_id, membership_type, status, joined_at, created_by)
         values ($1,$2,'owner','active',now(),$3)`, [familyId, userId, userId]);
      const id = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','8-10',$2,'active') returning id`, [`Child ${seq}`, familyId])).rows[0].id;
      await q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [id, fixture.course, fixture.version]);
      return id;
    });
    return { userId, childId };
  }

  async function asActor(actor, fn) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await fn(); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  async function refused(actor, sql, params, pattern) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [actor === null ? '' : JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    await q('savepoint revision_refusal');
    let caught;
    try { await q(sql, params); } catch (e) { caught = e; }
    await q('rollback to savepoint revision_refusal');
    await q('rollback');
    assert(caught, `expected an error matching ${pattern}`);
    const message = String(caught.message ?? caught);
    assert(pattern.test(message), `expected ${pattern}; got: ${message.slice(0, 240)}`);
  }

  const SQL_CREATE = `select public.create_course_assignment($1,$2,$3,$4,$5,$6,$7,$8) as id`;
  const SQL_OPEN = "select public.set_course_assignment_status($1,'open')";
  const SQL_CLOSE = "select public.set_course_assignment_status($1,'closed')";
  const SQL_SAVE = 'select public.save_assignment_draft($1,$2,$3) as id';
  const SQL_SUBMIT = 'select public.submit_assignment($1)';
  const SQL_MARK = 'select public.mark_assignment_submission($1,$2,$3)';
  const SQL_REOPEN = 'select public.reopen_assignment_submission($1) as revision';
  const SQL_POLICY = 'select public.set_assignment_revision_policy($1,$2,$3)';
  const SQL_ATTACH = 'select public.attach_assignment_asset($1,$2) as id';

  const create = (over = {}) => asActor(teacher, async () =>
    (await q(SQL_CREATE, [
      fixture.version,
      over.cohortId ?? null,
      over.title ?? 'Write three things you learned',
      over.instructions ?? 'Use your own words.',
      Object.prototype.hasOwnProperty.call(over, 'dueAfterDays') ? over.dueAfterDays : null,
      over.dueAt ?? null,
      over.acceptLate ?? false,
      Object.prototype.hasOwnProperty.call(over, 'pointsPossible') ? over.pointsPossible : 10,
    ])).rows[0].id);

  /** An open task with one learner who has handed in and been marked. */
  async function markedSubmission(over = {}) {
    const assignment = await create(over);
    await asActor(teacher, async () => q(SQL_OPEN, [assignment]));
    const who = await learner(over.enrolledDaysAgo ?? 0);
    const submission = await asActor(who.userId, async () =>
      (await q(SQL_SAVE, [assignment, who.learnerId, over.body ?? 'My first attempt.'])).rows[0].id);
    await asActor(who.userId, async () => q(SQL_SUBMIT, [submission]));
    await asActor(teacher, async () =>
      q(SQL_MARK, [submission, over.score ?? 6, over.feedback ?? 'Good start. Now cite the verse.']));
    return { assignment, learner: who, submission };
  }

  const submissionRow = async (id) =>
    (await q('select * from public.assignment_submissions where id=$1', [id])).rows[0];
  const snapshots = async (id) =>
    (await q('select * from public.assignment_submission_revisions where submission_id=$1 order by revision_number', [id])).rows;
  const reopen = (submission, actor) => asActor(actor, async () =>
    (await q(SQL_REOPEN, [submission])).rows[0].revision);

  const fixture = await publishedCourse();

  await q("update public.platform_settings set value_text='true' where key='learning.assignments'");
  try {
    await test('a task allows revisions by default, with no invented ceiling', async () => {
      const assignment = await create();
      const row = (await q(
        'select revisions_allowed, revision_limit from public.course_assignments where id=$1',
        [assignment])).rows[0];
      assert(row.revisions_allowed === true, 'a new task did not allow revisions');
      assert(row.revision_limit === null, 'a new task carried a platform-wide revision ceiling');

      const preconditions = (await q(
        "select preconditions from public.platform_settings where key='learning.assignments'")).rows[0].preconditions;
      assert(/revision loop/i.test(preconditions),
        'the register still describes the revision loop as missing');
    });

    await test('reopening keeps the words, clears the mark, and snapshots both', async () => {
      const { learner: who, submission } = await markedSubmission({
        body: 'My first attempt.',
        score: 6,
        feedback: 'Good start. Now cite the verse.',
      });
      assert((await submissionRow(submission)).status === 'graded');

      const next = await reopen(submission, who.userId);
      assert(next === 2, `the revision number became ${next}`);

      const after = await submissionRow(submission);
      assert(after.status === 'draft', `the submission became ${after.status}, not a draft`);
      assert(after.body_text === 'My first attempt.',
        'reopening threw the learner’s own words away');
      assert(after.score_earned === null && after.feedback === null
        && after.marked_by === null && after.marked_at === null
        && after.submitted_at === null && after.is_late === null,
        'a cleared submission still carried part of its mark');
      assert(after.revision_number === 2);

      const snaps = await snapshots(submission);
      assert(snaps.length === 1, `expected one snapshot, got ${snaps.length}`);
      assert(snaps[0].revision_number === 1, 'the snapshot claimed the live row’s number');
      assert(snaps[0].body_text === 'My first attempt.');
      assert(Number(snaps[0].score_earned) === 6);
      assert(snaps[0].feedback === 'Good start. Now cite the verse.');
      assert(snaps[0].marked_by !== null && snaps[0].marked_at !== null);
      assert(snaps[0].reopened_by === who.userId);
    });

    await test('only marked work can be revised', async () => {
      const assignment = await create();
      await asActor(teacher, async () => q(SQL_OPEN, [assignment]));
      const who = await learner();
      const draft = await asActor(who.userId, async () =>
        (await q(SQL_SAVE, [assignment, who.learnerId, 'Still thinking.'])).rows[0].id);

      await refused(who.userId, SQL_REOPEN, [draft], /only marked work can be revised/i);

      await asActor(who.userId, async () => q(SQL_SUBMIT, [draft]));
      await refused(who.userId, SQL_REOPEN, [draft], /only marked work can be revised/i);

      // A submitted-but-unmarked row is untouched by a refused reopen.
      const row = await submissionRow(draft);
      assert(row.status === 'submitted' && row.revision_number === 1);
    });

    await test('a teacher can switch revisions off, and off means off', async () => {
      const { assignment, learner: who, submission } = await markedSubmission();

      await asActor(teacher, async () => q(SQL_POLICY, [assignment, false, null]));
      await refused(who.userId, SQL_REOPEN, [submission], /does not allow revisions/i);

      // The limit is cleared rather than left as a stale number, so switching
      // revisions back on does not resurrect a ceiling nobody remembers setting.
      const policy = (await q(
        'select revisions_allowed, revision_limit from public.course_assignments where id=$1',
        [assignment])).rows[0];
      assert(policy.revisions_allowed === false && policy.revision_limit === null);

      await asActor(teacher, async () => q(SQL_POLICY, [assignment, true, 3]));
      const next = await reopen(submission, who.userId);
      assert(next === 2, 'revisions did not resume once the teacher allowed them again');
    });

    await test('the limit counts versions, including the first', async () => {
      const { assignment, learner: who, submission } = await markedSubmission();
      await asActor(teacher, async () => q(SQL_POLICY, [assignment, true, 2]));

      assert(await reopen(submission, who.userId) === 2);

      // Hand the revision in and mark it, so there is something to reopen again.
      await asActor(who.userId, async () => q(SQL_SUBMIT, [submission]));
      await asActor(teacher, async () => q(SQL_MARK, [submission, 8, 'Much better.']));
      await refused(who.userId, SQL_REOPEN, [submission], /allows 2 versions/i);

      assert((await snapshots(submission)).length === 1, 'a refused reopen still recorded a snapshot');
    });

    await test('a limit of one version allows no revision at all', async () => {
      const { assignment, learner: who, submission } = await markedSubmission();
      await asActor(teacher, async () => q(SQL_POLICY, [assignment, true, 1]));
      await refused(who.userId, SQL_REOPEN, [submission], /allows 1 version/i);
    });

    await test('a passed deadline keeps the mark rather than destroying it', async () => {
      // Handed in on time and marked, then the window closes behind them: a
      // self-paced deadline is relative to enrolment, so moving the enrolment
      // back 30 days is how a week of real time passes inside one test run.
      const { learner: who, submission } = await markedSubmission({
        dueAfterDays: 7,
        acceptLate: false,
      });
      assert((await submissionRow(submission)).is_late === false,
        'the first hand-in was recorded as late, so it was not on time to begin with');
      await q(
        `update public.course_enrolments
            set enrolled_at = now() - interval '30 days'
          where learner_profile_id = $1`, [who.learnerId]);

      await refused(who.userId, SQL_REOPEN, [submission], /this mark stands/i);
      const row = await submissionRow(submission);
      assert(row.status === 'graded' && Number(row.score_earned) === 6,
        'a refused reopen cost the learner their grade');
      assert((await snapshots(submission)).length === 0);
    });

    await test('a task that accepts late work can be revised after the deadline', async () => {
      const { learner: who, submission } = await markedSubmission({
        dueAfterDays: 7,
        enrolledDaysAgo: 30,
        acceptLate: true,
      });

      assert(await reopen(submission, who.userId) === 2);

      // And handing it in again records the revision as late, under the rule the
      // first hand-in was held to.
      await asActor(who.userId, async () => q(SQL_SUBMIT, [submission]));
      const row = await submissionRow(submission);
      assert(row.status === 'submitted' && row.is_late === true,
        'a late revision was not recorded as late');
    });

    await test('a closed task accepts no revisions', async () => {
      const { assignment, learner: who, submission } = await markedSubmission();
      await asActor(teacher, async () => q(SQL_CLOSE, [assignment]));
      await refused(who.userId, SQL_REOPEN, [submission], /not open for revisions/i);
    });

    await test('a guardian can revise a child’s work; another learner cannot', async () => {
      const assignment = await create();
      await asActor(teacher, async () => q(SQL_OPEN, [assignment]));
      const family = await parentWithChild();
      const outsider = await learner(0, 'Outsider');

      const childSubmission = await asActor(family.userId, async () =>
        (await q(SQL_SAVE, [assignment, family.childId, 'A child’s paragraph.'])).rows[0].id);
      await asActor(family.userId, async () => q(SQL_SUBMIT, [childSubmission]));
      await asActor(teacher, async () => q(SQL_MARK, [childSubmission, 7, 'Well done.']));

      await refused(outsider.userId, SQL_REOPEN, [childSubmission],
        /a learner you are responsible for/i);
      await refused(null, SQL_REOPEN, [childSubmission], /sign in to revise/i);

      assert(await reopen(childSubmission, family.userId) === 2);
      const snap = (await snapshots(childSubmission))[0];
      assert(snap.reopened_by === family.userId,
        'the snapshot did not record the guardian who asked for the revision');
    });

    await test('only the course author can change the revision policy', async () => {
      const { assignment, learner: who } = await markedSubmission();
      await refused(otherTeacher, SQL_POLICY, [assignment, false, null], /only the course author/i);
      await refused(who.userId, SQL_POLICY, [assignment, false, null], /only the course author/i);
      await asActor(admin, async () => q(SQL_POLICY, [assignment, true, 4]));
      await refused(teacher, SQL_POLICY, [assignment, true, 0], /at least one version/i);
    });

    await test('switching revisions off never traps a draft already reopened', async () => {
      const { assignment, learner: who, submission } = await markedSubmission();
      await reopen(submission, who.userId);
      await asActor(teacher, async () => q(SQL_POLICY, [assignment, false, null]));

      // The learner is holding a draft with no mark. Handing it in must still
      // work, or the teacher's decision would have cost the learner a grade.
      await asActor(who.userId, async () => q(SQL_SUBMIT, [submission]));
      const row = await submissionRow(submission);
      assert(row.status === 'submitted' && row.revision_number === 2);
      await refused(who.userId, SQL_REOPEN, [submission], /only marked work can be revised/i);
    });

    await test('a revised submission can be edited, re-filed and marked again', async () => {
      const { assignment, learner: who, submission } = await markedSubmission({
        body: 'Version one.',
        score: 5,
        feedback: 'Try again with a source.',
      });

      // A file can be attached to the reopened draft, because reopening makes it
      // a draft and the existing attachment rules already apply to drafts.
      const assetId = (await q(
        `insert into public.media_assets
           (storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,status,uploaded_by)
         values ('r2','masters',$1,$2,'image/jpeg',2000000,'available',$3) returning id`,
        [`revision/${crypto.randomUUID()}`,
         crypto.randomUUID().replace(/-/g, '').padEnd(64, 'a').slice(0, 64),
         who.userId])).rows[0].id;

      await reopen(submission, who.userId);
      await asActor(who.userId, async () => q(SQL_ATTACH, [submission, assetId]));
      await asActor(who.userId, async () =>
        q('select public.save_assignment_draft($1,$2,$3)', [assignment, who.learnerId, 'Version two, with a source.']));
      await asActor(who.userId, async () => q(SQL_SUBMIT, [submission]));
      await asActor(teacher, async () => q(SQL_MARK, [submission, 9, 'That is the one.']));

      const row = await submissionRow(submission);
      assert(row.body_text === 'Version two, with a source.');
      assert(Number(row.score_earned) === 9 && row.revision_number === 2);

      // Reopen again: the second marked version is snapshotted under its own
      // number, and the first snapshot is still there.
      await reopen(submission, who.userId);
      const snaps = await snapshots(submission);
      assert(snaps.length === 2, `expected two snapshots, got ${snaps.length}`);
      assert(snaps[0].revision_number === 1 && snaps[0].body_text === 'Version one.');
      assert(Number(snaps[0].score_earned) === 5);
      assert(snaps[1].revision_number === 2 && snaps[1].body_text === 'Version two, with a source.');
      assert(Number(snaps[1].score_earned) === 9);
      assert(Array.isArray(snaps[1].asset_ids) && snaps[1].asset_ids.length === 1,
        'the snapshot did not record which files accompanied the marked version');
    });

    await test('a snapshot cannot be rewritten or deleted', async () => {
      const { learner: who, submission } = await markedSubmission();
      await reopen(submission, who.userId);
      const snap = (await snapshots(submission))[0];

      let caught;
      try {
        await q('update public.assignment_submission_revisions set feedback=$1 where id=$2',
          ['Rewritten.', snap.id]);
      } catch (e) { caught = e; }
      assert(caught && /cannot be changed or deleted/i.test(String(caught.message)),
        'a snapshot of marked work was editable');

      caught = undefined;
      try {
        await q('delete from public.assignment_submission_revisions where id=$1', [snap.id]);
      } catch (e) { caught = e; }
      assert(caught && /cannot be changed or deleted/i.test(String(caught.message)),
        'a snapshot of marked work was deletable');
      assert((await snapshots(submission)).length === 1);
    });

    await test('snapshots are as private as the submission they came from', async () => {
      const { learner: who, submission } = await markedSubmission();
      await reopen(submission, who.userId);
      const outsider = await learner(0, 'Outsider');

      const mine = await asActor(who.userId, async () =>
        q('select feedback from public.assignment_submission_revisions where submission_id=$1', [submission]));
      assert(mine.rows.length === 1, 'the learner could not read their own marked version');

      const theirs = await asActor(outsider.userId, async () =>
        q('select feedback from public.assignment_submission_revisions where submission_id=$1', [submission]));
      assert(theirs.rows.length === 0,
        `another learner read ${theirs.rows.length} snapshots of somebody else’s work`);

      const authors = await asActor(teacher, async () =>
        q('select feedback from public.assignment_submission_revisions where submission_id=$1', [submission]));
      assert(authors.rows.length === 1, 'the course author could not read the snapshot');
    });

    await test('the audit records the transition, not the feedback text', async () => {
      const { learner: who, submission } = await markedSubmission({
        score: 6,
        feedback: 'Good start. Now cite the verse.',
      });
      await reopen(submission, who.userId);

      const events = (await q(
        `select actor, detail from public.governance_audit_events
          where target_type='assignment_submission' and action='assignment_submission.reopened'
            and target_id=$1`, [submission])).rows;
      assert(events.length === 1, `expected one reopen event, got ${events.length}`);
      assert(events[0].actor === who.userId);
      assert(events[0].detail.revision_number === 2);
      assert(Number(events[0].detail.previous_score) === 6,
        'the audit did not record the score that was given up');
      assert(!/cite the verse/i.test(JSON.stringify(events[0].detail)),
        'the feedback text was copied into the audit log');
    });
  } finally {
    await q("update public.platform_settings set value_text='false' where key='learning.assignments'");
  }

  // -------------------------------------------------------------------
  await test('revisions keep working after the feature is switched off', async () => {
    // Work in flight keeps its whole lifecycle, the same rule submitting and
    // marking follow. Gating the reopen would strand a learner holding an
    // unmarked draft.
    await q("update public.platform_settings set value_text='true' where key='learning.assignments'");
    const { learner: who, submission } = await markedSubmission();
    await q("update public.platform_settings set value_text='false' where key='learning.assignments'");

    assert(await reopen(submission, who.userId) === 2, 'switching the flag off trapped marked work');
    await asActor(who.userId, async () => q(SQL_SUBMIT, [submission]));
    assert((await submissionRow(submission)).status === 'submitted');
  });
}
