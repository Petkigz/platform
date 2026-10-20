#!/usr/bin/env node
/**
 * The transcode worker: encodes delivery copies of an uploaded master.
 *
 *   npm run worker:transcode                 # one pass over the oldest work
 *   npm run worker:transcode -- --asset ID   # exactly one master
 *   npm run worker:transcode -- --limit 1    # at most one master
 *
 * WHAT IT DOES
 * ------------
 * Signs in as a staff account, reads the `delivery.transcode` flag, finds
 * masters that need work, downloads each one from Cloudflare R2, runs ffprobe
 * and ffmpeg against it, and for every profile it plans calls
 * `register_media_rendition()`, uploads the object to the key the database
 * derived, then `confirm_media_rendition()`. On an encode failure it calls
 * `fail_media_rendition()` with a reason.
 *
 * WHY IT SIGNS IN RATHER THAN USING A SERVICE KEY
 * -----------------------------------------------
 * There is no `service_role` anywhere in this schema, and that is deliberate:
 * every writer here is a security-definer function that checks
 * `is_privileged(current_user_id())`, so a machine identity has to be a real
 * account that somebody granted a role at `/admin/roles`. The consequence is
 * that the worker is subject to the same refusals as any other caller, that its
 * actions are attributable to an account, and that revoking the role stops it
 * immediately. It also means reading `platform_settings` at all is a privilege
 * check — an unprivileged worker cannot even see the flag.
 *
 * WHAT IS NOT TESTED HERE, AND WHY
 * --------------------------------
 * Nothing in this file runs in CI. `ffmpeg` is not installed, there are no R2
 * credentials, and there is no staff account to sign in with. Every decision —
 * which profiles, what arguments, what order, what counts as a failure — lives
 * in `web/src/lib/transcode.ts`, which is unit-tested; this file is the plumbing
 * that hands it real bytes and a real database. If a branch here is wrong the
 * failure is loud and early (a refusal, a non-zero exit), which is the reason it
 * is allowed to be thin.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It never scans the whole archive. A master needs work when it has no rendition
 * rows at all, or when it has a `pending` row left by a crashed run. Deciding
 * anything finer needs the picture height, and the only trustworthy height comes
 * from probing the file — so the alternative to this filter is downloading every
 * master on every run. `--asset` is the escape hatch for a master that needs
 * attention and does not match the filter, such as one whose profile is stuck
 * `failed`, which nothing in the schema can retry.
 */

import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  presignMasterDownload,
  presignRenditionUpload,
  readR2Config,
  requireR2Config,
  type R2Config,
} from '../lib/media-r2.ts';
import {
  describeFailure,
  digestMatches,
  encodeArgs,
  mapTranscodeError,
  probeArgs,
  transcodeMaster,
  type EncodeOutput,
  type ExistingRendition,
  type MasterFacts,
  type ProfilePlan,
} from '../lib/transcode.ts';

const USAGE = `usage: transcode-worker [--asset <uuid>] [--limit <n>] [--scan <n>]

  --asset   encode one master by id, whatever state its renditions are in
  --limit   how many masters to encode in this pass (default 5)
  --scan    how many available masters to look at when choosing (default 50)
`;

type Args = { asset: string | null; limit: number; scan: number };

