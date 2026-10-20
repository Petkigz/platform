import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_PLAYBACK_SECONDS, MAX_WORKER_SECONDS } from './media-r2.ts';
import {
  MASTER_PREVIEW_SECONDS,
  describeMasterPreviewError,
  fetchMasterPreviewTarget,
  playerKindFor,
  toMasterPreviewTarget,
} from './master-preview.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function dbRow(over: Record<string, unknown> = {}) {
  return {
    asset_id: 'asset-1',
    master_bucket: 'ayahspring-masters',
    master_key: 'asset-1/master.mp4',
    mime_type: 'video/mp4',
    byte_size: 1_048_576,
    display_name: 'Lesson one',
    status: 'available',
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
// The window
// ---------------------------------------------------------------------------

test('a master preview is a check, not a lesson, so its window is short', () => {
  assert.equal(MASTER_PREVIEW_SECONDS, 900);
  // presignMasterDownload() refuses anything longer than a worker window, so a
  // larger constant here would be a route that throws instead of signing.
  assert.ok(MASTER_PREVIEW_SECONDS <= MAX_WORKER_SECONDS,
    `the preview window (${MASTER_PREVIEW_SECONDS}) exceeds what the presigner allows (${MAX_WORKER_SECONDS})`);
  // And it is deliberately far shorter than what a learner gets: a playback URL
  // has to survive a long lesson watched slowly, a preview does not.
  assert.ok(MASTER_PREVIEW_SECONDS < MAX_PLAYBACK_SECONDS,
    'a master URL lived as long as a learner\'s playback URL');
});

// ---------------------------------------------------------------------------
// The row
// ---------------------------------------------------------------------------

test('the object coordinates are mapped into the shape the route signs', () => {
  const target = toMasterPreviewTarget(dbRow());
  assert.equal(target.assetId, 'asset-1');
  assert.equal(target.bucket, 'ayahspring-masters');
  assert.equal(target.objectKey, 'asset-1/master.mp4');
  assert.equal(target.mimeType, 'video/mp4');
  assert.equal(target.byteSize, 1_048_576);
  assert.equal(target.displayName, 'Lesson one');
  assert.equal(target.status, 'available');
});

test('a size that arrives as a string is still a number', () => {
  assert.equal(toMasterPreviewTarget(dbRow({ byte_size: '2048' })).byteSize, 2048);
  assert.equal(toMasterPreviewTarget(dbRow({ byte_size: null })).byteSize, 0);
  assert.equal(toMasterPreviewTarget(dbRow({ byte_size: 'not a number' })).byteSize, 0);
});

test('a file with no name and no type still has coordinates', () => {
  const target = toMasterPreviewTarget(dbRow({ display_name: null, mime_type: null }));
  assert.equal(target.displayName, null);
  // Unknown is octet-stream, which no browser plays: the player then says so
  // rather than showing a black rectangle.
  assert.equal(target.mimeType, 'application/octet-stream');
  assert.equal(playerKindFor(target.mimeType), null);
});

test('the mapped target carries seven fields and nothing else', () => {
  // master_preview_target() does not select the digest, the technical metadata or
  // the uploader. This holds the mapping to the same seven, because a spread of
  // the row would carry every column the function ever grows.
  const target = toMasterPreviewTarget(dbRow({
    checksum: 'abc123', technical_metadata: { probe: true }, uploaded_by: 'user-9',
  }));
  assert.deepEqual(Object.keys(target).sort(), [
    'assetId', 'bucket', 'byteSize', 'displayName', 'mimeType', 'objectKey', 'status',
  ]);
  assert.equal('checksum' in target, false);
  assert.equal('technicalMetadata' in target, false);
  assert.equal('uploadedBy' in target, false);
});

// ---------------------------------------------------------------------------
// What a browser can do with it
// ---------------------------------------------------------------------------

test('the player kind comes from the type, ignoring case and padding', () => {
  assert.equal(playerKindFor('video/mp4'), 'video');
  assert.equal(playerKindFor('  VIDEO/webm '), 'video');
  assert.equal(playerKindFor('audio/mpeg'), 'audio');
  assert.equal(playerKindFor('Audio/MP4'), 'audio');
});

test('a master that is not audio or video has no player', () => {
  // An uploaded PDF or an image is a master too: stored, attachable, and not
  // something a <video> element can open.
  assert.equal(playerKindFor('application/pdf'), null);
  assert.equal(playerKindFor('image/jpeg'), null);
  assert.equal(playerKindFor('text/plain'), null);
  assert.equal(playerKindFor(''), null);
  assert.equal(playerKindFor('application/octet-stream'), null);
});

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

test('a permission refusal is a 403 with a sentence, not a stack', () => {
  const mapped = describeMasterPreviewError({
    message: 'permission denied for function master_preview_target',
  });
  assert.equal(mapped.status, 403);
  assert.equal(mapped.message, 'That file is not yours to watch.');
});

test('a row-level refusal is read as the same thing', () => {
  assert.equal(describeMasterPreviewError({
    message: 'new row violates row-level security policy for table "media_assets"',
  }).status, 403);
});

test('being signed out is a 401', () => {
  assert.deepEqual(describeMasterPreviewError({ message: 'sign in to watch a file' }),
    { status: 401, message: 'Sign in to watch a file.' });
});

test('anything else is a 500 that does not echo the database', () => {
  const mapped = describeMasterPreviewError({
    message: 'could not open file "base/16384/12345" in master_bucket for asset 42',
  });
  assert.equal(mapped.status, 500);
  assert.equal(/master_bucket|16384/.test(mapped.message), false,
    'a read failure leaked internals to the browser');
  assert.equal(mapped.message, 'That file could not be opened. Try again in a moment.');
});

test('an error with nothing in it still gets a sentence', () => {
  assert.equal(describeMasterPreviewError({}).status, 500);
  assert.equal(describeMasterPreviewError({ message: null }).status, 500);
});

// ---------------------------------------------------------------------------
// Reading it
// ---------------------------------------------------------------------------

test('the coordinates are read through one rpc call, named and parameterised', async () => {
  const { client, calls } = stubRpc({ data: [dbRow()] });
  const result = await fetchMasterPreviewTarget(client, 'asset-1');
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ fn: 'master_preview_target', args: { p_asset_id: 'asset-1' } }]);
  if (result.ok) assert.equal(result.target?.objectKey, 'asset-1/master.mp4');
});

test('no rows is an answer, and it is the same answer for both refusals', async () => {
  // A file that is not yours and a file that does not exist are
  // indistinguishable on purpose: the difference tells a caller what to try next.
  const { client } = stubRpc({ data: [] });
  const result = await fetchMasterPreviewTarget(client, 'asset-1');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.target, null);

  const { client: nullClient } = stubRpc({ data: null });
  const other = await fetchMasterPreviewTarget(nullClient, 'asset-1');
  assert.equal(other.ok, true);
  if (other.ok) assert.equal(other.target, null);
});

test('a refusal comes back with its status and message', async () => {
  const { client } = stubRpc({ error: { message: 'permission denied for function master_preview_target' } });
  const result = await fetchMasterPreviewTarget(client, 'asset-1');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 403);
    assert.equal(result.message, 'That file is not yours to watch.');
  }
});

test('one asset is one row, and the first is the one used', async () => {
  const { client } = stubRpc({ data: [dbRow({ asset_id: 'first' }), dbRow({ asset_id: 'second' })] });
  const result = await fetchMasterPreviewTarget(client, 'first');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.target?.assetId, 'first');
});
