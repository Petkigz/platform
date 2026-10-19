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
      await asActor(enrolled.userId, async () => q(SQL_ATTACH, [submission, photo]));
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
      const file = (await q(
        `insert into public.media_assets
           (storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,status,uploaded_by)
         values ('r2','masters',$1,$2,'application/pdf',1000,'available',$3) returning id`,
        [`assignment/${crypto.randomUUID()}`, crypto.randomUUID().replace(/-/g, '').padEnd(64, 'b').slice(0, 64), classLearner.userId])).rows[0].id;
      await asActor(classLearner.userId, async () => q(SQL_ATTACH, [fileDraft, file]));
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
        'assignment_submission.graded', 'assignment_submission.file_attached',
      ]) assert(actions.includes(expected), `missing audit action ${expected}`);
    });
  } finally {
    await q("update public.platform_settings set value_text='false' where key='learning.assignments'");
    await q("update public.platform_settings set value_text='false' where key='learning.cohorts'");
  }
}
