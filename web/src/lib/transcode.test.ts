import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUDIO_MIME,
  POSTER_MIME,
  VIDEO_MIME,
  describeFailure,
  digestMatches,
  encodeArgs,
  mapTranscodeError,
  planRenditions,
  probeArgs,
  profileMimeType,
  transcodeMaster,
  type EncodeOutput,
  type ExistingRendition,
  type MasterFacts,
  type ProfilePlan,
  type TranscodeDeps,
} from './transcode.ts';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

type Call = string;

/**
 * A deps double that records the order everything happened in. The order is the
 * point: a rendition confirmed before its bytes are uploaded is a row that
 * `may_play_rendition()` will hand to a learner as a URL that 404s.
 */
function fakeDeps(options: {
  existing?: ExistingRendition[];
  failEncode?: (plan: ProfilePlan) => Error | null;
  failUpload?: Error | null;
  failRegister?: Error | null;
  failConfirm?: Error | null;
  failList?: Error | null;
} = {}) {
  const calls: Call[] = [];
  const uploads: Array<{ bucket: string; key: string; contentType: string }> = [];
  const registers: Array<{ profile: string; facts: EncodeOutput }> = [];
  const confirmed: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];
  let n = 0;

  const deps: TranscodeDeps = {
    async listRenditions() {
      calls.push('list');
      if (options.failList) throw options.failList;
      return options.existing ?? [];
    },
    async register(profile, facts) {
      calls.push(`register:${profile}`);
      registers.push({ profile, facts });
      if (options.failRegister) throw options.failRegister;
      n += 1;
      return {
        renditionId: `r-${String(n)}`,
        bucket: 'ayahspring-renditions',
        objectKey: `asset/${profile}`,
      };
    },
    async confirm(renditionId) {
      calls.push(`confirm:${renditionId}`);
      confirmed.push(renditionId);
      if (options.failConfirm) throw options.failConfirm;
    },
    async fail(renditionId, reason) {
      calls.push(`fail:${renditionId}`);
      failed.push({ id: renditionId, reason });
    },
    async encode(plan) {
      calls.push(`encode:${plan.profile}`);
      const error = options.failEncode?.(plan);
      if (error) throw error;
      return {
        path: `/tmp/${plan.profile}.bin`,
        mime: plan.mimeType,
        byteSize: 1000 + (plan.height ?? 0),
        width: plan.height ? Math.round(plan.height * (16 / 9)) : null,
        height: plan.height,
        bitrateKbps: plan.videoBitrateKbps,
        durationSeconds: 60,
      };
    },
    async upload(bucket, key, contentType) {
      calls.push(`upload:${key}`);
      uploads.push({ bucket, key, contentType });
      if (options.failUpload) throw options.failUpload;
    },
  };

  return { deps, calls, uploads, registers, confirmed, failed };
}

function video(over: Partial<MasterFacts> = {}): MasterFacts {
  return {
    assetId: 'a1',
    status: 'available',
    declaredMimeType: 'video/mp4',
    hasVideo: true,
    videoHeight: 1080,
    hasAudio: true,
    durationSeconds: 600,
    ...over,
  };
}

