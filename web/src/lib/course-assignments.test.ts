import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assignmentDeadline,
  createCourseAssignment,
  fetchAssignmentSubmissionsForLearner,
  fetchCourseAssignments,
  mapAssignmentError,
  saveAssignmentDraft,
  validateAssignmentInput,
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
