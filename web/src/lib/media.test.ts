import assert from 'node:assert/strict';
import test from 'node:test';

import { validateRegisterUpload, MAX_UPLOAD_BYTES } from './media.ts';

// ---------------------------------------------------------------------------
// Registering an upload target.
//
// The rules under test are the ones that stop a bad row reaching the database,
// plus the one that matters most to the person using it: the checksum is a
// 64-char lowercase hex SHA-256, and being told that in a sentence beats being
// told a constraint name.
// ---------------------------------------------------------------------------

const base = {
  displayName: 'Lesson recording',
  mimeType: 'video/mp4',
  byteSize: 1048576,
  checksum: 'a'.repeat(64),
  durationSeconds: 600,
};

test('a well-formed upload registers', () => {
  assert.equal(validateRegisterUpload(base).ok, true);
});

test('a file needs a name, and the column has a limit', () => {
  for (const displayName of ['', '   ', '\n\t']) {
    const r = validateRegisterUpload({ ...base, displayName });
    assert.equal(r.ok, false, `${JSON.stringify(displayName)} should be refused`);
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.message, /name/);
  }

  const long = validateRegisterUpload({ ...base, displayName: 'x'.repeat(201) });
  assert.equal(long.ok, false);
  assert.ok(!long.ok);
  if (!long.ok) assert.match(long.message, /200 characters/);

  assert.equal(validateRegisterUpload({ ...base, displayName: 'x'.repeat(200) }).ok, true);
  // A name in another script is the common case on this platform, not an edge.
  assert.equal(validateRegisterUpload({ ...base, displayName: 'درس التجويد الأول' }).ok, true);
});

test('a name is checked before anything else, so the message is about the name', () => {
  const r = validateRegisterUpload({ ...base, displayName: '', checksum: 'nope' });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  assert.match(r.message, /name/, 'the first thing wrong is the first thing reported');
});

test('duration is optional', () => {
  assert.equal(validateRegisterUpload({ ...base, durationSeconds: null }).ok, true);
  assert.equal(
    validateRegisterUpload({ ...base, durationSeconds: undefined }).ok,
    true,
  );
});

test('a checksum that is not lowercase hex SHA-256 is refused', () => {
  const bad = [
    'not-a-hash',
    'A'.repeat(64), // uppercase
    'a'.repeat(63), // one short
    'a'.repeat(65), // one long
    'z'.repeat(64), // not hex
    '',
    ' '.repeat(64),
  ];

  for (const checksum of bad) {
    const r = validateRegisterUpload({ ...base, checksum });
    assert.equal(r.ok, false, `${JSON.stringify(checksum)} should be refused`);
    assert.ok(!r.ok);
    if (!r.ok) {
      assert.match(r.message, /SHA-256/);
      // The point is that this is a sentence, not a constraint name.
      assert.doesNotMatch(r.message, /_check/);
    }
  }
});

test('a mixed-case digest is refused rather than silently lowercased', () => {
  // The database lowercases it; the validation refuses first, so the caller is
  // told what was wrong instead of having their input quietly rewritten.
  const r = validateRegisterUpload({ ...base, checksum: 'Ab' + 'c'.repeat(62) });
  assert.equal(r.ok, false);
});

test('a file needs a type', () => {
  for (const mimeType of ['', '   ']) {
    const r = validateRegisterUpload({ ...base, mimeType });
    assert.equal(r.ok, false);
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.message, /type/i);
  }
});

test('a file needs a positive size in bytes', () => {
  for (const byteSize of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const r = validateRegisterUpload({ ...base, byteSize });
    assert.equal(r.ok, false, `${byteSize} should be refused`);
  }
});

test('an absurdly large file is refused before the request', () => {
  const r = validateRegisterUpload({ ...base, byteSize: MAX_UPLOAD_BYTES + 1 });
  assert.equal(r.ok, false);
  assert.ok(!r.ok);
  if (!r.ok) assert.match(r.message, /8 GiB/);

  assert.equal(validateRegisterUpload({ ...base, byteSize: MAX_UPLOAD_BYTES }).ok, true,
    'exactly at the limit should pass');
});

