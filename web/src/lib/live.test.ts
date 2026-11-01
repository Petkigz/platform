import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cancelLiveSession,
  describeAudience,
  describeCancellation,
  describeLength,
  describeReason,
  describeWhen,
  joinLiveSession,
  liveSessionAudience,
} from './live.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

test('a class is described in the zone it was set in, with the reader’s own beside it', () => {
  const starts = '2026-11-03T16:00:00.000Z';
  const text = describeWhen(starts, 'Africa/Kampala', 'Europe/London');
  assert.match(text, /19:00/, `Kampala time missing: ${text}`);
  assert.match(text, /Africa\/Kampala/);
  assert.match(text, /16:00/, `London time missing: ${text}`);
  assert.match(text, /your time/);
});

test('a reader in the same zone is not told the same time twice', () => {
  const text = describeWhen('2026-11-03T16:00:00.000Z', 'Africa/Kampala', 'Africa/Kampala');
  assert.equal(text.includes('your time'), false, text);
});

test('a length reads as hours and minutes', () => {
  const start = '2026-11-03T16:00:00.000Z';
  assert.equal(describeLength(start, '2026-11-03T16:45:00.000Z'), '45 minutes');
  assert.equal(describeLength(start, '2026-11-03T17:00:00.000Z'), '1 hour');
  assert.equal(describeLength(start, '2026-11-03T18:30:00.000Z'), '2h 30m');
});

test('a shut door says why, and an unknown reason still says something', () => {
  assert.match(describeReason('not_open_yet') ?? '', /opens shortly/i);
  assert.match(describeReason('not_enrolled') ?? '', /not enrolled/i);
  assert.match(describeReason('something_new') ?? '', /not open/i);
  assert.equal(describeReason(null), null);
});

test('joining treats a missing or malformed reply as not joined', async () => {
  const client = (data: unknown, error: { message: string } | null = null) =>
    ({ rpc: async () => ({ data, error }) }) as unknown as SupabaseClient;

  const ok = await joinLiveSession(
    client({ joined: true, roomUrl: 'https://r/room/ab12-cd34-ef56', roomSlug: 'ab12-cd34-ef56' }),
    's1',
    'l1',
  );
  assert.equal(ok.joined, true);
  assert.equal(ok.joined === true ? ok.roomSlug : '', 'ab12-cd34-ef56');

  const noUrl = await joinLiveSession(client({ joined: true }), 's1', 'l1');
  assert.equal(noUrl.joined, false, 'a joined reply with no room URL was trusted');

  const refused = await joinLiveSession(client({ joined: false, reason: 'no_room_host' }), 's1', 'l1');
  assert.equal(refused.joined, false);
  assert.equal(refused.joined === false ? refused.reason : '', 'no_room_host');

  const errored = await joinLiveSession(client(null, { message: 'nope' }), 's1', 'l1');
  assert.equal(errored.joined, false);
});

// ---------------------------------------------------------------------------
// Cancelling a class
// ---------------------------------------------------------------------------

const audience = (over: Partial<Parameters<typeof describeAudience>[0]> = {}) => ({
  title: 'Tafsir circle',
  status: 'scheduled',
  learners: 3,
  people: 2,
  cap: 200,
  willTell: 2,
  capped: false,
  cancellable: true,
  ...over,
});

test('the number on the cancel button is a number, not a reassurance', () => {
  assert.match(describeAudience(audience({ people: 1 })), /One person will be messaged/);
  assert.match(describeAudience(audience({ people: 12, learners: 14 })), /^12 people will be messaged/);
  // Nobody affected is said plainly rather than as "0 people".
  assert.match(describeAudience(audience({ people: 0, learners: 0 })), /Nobody else is affected/);
  assert.match(describeAudience(audience({ cancellable: false })), /already finished/);
});

test('a class too large for one message says how many will be missed', () => {
  const words = describeAudience(
    audience({ people: 340, learners: 352, willTell: 200, capped: true }),
  );
  assert.match(words, /340 people/);
  assert.match(words, /200 will be messaged/);
  assert.match(words, /other 140/);
  assert.match(words, /will not be messaged/, 'the shortfall was not admitted');
});

test('the receipt says what was done, and never reports a cap as complete', () => {
  assert.match(describeCancellation({ notified: 0, people: 0, capped: false }), /Nobody needed telling/);
  assert.match(describeCancellation({ notified: 1, people: 1, capped: false }), /the one person/);
  assert.match(describeCancellation({ notified: 6, people: 6, capped: false }), /all 6 people/);
  assert.match(describeCancellation({ notified: 2, people: 3, capped: false }), /Told 2 of 3/);

  const capped = describeCancellation({ notified: 200, people: 340, capped: true });
  assert.match(capped, /Told 200 of 340/);
  assert.match(capped, /were not messaged/);
  assert.doesNotMatch(capped, /all 340/, 'a truncated send was reported as complete');
});

test('the audience reply is normalised, and a malformed one is refused', async () => {
  const client = (data: unknown, error: { message: string } | null = null) =>
    ({ rpc: async () => ({ data, error }) }) as unknown as SupabaseClient;

  const ok = await liveSessionAudience(
    client({ title: 'Tafsir', status: 'scheduled', learners: 3, people: 2, cap: 200, willTell: 2, capped: false, cancellable: true }),
    's1',
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.ok === true ? ok.audience.people : -1, 2);
  assert.equal(ok.ok === true ? ok.audience.learners : -1, 3);

  // A reply with no count cannot be turned into a sentence about how many
  // people a cancellation would reach.
  const blank = await liveSessionAudience(client({}), 's1');
  assert.equal(blank.ok, false);

  const failed = await liveSessionAudience(client(null, { message: 'only the teacher hosting' }), 's1');
  assert.equal(failed.ok, false);
  assert.equal(failed.ok === false ? failed.message : '', 'only the teacher hosting');
});

test('a blank reason never leaves the page', async () => {
  let called = 0;
  const client = () =>
    ({
      rpc: async () => {
        called += 1;
        return { data: { notified: 1, people: 1 }, error: null };
      },
    }) as unknown as SupabaseClient;

  const blank = await cancelLiveSession(client(), 's1', '   ');
  assert.equal(blank.ok, false);
  assert.equal(called, 0, 'an empty reason was sent to the database');
});

test('cancelling returns a receipt, trimmed, and refuses a reply it cannot read', async () => {
  const client = (data: unknown, error: { message: string } | null = null) =>
    ({ rpc: async () => ({ data, error }) }) as unknown as SupabaseClient;

  const done = await cancelLiveSession(client({ people: 4, notified: 3, capped: false, status: 'cancelled' }), 's1', '  power cut  ');
  assert.equal(done.ok, true);
  assert.equal(done.ok === true ? done.receipt.notified : -1, 3);
  assert.equal(done.ok === true ? done.receipt.people : -1, 4);
  assert.equal(done.ok === true ? done.receipt.reason : '', 'power cut');

  const unreadable = await cancelLiveSession(client({ status: 'cancelled' }), 's1', 'power cut');
  assert.equal(unreadable.ok, false);

  const refused = await cancelLiveSession(client(null, { message: 'say why the class is cancelled' }), 's1', 'x');
  assert.equal(refused.ok, false);
  assert.equal(refused.ok === false ? refused.message : '', 'say why the class is cancelled');
});