function parseArgs(argv: readonly string[]): Args {
  const args: Args = { asset: null, limit: 5, scan: 50 };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--asset') {
      if (!value) throw new Error('--asset needs a master id');
      args.asset = value;
      i += 1;
    } else if (flag === '--limit' || flag === '--scan') {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1) throw new Error(`${flag} needs a whole number of at least 1`);
      if (flag === '--limit') args.limit = n;
      else args.scan = n;
      i += 1;
    } else if (flag === '--help' || flag === '-h') {
      process.stdout.write(USAGE);
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${String(flag)}\n\n${USAGE}`);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

type WorkerEnv = {
  url: string;
  anonKey: string;
  email: string;
  password: string;
  r2: R2Config;
};

/**
 * Reads what the worker needs, and refuses with a sentence naming the missing
 * variable. No default is invented for a credential: a worker that silently ran
 * against the wrong project would encode into somebody else's bucket.
 */
function readWorkerEnv(env: Record<string, string | undefined>): WorkerEnv {
  const required: Array<[string, string | undefined]> = [
    ['SUPABASE_URL', env.SUPABASE_URL],
    ['SUPABASE_ANON_KEY', env.SUPABASE_ANON_KEY],
    ['MEDIA_WORKER_EMAIL', env.MEDIA_WORKER_EMAIL],
    ['MEDIA_WORKER_PASSWORD', env.MEDIA_WORKER_PASSWORD],
  ];
  const missing = required.filter(([, value]) => !value?.trim()).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `the worker needs ${missing.join(', ')} in its environment. ` +
        'MEDIA_WORKER_EMAIL and MEDIA_WORKER_PASSWORD are a real account that an admin has made staff at /admin/roles; ' +
        'there is no service key in this schema, by design.',
    );
  }
  return {
    url: env.SUPABASE_URL!.trim(),
    anonKey: env.SUPABASE_ANON_KEY!.trim(),
    email: env.MEDIA_WORKER_EMAIL!.trim(),
    password: env.MEDIA_WORKER_PASSWORD!,
    r2: requireR2Config(env),
  };
}

// ---------------------------------------------------------------------------
// ffmpeg and ffprobe
// ---------------------------------------------------------------------------

type ProbeStream = {
  codec_type?: string;
  height?: number;
  width?: number;
  duration?: string;
  bit_rate?: string;
  /** Cover art on an audio file probes as a video stream; it is not the picture. */
  disposition?: { attached_pic?: number };
};

type ProbeJson = {
  format?: { duration?: string; bit_rate?: string };
  streams?: ProbeStream[];
};

function run(command: string, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      reject(
        new Error(
          `${command} could not be started: ${error.message}. ` +
            'The worker host needs ffmpeg and ffprobe on its PATH.',
        ),
      );
    });
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${String(code)}: ${stderr.trim().slice(-800)}`));
    });
  });
}

function whole(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Turns ffprobe's JSON into the facts `planRenditions` reads. */
function readProbe(json: ProbeJson): {
  hasVideo: boolean;
  videoHeight: number | null;
  videoWidth: number | null;
  hasAudio: boolean;
  durationSeconds: number | null;
  bitrateKbps: number | null;
} {
  const streams = json.streams ?? [];
  const pictures = streams.filter(
    (s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1,
  );
  const tallest = pictures.reduce(
    (best, s) => Math.max(best, whole(s.height) ?? 0),
    0,
  );
  const widest = pictures.reduce((best, s) => Math.max(best, whole(s.width) ?? 0), 0);
  const streamSeconds = pictures
    .map((s) => whole(Number(s.duration ?? NaN)))
    .find((n) => n !== null && n > 0);
  const seconds = whole(Number(json.format?.duration ?? NaN)) ?? streamSeconds ?? null;
  const bitsPerSecond = whole(Number(json.format?.bit_rate ?? NaN));

  return {
    hasVideo: pictures.length > 0 && tallest > 0,
    videoHeight: tallest > 0 ? tallest : null,
    videoWidth: widest > 0 ? widest : null,
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
    durationSeconds: seconds,
    bitrateKbps: bitsPerSecond ? Math.round(bitsPerSecond / 1000) : null,
  };
}

/**
 * The SHA-256 of a file on disk, streamed, so an 8 GiB master costs a buffer and
 * not an allocation.
 */
async function sha256OfFileAtPath(path: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(
    createReadStream(path),
    new Writable({
      write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void) {
        hash.update(chunk);
        callback();
      },
    }),
  );
  return hash.digest('hex');
}

async function probe(path: string) {
  const { stdout } = await run('ffprobe', probeArgs(path));
  return readProbe(JSON.parse(stdout) as ProbeJson);
}

// ---------------------------------------------------------------------------
// R2
// ---------------------------------------------------------------------------

async function downloadMaster(r2: R2Config, key: string, destination: string): Promise<void> {
  const signed = presignMasterDownload(r2, key);
  const response = await fetch(signed.url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(
      `the master could not be downloaded from R2 (HTTP ${String(response.status)}); ` +
        'the object may be missing, or the credentials may not reach that bucket',
    );
  }
  if (!response.body) throw new Error('R2 returned no body for the master');
  await pipeline(
    Readable.fromWeb(response.body as unknown as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(destination),
  );
}

/**
 * Uploads an encoded profile with a presigned PUT.
 *
 * The body is a stream rather than a buffer: a 1080p rendition of a long lesson
 * is hundreds of megabytes, and reading it into memory would make the worker's
 * footprint a function of the biggest file a teacher uploaded.
 *
 * The content-type header is required, not optional — `presignRenditionUpload`
 * signs it, so the request fails without it. That is what keeps the type
 * recorded in the database the type that arrives in the bucket.
 */
async function uploadRendition(
  r2: R2Config,
  key: string,
  contentType: string,
  path: string,
): Promise<void> {
  const signed = presignRenditionUpload(r2, key, { contentType });
  // `duplex` is required by Node when the body is a stream and is not in the
  // DOM's RequestInit, hence the widened type rather than a bare cast.
  const init: RequestInit & { duplex: string } = {
    method: 'PUT',
    headers: signed.requiredHeaders,
    body: Readable.toWeb(createReadStream(path)) as unknown as BodyInit,
    duplex: 'half',
  };
  const response = await fetch(signed.url, init);
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `R2 refused the upload of ${key} (HTTP ${String(response.status)}) ${detail.slice(0, 300)}`.trim(),
    );
  }
}

