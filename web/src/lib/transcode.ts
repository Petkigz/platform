/**
 * Transcoding: what to encode, how, and in what order.
 *
 * This file holds the decisions. It touches no disk, no network and no database,
 * which is why it can be tested: `ffmpeg` is not installed in CI, there are no
 * Cloudflare R2 credentials, and there is no staff account for a worker to sign
 * in as. The program that does the I/O is `web/src/worker/transcode-worker.ts`,
 * and it is deliberately thin — every branch that decides something lives here.
 *
 * THE ORDER IS FORCED BY THE SCHEMA
 * ---------------------------------
 * Encode, measure, register, upload, confirm. Not the order you would pick.
 *
 * `register_media_rendition()` takes the byte size, the dimensions and the
 * bitrate, and there is no way to correct a row afterwards: `media_renditions`
 * has no update policy, and `confirm_media_rendition()` only moves `pending` to
 * `available`. So a row can be opened only once the encode has happened and its
 * facts are known. The useful consequence is that a crash before `register`
 * leaves nothing behind at all — no row, no object — and a crash after it leaves
 * a `pending` row that the next run can finish, because the object key is
 * derived from the asset and the profile and so is the same key both times.
 *
 * `pending` is therefore a claim, of a sort. Two workers may still encode the
 * same master; the second one's `register` meets the unique index on
 * `(asset_id, profile)` and is refused, which wastes CPU and corrupts nothing.
 * If a second worker is ever needed, the fix is a claimed-by column, not a
 * looser register.
 *
 * WHAT IS NOT ENCODED, AND WHY
 * ----------------------------
 * `manifest` is in the profile vocabulary and nothing here produces one. An HLS
 * manifest is thousands of segment objects, and this register holds one row per
 * profile, so a `manifest` row would claim a delivery copy that does not exist.
 * Packaging is its own step and is not built.
 *
 * Nothing upscales. A 480p master gets 480p and 360p and no more: a 1080p
 * rendition of it would cost storage, cost bandwidth, and tell a learner the
 * picture is better than it is.
 *
 * The probe decides, not the declaration. `media_assets.mime_type` is what the
 * uploader said; `planRenditions` reads what `ffprobe` found. A master declared
 * `video/mp4` that contains only audio gets an audio rendition and no ladder,
 * rather than four encodes that fail.
 */

export type RenditionProfile =
  | '1080p'
  | '720p'
  | '480p'
  | '360p'
  | 'audio'
  | 'poster'
  | 'manifest';

/** The closed vocabulary, mirrored from the check constraint on the table. */
export const RENDITION_PROFILES: readonly RenditionProfile[] = [
  '1080p',
  '720p',
  '480p',
  '360p',
  'audio',
  'poster',
  'manifest',
];

/** What `ffprobe` reported about the master. */
export type ProbedMaster = {
  hasVideo: boolean;
  /** Null when there is no video stream, which is not the same as zero. */
  videoHeight: number | null;
  hasAudio: boolean;
  durationSeconds: number | null;
};

export type MasterFacts = ProbedMaster & {
  assetId: string;
  /** From the row. Anything but `available` stops the run before any encode. */
  status: string;
  /** What the uploader declared. Recorded, never trusted for planning. */
  declaredMimeType: string;
};

export type ProfilePlan = {
  profile: RenditionProfile;
  /** The type the encode produces, which is what gets registered. */
  mimeType: string;
  /** Target picture height, null for audio. */
  height: number | null;
  /** Video bitrate ceiling in kbps, null for audio and posters. */
  videoBitrateKbps: number | null;
  audioBitrateKbps: number | null;
};

/**
 * The delivery ladder. Numbers are ceilings, not targets: `-maxrate` with a
 * `-bufsize` of twice the rate is what keeps a profile honest about the
 * bandwidth it needs, while `-crf 23` still lets a simple talking-head lesson
 * come in under the ceiling instead of being padded up to it.
 *
 * `audio` is planned for video masters too. Extracting the sound is cheap, and
 * a learner on a metered mobile connection — the common case in the markets this
 * platform is for — can listen to a lesson for a fraction of the bytes.
 */
const LADDER: ReadonlyArray<{ profile: RenditionProfile; height: number; videoBitrateKbps: number }> = [
  { profile: '1080p', height: 1080, videoBitrateKbps: 4500 },
  { profile: '720p', height: 720, videoBitrateKbps: 2800 },
  { profile: '480p', height: 480, videoBitrateKbps: 1400 },
  { profile: '360p', height: 360, videoBitrateKbps: 800 },
];

/** Audio is 128 kbps AAC everywhere; speech does not need more. */
const AUDIO_BITRATE_KBPS = 128;

