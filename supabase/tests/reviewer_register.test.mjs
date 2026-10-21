// Somebody can be made a reviewer.
//
// Before this suite existed, publishing a course version through the product was
// impossible: the gate counts scholarly approvals, an approval needs an assignment,
// an assignment needs a reviewer whose profile reads 'active', and nothing in the
// application could put it in that state. `/admin/reviews` listed reviewers who were
// already active, so its dropdown was permanently empty.
//
// What is pinned here is therefore the chain rather than the columns — that a person
// can register, that only governance staff can verify them, that verification is a
// fact recorded once rather than a label anybody can rewrite, that an authorisation
// is what `is_authorised_reviewer()` reads, and that the whole thing ends where it
// was always meant to: an assigned reviewer approving a version so it can publish.
//
// The role gate is narrower than `is_privileged()` on purpose, and the test that
// pins it uses a support agent: that role is flagged privileged, so a suite that
// only checked "a member of staff" would pass while letting the least-privileged
// staff role appoint somebody to approve Islamic scholarship.

export async function run(ctx) {
  const {
    q, test, assert, rejects, asUser, asAnon, committed,
    newUser, newProfile, grantRole, bootstrapAdmin, newInstructor, newReviewer,
    newCourse, newVersion,
  } = ctx;

  const admin = await bootstrapAdmin('register-admin@example.com');
  await newProfile(admin, 'Register Admin');

  const governance = await newUser('register-governance@example.com');
  await newProfile(governance, 'Governance Admin');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  // Privileged, and still not allowed near this register.
  const support = await newUser('register-support@example.com');
  await newProfile(support, 'Support Agent');
  await committed(() => grantRole(support, 'support_agent', admin));

  const candidateUser = await newUser('register-candidate@example.com');
  await newProfile(candidateUser, 'Register Candidate');
  const secondUser = await newUser('register-second@example.com');
  await newProfile(secondUser, 'Register Second');
  const plainUser = await newUser('register-plain@example.com');
  await newProfile(plainUser, 'Register Plain');
  const teacher = await newInstructor('register-teacher@example.com', admin);
  const roleReviewer = await newReviewer('register-reviewer@example.com', admin);

  /** Writes commit: later tests read back what an earlier one decided. */
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

  const register = (actor, bio = null) =>
    asActor(actor, 'select public.register_as_reviewer($1) as r', [bio])
      .then((res) => res.rows[0].r);
  const setStatus = (actor, profileId, status, note = null) =>
    asActor(actor, 'select public.set_reviewer_status($1,$2,$3) as r', [profileId, status, note])
      .then((res) => res.rows[0].r);
  const recordQualification = (actor, profileId, type, title, over = {}) =>
    asActor(actor,
      'select public.record_reviewer_qualification($1,$2,$3,$4,$5,$6) as r',
      [profileId, type, title, over.institution ?? null, over.subject ?? null,
        over.evidence ?? null])
      .then((res) => res.rows[0].r);
  const verifyQualification = (actor, qualificationId, decision, validUntil = null) =>
    asActor(actor, 'select public.verify_reviewer_qualification($1,$2,$3) as r',
      [qualificationId, decision, validUntil])
      .then((res) => res.rows[0].r);
  const authorise = (actor, profileId, subjectId, scope, status, until = null) =>
    asActor(actor, 'select public.set_reviewer_authorization($1,$2,$3,$4,$5) as r',
      [profileId, subjectId, scope, status, until])
      .then((res) => res.rows[0].r);
  const declareConflict = (actor, type, description, versionId = null) =>
    asActor(actor, 'select public.declare_reviewer_conflict($1,$2,$3) as r',
      [type, description, versionId])
      .then((res) => res.rows[0].r);
  const assessConflict = (actor, declarationId, status, notes = null) =>
    asActor(actor, 'select public.assess_reviewer_conflict($1,$2,$3) as r',
      [declarationId, status, notes])
      .then((res) => res.rows[0].r);

  const profileRow = async (id) =>
    (await q(`select reviewer_status, verified_at, verified_by, deleted_at, public_bio
                from public.reviewer_profiles where id = $1`, [id])).rows[0];
  const qualificationRow = async (id) =>
    (await q(`select verification_status, verified_by, verified_at, valid_until
                from public.reviewer_qualifications where id = $1`, [id])).rows[0];
  const auditFor = async (action, targetId) =>
    (await q(`select actor, detail from public.governance_audit_events
               where action = $1 and target_id = $2 order by occurred_at`,
      [action, targetId])).rows;
  const authorised = async (userId, subjectId, scope) =>
    (await q('select public.is_authorised_reviewer($1,$2,$3) as ok',
      [userId, subjectId, scope])).rows[0].ok;

  const subject = await committed(() => q(
    `insert into public.subject_areas (code, name, status)
     values ($1,'Register Tajweed','active') returning id`,
    [`register.tajweed.${crypto.randomUUID().slice(0, 8)}`]).then((r) => r.rows[0].id));

  // ---------------------------------------------------------------------
  console.log('\nOffering yourself as a reviewer');

  const candidate = await register(candidateUser, 'I have studied tajweed for twenty years.');

  await test('a signed-in person registers, and only as an applicant', async () => {
    assert(candidate.registered === true, 'registration did not report itself');
    assert(candidate.status === 'applicant', `registered as ${candidate.status}`);
    const row = await profileRow(candidate.reviewerProfileId);
    assert(row.reviewer_status === 'applicant', 'the row was not an applicant');
    assert(row.verified_at === null, 'registering verified the reviewer');
    assert(row.verified_by === null, 'registering named a verifier');
    assert(row.public_bio === 'I have studied tajweed for twenty years.', 'the bio was lost');
  });

  await test('registering again reports the state they are already in', async () => {
    const again = await register(candidateUser);
    assert(again.registered === false, 'a second registration claimed to be new');
    assert(again.reviewerProfileId === candidate.reviewerProfileId, 'a second profile was made');
    const count = (await q(
      'select count(*)::int n from public.reviewer_profiles where user_id = $1',
      [candidateUser])).rows[0].n;
    assert(count === 1, 'registering twice left two profiles');
  });

  await test('an overlong biography is refused before it is stored', async () => {
    await rejects(() => register(secondUser, 'x'.repeat(2001)), /2000 characters or fewer/);
  });

  await test('an anonymous visitor cannot register', async () => {
    await rejects(
      () => asAnon(() => q('select public.register_as_reviewer(null)')),
      /sign in to offer yourself as a reviewer/);
  });

  // ---------------------------------------------------------------------
  console.log('\nWho may verify a reviewer');

  await test('a governance admin verifies an applicant, and it is recorded who did', async () => {
    const result = await setStatus(governance, candidate.reviewerProfileId, 'active');
    assert(result.changed === true, 'verification did not report a change');
    assert(result.status === 'active', 'the reviewer was not made active');
    const row = await profileRow(candidate.reviewerProfileId);
    assert(row.reviewer_status === 'active', 'the row did not change');
    assert(row.verified_at !== null, 'verification was not dated');
    assert(row.verified_by === governance, 'verification did not name who verified');
    assert(result.verifiedAt !== null, 'the answer did not carry the verification time');

    const audit = await auditFor('reviewer.status_set', candidate.reviewerProfileId);
    assert(audit.length === 1, 'verification was not audited once');
    assert(audit[0].actor === governance, 'the audit event named the wrong actor');
    assert(audit[0].detail.from_status === 'applicant', 'the audit lost the old status');
    assert(audit[0].detail.verification_recorded === true, 'the audit did not say it verified');
  });

  await test('a support agent is privileged and still may not', async () => {
    // The point of the narrower gate. is_privileged(support) is true.
    const second = await register(secondUser);
    for (const attempt of [
      () => setStatus(support, second.reviewerProfileId, 'active'),
      () => authorise(support, candidate.reviewerProfileId, subject, 'scholarly', 'active'),
      () => assessConflict(support, crypto.randomUUID(), 'accepted', 'Because.'),
    ]) {
      await rejects(attempt, /only a governance admin may/);
    }
  });

  await test('a reviewer may not verify anybody, including themselves', async () => {
    await rejects(() => setStatus(roleReviewer, candidate.reviewerProfileId, 'active'),
      /only a governance admin may change who is a reviewer/);
    await rejects(() => setStatus(candidateUser, candidate.reviewerProfileId, 'suspended', 'Me'),
      /only a governance admin may change who is a reviewer/);
  });

  await test('a status nobody may set by hand is refused', async () => {
    for (const status of ['applicant', 'pending_verification', 'retired', null]) {
      await rejects(() => setStatus(governance, candidate.reviewerProfileId, status, 'x'),
        /a reviewer status is active, suspended or inactive/);
    }
  });

  await test('suspending needs a reason in writing', async () => {
    await rejects(() => setStatus(governance, candidate.reviewerProfileId, 'suspended'),
      /say why this reviewer is being suspended/);
    await rejects(() => setStatus(governance, candidate.reviewerProfileId, 'inactive', '   '),
      /say why this reviewer is being inactive/);
  });

  await test('suspension does not rewrite who verified the reviewer', async () => {
    await setStatus(governance, candidate.reviewerProfileId, 'suspended', 'Complaint under review');
    const suspended = await profileRow(candidate.reviewerProfileId);
    assert(suspended.reviewer_status === 'suspended', 'the reviewer was not suspended');
    assert(suspended.verified_by === governance, 'suspension replaced the verifier');

    // Reinstated by a different person: the verification is still the first one.
    const reinstated = await setStatus(admin, candidate.reviewerProfileId, 'active', 'Cleared');
    assert(reinstated.changed === true, 'reinstating reported no change');
    const row = await profileRow(candidate.reviewerProfileId);
    assert(row.reviewer_status === 'active', 'the reviewer was not reinstated');
    assert(row.verified_by === governance, 'reinstating replaced the verifier');

    const audit = await auditFor('reviewer.status_set', candidate.reviewerProfileId);
    assert(audit.length === 3, 'the two suspensions and reinstatements were not all audited');
    assert(audit[2].detail.verification_recorded === false,
      'reinstating claimed to have verified the reviewer');
  });

  await test('setting the same status twice reports no change and audits nothing', async () => {
    const before = await auditFor('reviewer.status_set', candidate.reviewerProfileId);
    const again = await setStatus(governance, candidate.reviewerProfileId, 'active');
    assert(again.changed === false, 'a no-op reported a change');
    assert(/already active/.test(again.note), 'a no-op did not say why');
    const after = await auditFor('reviewer.status_set', candidate.reviewerProfileId);
    assert(after.length === before.length, 'a no-op was audited');
  });

  await test('a reviewer profile that does not exist is refused', async () => {
    await rejects(() => setStatus(governance, crypto.randomUUID(), 'active'), /no reviewer profile/);
  });

  // ---------------------------------------------------------------------
  console.log('\nQualifications');

  const qualification = await recordQualification(candidateUser, candidate.reviewerProfileId,
    'ijazah', 'Ijazah in Hafs an Asim', { institution: 'Madrasah al-Falah', subject });

  await test('a reviewer records their own qualification, and it is pending', async () => {
    assert(qualification.verificationStatus === 'pending', 'a qualification arrived verified');
    const row = await qualificationRow(qualification.qualificationId);
    assert(row.verification_status === 'pending', 'the row was not pending');
    assert(row.verified_by === null, 'a self-recorded qualification named a verifier');
    const audit = await auditFor('reviewer.qualification_recorded', qualification.qualificationId);
    assert(audit.length === 1, 'recording a qualification was not audited');
    assert(audit[0].detail.recorded_for_someone_else === false,
      'the audit said staff recorded a qualification the reviewer recorded');
  });

  await test('nobody records a qualification for somebody else except governance staff', async () => {
    await rejects(() => recordQualification(plainUser, candidate.reviewerProfileId,
      'degree', 'Someone else\'s degree'),
    /you may only record qualifications for your own reviewer profile/);

    const onBehalf = await recordQualification(governance, candidate.reviewerProfileId,
      'experience', 'Ten years teaching adults', { institution: 'AyahSpring' });
    const audit = await auditFor('reviewer.qualification_recorded', onBehalf.qualificationId);
    assert(audit[0].detail.recorded_for_someone_else === true,
      'the audit did not say staff recorded it for somebody');
  });

  await test('an unknown qualification type is refused with the vocabulary', async () => {
    await rejects(() => recordQualification(candidateUser, candidate.reviewerProfileId,
      'phd', 'Doctorate'), /certificate, degree, ijazah, experience or institutional affiliation/);
    await rejects(() => recordQualification(candidateUser, candidate.reviewerProfileId,
      'ijazah', '   '), /a qualification needs a title/);
  });

  await test('checking a qualification records who checked it and when', async () => {
    const result = await verifyQualification(governance, qualification.qualificationId, 'verified');
    assert(result.changed === true, 'verification did not report a change');
    const row = await qualificationRow(qualification.qualificationId);
    assert(row.verification_status === 'verified', 'the qualification was not verified');
    assert(row.verified_by === governance, 'verification did not name the checker');
    assert(row.verified_at !== null, 'verification was not dated');
    const audit = await auditFor('reviewer.qualification_verified', qualification.qualificationId);
    assert(audit.length === 1, 'checking a qualification was not audited');
  });

  await test('a validity window that has already closed cannot be recorded', async () => {
    const lapsed = await recordQualification(candidateUser, candidate.reviewerProfileId,
      'certificate', 'Certificate that lapsed');
    await rejects(() => verifyQualification(governance, lapsed.qualificationId, 'verified',
      '2020-01-01T00:00:00Z'), /validity window that closed/);
    // Either decision writes verified_at, so rejecting with a past window would
    // break rq_validity_window just as hard and must be refused with a sentence.
    await rejects(() => verifyQualification(governance, lapsed.qualificationId, 'rejected',
      '2020-01-01T00:00:00Z'), /validity window that closed/);
    // A window that is still open is fine, and is stored.
    const open = await verifyQualification(governance, lapsed.qualificationId, 'verified',
      '2030-01-01T00:00:00Z');
    assert(open.validUntil !== null, 'the validity window was dropped');
  });

  await test('deciding twice reports no change, and a reversal is a second decision', async () => {
    const again = await verifyQualification(governance, qualification.qualificationId, 'verified');
    assert(again.changed === false, 'a repeated decision reported a change');
    assert(/already verified/.test(again.note), 'a repeated decision did not say why');

    const reversed = await verifyQualification(admin, qualification.qualificationId, 'rejected');
    assert(reversed.changed === true, 'a reversal reported no change');
    const row = await qualificationRow(qualification.qualificationId);
    assert(row.verification_status === 'rejected', 'the reversal was not stored');
    assert(row.verified_by === admin, 'the reversal did not name who made it');
    assert((await auditFor('reviewer.qualification_verified', qualification.qualificationId))
      .length === 1, 'the reversal duplicated the first audit event');
    assert((await auditFor('reviewer.qualification_rejected', qualification.qualificationId))
      .length === 1, 'the reversal was not audited as a rejection');

    // Put it back: later tests read this qualification as verified.
    await verifyQualification(governance, qualification.qualificationId, 'verified');
  });

  // ---------------------------------------------------------------------
  console.log('\nWhat a reviewer may review');

  await test('a reviewer holds no authorisation until one is granted', async () => {
    assert(await authorised(candidateUser, subject, 'scholarly') === false,
      'a verified reviewer was authorised for a subject nobody granted');
  });

  await test('authorising a subject is what is_authorised_reviewer reads', async () => {
    const result = await authorise(governance, candidate.reviewerProfileId, subject,
      'scholarly', 'active');
    assert(result.changed === true, 'the authorisation did not report a change');
    assert(result.status === 'active', 'the authorisation was not active');
    assert(await authorised(candidateUser, subject, 'scholarly') === true,
      'an active authorisation did not authorise the reviewer');
    assert(await authorised(candidateUser, subject, 'technical') === false,
      'a scholarly authorisation also granted the technical scope');

    const row = (await q(
      `select approver, approved_at, status from public.reviewer_subject_authorizations
        where id = $1`, [result.authorizationId])).rows[0];
    assert(row.approver === governance, 'the authorisation did not record who granted it');
    assert(row.approved_at !== null, 'the authorisation was not dated');
    const audit = await auditFor('reviewer.authorization_set', result.authorizationId);
    assert(audit.length === 1, 'the authorisation was not audited');
    assert(audit[0].detail.review_scope === 'scholarly', 'the audit lost the scope');
  });

  await test('an authorisation for a reviewer who is not verified is refused', async () => {
    const applicant = await register(plainUser);
    await rejects(() => authorise(governance, applicant.reviewerProfileId, subject,
      'scholarly', 'active'), /verify them before authorising a subject/);
    // Pending is not a claim about the reviewer, so it is allowed.
    const pending = await authorise(governance, applicant.reviewerProfileId, subject,
      'scholarly', 'pending');
    assert(pending.status === 'pending', 'a pending authorisation was refused');
    assert(await authorised(plainUser, subject, 'scholarly') === false,
      'a pending authorisation authorised somebody');
  });

  await test('an authorisation whose window has closed cannot be made active', async () => {
    await rejects(() => authorise(governance, candidate.reviewerProfileId, subject, 'technical',
      'active', '2020-01-01T00:00:00Z'), /cannot be made active/);
  });

  await test('revoking ends it, and granting again is a new row beside the old one', async () => {
    const revoked = await authorise(governance, candidate.reviewerProfileId, subject,
      'scholarly', 'revoked');
    assert(revoked.changed === true, 'revoking did not report a change');
    assert(await authorised(candidateUser, subject, 'scholarly') === false,
      'a revoked authorisation still authorised the reviewer');

    const again = await authorise(admin, candidate.reviewerProfileId, subject, 'scholarly', 'active');
    assert(await authorised(candidateUser, subject, 'scholarly') === true,
      're-granting did not authorise the reviewer');

    const rows = (await q(
      `select status, approver from public.reviewer_subject_authorizations
        where reviewer_profile_id = $1 and subject_area_id = $2 and review_scope = 'scholarly'`,
      [candidate.reviewerProfileId, subject])).rows;
    assert(rows.length === 2, 'the revoked authorisation was overwritten rather than kept');
    assert(rows.map((r) => r.status).sort().join() === 'active,revoked',
      'the record of the revocation was lost');
    const granted = rows.find((r) => r.status === 'active');
    assert(granted.approver === admin, 'the new authorisation did not name who granted it');
  });

  // ---------------------------------------------------------------------
  console.log('\nConflicts');

  const course = await committed(() => newCourse(teacher, { title: 'Register: Tajweed Course' }));
  const version = await committed(() => newVersion(course, teacher));

  await test('somebody who is not a reviewer has no conflict to declare', async () => {
    const stranger = await newUser('register-stranger@example.com');
    await newProfile(stranger, 'Register Stranger');
    await rejects(() => declareConflict(stranger, 'authorship', 'I wrote it.'),
      /you are not registered as a reviewer/);
  });

  await test('a reviewer declares a conflict about themselves, and it bars the assignment',
    async () => {
      const declared = await declareConflict(candidateUser, 'authorship',
        'I wrote two of the lessons in this version.', version);
      assert(declared.declared === true, 'the declaration did not report itself');
      assert(declared.status === 'declared', `the declaration was ${declared.status}`);

      const row = (await q(
        `select reviewer_profile_id, course_version_id from public.reviewer_conflict_declarations
          where id = $1`, [declared.declarationId])).rows[0];
      assert(row.reviewer_profile_id === candidate.reviewerProfileId,
        'the declaration was not about the person who made it');
      assert(row.course_version_id === version, 'the declaration lost its version');

      // The teeth: an assignment is refused while the declaration is open.
      await committed(() => q(
        `insert into public.content_review_requirements
           (course_version_id, subject_area_id, review_scope, required_approval_count)
         values ($1,$2,'scholarly',1)`, [version, subject]));
      await rejects(() => asActor(governance,
        `insert into public.content_review_assignments
           (course_version_id, reviewer_profile_id, review_scope, assigned_by, assignment_status)
         values ($1,$2,'scholarly',$3,'offered')`, [version, candidate.reviewerProfileId, governance]),
      /unresolved conflict declaration/);
    });

  await test('declaring the same conflict twice reports the one already declared', async () => {
    const again = await declareConflict(candidateUser, 'authorship', 'I wrote two lessons.', version);
    assert(again.declared === false, 'a repeated declaration claimed to be new');
    assert(/already declared/.test(again.note), 'a repeated declaration did not say why');
    const count = (await q(
      `select count(*)::int n from public.reviewer_conflict_declarations
        where reviewer_profile_id = $1 and course_version_id = $2`,
      [candidate.reviewerProfileId, version])).rows[0].n;
    assert(count === 1, 'declaring twice left two declarations');
  });

  await test('an unknown conflict type or an empty description is refused', async () => {
    await rejects(() => declareConflict(candidateUser, 'rivalry', 'We disagree.'),
      /authorship, financial, family, teacher_student, institutional, personal or other/);
    await rejects(() => declareConflict(candidateUser, 'personal', '  '),
      /describe the conflict/);
  });

  await test('governance staff assess it, and accepting needs a reason', async () => {
    const open = (await q(
      `select id from public.reviewer_conflict_declarations
        where reviewer_profile_id = $1 order by created_at`, [candidate.reviewerProfileId]))
      .rows[0];
    await rejects(() => assessConflict(governance, open.id, 'accepted'),
      /say why this declaration is being accepted/);
    await rejects(() => assessConflict(governance, open.id, 'nonsense', 'Because.'),
      /under_assessment, accepted, disqualifying or resolved/);

    const assessed = await assessConflict(governance, open.id, 'accepted',
      'The two lessons are cited sources, not the reviewer\'s own writing.');
    assert(assessed.changed === true, 'the assessment did not report a change');
    const row = (await q(
      `select status, assessed_by, assessed_at, resolution_notes
         from public.reviewer_conflict_declarations where id = $1`, [open.id])).rows[0];
    assert(row.status === 'accepted', 'the declaration was not assessed');
    assert(row.assessed_by === governance, 'the assessment did not name who made it');
    assert(row.assessed_at !== null, 'the assessment was not dated');
    assert(/cited sources/.test(row.resolution_notes), 'the reason was not stored');
    assert((await auditFor('reviewer.conflict_assessed', open.id)).length === 1,
      'the assessment was not audited');
  });

  // ---------------------------------------------------------------------
  console.log('\nWhat the screens may read');

  await test('the register reads survive the column grants', async () => {
    // Both tables are granted by column, so a query that even filters on an
    // ungranted one is refused outright. This is the test that
    // fetchAssignableReviewers() never had: it asks for `deleted_at is null` and
    // failed for every member of staff until the column was granted.
    const profiles = await asUser(governance, () => q(
      `select id, user_id, reviewer_status, public_bio, verified_at, verified_by,
              created_at, deleted_at
         from public.reviewer_profiles
        where reviewer_status = 'active' and deleted_at is null`));
    assert(profiles.rows.length > 0, 'no active reviewer was readable by governance staff');
    assert(profiles.rows.some((r) => r.id === candidate.reviewerProfileId),
      'the verified reviewer was not in the readable set');

    const qualifications = await asUser(governance, () => q(
      `select id, reviewer_profile_id, qualification_type, qualification_title,
              issuing_institution, subject_area_id, verification_status, verified_at,
              verified_by, valid_until
         from public.reviewer_qualifications
        where reviewer_profile_id = $1`, [candidate.reviewerProfileId]));
    assert(qualifications.rows.length > 0, 'no qualification was readable by governance staff');

    const authorisations = await asUser(governance, () => q(
      `select id, reviewer_profile_id, subject_area_id, review_scope, status, approver,
              approved_at, effective_from, effective_until
         from public.reviewer_subject_authorizations
        where reviewer_profile_id = $1`, [candidate.reviewerProfileId]));
    assert(authorisations.rows.length > 0, 'no authorisation was readable');

    const conflicts = await asUser(governance, () => q(
      `select id, reviewer_profile_id, course_version_id, conflict_type, description,
              status, assessed_by, assessed_at, resolution_notes
         from public.reviewer_conflict_declarations
        where reviewer_profile_id = $1`, [candidate.reviewerProfileId]));
    assert(conflicts.rows.length > 0, 'no declaration was readable');
  });

  await test('staff notes and evidence references stay unreadable', async () => {
    // The grant above added two columns. It must not have opened the two that
    // matter: a reviewer's internal notes, and the storage key of the document
    // behind a qualification.
    await rejects(() => asUser(governance, () => q(
      'select id, internal_notes from public.reviewer_profiles')),
    /permission denied/);
    await rejects(() => asUser(governance, () => q(
      'select id, evidence_reference from public.reviewer_qualifications')),
    /permission denied/);
    await rejects(() => asUser(governance, () => q(
      'select * from public.reviewer_profiles')), /permission denied/);
    // And a reviewer still cannot read somebody else's qualification: the policy
    // makes it empty rather than refusing, which is the same answer as "none".
    const hidden = await asUser(plainUser, () => q(
      `select id from public.reviewer_qualifications where reviewer_profile_id = $1`,
      [candidate.reviewerProfileId]));
    assert(hidden.rows.length === 0, 'another reviewer\'s qualification was readable');
  });

  // ---------------------------------------------------------------------
  console.log('\nThe chain this existed for');

  await test('the authorised reviewer can now be assigned, approve, and publish', async () => {
    // The requirement the conflict test created is still open, and nothing here
    // closes it by hand. An approved decision from a reviewer authorised for that
    // subject is what satisfies it (20261221000100_review_requirements.sql), so the
    // steps below are the whole product path from an application to a publication.
    const assignment = await asActor(governance,
      `insert into public.content_review_assignments
         (course_version_id, reviewer_profile_id, review_scope, assigned_by,
          assignment_status, accepted_at, completed_at)
       values ($1,$2,'scholarly',$3,'completed',now(),now()) returning id`,
      [version, candidate.reviewerProfileId, governance]).then((r) => r.rows[0].id);

    await asActor(candidateUser,
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1,$2,'scholarly','approved','Read against the sources and approved.',$3)`,
      [assignment, version, candidateUser]);

    const requirement = (await q(
      `select requirement_status from public.content_review_requirements
        where course_version_id = $1`, [version])).rows[0];
    assert(requirement.requirement_status === 'satisfied',
      'the approval did not close the requirement written for that subject');

    await q(`update public.course_versions
                set version_status = 'published', decision_by = $2,
                    decision_reason = 'Scholarly approval recorded'
              where id = $1`, [version, governance]);

    const published = (await q(
      'select version_status from public.course_versions where id = $1', [version])).rows[0];
    assert(published.version_status === 'published',
      'a version with a scholarly approval still could not be published');
  });

  await test('an unauthorised reviewer is refused the same assignment', async () => {
    // The mirror of the test above: same version, same requirement, a reviewer who
    // is verified but authorised for nothing.
    const other = await register(secondUser);
    await setStatus(governance, other.reviewerProfileId, 'active');
    await rejects(() => asActor(governance,
      `insert into public.content_review_assignments
         (course_version_id, reviewer_profile_id, review_scope, assigned_by, assignment_status)
       values ($1,$2,'scholarly',$3,'offered')`, [version, other.reviewerProfileId, governance]),
    /holds no active scholarly authorisation/);
  });
}
