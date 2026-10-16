// Content review — the reviewer's side.
//
// The properties that make a review mean anything:
//
//   - a reviewer cannot claim work; assignments are created by platform staff
//   - a decision can only be recorded by the reviewer the assignment names,
//     against the version and scope it was asked about
//   - being asked to review something lets you read it, and never lets you
//     change it
//   - an author cannot approve their own submission
//
// The second of those is enforced by validate_review_decision(), a trigger,
// rather than by policy alone — a SECURITY DEFINER function bypasses RLS but
// not triggers, so the check has to be where the row is written.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile, grantRole, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('rev-admin@example.com');
  const teacher  = await newInstructor('rev-teacher@example.com', admin);
  const reviewer = await newReviewer('rev-reviewer@example.com', admin);
  const other    = await newReviewer('rev-other@example.com', admin);

  const outsiderId = await newUser('rev-outsider@example.com');
  await newProfile(outsiderId, 'Outsider');

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'review test']);

  const statusOf = async (versionId) =>
    (await q('select version_status s from public.course_versions where id = $1',
      [versionId])).rows[0].s;

  /** An active, verified reviewer profile — what an assignment points at. */
  const reviewerProfile = async (userId, verifiedBy = admin) => {
    const existing = await q('select id from public.reviewer_profiles where user_id = $1', [userId]);
    if (existing.rows.length) return existing.rows[0].id;
    return (await q(
      `insert into public.reviewer_profiles (user_id, reviewer_status, verified_at, verified_by)
       values ($1, 'active', now(), $2) returning id`, [userId, verifiedBy])).rows[0].id;
  };

  /** A submitted version with content, ready to be reviewed. */
  async function submittedVersion() {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);
    await transition(version, 'submitted', teacher);
    return { course, version, section, lesson };
  }

  const assign = (versionId, profileId, scope = 'scholarly') =>
    committed(async () => (await q(
      `insert into public.content_review_assignments
         (course_version_id, reviewer_profile_id, review_scope, assigned_by, assignment_status)
       values ($1, $2, $3, $4, 'offered') returning id`,
      [versionId, profileId, scope, admin])).rows[0].id);

  const rpReviewer = await reviewerProfile(reviewer);
  const rpOther    = await reviewerProfile(other);

  // -------------------------------------------------------------------
  // Who may create an assignment
  // -------------------------------------------------------------------
  await test('a reviewer cannot assign themselves', async () => {
    const v = await submittedVersion();
    await asUser(reviewer, async () => {
      await rejects(() => q(
        `insert into public.content_review_assignments
           (course_version_id, reviewer_profile_id, review_scope, assigned_by, assignment_status)
         values ($1, $2, 'scholarly', $3, 'offered')`, [v.version, rpReviewer, admin]),
        'a reviewer created their own assignment');
    });

    const n = await count(
      'select 1 from public.content_review_assignments where course_version_id = $1', [v.version]);
    assert(n === 0, `${n} assignment(s) were created anyway`);
  });

  await test('an ordinary user cannot assign anything either', async () => {
    const v = await submittedVersion();
    await asUser(outsiderId, async () => {
      await rejects(() => q(
        `insert into public.content_review_assignments
           (course_version_id, reviewer_profile_id, review_scope, assigned_by, assignment_status)
         values ($1, $2, 'scholarly', $3, 'offered')`, [v.version, rpReviewer, admin]),
        'an ordinary user created a review assignment');
    });
  });

  // -------------------------------------------------------------------
  // Visibility
  // -------------------------------------------------------------------
  await test('only the assigned reviewer and staff can see an assignment', async () => {
    const v = await submittedVersion();
    const a = await assign(v.version, rpReviewer);

    await asUser(reviewer, async () => {
      const n = await count('select 1 from public.content_review_assignments where id = $1', [a]);
      assert(n === 1, `the assigned reviewer read ${n} rows`);
    });

    await asUser(other, async () => {
      const n = await count('select 1 from public.content_review_assignments where id = $1', [a]);
      assert(n === 0, `a different reviewer read ${n} rows`);
    });

    await asUser(outsiderId, async () => {
      const n = await count('select 1 from public.content_review_assignments where id = $1', [a]);
      assert(n === 0, `an unrelated user read ${n} rows`);
    });

    await asAnon(async () => {
      const n = await count('select 1 from public.content_review_assignments');
      assert(n === 0, `an anonymous visitor read ${n} assignment(s)`);
    });
  });

  // Regression for defect 2 in 20261021000100_authz_fixes.sql: an assigned
  // reviewer could not read the content they were asked to review.
  await test('an assigned reviewer can read the content under review', async () => {
    const v = await submittedVersion();
    await assign(v.version, rpReviewer);

    await asUser(reviewer, async () => {
      const sections = await count(
        'select 1 from public.course_sections where course_version_id = $1', [v.version]);
      assert(sections === 1, `the reviewer read ${sections} section(s), expected 1`);

      const lessons = await count(
        'select 1 from public.lessons where section_id = $1', [v.section]);
      assert(lessons === 1, `the reviewer read ${lessons} lesson(s), expected 1`);
    });
  });

  await test('being asked to review never grants write access', async () => {
    // can_review_version() is a SELECT-only grant. Assert the write is
    // refused rather than trusting the policy's shape.
    const v = await submittedVersion();
    await assign(v.version, rpReviewer);

    await asUser(reviewer, async () => {
      await rejects(() => q(
        `insert into public.course_sections (course_version_id, title, position)
         values ($1, 'Reviewer edit', 9)`, [v.version]),
        'an assigned reviewer added a section');

      await rejects(() => q(
        `update public.lessons set title = 'Reviewer edit' where section_id = $1`, [v.section]),
        'an assigned reviewer renamed a lesson');
    });
  });

  // -------------------------------------------------------------------
  // Accepting
  // -------------------------------------------------------------------
  await test('the assigned reviewer can accept, and nobody else can', async () => {
    const v = await submittedVersion();
    const a = await assign(v.version, rpReviewer);

    // Both assertions have to be made inside the asUser block, because it
    // rolls back: reading the status afterwards would always see 'offered'.
    // An RLS-blocked UPDATE matches zero rows and raises nothing, so
    // RETURNING is what makes the difference observable.
    let otherMatched = -1;
    await asUser(other, async () => {
      const r = await q(
        `update public.content_review_assignments
            set assignment_status = 'accepted', accepted_at = now()
          where id = $1 returning id`, [a]);
      otherMatched = r.rows.length;
    });
    assert(otherMatched === 0,
      `a reviewer who was not assigned matched ${otherMatched} row(s)`);

    let mineMatched = -1;
    let seenStatus = null;
    await asUser(reviewer, async () => {
      const r = await q(
        `update public.content_review_assignments
            set assignment_status = 'accepted', accepted_at = now()
          where id = $1 returning assignment_status`, [a]);
      mineMatched = r.rows.length;
      seenStatus = r.rows[0]?.assignment_status ?? null;
    });
    assert(mineMatched === 1,
      `the assigned reviewer matched ${mineMatched} row(s), expected 1`);
    assert(seenStatus === 'accepted',
      `the assigned reviewer's update left the status at '${seenStatus}'`);
  });

  await test('accepted_at cannot be set while an assignment is still offered', async () => {
    const v = await submittedVersion();
    const a = await assign(v.version, rpReviewer);

    await rejects(() => q(
      `update public.content_review_assignments set accepted_at = now() where id = $1`, [a]),
      'accepted_at was set on an assignment still in offered status');
  });

  await test('completed_at needs a completed or cancelled status', async () => {
    const v = await submittedVersion();
    const a = await assign(v.version, rpReviewer);

    await rejects(() => q(
      `update public.content_review_assignments
          set assignment_status = 'accepted', accepted_at = now(), completed_at = now()
        where id = $1`, [a]),
      'completed_at was set on an accepted assignment');
  });

  // -------------------------------------------------------------------
  // Decisions
  // -------------------------------------------------------------------
  await test('a decision must be recorded by the assigned reviewer', async () => {
    const v = await submittedVersion();
    const a = await assign(v.version, rpReviewer);

    // The other reviewer holds the reviewer role and could plausibly be
    // asked; they were not asked about this one.
    await rejects(() => q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1, $2, 'scholarly', 'approved', 'Not mine to decide.', $3)`,
      [a, v.version, other]),
      'a reviewer who was not assigned recorded a decision');

    const n = await count(
      'select 1 from public.content_review_decisions where course_version_id = $1', [v.version]);
    assert(n === 0, `${n} decision(s) were recorded anyway`);
  });

  await test('a decision must match the version and scope of its assignment', async () => {
    const v  = await submittedVersion();
    const v2 = await submittedVersion();
    const a  = await assign(v.version, rpReviewer, 'scholarly');

    // Right reviewer, wrong version.
    await rejects(() => q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1, $2, 'scholarly', 'approved', 'Wrong version.', $3)`,
      [a, v2.version, reviewer]),
      'a decision was attached to a version the assignment did not name');

    // Right version, wrong scope.
    await rejects(() => q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1, $2, 'technical', 'approved', 'Wrong scope.', $3)`,
      [a, v.version, reviewer]),
      'a decision was recorded under a scope the assignment did not name');
  });

  await test('the assigned reviewer can record a decision', async () => {
    const v = await submittedVersion();
    const a = await assign(v.version, rpReviewer);

    const r = await q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1, $2, 'scholarly', 'approved', 'Checked against the sources.', $3) returning id`,
      [a, v.version, reviewer]);
    assert(r.rows.length === 1, 'the assigned reviewer could not record a decision');
  });

  await test('a rationale is required', async () => {
    const v = await submittedVersion();
    const a = await assign(v.version, rpReviewer);

    await rejects(() => q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1, $2, 'scholarly', 'approved', null, $3)`,
      [a, v.version, reviewer]),
      'a decision was recorded with no rationale');
  });

  // -------------------------------------------------------------------
  // The version transition
  // -------------------------------------------------------------------
  await test('an approving reviewer moves the version, and cannot publish it', async () => {
    const v = await submittedVersion();
    const a = await assign(v.version, rpReviewer);
    await q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1, $2, 'scholarly', 'approved', 'Approved.', $3)`, [a, v.version, reviewer]);

    await transition(v.version, 'approved', reviewer);
    assert((await statusOf(v.version)) === 'approved', 'the reviewer could not approve');

    await satisfyReview(v.version, reviewer, admin);
    await rejects(() => transition(v.version, 'published', reviewer),
      'a reviewer published the course');

    await transition(v.version, 'published', admin);
    assert((await statusOf(v.version)) === 'published', 'the admin could not publish');
  });

  await test('an author cannot approve their own submission, even as a reviewer', async () => {
    // A teacher who also holds the reviewer role. The transition function
    // checks authorship separately from the role, precisely for this case.
    const bothId = await newUser('rev-both@example.com');
    await newProfile(bothId, 'Teacher Reviewer');
    await committed(async () => { await grantRole(bothId, 'reviewer', admin); });

    const c = await newCourse(bothId, { status: 'active' });
    const ver = await newVersion(c, bothId);
    const sec = await newSection(ver);
    await newLesson(sec);
    await transition(ver, 'submitted', bothId);

    await rejects(() => transition(ver, 'approved', bothId),
      'an author approved their own course while holding the reviewer role');
  });

  await test('a rejection sends the version back to the author', async () => {
    const v = await submittedVersion();
    const a = await assign(v.version, rpReviewer);
    await q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1, $2, 'scholarly', 'revision_requested', 'Cite your sources.', $3)`,
      [a, v.version, reviewer]);

    await transition(v.version, 'rejected', reviewer);
    assert((await statusOf(v.version)) === 'rejected', 'the reviewer could not reject');

    // The author takes it back to a draft and starts again.
    await transition(v.version, 'draft', teacher);
    assert((await statusOf(v.version)) === 'draft', 'the author could not reopen a rejected version');
  });
}
