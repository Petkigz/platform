import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_STREAM_HEIGHT,
  PROFILE_LABEL,
  downloadFilename,
  extensionFor,
  fetchPlayableRenditions,
  formatByteSize,
  groupByAsset,
  isAudioRendition,
  isPlayable,
  isServable,
  isVideoRendition,
  pickDownloadRendition,
  pickStreamRendition,
  posterFor,
  renditionChoices,
  toPlayable,
  type PlayableRendition,
} from './playback.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const assetId = '4f30fd1d-6f2c-4c1e-9a5b-0d2f6c8a1b23';

function rendition(over: Partial<PlayableRendition> = {}): PlayableRendition {
  return {
    id: `r-${over.profile ?? 'x'}`,
    assetId,
    profile: '480p',
    mimeType: 'video/mp4',
    bucket: 'ayahspring-renditions',
    objectKey: `${assetId}/video-mp4/480p`,
    byteSize: 40_000_000,
    width: 854,
    height: 480,
    durationSeconds: 600,
    ...over,
  };
}

/** A full ladder, as the worker would leave it for a 1080p master. */
function ladder(): PlayableRendition[] {
  return [
    rendition({ profile: '1080p', height: 1080, width: 1920, byteSize: 300_000_000 }),
    rendition({ profile: '720p', height: 720, width: 1280, byteSize: 160_000_000 }),
    rendition({ profile: '480p', height: 480, width: 854, byteSize: 80_000_000 }),
    rendition({ profile: '360p', height: 360, width: 640, byteSize: 45_000_000 }),
    rendition({
      profile: 'audio',
      mimeType: 'audio/mp4',
      height: null,
      width: null,
      byteSize: 9_000_000,
    }),
    rendition({
      profile: 'poster',
      mimeType: 'image/jpeg',
      height: 1080,
      width: 1920,
      byteSize: 120_000,
    }),
  ];
}

// ---------------------------------------------------------------------------
// What is in front of the learner
// ---------------------------------------------------------------------------

await test('the quality list is ordered by picture size and holds no poster', () => {
  const choices = renditionChoices(ladder());
  assert.deepEqual(
    choices.map((c) => c.profile),
    ['1080p', '720p', '480p', '360p', 'audio'],
  );
});

await test('a poster is served but is not something to press play on', () => {
  const poster = posterFor(ladder());
  assert.ok(poster, 'the poster rendition is found');
  assert.equal(isServable(poster!), true, 'the player needs a poster URL');
  assert.equal(isPlayable(poster!), false, 'and must not offer it as a quality');
  assert.equal(renditionChoices(ladder()).some((c) => c.profile === 'poster'), false);
});

await test('a manifest is neither servable nor playable', () => {
  const manifest = rendition({
    profile: 'manifest',
    mimeType: 'application/x-mpegURL',
    height: null,
    width: null,
  });
  assert.equal(isServable(manifest), false);
  assert.equal(isPlayable(manifest), false);
  assert.equal(pickStreamRendition([manifest]), null);
  assert.equal(pickDownloadRendition([manifest]), null);
});

await test('video and audio are told apart by their type, not by their name', () => {
  assert.equal(isVideoRendition(rendition()), true);
  assert.equal(isAudioRendition(rendition({ profile: 'audio', mimeType: 'audio/mp4', height: null })), true);
  // A row that claims to be video but has no picture is not a video rendition,
  // which is what stops a player being handed something it cannot draw.
  assert.equal(isVideoRendition(rendition({ height: null, width: null })), false);
});

// ---------------------------------------------------------------------------
// Which rung to start on
// ---------------------------------------------------------------------------

await test('streaming starts at the default rung, not at the best one', () => {
  const chosen = pickStreamRendition(ladder());
  assert.equal(chosen?.profile, '480p');
  assert.ok(
    (chosen?.height ?? 0) <= DEFAULT_STREAM_HEIGHT,
    'a streamed lesson starts on a rung a metered connection can afford',
  );
});