// ---------------------------------------------------------------------------
// Choosing work
// ---------------------------------------------------------------------------

type MasterRow = {
  id: string;
  checksum: string;
  mime_type: string;
  master_bucket: string;
  master_key: string;
  status: string;
};

type RenditionRow = {
  id: string;
  asset_id: string;
  profile: string;
  status: string;
  bucket: string;
  object_key: string;
  mime_type: string;
  failure_reason: string | null;
};

async function findWork(
  supabase: SupabaseClient,
  args: Args,
): Promise<{ masters: MasterRow[]; renditions: Map<string, ExistingRendition[]> }> {
  if (args.asset) {
    const { data, error } = await supabase
      .from('media_assets')
      .select('id, checksum, mime_type, master_bucket, master_key, status')
      .eq('id', args.asset)
      .maybeSingle();
    if (error) throw new Error(mapTranscodeError(error));
    if (!data) throw new Error(`no master ${args.asset}`);
    const rows = [data as unknown as MasterRow];
    return { masters: rows, renditions: await fetchRenditions(supabase, rows.map((m) => m.id)) };
  }

  const { data, error } = await supabase
    .from('media_assets')
    .select('id, checksum, mime_type, master_bucket, master_key, status')
    .eq('status', 'available')
    .order('created_at', { ascending: true })
    .limit(args.scan);
  if (error) throw new Error(mapTranscodeError(error));

  const scanned = (data ?? []) as unknown as MasterRow[];
  const renditions = await fetchRenditions(supabase, scanned.map((m) => m.id));

  const needing = scanned.filter((master) => {
    const rows = renditions.get(master.id) ?? [];
    // Never encoded, or a crashed run left a row open. See the file header for
    // why this is the whole filter.
    return rows.length === 0 || rows.some((r) => r.status === 'pending');
  });

  return { masters: needing.slice(0, args.limit), renditions };
}

async function fetchRenditions(
  supabase: SupabaseClient,
  assetIds: readonly string[],
): Promise<Map<string, ExistingRendition[]>> {
  const map = new Map<string, ExistingRendition[]>();
  if (assetIds.length === 0) return map;

  const { data, error } = await supabase
    .from('media_renditions')
    .select('id, asset_id, profile, status, bucket, object_key, mime_type, failure_reason')
    .in('asset_id', [...assetIds]);
  if (error) throw new Error(mapTranscodeError(error));

  for (const row of (data ?? []) as unknown as RenditionRow[]) {
    const list = map.get(row.asset_id) ?? [];
    list.push({
      id: row.id,
      profile: row.profile,
      status: row.status,
      bucket: row.bucket,
      objectKey: row.object_key,
      mimeType: row.mime_type,
      failureReason: row.failure_reason,
    });
    map.set(row.asset_id, list);
  }
  return map;
}

