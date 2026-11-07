// Standalone assignments: deadlines, hand-ins, files and private marking.
//
// The assertions that matter are the ones this feature has which a quiz does
// not: a deadline tied to *this* learner's enrolment or to a cohort date, a
// file reference which is not a public URL, a family's right to submit for a
// child, and a teacher's feedback which no other learner can read.

export async function run(ctx) {
  const {
    q, test, assert, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('assignments-admin@example.com');
  const teacher = await newInstructor('assignments-teacher@example.com', admin);
  const otherTeacher = await newInstructor('assignments-other-teacher@example.com', admin);
  const reviewer = await newReviewer('assignments-reviewer@example.com', admin);

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'course assignments test']);

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
  async function learner(name = 'Learner', enrolIn = null) {
    seq += 1;
    const userId = await newUser(`assignments-learner-${seq}@example.com`);
    await newProfile(userId, `${name} ${seq}`);
    const learnerId = await committed(async () => {
      const id = (await q(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [`${name} ${seq}`, userId])).rows[0].id;
      if (enrolIn) {
        await q(
          `insert into public.course_enrolments
             (learner_profile_id, course_id, course_version_id, source, status)
           values ($1,$2,$3,'free','active')`, [id, enrolIn.course, enrolIn.version]);
      }
      return id;
    });
    return { userId, learnerId };
  }

  async function parentWithChild(enrolIn = null) {
    seq += 1;
    const userId = await newUser(`assignments-parent-${seq}@example.com`);
    await newProfile(userId, `Parent ${seq}`);
    const childId = await committed(async () => {
      const familyId = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, [`Assignment family ${seq}`, userId])).rows[0].id;
      await q(
        `insert into public.family_memberships
           (family_id, user_id, membership_type, status, joined_at, created_by)
         values ($1,$2,'owner','active',now(),$3)`, [familyId, userId, userId]);
      const id = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','8-10',$2,'active') returning id`, [`Child ${seq}`, familyId])).rows[0].id;
      if (enrolIn) {
        await q(
          `insert into public.course_enrolments
             (learner_profile_id, course_id, course_version_id, source, status)
           values ($1,$2,$3,'free','active')`, [id, enrolIn.course, enrolIn.version]);
      }
      return id;
    });
    await ctx.verifyGuardian(userId, childId);
    return { userId, childId };
  }

  async function asActor(actor, fn) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const result = await fn();
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  async function refused(actor, sql, params = [], pattern) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [actor === null ? '' : JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    await q('savepoint assignment_refusal');
    let caught;
    try { await q(sql, params); } catch (e) { caught = e; }
    await q('rollback to savepoint assignment_refusal');
    await q('rollback');
    assert(caught, `expected an error matching ${pattern}`);
    const message = String(caught.message ?? caught);
    assert(pattern.test(message), `expected ${pattern}; got: ${message.slice(0, 240)}`);
  }

  const SQL_CREATE = `select public.create_course_assignment(
    $1,$2,$3,$4,$5,$6,$7,$8) as id`;
  const SQL_STATUS = 'select public.set_course_assignment_status($1,$2)';
  const SQL_SAVE = 'select public.save_assignment_draft($1,$2,$3) as id';
  const SQL_ATTACH = 'select public.attach_assignment_asset($1,$2) as id';
  async function declaredFile(actor, submission, name = 'Page.jpg') {
    const declared = (await asActor(actor, () => q(
      'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission, name, 'image/jpeg', 1000, crypto.randomUUID().replace(/-/g, '').padEnd(64, 'a').slice(0, 64)]))).rows[0];
    await asActor(actor, () => q('select public.test_fixture_confirm_coursework($1)', [declared.asset_id]));
    return declared.asset_id;
  }

  const SQL_REMOVE = 'select public.remove_assignment_asset($1,$2)';
  const SQL_SUBMIT = 'select public.submit_assignment($1)';
  const SQL_MARK = 'select public.mark_assignment_submission($1,$2,$3)';

  const create = (actor, version, input = {}) => asActor(actor, async () =>
    (await q(SQL_CREATE, [
      version,
      input.cohortId ?? null,
      input.title ?? 'Write three things you learned',
      input.instructions ?? 'Use your own words.',
      input.dueAfterDays ?? null,
      input.dueAt ?? null,
      input.acceptLate ?? false,
      Object.prototype.hasOwnProperty.call(input, 'pointsPossible') ? input.pointsPossible : 10,
    ])).rows[0].id);

  const classFor = async (course, version) =>
    asActor(teacher, async () => (await q(
      `select public.create_cohort($1,$2,$3,$4, now() + interval '2 days',
              now() + interval '30 days', 20) as id`,
      [course, version, 'Assignment cohort', null])).rows[0].id);

  const { course, version } = await publishedCourse();

  // -------------------------------------------------------------------
  await test('assignments are separately gated and default off', async () => {
    const flag = (await q(
      `select value_text, description, preconditions from public.platform_settings
        where key='learning.assignments'`)).rows[0];
    assert(flag.value_text === 'false');
    assert(/relative to enrolment/i.test(flag.preconditions));
    await refused(teacher, SQL_CREATE,
      [version, null, 'Homework', '', 7, null, false, 10], /not enabled/i);
  });

  await q("update public.platform_settings set value_text='true' where key='learning.assignments'");
  await q("update public.platform_settings set value_text='true' where key='learning.cohorts'");
  let selfPaced;
  let cohort;
  let cohortAssignment;
  try {
    await test('the course author creates a self-paced assignment outside the frozen version', async () => {
      selfPaced = await create(teacher, version, { dueAfterDays: 7 });
      const row = (await q(
        `select status, due_after_days, due_at, cohort_id, created_by
           from public.course_assignments where id=$1`, [selfPaced])).rows[0];
      assert(row.status === 'draft');
      assert(row.due_after_days === 7);
      assert(row.due_at === null && row.cohort_id === null);
      assert(row.created_by === teacher);
      await asActor(teacher, async () => q(SQL_STATUS, [selfPaced, 'open']));
    });

    await test('the relative and absolute deadline models cannot be mixed', async () => {
      await refused(teacher, SQL_CREATE,
        [version, null, 'Wrong clock', '', 7, new Date(Date.now() + 86400000).toISOString(), false, 10],
        /self-paced work uses a relative deadline/i);

      cohort = await classFor(course, version);
      await asActor(teacher, async () => q('select public.set_cohort_status($1,$2)', [cohort, 'open']));
      const due = new Date(Date.now() + 10 * 86400000).toISOString();
      await refused(teacher, SQL_CREATE,
        [version, cohort, 'Wrong class clock', '', 7, due, false, 10],
        /cohort work uses an absolute date/i);
    });

    await test('a cohort assignment must use that cohort’s course and version and a valid date', async () => {
      const due = new Date(Date.now() + 10 * 86400000).toISOString();
      cohortAssignment = await create(teacher, version, {
        cohortId: cohort, dueAt: due, acceptLate: true, pointsPossible: 20,
        title: 'Recite and reflect',
      });
      await asActor(teacher, async () => q(SQL_STATUS, [cohortAssignment, 'open']));

      const other = await publishedCourse(otherTeacher);
      await refused(otherTeacher, SQL_CREATE,
        [other.version, cohort, 'Wrong course', '', null, due, false, 10],
        /cohort not found for this course version/i);

      const beforeStart = new Date(Date.now() + 86400000).toISOString();
      await refused(teacher, SQL_CREATE,
        [version, cohort, 'Too early', '', null, beforeStart, false, 10],
        /due date cannot be before the cohort starts/i);

      const afterEnd = new Date(Date.now() + 45 * 86400000).toISOString();
      await refused(teacher, SQL_CREATE,
        [version, cohort, 'Too late', '', null, afterEnd, false, 10],
        /due date cannot be after the cohort ends/i);
    });

    await test('a stranger cannot create or edit assignments, and direct inserts are denied', async () => {
      const stranger = await learner('Stranger');
      await refused(stranger.userId, SQL_CREATE,
        [version, null, 'Not mine', '', 7, null, false, 10], /only the course author/i);
      await refused(stranger.userId,
        `select public.update_course_assignment_draft($1,'Hijack','',7,null,false,10)`,
        [selfPaced], /only the course author/i);
      await refused(teacher,
        `insert into public.course_assignments
           (course_id,course_version_id,title,created_by)
         values ($1,$2,'Forged',$3)`,
        [course, version, teacher], /permission denied/i);
    });

    await test('assignment input is bounded and feedback-only work is valid', async () => {
      await refused(teacher, SQL_CREATE,
        [version, null, '   ', '', null, null, false, 10], /title must be between/i);
      await refused(teacher, SQL_CREATE,
        [version, null, 'Bad points', '', null, null, false, 0], /points possible must be greater/i);
      await refused(teacher, SQL_CREATE,
        [version, null, 'Fractional due', '', 0, null, false, 10], /at least one day/i);

      const feedbackOnly = await create(teacher, version, {
        title: 'Tell us what surprised you', dueAfterDays: null, pointsPossible: null,
      });
      const row = (await q('select points_possible from public.course_assignments where id=$1', [feedbackOnly])).rows[0];
      assert(row.points_possible === null);
    });

    await test('a draft can be revised before opening and freezes afterward', async () => {
      const draft = await create(teacher, version, { title: 'Draft wording', dueAfterDays: 3 });
      await asActor(teacher, async () => q(
        `select public.update_course_assignment_draft($1,'Revised title','Add one example.',5,null,true,15)`,
        [draft]));
      const row = (await q(
        'select title, instructions, due_after_days, accept_late, points_possible from public.course_assignments where id=$1',
        [draft])).rows[0];
      assert(row.title === 'Revised title' && row.instructions === 'Add one example.');
      assert(row.due_after_days === 5 && row.accept_late === true && Number(row.points_possible) === 15);
      await asActor(teacher, async () => q(SQL_STATUS, [draft, 'open']));
      await refused(teacher,
        `select public.update_course_assignment_draft($1,'Too late','',5,null,false,15)`,
        [draft], /only a draft assignment can be edited/i);
    });

    const enrolled = await learner('Self-paced', { course, version });
    const classLearner = await learner('Class member', { course, version });
    const outsider = await learner('Not in class', { course, version });
    const nonEnrolled = await learner('Not enrolled');
    await asActor(classLearner.userId, async () => q(
      'select public.join_cohort($1,$2)', [cohort, classLearner.learnerId]));

    await test('RLS exposes self-paced work only to matching enrolments and class work only to members', async () => {
      const own = await asActor(enrolled.userId, () => q(
        'select id from public.course_assignments where id=$1', [selfPaced]));
      assert(own.rows.length === 1);
      const unseen = await asActor(nonEnrolled.userId, () => q(
        'select id from public.course_assignments where id=$1', [selfPaced]));
      assert(unseen.rows.length === 0, 'an unenrolled learner saw the self-paced task');

      const member = await asActor(classLearner.userId, () => q(
        'select id from public.course_assignments where id=$1', [cohortAssignment]));
      assert(member.rows.length === 1, 'a cohort member could not read their task');
      const nonMember = await asActor(outsider.userId, () => q(
        'select id from public.course_assignments where id=$1', [cohortAssignment]));
      assert(nonMember.rows.length === 0, 'a course enrollee outside the cohort saw class work');

      const author = await asActor(teacher, () => q(
        'select id from public.course_assignments where id=$1', [cohortAssignment]));
      assert(author.rows.length === 1);
    });

    let submission;
    await test('a learner can save a private draft, but another learner cannot see it', async () => {
      submission = await asActor(enrolled.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, enrolled.learnerId, 'First thought.'])).rows[0].id);
      await asActor(enrolled.userId, async () => q(SQL_SAVE,
        [selfPaced, enrolled.learnerId, 'Revised while still a draft.']));
      const row = (await q(
        'select status, body_text, created_by from public.assignment_submissions where id=$1',
        [submission])).rows[0];
      assert(row.status === 'draft');
      assert(row.body_text === 'Revised while still a draft.');
      assert(row.created_by === enrolled.userId);

      const hidden = await asActor(outsider.userId, () => q(
        'select id from public.assignment_submissions where id=$1', [submission]));
      assert(hidden.rows.length === 0, 'another learner could read a private draft');
    });

    await test('a parent may submit for their own child, but a stranger may not', async () => {
      const family = await parentWithChild({ course, version });
      const childSubmission = await asActor(family.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, family.childId, 'A child’s own words.'])).rows[0].id);
      const own = await asActor(family.userId, () => q(
        'select learner_profile_id from public.assignment_submissions where id=$1', [childSubmission]));
      assert(own.rows[0].learner_profile_id === family.childId);

      await refused(outsider.userId, SQL_SAVE,
        [selfPaced, family.childId, 'Not the guardian.'], /learner you are responsible for/i);
    });

    await test('submission text and revisions require the learner, verified guardian, marker or owner', async () => {
      const family = await parentWithChild({ course, version });
      const childUser = await newUser(`assignments-child-login-${++seq}@example.com`);
      await newProfile(childUser, 'Child account');
      await q('update public.learner_profiles set linked_user_id=$1 where id=$2', [childUser, family.childId]);
      const member = await newUser(`assignments-family-member-${++seq}@example.com`);
      await newProfile(member, 'Unverified household member');
      const familyId = (await q('select family_id from public.learner_profiles where id=$1', [family.childId])).rows[0].family_id;
      await q(`insert into public.family_memberships
        (family_id,user_id,membership_type,status,joined_at,created_by)
        values ($1,$2,'guardian','active',now(),$3)`, [familyId, member, family.userId]);
      const childSubmission = await asActor(family.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, family.childId, 'Private answer.'])).rows[0].id);
      await declaredFile(family.userId, childSubmission, 'Private image.jpg');
      await asActor(family.userId, () => q(SQL_SUBMIT, [childSubmission]));
      await asActor(teacher, () => q(SQL_MARK, [childSubmission, 8, 'Private feedback.']));
      await asActor(family.userId, () => q('select public.reopen_assignment_submission($1)', [childSubmission]));
      const submissionRows = async (actor) => (await asActor(actor, () => q(
        'select body_text from public.assignment_submissions where id=$1', [childSubmission]))).rows;
      const revisionRows = async (actor) => (await asActor(actor, () => q(
        'select body_text, feedback from public.assignment_submission_revisions where submission_id=$1', [childSubmission]))).rows;
      const attachmentRows = async (actor) => (await asActor(actor, () => q(
        'select media_asset_id from public.assignment_submission_assets where submission_id=$1', [childSubmission]))).rows;
      for (const actor of [family.userId, childUser, teacher]) {
        assert((await submissionRows(actor)).length === 1 && (await revisionRows(actor)).length === 1 &&
          (await attachmentRows(actor)).length === 1, 'an authorized reader lost the submission, revision or attachment');
      }
      for (const actor of [member, admin, otherTeacher, outsider.userId]) {
        assert((await submissionRows(actor)).length === 0 && (await revisionRows(actor)).length === 0 &&
          (await attachmentRows(actor)).length === 0, 'an unauthorized reader saw private work or an attachment reference');
        await refused(actor, 'select public.assignment_submission_files($1)', [childSubmission], /not yours to read/i);
      }
      await q('select public.bootstrap_safeguarding_owner($1)', [admin]);
      try {
        assert((await submissionRows(admin)).length === 1 && (await revisionRows(admin)).length === 1,
          'the named safeguarding owner cannot inspect the submission');
      } finally {
        await q('delete from public.safeguarding_owner where singleton');
      }
      // The fixture has the general guardian switch off; the specific submission
      // reader must still reject an expired or scope-limited verification.
      await q('update public.guardian_relationships set can_view_progress=false where learner_profile_id=$1 and guardian_user_id=$2',
        [family.childId, family.userId]);
      assert((await submissionRows(family.userId)).length === 0 && (await revisionRows(family.userId)).length === 0);
      await q(`update public.guardian_relationships set can_view_progress=true, verified_at=now()-interval '2 years',
        consent_expires_at=now()-interval '1 year' where learner_profile_id=$1 and guardian_user_id=$2`,
        [family.childId, family.userId]);
      assert((await submissionRows(family.userId)).length === 0 && (await revisionRows(family.userId)).length === 0);
      assert((await submissionRows(childUser)).length === 1 && (await revisionRows(teacher)).length === 1);
    });

    await test('inactive learner, verified guardian and marker sessions cannot read or change coursework', async () => {
      const family = await parentWithChild({ course, version });
      const childUser = await newUser(`inactive-child-${++seq}@example.com`);
      await newProfile(childUser, 'Child login');
      await q('update public.learner_profiles set linked_user_id=$1 where id=$2', [childUser, family.childId]);
      const sub = await asActor(family.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, family.childId, 'Private work.'])).rows[0].id);
      const asset = await declaredFile(family.userId, sub, 'Private file.jpg');
      await asActor(family.userId, () => q(SQL_SUBMIT, [sub]));
      await asActor(teacher, () => q(SQL_MARK, [sub, 8, 'Private feedback.']));
      await asActor(family.userId, () => q('select public.reopen_assignment_submission($1)', [sub]));
      await asActor(family.userId, () => q(SQL_SUBMIT, [sub]));

      const setStatus = (actor, status, deleted) => committed(async () => {
        await q("select set_config('app.account_erasure','on',true)");
        await q('update public.user_profiles set account_status=$2, deleted_at=$3 where user_id=$1', [actor, status, deleted]);
      });
      const rows = async (actor, table, col) => (await asActor(actor, () => q(
        `select 1 from public.${table} where ${col}=$1`, [sub]))).rows.length;
      for (const actor of [family.userId, childUser, teacher]) {
        assert(await rows(actor, 'assignment_submissions', 'id') === 1, 'active actor lacked the submission');
        assert((await asActor(actor, () => q('select public.may_watch_master($1) as allowed', [asset]))).rows[0].allowed === true,
          'active actor could not open the file');
        try {
          for (const [status, deleted] of [['suspended', null], ['closed', new Date().toISOString()], ['active', new Date().toISOString()]]) {
            await setStatus(actor, status, deleted);
            assert(await rows(actor, 'assignment_submissions', 'id') === 0 &&
              await rows(actor, 'assignment_submission_revisions', 'submission_id') === 0 &&
              await rows(actor, 'assignment_submission_assets', 'submission_id') === 0,
              'inactive actor could read coursework through RLS');
            assert((await asActor(actor, () => q('select public.may_watch_master($1) as allowed', [asset]))).rows[0].allowed === false,
              'inactive actor could open a coursework master');
            await refused(actor, 'select public.assignment_submission_files($1)', [sub], /not yours to read/i);
            const exported = (await asActor(actor, () => q('select public.export_my_data() as doc'))).rows[0].doc;
            assert(!exported.assignments.some(item => item.body === 'Private work.'),
              'inactive actor obtained coursework through personal export');
            if (actor === teacher) {
              await refused(actor, SQL_MARK, [sub, 9, 'Should not save'], /active account/i);
              await refused(actor, 'select public.record_coursework_review($1,$2,$3)', [asset, 'clear', null], /active account/i);
              await refused(actor, 'select public.record_coursework_review_internal($1,$2,$3)', [asset, 'clear', null], /permission denied/i);
            }
            else await refused(actor, SQL_SAVE, [selfPaced, family.childId, 'Should not save'], /currently verified guardian/i);
          }
        } finally { await setStatus(actor, 'active', null); }
        assert(await rows(actor, 'assignment_submissions', 'id') === 1, 'reinstatement did not restore access');
      }
      await asActor(teacher, () => q(SQL_MARK, [sub, 9, 'After reinstatement.']));
      assert((await q('select feedback from public.assignment_submissions where id=$1', [sub])).rows[0].feedback === 'After reinstatement.');
    });

    await test('assignment writes require the learner or current guardian, and only the marker grades', async () => {
      const family = await parentWithChild({ course, version });
      const member = await newUser(`assignment-writer-member-${++seq}@example.com`);
      await newProfile(member, 'Unverified household member');
      const familyId = (await q('select family_id from public.learner_profiles where id=$1', [family.childId])).rows[0].family_id;
      await q(`insert into public.family_memberships
        (family_id,user_id,membership_type,status,joined_at,created_by)
        values ($1,$2,'guardian','active',now(),$3)`, [familyId, member, family.userId]);
      const childSubmission = await asActor(family.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, family.childId, 'Original answer.'])).rows[0].id);
      const file = await declaredFile(family.userId, childSubmission);
      for (const actor of [member, admin, teacher]) {
        await refused(actor, SQL_SAVE, [selfPaced, family.childId, 'Changed by another account.'], /currently verified guardian/i);
        await refused(actor, SQL_SUBMIT, [childSubmission], /currently verified guardian/i);
        await refused(actor, SQL_REMOVE, [childSubmission, file], /currently verified guardian/i);
      }
      assert((await q('select body_text from public.assignment_submissions where id=$1', [childSubmission])).rows[0].body_text === 'Original answer.');
      await q('select public.bootstrap_safeguarding_owner($1)', [admin]);
      try {
        await asActor(family.userId, () => q(SQL_SUBMIT, [childSubmission]));
        await refused(admin, SQL_MARK, [childSubmission, 5, 'Not the assigned marker.'], /only the course author/i);
        await refused(otherTeacher, SQL_MARK, [childSubmission, 5, 'Not the assigned marker.'], /only the course author/i);
        await asActor(teacher, () => q(SQL_MARK, [childSubmission, 8, 'Marked by the author.']));
        await refused(member, 'select public.reopen_assignment_submission($1)', [childSubmission], /currently verified guardian/i);
        await refused(admin, 'select public.reopen_assignment_submission($1)', [childSubmission], /currently verified guardian/i);
        assert((await q('select status from public.assignment_submissions where id=$1', [childSubmission])).rows[0].status === 'graded');
        for (const [sql, args] of [
          ['select public.save_assignment_draft_internal($1,$2,$3)', [selfPaced, family.childId, 'x']],
          ['select public.submit_assignment_internal($1)', [childSubmission]],
          ['select public.reopen_assignment_submission_internal($1)', [childSubmission]],
          ['select public.remove_assignment_asset_internal($1,$2)', [childSubmission, file]],
          ['select public.mark_assignment_submission_internal($1,$2,$3)', [childSubmission, 5, 'x']],
        ]) await refused(admin, sql, args, /permission denied/i);
        await q(`update public.guardian_relationships set verified_at=now()-interval '2 years',
          consent_expires_at=now()-interval '1 year' where learner_profile_id=$1 and guardian_user_id=$2`,
          [family.childId, family.userId]);
        await refused(family.userId, 'select public.reopen_assignment_submission($1)', [childSubmission], /currently verified guardian/i);
        await q(`update public.guardian_relationships set verified_at=now()-interval '1 day',
          consent_expires_at=now()+interval '1 year' where learner_profile_id=$1 and guardian_user_id=$2`,
          [family.childId, family.userId]);
        const reopened = await asActor(family.userId, () => q('select public.reopen_assignment_submission($1) as revision', [childSubmission]));
        assert(Number(reopened.rows[0].revision) === 2, 'verified guardian could not reopen the work');
      } finally {
        await q('delete from public.safeguarding_owner where singleton');
      }
    });

    await test('data export respects current learner and guardian authority, including counts', async () => {
      const family = await parentWithChild({ course, version });
      const member = await newUser(`assignment-export-member-${++seq}@example.com`);
      await newProfile(member, 'Unverified family member');
      const childUser = await newUser(`assignment-export-child-${++seq}@example.com`);
      await newProfile(childUser, 'Learner account');
      const familyId = (await q('select family_id from public.learner_profiles where id=$1', [family.childId])).rows[0].family_id;
      await q(`insert into public.family_memberships
        (family_id,user_id,membership_type,status,joined_at,created_by)
        values ($1,$2,'guardian','active',now(),$3)`, [familyId, member, family.userId]);
      await q('update public.learner_profiles set linked_user_id=$1 where id=$2', [childUser, family.childId]);
      const sub = await asActor(family.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, family.childId, 'Private export answer.'])).rows[0].id);
      await asActor(family.userId, () => q(SQL_SUBMIT, [sub]));
      await asActor(teacher, () => q(SQL_MARK, [sub, 8, 'Private feedback.']));
      const flag = (await q("select value_text from public.platform_settings where key='family.guardian_verification'")).rows[0].value_text;
      await q("update public.platform_settings set value_text='false' where key='family.guardian_verification'");
      const get = async actor => (await asActor(actor, () => q('select public.export_my_data() as document'))).rows[0].document;
      try {
        for (const actor of [family.userId, childUser]) {
          const doc = await get(actor);
          assert(doc.assignments.some(row => row.body === 'Private export answer.' && row.feedback === 'Private feedback.'));
          assert(doc.meta.counts.assignments >= 1, 'authorized count omitted the work');
        }
        const excluded = async actor => {
          const doc = await get(actor);
          assert(!doc.assignments.some(row => row.body === 'Private export answer.'));
          assert(doc.meta.counts.assignments === 0 && doc.learners.length === 0,
            'unauthorized export or its counts exposed the learner');
          assert(doc.notIncluded.some(row => /Learner records without current access/.test(row.what)));
        };
        await excluded(member);
        await q(`update public.guardian_relationships set can_view_progress=false
          where learner_profile_id=$1 and guardian_user_id=$2`, [family.childId, family.userId]);
        await excluded(family.userId);
        await q(`update public.guardian_relationships set can_view_progress=true, verified_at=now()+interval '1 day',
          consent_expires_at=now()+interval '2 days' where learner_profile_id=$1 and guardian_user_id=$2`, [family.childId, family.userId]);
        await excluded(family.userId);
        await q(`update public.guardian_relationships set verified_at=now()-interval '2 years',
          consent_expires_at=now()-interval '1 year' where learner_profile_id=$1 and guardian_user_id=$2`, [family.childId, family.userId]);
        await excluded(family.userId);
        const childDoc = await get(childUser);
        assert(childDoc.assignments.some(row => row.body === 'Private export answer.'), 'the learner lost their own data');
      } finally {
        await q("update public.platform_settings set value_text=$1 where key='family.guardian_verification'", [flag]);
      }
    });

    await test('closing a guardian account cannot erase another learner’s submission', async () => {
      const family = await parentWithChild({ course, version });
      const remaining = await newUser(`assignment-close-other-${++seq}@example.com`);
      await newProfile(remaining, 'Other family member');
      const familyId = (await q('select family_id from public.learner_profiles where id=$1', [family.childId])).rows[0].family_id;
      await q(`insert into public.family_memberships (family_id,user_id,membership_type,status,joined_at,created_by)
        values ($1,$2,'guardian','active',now(),$3)`, [familyId, remaining, family.userId]);
      const sub = await asActor(family.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, family.childId, 'Keep this learner answer.'])).rows[0].id);
      const name = (await q('select display_name from public.user_profiles where user_id=$1', [family.userId])).rows[0].display_name;
      const result = await asActor(family.userId, () => q('select public.erase_my_account($1) as r', [name]));
      assert(result.rows[0].r.closed === true, 'the guardian account did not close');
      const row = (await q('select body_text from public.assignment_submissions where id=$1', [sub])).rows[0];
      assert(row.body_text === 'Keep this learner answer.', 'closing a guardian erased another learner’s answer');
      assert((await q('select deleted_at from public.learner_profiles where id=$1', [family.childId])).rows[0].deleted_at === null);
    });

    await test('closing the last family account puts unheld child coursework on the 30-day erasure path', async () => {
      const family = await parentWithChild({ course, version });
      const sub = await asActor(family.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, family.childId, 'Work for erasure.'])).rows[0].id);
      const asset = await declaredFile(family.userId, sub, 'Child work.jpg');
      await asActor(family.userId, () => q(SQL_SUBMIT, [sub]));
      const name = (await q('select display_name from public.user_profiles where user_id=$1', [family.userId])).rows[0].display_name;
      const closed = await asActor(family.userId, () => q('select public.erase_my_account($1) as result', [name]));
      assert(closed.rows[0].result.closed === true, 'unheld child coursework blocked account closure');
      assert((await q('select body_text from public.assignment_submissions where id=$1', [sub])).rows[0].body_text === 'Work for erasure.',
        'the child’s work was blanked before its 30-day erasure');
      await q(`update public.learner_profiles set deleted_at=now()-interval '31 days' where id=$1`, [family.childId]);
      await asActor(admin, () => q('select public.run_retention_jobs()'));
      assert((await q('select id from public.assignment_submissions where id=$1', [sub])).rows.length === 0,
        'child coursework survived the 30-day erasure run');
      const object = (await q('select deleted_at, purge_due_at, purged_at from public.media_assets where id=$1', [asset])).rows[0];
      assert(object.deleted_at && object.purge_due_at && new Date(object.purge_due_at) <= new Date(),
        'the coursework object was not queued for immediate storage deletion');
      assert(object.purged_at === null, 'the database pretended to delete the storage object');
    });

    await test('closing the last family account with held coursework needs individual review', async () => {
      const family = await parentWithChild({ course, version });
      const sub = await asActor(family.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, family.childId, 'Work under hold.'])).rows[0].id);
      const asset = await declaredFile(family.userId, sub, 'Held work.jpg');
      await q('select public.bootstrap_safeguarding_owner($1)', [admin]);
      try {
        await asActor(admin, () => q('select public.hold_coursework_file($1,$2)', [asset, 'An unresolved concern']));
        const name = (await q('select display_name from public.user_profiles where user_id=$1', [family.userId])).rows[0].display_name;
        await refused(family.userId, 'select public.erase_my_account($1)', [name], /privacy@ayahspring\.com/i);
        assert((await q('select body_text from public.assignment_submissions where id=$1', [sub])).rows[0].body_text === 'Work under hold.');
        assert((await q('select account_status from public.user_profiles where user_id=$1', [family.userId])).rows[0].account_status !== 'closed');
      } finally {
        if ((await q('select 1 from public.coursework_retention_holds where asset_id=$1 and closed_at is null', [asset])).rows.length) {
          await asActor(admin, () => q('select public.release_coursework_hold($1,$2)', [asset, 'Test fixture cleanup']));
        }
        await q('delete from public.safeguarding_owner where singleton');
      }
    });

    await test('a held detached revision blocks last-guardian closure until release', async () => {
      const family=await parentWithChild({ course,version });
      const sub=await asActor(family.userId,async () => (await q(SQL_SAVE,[selfPaced,family.childId,'Held earlier work.'])).rows[0].id);
      const asset=await declaredFile(family.userId,sub,'Earlier held page.jpg');
      await asActor(family.userId,() => q(SQL_SUBMIT,[sub]));
      await asActor(teacher,() => q(SQL_MARK,[sub,8,'Earlier feedback.']));
      await asActor(family.userId,() => q('select public.reopen_assignment_submission($1)',[sub]));
      await asActor(family.userId,() => q('select public.remove_assignment_asset($1,$2)',[sub,asset]));
      // Isolate a historical snapshot whose upload declaration is no longer present.
      await q('delete from public.coursework_upload_declarations where asset_id=$1',[asset]);
      const pending=(await asActor(family.userId,() => q('select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
        [sub,'Pending held page.jpg','image/jpeg',1000,crypto.randomUUID().replace(/-/g,'').padEnd(64,'a')]))).rows[0].asset_id;
      await q('select public.bootstrap_safeguarding_owner($1)',[admin]);
      try {
        await asActor(admin,() => q('select public.hold_coursework_file($1,$2)',[asset,'An unresolved concern']));
        await asActor(admin,() => q('select public.hold_coursework_file($1,$2)',[pending,'Another unresolved concern']));
        const name=(await q('select display_name from public.user_profiles where user_id=$1',[family.userId])).rows[0].display_name;
        await refused(family.userId,'select public.erase_my_account($1)',[name],/privacy@ayahspring\.com/i);
        assert((await q('select account_status from public.user_profiles where user_id=$1',[family.userId])).rows[0].account_status!=='closed');
        await asActor(admin,() => q('select public.release_coursework_hold($1,$2)',[asset,'The concern was reviewed']));
        await refused(family.userId,'select public.erase_my_account($1)',[name],/privacy@ayahspring\.com/i);
        await asActor(admin,() => q('select public.release_coursework_hold($1,$2)',[pending,'The other concern was reviewed']));
        const receipt=await asActor(family.userId,() => q('select public.erase_my_account($1) as result',[name]));
        assert(receipt.rows[0].result.closed===true,'released hold still blocked closure');
      } finally {
        for (const id of [asset,pending]) if ((await q('select 1 from public.coursework_retention_holds where asset_id=$1 and closed_at is null',[id])).rows.length)
          await asActor(admin,() => q('select public.release_coursework_hold($1,$2)',[id,'Test fixture cleanup']));
        await q('delete from public.safeguarding_owner where singleton');
      }
    });

    await test('a held older library-labelled hand-in blocks last-guardian closure', async () => {
      const family=await parentWithChild({course,version});
      const sub=await asActor(family.userId,async () => (await q(SQL_SAVE,[selfPaced,family.childId,'Older work.'])).rows[0].id);
      const legacy=(await q(`insert into public.media_assets(storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,status,uploaded_by)
        values('r2','masters',$1,$2,'image/jpeg',1000,'available',$3) returning id`,
        [`legacy-held/${crypto.randomUUID()}`,crypto.randomUUID().replace(/-/g,'').padEnd(64,'a'),family.userId])).rows[0].id;
      await q('alter table public.assignment_submission_assets disable trigger assignment_assets_coursework_only');
      try { await q('insert into public.assignment_submission_assets(submission_id,media_asset_id,attached_by) values($1,$2,$3)',[sub,legacy,family.userId]); }
      finally { await q('alter table public.assignment_submission_assets enable trigger assignment_assets_coursework_only'); }
      await q('select public.bootstrap_safeguarding_owner($1)',[admin]);
      try {
        await asActor(admin,()=>q('select public.hold_coursework_file($1,$2)',[legacy,'An older concern remains open']));
        const name=(await q('select display_name from public.user_profiles where user_id=$1',[family.userId])).rows[0].display_name;
        await refused(family.userId,'select public.erase_my_account($1)',[name],/privacy@ayahspring\.com/i);
        await asActor(admin,()=>q('select public.release_coursework_hold($1,$2)',[legacy,'The older concern was reviewed']));
        const receipt=await asActor(family.userId,()=>q('select public.erase_my_account($1) as result',[name]));
        assert(receipt.rows[0].result.closed===true,'released older work still blocked closure');
      } finally {
        if ((await q('select 1 from public.coursework_retention_holds where asset_id=$1 and closed_at is null',[legacy])).rows.length)
          await asActor(admin,()=>q('select public.release_coursework_hold($1,$2)',[legacy,'Test fixture cleanup']));
        await q('delete from public.safeguarding_owner where singleton');
      }
    });

    await test('an offline-only held legacy file blocks last-guardian closure', async () => {
      const family=await parentWithChild({course,version});
      const sub=await asActor(family.userId,async () => (await q(SQL_SAVE,[selfPaced,family.childId,'Older offline work.'])).rows[0].id);
      const legacy=(await q(`insert into public.media_assets(storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,status,uploaded_by)
        values('r2','masters',$1,$2,'image/jpeg',1000,'available',$3) returning id`,
        [`legacy-offline/${crypto.randomUUID()}`,crypto.randomUUID().replace(/-/g,'').padEnd(64,'a'),family.userId])).rows[0].id;
      await q('alter table public.assignment_submission_assets disable trigger assignment_assets_coursework_only');
      try { await q('insert into public.assignment_submission_assets(submission_id,media_asset_id,attached_by) values($1,$2,$3)',[sub,legacy,family.userId]); }
      finally { await q('alter table public.assignment_submission_assets enable trigger assignment_assets_coursework_only'); }
      await q('delete from public.assignment_submission_assets where media_asset_id=$1',[legacy]);
      const lesson=(await q(`select l.id from public.lessons l join public.course_sections cs on cs.id=l.section_id where cs.course_version_id=$1 limit 1`,[version])).rows[0].id;
      const device=(await q('insert into public.offline_devices(learner_profile_id,device_key) values($1,$2) returning id',[family.childId,'offline-closure-device-123'])).rows[0].id;
      await q(`insert into public.offline_downloads(device_id,learner_profile_id,lesson_id,media_asset_id,expires_at)
        values($1,$2,$3,$4,now()+interval '1 day')`,[device,family.childId,lesson,legacy]);
      await q('select public.bootstrap_safeguarding_owner($1)',[admin]);
      try {
        await asActor(admin,()=>q('select public.hold_coursework_file($1,$2)',[legacy,'The offline concern remains open']));
        const name=(await q('select display_name from public.user_profiles where user_id=$1',[family.userId])).rows[0].display_name;
        await refused(family.userId,'select public.erase_my_account($1)',[name],/privacy@ayahspring\.com/i);
        await asActor(admin,()=>q('select public.release_coursework_hold($1,$2)',[legacy,'The offline concern was reviewed']));
        const receipt=await asActor(family.userId,()=>q('select public.erase_my_account($1) as result',[name]));
        assert(receipt.rows[0].result.closed===true,'released offline-only work still blocked closure');
      } finally {
        if ((await q('select 1 from public.coursework_retention_holds where asset_id=$1 and closed_at is null',[legacy])).rows.length)
          await asActor(admin,()=>q('select public.release_coursework_hold($1,$2)',[legacy,'Test fixture cleanup']));
        await q('delete from public.safeguarding_owner where singleton');
      }
    });

    await test('closing the last family account with a separate child login requires review', async () => {
      const family = await parentWithChild({ course, version });
      const child = await newUser(`assignment-close-child-${++seq}@example.com`);
      await newProfile(child, 'Child login');
      await q('update public.learner_profiles set linked_user_id=$1 where id=$2', [child, family.childId]);
      const name = (await q('select display_name from public.user_profiles where user_id=$1', [family.userId])).rows[0].display_name;
      await refused(family.userId, 'select public.erase_my_account($1)', [name], /privacy@ayahspring\.com/i);
      assert((await q('select deleted_at from public.learner_profiles where id=$1', [family.childId])).rows[0].deleted_at === null);
    });

    await test('submission requires matching course version and cohort membership', async () => {
      const unjoined = await learner('Not joined', { course, version });
      await refused(unjoined.userId, SQL_SAVE,
        [cohortAssignment, unjoined.learnerId, 'A class answer.'], /active enrolment in this exact course version and cohort/i);
    });

    await test('empty work cannot be submitted, and direct writes are denied', async () => {
      const empty = await asActor(enrolled.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, enrolled.learnerId, ''])).rows[0].id);
      await refused(enrolled.userId, SQL_SUBMIT, [empty], /write an answer or attach a file/i);
      await refused(enrolled.userId,
        `update public.assignment_submissions set body_text='forged' where id=$1`,
        [submission], /permission denied/i);
    });

    await test('file attachments require a verified, owned, supported asset under the size limit', async () => {
      async function asset(owner, mime, size, status = 'available') {
        return (await q(
          `insert into public.media_assets
             (storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,status,uploaded_by)
           values ('r2','masters',$1,$2,$3,$4,$5,$6) returning id`,
          [`assignment/${crypto.randomUUID()}`, crypto.randomUUID().replace(/-/g, '').padEnd(64, 'a').slice(0, 64), mime, size, status, owner])).rows[0].id;
      }

      const photo = await asset(enrolled.userId, 'image/jpeg', 2_000_000);
      await refused(enrolled.userId, SQL_ATTACH, [submission, photo], /must be declared coursework/i);
      await declaredFile(enrolled.userId, submission);
      assert((await q(
        'select count(*)::int n from public.assignment_submission_assets where submission_id=$1',
        [submission])).rows[0].n === 1);

      const foreign = await asset(outsider.userId, 'application/pdf', 1000);
      await refused(enrolled.userId, SQL_ATTACH, [submission, foreign], /only the uploader/i);
      const pending = await asset(enrolled.userId, 'image/png', 1000, 'pending');
      await refused(enrolled.userId, SQL_ATTACH, [submission, pending], /verified and available/i);
      const unsupported = await asset(enrolled.userId, 'application/x-msdownload', 1000);
      await refused(enrolled.userId, SQL_ATTACH, [submission, unsupported], /file type is not supported/i);
      const tooLarge = await asset(enrolled.userId, 'audio/mp4', 26_214_401);
      await refused(enrolled.userId, SQL_ATTACH, [submission, tooLarge], /cannot exceed 25 MiB/i);
    });

    await test('a learner submits, the author marks, and feedback stays private', async () => {
      await asActor(enrolled.userId, async () => q(SQL_SUBMIT, [submission]));
      const submitted = (await q(
        'select status, is_late, submitted_by from public.assignment_submissions where id=$1',
        [submission])).rows[0];
      assert(submitted.status === 'submitted' && submitted.is_late === false);
      assert(submitted.submitted_by === enrolled.userId);

      await refused(outsider.userId, SQL_MARK, [submission, 8, 'Good work.'], /only the course author/i);
      await asActor(teacher, async () => q(SQL_MARK, [submission, 8, 'Clear explanation; review the second point.']));
      const graded = (await q(
        'select status, score_earned, feedback, marked_by from public.assignment_submissions where id=$1',
        [submission])).rows[0];
      assert(graded.status === 'graded' && Number(graded.score_earned) === 8);
      assert(graded.feedback === 'Clear explanation; review the second point.');
      assert(graded.marked_by === teacher);

      const visible = await asActor(enrolled.userId, () => q(
        'select feedback from public.assignment_submissions where id=$1', [submission]));
      assert(visible.rows[0].feedback === graded.feedback);
      const hidden = await asActor(outsider.userId, () => q(
        'select id from public.assignment_submissions where id=$1', [submission]));
      assert(hidden.rows.length === 0, 'another learner read the feedback');
      await refused(enrolled.userId, SQL_SUBMIT, [submission], /only an open draft/i);
      await refused(enrolled.userId, SQL_REMOVE, [submission, (await q(
        'select media_asset_id from public.assignment_submission_assets where submission_id=$1',
        [submission])).rows[0].media_asset_id], /files can only be removed/i);
    });

    await test('score and feedback constraints are enforced', async () => {
      const second = await learner('Score bounds', { course, version });
      const draft = await asActor(second.userId, async () =>
        (await q(SQL_SAVE, [selfPaced, second.learnerId, 'An answer.'])).rows[0].id);
      await asActor(second.userId, async () => q(SQL_SUBMIT, [draft]));
      await refused(teacher, SQL_MARK, [draft, 11, 'Too many points.'], /score must be between/i);
      await refused(teacher, SQL_MARK, [draft, null, ''], /provide a score or written feedback/i);
      await asActor(teacher, async () => q(SQL_MARK, [draft, 10, null]));
    });

    await test('relative deadlines use the learner’s enrolment time and record late work', async () => {
      const overdue = await create(teacher, version, {
        title: 'No late work', dueAfterDays: 1, acceptLate: false,
      });
      await asActor(teacher, async () => q(SQL_STATUS, [overdue, 'open']));
      const lateLearner = await learner('Overdue', { course, version });
      await q("update public.course_enrolments set enrolled_at=now() - interval '3 days' where learner_profile_id=$1 and course_id=$2",
        [lateLearner.learnerId, course]);
      const lateDraft = await asActor(lateLearner.userId, async () =>
        (await q(SQL_SAVE, [overdue, lateLearner.learnerId, 'Too late.'])).rows[0].id);
      await refused(lateLearner.userId, SQL_SUBMIT, [lateDraft], /deadline has passed/i);

      const accepted = await create(teacher, version, {
        title: 'Late accepted', dueAfterDays: 1, acceptLate: true,
      });
      await asActor(teacher, async () => q(SQL_STATUS, [accepted, 'open']));
      const acceptedDraft = await asActor(lateLearner.userId, async () =>
        (await q(SQL_SAVE, [accepted, lateLearner.learnerId, 'Accepted late.'])).rows[0].id);
      await asActor(lateLearner.userId, async () => q(SQL_SUBMIT, [acceptedDraft]));
      const row = (await q('select is_late from public.assignment_submissions where id=$1', [acceptedDraft])).rows[0];
      assert(row.is_late === true);
    });

    await test('an absolute cohort deadline can also accept late work', async () => {
      const late = await create(teacher, version, {
        cohortId: cohort,
        title: 'Cohort recitation',
        dueAt: new Date(Date.now() + 10 * 86400000).toISOString(),
        acceptLate: true,
      });
      await asActor(teacher, async () => q(SQL_STATUS, [late, 'open']));
      await q("update public.course_assignments set due_at=now() - interval '1 hour' where id=$1", [late]);
      const draft = await asActor(classLearner.userId, async () =>
        (await q(SQL_SAVE, [late, classLearner.learnerId, 'A late recitation.'])).rows[0].id);
      await asActor(classLearner.userId, async () => q(SQL_SUBMIT, [draft]));
      const row = (await q('select is_late from public.assignment_submissions where id=$1', [draft])).rows[0];
      assert(row.is_late === true);
    });

    await test('files cannot be added or removed after the learner submits', async () => {
      const fileDraft = await asActor(classLearner.userId, async () =>
        (await q(SQL_SAVE, [cohortAssignment, classLearner.learnerId, 'My answer.'])).rows[0].id);
      const file = await declaredFile(classLearner.userId, fileDraft, 'Page.jpg');
      await asActor(classLearner.userId, async () => q(SQL_SUBMIT, [fileDraft]));
      await refused(classLearner.userId, SQL_REMOVE, [fileDraft, file], /files can only be removed/i);
    });

    await test('turning assignments off does not strand open work or feedback', async () => {
      const ongoing = await create(teacher, version, {
        title: 'In flight before switch-off', dueAfterDays: null,
      });
      await asActor(teacher, async () => q(SQL_STATUS, [ongoing, 'open']));
      await q("update public.platform_settings set value_text='false' where key='learning.assignments'");
      await refused(teacher, SQL_CREATE,
        [version, null, 'New task while off', '', 7, null, false, 10], /not enabled/i);
      const work = await learner('In flight', { course, version });
      const draft = await asActor(work.userId, async () =>
        (await q(SQL_SAVE, [ongoing, work.learnerId, 'Finished after switch-off.'])).rows[0].id);
      await asActor(work.userId, async () => q(SQL_SUBMIT, [draft]));
      await asActor(teacher, async () => q(SQL_MARK, [draft, null, 'Received and reviewed.']));
      const row = (await q('select status, feedback from public.assignment_submissions where id=$1', [draft])).rows[0];
      assert(row.status === 'graded' && row.feedback === 'Received and reviewed.');
    });

    await test('assignment lifecycle actions are audited', async () => {
      const actions = (await q(
        `select action from public.governance_audit_events
          where target_type in ('course_assignment','assignment_submission')`)).rows.map((r) => r.action);
      for (const expected of [
        'course_assignment.created', 'course_assignment.open',
        'assignment_submission.draft_saved', 'assignment_submission.submitted',
        'assignment_submission.graded', 'coursework.file_handed_in',
      ]) assert(actions.includes(expected), `missing audit action ${expected}`);
    });
  } finally {
    await q("update public.platform_settings set value_text='false' where key='learning.assignments'");
    await q("update public.platform_settings set value_text='false' where key='learning.cohorts'");
  }
}
