import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COHORT_ANALYTICS_FLAGS,
  STALL_DAYS,
  attentionRank,
  daysSince,
  fetchCohortProgress,
  hasStarted,
  isFinished,
  isStalled,
  mapAnalyticsError,
  mapCohortLearnerRow,
  paceLabel,
  percentComplete,
  progressLabel,
  sortForAttention,
  summariseCohort,
  type CohortLearnerProgress,
} from './cohort-analytics.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = new Date('2026-10-20T12:00:00.000Z');
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

/** A database row, in the shape `cohort_learner_progress()` returns it. */
function dbRow(over: Record<string, unknown> = {}) {
  return {
    learner_profile_id: 'learner-1',
    display_name: 'Amina',
    learner_type: 'adult',
    age_band: null,
    joined_at: day(10),
    enrolment_id: 'enrolment-1',
    enrolment_status: 'active',
    lessons_completed: 2,
    lessons_in_progress: 1,
    lessons_in_version: 10,
    last_seen_at: day(1),
    ...over,
  };
}

/** A mapped row, for the label and summary tests. */
function learner(over: Partial<CohortLearnerProgress> = {}): CohortLearnerProgress {
  return {
    learnerProfileId: 'learner-1',
    displayName: 'Amina',
    learnerType: 'adult',
    ageBand: null,
    joinedAt: day(10),
    enrolmentId: 'enrolment-1',
    enrolmentStatus: 'active',
    lessonsCompleted: 2,
    lessonsInProgress: 1,
    lessonsInVersion: 10,
    lastSeenAt: day(1),
    ...over,
  };
}