function profiles(plans: readonly ProfilePlan[]): string[] {
  return plans.map((p) => p.profile);
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

await test('a 1080p master gets the whole ladder, a poster and an audio copy', () => {
  const plan = planRenditions(video());
  assert.deepEqual(profiles(plan), ['1080p', '720p', '480p', '360p', 'poster', 'audio']);
  const poster = plan.find((p) => p.profile === 'poster');
  assert.equal(poster?.height, 1080, 'the poster matches the largest rendition, not the master');
  assert.equal(poster?.mimeType, POSTER_MIME);
  assert.equal(plan.find((p) => p.profile === 'audio')?.mimeType, AUDIO_MIME);
  assert.equal(plan.find((p) => p.profile === '720p')?.mimeType, VIDEO_MIME);
});

await test('nothing is upscaled: a 480p master gets no 720p or 1080p', () => {
  const plan = planRenditions(video({ videoHeight: 480 }));
  assert.deepEqual(profiles(plan), ['480p', '360p', 'poster', 'audio']);
  assert.equal(plan.find((p) => p.profile === 'poster')?.height, 480);
});

await test('a master between rungs gets only the rungs it can fill', () => {
  // 600 lines: 720p would be an upscale, 480p would not.
  assert.deepEqual(profiles(planRenditions(video({ videoHeight: 600 }))), [
    '480p',
    '360p',
    'poster',
    'audio',
  ]);
});

await test('a silent master gets no audio rendition, and no ladder rung is dropped', () => {
  const plan = planRenditions(video({ hasAudio: false, videoHeight: 720 }));
  assert.deepEqual(profiles(plan), ['720p', '480p', '360p', 'poster']);
});

await test('an audio-only master gets an audio rendition and no picture at all', () => {
  const plan = planRenditions(video({ hasVideo: false, videoHeight: null, declaredMimeType: 'audio/mpeg' }));
  assert.deepEqual(profiles(plan), ['audio']);
});

await test('a master with neither stream gets nothing', () => {
  const plan = planRenditions(
    video({ hasVideo: false, videoHeight: null, hasAudio: false, declaredMimeType: 'application/pdf' }),
  );
  assert.deepEqual(plan, [], 'a document has no delivery copies');
});

await test('the declared mime type never decides the plan; the probe does', () => {
  // A file declared as video but probing audio-only must not get a ladder that
  // would fail four times.
  const plan = planRenditions(video({ declaredMimeType: 'video/mp4', hasVideo: false, videoHeight: null }));
  assert.deepEqual(profiles(plan), ['audio']);
});

await test('manifest is never planned', () => {
  // It is in the vocabulary and nothing produces one: an HLS manifest is
  // thousands of segment objects and this register holds one row per profile.
  for (const height of [2160, 1080, 360, null]) {
    const plan = planRenditions(video({ videoHeight: height, hasVideo: height !== null }));
    assert.equal(plan.some((p) => p.profile === 'manifest'), false, `height ${String(height)}`);
  }
});

await test('profileMimeType covers the whole vocabulary', () => {
  assert.equal(profileMimeType('1080p'), VIDEO_MIME);
  assert.equal(profileMimeType('360p'), VIDEO_MIME);
  assert.equal(profileMimeType('audio'), AUDIO_MIME);
  assert.equal(profileMimeType('poster'), POSTER_MIME);
  assert.equal(profileMimeType('manifest'), 'application/x-mpegURL');
});

// ---------------------------------------------------------------------------
// ffmpeg arguments
// ---------------------------------------------------------------------------

await test('a video encode is faststart, capped, and scaled to an even width', () => {
  const plan = planRenditions(video()).find((p) => p.profile === '720p')!;
  const args = encodeArgs('/in/master', '/out/720p.mp4', plan);

  assert.deepEqual(args.slice(0, 6), ['-hide_banner', '-v', 'error', '-y', '-i', '/in/master']);
  assert.equal(args.at(-1), '/out/720p.mp4');

  // -2 keeps the aspect ratio and forces an even width, which H.264 requires.
  const vf = args.indexOf('-vf');
  assert.ok(vf >= 0, 'a video encode scales');
  assert.equal(args[vf + 1], 'scale=-2:720');

  const maxrate = args.indexOf('-maxrate');
  assert.equal(args[maxrate + 1], '2800k');
  const bufsize = args.indexOf('-bufsize');
  assert.equal(args[bufsize + 1], '5600k', 'the buffer is twice the ceiling');

  assert.ok(args.includes('+faststart'), 'playback must not wait for the whole file');
  assert.ok(args.includes('-movflags'));
  assert.ok(args.includes('yuv420p'), 'a pixel format every browser accepts');

  // `?` so a silent master still encodes instead of failing on a missing stream.
  const audioMap = args.indexOf('0:a:0?');
  assert.ok(audioMap >= 0, 'audio is mapped optionally');
  assert.equal(args[args.indexOf('-map') + 1], '0:v:0');
});

await test('an audio encode drops the picture entirely', () => {
  const plan = planRenditions(video()).find((p) => p.profile === 'audio')!;
  const args = encodeArgs('/in/master', '/out/audio.m4a', plan);
  assert.ok(args.includes('-vn'), 'no video stream');
  assert.equal(args.indexOf('-vf'), -1, 'nothing is scaled');
  assert.equal(args[args.indexOf('-b:a') + 1], '128k');
  assert.equal(args[args.indexOf('-f') + 1], 'mp4');
  assert.equal(args.at(-1), '/out/audio.m4a');
});

await test('a poster takes exactly one frame', () => {
  const plan = planRenditions(video({ videoHeight: 480 })).find((p) => p.profile === 'poster')!;
  const args = encodeArgs('/in/master', '/out/poster.jpg', plan);
  assert.equal(args[args.indexOf('-frames:v') + 1], '1');
  assert.equal(args[args.indexOf('-vf') + 1], 'scale=-2:480');
  assert.equal(args[args.indexOf('-f') + 1], 'image2');
  assert.equal(args.indexOf('-c:v'), -1, 'a still frame is not re-encoded as video');
});

await test('the probe asks for JSON and no chatter', () => {
  assert.deepEqual(probeArgs('/in/master'), [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    '/in/master',
  ]);
});

// ---------------------------------------------------------------------------
// Failure reporting
// ---------------------------------------------------------------------------

await test('a digest matches only when both sides are really digests', () => {
  const digest = 'a'.repeat(64);
  assert.equal(digestMatches(digest, digest), true);
  assert.equal(digestMatches(digest.toUpperCase(), digest), true, 'the column is lowercase hex');
  assert.equal(digestMatches(`  ${digest} `, digest), true);
  assert.equal(digestMatches(digest, 'b'.repeat(64)), false);
  assert.equal(digestMatches(digest, 'a'.repeat(63)), false);
  // The case that matters: two blanks are equal strings, and a row with no
  // checksum must not pass as a match for a file with no checksum.
  assert.equal(digestMatches('', ''), false);
  assert.equal(digestMatches(digest, ''), false);
});

await test('a failure reason is never blank, because the database refuses one', () => {
  assert.equal(describeFailure(new Error('ffmpeg died')), 'ffmpeg died');
  assert.equal(describeFailure(new Error('')), 'the encode stopped with no message (Error)');
  assert.equal(describeFailure('  '), 'the encode stopped for a reason that was not recorded');
  assert.equal(describeFailure(null), 'the encode stopped for a reason that was not recorded');
  assert.equal(describeFailure(new Error('x'.repeat(900))).length, 500, 'capped for a text column');
});

await test('a refusal from the database becomes a sentence an operator can act on', () => {
  const duplicate = Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
  });
  assert.match(mapTranscodeError(duplicate), /another worker registered that profile first/);
  assert.match(
    mapTranscodeError(new Error('only platform staff may register a rendition')),
    /grant it a role at \/admin\/roles/,
  );
  assert.match(
    mapTranscodeError(new Error('a rendition can only be encoded from an available master, and this one is quarantined')),
    /must not be encoded/,
  );
  assert.equal(mapTranscodeError(new Error('   ')), 'the database refused the operation without saying why');
  assert.equal(mapTranscodeError(new Error('something new')), 'something new');
});