test('a negative duration is refused', () => {
  assert.equal(validateRegisterUpload({ ...base, durationSeconds: -1 }).ok, false);
  assert.equal(validateRegisterUpload({ ...base, durationSeconds: 0 }).ok, true,
    'zero is a valid duration');
});

test('a fractional duration is refused', () => {
  assert.equal(validateRegisterUpload({ ...base, durationSeconds: 1.5 }).ok, false);
});

// ---------------------------------------------------------------------------
// Moderation: holding and withdrawing a master.
//
// These two actions end access to a file somebody uploaded, and both are asked
// about later by somebody who was not in the room. So the rules under test are
// that the reason is required before the database is asked, that it arrives
// trimmed, and that a refusal reads as a sentence.
// ---------------------------------------------------------------------------

import {
  fetchMediaModerationQueue,
  quarantineMediaAsset,
  retryMediaRendition,
  withdrawMediaAsset,
} from './media.ts';

type RpcCall = { fn: string; args: Record<string, unknown> };

function stubRpc(result: { data?: unknown; error?: { message: string } } = { data: true }) {
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

const assetId = '4f30fd1d-6f2c-4c1e-9a5b-0d2f6c8a1b23';

test('quarantining sends the reason, trimmed, to the function that requires it', async () => {
  const { client, calls } = stubRpc();
  const result = await quarantineMediaAsset(client, assetId, '  rights complaint 2026-1043  ');
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.fn, 'quarantine_media_upload');
  assert.deepEqual(calls[0]?.args, { p_asset_id: assetId, p_reason: 'rights complaint 2026-1043' });
});

test('withdrawing sends the reason too, and reports a file that was already gone', async () => {
  const { client, calls } = stubRpc({ data: true });
  assert.equal((await withdrawMediaAsset(client, assetId, 'safeguarding report 88')).ok, true);
  assert.equal(calls[0]?.fn, 'delete_media_asset');
  assert.deepEqual(calls[0]?.args, { p_asset_id: assetId, p_reason: 'safeguarding report 88' });

  const gone = stubRpc({ data: false });
  const result = await withdrawMediaAsset(gone.client, assetId, 'already handled');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /already been withdrawn/);
});

test('a blank reason never reaches the database', async () => {
  for (const reason of ['', '   ', '\n\t']) {
    const q = stubRpc();
    assert.equal((await quarantineMediaAsset(q.client, assetId, reason)).ok, false);
    const w = stubRpc();
    assert.equal((await withdrawMediaAsset(w.client, assetId, reason)).ok, false);
    assert.equal(q.calls.length, 0, 'quarantine called the database without a reason');
    assert.equal(w.calls.length, 0, 'withdrawal called the database without a reason');
  }
});

test('a reason has a length, because it is written into an audit trail', async () => {
  const { client, calls } = stubRpc();
  const result = await quarantineMediaAsset(client, assetId, 'x'.repeat(2001));
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
  if (!result.ok) assert.match(result.message, /under 2000 characters/);
});

test('a missing asset id is refused without a call', async () => {
  const { client, calls } = stubRpc();
  assert.equal((await withdrawMediaAsset(client, '', 'a reason')).ok, false);
  assert.equal(calls.length, 0);
});

test('the database\'s refusals read as sentences', async () => {
  const cases: Array<[string, RegExp]> = [
    ['only staff may quarantine an upload', /Only platform staff/],
    ['a reason is required to withdraw an upload', /Say why in writing/],
    ['you may only delete your own uploads', /belongs to somebody else/],
    ['no media asset 4f30fd1d', /That upload is gone/],
  ];
  for (const [message, expected] of cases) {
    const { client } = stubRpc({ error: { message } });
    const result = await quarantineMediaAsset(client, assetId, 'a reason');
    assert.equal(result.ok, false, `${message} was accepted`);
    if (!result.ok) assert.match(result.message, expected);
  }
});

