import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assignmentDeadline,
  createCourseAssignment,
  fetchAssignmentRevisions,
  fetchAssignmentSubmissionsForLearner,
  fetchCourseAssignments,
  mapAssignmentError,
  reopenAssignmentSubmission,
  revisionPolicyLabel,
  revisionsRemaining,
  saveAssignmentDraft,
  setAssignmentRevisionPolicy,
  validateAssignmentInput,
  validateRevisionPolicy,
} from './course-assignments.ts';

type RpcCall = { fn: string; args: Record<string, unknown> };

function stubRpc(result: { data?: unknown; error?: { message: string; code?: string } } = { data: 'assignment-1' }) {
  const calls: RpcCall[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

function stubQuery(rows: unknown[]) {
  const state: { table: string; select: string; filters: Record<string, unknown>; order: string | null } = {
    table: '', select: '', filters: {}, order: null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = (value: string) => { state.select = value; return chain; };
  chain.eq = (key: string, value: unknown) => { state.filters[key] = value; return chain; };
  chain.is = (key: string, value: unknown) => { state.filters[key] = value; return chain; };
  chain.in = (key: string, value: unknown) => { state.filters[key] = value; return chain; };
  chain.order = (key: string, value?: { ascending?: boolean }) => {
    state.order = `${key}:${value?.ascending === false ? 'desc' : 'asc'}`;
    return chain;
  };
  chain.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(resolve);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = { from: (table: string) => { state.table = table; return chain; } } as any;
  return { client, state };
}

const selfPacedInput = {
  courseVersionId: 'v-1', cohortId: null, title: '  Write a reflection  ',
  instructions: '  Use your own words.  ', dueAfterDays: '7', dueAt: '',
  acceptLate: false, pointsPossible: '10',
};

// ---------------------------------------------------------------------------
// The two clocks
// ---------------------------------------------------------------------------

test('self-paced deadlines normalize to whole days after enrolment', () => {
  const result = validateAssignmentInput(selfPacedInput);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.title, 'Write a reflection');
    assert.equal(result.value.instructions, 'Use your own words.');
    assert.equal(result.value.dueAfterDays, 7);
    assert.equal(result.value.dueAt, null);
    assert.equal(result.value.pointsPossible, 10);
  }
});

test('cohort deadlines are absolute and ISO-normalized', () => {
  const result = validateAssignmentInput({
    ...selfPacedInput,
    cohortId: 'cohort-1',
    dueAfterDays: '',
    dueAt: '2027-01-10T10:30:00+03:00',
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.cohortId, 'cohort-1');
    assert.equal(result.value.dueAfterDays, null);
    assert.equal(result.value.dueAt, '2027-01-10T07:30:00.000Z');
  }
});

test('the deadline clocks cannot be mixed', () => {
  assert.equal(validateAssignmentInput({ ...selfPacedInput, dueAt: '2027-01-10T10:00:00Z' }).ok, false);
  assert.equal(validateAssignmentInput({ ...selfPacedInput, cohortId: 'cohort-1' }).ok, false);
});

test('title, deadline, points and late policy are validated before RPC', () => {
  for (const input of [
    { ...selfPacedInput, title: '   ' },
    { ...selfPacedInput, title: 'x'.repeat(201) },
    { ...selfPacedInput, dueAfterDays: '0' },
    { ...selfPacedInput, dueAfterDays: '1.5' },
    { ...selfPacedInput, dueAt: 'not a date' },
    { ...selfPacedInput, pointsPossible: '0' },
    { ...selfPacedInput, acceptLate: 'false' },
  ]) assert.equal(validateAssignmentInput(input).ok, false);
});

test('the displayed deadline is absolute for cohorts and relative for learners', () => {
  const enrolledAt = '2026-12-01T09:00:00.000Z';
  const relative = assignmentDeadline({ cohortId: null, dueAt: null, dueAfterDays: 7 }, enrolledAt);
  assert.equal(relative?.toISOString(), '2026-12-08T09:00:00.000Z');

  const cohort = assignmentDeadline({ cohortId: 'c-1', dueAt: '2026-12-12T10:00:00.000Z', dueAfterDays: null }, enrolledAt);
  assert.equal(cohort?.toISOString(), '2026-12-12T10:00:00.000Z');

  assert.equal(assignmentDeadline({ cohortId: null, dueAt: null, dueAfterDays: null }, enrolledAt), null);
  assert.equal(assignmentDeadline({ cohortId: null, dueAt: null, dueAfterDays: 3 }, 'bad date'), null);
});

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

test('creating an assignment sends only the intended fields, never an actor id', async () => {
  const { client, calls } = stubRpc();
  const valid = validateAssignmentInput(selfPacedInput);
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  const result = await createCourseAssignment(client, valid.value);
  assert.deepEqual(result, { ok: true, id: 'assignment-1' });
  assert.equal(calls[0]?.fn, 'create_course_assignment');
  assert.deepEqual(Object.keys(calls[0]!.args).sort(), [
    'p_accept_late', 'p_cohort_id', 'p_course_version_id', 'p_due_after_days',
    'p_due_at', 'p_instructions', 'p_points_possible', 'p_title',
  ]);
  assert.equal(calls[0]?.args.p_due_after_days, 7);
});

test('an overlong learner response never reaches the database', async () => {
  const { client, calls } = stubRpc();
  const result = await saveAssignmentDraft(client, {
    assignmentId: 'a-1', learnerProfileId: 'lp-1', bodyText: 'x'.repeat(10_001),
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
  assert.equal(calls.length, 0);
});

test('database errors map to an actionable HTTP status', () => {
  assert.equal(mapAssignmentError({ message: 'assignments are not enabled' }).status, 409);
  assert.equal(mapAssignmentError({ message: 'only the course author can mark this work' }).status, 403);
  assert.equal(mapAssignmentError({ message: 'assignment submission not found', code: 'P0002' }).status, 404);
  assert.equal(mapAssignmentError({ message: 'this assignment deadline has passed' }).status, 409);
});

// ---------------------------------------------------------------------------
// RLS-backed reads
// ---------------------------------------------------------------------------

test('the list relies on row-level security and narrows by course/version only', async () => {
  const { client, state } = stubQuery([]);
  await fetchCourseAssignments(client, { courseId: 'course-1', courseVersionId: 'version-1' });
  assert.equal(state.table, 'course_assignments');
  assert.deepEqual(state.filters, {
    course_id: 'course-1', deleted_at: null, course_version_id: 'version-1',
  });
  assert.equal(state.order, 'created_at:asc');
  assert.equal(Object.hasOwn(state.filters, 'user_id'), false);
});

test('a learner read filters only to their own enrolment profile', async () => {
  const { client, state } = stubQuery([]);
  await fetchAssignmentSubmissionsForLearner(client, {
    assignmentIds: ['a-1', 'a-2'], learnerProfileId: 'lp-1',
  });
  assert.equal(state.table, 'assignment_submissions');
  assert.deepEqual(state.filters, { assignment_id: ['a-1', 'a-2'], learner_profile_id: 'lp-1' });
});

// ---------------------------------------------------------------------------
// The revision loop
// ---------------------------------------------------------------------------

test('a revision policy is one decision, so the checkbox and the limit are validated together', () => {
  // No ceiling is a real choice, not a missing value.
  assert.deepEqual(validateRevisionPolicy({ revisionsAllowed: true, revisionLimit: '' }),
    { ok: true, value: { revisionsAllowed: true, revisionLimit: null } });
  assert.deepEqual(validateRevisionPolicy({ revisionsAllowed: true, revisionLimit: '3' }),
    { ok: true, value: { revisionsAllowed: true, revisionLimit: 3 } });
  // Switching revisions off drops the limit rather than storing a number nobody
  // asked for, which is what lets it come back cleanly later.
  assert.deepEqual(validateRevisionPolicy({ revisionsAllowed: false, revisionLimit: '5' }),
    { ok: true, value: { revisionsAllowed: false, revisionLimit: null } });

  for (const input of [
    { revisionsAllowed: 'true' },
    { revisionsAllowed: true, revisionLimit: '0' },
    { revisionsAllowed: true, revisionLimit: '1.5' },
    { revisionsAllowed: true, revisionLimit: 'lots' },
  ]) assert.equal(validateRevisionPolicy(input).ok, false, JSON.stringify(input));
});

test('a limit counts versions including the first, and the learner is told what is left', () => {
  const graded = { revisionNumber: 1, status: 'graded' as const };
  assert.deepEqual(revisionsRemaining({ revisionsAllowed: true, revisionLimit: null }, graded),
    { allowed: true, remaining: null });
  assert.deepEqual(revisionsRemaining({ revisionsAllowed: true, revisionLimit: 2 }, graded),
    { allowed: true, remaining: 1 });
  assert.deepEqual(revisionsRemaining({ revisionsAllowed: true, revisionLimit: 2 },
    { revisionNumber: 2, status: 'graded' as const }), { allowed: false, remaining: 0 });
  // A limit of one version means the work is marked once.
  assert.deepEqual(revisionsRemaining({ revisionsAllowed: true, revisionLimit: 1 }, graded),
    { allowed: false, remaining: 0 });
  assert.deepEqual(revisionsRemaining({ revisionsAllowed: false, revisionLimit: null }, graded),
    { allowed: false, remaining: null });
  // Unmarked work has nothing to revise yet.
  for (const status of ['draft', 'submitted'] as const) {
    assert.equal(revisionsRemaining({ revisionsAllowed: true, revisionLimit: null },
      { revisionNumber: 1, status }).allowed, false);
  }
});

test('the policy label says what the teacher set, without inventing a default', () => {
  assert.equal(revisionPolicyLabel({ revisionsAllowed: false, revisionLimit: null }),
    'Marked once — no revisions');
  assert.equal(revisionPolicyLabel({ revisionsAllowed: true, revisionLimit: null }),
    'Revisions allowed, no limit');
  assert.equal(revisionPolicyLabel({ revisionsAllowed: true, revisionLimit: 1 }), 'One version only');
  assert.equal(revisionPolicyLabel({ revisionsAllowed: true, revisionLimit: 3 }), 'Up to 3 versions');
});

test('reopening reports the version the work now carries', async () => {
  const { client, calls } = stubRpc({ data: 2 });
  const result = await reopenAssignmentSubmission(client, 's-1');
  assert.deepEqual(result, { ok: true, revisionNumber: 2 });
  assert.equal(calls[0]?.fn, 'reopen_assignment_submission');
  assert.deepEqual(Object.keys(calls[0]!.args), ['p_submission_id']);
});

test('a refused reopen reaches the learner as a readable conflict, not a 400', () => {
  const { client } = stubRpc({ error: { message: 'the deadline has passed, so this mark stands' } });
  return reopenAssignmentSubmission(client, 's-1').then((result) => {
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 409);
      assert.match(result.message, /this mark stands/i);
    }
  });
});

test('a ceiling the teacher set is reported with its own number', () => {
  assert.equal(mapAssignmentError({
    message: 'this assignment allows 2 versions and this is version 2',
    code: 'program_limit_exceeded',
  }).status, 409);
  assert.equal(mapAssignmentError({ message: 'this assignment does not allow revisions' }).status, 409);
  assert.equal(mapAssignmentError({ message: 'only marked work can be revised' }).status, 409);
  assert.equal(mapAssignmentError({ message: 'sign in to revise this submission' }).status, 401);
  assert.equal(mapAssignmentError({ message: 'this learner needs an active enrolment and cohort membership' }).status, 403);
});

test('the revision policy is written with the task, never with a caller-supplied actor', async () => {
  const { client, calls } = stubRpc({ data: null });
  const checked = validateRevisionPolicy({ revisionsAllowed: true, revisionLimit: 2 });
  assert.equal(checked.ok, true);
  if (!checked.ok) return;
  await setAssignmentRevisionPolicy(client, { assignmentId: 'a-1', ...checked.value });
  assert.equal(calls[0]?.fn, 'set_assignment_revision_policy');
  assert.deepEqual(calls[0]?.args, {
    p_assignment_id: 'a-1', p_revisions_allowed: true, p_revision_limit: 2,
  });
});

test('marked versions are read for the submissions on screen, and rely on RLS for privacy', async () => {
  const { client, state } = stubQuery([
    {
      id: 'r-1', submission_id: 's-1', revision_number: 1, body_text: 'Version one.',
      asset_ids: ['asset-1'], score_earned: '6.00', feedback: 'Cite the verse.',
      submitted_at: '2026-12-01T09:00:00.000Z', is_late: false,
      marked_at: '2026-12-02T09:00:00.000Z', reopened_at: '2026-12-03T09:00:00.000Z',
    },
  ]);
  const rows = await fetchAssignmentRevisions(client, ['s-1']);
  assert.equal(state.table, 'assignment_submission_revisions');
  assert.deepEqual(state.filters, { submission_id: ['s-1'] });
  assert.equal(state.order, 'revision_number:asc');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.revisionNumber, 1);
  assert.equal(rows[0]!.scoreEarned, 6);
  assert.deepEqual(rows[0]!.assetIds, ['asset-1']);
  assert.equal(rows[0]!.feedback, 'Cite the verse.');

  // An empty list must not become a query for everything.
  assert.deepEqual(await fetchAssignmentRevisions(client, []), []);
});

test('a snapshot with no recorded files still maps cleanly', async () => {
  const { client } = stubQuery([
    {
      id: 'r-2', submission_id: 's-1', revision_number: 2, body_text: '',
      asset_ids: null, score_earned: null, feedback: 'Well done.',
      submitted_at: null, is_late: null, marked_at: null, reopened_at: null,
    },
  ]);
  const rows = await fetchAssignmentRevisions(client, ['s-1']);
  assert.deepEqual(rows[0]!.assetIds, []);
  assert.equal(rows[0]!.scoreEarned, null);
  assert.equal(rows[0]!.bodyText, '');
});