// ---------------------------------------------------------------------------
// The state machine
// ---------------------------------------------------------------------------

await test('a master that is not available is never encoded', async () => {
  for (const status of ['pending', 'quarantined', 'deleted']) {
    const fake = fakeDeps();
    const result = await transcodeMaster(video({ status }), fake.deps);
    assert.equal(result.outcomes.length, 1);
    assert.equal(result.outcomes[0]?.state, 'blocked');
    assert.match(result.outcomes[0]?.detail ?? '', new RegExp(status));
    assert.deepEqual(fake.calls, [], `nothing at all is called for a ${status} master`);
  }
});

await test('a master with no streams is skipped rather than failed', async () => {
  const fake = fakeDeps();
  const result = await transcodeMaster(
    video({ hasVideo: false, videoHeight: null, hasAudio: false }),
    fake.deps,
  );
  assert.equal(result.outcomes[0]?.state, 'skipped');
  assert.match(result.outcomes[0]?.detail ?? '', /no delivery copies/);
  // Nothing is even read: a file that cannot have renditions cannot have rows.
  assert.deepEqual(fake.calls, []);
});

await test('the order is encode, register, upload, confirm — for every profile', async () => {
  const fake = fakeDeps();
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  assert.deepEqual(profiles(planRenditions(video({ videoHeight: 360 }))), ['360p', 'poster', 'audio']);
  assert.deepEqual(fake.calls, [
    'list',
    'encode:360p',
    'register:360p',
    'upload:asset/360p',
    'confirm:r-1',
    'encode:poster',
    'register:poster',
    'upload:asset/poster',
    'confirm:r-2',
    'encode:audio',
    'register:audio',
    'upload:asset/audio',
    'confirm:r-3',
  ]);
  assert.deepEqual(
    result.outcomes.map((o) => [o.profile, o.state]),
    [
      ['360p', 'confirmed'],
      ['poster', 'confirmed'],
      ['audio', 'confirmed'],
    ],
  );
  assert.equal(fake.failed.length, 0);
});

