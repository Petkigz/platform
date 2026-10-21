import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ASSIGNMENT_STATUS_LABEL,
  WATCHABLE_ASSIGNMENT_STATUSES,
  isAssignmentWatchable,
  type AssignmentStatus,
} from './review.ts';

// The states a content review assignment can be in. Written out here so that
// adding one to the schema without deciding whether its media is served breaks a
// test rather than silently landing on one side of the line.
const EVERY_STATUS: AssignmentStatus[] = [
  'offered', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled',
];

test('media is served while a review is open, and only while it is open', () => {
  // This must match may_review_version_media() in
  // 20261213000100_reviewer_media_access.sql, which requires accepted or
  // in_progress. The database decides; this list is what a screen uses to say why
  // a lesson is not playable.
  assert.deepEqual([...WATCHABLE_ASSIGNMENT_STATUSES], ['accepted', 'in_progress']);
  assert.equal(isAssignmentWatchable('accepted'), true);
  assert.equal(isAssignmentWatchable('in_progress'), true);
});

test('an assignment that has not started, or has ended, is not watchable', () => {
  // Somebody who declined never was, and somebody who finished stops being served
  // the moment they finish: the reason for the access ended, so the access ends.
  assert.equal(isAssignmentWatchable('offered'), false);
  assert.equal(isAssignmentWatchable('declined'), false);
  assert.equal(isAssignmentWatchable('completed'), false);
  assert.equal(isAssignmentWatchable('cancelled'), false);
});

test('every status has been decided, one way or the other', () => {
  for (const status of EVERY_STATUS) {
    assert.equal(typeof isAssignmentWatchable(status), 'boolean',
      `${status} had no answer`);
    assert.equal(WATCHABLE_ASSIGNMENT_STATUSES.includes(status),
      isAssignmentWatchable(status),
      `${status} disagreed with the list`);
  }
  const watchable = EVERY_STATUS.filter(isAssignmentWatchable);
  assert.equal(watchable.length, 2, `expected two open states, found ${watchable.join(', ')}`);
});

test('every status has a label, because a page prints it', () => {
  for (const status of EVERY_STATUS) {
    const label = ASSIGNMENT_STATUS_LABEL[status];
    assert.ok(label && label.length > 0, `${status} has no label`);
  }
  // The review page lowercases the label into a sentence, so no label may be a
  // whole sentence of its own.
  for (const status of EVERY_STATUS) {
    assert.equal(/[.!?]$/.test(ASSIGNMENT_STATUS_LABEL[status]), false,
      `${status} is labelled with a sentence`);
  }
});

// ---------------------------------------------------------------------------
// The reviewer register
//
// What is under test here is the vocabulary a screen prints, the refusals that are
// cheap to make before a round trip, and the shape of what goes to the database.
// Three rules matter more than the rest:
//
//   * nobody sends an actor. Every register function reads the session, so a
//     parameter naming the caller would be a way to speak for somebody else.
//   * the column lists are written out. Two columns on these tables are not granted
//     to the client role, and a query that even filters on an ungranted column is
//     refused outright — which is exactly how the reviewer dropdown on
//     /admin/reviews came to fail for everybody.
//   * BARRING_CONFLICT_STATUSES is read the right way round. Getting it backwards
//     would quietly let a conflicted reviewer approve a course.
// ---------------------------------------------------------------------------

import {
  AUTHORIZATION_STATUS_LABEL,
  AUTHORIZATION_STATUSES,
  BIO_MAX,
  BARRING_CONFLICT_STATUSES,
  CONFLICT_ASSESSMENTS,
  CONFLICT_STATUS_LABEL,
  CONFLICT_TYPES,
  CONFLICT_TYPE_LABEL,
  QUALIFICATION_DECISIONS,
  QUALIFICATION_STATUS_LABEL,
  QUALIFICATION_TYPES,
  QUALIFICATION_TYPE_LABEL,
  REVIEWER_STATUS_LABEL,
  SETTABLE_REVIEWER_STATUSES,
  declareReviewerConflict,
  fetchReviewerRegister,
  fetchSubjectOptions,
  mapReviewerError,
  recordReviewerQualification,
  registerAsReviewer,
  setReviewerAuthorization,
  setReviewerStatus,
  verifyReviewerQualification,
  validateAssessmentInput,
  validateAuthorizationInput,
  validateConflictInput,
  validateQualificationDecision,
  validateQualificationInput,
  validateReviewerBio,
  validateReviewerStatusInput,
  assessReviewerConflict,
  type ConflictStatus,
  type ReviewerStatus,
} from './review.ts';