export const VIDEO_MIME = 'video/mp4';
/** AAC in an MP4 container, so an audio rendition is playable without a codec surprise. */
export const AUDIO_MIME = 'audio/mp4';
export const POSTER_MIME = 'image/jpeg';

export function profileMimeType(profile: RenditionProfile): string {
  switch (profile) {
    case 'audio':
      return AUDIO_MIME;
    case 'poster':
      return POSTER_MIME;
    case 'manifest':
      return 'application/x-mpegURL';
    default:
      return VIDEO_MIME;
  }
}

/**
 * What this master should be encoded into.
 *
 * Returns an empty plan for a master with neither a video stream nor an audio
 * one — a document or an image, which has no delivery copies. Callers should
 * say so rather than treat it as a failure.
 */
export function planRenditions(master: MasterFacts): ProfilePlan[] {
  const plan: ProfilePlan[] = [];

  if (master.hasVideo && master.videoHeight !== null && master.videoHeight > 0) {
    for (const rung of LADDER) {
      // Never upscale: a rung taller than the master is a lie with a price tag.
      if (rung.height > master.videoHeight) continue;
      plan.push({
        profile: rung.profile,
        mimeType: VIDEO_MIME,
        height: rung.height,
        videoBitrateKbps: rung.videoBitrateKbps,
        audioBitrateKbps: AUDIO_BITRATE_KBPS,
      });
    }

    // The poster is a frame of the largest rendition we are making, so the
    // thumbnail is not sharper than the video it stands for.
    const tallest = plan.reduce((max, p) => Math.max(max, p.height ?? 0), 0);
    if (tallest > 0) {
      plan.push({
        profile: 'poster',
        mimeType: POSTER_MIME,
        height: tallest,
        videoBitrateKbps: null,
        audioBitrateKbps: null,
      });
    }
  }

  if (master.hasAudio) {
    plan.push({
      profile: 'audio',
      mimeType: AUDIO_MIME,
      height: null,
      videoBitrateKbps: null,
      audioBitrateKbps: AUDIO_BITRATE_KBPS,
    });
  }

  return plan;
}

// ---------------------------------------------------------------------------
// ffmpeg
// ---------------------------------------------------------------------------

/**
 * The probe that produces `ProbedMaster`. `-print_format json` so the answers
 * can be read rather than scraped, `-v error` so a warning is not mistaken for
 * a verdict.
 */
export function probeArgs(input: string): string[] {
  return [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    input,
  ];
}

/**
 * The encode for one profile.
 *
 * `scale=-2:HEIGHT` keeps the aspect ratio and forces the width to an even
 * number, which H.264 requires and which a naive `-vf scale=W:H` would get
 * wrong for any master that is not already even. `-movflags +faststart` moves
 * the index to the front of the file so playback begins before the whole thing
 * has downloaded — the difference between a lesson that starts and one that
 * appears to hang on a slow connection.
 */
export function encodeArgs(input: string, output: string, plan: ProfilePlan): string[] {
  const args = ['-hide_banner', '-v', 'error', '-y', '-i', input];

  if (plan.profile === 'poster') {
    return [
      ...args,
      '-map',
      '0:v:0',
      '-frames:v',
      '1',
      ...(plan.height ? ['-vf', `scale=-2:${plan.height}`] : []),
      '-q:v',
      '3',
      '-f',
      'image2',
      output,
    ];
  }

  if (plan.profile === 'audio') {
    return [
      ...args,
      '-map',
      '0:a:0',
      '-vn',
      '-c:a',
      'aac',
      '-b:a',
      `${plan.audioBitrateKbps ?? AUDIO_BITRATE_KBPS}k`,
      '-f',
      'mp4',
      output,
    ];
  }

  const videoBitrate = plan.videoBitrateKbps ?? LADDER[0]!.videoBitrateKbps;
  return [
    ...args,
    '-map',
    '0:v:0',
    // `?` so a silent master still encodes instead of failing on a missing stream.
    '-map',
    '0:a:0?',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-maxrate',
    `${videoBitrate}k`,
    '-bufsize',
    `${videoBitrate * 2}k`,
    ...(plan.height ? ['-vf', `scale=-2:${plan.height}`] : []),
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    `${plan.audioBitrateKbps ?? AUDIO_BITRATE_KBPS}k`,
    '-movflags',
    '+faststart',
    '-f',
    'mp4',
    output,
  ];
}

// ---------------------------------------------------------------------------
// The state machine
// ---------------------------------------------------------------------------

export type ExistingRendition = {
  id: string;
  profile: string;
  status: string;
  bucket: string;
  /** Derived by `register_media_rendition()`; reused verbatim on a retry. */
  objectKey: string;
  mimeType: string;
  failureReason: string | null;
};

