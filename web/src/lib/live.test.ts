import assert from 'node:assert/strict';
import test from 'node:test';
import { describeLength, describeReason, describeWhen, joinLiveSession } from './live.ts';
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
