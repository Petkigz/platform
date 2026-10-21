import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cohortJoinWindowOpen,
  createCohort,
  fetchCohortPlaces,
  fetchJoinableCohorts,
  joinWindowLabel,
  mapCohortError,
  placesLabel,
  setCohortCapacity,
  setCohortJoinWindow,
  summarisePlaces,
  validateCapacity,
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
    /** Rows for a function call are keyed `rpc:<name>` alongside the tables. */
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ table: `rpc:${fn}`, filters: args, order: null });
      return Promise.resolve({ data: tableRows[`rpc:${fn}`] ?? [], error: null });
    },
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
    'p_capacity', 'p_course_id', 'p_course_version_id', 'p_description', 'p_ends_at',
    'p_join_closes_at', 'p_starts_at', 'p_title',
  ]);
  // Blank means "close at the start", which is a decision rather than a missing
  // value, so it is sent as null and the database applies its own default.
  assert.equal(calls[0]?.args.p_join_closes_at, null);
});

test('a join window is normalized, and cannot outlive the class', () => {
  const start = new Date(Date.now() + 2 * 86_400_000).toISOString();
  const end = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const closes = new Date(Date.now() + 10 * 86_400_000).toISOString();

  const blank = validateCohortInput({
    courseId: 'c-1', courseVersionId: 'v-1', title: 'Class', startsAt: start,
  });
  assert.equal(blank.ok, true);
  if (blank.ok) assert.equal(blank.value.joinClosesAt, null,
    'a blank window became a date instead of the default');

  const set = validateCohortInput({
    courseId: 'c-1', courseVersionId: 'v-1', title: 'Class', startsAt: start,
    endsAt: end, joinClosesAt: closes,
  });
  assert.equal(set.ok, true);
  if (set.ok) assert.equal(set.value.joinClosesAt, closes);

  // Registration cannot close before now, and cannot stay open past the end.
  for (const input of [
    { courseId: 'c-1', courseVersionId: 'v-1', title: 'C', startsAt: start, joinClosesAt: 'not a date' },
    { courseId: 'c-1', courseVersionId: 'v-1', title: 'C', startsAt: start, joinClosesAt: new Date(Date.now() - 3_600_000).toISOString() },
    { courseId: 'c-1', courseVersionId: 'v-1', title: 'C', startsAt: start, endsAt: end, joinClosesAt: new Date(Date.now() + 40 * 86_400_000).toISOString() },
  ]) {
    const result = validateCohortInput(input);
    assert.equal(result.ok, false, JSON.stringify(input.joinClosesAt));
  }
});

test('the window decides whether the button is offered, and says so in words', () => {
  const startsAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
  const open = { status: 'open' as const, startsAt, joinClosesAt: new Date(Date.now() + 86_400_000).toISOString() };
  const shut = { status: 'open' as const, startsAt, joinClosesAt: new Date(Date.now() - 86_400_000).toISOString() };
  const draft = { status: 'draft' as const, startsAt, joinClosesAt: open.joinClosesAt };

  assert.equal(cohortJoinWindowOpen(open), true);
  assert.equal(cohortJoinWindowOpen(shut), false);
  // A draft class is not taking anybody yet, however far off its window is.
  assert.equal(cohortJoinWindowOpen(draft), false);
  assert.equal(cohortJoinWindowOpen({ status: 'open', joinClosesAt: 'nonsense' }), false);

  assert.match(joinWindowLabel(shut), /Registration has closed/);
  assert.match(joinWindowLabel(open), /Registration closes/);
  // Closing at the start is the default, and is described as such rather than
  // as a date a learner would have to compare against the start themselves.
  assert.equal(joinWindowLabel({ status: 'open', startsAt, joinClosesAt: startsAt }),
    'Registration closes when the class starts');
});

