import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLearnerDashboardExtras } from './learner-dashboard-work.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test('independent optional dashboard reads start together after their gates', async () => {
  const blocked = deferred<number>();
  const started: string[] = [];
  const result = loadLearnerDashboardExtras({
    rows: [1, 2], myProfileId: 'mine', liveOn: true, streaksOn: true, progressOn: true,
    summary: async (row) => { started.push(`summary${row}`); return row === 1 ? blocked.promise : 2; },
    summaryFallback: () => 0,
    live: async () => { started.push('live'); return ['class']; },
    engagement: async (id) => { started.push(`engagement:${id}`); return 'streak'; },
    lead: async (rows) => { started.push(`lead:${rows.length}`); return 'next'; },
  });
  assert.deepEqual(started, ['summary1', 'summary2', 'live', 'engagement:mine', 'lead:2']);
  blocked.resolve(1);
  assert.deepEqual(await result, { summaries: [1, 2], liveSessions: ['class'], engagement: 'streak', lead: 'next' });
});

test('disabled flags, empty enrolments and missing profile never trigger protected reads', async () => {
  const fail = async (): Promise<never> => { throw new Error('must not call'); };
  assert.deepEqual(await loadLearnerDashboardExtras({
    rows: [], myProfileId: null, liveOn: false, streaksOn: true, progressOn: true,
    summary: fail, summaryFallback: () => 0, live: fail, engagement: fail, lead: fail,
  }), { summaries: [], liveSessions: [], engagement: null, lead: null });
  assert.deepEqual(await loadLearnerDashboardExtras({
    rows: [1], myProfileId: 'mine', liveOn: false, streaksOn: false, progressOn: false,
    summary: fail, summaryFallback: () => 0, live: fail, engagement: fail, lead: fail,
  }), { summaries: [0], liveSessions: [], engagement: null, lead: null });
});

test('unexpected optional-read failures are not silently converted to data', async () => {
  await assert.rejects(loadLearnerDashboardExtras({
    rows: [], myProfileId: null, liveOn: true, streaksOn: false, progressOn: false,
    summary: async () => 1, summaryFallback: () => 0,
    live: async () => { throw new Error('failed'); }, engagement: async () => null, lead: async () => null,
  }), /failed/);
});
