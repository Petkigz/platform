// Group 3 tests: reviewers, review workflow, governance, publication gate.
//
// The invariants that matter here are all about independence: nobody reviews
// their own work, nobody assesses their own conflict, nobody resolves an
// appeal against their own decision, and nothing publishes without review.

export async function run(ctx) {
  const {
    q, count, test, assert, rejects,
    asUser, asAnon,
    newUser, newProfile,
    bootstrapAdmin, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson,
    ensureReviewerProfile, satisfyReview,
  } = ctx;

  const admin    = await bootstrapAdmin('g3-admin@example.com');
  const teacher  = await newInstructor('g3-teacher@example.com', admin);
  const teacher2 = await newInstructor('g3-teacher2@example.com', admin);
  const reviewer = await newReviewer('g3-reviewer@example.com', admin);
  const reviewer2 = await newReviewer('g3-reviewer2@example.com', admin);
  const stranger = await newUser('g3-stranger@example.com');
  await newProfile(stranger);

  const setStatus = (versionId, status, actor, reason = 'test') =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, reason]);

  async function draftCourse(author = teacher) {
    const course  = await newCourse(author, { status: 'active' });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    const lesson  = await newLesson(section);
    return { course, version, section, lesson };
  }

  async function authorise(userId, subjectCode, scope = 'scholarly', by = admin) {
    const rp = await ensureReviewerProfile(userId, by);
    await q(`insert into public.reviewer_subject_authorizations
               (reviewer_profile_id, subject_area_id, review_scope, status, approver, approved_at)
             select $1, id, $2, 'active', $3, now()
               from public.subject_areas where code = $4
             on conflict do nothing`, [rp, scope, by, subjectCode]);
    return rp;
  }

  async function requireSubject(versionId, subjectCode, scope = 'scholarly') {
    await q(`insert into public.content_review_requirements
               (course_version_id, subject_area_id, review_scope)
             select $1, id, $2 from public.subject_areas where code = $3
             on conflict do nothing`, [versionId, scope, subjectCode]);
  }

  async function assign(versionId, reviewerUserId, { scope = 'scholarly', by = admin } = {}) {
    const rp = await ensureReviewerProfile(reviewerUserId, by);
    return (await q(
      `insert into public.content_review_assignments
         (course_version_id, reviewer_profile_id, review_scope, assigned_by)
       values ($1, $2, $3, $4) returning id`, [versionId, rp, scope, by])).rows[0].id;
  }

  async function decide(assignmentId, versionId, reviewerUserId, decision = 'approved',
                        scope = 'scholarly') {
    return (await q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1, $2, $3, $4, 'Considered and decided.', $5) returning id`,
      [assignmentId, versionId, scope, decision, reviewerUserId])).rows[0].id;
  }

  // ---------------------------------------------------------------------
  console.log('Schema');

  await test('all twenty Group 3 tables exist', async () => {
    const want = ['platform_settings', 'reviewer_profiles', 'reviewer_qualifications',
      'reviewer_subject_authorizations', 'content_review_requirements',
      'content_review_assignments', 'content_review_decisions', 'technical_review_checks',
      'content_sources', 'content_source_links', 'reviewer_conflict_declarations',
      'content_reports', 'governance_appeals', 'publication_events',
      'scholarly_panels', 'scholarly_panel_memberships', 'scholarly_panel_cases',
      'scholarly_panel_votes', 'content_change_assessments', 'governance_audit_events'];
    const names = (await q(
      `select table_name from information_schema.tables
        where table_schema='public' and table_type='BASE TABLE'`)).rows.map(r => r.table_name);
    for (const t of want) assert(names.includes(t), `missing table ${t}`);
  });

  await test('P6 settings seeded, panel dormant by default', async () => {
    const panel = (await q(
      `select public.setting_bool('governance.panel_required', true) as v`)).rows[0].v;
    assert(panel === false, `panel_required should default to false, got ${panel}`);
    const min = (await q(
      `select value_text from public.platform_settings where key='governance.min_approvals'`)).rows[0].value_text;
    assert(min === '1', `min_approvals should be 1, got ${min}`);
  });

  await test('internal notes and qualification evidence survive no SELECT *', async () => {
    const rp = await ensureReviewerProfile(reviewer, admin);
    await q(`update public.reviewer_profiles set internal_notes = 'do not show' where id = $1`, [rp]);

    await rejects(() => asUser(reviewer, () => q(
      `select * from public.reviewer_profiles where id = $1`, [rp])),
      'SELECT * was allowed on reviewer_profiles, which would expose internal_notes');
    await rejects(() => asUser(admin, () => q(
      `select internal_notes from public.reviewer_profiles where id = $1`, [rp])),
      'internal_notes was readable by name');

    const safe = await asUser(reviewer, () => q(
      `select id, public_bio, reviewer_status from public.reviewer_profiles where id = $1`, [rp]));
    assert(safe.rows.length === 1, 'the safe projection of reviewer_profiles failed');
  });

  await test('platform settings cannot be enumerated by a client', async () => {
    // There is no SELECT policy, so the rows are invisible rather than
    // protected by an error. Assert nothing comes back.
    const n = await asUser(admin, () => count('select count(*)::int n from public.platform_settings'));
    assert(n === 0, `a client read ${n} settings rows`);
    // The security definer accessor still works, which is the point.
    const v = (await asUser(admin, () => q(
      `select public.setting_bool('governance.panel_required', true) as v`))).rows[0].v;
    assert(v === false, 'setting_bool stopped working for a client');
  });

  // ---------------------------------------------------------------------
  console.log('\nReviewer independence');

  await test('an author cannot be the scholarly reviewer of their own course', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    await authorise(teacher, 'quran');
    await rejects(() => assign(pc.version, teacher),
      'the author was assigned as scholarly reviewer of their own course');
  });

  await test('an author MAY perform limited technical checks on their own course', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran', 'technical');
    await authorise(teacher, 'quran', 'technical');
    const a = await assign(pc.version, teacher, { scope: 'technical' });
    assert(a, 'a technical self-assignment should be permitted');

    await q(`insert into public.technical_review_checks
               (course_version_id, check_type, passed, performed_by)
             values ($1, 'media_plays', true, $2)`, [pc.version, teacher]);
  });

  await test('a reviewer needs a live authorisation for the subject', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    // reviewer2 is authorised for arabic, not quran.
    await authorise(reviewer2, 'arabic');
    await rejects(() => assign(pc.version, reviewer2),
      'a reviewer was assigned to a subject they are not authorised for');
  });

  await test('a verified qualification alone does not authorise review', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    const rp = await ensureReviewerProfile(reviewer2, admin);
    await q(`insert into public.reviewer_qualifications
               (reviewer_profile_id, qualification_type, qualification_title,
                subject_area_id, verification_status, verified_by, verified_at)
             select $1, 'ijazah', 'Ijazah in Quran recitation', id, 'verified', $2, now()
               from public.subject_areas where code = 'quran'`, [rp, admin]);
    // No authorization row, despite a verified qualification.
    await rejects(() => assign(pc.version, reviewer2),
      'a qualification was treated as an authorisation');
  });

  await test('an unresolved conflict blocks the assignment', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    await authorise(reviewer, 'quran');
    const rp = await ensureReviewerProfile(reviewer, admin);

    await q(`insert into public.reviewer_conflict_declarations
               (reviewer_profile_id, course_version_id, conflict_type, description)
             values ($1, $2, 'teacher_student', 'I taught this author')`, [rp, pc.version]);

    await rejects(() => assign(pc.version, reviewer),
      'a reviewer with an unresolved conflict was assigned');
  });

  await test('a reviewer may not assess their own conflict', async () => {
    const pc = await draftCourse();
    const rp = await ensureReviewerProfile(reviewer, admin);
    const c = (await q(
      `insert into public.reviewer_conflict_declarations
         (reviewer_profile_id, conflict_type, description)
       values ($1, 'financial', 'I earn from a competing course') returning id`, [rp])).rows[0].id;

    await rejects(() => q(
      `update public.reviewer_conflict_declarations
          set status = 'accepted', assessed_by = $1, assessed_at = now()
        where id = $2`, [reviewer, c]),
      'a reviewer cleared their own conflict');

    await q(`update public.reviewer_conflict_declarations
                set status = 'disqualifying', assessed_by = $1, assessed_at = now()
              where id = $2`, [admin, c]);

    // A standing (course_version_id IS NULL) disqualifying conflict correctly
    // blocks this reviewer from every future assignment, so clear it before
    // the later tests reuse the same reviewer.
    await q(`update public.reviewer_conflict_declarations
                set status = 'resolved', resolution_notes = 'cleared for tests'
              where id = $1`, [c]);
  });

  // ---------------------------------------------------------------------
  console.log('\nDecisions and appeals');

  await test('review decisions are append-only', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    await authorise(reviewer, 'quran');
    const a = await assign(pc.version, reviewer);
    const d = await decide(a, pc.version, reviewer);

    await rejects(() => q(
      `update public.content_review_decisions set rationale = 'rewritten' where id = $1`, [d]),
      'a review decision was edited');
    await rejects(() => q(
      `delete from public.content_review_decisions where id = $1`, [d]),
      'a review decision was deleted');

    // A change of mind is a new row that supersedes — and because the table
    // is truly append-only, supersedes must be set at insert time.
    const d2 = (await q(
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale,
          decided_by, supersedes_decision_id)
       values ($1, $2, 'scholarly', 'revision_requested', 'Reconsidered.', $3, $4) returning id`,
      [a, pc.version, reviewer, d])).rows[0].id;

    const linked = (await q(
      'select supersedes_decision_id from public.content_review_decisions where id = $1', [d2])).rows[0];
    assert(linked.supersedes_decision_id === d, 'the superseding link was not recorded');
  });

  await test('a decision must come from the assigned reviewer', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    await authorise(reviewer, 'quran');
    const a = await assign(pc.version, reviewer);
    await rejects(() => decide(a, pc.version, teacher),
      'someone other than the assigned reviewer recorded the decision');
  });

  await test('a decision must match its assignment scope and version', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    await authorise(reviewer, 'quran');
    const a = await assign(pc.version, reviewer);
    await rejects(() => decide(a, pc.version, reviewer, 'approved', 'technical'),
      'a scholarly assignment produced a technical decision');
  });

  await test('the original decision-maker may not resolve the appeal', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    await authorise(reviewer, 'quran');
    const a = await assign(pc.version, reviewer);
    const d = await decide(a, pc.version, reviewer, 'rejected');

    const ap = (await q(
      `insert into public.governance_appeals (related_decision_id, submitted_by, appeal_reason)
       values ($1, $2, 'The rejection misreads the source.') returning id`, [d, teacher])).rows[0].id;

    await rejects(() => q(
      `update public.governance_appeals
          set assigned_to = $1, status = 'overturned', resolved_at = now(),
              resolution_summary = 'overturned'
        where id = $2`, [reviewer, ap]),
      'the original decision-maker resolved an appeal against their own decision');

    await q(`update public.governance_appeals
                set assigned_to = $1, status = 'overturned', resolved_at = now(),
                    resolution_summary = 'Overturned on review.'
              where id = $2`, [admin, ap]);
  });

  // ---------------------------------------------------------------------
  console.log('\nThe publication gate');

  await test('a version cannot be published with no scholarly approval', async () => {
    const pc = await draftCourse();
    await setStatus(pc.version, 'submitted', teacher);
    await setStatus(pc.version, 'approved', reviewer);
    await rejects(() => setStatus(pc.version, 'published', admin),
      'a version published with no recorded scholarly approval');
  });

  await test('an open review requirement blocks publication', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    await authorise(reviewer, 'quran');
    const a = await assign(pc.version, reviewer);
    await decide(a, pc.version, reviewer);   // requirement row is still 'open'

    await setStatus(pc.version, 'submitted', teacher);
    await setStatus(pc.version, 'approved', reviewer);
    await rejects(() => setStatus(pc.version, 'published', admin),
      'a version published while a review requirement was still open');

    await q(`update public.content_review_requirements
                set requirement_status = 'satisfied' where course_version_id = $1`, [pc.version]);
    await setStatus(pc.version, 'published', admin);
  });

  await test('panel_required makes publication demand a panel decision (P6)', async () => {
    const pc = await draftCourse();
    await satisfyReview(pc.version, reviewer, admin);
    await setStatus(pc.version, 'submitted', teacher);
    await setStatus(pc.version, 'approved', reviewer);

    await q(`update public.platform_settings set value_text = 'true'
              where key = 'governance.panel_required'`);
    await rejects(() => setStatus(pc.version, 'published', admin),
      'a version published with no panel decision while panel_required was on');

    // Convene a panel and get an approval.
    const panel = (await q(
      `insert into public.scholarly_panels (name, quorum_size, status)
       values ('Fiqh panel', 1, 'active') returning id`)).rows[0].id;
    const rp = await ensureReviewerProfile(reviewer, admin);
    await q(`insert into public.scholarly_panel_memberships (panel_id, reviewer_profile_id)
             values ($1, $2)`, [panel, rp]);
    const kase = (await q(
      `insert into public.scholarly_panel_cases (panel_id, course_version_id)
       values ($1, $2) returning id`, [panel, pc.version])).rows[0].id;

    await q(`insert into public.scholarly_panel_votes (case_id, reviewer_profile_id, vote, rationale)
             values ($1, $2, 'approve', 'Sound.')`, [kase, rp]);
    await q(`update public.scholarly_panel_cases
                set status = 'approved', closed_at = now(), outcome_summary = 'Approved unanimously.'
              where id = $1`, [kase]);

    await setStatus(pc.version, 'published', admin);

    await q(`update public.platform_settings set value_text = 'false'
              where key = 'governance.panel_required'`);
  });

  await test('a non-member cannot vote on a panel case', async () => {
    const pc = await draftCourse();
    const panel = (await q(
      `insert into public.scholarly_panels (name, quorum_size, status)
       values ('Closed panel', 1, 'active') returning id`)).rows[0].id;
    const kase = (await q(
      `insert into public.scholarly_panel_cases (panel_id, course_version_id)
       values ($1, $2) returning id`, [panel, pc.version])).rows[0].id;
    const outsider = await ensureReviewerProfile(teacher2, admin);
    await rejects(() => q(
      `insert into public.scholarly_panel_votes (case_id, reviewer_profile_id, vote)
       values ($1, $2, 'approve')`, [kase, outsider]),
      'a non-member voted on a panel case');
  });

  await test('every status change is recorded in publication_events', async () => {
    const pc = await draftCourse();
    await satisfyReview(pc.version, reviewer, admin);
    await setStatus(pc.version, 'submitted', teacher);
    await setStatus(pc.version, 'approved', reviewer);
    await setStatus(pc.version, 'published', admin);

    const types = (await q(
      `select event_type from public.publication_events
        where course_version_id = $1 order by occurred_at`, [pc.version])).rows.map(r => r.event_type);
    assert(types.join(',') === 'submitted,approved_for_publication,published',
      `unexpected publication history: ${types.join(',')}`);

    await rejects(() => q(
      `delete from public.publication_events where course_version_id = $1`, [pc.version]),
      'publication history was deleted');
  });

  await test('audit events are append-only', async () => {
    const ev = (await q(
      `insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
       values ($1, 'test.action', 'course_version', gen_random_uuid(), '{}') returning id`,
      [admin])).rows[0].id;
    await rejects(() => q(
      `update public.governance_audit_events set detail = '{"tampered":true}' where id = $1`, [ev]),
      'an audit event was edited');
    await rejects(() => q(
      `delete from public.governance_audit_events where id = $1`, [ev]),
      'an audit event was deleted');
  });

  // ---------------------------------------------------------------------
  console.log('\nProvenance and risk');

  await test('a source and its links must belong to the same version', async () => {
    const pc1 = await draftCourse();
    const pc2 = await draftCourse();
    const src = (await q(
      `insert into public.content_sources
         (course_version_id, source_type, title, reference_locator, created_by)
       values ($1, 'quran', 'Sahih Muslim', 'Book 4, Hadith 1', $2) returning id`,
      [pc1.version, teacher])).rows[0].id;

    await q(`insert into public.content_source_links (content_source_id, lesson_id)
             values ($1, $2)`, [src, pc1.lesson]);
    await rejects(() => q(
      `insert into public.content_source_links (content_source_id, lesson_id)
       values ($1, $2)`, [src, pc2.lesson]),
      'a source was linked to a lesson in a different version');
  });

  await test('a source link must point at exactly one thing', async () => {
    const pc = await draftCourse();
    const src = (await q(
      `insert into public.content_sources
         (course_version_id, source_type, title, created_by)
       values ($1, 'hadith', 'Bukhari', $2) returning id`, [pc.version, teacher])).rows[0].id;
    await rejects(() => q(
      `insert into public.content_source_links (content_source_id) values ($1)`, [src]),
      'a source link pointing at nothing was accepted');
  });

  await test('a doctrinal change cannot be classed as low risk', async () => {
    const pc = await draftCourse();
    await rejects(() => q(
      `insert into public.content_change_assessments
         (course_version_id, change_class, risk_level, requires_re_review, rationale, assessed_by)
       values ($1, 'doctrinal', 'low', false, 'minor wording', $2)`, [pc.version, admin]),
      'a doctrinal change was classed as low risk with no re-review');

    await q(`insert into public.content_change_assessments
               (course_version_id, change_class, risk_level, requires_re_review, rationale, assessed_by)
             values ($1, 'doctrinal', 'high', true, 'Reworded a ruling on zakat.', $2)`,
      [pc.version, admin]);
  });

  // ---------------------------------------------------------------------
  console.log('\nRow level security');

  await test('a stranger cannot see governance internals', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    const audit = await count('select count(*)::int n from public.governance_audit_events');
    const seenAudit = await asUser(stranger, () =>
      count('select count(*)::int n from public.governance_audit_events'));
    assert(audit > 0, 'the test assumed at least one audit event exists');
    assert(seenAudit === 0, `a stranger saw ${seenAudit} audit events`);

    const seenReq = await asUser(stranger, () =>
      count('select count(*)::int n from public.content_review_requirements where course_version_id = $1',
        [pc.version]));
    assert(seenReq === 0, `a stranger saw ${seenReq} review requirements`);
  });

  await test('an author can see the review state of their own course', async () => {
    const pc = await draftCourse();
    await requireSubject(pc.version, 'quran');
    const seen = await asUser(teacher, () =>
      count('select count(*)::int n from public.content_review_requirements where course_version_id = $1',
        [pc.version]));
    assert(seen === 1, `the author saw ${seen} review requirements on their own course`);
  });

  await test('a report may be filed anonymously', async () => {
    const pc = await draftCourse();
    await publishForReport(pc);
    // Committed, so the row is still there to be counted afterwards. asAnon
    // rolls back, which would have hidden a successful insert.
    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role authenticated');
    await q(
      `insert into public.content_reports
         (course_version_id, report_category, description)
       values ($1, 'doctrinal_error', 'This appears to conflict with the majority view.')`,
      [pc.version]);
    await q('commit');

    const n = await count(
      `select count(*)::int n from public.content_reports where reported_by is null`);
    assert(n === 1, `expected 1 anonymous report, got ${n}`);

    // And the anonymous reporter cannot read it back, because the select
    // policy has nothing to match on. That is the correct consequence of
    // allowing anonymous reports.
    const seen = await asAnon(() => count(
      `select count(*)::int n from public.content_reports where reported_by is null`));
    assert(seen === 0, `an anonymous reporter saw ${seen} of their own reports`);
  });

  async function publishForReport(pc) {
    await satisfyReview(pc.version, reviewer, admin);
    await setStatus(pc.version, 'submitted', teacher);
    await setStatus(pc.version, 'approved', reviewer);
    await setStatus(pc.version, 'published', admin);
  }

  await test('provenance is visible once the version is readable', async () => {
    const pc = await draftCourse();
    await publishForReport(pc);
    const src = (await q(
      `insert into public.content_sources
         (course_version_id, source_type, title, created_by)
       values ($1, 'quran', 'Al-Muwatta', $2) returning id`, [pc.version, teacher])).rows[0].id;
    const seen = await asAnon(() =>
      count('select count(*)::int n from public.content_sources where id = $1', [src]));
    assert(seen === 1, `anonymous saw ${seen} sources on a published version`);
  });
}