test('moving the window sends a timestamp, and a shut window is a conflict not a permission error', async () => {
  const { client, calls } = stubRpc({ data: '2027-01-05T09:00:00.000Z' });
  const closes = new Date(Date.now() + 5 * 86_400_000).toISOString();
  const result = await setCohortJoinWindow(client, 'cohort-1', closes);
  assert.equal(result.ok, true);
  assert.equal(calls[0]?.fn, 'set_cohort_join_window');
  assert.deepEqual(calls[0]?.args, { p_cohort_id: 'cohort-1', p_join_closes_at: closes });

  const shut = mapCohortError({ message: 'this cohort stopped accepting joiners on 2027-01-02 09:00 EAT' });
  assert.equal(shut.status, 409);
  assert.match(shut.message, /stopped accepting joiners/,
    'a shut window was reworded into something that reads as the class being over');

  assert.equal(mapCohortError({ message: 'only the teacher who opened this cohort can change it' }).status, 403);
  assert.equal(mapCohortError({ message: 'the join window must close later than now' }).status, 400);
  assert.equal(mapCohortError({ message: 'the join window cannot close after the cohort ends' }).status, 400);
  assert.equal(mapCohortError({ message: 'a closed cohort is not accepting joiners, so its window cannot move' }).status, 409);
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
        ends_at: null, capacity: 12, status: 'open', join_closes_at: '2027-01-01T09:00:00Z',
      },
    ],
    course_versions: [{ id: 'version-1', version_number: 2 }],
    course_enrolments: [
      { learner_profile_id: 'learner-1', course_version_id: 'version-1', status: 'active' },
      { learner_profile_id: 'learner-2', course_version_id: 'version-2', status: 'active' },
    ],
    cohort_members: [{ cohort_id: 'cohort-1', learner_profile_id: 'learner-1' }],
    'rpc:cohort_places': [{ cohort_id: 'cohort-1', active_members: 3 }],
  });

  const cohorts = await fetchJoinableCohorts(client, {
    courseId: 'course-1', learners: [{ id: 'learner-1' }, { id: 'learner-2' }],
  });
  assert.equal(cohorts.length, 1);
  assert.equal(cohorts[0]?.joinClosesAt, '2027-01-01T09:00:00Z');
  assert.equal(cohorts[0]?.versionNumber, 2);
  assert.deepEqual(cohorts[0]?.eligibleLearnerIds, ['learner-1']);
  assert.deepEqual(cohorts[0]?.joinedLearnerIds, ['learner-1']);
  assert.deepEqual(cohorts[0]?.places, { activeMembers: 3, placesLeft: 9, full: false });
  const cohortQuery = calls.find((call) => call.table === 'cohorts');
  assert.deepEqual(cohortQuery?.filters, { course_id: 'course-1', deleted_at: null, status: 'open' });
  // One function call for every cohort on the page, not one per cohort.
  const placesCalls = calls.filter((call) => call.table === 'rpc:cohort_places');
  assert.equal(placesCalls.length, 1);
  assert.deepEqual(placesCalls[0]?.filters, { p_cohort_ids: ['cohort-1'] });
  for (const call of calls) assert.equal(Object.hasOwn(call.filters, 'user_id'), false);
});

// ---------------------------------------------------------------------------
// How full a class is
//
// The count is read by a definer function because a joiner may not read the
// roster: `cohort_members_read` shows a learner their own row and their family's,
// never a class list of other people's children. So what arrives is an integer
// and nothing else, and an integer that did not arrive is not a zero.
// ---------------------------------------------------------------------------

test('a count that could not be read is unknown, never zero and never full', () => {
  assert.deepEqual(summarisePlaces(12, null), { activeMembers: null, placesLeft: null, full: false });
  assert.equal(placesLabel({ activeMembers: null, placesLeft: null, full: false }, 12), null,
    'an unreadable count was shown as a number of places taken');
});

test('a class with no capacity has members but no places left to count', () => {
  assert.deepEqual(summarisePlaces(null, 4), { activeMembers: 4, placesLeft: null, full: false });
  assert.equal(placesLabel(summarisePlaces(null, 4), null), null);
});

test('places left are counted down to zero and never below it', () => {
  assert.deepEqual(summarisePlaces(12, 3), { activeMembers: 3, placesLeft: 9, full: false });
  assert.deepEqual(summarisePlaces(12, 12), { activeMembers: 12, placesLeft: 0, full: true });
  // Capacity can be lowered after people join, so more members than places is a
  // real state and not a negative number of places.
  assert.deepEqual(summarisePlaces(12, 15), { activeMembers: 15, placesLeft: 0, full: true });
});

