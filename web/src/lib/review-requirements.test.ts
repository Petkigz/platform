import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHANGE_CLASSES,
  CHANGE_CLASS_LABEL,
  MATERIAL_CHANGE_CLASSES,
  MAX_APPROVALS,
  REQUIREMENT_STATUS_LABEL,
  RISK_LEVELS,
  RISK_LEVEL_LABEL,
  TECHNICAL_CHECK_LABEL,
  TECHNICAL_CHECK_TYPES,
  assessContentChange,
  countAuthorisedReviewers,
  fetchVersionReviewState,
  mapRequirementError,
  recordTechnicalCheck,
  recountRequirements,
  requireReview,
  validateChangeAssessmentInput,
  validateRequirementInput,
  validateTechnicalCheckInput,
  validateWaiverInput,
  waiveReviewRequirement,
} from './review-requirements.ts';

// ---------------------------------------------------------------------------
// What a version needs before it can publish.
//
// The rules that matter:
//
//   * the vocabulary a form offers is the vocabulary the database accepts. A dropdown
//     that can produce an invalid value is a bug that only appears when someone uses
//     it, and here one combination — a doctrinal change called low risk — is refused
//     by a CHECK constraint the form has to know about.
//   * nobody sends an actor. As everywhere else in the review path, the session says
//     who is asking.
//   * the state shown comes from the recount, not from a second implementation of the
//     counting rule in TypeScript. A requirement's approval count exists nowhere as a
//     column, so computing it here as well would be two answers to one question.
//   * a recount that fails is reported. A panel showing stale statuses is how a
//     teacher is told their course can publish when it cannot.
// ---------------------------------------------------------------------------

const SUBJECT = '6f1a1b6a-0000-4000-8000-0000000000a1';
const VERSION = '6f1a1b6a-0000-4000-8000-0000000000b2';

type RpcCall = { fn: string; args: Record<string, unknown> };
type TableCall = { table: string; select?: string; filters: Array<{ kind: string; column: string; value: unknown }> };

