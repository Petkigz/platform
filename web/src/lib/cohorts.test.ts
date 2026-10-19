import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCohort,
  fetchJoinableCohorts,
  mapCohortError,
  validateCohortInput,
} from './cohorts.ts';

type RpcCall = { fn: string; args: Record<string, unknown> };

function stubRpc(result: { data?: unknown; error?: { message: string; code?: string } } = { data: 'cohort-1' }) {
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

function stubQueries(tableRows: Record<string, unknown[]>) {
  const calls: { table: string; filters: Record<string, unknown>; order: string | null }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    from(table: string) {
      const state = { table, filters: {} as Record<string, unknown>, order: null as string | null };
      calls.push(state);
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = (key: string, value: unknown) => { state.filters[key] = value; return chain; };
      chain.is = (key: string, value: unknown) => { state.filters[key] = value; return chain; };
      chain.in = (key: string, value: unknown) => { state.filters[key] = value; return chain; };
      chain.order = (key: string, opts?: { ascending?: boolean }) => {
        state.order = `${key}:${opts?.ascending === false ? 'desc' : 'asc'}`;
        return chain;
      };
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: tableRows[table] ?? [], error: null }).then(resolve);
      return chain;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('a future cohort schedule is normalized', () => {
  const start = new Date(Date.now() + 2 * 86_400_000).toISOString();
  const end = new Date(Date.now() + 10 * 86_400_000).toISOString();
  const result = validateCohortInput({
    courseId: 'course-1', courseVersionId: 'version-1', title: '  Tajweed group ',
    description: ' Weekly practice ', startsAt: start, endsAt: end, capacity: '12',
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.title, 'Tajweed group');
    assert.equal(result.value.description, 'Weekly practice');
    assert.equal(result.value.capacity, 12);
    assert.equal(result.value.startsAt, start);
    assert.equal(result.value.endsAt, end);
  }
});

test('invalid title, dates and capacity are rejected', () => {
  const start = new Date(Date.now() + 2 * 86_400_000).toISOString();
  assert.equal(validateCohortInput({ courseId: 'c', courseVersionId: 'v', title: ' ', startsAt: start }).ok, false);
  assert.equal(validateCohortInput({ courseId: 'c', courseVersionId: 'v', title: 'Class', startsAt: new Date(Date.now() - 1_000).toISOString() }).ok, false);
  assert.equal(validateCohortInput({ courseId: 'c', courseVersionId: 'v', title: 'Class', startsAt: start, endsAt: start }).ok, false);
  assert.equal(validateCohortInput({ courseId: 'c', courseVersionId: 'v', title: 'Class', startsAt: start, capacity: '0' }).ok, false);
  assert.equal(validateCohortInput({ courseId: 'c', courseVersionId: 'v', title: 'Class', startsAt: start, capacity: '1.5' }).ok, false);
});

// ---------------------------------------------------------------------------
// Writers and error mapping
// ---------------------------------------------------------------------------

test('creating a cohort sends no actor id', async () => {
  const { client, calls } = stubRpc();
  const start = new Date(Date.now() + 2 * 86_400_000).toISOString();
  const valid = validateCohortInput({
    courseId: 'c-1', courseVersionId: 'v-1', title: 'Class', startsAt: start,
  });
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  const result = await createCohort(client, valid.value);
  assert.deepEqual(result, { ok: true, id: 'cohort-1' });
  assert.equal(calls[0]?.fn, 'create_cohort');
  assert.deepEqual(Object.keys(calls[0]!.args).sort(), [
    'p_capacity', 'p_course_id', 'p_course_version_id', 'p_description', 'p_ends_at', 'p_starts_at', 'p_title',
  ]);
});

test('cohort failures map to useful statuses', () => {
  assert.equal(mapCohortError({ message: 'cohorts are not enabled' }).status, 409);
  assert.equal(mapCohortError({ message: 'only the course author can open a cohort' }).status, 403);
  assert.equal(mapCohortError({ message: 'cohort not found', code: 'P0002' }).status, 404);
  assert.equal(mapCohortError({ message: 'this cohort is full' }).status, 409);
});

// ---------------------------------------------------------------------------
// RLS-backed reads
// ---------------------------------------------------------------------------

test('a learner sees only the classes they can access and the exact version they are enrolled in', async () => {
  const { client, calls } = stubQueries({
    cohorts: [
      {
        id: 'cohort-1', course_id: 'course-1', course_version_id: 'version-1',
        title: 'Tajweed group', description: null, starts_at: '2027-01-01T09:00:00Z',
        ends_at: null, capacity: 12, status: 'open',
      },
    ],
    course_versions: [{ id: 'version-1', version_number: 2 }],
    course_enrolments: [
      { learner_profile_id: 'learner-1', course_version_id: 'version-1', status: 'active' },
      { learner_profile_id: 'learner-2', course_version_id: 'version-2', status: 'active' },
    ],
    cohort_members: [{ cohort_id: 'cohort-1', learner_profile_id: 'learner-1' }],
  });

  const cohorts = await fetchJoinableCohorts(client, {
    courseId: 'course-1', learners: [{ id: 'learner-1' }, { id: 'learner-2' }],
  });
  assert.equal(cohorts.length, 1);
  assert.equal(cohorts[0]?.versionNumber, 2);
  assert.deepEqual(cohorts[0]?.eligibleLearnerIds, ['learner-1']);
  assert.deepEqual(cohorts[0]?.joinedLearnerIds, ['learner-1']);
  const cohortQuery = calls.find((call) => call.table === 'cohorts');
  assert.deepEqual(cohortQuery?.filters, { course_id: 'course-1', deleted_at: null, status: 'open' });
  for (const call of calls) assert.equal(Object.hasOwn(call.filters, 'user_id'), false);
});
