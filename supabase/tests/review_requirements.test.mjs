// What a course version needs before it can publish.
//
// Two rules in the schema were inert until now. `enforce_publication_gate()` refuses
// to publish while any `content_review_requirements` row is open, and
// `validate_review_assignment()` checks that a reviewer is authorised for every
// subject the version wrote down. Nothing could write a requirement, so neither rule
// ever fired: any verified reviewer fitted any course, however little they knew of the
// subject.
//
// The opposite direction was inert too, and worse. A requirement anybody created could
// never be closed, because nothing set 'satisfied' — the first requirement written
// would have blocked that version forever, with a gate message and no screen to answer
// it. So most of this suite is about closing one honestly: an approval from a reviewer
// authorised for that subject closes it, and only a governance admin can waive it, in
// writing.
//
// What is deliberately NOT tested, because it is deliberately not built: a recount
// reopening a satisfied requirement. The recount only moves open -> satisfied, so a
// reviewer whose authorisation expires next year does not silently un-publish the
// work they approved. Reopening is an act by a person — raising the number of
// approvals needed — and that is what the test below pins instead.

export async function run(ctx) {
  const {
    q, test, assert, rejects, committed,
    newUser, newProfile, grantRole, bootstrapAdmin, newInstructor,
    newCourse, newVersion, ensureReviewerProfile, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('requirements-admin@example.com');
  await newProfile(admin, 'Requirements Admin');

  const governance = await newUser('requirements-governance@example.com');
  await newProfile(governance, 'Requirements Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  // Privileged, and still outside every decision in this file.
  const support = await newUser('requirements-support@example.com');
  await newProfile(support, 'Requirements Support');
  await committed(() => grantRole(support, 'support_agent', admin));

  const teacher = await newInstructor('requirements-teacher@example.com', admin);
  const stranger = await newUser('requirements-stranger@example.com');
  await newProfile(stranger, 'Requirements Stranger');

  const reviewerA = await newUser('requirements-reviewer-a@example.com');
  await newProfile(reviewerA, 'Reviewer A');
  const reviewerB = await newUser('requirements-reviewer-b@example.com');
  await newProfile(reviewerB, 'Reviewer B');
  const reviewerOther = await newUser('requirements-reviewer-c@example.com');
  await newProfile(reviewerOther, 'Reviewer Other Subject');

  /** Writes commit, so a later test can read what an earlier one decided. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q('select set_config(\'request.jwt.claims\',$1,true)', [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
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

  const requireReview = (actor, version, subject, scope = 'scholarly', count = 1) =>
    asActor(actor, 'select public.require_review($1,$2,$3,$4) as r',
      [version, subject, scope, count]).then((res) => res.rows[0].r);
  const waive = (actor, requirementId, reason) =>
    asActor(actor, 'select public.waive_review_requirement($1,$2) as r', [requirementId, reason])
      .then((res) => res.rows[0].r);
  const refresh = (actor, version) =>
    asActor(actor, 'select public.refresh_review_requirements($1) as r', [version])
      .then((res) => res.rows[0].r);
  const technicalCheck = (actor, version, type, passed, evidence = null) =>
    asActor(actor, 'select public.record_technical_check($1,$2,$3,$4) as r',
      [version, type, passed, evidence]).then((res) => res.rows[0].r);
  const assessChange = (actor, version, changeClass, risk, reReview, rationale, from = null) =>
    asActor(actor, 'select public.assess_content_change($1,$2,$3,$4,$5,$6) as r',
      [version, changeClass, risk, reReview, rationale, from]).then((res) => res.rows[0].r);

  const requirementRow = async (id) =>
    (await q(`select requirement_status, required_approval_count, waived_by, waived_reason
                from public.content_review_requirements where id = $1`, [id])).rows[0];
  const requirementsOf = async (version) =>
    (await q(`select id, subject_area_id, review_scope, requirement_status,
                     required_approval_count
                from public.content_review_requirements
               where course_version_id = $1 order by created_at`, [version])).rows;
  const checksOf = async (version) =>
    (await q(`select id, check_type, passed, evidence, performed_by
                from public.technical_review_checks
               where course_version_id = $1 order by performed_at`, [version])).rows;
  const assessmentsOf = async (version) =>
    (await q(`select id, change_class, risk_level, requires_re_review, rationale,
                     assessed_by, from_version_id
                from public.content_change_assessments
               where course_version_id = $1 order by assessed_at`, [version])).rows;
  const auditFor = async (action, targetId) =>
    (await q(`select actor, detail from public.governance_audit_events
               where action = $1 and target_id = $2 order by occurred_at`,
      [action, targetId])).rows;
  const publish = (version, by) => q(
    `update public.course_versions
        set version_status = 'published', decision_by = $2,
            decision_reason = 'Scholarly approval recorded'
      where id = $1`, [version, by]);

  const newSubject = async (name) => committed(() => q(
    `insert into public.subject_areas (code, name, status)
     values ($1,$2,'active') returning id`,
    [`requirements.${crypto.randomUUID().slice(0, 8)}`, name]).then((r) => r.rows[0].id));

  const tajweed = await newSubject('Requirements Tajweed');
  const fiqh = await newSubject('Requirements Fiqh');
  const retired = await committed(() => q(
    `insert into public.subject_areas (code, name, status)
     values ($1,'Requirements Retired','retired') returning id`,
    [`requirements.retired.${crypto.randomUUID().slice(0, 8)}`]).then((r) => r.rows[0].id));

  /** An active reviewer profile with an active authorisation for one subject. */
  async function authorise(userId, subjectId, scope = 'scholarly') {
    const profileId = await ensureReviewerProfile(userId, admin);
    await committed(() => q(
      `insert into public.reviewer_subject_authorizations
         (reviewer_profile_id, subject_area_id, review_scope, status, approver, approved_at)
       values ($1,$2,$3,'active',$4,now())`, [profileId, subjectId, scope, admin]));
    // A verified qualification in the subject, because since 2026-10-22
    // is_authorised_reviewer() requires one and the assignment trigger reads it.
    await committed(() => q(
      `insert into public.reviewer_qualifications
         (reviewer_profile_id, qualification_type, qualification_title,
          subject_area_id, verification_status, verified_by, verified_at)
       values ($1,'experience','Fixture qualification',$2,'verified',$3,now())`,
      [profileId, subjectId, admin]));
    return profileId;
  }

  const profileA = await authorise(reviewerA, tajweed);
  const profileB = await authorise(reviewerB, tajweed);
  await authorise(reviewerOther, fiqh);

  const course = await newCourse(teacher, { title: 'Requirements Course' });
  const vCounts = await newVersion(course, teacher, { version_number: 1 });
  const vLate = await newVersion(course, teacher, { version_number: 2 });
  const vReopen = await newVersion(course, teacher, { version_number: 3 });
  const vChanges = await newVersion(course, teacher, { version_number: 4 });
  const vStaff = await newVersion(course, teacher, { version_number: 5 });
  const vChecks = await newVersion(course, teacher, { version_number: 6 });

  // D9 allows one published version per course per language, so every version this
  // suite actually publishes gets a course of its own. Sharing one would make the
  // second publication fail on course_versions_one_published_per_language, which
  // says nothing about the requirement being tested.
  const coursePublish = await newCourse(teacher, { title: 'Requirements Published' });
  const vPublish = await newVersion(coursePublish, teacher);
  const courseWaived = await newCourse(teacher, { title: 'Requirements Waived' });
  const vWaived = await newVersion(courseWaived, teacher);
  const courseChecks = await newCourse(teacher, { title: 'Requirements Checked' });
  const vCheckPublish = await newVersion(courseChecks, teacher);

  // ---------------------------------------------------------------------
  console.log('\nWho may write down what a version needs');

  const authored = await requireReview(teacher, vPublish, tajweed);

  await test('the author writes down what their own version needs', async () => {
    assert(typeof authored.requirementId === 'string', 'no requirement came back');
    assert(authored.status === 'open', `a new requirement was ${authored.status}`);
    const row = await requirementRow(authored.requirementId);
    assert(row.requirement_status === 'open', 'the row was not open');
    assert(row.required_approval_count === 1, 'the count was not the one asked for');
    assert(row.waived_by === null, 'a new requirement was already waived');

    const audit = await auditFor('review.requirement_created', authored.requirementId);
    assert(audit.length === 1, 'writing a requirement was not audited');
    assert(audit[0].actor === teacher, 'the audit named the wrong person');
    assert(audit[0].detail.subject_area_id === tajweed, 'the audit lost the subject');
  });

  await test('somebody with nothing to do with the version may not', async () => {
    await rejects(() => requireReview(stranger, vPublish, fiqh),
      /only the author of this version, or governance staff/);
    const rows = await requirementsOf(vPublish);
    assert(rows.length === 1, 'a refused requirement was written anyway');
  });

  await test('a support agent is privileged and still may not', async () => {
    // support_agent carries is_privileged = true, which is why the gate here is the
    // governance pair rather than the house staff predicate.
    await rejects(() => requireReview(support, vPublish, fiqh),
      /only the author of this version, or governance staff/);
    await rejects(() => waive(support, authored.requirementId, 'because I said so'),
      /only a governance admin may waive/);
    await rejects(() => technicalCheck(support, vChecks, 'media_plays', true),
      /only the author of this version, a reviewer assigned to it, or governance staff/);
    await rejects(() => assessChange(support, vChanges, 'typographical', 'low', false, 'x'),
      /only the author of this version, or governance staff/);
  });

  await test('governance staff may write one for a version they did not create', async () => {
    const imposed = await requireReview(governance, vStaff, tajweed, 'scholarly', 2);
    assert(imposed.status === 'open', 'a requirement staff imposed was not open');
    const audit = await auditFor('review.requirement_created', imposed.requirementId);
    assert(audit.length === 1 && audit[0].actor === governance,
      'a requirement imposed by staff was not audited against them');
  });

  await test('the vocabulary is checked before anything is written', async () => {
    await rejects(() => requireReview(teacher, vPublish, tajweed, 'doctrinal'),
      /a review is technical or scholarly/);
    await rejects(() => requireReview(teacher, vPublish, tajweed, 'scholarly', 0),
      /at least one approval/);
    await rejects(() => requireReview(teacher, vPublish, tajweed, null),
      /a review is technical or scholarly/);
    await rejects(() => requireReview(teacher, vPublish, crypto.randomUUID()),
      /no active subject area/);
    await rejects(() => requireReview(teacher, vPublish, retired), /no active subject area/);
  });

  await test('a second requirement for the same subject changes the count instead of duplicating', async () => {
    const raised = await requireReview(teacher, vPublish, tajweed, 'scholarly', 2);
    assert(raised.requirementId === authored.requirementId, 'a second row was made');
    const rows = await requirementsOf(vPublish);
    assert(rows.length === 1, 'one subject and scope left more than one requirement');
    assert(rows[0].required_approval_count === 2, 'the count was not raised');
    const audit = await auditFor('review.requirement_updated', authored.requirementId);
    assert(audit.length === 1, 'raising the count was not audited');
    assert(audit[0].detail.from_count === 1 && audit[0].detail.to_count === 2,
      'the audit did not say what changed');
    // A different scope is a different requirement, not an update.
    const technical = await requireReview(teacher, vPublish, tajweed, 'technical', 1);
    assert(technical.requirementId !== authored.requirementId,
      'a technical requirement overwrote the scholarly one');
  });

  // ---------------------------------------------------------------------
  console.log('\nWhat a requirement does');

  await test('an open requirement blocks publication, and says how many are open', async () => {
    // Two requirements on this version by now: two scholarly approvals in tajweed, and
    // one technical check in tajweed. The gate counts them, and one scholarly approval
    // is not two, and is not a technical one either.
    await satisfyReview(vPublish, reviewerA, admin);
    await rejects(() => publish(vPublish, governance),
      /cannot be published: 2 review requirement\(s\) still open/);
  });

  await test('an approval from a reviewer authorised for that subject closes it', async () => {
    // The approval above was recorded while the count was 1; raising it to 2 reopened
    // the requirement, so this recount is what a screen would ask for after a change.
    const recounted = await refresh(teacher, vPublish);
    const scholarly = recounted.requirements.find((r) => r.reviewScope === 'scholarly');
    assert(scholarly.approvals === 1, `one authorised approval counted as ${scholarly.approvals}`);
    assert(scholarly.required === 2, 'the count was not the one that was raised');
    assert(scholarly.status === 'open', 'one approval satisfied a requirement for two');

    await satisfyReview(vPublish, reviewerB, admin);
    const row = await requirementRow(authored.requirementId);
    assert(row.requirement_status === 'satisfied',
      'two authorised approvals did not satisfy the requirement');
    const audit = await auditFor('review.requirement_satisfied', authored.requirementId);
    assert(audit.length === 1, 'satisfying a requirement was not audited');
    assert(audit[0].detail.approvals === 2, 'the audit did not count the approvals');
  });

  await test('the version then publishes, which is the only reason any of this exists', async () => {
    // The technical requirement is its own row and needs its own approval, in its own
    // scope, from a reviewer authorised for the subject in that scope. Granting the
    // technical authorisation here rather than in the fixture is the point: a
    // scholarly reviewer is not automatically a technical one.
    await committed(() => q(
      `insert into public.reviewer_subject_authorizations
         (reviewer_profile_id, subject_area_id, review_scope, status, approver, approved_at)
       values ($1,$2,'technical','active',$3,now())`, [profileB, tajweed, admin]));

    const technical = await committed(() => q(
      `insert into public.content_review_assignments
         (course_version_id, reviewer_profile_id, review_scope, assigned_by,
          assignment_status, accepted_at, completed_at)
       values ($1,$2,'technical',$3,'completed',now(),now()) returning id`,
      [vPublish, profileB, admin]).then((r) => r.rows[0].id));

    await asActor(reviewerB,
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1,$2,'technical','approved','Every rendition plays and the captions are there.',$3)`,
      [technical, vPublish, reviewerB]);

    await publish(vPublish, governance);
    const row = (await q('select version_status from public.course_versions where id = $1',
      [vPublish])).rows[0];
    assert(row.version_status === 'published',
      'a version whose requirements were satisfied still could not publish');

    const requirements = await requirementsOf(vPublish);
    assert(requirements.every((r) => r.requirement_status !== 'open'),
      'a requirement was still open on a published version');
  });

  await test('an approval from a reviewer authorised for another subject does not count', async () => {
    // The assignment is made before the requirement exists, so the assignment rules
    // have nothing to check against. This is the recount's job: the approval is real,
    // and it is still not an approval of this subject.
    await satisfyReview(vLate, reviewerOther, admin);
    const late = await requireReview(teacher, vLate, tajweed, 'scholarly', 1);
    assert(late.status === 'open', 'a requirement written after the approval came back closed');
    assert(/already recorded/.test(late.note || '') === false,
      'the note claimed approvals that do not count');

    const recounted = await refresh(governance, vLate);
    const row = recounted.requirements[0];
    assert(row.approvals === 0, 'an unauthorised reviewer counted for this subject');
    assert(row.status === 'open', 'the requirement closed on an approval that does not count');
    await rejects(() => publish(vLate, governance), /review requirement\(s\) still open/);
  });

  await test('a requirement written after the approvals arrived closes on the recount', async () => {
    await satisfyReview(vCounts, reviewerA, admin);
    const written = await requireReview(teacher, vCounts, tajweed, 'scholarly', 1);
    assert(written.status === 'satisfied',
      'a requirement was not satisfied by approvals that already existed');
    assert(/already recorded/.test(written.note || ''), 'the answer did not say why it was closed');
  });

  await test('raising the count reopens a satisfied requirement', async () => {
    await satisfyReview(vReopen, reviewerA, admin);
    const first = await requireReview(teacher, vReopen, tajweed, 'scholarly', 1);
    assert(first.status === 'satisfied', 'the first requirement was not satisfied');

    const raised = await requireReview(governance, vReopen, tajweed, 'scholarly', 2);
    assert(raised.reopened === true, 'raising the count did not report a reopening');
    assert(raised.status === 'open', 'a raised count left the requirement satisfied');
    assert(/open again/.test(raised.note || ''), 'the answer did not say it had been reopened');
    await rejects(() => publish(vReopen, governance), /review requirement\(s\) still open/);
  });

  await test('a recount never reopens one, however much later the authorisation ends', async () => {
    // Reviewer A approved vCounts, and the requirement is satisfied. Revoking their
    // authorisation afterwards is a governance act about the future; it does not
    // retract a review that was validly given, and it must not silently make a
    // version unpublishable for a reason nobody chose.
    await committed(() => q(
      `update public.reviewer_subject_authorizations
          set status = 'revoked'
        where reviewer_profile_id = $1 and subject_area_id = $2`, [profileA, tajweed]));

    const recounted = await refresh(governance, vCounts);
    const row = recounted.requirements[0];
    assert(row.approvals === 0, 'a revoked authorisation still counted towards new approvals');
    assert(row.status === 'satisfied', 'the recount reopened a satisfied requirement');
    const still = await requirementRow(
      (await requirementsOf(vCounts))[0].id);
    assert(still.requirement_status === 'satisfied', 'the row was reopened');
  });

  await test('the recount reports every requirement, and a reviewer may ask for it', async () => {
    const answer = await refresh(reviewerA, vPublish);
    assert(answer.courseVersionId === vPublish, 'the answer lost the version');
    assert(Array.isArray(answer.requirements), 'the answer had no breakdown');
    assert(answer.requirements.length === 2, 'not every requirement was reported');
    // The technical requirement was met above, and the scholarly one for two approvals
    // was met by reviewer A and reviewer B. What must not happen is the two scopes
    // counting each other's approvals.
    const technical = answer.requirements.find((r) => r.reviewScope === 'technical');
    assert(technical.status === 'satisfied', 'a met technical requirement was reported as open');
    assert(technical.approvals === 1, 'a technical requirement counted the scholarly approvals');
  });

  // ---------------------------------------------------------------------
  console.log('\nWaiving one');

  await test('governance staff may waive one, in writing, and it stops blocking', async () => {
    const requirement = (await requirementsOf(vWaived)).length
      ? (await requirementsOf(vWaived))[0]
      : null;
    assert(requirement === null, 'the version already had a requirement');

    const created = await requireReview(teacher, vWaived, tajweed, 'scholarly', 1);
    const waived = await waive(governance, created.requirementId,
      'No reviewer is authorised in this subject and the course is a transcription of a published book.');
    assert(waived.status === 'waived' && waived.changed === true, 'the waiver was not recorded');

    const row = await requirementRow(created.requirementId);
    assert(row.requirement_status === 'waived', 'the row was not waived');
    assert(row.waived_by === governance, 'the waiver did not say who waived it');
    assert(/No reviewer is authorised/.test(row.waived_reason), 'the reason was not stored');

    const audit = await auditFor('review.requirement_waived', created.requirementId);
    assert(audit.length === 1, 'a waiver was not audited');
    assert(audit[0].detail.previous_status === 'open', 'the audit lost the previous state');

    // Waived, not satisfied: the gate counts open requirements, and this is not one.
    await rejects(() => publish(vWaived, governance), /scholarly approval/,
      'the version published with no approval at all');
  });

  await test('waiving does not replace the approval the gate always needs', async () => {
    // The refusal above is the point: a waiver clears the requirement somebody wrote,
    // and governance.min_approvals is a separate dial that a waiver does not touch.
    await satisfyReview(vWaived, reviewerB, admin);
    await publish(vWaived, governance);
    const row = (await q('select version_status from public.course_versions where id = $1',
      [vWaived])).rows[0];
    assert(row.version_status === 'published',
      'a waived requirement and an approval did not publish the version');
  });

  await test('nobody else may waive one, and a blank reason is not a reason', async () => {
    const created = await requireReview(teacher, vChecks, tajweed, 'scholarly', 1);
    await rejects(() => waive(teacher, created.requirementId, 'I would rather not'),
      /only a governance admin may waive/);
    await rejects(() => waive(stranger, created.requirementId, 'whatever'),
      /only a governance admin may waive/);
    await rejects(() => waive(governance, created.requirementId, '   '),
      /a waiver needs the reason in writing/);
    await rejects(() => waive(governance, created.requirementId, null),
      /a waiver needs the reason in writing/);
    await rejects(() => waive(governance, crypto.randomUUID(), 'nothing to waive'),
      /no review requirement/);
  });

  await test('waiving twice reports the state it is already in', async () => {
    const created = (await requirementsOf(vChanges)).length
      ? null
      : await requireReview(teacher, vChanges, fiqh, 'scholarly', 1);
    const first = await waive(governance, created.requirementId, 'Out of scope for this release.');
    const second = await waive(governance, created.requirementId, 'A different reason.');
    assert(first.changed === true, 'the first waiver did not report a change');
    assert(second.changed === false, 'the second waiver claimed to change something');
    assert(/already waived/.test(second.note || ''), 'the second waiver did not say why');
    const row = await requirementRow(created.requirementId);
    assert(/Out of scope/.test(row.waived_reason), 'a second waiver rewrote the first reason');
  });

  await test('governance staff may reopen a waived requirement; the author may not', async () => {
    const created = await requireReview(teacher, vChanges, tajweed, 'scholarly', 1);
    await waive(governance, created.requirementId, 'Not needed for this release.');
    await rejects(() => requireReview(teacher, vChanges, tajweed, 'scholarly', 2),
      /only governance staff may reopen it/);

    const reopened = await requireReview(governance, vChanges, tajweed, 'scholarly', 2);
    assert(reopened.reopened === true, 'reopening a waiver was not reported');
    assert(reopened.status === 'open', 'a waived requirement stayed waived');
    const row = await requirementRow(created.requirementId);
    assert(row.waived_by === null && row.waived_reason === null,
      'the reopened requirement kept the waiver that no longer applies');
    const audit = await auditFor('review.requirement_reopened', created.requirementId);
    assert(audit.length === 1, 'reopening a waiver was not audited');
    assert(audit[0].detail.previous_waiver === 'Not needed for this release.',
      'the audit lost the waiver it undid');
  });

  // ---------------------------------------------------------------------
  console.log('\nThe checks an author or a reviewer performs');

  await test('the author records a self-check, and it is theirs', async () => {
    const recorded = await technicalCheck(teacher, vChecks, 'media_plays', true,
      'Played all four renditions in a browser and on a phone.');
    assert(recorded.passed === true, 'the check did not record its answer');
    const rows = await checksOf(vChecks);
    assert(rows.length === 1, 'the check was not written');
    assert(rows[0].performed_by === teacher, 'the check was attributed to somebody else');
    assert(rows[0].evidence.startsWith('Played all four'), 'the evidence was lost');

    const audit = await auditFor('review.technical_check_recorded', recorded.checkId);
    assert(audit.length === 1, 'a technical check was not audited');
    assert(audit[0].detail.recorded_by_author === true, 'the audit did not say who it was');
  });

  await test('a reviewer assigned to the version may record one too', async () => {
    await satisfyReview(vChecks, reviewerB, admin);
    const recorded = await technicalCheck(reviewerB, vChecks, 'captions_present', false,
      'Two lessons have no captions.');
    assert(recorded.passed === false, 'a failed check was not recorded as failed');
    assert(/does not block publication/.test(recorded.note || ''),
      'a failed check claimed to block something it does not');
    const rows = await checksOf(vChecks);
    assert(rows.some((r) => r.performed_by === reviewerB), 'the reviewer check was not written');
  });

  await test('somebody with no seat on the version may not', async () => {
    await rejects(() => technicalCheck(stranger, vChecks, 'media_plays', true),
      /only the author of this version, a reviewer assigned to it, or governance staff/);
    // A reviewer assigned to a different version is a stranger to this one.
    await rejects(() => technicalCheck(reviewerOther, vChecks, 'media_plays', true),
      /only the author of this version, a reviewer assigned to it, or governance staff/);
  });

  await test('the check vocabulary is checked, and empty evidence is no evidence', async () => {
    await rejects(() => technicalCheck(teacher, vChecks, 'looks_fine', true),
      /a technical check is media_plays/);
    await rejects(() => technicalCheck(teacher, vChecks, 'media_plays', null),
      /say whether the check passed/);
    await rejects(() => technicalCheck(teacher, vChecks, 'media_plays', true, 'x'.repeat(2001)),
      /2000 characters or fewer/);
    const blank = await technicalCheck(teacher, vChecks, 'links_resolve', true, '   ');
    const rows = await checksOf(vChecks);
    const mine = rows.find((r) => r.id === blank.checkId);
    assert(mine.evidence === null, 'blank evidence was stored as blank');
  });

  await test('checks are append-only, so a re-check is a second row', async () => {
    const before = (await checksOf(vChecks)).length;
    await technicalCheck(teacher, vChecks, 'media_plays', false, 'One rendition 404s today.');
    const rows = await checksOf(vChecks);
    assert(rows.length === before + 1, 'a re-check replaced the earlier one');
    const plays = rows.filter((r) => r.check_type === 'media_plays');
    assert(plays.length === 2, 'the history of one check kind was collapsed');
    assert(plays[0].passed === true && plays[1].passed === false,
      'the checks are not in the order they were made');
  });

  await test('a failed check does not block publication, because it is not a review', async () => {
    await requireReview(teacher, vCheckPublish, tajweed, 'scholarly', 1);
    await satisfyReview(vCheckPublish, reviewerB, admin);
    await technicalCheck(teacher, vCheckPublish, 'media_plays', false,
      'One rendition 404s on the delivery copy.');
    await publish(vCheckPublish, governance);

    const row = (await q('select version_status from public.course_versions where id = $1',
      [vCheckPublish])).rows[0];
    assert(row.version_status === 'published',
      'a failed self-check stopped a publication it has no authority over');
    const failed = (await checksOf(vCheckPublish)).filter((c) => !c.passed);
    assert(failed.length === 1, 'the failed check was not there to be read');
  });

  // ---------------------------------------------------------------------
  console.log('\nWhat changed, and whether it needs a fresh review');

  await test('the author classifies what changed in a new version', async () => {
    // vCounts is another version of the same course, which is the rule: a change is
    // assessed against the version it came from, not against somebody else's course.
    const assessed = await assessChange(teacher, vChanges, 'content_minor', 'medium', true,
      'Added two lessons on wudu and reworded the introduction.', vCounts);
    assert(assessed.requiresReReview === true, 'the assessment lost its answer');
    assert(/needs a fresh review/.test(assessed.note || ''), 'the answer did not say what follows');
    const rows = await assessmentsOf(vChanges);
    assert(rows.length === 1, 'the assessment was not written');
    assert(rows[0].assessed_by === teacher, 'the assessment was attributed to somebody else');
    assert(rows[0].from_version_id === vCounts, 'the assessment lost the version it came from');

    const audit = await auditFor('review.change_assessed', assessed.assessmentId);
    assert(audit.length === 1, 'classifying a change was not audited');
    assert(audit[0].detail.assessed_by_author === true, 'the audit did not say it was the author');
  });

  await test('a doctrinal change may not be called minor', async () => {
    await rejects(() => assessChange(teacher, vChanges, 'doctrinal', 'low', true,
      'Restated the ruling on interest.'), /a doctrinal change is never low risk/);
    await rejects(() => assessChange(teacher, vChanges, 'source_change', 'high', false,
      'Switched from one tafsir to another.'), /a source_change change is never low risk/);
    await rejects(() => assessChange(teacher, vChanges, 'doctrinal', 'medium', true, 'x'),
      /a doctrinal change is never low risk/);
    const allowed = await assessChange(teacher, vChanges, 'doctrinal', 'critical', true,
      'Restated the ruling on interest, with new sources.');
    assert(allowed.riskLevel === 'critical', 'a material change was not recorded');
  });

  await test('the vocabulary and the reason are checked', async () => {
    await rejects(() => assessChange(teacher, vChanges, 'cosmetic', 'low', false, 'x'),
      /a change is typographical/);
    await rejects(() => assessChange(teacher, vChanges, 'typographical', 'severe', false, 'x'),
      /a risk is low, medium, high or critical/);
    await rejects(() => assessChange(teacher, vChanges, 'typographical', 'low', null, 'x'),
      /say whether this needs a fresh review/);
    await rejects(() => assessChange(teacher, vChanges, 'typographical', 'low', false, '  '),
      /classify a change with the reason in writing/);
    await rejects(() => assessChange(teacher, vChanges, 'typographical', 'low', false, 'x'.repeat(2001)),
      /2000 characters or fewer/);
  });

  await test('the version it came from has to be another version of the same course', async () => {
    await rejects(() => assessChange(teacher, vChanges, 'typographical', 'low', false,
      'Fixed two spellings.', vChanges), /did not change from itself/);

    const otherCourse = await newCourse(teacher, { title: 'Requirements Other Course' });
    const otherVersion = await newVersion(otherCourse, teacher);
    await rejects(() => assessChange(teacher, vChanges, 'typographical', 'low', false,
      'Fixed two spellings.', otherVersion), /not another version of the same course/);

    const standing = await assessChange(teacher, vChanges, 'typographical', 'low', false,
      'Fixed two spellings.');
    assert(standing.requiresReReview === false, 'a cosmetic fix was marked as needing review');
  });

  await test('a stranger may not classify, and governance staff may classify beside the author', async () => {
    await rejects(() => assessChange(stranger, vChanges, 'structural', 'high', true, 'No.'),
      /only the author of this version, or governance staff/);

    const before = (await assessmentsOf(vChanges)).length;
    const staff = await assessChange(governance, vChanges, 'doctrinal', 'high', true,
      'Read against the earlier version: the ruling changed, not only the wording.');
    const rows = await assessmentsOf(vChanges);
    assert(rows.length === before + 1, 'a governance assessment replaced the author\'s');
    assert(rows.some((r) => r.assessed_by === teacher) && rows.some((r) => r.assessed_by === governance),
      'the two assessments do not sit beside each other with who said which');
    const audit = await auditFor('review.change_assessed', staff.assessmentId);
    assert(audit[0].detail.assessed_by_author === false,
      'the audit called a governance assessment the author\'s');
  });

  await test('every writer here is granted to authenticated and to nobody else', async () => {
    const rows = (await q(
      `select p.proname,
              bool_or(has_function_privilege('anon'::name, p.oid, 'execute'::text)) as anon_may,
              bool_or(has_function_privilege('authenticated'::name, p.oid, 'execute'::text)) as auth_may
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('refresh_review_requirements', 'require_review',
                            'waive_review_requirement', 'record_technical_check',
                            'assess_content_change')
        group by p.proname`)).rows;
    assert(rows.length === 5, `expected five functions, found ${rows.length}`);
    for (const row of rows) {
      assert(row.anon_may === false, `${row.proname} is callable anonymously`);
      assert(row.auth_may === true, `${row.proname} is not callable by a signed-in user`);
    }
  });

}