async function readTranscodeFlag(supabase: SupabaseClient): Promise<string | null> {
  // Reading platform_settings at all requires a privileged identity, so an empty
  // result means either the flag is missing or this account is not staff.
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value_text')
    .eq('key', 'delivery.transcode')
    .maybeSingle();
  if (error) throw new Error(mapTranscodeError(error));
  return (data as { value_text: string } | null)?.value_text ?? null;
}

// ---------------------------------------------------------------------------
// One master
// ---------------------------------------------------------------------------

async function processMaster(
  supabase: SupabaseClient,
  r2: R2Config,
  master: MasterRow,
  renditions: readonly ExistingRendition[],
): Promise<number> {
  if (master.status !== 'available') {
    process.stdout.write(`\n${master.id} — ${master.status}: not available, nothing encoded\n`);
    return 0;
  }
  if (master.master_bucket !== r2.mastersBucket) {
    process.stdout.write(
      `\n${master.id} — the row says its master is in '${master.master_bucket}' but this worker is configured for ` +
        `'${r2.mastersBucket}'. Refusing rather than reading the wrong bucket.\n`,
    );
    return 1;
  }

  const workdir = await mkdtemp(join(tmpdir(), 'ayahspring-transcode-'));
  const input = join(workdir, 'master');
  let failures = 0;

  try {
    process.stdout.write(`\n${master.id} — downloading the master\n`);
    await downloadMaster(r2, master.master_key, input);

    // The only place the declared digest can honestly be checked: the bytes are
    // already on a local disk here, and the verification HEAD at confirm time can
    // compare a size but cannot recompute a SHA-256. Encoding from a master whose
    // digest does not match would publish content nobody declared, and would make
    // every takedown matched against that digest a match against the wrong bytes.
    const actualDigest = await sha256OfFileAtPath(input);
    if (!digestMatches(master.checksum, actualDigest)) {
      process.stdout.write(
        `  the object in storage is not the file that was declared: the row says ${master.checksum} ` +
          `and the bytes are ${actualDigest}. Nothing will be encoded from it. ` +
          'Quarantine it from /admin/media and ask the teacher to upload it again.\n',
      );
      return 1;
    }
    const probed = await probe(input);
    process.stdout.write(
      `  probed: ${probed.hasVideo ? `video ${String(probed.videoWidth ?? '?')}x${String(probed.videoHeight ?? '?')}` : 'no video stream'}` +
        `, ${probed.hasAudio ? 'audio present' : 'no audio stream'}` +
        `, ${probed.durationSeconds === null ? 'duration unknown' : `${String(probed.durationSeconds)}s`}\n`,
    );

    const facts: MasterFacts = {
      assetId: master.id,
      status: master.status,
      declaredMimeType: master.mime_type,
      hasVideo: probed.hasVideo,
      videoHeight: probed.videoHeight,
      hasAudio: probed.hasAudio,
      durationSeconds: probed.durationSeconds,
    };

    const result = await transcodeMaster(facts, {
      async listRenditions() {
        return [...renditions];
      },
      async register(profile: ProfilePlan['profile'], encoded: EncodeOutput) {
        const { data, error } = await supabase.rpc('register_media_rendition', {
          p_asset_id: master.id,
          p_profile: profile,
          p_mime_type: encoded.mime,
          p_byte_size: encoded.byteSize,
          p_width: encoded.width,
          p_height: encoded.height,
          p_bitrate_kbps: encoded.bitrateKbps,
          p_duration_seconds: encoded.durationSeconds,
        });
        if (error) throw new Error(mapTranscodeError(error));
        const target = data as { rendition_id: string; bucket: string; object_key: string } | null;
        if (!target?.rendition_id) throw new Error('register_media_rendition returned no rendition id');
        return {
          renditionId: target.rendition_id,
          bucket: target.bucket,
          objectKey: target.object_key,
        };
      },
      async confirm(renditionId: string) {
        const { error } = await supabase.rpc('confirm_media_rendition', { p_rendition_id: renditionId });
        if (error) throw new Error(mapTranscodeError(error));
      },
      async fail(renditionId: string, reason: string) {
        const { error } = await supabase.rpc('fail_media_rendition', {
          p_rendition_id: renditionId,
          p_reason: reason,
        });
        if (error) throw new Error(mapTranscodeError(error));
      },
      async encode(plan: ProfilePlan) {
        return encodeOne(workdir, input, plan);
      },
      async upload(_bucket: string, key: string, contentType: string, path: string) {
        // The bucket is the configured renditions bucket; register derives the
        // key, and presignRenditionUpload refuses one that is not a rendition.
        await uploadRendition(r2, key, contentType, path);
      },
    });

    for (const outcome of result.outcomes) {
      process.stdout.write(`  ${outcome.profile}: ${outcome.state} — ${outcome.detail}\n`);
      if (outcome.state === 'failed' || outcome.state === 'blocked') failures += 1;
    }
    if (result.outcomes.length === 0) {
      process.stdout.write('  nothing planned\n');
    }
  } catch (error) {
    failures += 1;
    process.stdout.write(`  stopped: ${describeFailure(error)}\n`);
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => undefined);
  }

  return failures;
}

