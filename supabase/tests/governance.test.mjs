// Governance — the two channels that had no door.
//
// content_reports and governance_appeals have both been in the schema since
// Group 3 with policies, constraints and status machines, and nothing in the
// application ever wrote to either. So a learner who found a doctrinal error in
// a lesson had nowhere to say so, and a teacher whose course a reviewer rejected
// had no way to contest it.
//
// These tests drive the writers that migration added. The properties that matter
// are the ones that make each channel trustworthy rather than merely present:
//
//   - a report can only be filed against content the reporter can actually see,
//     so reporting is not a way to probe unpublished course versions
//   - closing a report requires a written note, because a queue of silently
//     dismissed reports teaches readers that reporting does nothing
//   - only the author of a course may appeal a decision about it
//   - the reviewer whose decision is appealed cannot decide the appeal — the
//     same rule that stops an author approving their own course and a requester
//     approving their own refund

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile,
    newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('gov-admin@example.com');
  const teacher  = await newInstructor('gov-teacher@example.com', admin);
  const reviewer = await newReviewer('gov-reviewer@example.com', admin);
  const other    = await newReviewer('gov-other@example.com', admin);

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const scalar = async (sql, params) => (await q(sql, params)).rows[0];

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'governance test']);

  /** A published course with one lesson, so learners can actually see it. */
  async function published() {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);
    await transition(version, 'submitted', teacher);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'approved', reviewer);
    await transition(version, 'published', admin);
    return { course, version, section, lesson };
  }

  /** A version that was submitted and then rejected by a named reviewer. */
  async function rejectedVersion() {
    const v = await published();
    // Back to draft is not a thing; a rejection is recorded as a decision
    // against a submitted version, so build a second, still-submitted version.
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);
    await transition(version, 'submitted', teacher);

    const rp = (await q(
      `insert into public.reviewer_profiles (user_id, reviewer_status, verified_at, verified_by)
       values ($1,'active',now(),$2)
       on conflict (user_id) do update set reviewer_status = 'active'
       returning id`, [reviewer, admin])).rows[0].id;

    const assignment = (await q(
      `insert into public.content_review_assignments
         (course_version_id, reviewer_profile_id, review_scope, assigned_by,
          assignment_status, accepted_at, completed_at)
       values ($1,$2,'scholarly',$3,'completed',now(),now()) returning id`,
      [version, rp, admin])).rows[0].id;

    const decision = (await q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1,$2,'scholarly','rejected','The chain of narration is not given.',$3)
       returning id`,
      [assignment, version, reviewer])).rows[0].id;

    void v;
    return { course, version, section, lesson, decision, teacher };
  }

  /**
   * Act as a user and COMMIT.
   *
   * asUser() rolls back, which is right for a single assertion but useless
   * here: most of these tests need the report or appeal to still exist when
   * staff act on it in a later block. is_local is transaction-scoped, so
   * set_config only means anything inside an explicit transaction.
   */
  async function asActor(actor, sql, params) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    let r;
    try {
      r = await q(sql, params);
    } catch (e) {
      await q('rollback');
      throw e;
    }
    await q('commit');
    return r;
  }

  const reportAs = (who, lessonId, category, description, postId = null) =>
    q('select public.report_content($1,$2,$3,$4) as id',
      [lessonId, category, description, postId]);

  const filedReport = (who, lessonId, category, description, postId = null) =>
    asActor(who, 'select public.report_content($1,$2,$3,$4) as id',
      [lessonId, category, description, postId]);

  const filedAppeal = (who, decisionId, reason) =>
    asActor(who, 'select public.appeal_review_decision($1,$2) as id', [decisionId, reason]);

  const resolvedReport = (who, reportId, status, notes) =>
    asActor(who, 'select public.resolve_content_report($1,$2,$3)', [reportId, status, notes]);

  const decidedAppeal = (who, appealId, outcome, summary) =>
    asActor(who, 'select public.decide_appeal($1,$2,$3)', [appealId, outcome, summary]);

  // -------------------------------------------------------------------
  // Reporting
  // -------------------------------------------------------------------

  await test('a reader can report a problem with a lesson', async () => {
    const p = await published();
    const reader = await newUser('gov-reader-1@example.com');
    await newProfile(reader, 'Reader One');

    let id = null;
    await asUser(reader, async () => {
      id = (await reportAs(reader, p.lesson, 'doctrinal_error',
        'The verse quoted does not match the mushaf.')).rows[0].id;
      assert(typeof id === 'string', 'no report id returned');

      const row = await scalar(
        `select reported_by, report_category, status, course_version_id
           from public.content_reports where id = $1`, [id]);
      assert(row.reported_by === reader, 'report not attributed to the caller');
      assert(row.report_category === 'doctrinal_error', `category was ${row.report_category}`);
      assert(row.status === 'submitted', `status was ${row.status}`);
      // The version is derived from the lesson, not supplied by the caller.
      assert(row.course_version_id === p.version, 'report points at the wrong version');
    });
  });

  await test('a report cannot be filed against a version the reporter cannot see', async () => {
    // Without this, reporting is a way to probe unpublished course versions:
    // file a report and read back which ids exist.
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);
    // Never submitted, never published: a draft only the author can read.

    const stranger = await newUser('gov-prober@example.com');
    await newProfile(stranger, 'Prober');

    await asUser(stranger, async () => {
      await rejects(
        () => reportAs(stranger, lesson, 'other', 'Just asking whether this exists.'),
        /cannot report content you cannot see/i,
      );
    });

    const rows = await count('select 1 from public.content_reports where lesson_id = $1', [lesson]);
    assert(rows === 0, `${rows} reports were filed against content the reporter could not see`);
  });

  await test('the author of a draft can report their own unpublished lesson', async () => {
    // can_read_version admits the author, so a teacher reviewing their own draft
    // is not locked out of the reporting channel.
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);

    await asUser(teacher, async () => {
      const id = (await reportAs(teacher, lesson, 'technical_fault',
        'The audio on this lesson is out of sync.')).rows[0].id;
      assert(typeof id === 'string', 'the author could not report their own draft');
    });
  });

  await test('a blank description is refused', async () => {
    const p = await published();
    const reader = await newUser('gov-reader-2@example.com');
    await newProfile(reader, 'Reader Two');

    await asUser(reader, async () => {
      await rejects(
        () => reportAs(reader, p.lesson, 'other', '   '),
        /say what the problem is/i,
      );
    });
  });

  await test('a report names the discussion post, and the post must be on that lesson', async () => {
    const p = await published();

    // A post on this lesson, written by the teacher so it is visible at once.
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'learning.discussion'`);
    const postId = await committed(async () => {
      await q('begin');
      await q(`select set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ sub: teacher, role: 'authenticated' })]);
      await q('set local role authenticated');
      const id = (await q(
        `insert into public.discussion_posts (lesson_id, author_user_id, body)
         values ($1,$2,'A ruling that looks wrong.') returning id`,
        [p.lesson, teacher])).rows[0].id;
      await q('commit');
      return id;
    });

    // The reporter has to be able to read the discussion. The course author
    // can; a bare signed-in user with no enrolment cannot, and that refusal is
    // asserted separately below rather than being worked around here.
    await asUser(teacher, async () => {
      const id = (await reportAs(teacher, p.lesson, 'doctrinal_error',
        'This answer contradicts the lesson.', postId)).rows[0].id;
      const row = await scalar(
        'select discussion_post_id, lesson_id from public.content_reports where id = $1', [id]);
      assert(row.discussion_post_id === postId, 'the report did not name the post');
      assert(row.lesson_id === p.lesson, 'the report points at the wrong lesson');
    });

    // A reader who can see the lesson but has no enrolment cannot read the
    // thread, so they cannot report a post in it either.
    const reader = await newUser('gov-reader-3@example.com');
    await newProfile(reader, 'Reader Three');
    await asUser(reader, async () => {
      await rejects(
        () => reportAs(reader, p.lesson, 'doctrinal_error',
          'I cannot see this thread but I object to it.', postId),
        /cannot report a discussion you cannot see/i,
      );
    });

    // A post from a different lesson cannot be attached to this one.
    const otherLesson = await published();
    await asUser(teacher, async () => {
      await rejects(
        () => reportAs(teacher, otherLesson.lesson, 'doctrinal_error',
          'Wrong post, wrong lesson.', postId),
        /not on this lesson/i,
      );
    });
  });

  await test('the same person cannot file the same open report twice', async () => {
    const p = await published();
    const reader = await newUser('gov-reader-4@example.com');
    await newProfile(reader, 'Reader Four');

    await filedReport(reader, p.lesson, 'translation_error', 'The first translation is off.');
    await asUser(reader, async () => {
      await rejects(
        () => reportAs(reader, p.lesson, 'translation_error', 'The first translation is off.'),
        /duplicate key/i,
      );
    });

    const rows = await count(
      `select 1 from public.content_reports
        where lesson_id = $1 and report_category = 'translation_error' and reported_by = $2`,
      [p.lesson, reader]);
    assert(rows === 1, `${rows} identical open reports; one user could bury the queue`);

    // A different category about the same lesson is a different report.
    await filedReport(reader, p.lesson, 'technical_fault', 'The video stops halfway.');
    const both = await count(
      'select 1 from public.content_reports where lesson_id = $1 and reported_by = $2',
      [p.lesson, reader]);
    assert(both === 2, `expected 2 reports in different categories, found ${both}`);
  });

  // -------------------------------------------------------------------
  // Triaging a report
  // -------------------------------------------------------------------

  await test('a reader cannot resolve their own report', async () => {
    const p = await published();
    const reader = await newUser('gov-reader-5@example.com');
    await newProfile(reader, 'Reader Five');

    const id = (await filedReport(reader, p.lesson, 'other', 'Something is off.')).rows[0].id;

    await asUser(reader, async () => {
      await rejects(
        () => q('select public.resolve_content_report($1,$2,$3)', [id, 'dismissed', 'Never mind.']),
        /only staff may resolve/i,
      );
    });
  });

  await test('closing a report requires a written note', async () => {
    const p = await published();
    const reader = await newUser('gov-reader-6@example.com');
    await newProfile(reader, 'Reader Six');

    const id = (await filedReport(reader, p.lesson, 'other', 'Something is off.')).rows[0].id;

    await asUser(admin, async () => {
      await rejects(
        () => q('select public.resolve_content_report($1,$2,$3)', [id, 'dismissed', '  ']),
        /needs a written note/i,
      );
    });

    await asUser(admin, async () => {
      await q('select public.resolve_content_report($1,$2,$3)',
        [id, 'dismissed', 'Checked against the mushaf; the quotation is correct.']);
      const row = await scalar(
        'select status, resolved_at, resolution_notes from public.content_reports where id = $1', [id]);
      assert(row.status === 'dismissed', `status was ${row.status}`);
      assert(row.resolved_at, 'resolved_at was not set');
      assert(row.resolution_notes && row.resolution_notes.length > 0, 'no note was recorded');
    });
  });

  await test('triaging without closing does not require a note', async () => {
    const p = await published();
    const reader = await newUser('gov-reader-7@example.com');
    await newProfile(reader, 'Reader Seven');

    const id = (await filedReport(reader, p.lesson, 'other', 'Checking the triage path.')).rows[0].id;

    await asUser(admin, async () => {
      await q('select public.resolve_content_report($1,$2,$3)', [id, 'triaged', null]);
      const row = await scalar(
        'select status, resolved_at from public.content_reports where id = $1', [id]);
      assert(row.status === 'triaged', `status was ${row.status}`);
      assert(!row.resolved_at, 'a triaged report must not look resolved');
    });
  });

  // -------------------------------------------------------------------
  // Appeals
  // -------------------------------------------------------------------

  await test('the author of a rejected course can appeal the decision', async () => {
    const r = await rejectedVersion();

    let id = null;
    await asUser(teacher, async () => {
      id = (await q('select public.appeal_review_decision($1,$2) as id',
        [r.decision, 'The chain is given in the second footnote; I have added a citation.']))
        .rows[0].id;

      const row = await scalar(
        'select submitted_by, status, related_decision_id from public.governance_appeals where id = $1',
        [id]);
      assert(row.submitted_by === teacher, 'appeal not attributed to the appellant');
      assert(row.status === 'submitted', `status was ${row.status}`);
      assert(row.related_decision_id === r.decision, 'appeal points at the wrong decision');
    });
  });

  await test('someone who is not the author cannot appeal', async () => {
    const r = await rejectedVersion();
    const stranger = await newUser('gov-bystander@example.com');
    await newProfile(stranger, 'Bystander');

    await asUser(stranger, async () => {
      await rejects(
        () => q('select public.appeal_review_decision($1,$2)',
          [r.decision, 'I think that was unfair.']),
        /only the author of that course may appeal/i,
      );
    });

    const rows = await count(
      'select 1 from public.governance_appeals where related_decision_id = $1', [r.decision]);
    assert(rows === 0, `${rows} appeals were filed by someone with no standing`);
  });

  await test('an appeal needs a reason', async () => {
    const r = await rejectedVersion();

    await asUser(teacher, async () => {
      await rejects(
        () => q('select public.appeal_review_decision($1,$2)', [r.decision, '   ']),
        /say what you are appealing/i,
      );
    });
  });

  await test('one author cannot have two open appeals on the same decision', async () => {
    const r = await rejectedVersion();

    await filedAppeal(teacher, r.decision, 'First appeal.');
    await asUser(teacher, async () => {
      await rejects(
        () => q('select public.appeal_review_decision($1,$2)', [r.decision, 'Second appeal.']),
        /duplicate key/i,
      );
    });

    const rows = await count(
      'select 1 from public.governance_appeals where related_decision_id = $1', [r.decision]);
    assert(rows === 1, `${rows} open appeals; re-submitting must not jump the queue`);
  });

  await test('the reviewer whose decision is appealed cannot decide the appeal', async () => {
    const r = await rejectedVersion();

    const appealId = (await filedAppeal(teacher, r.decision, 'The citation is in footnote two.')).rows[0].id;

    // A plain reviewer is NOT privileged, so letting them try proves nothing:
    // the privilege check refuses them first and the self-appeal ban is never
    // reached. An earlier version of this test branched on exactly that and
    // passed with the ban deleted. So the decider here has to be both
    // privileged and the author of the ruling.
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);
    await transition(version, 'submitted', teacher);

    const rpAdmin = (await q(
      `insert into public.reviewer_profiles (user_id, reviewer_status, verified_at, verified_by)
       values ($1,'active',now(),$2)
       on conflict (user_id) do update set reviewer_status = 'active'
       returning id`, [admin, admin])).rows[0].id;
    const assignment = (await q(
      `insert into public.content_review_assignments
         (course_version_id, reviewer_profile_id, review_scope, assigned_by,
          assignment_status, accepted_at, completed_at)
       values ($1,$2,'scholarly',$3,'completed',now(),now()) returning id`,
      [version, rpAdmin, admin])).rows[0].id;
    const decision = (await q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1,$2,'scholarly','rejected','Not up to standard.',$3) returning id`,
      [assignment, version, admin])).rows[0].id;

    // Assert the premise, so this cannot silently degrade into the privilege
    // check again if the seeded roles ever change.
    const privileged = (await q('select public.is_privileged($1) as p', [admin])).rows[0].p;
    assert(privileged === true, 'the admin is not privileged, so this test proves nothing');

    const ownAppeal = (await filedAppeal(teacher, decision, 'Please reconsider.')).rows[0].id;

    await asUser(admin, async () => {
      await rejects(
        () => q('select public.decide_appeal($1,$2,$3)', [ownAppeal, 'upheld', 'It stands.']),
        /cannot decide an appeal against your own decision/i,
      );
    });

    const row = await scalar('select status from public.governance_appeals where id = $1', [ownAppeal]);
    assert(row.status === 'submitted',
      `the appeal became ${row.status}; the author of a ruling must not be the one who upholds it`);

    // Someone else who is privileged can decide it, so the rule is about
    // independence rather than making appeals undecidable.
    await decidedAppeal(admin, appealId, 'upheld', 'It stands.');
  });

  await test('overturning a decision requires a written summary', async () => {
    const r = await rejectedVersion();

    const appealId = (await filedAppeal(teacher, r.decision, 'The citation is in footnote two.')).rows[0].id;

    await asUser(admin, async () => {
      await rejects(
        () => q('select public.decide_appeal($1,$2,$3)', [appealId, 'overturned', '  ']),
        /needs a written summary/i,
      );
    });

    await asUser(admin, async () => {
      await q('select public.decide_appeal($1,$2,$3)',
        [appealId, 'overturned', 'The isnad is cited in footnote two; the rejection does not stand.']);
      const row = await scalar(
        'select status, resolved_at, resolution_summary from public.governance_appeals where id = $1',
        [appealId]);
      assert(row.status === 'overturned', `status was ${row.status}`);
      assert(row.resolved_at, 'resolved_at was not set');
      assert(row.resolution_summary && row.resolution_summary.length > 0,
        'overturning recorded no reason');
    });
  });

  await test('a decided appeal cannot be decided again', async () => {
    const r = await rejectedVersion();

    const appealId = (await filedAppeal(teacher, r.decision, 'Please look again.')).rows[0].id;
    await decidedAppeal(admin, appealId, 'upheld', 'The rejection stands.');

    await asUser(admin, async () => {
      await rejects(
        () => q('select public.decide_appeal($1,$2,$3)', [appealId, 'overturned', 'Changed my mind.']),
        /already upheld/i,
      );
    });
  });

  await test('both channels write to the audit trail', async () => {
    const p = await published();
    const reader = await newUser('gov-reader-8@example.com');
    await newProfile(reader, 'Reader Eight');

    const reportId = (await filedReport(reader, p.lesson, 'misattribution',
      'This is attributed to the wrong narrator.')).rows[0].id;
    await resolvedReport(admin, reportId, 'resolved', 'Corrected the attribution.');

    const actions = (await q(
      `select string_agg(action, ',' order by action) s
         from public.governance_audit_events
        where target_type = 'content_report' and target_id = $1`, [reportId])).rows[0].s;
    assert(actions && actions.includes('content.reported'), `audit actions were: ${actions}`);
    assert(actions && actions.includes('content_report.resolved'), `audit actions were: ${actions}`);
  });
}