await test('register receives the measured facts, including the type that was encoded', async () => {
  const fake = fakeDeps();
  await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  const audio = fake.registers.find((r) => r.profile === 'audio');
  assert.equal(audio?.facts.mime, AUDIO_MIME);
  assert.equal(audio?.facts.height, null);
  assert.equal(audio?.facts.width, null, 'both dimensions or neither, as the table requires');

  const videoRung = fake.registers.find((r) => r.profile === '360p');
  assert.equal(videoRung?.facts.mime, VIDEO_MIME);
  assert.equal(videoRung?.facts.height, 360);
  assert.equal(videoRung?.facts.width, 640);
});

await test('nothing is confirmed before its bytes are uploaded', async () => {
  const fake = fakeDeps({ failUpload: new Error('R2 refused the upload of asset/360p (HTTP 403)') });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  assert.equal(fake.confirmed.length, 0, 'a rendition pointing at an object that is not there is worse than none');
  assert.ok(fake.calls.includes('upload:asset/360p'));
  const first = result.outcomes[0];
  assert.equal(first?.state, 'failed');
  assert.match(first?.detail ?? '', /could not be uploaded/);
});

await test('an upload failure leaves the row pending, because failed is terminal', async () => {
  const fake = fakeDeps({ failUpload: new Error('network went away') });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  // A transient error must not permanently retire a profile: nothing in the
  // schema moves a failed row back to pending.
  assert.equal(fake.failed.length, 0, 'the row is left pending for the next run');
  assert.match(result.outcomes[0]?.detail ?? '', /stays pending for the next run/);
});

await test('a confirm refusal also leaves the row pending', async () => {
  const fake = fakeDeps({ failConfirm: new Error('only platform staff may confirm a rendition') });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  assert.equal(fake.failed.length, 0);
  assert.match(result.outcomes[0]?.detail ?? '', /could not be confirmed/);
  assert.match(result.outcomes[0]?.detail ?? '', /grant it a role at \/admin\/roles/);
  assert.equal(result.outcomes[0]?.state, 'failed');
});

await test('an encode failure with no row open leaves nothing behind', async () => {
  const fake = fakeDeps({ failEncode: () => new Error('Invalid data found when processing input') });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  assert.equal(fake.registers.length, 0, 'no row is opened for bytes that do not exist');
  assert.equal(fake.failed.length, 0);
  assert.equal(fake.confirmed.length, 0);
  assert.equal(result.outcomes.every((o) => o.state === 'failed'), true);
  assert.match(result.outcomes[0]?.detail ?? '', /Invalid data found/);
});

await test('an encode failure on a pending row marks it failed', async () => {
  const fake = fakeDeps({
    existing: [row({ profile: '360p', status: 'pending', id: 'p-1' })],
    failEncode: (plan) => (plan.profile === '360p' ? new Error('codec not supported') : null),
  });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  // The file will not encode, so re-running will not either. This is the only
  // case where the worker writes the terminal state.
  assert.deepEqual(fake.failed, [{ id: 'p-1', reason: 'the encode itself failed: codec not supported' }]);
  assert.equal(result.outcomes[0]?.state, 'failed');
  assert.equal(result.outcomes[1]?.state, 'confirmed', 'the rest of the ladder still runs');
});