function stubRpc(result: { data?: unknown; error?: { message: string; code?: string } }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
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

// ---------------------------------------------------------------------------
// The row
// ---------------------------------------------------------------------------

test('a database row is mapped into the shape a screen uses', () => {
  const row = mapCohortLearnerRow(dbRow());
  assert.equal(row.learnerProfileId, 'learner-1');
  assert.equal(row.displayName, 'Amina');
  assert.equal(row.enrolmentId, 'enrolment-1');
  assert.equal(row.lessonsCompleted, 2);
  assert.equal(row.lastSeenAt, day(1));
});

test('counts arrive as numbers even when the driver returns strings', () => {
  const row = mapCohortLearnerRow(dbRow({
    lessons_completed: '3', lessons_in_progress: '0', lessons_in_version: '12',
  }));
  assert.equal(row.lessonsCompleted, 3);
  assert.equal(row.lessonsInProgress, 0);
  assert.equal(row.lessonsInVersion, 12);
});

test('a null stays null rather than becoming a string or a zero', () => {
  const row = mapCohortLearnerRow(dbRow({
    enrolment_id: null, enrolment_status: null, last_seen_at: null, age_band: null, joined_at: null,
    lessons_completed: null,
  }));
  assert.equal(row.enrolmentId, null);
  assert.equal(row.enrolmentStatus, null);
  assert.equal(row.lastSeenAt, null);
  assert.equal(row.joinedAt, null);
  // A missing count is "none so far", which is 0 and not null.
  assert.equal(row.lessonsCompleted, 0);
});

test('a learner with no name is still a learner', () => {
  const row = mapCohortLearnerRow(dbRow({ display_name: null }));
  assert.equal(row.displayName, 'Unnamed learner');
});

test('the mapped row carries eleven fields and nothing else', () => {
  // The database test asserts the function does not select family_id or
  // linked_user_id. This asserts the mapping does not smuggle anything through:
  // a spread of the raw row would carry every column the function ever grows.
  const row = mapCohortLearnerRow(dbRow({ family_id: 'family-1', linked_user_id: 'user-1' }));
  assert.deepEqual(Object.keys(row).sort(), [
    'ageBand', 'displayName', 'enrolmentId', 'enrolmentStatus', 'joinedAt',
    'lastSeenAt', 'learnerProfileId', 'learnerType', 'lessonsCompleted',
    'lessonsInProgress', 'lessonsInVersion',
  ]);
  assert.equal('familyId' in row, false);
  assert.equal('linkedUserId' in row, false);
});

// ---------------------------------------------------------------------------
// The numbers
// ---------------------------------------------------------------------------

test('percent complete is a whole number of the version', () => {
  assert.equal(percentComplete(learner({ lessonsCompleted: 0, lessonsInVersion: 10 })), 0);
  assert.equal(percentComplete(learner({ lessonsCompleted: 1, lessonsInVersion: 3 })), 33);
  assert.equal(percentComplete(learner({ lessonsCompleted: 2, lessonsInVersion: 4 })), 50);
  assert.equal(percentComplete(learner({ lessonsCompleted: 10, lessonsInVersion: 10 })), 100);
});

test('a version with no lessons is zero percent, not a division by zero', () => {
  assert.equal(percentComplete(learner({ lessonsCompleted: 0, lessonsInVersion: 0 })), 0);
  assert.equal(progressLabel(learner({ lessonsInVersion: 0 })), 'No lessons in this version');
});

test('a lesson moved out of a version cannot leave a learner above 100%', () => {
  assert.equal(percentComplete(learner({ lessonsCompleted: 12, lessonsInVersion: 10 })), 100);
});

test('the progress label says what the rows say', () => {
  assert.equal(progressLabel(learner({ lessonsCompleted: 2, lessonsInVersion: 10 })),
    '2 of 10 lessons');
  assert.equal(progressLabel(learner({ lessonsCompleted: 0, lessonsInVersion: 3 })),
    '0 of 3 lessons');
});

test('finished means every lesson of the pinned version', () => {
  assert.equal(isFinished(learner({ lessonsCompleted: 10, lessonsInVersion: 10 })), true);
  assert.equal(isFinished(learner({ lessonsCompleted: 9, lessonsInVersion: 10 })), false);
  assert.equal(isFinished(learner({ lessonsCompleted: 0, lessonsInVersion: 0 })), false);
});

test('started means a lesson, a percentage, or a sighting', () => {
  assert.equal(hasStarted(learner({ lessonsCompleted: 0, lessonsInProgress: 0, lastSeenAt: null })),
    false);
  assert.equal(hasStarted(learner({ lessonsInProgress: 1, lastSeenAt: null })), true);
  assert.equal(hasStarted(learner({
    lessonsCompleted: 0, lessonsInProgress: 0, lastSeenAt: day(2),
  })), true);
});

test('days since floors, refuses junk, and never goes negative', () => {
  assert.equal(daysSince(day(1), NOW), 1);
  assert.equal(daysSince(new Date(NOW.getTime() - 36 * 3_600_000).toISOString(), NOW), 1);
  assert.equal(daysSince(new Date(NOW.getTime() + 86_400_000).toISOString(), NOW), 0);
  assert.equal(daysSince(null, NOW), null);
  assert.equal(daysSince('not a date', NOW), null);
});

// ---------------------------------------------------------------------------
// The verdicts
// ---------------------------------------------------------------------------

test('gone quiet is a started learner nobody has seen for a fortnight', () => {
  assert.equal(isStalled(learner({ lastSeenAt: day(STALL_DAYS) }), NOW), true);
  assert.equal(isStalled(learner({ lastSeenAt: day(STALL_DAYS + 5) }), NOW), true);
  assert.equal(isStalled(learner({ lastSeenAt: day(STALL_DAYS - 1) }), NOW), false);
  assert.equal(isStalled(learner({ lastSeenAt: day(1) }), NOW), false);
});

test('somebody who finished is never stalled', () => {
  assert.equal(isStalled(learner({
    lessonsCompleted: 10, lessonsInVersion: 10, lastSeenAt: day(60),
  }), NOW), false);
});

test('somebody who never started is not stalled, they are not started', () => {
  assert.equal(isStalled(learner({
    lessonsCompleted: 0, lessonsInProgress: 0, lastSeenAt: null,
  }), NOW), false);
  assert.equal(paceLabel(learner({
    lessonsCompleted: 0, lessonsInProgress: 0, lastSeenAt: null,
  }), NOW), 'Not started');
});

test('the pace label answers in the order a teacher asks', () => {
  assert.equal(paceLabel(learner({ enrolmentId: null }), NOW), 'Not enrolled yet');
  assert.equal(paceLabel(learner({ lessonsCompleted: 10, lessonsInVersion: 10 }), NOW), 'Finished');
  assert.equal(paceLabel(learner({ lastSeenAt: day(20) }), NOW), 'No activity for 20 days');
  assert.equal(paceLabel(learner({ lastSeenAt: day(2) }), NOW), 'In progress');
});

test('the fortnight boundary is the day itself, not the day after', () => {
  const justUnder = new Date(NOW.getTime() - (STALL_DAYS - 1) * 86_400_000).toISOString();
  const exactly = new Date(NOW.getTime() - STALL_DAYS * 86_400_000).toISOString();
  assert.equal(paceLabel(learner({ lastSeenAt: justUnder }), NOW), 'In progress');
  assert.equal(paceLabel(learner({ lastSeenAt: exactly }), NOW),
    `No activity for ${STALL_DAYS} days`);
});

// ---------------------------------------------------------------------------
// The class at a glance
// ---------------------------------------------------------------------------

test('the summary counts each learner once, in one bucket', () => {
  const rows = [
    learner({ learnerProfileId: 'a', lessonsCompleted: 5, lessonsInVersion: 5, lastSeenAt: day(1) }),
    learner({ learnerProfileId: 'b', lessonsCompleted: 2, lessonsInVersion: 10, lastSeenAt: day(2) }),
    learner({ learnerProfileId: 'c', lessonsCompleted: 1, lessonsInVersion: 10, lastSeenAt: day(30) }),
    learner({ learnerProfileId: 'd', lessonsCompleted: 0, lessonsInProgress: 0,
      lessonsInVersion: 10, lastSeenAt: null }),
    learner({ learnerProfileId: 'e', enrolmentId: null, lessonsCompleted: 0,
      lessonsInVersion: 10, lastSeenAt: null }),
  ];
  const summary = summariseCohort(rows, NOW);
  assert.equal(summary.learners, 5);
  assert.equal(summary.enrolled, 4);
  assert.equal(summary.notEnrolled, 1);
  assert.equal(summary.finished, 1);
  assert.equal(summary.inProgress, 1);
  assert.equal(summary.stalled, 1);
  assert.equal(summary.notStarted, 1);
  assert.equal(summary.finished + summary.inProgress + summary.stalled + summary.notStarted,
    summary.enrolled, 'a learner was counted twice, or not at all');
});

test('the average is over enrolled learners only', () => {
  const rows = [
    learner({ lessonsCompleted: 5, lessonsInVersion: 10 }),
    learner({ lessonsCompleted: 10, lessonsInVersion: 10 }),
    learner({ enrolmentId: null, lessonsCompleted: 0, lessonsInVersion: 10 }),
  ];
  assert.equal(summariseCohort(rows, NOW).averagePercent, 75);
});

test('an empty class summarises to zeroes rather than NaN', () => {
  const summary = summariseCohort([], NOW);
  assert.equal(summary.learners, 0);
  assert.equal(summary.averagePercent, 0);
  assert.equal(Number.isNaN(summary.averagePercent), false);
});

// ---------------------------------------------------------------------------
// Who to look at first
// ---------------------------------------------------------------------------

test('the roster is ordered by need, and nobody is dropped', () => {
  const rows = [
    learner({ learnerProfileId: 'fin', displayName: 'Zed',
      lessonsCompleted: 10, lessonsInVersion: 10 }),
    learner({ learnerProfileId: 'stall', displayName: 'Yusuf',
      lessonsCompleted: 1, lastSeenAt: day(30) }),
    learner({ learnerProfileId: 'noEnrol', displayName: 'Aisha',
      enrolmentId: null, lessonsCompleted: 0 }),
    learner({ learnerProfileId: 'working', displayName: 'Bilal',
      lessonsCompleted: 4, lastSeenAt: day(1) }),
    learner({ learnerProfileId: 'fresh', displayName: 'Cem',
      lessonsCompleted: 0, lessonsInProgress: 0, lastSeenAt: null }),
  ];
  const sorted = sortForAttention(rows, NOW);
  assert.deepEqual(sorted.map((r) => r.learnerProfileId),
    ['noEnrol', 'stall', 'fresh', 'working', 'fin']);
  assert.equal(sorted.length, rows.length, 'sorting dropped somebody');
  assert.equal(rows[0]?.learnerProfileId, 'fin', 'the caller\'s list was reordered in place');
});

test('within a rank, the least far along comes first', () => {
  const rows = [
    learner({ learnerProfileId: 'ahead', displayName: 'B', lessonsCompleted: 6, lessonsInVersion: 10 }),
    learner({ learnerProfileId: 'behind', displayName: 'A', lessonsCompleted: 2, lessonsInVersion: 10 }),
  ];
  assert.deepEqual(sortForAttention(rows, NOW).map((r) => r.learnerProfileId),
    ['behind', 'ahead']);
});

test('the same rank and the same progress falls back to the name, then the id', () => {
  const rows = [
    learner({ learnerProfileId: 'z', displayName: 'Zainab', lessonsCompleted: 3 }),
    learner({ learnerProfileId: 'a', displayName: 'Zainab', lessonsCompleted: 3 }),
    learner({ learnerProfileId: 'm', displayName: 'Adam', lessonsCompleted: 3 }),
  ];
  assert.deepEqual(sortForAttention(rows, NOW).map((r) => r.learnerProfileId), ['m', 'a', 'z']);
});

test('the ranks are the order the labels read in', () => {
  assert.equal(attentionRank(learner({ enrolmentId: null }), NOW), 0);
  assert.equal(attentionRank(learner({ lastSeenAt: day(30) }), NOW), 1);
  assert.equal(attentionRank(learner({
    lessonsCompleted: 0, lessonsInProgress: 0, lastSeenAt: null }), NOW), 2);
  assert.equal(attentionRank(learner(), NOW), 3);
  assert.equal(attentionRank(learner({ lessonsCompleted: 10, lessonsInVersion: 10 }), NOW), 4);
});

// ---------------------------------------------------------------------------
// Reading it
// ---------------------------------------------------------------------------

test('the roster is read through one rpc call, named and parameterised', async () => {
  const { client, calls } = stubRpc({ data: [dbRow()] });
  const result = await fetchCohortProgress(client, 'cohort-9');
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ fn: 'cohort_learner_progress', args: { p_cohort_id: 'cohort-9' } }]);
  if (result.ok) assert.equal(result.rows.length, 1);
});