/** A query-builder stub: .from().select().order() resolves to rows. */
function stubTable(rows: unknown[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    order: () => chain,
    is: () => chain,
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = { from: () => chain } as any;
  return client;
}

test('the moderation queue carries the uploader and the renditions derived from a master', async () => {
  const client = stubTable([
    {
      id: assetId,
      mime_type: 'video/mp4',
      byte_size: '10485760',
      duration_seconds: 600,
      status: 'available',
      created_at: '2026-10-20T09:00:00.000Z',
      user_profiles: { display_name: 'Teacher One' },
      media_renditions: [
        { id: 'r-720', profile: '720p', status: 'available', failure_reason: null },
        { id: 'r-aud', profile: 'audio', status: 'pending', failure_reason: null },
      ],
    },
    {
      id: '00000000-0000-4000-8000-000000000000',
      mime_type: 'application/pdf',
      byte_size: 2048,
      duration_seconds: null,
      status: 'quarantined',
      created_at: '2026-10-19T09:00:00.000Z',
      user_profiles: null,
      media_renditions: null,
    },
  ]);

  const queue = await fetchMediaModerationQueue(client);
  assert.equal(queue.length, 2);
  assert.equal(queue[0]?.uploader, 'Teacher One');
  assert.equal(queue[0]?.byteSize, 10485760, 'a bigint column must arrive as a number');
  assert.deepEqual(queue[0]?.renditions, [
    { id: 'r-720', profile: '720p', status: 'available', failureReason: null },
    { id: 'r-aud', profile: 'audio', status: 'pending', failureReason: null },
  ]);
  assert.equal(queue[1]?.uploader, null);
  assert.equal(queue[1]?.durationSeconds, null);
  assert.deepEqual(queue[1]?.renditions, []);
});

// ---------------------------------------------------------------------------
// Retrying a copy that failed to encode.
//
// A `failed` rendition used to be permanent: nothing moved the row back and a
// second register for the profile hit the unique index. These pin the web side
// of the repair — the reason is required before the database is asked, it
// arrives trimmed, the id goes to the copy rather than to the master, and each
// of the database's refusals reads as a sentence about what to do next.
// ---------------------------------------------------------------------------

const renditionId = '9b1c2d3e-4f50-4a6b-8c7d-0e1f2a3b4c5d';

test('a retry sends the reason, trimmed, to the function that requires it', async () => {
  const { client, calls } = stubRpc({ data: null });
  const result = await retryMediaRendition(client, renditionId, '  the worker host was out of disk  ');
  assert.equal(result.ok, true);
  assert.equal(calls[0]?.fn, 'retry_media_rendition');
  assert.equal(calls[0]?.args.p_rendition_id, renditionId, 'the retry went to the master, not the copy');
  assert.equal(calls[0]?.args.p_reason, 'the worker host was out of disk');
});

test('a retry with nothing written never reaches the database', async () => {
  for (const reason of ['', '   ', '\n\t']) {
    const { client, calls } = stubRpc({ data: null });
    assert.equal((await retryMediaRendition(client, renditionId, reason)).ok, false, reason);
    assert.equal(calls.length, 0, 'a reasonless retry called the database');
  }
  const long = stubRpc({ data: null });
  const result = await retryMediaRendition(long.client, renditionId, 'x'.repeat(2001));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /under 2000/);
  assert.equal(long.calls.length, 0);
});

test('a retry with no rendition id is refused here, not by the database', async () => {
  const { client, calls } = stubRpc({ data: null });
  assert.equal((await retryMediaRendition(client, '', 'a reason')).ok, false);
  assert.equal(calls.length, 0);
});

test('the refusals a retry can meet each say what to do about them', async () => {
  const cases: Array<[string, RegExp]> = [
    ['only platform staff may retry a rendition', /Only platform staff/],
    ['a retry needs a written reason', /Say why a second attempt will work/],
    ['no rendition 9b1c2d3e', /That rendition is gone/],
    ['a rendition that is available is not waiting for a retry', /Only a rendition that failed/],
    ['the master this rendition was encoded from has been withdrawn', /withdrawn/],
    ['the master is quarantined, so there is nothing to encode from yet', /held for review/],
    ['something nobody anticipated', /something nobody anticipated/],
  ];
  for (const [message, expected] of cases) {
    const { client } = stubRpc({ error: { message } });
    const result = await retryMediaRendition(client, renditionId, 'a reason');
    assert.equal(result.ok, false, `${message} was accepted`);
    if (!result.ok) assert.match(result.message, expected);
  }
});