function stubState(specs: Record<string, { data: unknown; error?: { message: string } }> = {}) {
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
      chain.then = (resolve: (v: unknown) => unknown) => {
        const spec = specs[table] ?? { data: [] };
        return Promise.resolve({ data: spec.data, error: spec.error ?? null }).then(resolve);
      };
      return chain;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      const spec = specs[`rpc:${fn}`];
      return { data: spec ? spec.data : null, error: spec?.error ?? null };
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

test('every vocabulary has a label, because a panel prints it', () => {
  for (const status of ['open', 'satisfied', 'waived'] as const) {
    assert.ok(REQUIREMENT_STATUS_LABEL[status], `${status} has no label`);
  }
  for (const type of TECHNICAL_CHECK_TYPES) {
    assert.ok(TECHNICAL_CHECK_LABEL[type], `${type} has no label`);
  }
  for (const change of CHANGE_CLASSES) {
    assert.ok(CHANGE_CLASS_LABEL[change], `${change} has no label`);
  }
  for (const risk of RISK_LEVELS) {
    assert.ok(RISK_LEVEL_LABEL[risk], `${risk} has no label`);
  }
});

test('the material changes are the two the constraint will not let be minor', () => {
  // cca_material_changes_are_risky: a doctrinal or source change must be high or
  // critical and must be re-reviewed. The form has to know, or it offers a
  // combination that cannot be stored.
  assert.deepEqual([...MATERIAL_CHANGE_CLASSES], ['doctrinal', 'source_change']);
  for (const change of MATERIAL_CHANGE_CLASSES) {
    assert.ok(CHANGE_CLASSES.includes(change), `${change} is not offered as a change`);
  }
});

test('a requirement needs a subject, a scope, and a count that can be met', () => {
  assert.equal(validateRequirementInput({}).ok, false);
  assert.equal(validateRequirementInput({ subjectAreaId: 'quran', scope: 'scholarly', count: 1 }).ok, false,
    'a subject code was accepted where an id is needed');
  assert.equal(validateRequirementInput({ subjectAreaId: SUBJECT, scope: 'both', count: 1 }).ok, false);

  for (const count of [0, -1, 1.5, NaN, 'abc', MAX_APPROVALS + 1]) {
    const refused = validateRequirementInput({ subjectAreaId: SUBJECT, scope: 'scholarly', count });
    assert.equal(refused.ok, false, `${count} approvals was accepted`);
    if (!refused.ok) assert.match(refused.message, new RegExp(`between 1 and ${MAX_APPROVALS}`));
  }

  const asked = validateRequirementInput({ subjectAreaId: SUBJECT, scope: 'technical', count: '2' });
  assert.deepEqual(asked, {
    ok: true,
    value: { subjectAreaId: SUBJECT, scope: 'technical', count: 2 },
  });
  assert.equal(validateRequirementInput({ subjectAreaId: SUBJECT, scope: 'scholarly', count: MAX_APPROVALS }).ok, true);
});

test('a waiver without a reason is not a waiver', () => {
  assert.equal(validateWaiverInput({}).ok, false);
  assert.equal(validateWaiverInput({ reason: '   ' }).ok, false);
  assert.equal(validateWaiverInput({ reason: 'x'.repeat(2001) }).ok, false);
  assert.deepEqual(validateWaiverInput({ reason: '  No reviewer holds this subject.  ' }),
    { ok: true, value: { reason: 'No reviewer holds this subject.' } });
});

test('a check has to say whether it passed', () => {
  assert.equal(validateTechnicalCheckInput({ checkType: 'media_plays' }).ok, false);
  assert.equal(validateTechnicalCheckInput({ checkType: 'media_plays', passed: 'true' }).ok, false,
    'a string was accepted where the schema wants a boolean');
  assert.equal(validateTechnicalCheckInput({ checkType: 'looks_fine', passed: true }).ok, false);

  assert.deepEqual(validateTechnicalCheckInput({ checkType: 'media_plays', passed: false, evidence: '  ' }),
    { ok: true, value: { checkType: 'media_plays', passed: false, evidence: null } });
  assert.equal(validateTechnicalCheckInput({
    checkType: 'media_plays', passed: true, evidence: 'x'.repeat(2001),
  }).ok, false);
});

test('a doctrinal change cannot be classified as minor, and the form says why', () => {
  for (const change of MATERIAL_CHANGE_CLASSES) {
    for (const risk of ['low', 'medium'] as const) {
      const refused = validateChangeAssessmentInput({
        changeClass: change, riskLevel: risk, requiresReReview: true, rationale: 'Because.',
      });
      assert.equal(refused.ok, false, `${change} at ${risk} risk was accepted`);
      if (!refused.ok) assert.match(refused.message, /never low risk/);
    }
    const skipping = validateChangeAssessmentInput({
      changeClass: change, riskLevel: 'high', requiresReReview: false, rationale: 'Because.',
    });
    assert.equal(skipping.ok, false, `${change} was allowed to skip a fresh review`);
  }

  const allowed = validateChangeAssessmentInput({
    changeClass: 'doctrinal', riskLevel: 'critical', requiresReReview: true, rationale: 'The ruling changed.',
  });
  assert.equal(allowed.ok, true);

  const cosmetic = validateChangeAssessmentInput({
    changeClass: 'typographical', riskLevel: 'low', requiresReReview: false, rationale: '  Two spellings.  ',
  });
  assert.deepEqual(cosmetic, {
    ok: true,
    value: {
      changeClass: 'typographical',
      riskLevel: 'low',
      requiresReReview: false,
      rationale: 'Two spellings.',
      fromVersionId: null,
    },
  });

  assert.equal(validateChangeAssessmentInput({
    changeClass: 'structural', riskLevel: 'high', requiresReReview: true, rationale: '   ',
  }).ok, false);
  assert.equal(validateChangeAssessmentInput({
    changeClass: 'cosmetic', riskLevel: 'low', requiresReReview: false, rationale: 'x',
  }).ok, false);
  assert.equal(validateChangeAssessmentInput({
    changeClass: 'structural', riskLevel: 'extreme', requiresReReview: false, rationale: 'x',
  }).ok, false);
  assert.equal(validateChangeAssessmentInput({
    changeClass: 'structural', riskLevel: 'high', requiresReReview: 'yes', rationale: 'x',
  }).ok, false);
  assert.equal(validateChangeAssessmentInput({
    changeClass: 'structural', riskLevel: 'high', requiresReReview: true, rationale: 'x',
    fromVersionId: 'not-a-uuid',
  }).ok, false);
});

test('nobody sends an actor, and a refusal made here never costs a round trip', async () => {
  const stub = stubState({
    'rpc:require_review': { data: { requirementId: 'r-1', status: 'open', reopened: false } },
    'rpc:waive_review_requirement': { data: { requirementId: 'r-1', status: 'waived', changed: true } },
    'rpc:refresh_review_requirements': { data: { satisfiedNow: 1, stillOpen: 0 } },
    'rpc:record_technical_check': { data: { checkId: 'c-1', passed: true } },
    'rpc:assess_content_change': { data: { assessmentId: 'a-1', requiresReReview: true } },
  });

  await requireReview(stub.client, {
    courseVersionId: VERSION, subjectAreaId: SUBJECT, scope: 'scholarly', count: 1,
  });
  await waiveReviewRequirement(stub.client, { requirementId: 'r-1', reason: 'No reviewer holds it.' });
  await recountRequirements(stub.client, VERSION);
  await recordTechnicalCheck(stub.client, {
    courseVersionId: VERSION, checkType: 'media_plays', passed: true, evidence: null,
  });
  await assessContentChange(stub.client, {
    courseVersionId: VERSION, changeClass: 'content_minor', riskLevel: 'medium',
    requiresReReview: true, rationale: 'Two lessons added.', fromVersionId: null,
  });

  assert.deepEqual(stub.rpcCalls.map((c) => c.fn), [
    'require_review',
    'waive_review_requirement',
    'refresh_review_requirements',
    'record_technical_check',
    'assess_content_change',
  ]);
  for (const call of stub.rpcCalls) {
    for (const key of Object.keys(call.args)) {
      assert.equal(/actor|p_user|current_user|on_behalf/i.test(key), false,
        `${call.fn} was sent ${key}`);
    }
  }
  const required = stub.rpcCalls[0]?.args ?? {};
  assert.deepEqual(Object.keys(required).sort(),
    ['p_course_version_id', 'p_required_approval_count', 'p_review_scope', 'p_subject_area_id']);

  const before = stub.rpcCalls.length;
  const badRequirement = await requireReview(stub.client, {
    courseVersionId: VERSION, subjectAreaId: 'quran', scope: 'scholarly', count: 1,
  });
  const badWaiver = await waiveReviewRequirement(stub.client, { requirementId: 'r-1', reason: '' });
  const badChange = await assessContentChange(stub.client, {
    courseVersionId: VERSION, changeClass: 'doctrinal', riskLevel: 'low',
    requiresReReview: false, rationale: 'x',
  });
  assert.equal(badRequirement.ok, false);
  assert.equal(badWaiver.ok, false);
  assert.equal(badChange.ok, false);
  assert.equal(stub.rpcCalls.length, before, 'a form the database would refuse was sent anyway');
});

test('the database’s own sentences come through, and a policy error does not', () => {
  const governance = mapRequirementError({ message: 'only a governance admin may waive a review requirement' });
  if (!governance.ok) {
    assert.equal(governance.code, 'forbidden');
    assert.match(governance.message, /only a governance admin/i);
  }
  const author = mapRequirementError({
    message: 'only the author of this version, or governance staff, may say what it needs reviewed',
  });
  if (!author.ok) assert.equal(author.code, 'forbidden');

  const policy = mapRequirementError({
    message: 'new row violates row-level security policy for table "content_review_requirements"',
  });
  if (!policy.ok) {
    assert.equal(policy.code, 'forbidden');
    assert.equal(policy.message, 'That is not yours to decide.');
  }

  const constraint = mapRequirementError({ message: 'a doctrinal change is never low risk' });
  if (!constraint.ok) {
    assert.equal(constraint.code, 'rejected');
    assert.match(constraint.message, /doctrinal/i);
  }
});

const STATE_SPECS = {
  'rpc:refresh_review_requirements': {
    data: {
      courseVersionId: VERSION,
      satisfiedNow: 1,
      stillOpen: 1,
      requirements: [
        { requirementId: 'r-1', reviewScope: 'scholarly', status: 'satisfied', approvals: 2, required: 2 },
        { requirementId: 'r-2', reviewScope: 'scholarly', status: 'open', approvals: 0, required: 1 },
        { requirementId: 'r-3', reviewScope: 'technical', status: 'waived', approvals: null, required: 1 },
      ],
    },
  },
  content_review_requirements: {
    data: [
      {
        id: 'r-1', subject_area_id: SUBJECT, review_scope: 'scholarly',
        required_approval_count: 2, requirement_status: 'open',
        waived_by: null, waived_reason: null,
      },
      {
        id: 'r-2', subject_area_id: '6f1a1b6a-0000-4000-8000-0000000000a2', review_scope: 'scholarly',
        required_approval_count: 1, requirement_status: 'open',
        waived_by: null, waived_reason: null,
      },
      {
        id: 'r-3', subject_area_id: SUBJECT, review_scope: 'technical',
        required_approval_count: 1, requirement_status: 'open',
        waived_by: 'u-9', waived_reason: 'No technical reviewer for this subject yet.',
      },
    ],
  },
  technical_review_checks: {
    data: [
      {
        id: 'c-2', check_type: 'media_plays', passed: false, evidence: 'One rendition 404s.',
        performed_by: 'u-1', performed_at: '2026-12-21T10:00:00Z',
      },
      {
        id: 'c-1', check_type: 'media_plays', passed: true, evidence: null,
        performed_by: 'u-1', performed_at: '2026-12-20T10:00:00Z',
      },
      {
        id: 'c-3', check_type: 'captions_present', passed: true, evidence: 'All eight lessons.',
        performed_by: 'u-2', performed_at: '2026-12-21T11:00:00Z',
      },
    ],
  },
  content_change_assessments: {
    data: [
      {
        id: 'a-1', change_class: 'doctrinal', risk_level: 'high', requires_re_review: true,
        rationale: 'The ruling on interest was restated.', assessed_by: 'u-9',
        assessed_at: '2026-12-21T12:00:00Z', from_version_id: null,
      },
    ],
  },
  user_profiles: {
    data: [
      { user_id: 'u-1', display_name: 'The Teacher' },
      { user_id: 'u-2', display_name: 'A Reviewer' },
      { user_id: 'u-9', display_name: 'Governance Admin' },
    ],
  },
  subject_areas: {
    data: [{ id: SUBJECT, name: 'Tajweed' }],
  },
  reviewer_subject_authorizations: { data: [] },
};

test('the panel shows the recount, not a second opinion', async () => {
  const stub = stubState(STATE_SPECS);

  const state = await fetchVersionReviewState(stub.client, VERSION);

  const [first, second, third] = state.requirements;
  assert.ok(first && second && third, 'not every requirement came back');
  // r-1 is 'open' in the table and 'satisfied' in the recount: the recount wins,
  // because the approvals are real and the column has not caught up.
  assert.equal(first.status, 'satisfied');
  assert.equal(first.approvals, 2);
  assert.equal(first.requiredApprovalCount, 2);
  assert.equal(first.subjectName, 'Tajweed');
  assert.equal(second.status, 'open');
  assert.equal(second.approvals, 0);
  assert.equal(second.authorisedReviewers, 0, 'nobody was authorised and the panel did not say so');
  assert.equal(third.status, 'waived');
  assert.equal(third.approvals, null);
  assert.equal(third.waivedByName, 'Governance Admin');
  assert.equal(third.waivedReason, 'No technical reviewer for this subject yet.');
  assert.equal(third.authorisedReviewers, null,
    'a waived requirement counted reviewers who can no longer close it');

  assert.equal(state.openRequirements, 1);
  assert.match(state.blockedBecause ?? '', /no reviewer authorised for that subject/);

  assert.equal(stub.rpcCalls[0]?.fn, 'refresh_review_requirements');
});

test('checks are listed latest per kind, with the history kept', async () => {
  const stub = stubState(STATE_SPECS);

  const state = await fetchVersionReviewState(stub.client, VERSION);

  assert.equal(state.checks.length, 3, 'the history was dropped');
  assert.equal(state.latestChecks.length, 2, 'a replaced check was shown as the latest');
  const plays = state.latestChecks.find((c) => c.checkType === 'media_plays');
  assert.equal(plays?.id, 'c-2', 'an older check was shown as the latest');
  assert.equal(plays?.passed, false);
  assert.equal(plays?.performedByName, 'The Teacher');

  assert.equal(state.assessments.length, 1);
  assert.equal(state.assessments[0]?.assessedByName, 'Governance Admin');
  assert.equal(state.assessments[0]?.requiresReReview, true);
});

test('a recount that fails is reported rather than guessed', async () => {
  const stub = stubState({
    ...STATE_SPECS,
    'rpc:refresh_review_requirements': {
      data: null,
      error: { message: 'permission denied for function refresh_review_requirements' },
    },
  });

  const state = await fetchVersionReviewState(stub.client, VERSION);

  assert.match(state.recountError ?? '', /permission denied/);
  assert.equal(state.requirements.length, 3, 'the rows were dropped because the recount failed');
  assert.equal(state.requirements[0]?.status, 'open',
    'a status was invented when the recount could not be read');
  assert.equal(state.requirements[0]?.approvals, null, 'an approval count was invented');
});

test('a version with nothing open says so, and asks nothing for a column list', async () => {
  const stub = stubState({
    'rpc:refresh_review_requirements': {
      data: { courseVersionId: VERSION, satisfiedNow: 0, stillOpen: 0, requirements: [] },
    },
    content_review_requirements: { data: [] },
    technical_review_checks: { data: [] },
    content_change_assessments: { data: [] },
    user_profiles: { data: [] },
    subject_areas: { data: [] },
  });

  const state = await fetchVersionReviewState(stub.client, VERSION);

  assert.equal(state.blockedBecause, null);
  assert.equal(state.openRequirements, 0);
  assert.equal(state.latestChecks.length, 0);
  assert.equal(/\*/.test(stub.selects()), false, 'a column list asked for everything');
});

test('only reviewers who could actually close it are counted', async () => {
  const stub = stubState({
    reviewer_subject_authorizations: {
      data: [
        // Active profile, open window: counts.
        { reviewer_profile_id: 'p-1', effective_until: null, reviewer_profiles: [{ reviewer_status: 'active' }] },
        // The same profile again, at a different scope row: still one reviewer.
        { reviewer_profile_id: 'p-1', effective_until: '2030-01-01T00:00:00Z', reviewer_profiles: [{ reviewer_status: 'active' }] },
        // Window closed: cannot be assigned, so cannot close a requirement.
        { reviewer_profile_id: 'p-2', effective_until: '2020-01-01T00:00:00Z', reviewer_profiles: [{ reviewer_status: 'active' }] },
        // Suspended reviewer: same.
        { reviewer_profile_id: 'p-3', effective_until: null, reviewer_profiles: [{ reviewer_status: 'suspended' }] },
      ],
    },
  });

  const count = await countAuthorisedReviewers(stub.client, SUBJECT, 'scholarly');

  assert.equal(count, 1);
  const filters = stub.filtersOf('reviewer_subject_authorizations');
  assert.ok(filters.some((f) => f.column === 'status' && f.value === 'active'),
    'revoked and pending authorisations were counted');
  assert.ok(filters.some((f) => f.column === 'review_scope' && f.value === 'scholarly'),
    'the other scope was counted');
});