test('the label a joiner reads names both numbers', () => {
  assert.equal(placesLabel(summarisePlaces(12, 3), 12), '3 of 12 places taken');
  assert.equal(placesLabel(summarisePlaces(12, 12), 12), '12 of 12 places taken');
  assert.equal(placesLabel(summarisePlaces(1, 0), 1), '0 of 1 places taken');
});

test('one call asks for every cohort, and a page with none asks for nothing', async () => {
  const { client, calls } = stubRpc({
    data: [
      { cohort_id: 'cohort-1', active_members: '3' },
      { cohort_id: 'cohort-2', active_members: 12 },
    ],
  });
  const places = await fetchCohortPlaces(client, ['cohort-1', 'cohort-2', 'cohort-9']);
  assert.deepEqual(places, { 'cohort-1': 3, 'cohort-2': 12 },
    'a count arriving as a string must be a number, and an unreadable cohort is absent');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.args, { p_cohort_ids: ['cohort-1', 'cohort-2', 'cohort-9'] });

  const none = stubQueries({});
  assert.deepEqual(await fetchCohortPlaces(none.client, []), {});
  assert.equal(none.calls.length, 0, 'a page with no classes called the database');
});

// ---------------------------------------------------------------------------
// How big a class is
//
// The capacity is published: a learner reads "3 of 12 places taken" and sees a
// Full badge instead of a Join button. A number other people are refused by has
// to be one its owner can change, so the teacher sets it — and blank is a choice
// (no limit) rather than an omission, which is why the validation returns null
// instead of refusing an empty field.
// ---------------------------------------------------------------------------

test('a blank size is no limit, and a whole number of places is that many', () => {
  for (const blank of ['', null, undefined]) {
    assert.deepEqual(validateCapacity(blank), { ok: true, value: null }, String(blank));
  }
  assert.deepEqual(validateCapacity('12'), { ok: true, value: 12 });
  assert.deepEqual(validateCapacity(12), { ok: true, value: 12 });
  assert.deepEqual(validateCapacity('1'), { ok: true, value: 1 });
});

test('a size that could not be a number of places is refused, not rounded', () => {
  for (const bad of ['0', 0, '-3', '1.5', '0.5', 'twelve', ' ', 'NaN']) {
    const result = validateCapacity(bad);
    assert.equal(result.ok, false, `${JSON.stringify(bad)} was accepted`);
    if (!result.ok) assert.match(result.message, /at least one learner/);
  }
  // A number input can hand over exponent notation, and 1e3 is a thousand
  // places rather than a mistake worth refusing.
  assert.deepEqual(validateCapacity('1e3'), { ok: true, value: 1000 });
});

test('changing the size sends the number, or null for no limit', async () => {
  const { client, calls } = stubRpc({ data: 12 });
  assert.equal((await setCohortCapacity(client, 'cohort-1', 12)).ok, true);
  assert.equal(calls[0]?.fn, 'set_cohort_capacity');
  assert.deepEqual(calls[0]?.args, { p_cohort_id: 'cohort-1', p_capacity: 12 });

  assert.equal((await setCohortCapacity(client, 'cohort-1', null)).ok, true);
  assert.deepEqual(calls[1]?.args, { p_cohort_id: 'cohort-1', p_capacity: null },
    'removing the limit was sent as something other than null');
});

test('the refusals a teacher meets when sizing a class read as sentences', () => {
  const floor = { message: 'this class already has 3 learners, so its limit cannot go below that' };
  assert.equal(mapCohortError(floor).status, 409);
  // The count is the part that makes it actionable, so it survives the mapping.
  assert.match(mapCohortError(floor).message, /already has 3 learners/);

  assert.equal(mapCohortError({ message: 'capacity must be at least one' }).status, 400);
  assert.match(mapCohortError({ message: 'capacity must be at least one' }).message,
    /room for at least one learner/);

  const finished = { message: 'a closed cohort is not accepting joiners, so its size cannot change' };
  assert.equal(mapCohortError(finished).status, 409);
  assert.match(mapCohortError(finished).message, /not accepting joiners/);

  assert.equal(mapCohortError({
    message: 'only the teacher who opened this cohort can change it',
  }).status, 403);
  assert.equal(mapCohortError({ message: 'cohort not found', code: 'P0002' }).status, 404);
});