export type EncodeOutput = {
  path: string;
  /** The type the encode produced, which is what gets registered. */
  mime: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  bitrateKbps: number | null;
  durationSeconds: number | null;
};

export type RegisterTarget = {
  renditionId: string;
  bucket: string;
  objectKey: string;
};

export type TranscodeDeps = {
  /** Every rendition row already recorded for this master. */
  listRenditions(): Promise<ExistingRendition[]>;
  /**
   * Opens a `pending` row from the facts in `encoded`, including its `mime`.
   * Refused if one already exists for the profile.
   */
  register(profile: RenditionProfile, facts: EncodeOutput): Promise<RegisterTarget>;
  /** The only path from `pending` to `available`. */
  confirm(renditionId: string): Promise<void>;
  /** Records why an encode failed. Needs a reason; a blank one is refused. */
  fail(renditionId: string, reason: string): Promise<void>;
  encode(plan: ProfilePlan): Promise<EncodeOutput>;
  /** Uploads the encoded file to the key the database derived. */
  upload(bucket: string, key: string, contentType: string, path: string): Promise<void>;
};

export type OutcomeState =
  /** Registered, uploaded and confirmed in this run. */
  | 'confirmed'
  /** A `pending` row left by a crashed run, finished in this one. */
  | 'recovered'
  /** Nothing to do: already available, or this kind of file has no renditions. */
  | 'skipped'
  /** Stopped without encoding: the master is not available, or a past failure is terminal. */
  | 'blocked'
  /** Something went wrong in this run; the row, if there is one, says why. */
  | 'failed';

export type ProfileOutcome = {
  profile: string;
  state: OutcomeState;
  detail: string;
};

export type TranscodeResult = {
  assetId: string;
  outcomes: ProfileOutcome[];
};

/**
 * Whether the bytes in storage are the bytes that were declared.
 *
 * Compared case-insensitively and trimmed because the column stores lowercase
 * hex and a digest computed elsewhere may not be. The comparison is the whole
 * point of a checksum: a master whose digest does not match is not the file
 * anybody declared, so nothing may be encoded from it, and a takedown matched
 * against that digest would have matched the wrong bytes.
 */
export function digestMatches(declared: string, actual: string): boolean {
  const a = declared.trim().toLowerCase();
  const b = actual.trim().toLowerCase();
  return a.length === 64 && a === b;
}

/** A failure reason is never blank, because `fail_media_rendition` refuses one. */
export function describeFailure(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message.slice(0, 500);
    return `the encode stopped with no message (${error.name})`;
  }
  if (typeof error === 'string' && error.trim()) return error.trim().slice(0, 500);
  return 'the encode stopped for a reason that was not recorded';
}

/**
 * Translates a refusal from the database into a sentence an operator can act on.
 * The worker's logs are the only place these appear, so a raw Postgres message
 * would be read by whoever is on call at 2am.
 */
export function mapTranscodeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const code = (error as { code?: string } | null)?.code;

  if (code === '23505' || /duplicate key|already exists/i.test(message)) {
    return 'another worker registered that profile first; this run leaves the row alone';
  }
  if (/only platform staff may (register|confirm|fail) a rendition/i.test(message)) {
    return 'the worker identity is not staff; grant it a role at /admin/roles before running it';
  }
  if (/sign in to register a rendition/i.test(message)) {
    return 'the worker is not signed in; its account credentials are missing or wrong';
  }
  if (/can only be encoded from an available master/i.test(message)) {
    return 'the master is not available, so it must not be encoded';
  }
  if (/unsupported rendition profile/i.test(message)) {
    return 'that profile is not in the rendition vocabulary';
  }
  if (/a rendition needs (both dimensions or neither|a size in bytes|a type)/i.test(message)) {
    return `the encode reported facts the database will not accept: ${message}`;
  }
  return message.trim() || 'the database refused the operation without saying why';
}

/**
 * Encodes every profile a master needs.
 *
 * The rules this exists to keep:
 *
 * - A master that is not `available` is never encoded. `register` would refuse
 *   it anyway, but ffmpeg would already have run by then.
 * - A rendition is confirmed only after its bytes are uploaded. Confirming first
 *   would publish a row pointing at an object that does not exist, and
 *   `may_play_rendition()` would hand a learner a URL that 404s.
 * - The run continues after a bad profile. One rung of the ladder failing should
 *   not cost the rest.
 *
 * WHEN A ROW IS MARKED FAILED — THE IMPORTANT PART
 * ------------------------------------------------
 * `failed` is terminal: nothing in the schema moves it back to `pending`, and
 * `register_media_rendition()` would meet the unique index on
 * `(asset_id, profile)`. So marking a row failed retires that profile until
 * somebody adds a retry path. The worker therefore only writes `failed` for an
 * error that is a property of the file — ffmpeg refusing to encode it — because
 * re-running will refuse the same way.
 *
 * An upload error or a confirm refusal leaves the row `pending`, which is
 * invisible to learners and is picked up by the next run. A network blip or a
 * missing staff grant should not permanently cost a course its 720p copy.
 *
 * A row already `failed` is reported and left alone, with the reason it was
 * given, so the gap is visible in the log rather than silently retried.
 */