await test('a pending row is recovered: reused key, no second register', async () => {
  const existing = row({ profile: '360p', status: 'pending', id: 'p-9', objectKey: 'a1/video-mp4/360p' });
  const fake = fakeDeps({ existing: [existing] });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  assert.equal(fake.registers.length, 2, 'poster and audio only — 360p already has a row');
  assert.equal(fake.registers.some((r) => r.profile === '360p'), false);
  assert.deepEqual(fake.uploads[0], {
    bucket: 'ayahspring-renditions',
    key: 'a1/video-mp4/360p',
    contentType: VIDEO_MIME,
  });
  assert.ok(fake.confirmed.includes('p-9'), 'the crashed run\'s own row is confirmed');
  assert.equal(result.outcomes[0]?.state, 'recovered');
  assert.match(result.outcomes[0]?.detail ?? '', /left this pending/);
});

await test('an available rendition is left alone and never re-encoded', async () => {
  const fake = fakeDeps({ existing: [row({ profile: '360p', status: 'available', id: 'a-1' })] });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  assert.equal(fake.calls.includes('encode:360p'), false, 'no CPU spent on a copy that exists');
  assert.equal(result.outcomes[0]?.state, 'skipped');
  assert.equal(result.outcomes[0]?.detail, 'already available');
  assert.equal(result.outcomes[1]?.state, 'confirmed', 'the other profiles still get made');
});

await test('a failed rendition is reported with its reason and left alone', async () => {
  const fake = fakeDeps({
    existing: [row({ profile: '360p', status: 'failed', id: 'f-1', failureReason: 'ffmpeg exited 1' })],
  });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  assert.equal(fake.calls.includes('encode:360p'), false);
  assert.equal(result.outcomes[0]?.state, 'blocked');
  assert.match(result.outcomes[0]?.detail ?? '', /nothing can retry it: ffmpeg exited 1/);
});

await test('a failed rendition with no reason still says so', async () => {
  const fake = fakeDeps({ existing: [row({ profile: '360p', status: 'failed', failureReason: null })] });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);
  assert.match(result.outcomes[0]?.detail ?? '', /no reason recorded/);
});

await test('another worker registering first is a refusal, not a crash', async () => {
  const duplicate = Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
  });
  const fake = fakeDeps({ failRegister: duplicate });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  assert.equal(result.outcomes.every((o) => o.state === 'failed'), true);
  assert.match(result.outcomes[0]?.detail ?? '', /another worker registered that profile first/);
  assert.equal(fake.confirmed.length, 0);
  assert.equal(fake.uploads.length, 0, 'nothing is uploaded for a row this run does not own');
});

await test('a run continues past a profile that fails', async () => {
  const fake = fakeDeps({ failEncode: (plan) => (plan.profile === 'poster' ? new Error('no frame') : null) });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  assert.deepEqual(
    result.outcomes.map((o) => [o.profile, o.state]),
    [
      ['360p', 'confirmed'],
      ['poster', 'failed'],
      ['audio', 'confirmed'],
    ],
  );
});

await test('a failure to read the existing rows stops the whole master', async () => {
  const fake = fakeDeps({ failList: new Error('only platform staff may register a rendition') });
  const result = await transcodeMaster(video({ videoHeight: 360 }), fake.deps);

  assert.equal(result.outcomes.length, 1);
  assert.equal(result.outcomes[0]?.profile, '*');
  assert.equal(result.outcomes[0]?.state, 'failed');
  assert.match(result.outcomes[0]?.detail ?? '', /grant it a role/);
  assert.deepEqual(fake.calls, ['list']);
});

await test('the upload is told the content type the signature was made for', async () => {
  const fake = fakeDeps();
  await transcodeMaster(video({ videoHeight: 360 }), fake.deps);
  assert.deepEqual(
    fake.uploads.map((u) => u.contentType),
    [VIDEO_MIME, POSTER_MIME, AUDIO_MIME],
  );
});

// ---------------------------------------------------------------------------

function row(over: Partial<ExistingRendition> = {}): ExistingRendition {
  return {
    id: 'r',
    profile: '360p',
    status: 'available',
    bucket: 'ayahspring-renditions',
    objectKey: 'a1/video-mp4/360p',
    mimeType: VIDEO_MIME,
    failureReason: null,
    ...over,
  };
}
