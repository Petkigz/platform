import assert from 'node:assert/strict';
import test from 'node:test';

import {
  byAsset,
  copyCount,
  deliveryOf,
  parseDelivery,
  type CopyState,
  type Delivery,
} from './media-encoding.ts';

/** Copy counts plus the master's status, which is what `deliveryOf` reads. */
type State = CopyState & { assetId?: string; assetStatus?: Delivery['assetStatus'] };

function copies(over: Partial<State> = {}): State {
  return {
    available: 0,
    pending: 0,
    failed: 0,
    videoReady: false,
    audioReady: false,
    failureReason: null,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// The six answers
//
// Three of them look the same to a learner and need three different people to
// act, which is the whole reason this is a state rather than a boolean.
// ---------------------------------------------------------------------------

test('a file with a playable copy is ready, and says whose server it is on', () => {
  const verdict = deliveryOf(copies({ available: 2, videoReady: true }));
  assert.equal(verdict?.kind, 'plays');
  assert.equal(verdict?.ready, true);
  assert.match(verdict?.sentence ?? '', /our own server/);
});

test('an audio-only copy promises sound and no picture', () => {
  const verdict = deliveryOf(copies({ available: 1, audioReady: true }));
  assert.equal(verdict?.kind, 'plays');
  assert.equal(verdict?.ready, true);
  assert.match(verdict?.sentence ?? '', /no picture/);
});

test('copies still being made are a wait, not a failure', () => {
  const verdict = deliveryOf(copies({ pending: 2 }));
  assert.equal(verdict?.kind, 'encoding');
  assert.equal(verdict?.ready, false);
  assert.match(verdict?.sentence ?? '', /still being made/);
});

test('a failed encode carries the worker’s reason and says it will not retry', () => {
  const verdict = deliveryOf(copies({ failed: 2, failureReason: 'encoder exited 137 (out of memory)' }));
  assert.equal(verdict?.kind, 'failed');
  assert.equal(verdict?.ready, false);
  assert.match(verdict?.sentence ?? '', /encoder exited 137 \(out of memory\)/);
  assert.match(verdict?.sentence ?? '', /does not retry by itself/);
});

test('a failed encode with copies still pending is a wait, not a failure', () => {
  // One profile died and another is still running. Calling that failed would
  // send staff to retry a job that is in progress.
  const verdict = deliveryOf(copies({ failed: 1, pending: 1, failureReason: 'disk full' }));
  assert.equal(verdict?.kind, 'encoding');
  assert.doesNotMatch(verdict?.sentence ?? '', /disk full/);
});

test('a verified file with no copies at all is the dangerous case, and is named', () => {
  const verdict = deliveryOf(copies());
  assert.equal(verdict?.kind, 'silent');
  assert.equal(verdict?.ready, false);
  assert.match(verdict?.sentence ?? '', /no delivery copy/);
  assert.match(verdict?.sentence ?? '', /looks finished and does not play/);
});

test('a file waiting for verification says nothing is encoded from it', () => {
  const verdict = deliveryOf(copies({ assetStatus: 'pending' }));
  assert.equal(verdict?.kind, 'unverified');
  assert.equal(verdict?.ready, false);
  assert.match(verdict?.sentence ?? '', /checked by a staff member/);
});

test('a held master wins over its surviving copies', () => {
  // Quarantining stops copies being served without deleting them. The report has
  // to say which one is true, or a teacher asks why an "available" copy is not
  // playing.
  const verdict = deliveryOf(copies({ assetStatus: 'quarantined', available: 3, videoReady: true }));
  assert.equal(verdict?.kind, 'held');
  assert.equal(verdict?.ready, false);
  assert.match(verdict?.sentence ?? '', /withdrawn/);
});

test('a withdrawn file is not described as something to wait for', () => {
  const verdict = deliveryOf(copies({ assetStatus: 'deleted', available: 1, videoReady: true }));
  assert.equal(verdict?.kind, 'held');
  assert.equal(verdict?.ready, false);
  assert.match(verdict?.sentence ?? '', /gone from every path/);
});

test('no row is not a verdict', () => {
  // An external address has no encoding state. A page that rendered a sentence
  // for it would be describing a file that does not exist.
  assert.equal(deliveryOf(null), null);
  assert.equal(deliveryOf(undefined), null);
});

test('a quota of exactly one true value is enough, and a missing one is not true', () => {
  assert.equal(deliveryOf(copies({ videoReady: false, audioReady: true }))?.ready, true);
  assert.equal(deliveryOf(copies({ videoReady: false, audioReady: false }))?.ready, false);
});

// ---------------------------------------------------------------------------
// Parsing what the database actually sends
//
// PostgREST returns `bigint` as a string, and a count from a left join can be
// null. `null > 0` is false and `'3' > 0` is true only by coercion; a page that
// trusted either would print "0 copies" for a file with three.
// ---------------------------------------------------------------------------

test('counts arrive as numbers, strings or nulls, and are read the same way', () => {
  const [row] = parseDelivery([
    {
      asset_id: 'a-1',
      asset_status: 'available',
      available_copies: '3',
      pending_copies: null,
      failed_copies: 0,
      video_ready: true,
      audio_ready: false,
      failure_reason: null,
    },
  ]);

  assert.equal(row?.assetId, 'a-1');
  assert.equal(row?.available, 3);
  assert.equal(row?.pending, 0);
  assert.equal(row?.failed, 0);
  assert.equal(row?.videoReady, true);
  assert.equal(row?.audioReady, false);
  assert.equal(row?.failureReason, null);
});

test('a library row without an asset status is assumed usable', () => {
  // `my_media_delivery` omits the column: every row it returns comes from the
  // library, which already filters tombstoned masters. Defaulting to anything
  // else would invent a quarantine nobody applied.
  const [row] = parseDelivery([
    { asset_id: 'a-2', available_copies: 1, pending_copies: 0, failed_copies: 0, video_ready: true },
  ]);
  assert.equal(row?.assetStatus, 'available');
  assert.equal(deliveryOf(row ?? null)?.kind, 'plays');
});

test('an empty failure reason is no reason, not an empty sentence', () => {
  const [row] = parseDelivery([
    { asset_id: 'a-3', available_copies: 0, failed_copies: 1, failure_reason: '   ' },
  ]);
  assert.equal(row?.failureReason, null);
  assert.match(deliveryOf(row ?? null)?.sentence ?? '', /reported no reason/);
});

test('a reason long enough to break the sentence is bounded', () => {
  const long = 'x'.repeat(400);
  const verdict = deliveryOf(copies({ failed: 1, failureReason: long }));
  const sentence = verdict?.sentence ?? '';
  assert.ok(sentence.length < 320, `a worker's stack trace must not become the page: ${sentence.length}`);
  assert.match(sentence, /…/);
});

test('a row with no asset id is skipped rather than keyed "undefined"', () => {
  const rows = parseDelivery([
    { available_copies: 1 },
    null,
    'nonsense',
    { asset_id: 'a-4', available_copies: 1 },
  ]);
  assert.deepEqual(rows.map((r) => r.assetId), ['a-4']);
});

test('a response that is not a list is no rows, not a crash', () => {
  assert.deepEqual(parseDelivery(null), []);
  assert.deepEqual(parseDelivery(undefined), []);
  assert.deepEqual(parseDelivery({ data: [] }), []);
  assert.deepEqual(parseDelivery('nope'), []);
});

test('rows are looked up by asset, because a lesson lists files by resource', () => {
  const rows = parseDelivery([
    { asset_id: 'a-5', available_copies: 1, video_ready: true },
    { asset_id: 'a-6', available_copies: 0, pending_copies: 1 },
  ]);
  const map = byAsset(rows);
  assert.equal(map.get('a-5')?.videoReady, true);
  assert.equal(deliveryOf(map.get('a-6') ?? null)?.kind, 'encoding');
  assert.equal(deliveryOf(map.get('a-7') ?? null), null);
});

test('copyCount counts what exists, in every state', () => {
  assert.equal(copyCount(copies()), 0);
  assert.equal(copyCount(copies({ available: 2, pending: 1, failed: 3 })), 6);
});

test('every verdict is a sentence a person wrote', () => {
  const states: State[] = [
    { ...copies(), assetId: 'x', assetStatus: 'available' },
    { ...copies({ pending: 1 }), assetId: 'x', assetStatus: 'available' },
    { ...copies({ failed: 1 }), assetId: 'x', assetStatus: 'available' },
    { ...copies({ videoReady: true }), assetId: 'x', assetStatus: 'available' },
    { ...copies({ assetStatus: 'pending' }), assetId: 'x' },
    { ...copies({ assetStatus: 'quarantined' }), assetId: 'x' },
    { ...copies({ assetStatus: 'deleted' }), assetId: 'x' },
  ];
  const kinds = new Set<string>();
  for (const state of states) {
    const verdict = deliveryOf(state);
    assert.ok(verdict, 'every state has a verdict');
    kinds.add(verdict.kind);
    assert.ok(verdict.sentence.trim().endsWith('.'), `not a sentence: ${verdict.sentence}`);
    assert.ok(!/[A-Za-z]:\\|\/mnt\/|\bnull\b|\bundefined\b/.test(verdict.sentence),
      `a path or a null leaked into the copy: ${verdict.sentence}`);
  }
  assert.deepEqual(
    [...kinds].sort(),
    ['encoding', 'failed', 'held', 'plays', 'silent', 'unverified'],
    'all six states are reachable',
  );
});