test('an empty class is an answer, not an error', async () => {
  const { client } = stubRpc({ data: [] });
  const result = await fetchCohortProgress(client, 'cohort-9');
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.rows, []);
});

test('a null result is an empty class, because the driver says null for no rows', async () => {
  const { client } = stubRpc({ data: null });
  const result = await fetchCohortProgress(client, 'cohort-9');
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.rows, []);
});

test('a refusal comes back with a status and a sentence, not a stack', async () => {
  const { client } = stubRpc({ error: { message: 'permission denied for function cohort_learner_progress' } });
  const result = await fetchCohortProgress(client, 'cohort-9');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 403);
    assert.equal(result.message, 'You cannot see this class.');
  }
});

test('a paused feature says so', () => {
  assert.deepEqual(mapAnalyticsError({ message: 'cohorts are not enabled (learning.cohorts is off)' }),
    { status: 409, message: 'Learner analytics are not enabled.' });
});

test('anything else is a 500 that does not echo the database', () => {
  const mapped = mapAnalyticsError({
    message: 'could not serialize access due to concurrent update on learner_profiles id 42',
  });
  assert.equal(mapped.status, 500);
  assert.equal(/learner_profiles/.test(mapped.message), false,
    'a read failure leaked table and row detail to the screen');
  assert.equal(mapped.message, 'This class could not be read. Try again in a moment.');
});

test('an error with no message at all still gets a sentence', () => {
  assert.equal(mapAnalyticsError({}).status, 500);
  assert.equal(mapAnalyticsError({ message: null }).status, 500);
});

test('the flags this feature needs are the two the predicate checks', () => {
  assert.deepEqual([...COHORT_ANALYTICS_FLAGS], ['learning.cohorts', 'delivery.analytics']);
  assert.equal(STALL_DAYS, 14);
});