const EVERY_REVIEWER_STATUS: ReviewerStatus[] = [
  'applicant', 'pending_verification', 'active', 'suspended', 'inactive',
];

const EVERY_CONFLICT_STATUS: ConflictStatus[] = [
  'declared', 'under_assessment', 'accepted', 'disqualifying', 'resolved',
];

type RpcCall = { fn: string; args: Record<string, unknown> };
type FilterCall = { kind: string; column: string; value: unknown };
type TableCall = { table: string; select?: string; filters: FilterCall[] };

/**
 * A stub for the register's reads and writes.
 *
 * Tables are keyed by name rather than by call order because
 * `fetchReviewerRegister` issues its child queries with `Promise.all`, and an
 * order-keyed stub would then be asserting the order of a race.
 */
function stubRegister(specs: Record<string, { data: unknown; error?: { message: string } }> = {}) {
  const tables: TableCall[] = [];
  const rpcCalls: RpcCall[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    from: (table: string) => {
      const call: TableCall = { table, filters: [] };
      tables.push(call);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = (cols?: string) => {
        if (typeof cols === 'string') call.select = cols;
        return chain;
      };
      chain.eq = (column: string, value: unknown) => {
        call.filters.push({ kind: 'eq', column, value });
        return chain;
      };
      chain.is = (column: string, value: unknown) => {
        call.filters.push({ kind: 'is', column, value });
        return chain;
      };
      chain.in = (column: string, values: unknown) => {
        call.filters.push({ kind: 'in', column, value: values });
        return chain;
      };
      chain.order = () => chain;
      chain.maybeSingle = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => {
        const spec = specs[table] ?? { data: [] };
        return Promise.resolve({ data: spec.data, error: spec.error ?? null }).then(resolve);
      };
      return chain;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      const reply = specs[`rpc:${fn}`];
      return { data: reply ? reply.data : null, error: reply?.error ?? null };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return {
    client,
    rpcCalls,
    tables,
    selects: () => tables.map((t) => t.select ?? '').join(' '),
    filtersOf: (table: string) => tables.filter((t) => t.table === table).flatMap((t) => t.filters),
  };
}

test('every reviewer status has a label, and none of them is a sentence', () => {
  for (const status of EVERY_REVIEWER_STATUS) {
    const label = REVIEWER_STATUS_LABEL[status];
    assert.ok(label && label.length > 0, `${status} has no label`);
    // The register card lowercases a label into a sentence of its own.
    assert.equal(/[.!?]$/.test(label), false, `${status} is labelled with a sentence`);
  }
});

test('every vocabulary the forms offer has a label', () => {
  for (const type of QUALIFICATION_TYPES) {
    assert.ok(QUALIFICATION_TYPE_LABEL[type], `${type} has no label`);
  }
  for (const status of Object.keys(QUALIFICATION_STATUS_LABEL)) {
    assert.ok(QUALIFICATION_STATUS_LABEL[status as keyof typeof QUALIFICATION_STATUS_LABEL]);
  }
  for (const status of AUTHORIZATION_STATUSES) {
    assert.ok(AUTHORIZATION_STATUS_LABEL[status], `${status} has no label`);
  }
  for (const type of CONFLICT_TYPES) {
    assert.ok(CONFLICT_TYPE_LABEL[type], `${type} has no label`);
  }
  for (const status of EVERY_CONFLICT_STATUS) {
    assert.ok(CONFLICT_STATUS_LABEL[status], `${status} has no label`);
  }
  for (const decision of QUALIFICATION_DECISIONS) {
    assert.ok(decision === 'verified' || decision === 'rejected', `${decision} is not a decision`);
  }
});

test('nothing may set a person back to applicant', () => {
  // Registration is the only route to applicant and pending_verification. If an
  // admin could set either by hand they could un-verify a reviewer and leave the
  // record saying somebody checked them.
  assert.deepEqual([...SETTABLE_REVIEWER_STATUSES], ['active', 'suspended', 'inactive']);
  assert.equal(SETTABLE_REVIEWER_STATUSES.includes('applicant' as never), false);
  assert.equal(SETTABLE_REVIEWER_STATUSES.includes('pending_verification' as never), false);

  const refused = validateReviewerStatusInput({ status: 'pending_verification', note: 'hiding it' });
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.message, /nothing may be set back to applicant/i);
});

test('the declarations that bar an assignment are the three the trigger refuses', () => {
  // Copied from validate_review_assignment(): a declaration bars while it is
  // declared, under_assessment or disqualifying. Read backwards, this list would
  // let a conflicted reviewer approve a course.
  assert.deepEqual([...BARRING_CONFLICT_STATUSES],
    ['declared', 'under_assessment', 'disqualifying']);
  assert.equal(BARRING_CONFLICT_STATUSES.includes('accepted'), false,
    'hearing a conflict must not keep barring the reviewer');
  assert.equal(BARRING_CONFLICT_STATUSES.includes('resolved'), false);

  // Every status is on one side of the line or the other, and no status is missing.
  for (const status of EVERY_CONFLICT_STATUS) {
    const bars = BARRING_CONFLICT_STATUSES.includes(status);
    const heard = status === 'accepted' || status === 'resolved';
    assert.equal(bars, !heard, `${status} is on neither side, or both`);
  }
});

test('a biography is optional, trimmed, and limited', () => {
  assert.deepEqual(validateReviewerBio(''), { ok: true, value: null });
  assert.deepEqual(validateReviewerBio(null), { ok: true, value: null });
  assert.deepEqual(validateReviewerBio('  Teaches tajweed  '), { ok: true, value: 'Teaches tajweed' });
  const tooLong = validateReviewerBio('a'.repeat(BIO_MAX + 1));
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.match(tooLong.message, new RegExp(`${BIO_MAX}`));
  assert.equal(validateReviewerBio(42).ok, false);
});

test('ending somebody’s access needs a reason; checking them does not', () => {
  const verified = validateReviewerStatusInput({ status: 'active' });
  assert.deepEqual(verified, { ok: true, value: { status: 'active', note: null } });

  const suspended = validateReviewerStatusInput({ status: 'suspended' });
  assert.equal(suspended.ok, false);
  if (!suspended.ok) assert.match(suspended.message, /a reason is required/i);

  const written = validateReviewerStatusInput({ status: 'suspended', note: '  Conduct review  ' });
  assert.deepEqual(written, { ok: true, value: { status: 'suspended', note: 'Conduct review' } });

  assert.equal(validateReviewerStatusInput({ status: 'nonsense', note: 'x' }).ok, false);
  assert.equal(validateReviewerStatusInput({}).ok, false);
});

test('a qualification needs a kind and a title, and nothing else', () => {
  assert.equal(validateQualificationInput({}).ok, false);
  assert.equal(validateQualificationInput({ qualificationType: 'diploma', title: 'x' }).ok, false);

  const bare = validateQualificationInput({ qualificationType: 'ijazah', title: 'Hafs an Asim' });
  assert.deepEqual(bare, {
    ok: true,
    value: {
      qualificationType: 'ijazah',
      title: 'Hafs an Asim',
      institution: null,
      subjectAreaId: null,
    },
  });

  const full = validateQualificationInput({
    qualificationType: 'certificate',
    title: '  Diploma in Arabic  ',
    institution: '  Madrasah al-Falah  ',
    subjectAreaId: '6f1a1b6a-0000-4000-8000-000000000001',
  });
  assert.equal(full.ok, true);
  if (full.ok) {
    assert.equal(full.value.title, 'Diploma in Arabic');
    assert.equal(full.value.institution, 'Madrasah al-Falah');
  }

  assert.equal(validateQualificationInput({ qualificationType: 'degree', title: 'x'.repeat(201) }).ok, false);
  assert.equal(validateQualificationInput({
    qualificationType: 'degree', title: 'x', subjectAreaId: 'not-a-uuid',
  }).ok, false);
});

test('a validity window that has closed cannot be recorded either way', () => {
  const past = '2020-01-01T00:00:00.000Z';
  for (const decision of QUALIFICATION_DECISIONS) {
    const refused = validateQualificationDecision({ decision, validUntil: past });
    assert.equal(refused.ok, false, `${decision} accepted a closed window`);
    if (!refused.ok) assert.match(refused.message, /already closed/i);
  }

  assert.deepEqual(validateQualificationDecision({ decision: 'verified' }),
    { ok: true, value: { decision: 'verified', validUntil: null } });
  assert.equal(validateQualificationDecision({ decision: 'verified', validUntil: 'tomorrow' }).ok, false);
  assert.equal(validateQualificationDecision({ decision: 'maybe' }).ok, false);

  const future = validateQualificationDecision({ decision: 'verified', validUntil: '2030-01-01' });
  assert.equal(future.ok, true);
  if (future.ok) assert.equal(future.value.validUntil, new Date('2030-01-01').toISOString());
});

test('an authorisation needs a subject, a scope, and a status it can hold', () => {
  const subject = '6f1a1b6a-0000-4000-8000-000000000002';
  assert.equal(validateAuthorizationInput({ scope: 'scholarly', status: 'active' }).ok, false,
    'a subject was not required');
  assert.equal(validateAuthorizationInput({ subjectAreaId: subject, scope: 'both', status: 'active' }).ok, false);
  assert.equal(validateAuthorizationInput({ subjectAreaId: subject, scope: 'scholarly', status: 'granted' }).ok, false);

  const granted = validateAuthorizationInput({ subjectAreaId: subject, scope: 'scholarly', status: 'active' });
  assert.deepEqual(granted, {
    ok: true,
    value: { subjectAreaId: subject, scope: 'scholarly', status: 'active', effectiveUntil: null },
  });

  const withExtra: Record<string, unknown> = {
    subjectAreaId: subject, scope: 'scholarly', status: 'active', validUntil: 'x',
  };
  assert.equal(validateAuthorizationInput(withExtra).ok, true,
    'an unrelated field is ignored rather than refused');

  const expired = validateAuthorizationInput({
    subjectAreaId: subject, scope: 'technical', status: 'active', effectiveUntil: '2020-01-01',
  });
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.match(expired.message, /already expired/i);

  // Revoking something whose window has passed is a record of the past, not a grant.
  const revoked = validateAuthorizationInput({
    subjectAreaId: subject, scope: 'technical', status: 'revoked', effectiveUntil: '2020-01-01',
  });
  assert.equal(revoked.ok, true);
});

test('a conflict needs a kind and the reviewer’s own words', () => {
  assert.equal(validateConflictInput({ conflictType: 'family' }).ok, false);
  assert.equal(validateConflictInput({ conflictType: 'neighbour', description: 'x' }).ok, false);
  assert.equal(validateConflictInput({ conflictType: 'family', description: '   ' }).ok, false);

  // No version is a standing declaration, which is the common case.
  assert.deepEqual(validateConflictInput({ conflictType: 'authorship', description: ' I wrote it ' }), {
    ok: true,
    value: { conflictType: 'authorship', description: 'I wrote it', courseVersionId: null },
  });

  assert.equal(validateConflictInput({
    conflictType: 'authorship', description: 'x', courseVersionId: 'nope',
  }).ok, false);
});

test('hearing a conflict or barring someone needs the reason in writing', () => {
  assert.equal(validateAssessmentInput({ status: 'accepted' }).ok, false);
  assert.equal(validateAssessmentInput({ status: 'disqualifying', notes: '  ' }).ok, false);
  assert.deepEqual(validateAssessmentInput({ status: 'under_assessment' }),
    { ok: true, value: { status: 'under_assessment', notes: null } });
  assert.deepEqual(validateAssessmentInput({ status: 'resolved' }),
    { ok: true, value: { status: 'resolved', notes: null } });
  assert.equal(validateAssessmentInput({ status: 'declared' }).ok, false,
    'declared is what a reviewer writes, not what staff decide');
  assert.deepEqual(
    validateAssessmentInput({ status: 'accepted', notes: '  Taught them a decade ago  ' }),
    { ok: true, value: { status: 'accepted', notes: 'Taught them a decade ago' } },
  );
  for (const status of CONFLICT_ASSESSMENTS) {
    assert.ok(CONFLICT_STATUS_LABEL[status], `${status} has no label`);
  }
});

test('nobody sends an actor: every register function reads the session', async () => {
  const stub = stubRegister({
    'rpc:register_as_reviewer': { data: { reviewerProfileId: 'p-1', status: 'applicant', registered: true } },
    'rpc:set_reviewer_status': { data: { status: 'active', changed: true } },
    'rpc:record_reviewer_qualification': { data: { qualificationId: 'q-1' } },
    'rpc:verify_reviewer_qualification': { data: { verificationStatus: 'verified', changed: true } },
    'rpc:set_reviewer_authorization': { data: { authorizationId: 'a-1', status: 'active', changed: true } },
    'rpc:declare_reviewer_conflict': { data: { declarationId: 'd-1', declared: true } },
    'rpc:assess_reviewer_conflict': { data: { status: 'accepted', changed: true } },
  });

  await registerAsReviewer(stub.client, { bio: 'Teaches tajweed' });
  await setReviewerStatus(stub.client, { reviewerProfileId: 'p-1', status: 'active', note: null });
  await recordReviewerQualification(stub.client, {
    reviewerProfileId: 'p-1', qualificationType: 'ijazah', title: 'Hafs',
  });
  await verifyReviewerQualification(stub.client, { qualificationId: 'q-1', decision: 'verified' });
  await setReviewerAuthorization(stub.client, {
    reviewerProfileId: 'p-1', subjectAreaId: '6f1a1b6a-0000-4000-8000-000000000003',
    scope: 'scholarly', status: 'active',
  });
  await declareReviewerConflict(stub.client, { conflictType: 'family', description: 'My brother' });
  await assessReviewerConflict(stub.client, { declarationId: 'd-1', status: 'accepted', notes: 'Heard' });

  assert.equal(stub.rpcCalls.length, 7, 'a caller did not reach the database');
  for (const call of stub.rpcCalls) {
    for (const key of Object.keys(call.args)) {
      assert.equal(/actor|p_user|current_user|on_behalf/i.test(key), false,
        `${call.fn} was sent ${key}: the session already says who is asking`);
    }
  }

  const names = stub.rpcCalls.map((c) => c.fn);
  assert.deepEqual(names, [
    'register_as_reviewer',
    'set_reviewer_status',
    'record_reviewer_qualification',
    'verify_reviewer_qualification',
    'set_reviewer_authorization',
    'declare_reviewer_conflict',
    'assess_reviewer_conflict',
  ]);
});

test('a declaration names no reviewer, because it can only be about the person making it', async () => {
  const stub = stubRegister({
    'rpc:declare_reviewer_conflict': { data: { declarationId: 'd-2', declared: true, note: null } },
  });

  const outcome = await declareReviewerConflict(stub.client, {
    conflictType: 'financial',
    description: 'I am paid by the school that wrote it',
    courseVersionId: null,
  });

  assert.equal(outcome.ok, true);
  const args = stub.rpcCalls[0]?.args ?? {};
  assert.deepEqual(Object.keys(args).sort(),
    ['p_conflict_type', 'p_course_version_id', 'p_description']);
  assert.equal(args.p_course_version_id, null);
});

test('a refusal made here never costs a round trip', async () => {
  const stub = stubRegister({});

  const qualification = await recordReviewerQualification(stub.client, {
    reviewerProfileId: 'p-1', qualificationType: 'ijazah', title: '',
  });
  assert.equal(qualification.ok, false);
  if (!qualification.ok) assert.match(qualification.message, /title is required/i);

  const conflict = await declareReviewerConflict(stub.client, {
    conflictType: 'personal', description: '   ',
  });
  assert.equal(conflict.ok, false);

  const bio = await registerAsReviewer(stub.client, { bio: 'b'.repeat(BIO_MAX + 1) });
  assert.equal(bio.ok, false);

  assert.equal(stub.rpcCalls.length, 0, 'a bad form was sent to the database anyway');
});

test('the database’s own sentences come through, and a policy error does not', () => {
  const governance = mapReviewerError({
    message: 'only a governance admin may check a reviewer',
  });
  assert.equal(governance.ok, false);
  if (!governance.ok) {
    assert.equal(governance.code, 'forbidden');
    assert.match(governance.message, /only a governance admin/i);
  }

  const policy = mapReviewerError({
    message: 'new row violates row-level security policy for table "reviewer_profiles"',
  });
  if (!policy.ok) {
    assert.equal(policy.code, 'forbidden');
    assert.equal(policy.message, 'That is not yours to decide.',
      'a policy error was passed through raw');
  }

  const constraint = mapReviewerError({
    message: 'a validity window that closed on 2020-01-01 cannot be recorded',
  });
  if (!constraint.ok) {
    assert.equal(constraint.code, 'rejected');
    assert.match(constraint.message, /validity window/i);
  }
});

test('an answer with nothing in it does not invent an id', async () => {
  const stub = stubRegister({
    'rpc:register_as_reviewer': { data: { status: 'applicant' } },
    'rpc:set_reviewer_status': { data: { changed: 'yes', note: null } },
  });

  const registered = await registerAsReviewer(stub.client, {});
  assert.equal(registered.ok, true);
  if (registered.ok) {
    assert.equal(registered.value.reviewerProfileId, 'unknown');
    assert.equal(registered.value.registered, false,
      'a missing flag was read as a new registration');
  }

  const status = await setReviewerStatus(stub.client, { reviewerProfileId: 'p-1', status: 'active' });
  assert.equal(status.ok, true);
  if (status.ok) {
    assert.equal(status.value.changed, false, 'a truthy string was read as a change');
    assert.equal(status.value.status, '');
  }
});

const REGISTER_SPECS = {
  reviewer_profiles: {
    data: [
      {
        id: 'p-1',
        user_id: 'u-1',
        reviewer_status: 'active',
        public_bio: 'Teaches tajweed to children.',
        verified_at: '2026-12-01T09:00:00Z',
        verified_by: 'u-9',
        created_at: '2026-11-20T09:00:00Z',
        user_profiles: [{ display_name: 'Aisha Karim' }],
      },
      {
        id: 'p-2',
        user_id: 'u-2',
        reviewer_status: 'applicant',
        public_bio: null,
        verified_at: null,
        verified_by: null,
        created_at: '2026-12-10T09:00:00Z',
        user_profiles: null,
      },
    ],
  },
  reviewer_qualifications: {
    data: [
      {
        id: 'q-1',
        reviewer_profile_id: 'p-1',
        qualification_type: 'ijazah',
        qualification_title: 'Hafs an Asim',
        issuing_institution: 'Madrasah al-Falah',
        subject_area_id: 's-1',
        verification_status: 'verified',
        verified_at: '2026-12-02T09:00:00Z',
        verified_by: 'u-9',
        valid_until: null,
      },
    ],
  },
  reviewer_subject_authorizations: {
    data: [
      {
        id: 'a-1',
        reviewer_profile_id: 'p-1',
        subject_area_id: 's-1',
        review_scope: 'scholarly',
        status: 'active',
        approver: 'u-9',
        approved_at: '2026-12-03T09:00:00Z',
        effective_from: '2026-12-03T09:00:00Z',
        effective_until: null,
      },
    ],
  },
  reviewer_conflict_declarations: {
    data: [
      {
        id: 'd-1',
        reviewer_profile_id: 'p-2',
        course_version_id: null,
        conflict_type: 'family',
        description: 'My brother wrote it',
        status: 'declared',
        assessed_by: null,
        assessed_at: null,
        resolution_notes: null,
      },
    ],
  },
  user_profiles: { data: [{ user_id: 'u-9', display_name: 'Governance Admin' }] },
  subject_areas: { data: [{ id: 's-1', name: 'Tajweed' }] },
};

test('the register is read with written-out columns and no ungranted one', async () => {
  const stub = stubRegister(REGISTER_SPECS);

  const register = await fetchReviewerRegister(stub.client);

  const selects = stub.selects();
  assert.equal(/\*/.test(selects), false, 'a column list asked for everything');
  assert.equal(/internal_notes/.test(selects), false,
    'internal_notes is not granted to a client and asking for it fails the whole query');
  assert.equal(/evidence_reference/.test(selects), false,
    'evidence_reference is a storage key for an identity document');

  // deleted_at is filtered on but never selected: it is granted now, and the
  // filter is what keeps a closed profile out of the dropdown.
  const profileFilters = stub.filtersOf('reviewer_profiles');
  assert.ok(profileFilters.some((f) => f.kind === 'is' && f.column === 'deleted_at' && f.value === null),
    'closed profiles were not excluded');
  assert.equal(/deleted_at/.test(stub.tables.find((t) => t.table === 'reviewer_profiles')?.select ?? ''),
    false, 'deleted_at was selected as a column');

  assert.equal(register.length, 2);
});

test('the register groups what belongs to each reviewer', async () => {
  const stub = stubRegister(REGISTER_SPECS);

  const register = await fetchReviewerRegister(stub.client);
  const [first, second] = register;
  assert.ok(first && second, 'both reviewers came back');

  assert.equal(first.reviewer.displayName, 'Aisha Karim');
  assert.equal(first.reviewer.status, 'active');
  assert.equal(first.reviewer.verifiedByName, 'Governance Admin',
    'who checked a reviewer was not resolved to a name');
  assert.equal(first.qualifications.length, 1);
  assert.equal(first.qualifications[0]?.subjectName, 'Tajweed');
  assert.equal(first.qualifications[0]?.verifiedByName, 'Governance Admin');
  assert.equal(first.authorizations.length, 1);
  assert.equal(first.authorizations[0]?.reviewScope, 'scholarly');
  assert.equal(first.authorizations[0]?.approverName, 'Governance Admin');
  assert.equal(first.conflicts.length, 0, 'a conflict was attached to the wrong reviewer');

  assert.equal(second.reviewer.displayName, null);
  assert.equal(second.reviewer.status, 'applicant');
  assert.equal(second.reviewer.verifiedByName, null);
  assert.equal(second.qualifications.length, 0);
  assert.equal(second.conflicts.length, 1);
  assert.equal(BARRING_CONFLICT_STATUSES.includes(second.conflicts[0]?.status ?? 'resolved'), true,
    'a fresh declaration did not read as barring');
});

test('an empty register costs one query, and a read error is not swallowed', async () => {
  const empty = stubRegister({ reviewer_profiles: { data: [] } });
  assert.deepEqual(await fetchReviewerRegister(empty.client), []);
  assert.equal(empty.tables.length, 1, 'child queries were issued for nobody');

  const broken = stubRegister({
    reviewer_profiles: { data: [], error: { message: 'permission denied for table reviewer_profiles' } },
  });
  await assert.rejects(() => fetchReviewerRegister(broken.client), /permission denied/);
});

test('the subjects offered are the active ones, by id', async () => {
  const stub = stubRegister({
    subject_areas: { data: [{ id: 's-1', code: 'tajweed', name: 'Tajweed' }] },
  });

  const subjects = await fetchSubjectOptions(stub.client);

  assert.deepEqual(subjects, [{ id: 's-1', code: 'tajweed', name: 'Tajweed' }]);
  const filters = stub.filtersOf('subject_areas');
  assert.ok(filters.some((f) => f.kind === 'eq' && f.column === 'status' && f.value === 'active'),
    'retired subjects were offered');
  // An authorisation names an id: is_authorised_reviewer() compares ids, not codes.
  assert.match(stub.selects(), /\bid\b/);
});