await test('the learner\'s own choice wins when it exists', () => {
  assert.equal(pickStreamRendition(ladder(), '1080p')?.profile, '1080p');
  assert.equal(pickStreamRendition(ladder(), ' 720P ')?.profile, '720p', 'trimmed and case-insensitive');
  assert.equal(pickStreamRendition(ladder(), 'audio')?.profile, 'audio');
});

await test('a choice that does not exist falls back to the default rather than failing', () => {
  assert.equal(pickStreamRendition(ladder(), '4k')?.profile, '480p');
  assert.equal(pickStreamRendition(ladder(), 'poster')?.profile, '480p', 'a poster is not a quality');
});

await test('when only tall rungs exist, streaming picks the smallest of them', () => {
  // The lower rungs failed to encode. Forcing a big file on a metered connection
  // to preserve a preference is the wrong trade.
  const tall = [
    rendition({ profile: '1080p', height: 1080, byteSize: 300_000_000 }),
    rendition({ profile: '720p', height: 720, byteSize: 160_000_000 }),
  ];
  assert.equal(pickStreamRendition(tall)?.profile, '720p');
});

await test('an audio-only lesson plays as audio', () => {
  const only = [rendition({ profile: 'audio', mimeType: 'audio/mp4', height: null, width: null })];
  assert.equal(pickStreamRendition(only)?.profile, 'audio');
});

await test('nothing to play is null, not an error', () => {
  assert.equal(pickStreamRendition([]), null);
  assert.equal(pickDownloadRendition([]), null);
});

await test('saving defaults to the best rung, the opposite of streaming', () => {
  // The bytes are paid for once and then watched offline, so quality wins.
  assert.equal(pickDownloadRendition(ladder())?.profile, '1080p');
  assert.equal(pickDownloadRendition(ladder(), '360p')?.profile, '360p', 'and is still overridable');
});

await test('saving an audio-only lesson saves the audio', () => {
  const only = [rendition({ profile: 'audio', mimeType: 'audio/mp4', height: null, width: null })];
  assert.equal(pickDownloadRendition(only)?.profile, 'audio');
});

await test('every playable profile has a label a learner can read', () => {
  for (const choice of renditionChoices(ladder())) {
    assert.ok(PROFILE_LABEL[choice.profile]?.length > 0, `${choice.profile} has no label`);
  }
  assert.match(PROFILE_LABEL.audio, /audio/i);
});

await test('sizes are shown in megabytes with one decimal until they are large', () => {
  assert.equal(formatByteSize(9_000_000), '8.6 MB');
  assert.equal(formatByteSize(300_000_000), '286 MB');
  assert.equal(formatByteSize(0), '0 MB');
});

// ---------------------------------------------------------------------------
// The filename a saved lesson arrives under
// ---------------------------------------------------------------------------

await test('a saved lesson keeps its own name, in its own script', () => {
  assert.equal(
    downloadFilename('درس التجويد الأول', '480p', 'video/mp4'),
    'درس التجويد الأول-480p.mp4',
  );
});

await test('a filename cannot carry a path, a quote or a control character', () => {
  const hostile = downloadFilename('../../etc/passwd" ; rm -rf /', '720p', 'video/mp4');
  assert.equal(hostile.includes('/'), false, 'no separator survives');
  assert.equal(hostile.includes('\\'), false);
  assert.equal(hostile.includes('"'), false, 'nothing can close the quoted header value');
  assert.equal(hostile.includes(';'), false);
  assert.equal(hostile.startsWith('.'), false, 'no hidden file, no relative path');
  assert.match(hostile, /-720p\.mp4$/);
});

await test('a lesson with no usable name still gets a sensible file', () => {
  assert.equal(downloadFilename('', '360p', 'video/mp4'), 'lesson-360p.mp4');
  assert.equal(downloadFilename('   ', 'audio', 'audio/mp4'), 'lesson-audio.m4a');
  assert.equal(downloadFilename('...', 'audio', 'audio/mp4'), 'lesson-audio.m4a');
});