async function encodeOne(workdir: string, input: string, plan: ProfilePlan): Promise<EncodeOutput> {
  const extension = plan.mimeType === 'image/jpeg' ? 'jpg' : plan.mimeType === 'audio/mp4' ? 'm4a' : 'mp4';
  const output = join(workdir, `${plan.profile}.${extension}`);

  await run('ffmpeg', encodeArgs(input, output, plan));

  const size = (await stat(output)).size;
  const probed = await probe(output);

  return {
    path: output,
    mime: plan.mimeType,
    byteSize: size,
    // Both dimensions or neither — `mr_dimensions_agree` refuses one alone.
    width: probed.hasVideo ? probed.videoWidth : null,
    height: probed.hasVideo ? probed.videoHeight : null,
    bitrateKbps: probed.bitrateKbps,
    durationSeconds: probed.durationSeconds,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  // Read the config before touching the network, so a missing credential is
  // reported as a configuration problem rather than as a failed encode.
  const configured = readR2Config(process.env as Record<string, string | undefined>);
  if (!configured) {
    process.stdout.write(
      'R2 is not configured: the worker needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.\n' +
        'No credentials are committed to this repository and none are inferred.\n',
    );
    return 1;
  }

  let env: WorkerEnv;
  try {
    env = readWorkerEnv(process.env as Record<string, string | undefined>);
  } catch (error) {
    process.stdout.write(`${describeFailure(error)}\n`);
    return 1;
  }

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: env.email,
    password: env.password,
  });
  if (signInError) {
    process.stdout.write(
      `the worker could not sign in as ${env.email}: ${signInError.message}\n` +
        'This must be a real account that an admin has made staff; there is no service key here.\n',
    );
    return 1;
  }

  const flag = await readTranscodeFlag(supabase);
  if (flag === null) {
    process.stdout.write(
      `delivery.transcode could not be read. Either the flag is missing or ${env.email} is not staff — ` +
        'reading platform_settings requires a privileged identity.\n',
    );
    return 1;
  }
  if (flag !== 'true') {
    process.stdout.write(
      'delivery.transcode is off, so nothing was encoded.\n' +
        'It is CODE-gated: enabling it needs a deploy of this worker with ffmpeg and R2 credentials, not just a setting.\n',
    );
    return 0;
  }

  let masters: MasterRow[];
  let renditions: Map<string, ExistingRendition[]>;
  try {
    ({ masters, renditions } = await findWork(supabase, args));
  } catch (error) {
    process.stdout.write(`${describeFailure(error)}\n`);
    return 1;
  }

  if (masters.length === 0) {
    process.stdout.write('no master needs encoding\n');
    return 0;
  }

  process.stdout.write(`${String(masters.length)} master(s) to encode\n`);
  let failures = 0;
  for (const master of masters) {
    failures += await processMaster(supabase, env.r2, master, renditions.get(master.id) ?? []);
  }

  process.stdout.write(
    failures === 0 ? '\nfinished with nothing outstanding\n' : `\nfinished with ${String(failures)} problem(s)\n`,
  );
  return failures === 0 ? 0 : 2;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stdout.write(`${describeFailure(error)}\n`);
    process.exitCode = 1;
  });