export async function transcodeMaster(
  master: MasterFacts,
  deps: TranscodeDeps,
): Promise<TranscodeResult> {
  if (master.status !== 'available') {
    return {
      assetId: master.assetId,
      outcomes: [
        {
          profile: '*',
          state: 'blocked',
          detail: `the master is ${master.status}, and only an available master may be encoded`,
        },
      ],
    };
  }

  const plan = planRenditions(master);
  if (plan.length === 0) {
    return {
      assetId: master.assetId,
      outcomes: [
        {
          profile: '*',
          state: 'skipped',
          detail: 'this master has no audio or video stream, so it has no delivery copies',
        },
      ],
    };
  }

  let existing: ExistingRendition[];
  try {
    existing = await deps.listRenditions();
  } catch (error) {
    return {
      assetId: master.assetId,
      outcomes: [{ profile: '*', state: 'failed', detail: mapTranscodeError(error) }],
    };
  }

  const outcomes: ProfileOutcome[] = [];

  for (const rung of plan) {
    const row = existing.find((r) => r.profile === rung.profile);

    if (row?.status === 'available') {
      outcomes.push({ profile: rung.profile, state: 'skipped', detail: 'already available' });
      continue;
    }

    if (row?.status === 'failed') {
      outcomes.push({
        profile: rung.profile,
        state: 'blocked',
        detail: `a previous encode failed and nothing can retry it: ${row.failureReason ?? 'no reason recorded'}`,
      });
      continue;
    }

    let encoded: EncodeOutput;
    try {
      encoded = await deps.encode(rung);
    } catch (error) {
      // Definitive: the file will not encode. Fail the row if one is open,
      // otherwise there is nothing to fail and the log is the only record.
      const reason = `the encode itself failed: ${describeFailure(error)}`;
      if (row?.status === 'pending') await recordFailure(deps, row.id, reason);
      outcomes.push({ profile: rung.profile, state: 'failed', detail: reason });
      continue;
    }

    // A pending row is a crashed run's claim. Reuse its id and key rather than
    // registering again, which the unique index would refuse.
    let renditionId = '';
    let bucket = '';
    let objectKey = '';
    const recovered = row?.status === 'pending';

    if (recovered && row) {
      renditionId = row.id;
      bucket = row.bucket;
      objectKey = row.objectKey;
    } else {
      try {
        const target = await deps.register(rung.profile, encoded);
        renditionId = target.renditionId;
        bucket = target.bucket;
        objectKey = target.objectKey;
      } catch (error) {
        outcomes.push({
          profile: rung.profile,
          state: 'failed',
          detail: mapTranscodeError(error),
        });
        continue;
      }
    }

    try {
      await deps.upload(bucket, objectKey, rung.mimeType, encoded.path);
    } catch (error) {
      // Transient. Left pending on purpose — see the note above.
      outcomes.push({
        profile: rung.profile,
        state: 'failed',
        detail: `the encoded file could not be uploaded: ${describeFailure(error)}; the row stays pending for the next run`,
      });
      continue;
    }

    // Only now. The bytes are in the bucket, so the row may become servable.
    try {
      await deps.confirm(renditionId);
    } catch (error) {
      outcomes.push({
        profile: rung.profile,
        state: 'failed',
        detail: `the upload succeeded but the rendition could not be confirmed: ${mapTranscodeError(error)}; the row stays pending for the next run`,
      });
      continue;
    }

    outcomes.push({
      profile: rung.profile,
      state: recovered ? 'recovered' : 'confirmed',
      detail: recovered
        ? 'a previous run left this pending; the file was encoded again, uploaded and confirmed'
        : `${encoded.byteSize} bytes encoded, uploaded and confirmed`,
    });
  }

  return { assetId: master.assetId, outcomes };
}

/** Failing a row is best-effort: the original error is the one worth reporting. */
async function recordFailure(
  deps: TranscodeDeps,
  renditionId: string,
  reason: string,
): Promise<void> {
  if (!renditionId) return;
  try {
    await deps.fail(renditionId, reason);
  } catch {
    // A row left pending is invisible to learners, so this is not a safety hole.
  }
}