await test('a very long name is cut, not rejected', () => {
  const name = 'x'.repeat(400);
  const filename = downloadFilename(name, '480p', 'video/mp4');
  assert.ok(filename.length < 100, `got ${String(filename.length)} characters`);
  assert.ok(filename.endsWith('-480p.mp4'));
});

await test('the extension follows the type the encode actually produced', () => {
  assert.equal(extensionFor('video/mp4'), 'mp4');
  assert.equal(extensionFor('VIDEO/MP4'), 'mp4');
  assert.equal(extensionFor('audio/mp4'), 'm4a');
  assert.equal(extensionFor('audio/mpeg'), 'mp3');
  assert.equal(extensionFor('image/jpeg'), 'jpg');
  assert.equal(extensionFor('application/x-mpegURL'), 'm3u8');
  assert.equal(extensionFor('something/new'), 'bin');
});

// ---------------------------------------------------------------------------
// Reading rows
// ---------------------------------------------------------------------------

function stubRenditions(rows: unknown[], options: { error?: string } = {}) {
  const calls: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: (columns: string) => {
      calls.push(`select:${columns}`);
      return chain;
    },
    eq: (column: string, value: unknown) => {
      calls.push(`eq:${column}=${String(value)}`);
      return chain;
    },
    in: (column: string, values: unknown[]) => {
      calls.push(`in:${column}=${values.join(',')}`);
      return chain;
    },
    order: (column: string) => {
      calls.push(`order:${column}`);
      return chain;
    },
    then: (
      resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => void,
    ) =>
      resolve(
        options.error
          ? { data: null, error: { message: options.error } }
          : { data: rows, error: null },
      ),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from: () => chain } as any, calls };
}

await test('a bigint column arrives as a number and every field is mapped', () => {
  const playable = toPlayable({
    id: 'r-1',
    asset_id: assetId,
    profile: '720p',
    mime_type: 'video/mp4',
    bucket: 'ayahspring-renditions',
    object_key: `${assetId}/video-mp4/720p`,
    byte_size: '160000000',
    width: 1280,
    height: 720,
    duration_seconds: 600,
  });
  assert.equal(playable.byteSize, 160_000_000, 'Postgrest can return a bigint as a string');
  assert.equal(playable.assetId, assetId);
  assert.equal(playable.objectKey, `${assetId}/video-mp4/720p`);
  assert.equal(playable.profile, '720p');
});

await test('the read asks only for available renditions of the assets it was given', async () => {
  const stub = stubRenditions([]);
  await fetchPlayableRenditions(stub.client, [assetId, assetId, ' ', 'other-asset']);

  assert.ok(stub.calls.some((c) => c === 'eq:status=available'), 'a pending row must never be served');
  const inCall = stub.calls.find((c) => c.startsWith('in:asset_id='));
  assert.equal(inCall, `in:asset_id=${assetId},other-asset`, 'ids are deduped and blanks dropped');
});

await test('no assets means no query at all', async () => {
  const stub = stubRenditions([{ id: 'should-not-be-returned' }]);
  const rows = await fetchPlayableRenditions(stub.client, []);
  assert.deepEqual(rows, []);
  assert.deepEqual(stub.calls, [], 'nothing is asked of the database');
});

await test('a failed read is thrown, not turned into an empty list', async () => {
  const stub = stubRenditions([], { error: 'permission denied for table media_renditions' });
  await assert.rejects(
    () => fetchPlayableRenditions(stub.client, [assetId]),
    /permission denied/,
  );
  // An empty list means "you may not watch this". A failure means something
  // else, and the two must not look the same to the caller.
});

await test('rows are grouped by the master they came from', () => {
  const grouped = groupByAsset([
    rendition({ id: 'a', assetId: 'asset-1', profile: '480p' }),
    rendition({ id: 'b', assetId: 'asset-1', profile: 'audio', mimeType: 'audio/mp4', height: null }),
    rendition({ id: 'c', assetId: 'asset-2', profile: '720p' }),
  ]);
  assert.equal(grouped.get('asset-1')?.length, 2);
  assert.equal(grouped.get('asset-2')?.length, 1);
  assert.equal(grouped.get('asset-3'), undefined);
});
