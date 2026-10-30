import assert from 'node:assert/strict';
import test from 'node:test';

import {
  describeStreak, engagementOffSentence, fetchEngagement, parseEngagement,
} from './engagement.ts';

// ---------------------------------------------------------------------------
// Streaks and badges.
//
// The database decides the numbers; this layer has one job — never put a broken number
// on a child's dashboard. A streak of NaN, or a badge with no name, is worse than an
// empty strip, because nobody can tell it is a bug.
// ---------------------------------------------------------------------------

const reply = {
  learnerProfileId: 'lp-1',
  timezone: 'Africa/Kampala',
  streakDays: 3,
  longestStreakDays: 7,
  lastActiveOn: '2026-10-22',
  lessonsCompleted: 12,
  coursesCompleted: 1,
  certificates: 1,
  badges: [
    { code: 'first_lesson', name: 'First step', description: 'Finished a lesson.', earnedOn: '2026-10-01' },
    { code: 'ten_lessons', name: 'Ten lessons', description: 'Finished ten lessons.', earnedOn: null },
  ],
};

test('a well-formed reply is read whole', () => {
  const parsed = parseEngagement(reply);
  assert.ok(parsed);
  assert.equal(parsed.streakDays, 3);
  assert.equal(parsed.timezone, 'Africa/Kampala');
  assert.equal(parsed.badges.length, 2);
  assert.equal(parsed.badges[0]?.earnedOn, '2026-10-01');
  assert.equal(parsed.badges[1]?.earnedOn, null);
});

test('a reply that cannot be trusted is refused rather than half-rendered', () => {
  assert.equal(parseEngagement(null), null);
  assert.equal(parseEngagement('nonsense'), null);
  // No learner id: nothing to attach the strip to.
  assert.equal(parseEngagement({ ...reply, learnerProfileId: '' }), null);
  // Numbers must be numbers. A string might be a bigint from PostgREST, but a streak
  // is a day count and the function is typed `integer`, so anything else is a bug.
  assert.equal(parseEngagement({ ...reply, streakDays: '3' }), null);
  assert.equal(parseEngagement({ ...reply, streakDays: NaN }), null);
  assert.equal(parseEngagement({ ...reply, longestStreakDays: -1 }), null);
});

test('a malformed badge is dropped, and the rest survive', () => {
  const parsed = parseEngagement({
    ...reply,
    badges: [
      reply.badges[0],
      { code: '', name: 'Nameless' },
      { code: 'no_name' },
      null,
      'nonsense',
    ],
  });
  assert.ok(parsed);
  assert.deepEqual(parsed.badges.map((b) => b.code), ['first_lesson']);
});

test('a refusal from the database is silence, not an error', async () => {
  // The flag may be off, or the learner may not be the caller's. A dashboard must not
  // break because a feature is switched off.
  const off = {
    rpc: async () => ({ data: null, error: { message: 'streaks and badges are not enabled' } }),
  } as never;
  assert.equal(await fetchEngagement(off, 'lp-1'), null);

  const empty = { rpc: async () => ({ data: null, error: null }) } as never;
  assert.equal(await fetchEngagement(empty, 'lp-1'), null);

  const good = { rpc: async () => ({ data: reply, error: null }) } as never;
  assert.equal((await fetchEngagement(good, 'lp-1'))?.streakDays, 3);
});

test('a streak is described the way a person would say it', () => {
  assert.equal(describeStreak(0), 'No streak yet');
  assert.equal(describeStreak(1), '1 day in a row');
  assert.equal(describeStreak(4), '4 days in a row');
  assert.equal(describeStreak(-2), 'No streak yet');
  assert.equal(describeStreak(Number.NaN), 'No streak yet');
});

test('the two ways engagement can be off say different things', () => {
  // Saying "not switched on for this platform" when streaks are on for adults and off
  // for children sends a guardian to look for a switch that is already on. The two
  // sentences must be different, and each must name the thing that is actually true.
  const platform = engagementOffSentence('disabled');
  const children = engagementOffSentence('children_off');

  assert.notEqual(platform, children);
  assert.match(platform, /not switched on for this platform/);
  assert.match(children, /not for children/);
  assert.doesNotMatch(children, /not switched on for this platform/);

  // Both must promise the learning is still there, because both are true about that.
  for (const sentence of [platform, children]) {
    assert.match(sentence, /still being recorded|still recorded|are still/i);
  }

  // And the children's sentence must not read as something a parent can change for one
  // child: it is a platform-wide decision, and pretending otherwise makes support load.
  assert.match(children, /not something you can turn on for one child/);
  assert.match(children, /treated the same way/);
});
