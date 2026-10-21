/**
 * Signed URLs for Cloudflare R2 — the byte path D8 chose on 2026-10-20.
 *
 * WHY THIS IS HAND-ROLLEN
 * -----------------------
 * R2 speaks the S3 API, so a presigned URL is an AWS Signature Version 4
 * calculation: no SDK, no dependency, and nothing that can drift from the
 * specification on a minor version bump. The algorithm is pinned against AWS's
 * own published worked example in `media-r2.test.ts`, so correctness is checked
 * against a vector written by somebody else rather than against this file.
 *
 * WHAT THIS DOES AND DOES NOT DO
 * ------------------------------
 * It mints URLs. It moves no bytes, decides nothing about who may see a lesson,
 * and never touches the database — entitlement is settled by
 * `may_download_lesson()` and `can_access_lesson_now()` in SQL, and the routes
 * that call this are required to ask them first. A presigned URL is a capability:
 * anybody holding one can use it, so every expiry here is short and every key is
 * one the database derived.
 */

import { createHash, createHmac } from 'node:crypto';

export const ALGORITHM = 'AWS4-HMAC-SHA256';

/** R2 does not have regions in the AWS sense; the literal is `auto`. */
export const R2_REGION = 'auto';
export const R2_SERVICE = 's3';

/**
 * Must match the bucket `register_media_upload()` derives for backend 'r2'
 * (supabase/migrations/20261107000100_media_asset_writer.sql:159). A mismatch
 * would sign URLs for a bucket the database never records.
 */
export const DEFAULT_MASTERS_BUCKET = 'ayahspring-masters';

/**
 * Renditions are a separate bucket on purpose: masters are write-once and are
 * never served to a learner, so the only bucket a player ever touches is this
 * one. Splitting them is what makes "the delivery copies can always be
 * re-derived from the master" true rather than hoped.
 */
export const DEFAULT_RENDITIONS_BUCKET = 'ayahspring-renditions';

/** An upload is a lesson's worth of video, not a day-long window. */
export const MAX_UPLOAD_SECONDS = 3_600;

/** A playback URL outlives a lesson and nothing longer. */
export const MAX_PLAYBACK_SECONDS = 21_600;

/**
 * A verification window covers one HEAD request. It is the shortest window here
 * because it is also the most privileged: it points at a master, which no
 * learner is ever served.
 */
export const MAX_VERIFY_SECONDS = 300;

/**
 * A worker window is short by design. It covers one download or one upload of
 * one encoded profile, not a shift; a worker that needs longer is doing
 * something that should be several jobs.
 */
export const MAX_WORKER_SECONDS = 3_600;

export type R2Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
};

export type R2Config = {
  accountId: string;
  credentials: R2Credentials;
  mastersBucket: string;
  renditionsBucket: string;
};

export class R2NotConfiguredError extends Error {
  constructor() {
    super(
      'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and ' +
        'R2_SECRET_ACCESS_KEY. Until they exist no media can be uploaded or ' +
        'played, which is deliberate: the byte path must not pretend to work.',
    );
    this.name = 'R2NotConfiguredError';
  }
}

export class R2RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'R2RequestError';
  }
}

/**
 * Typed as a plain record rather than `NodeJS.ProcessEnv`: this repository's
 * ambient env type requires NODE_ENV, which makes an "is it configured?" check
 * untestable with a literal. A record of possibly-missing strings is what the
 * function actually reads.
 */
export type MediaEnv = Record<string, string | undefined>;

export function readR2Config(env: MediaEnv = process.env): R2Config | null {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return {
    accountId,
    credentials: { accessKeyId, secretAccessKey },
    mastersBucket: env.R2_MASTERS_BUCKET?.trim() || DEFAULT_MASTERS_BUCKET,
    renditionsBucket: env.R2_RENDITIONS_BUCKET?.trim() || DEFAULT_RENDITIONS_BUCKET,
  };
}

export function isR2Configured(env: MediaEnv = process.env): boolean {
  return readR2Config(env) !== null;
}

export function requireR2Config(env: MediaEnv = process.env): R2Config {
  const config = readR2Config(env);
  if (!config) throw new R2NotConfiguredError();
  return config;
}

export function r2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/**
 * `register_media_upload()` derives a key as `<asset uuid>/<mime with
 * non-alphanumerics collapsed to dashes>`, and nothing else writes one. A key
 * that does not look like that did not come from the database, so it is refused
 * here rather than signed — a presigned URL for an invented path is a way to
 * write over somebody else's object.
 */
const ASSET_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-z0-9][a-z0-9._-]*$/;

/** A rendition key adds a profile segment: `<uuid>/<mime>/720p.mp4`. */
const RENDITION_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/;

export function assertMasterKey(key: string): string {
  if (!ASSET_KEY.test(key)) {
    throw new R2RequestError('that object key was not derived from a media asset');
  }
  return key;
}

export function assertRenditionKey(key: string): string {
  if (!RENDITION_KEY.test(key)) {
    throw new R2RequestError('that object key is not a rendition of a media asset');
  }
  return key;
}

// ---------------------------------------------------------------------------
// Signature Version 4
// ---------------------------------------------------------------------------

/** RFC 3986, which is what AWS specifies — encodeURIComponent is not quite it. */
export function uriEncode(value: string, encodeSlash = true): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%2F/g, (slash) => (encodeSlash ? slash : '/'));
}

/** Exported because a server-signed request has to hash its own body to sign it. */
export function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

export function signingKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service), 'aws4_request');
}

export function amzDateParts(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

/** Sorted by name, then by value; both encoded. Order is part of the signature. */
export function canonicalQuery(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((name) => `${uriEncode(name)}=${uriEncode(params[name] ?? '')}`)
    .join('&');
}

export type CanonicalHeaderResult = { canonical: string; signed: string };

export function canonicalHeaders(headers: Record<string, string>): CanonicalHeaderResult {
  const names = Object.keys(headers)
    .map((name) => name.toLowerCase())
    .sort();
  const byName = new Map<string, string>();
  for (const name of Object.keys(headers)) byName.set(name.toLowerCase(), (headers[name] ?? '').trim());
  const canonical = names.map((name) => `${name}:${byName.get(name) ?? ''}\n`).join('');
  return { canonical, signed: names.join(';') };
}

export type CanonicalRequestInput = {
  method: string;
  path: string;
  query: string;
  headers: string;
  signedHeaders: string;
  payloadHash: string;
};

export function canonicalRequest(input: CanonicalRequestInput): string {
  return [
    input.method,
    input.path,
    input.query,
    input.headers,
    input.signedHeaders,
    input.payloadHash,
  ].join('\n');
}

export function credentialScope(dateStamp: string, region: string, service: string): string {
  return `${dateStamp}/${region}/${service}/aws4_request`;
}

export function stringToSign(amzDate: string, scope: string, canonical: string): string {
  return [ALGORITHM, amzDate, scope, sha256Hex(canonical)].join('\n');
}

export type SignRequestInput = {
  method: string;
  host: string;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  /** Hex sha256 of the body, or the literal 'UNSIGNED-PAYLOAD' for a presign. */
  payloadHash?: string;
  credentials: R2Credentials;
  region: string;
  service: string;
  now?: Date;
};

export type SignedRequest = {
  authorization: string;
  signature: string;
  amzDate: string;
  scope: string;
  signedHeaders: string;
  canonicalRequest: string;
  stringToSign: string;
  headers: Record<string, string>;
};

/** Header-based signing: the form used to call the S3 API from a server. */
export function signRequest(input: SignRequestInput): SignedRequest {
  const now = input.now ?? new Date();
  const { amzDate, dateStamp } = amzDateParts(now);
  const headers: Record<string, string> = {
    host: input.host,
    'x-amz-date': amzDate,
    ...(input.headers ?? {}),
  };
  const { canonical: headerBlock, signed: signedHeaders } = canonicalHeaders(headers);
  const canonical = canonicalRequest({
    method: input.method,
    path: input.path,
    query: canonicalQuery(input.query ?? {}),
    headers: headerBlock,
    signedHeaders,
    payloadHash: input.payloadHash ?? sha256Hex(''),
  });
  const scope = credentialScope(dateStamp, input.region, input.service);
  const toSign = stringToSign(amzDate, scope, canonical);
  const key = signingKey(input.credentials.secretAccessKey, dateStamp, input.region, input.service);
  const signature = createHmac('sha256', key).update(toSign, 'utf8').digest('hex');
  return {
    authorization:
      `${ALGORITHM} Credential=${input.credentials.accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    signature,
    amzDate,
    scope,
    signedHeaders,
    canonicalRequest: canonical,
    stringToSign: toSign,
    headers,
  };
}

export type PresignInput = {
  config: R2Config;
  method: 'GET' | 'PUT' | 'HEAD';
  bucket: string;
  key: string;
  expiresInSeconds: number;
  /** Signed when supplied, so an upload cannot change the type it declared. */
  contentType?: string;
  /**
   * `response-*` query parameters, which S3 and R2 honour by overriding the
   * stored object's response headers for this request only. They are part of the
   * canonical query, so they are signed: a caller cannot add one afterwards to
   * turn a playback URL into a download.
   */
  responseOverrides?: Record<string, string>;
  /**
   * Other query parameters the request needs, signed like the rest: `partNumber`
   * and `uploadId` for one part of a multipart upload. They are in the canonical
   * query, so a caller cannot change which part a URL writes to after it is
   * signed — that would be a way to aim one part at another's slot.
   */
  extraQuery?: Record<string, string>;
  region?: string;
  service?: string;
  now?: Date;
};

export type PresignedUrl = {
  url: string;
  method: 'GET' | 'PUT' | 'HEAD';
  bucket: string;
  key: string;
  expiresInSeconds: number;
  expiresAt: string;
  /** Headers the client must send for the signature to verify. */
  requiredHeaders: Record<string, string>;
};

/**
 * Query-string signing: the form that lets a browser talk to R2 directly, so
 * bytes never pass through the web server. The payload is `UNSIGNED-PAYLOAD`
 * because there is no payload yet — the client supplies it.
 */
export function presignUrl(input: PresignInput): PresignedUrl {
  const { config, method, bucket, key } = input;
  if (!Number.isInteger(input.expiresInSeconds) || input.expiresInSeconds < 1) {
    throw new R2RequestError('an expiry must be a whole number of seconds');
  }
  const now = input.now ?? new Date();
  const { amzDate, dateStamp } = amzDateParts(now);
  const region = input.region ?? R2_REGION;
  const service = input.service ?? R2_SERVICE;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const path = `/${bucket}/${key.split('/').map((segment) => uriEncode(segment)).join('/')}`;
  const scope = credentialScope(dateStamp, region, service);

  const headers: Record<string, string> = { host };
  if (input.contentType) headers['content-type'] = input.contentType;
  const { signed: signedHeaders } = canonicalHeaders(headers);

  const query: Record<string, string> = {
    'X-Amz-Algorithm': ALGORITHM,
    'X-Amz-Credential': `${config.credentials.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(input.expiresInSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
    ...(input.extraQuery ?? {}),
    ...(input.responseOverrides ?? {}),
  };

  const canonical = canonicalRequest({
    method,
    path,
    query: canonicalQuery(query),
    headers: canonicalHeaders(headers).canonical,
    signedHeaders,
    payloadHash: 'UNSIGNED-PAYLOAD',
  });
  const toSign = stringToSign(amzDate, scope, canonical);
  const signing = signingKey(config.credentials.secretAccessKey, dateStamp, region, service);
  const signature = createHmac('sha256', signing).update(toSign, 'utf8').digest('hex');

  const search = `${canonicalQuery(query)}&X-Amz-Signature=${signature}`;
  return {
    url: `https://${host}${path}?${search}`,
    method,
    bucket,
    key,
    expiresInSeconds: input.expiresInSeconds,
    expiresAt: new Date(now.getTime() + input.expiresInSeconds * 1000).toISOString(),
    // A presigned PUT with a signed content-type fails unless the client sends
    // exactly this header, which is how the mime type recorded in the database
    // stays the mime type that arrives.
    requiredHeaders: input.contentType ? { 'content-type': input.contentType } : {},
  };
}

/** Direct-to-R2 upload of a master, for a key the database already derived. */
export function presignMasterUpload(
  config: R2Config,
  key: string,
  options: { contentType: string; expiresInSeconds?: number; now?: Date },
): PresignedUrl {
  const expires = options.expiresInSeconds ?? MAX_UPLOAD_SECONDS;
  if (expires > MAX_UPLOAD_SECONDS) {
    throw new R2RequestError(
      `an upload window cannot exceed ${MAX_UPLOAD_SECONDS} seconds; a longer one is a standing capability`,
    );
  }
  if (!options.contentType.trim()) {
    throw new R2RequestError('an upload must declare the content type the database recorded');
  }
  return presignUrl({
    config,
    method: 'PUT',
    bucket: config.mastersBucket,
    key: assertMasterKey(key),
    expiresInSeconds: expires,
    contentType: options.contentType,
    now: options.now,
  });
}

// ---------------------------------------------------------------------------
// Multipart upload
//
// One presigned PUT caps a file at storage's own single-request limit (5 GiB less
// 5 MiB) and cannot be resumed: a failure near the end of a 4 GiB recording
// starts again from zero. Parts fix both — the database accepts 8 GiB, and a part
// that fails is retried on its own.
//
// Only the parts are presigned. Initiating, completing and aborting are calls the
// server makes with its own credentials (see `media-multipart.ts`), which keeps
// three things out of the browser: the XML, the upload id's provenance, and any
// URL that could finish or cancel an upload it did not start.
// ---------------------------------------------------------------------------

/** Storage's limit on the parts in one upload. */
export const MAX_MULTIPART_PARTS = 10_000;

/** Storage refuses a part below this, except the last one. */
export const MIN_MULTIPART_PART_BYTES = 5 * 1024 * 1024;

/**
 * 16 MiB: the database's 8 GiB ceiling in 512 parts, comfortably inside the part
 * limit, and small enough that a retry costs seconds rather than minutes.
 */
export const MULTIPART_PART_BYTES = 16 * 1024 * 1024;

/**
 * How long one part's URL lives.
 *
 * Deliberately far shorter than `MAX_UPLOAD_SECONDS`: an upload of this size has
 * hundreds of part URLs in flight, each one a credential for one slot of one
 * object, and the batch is signed as the upload progresses rather than all at
 * once. Fifteen minutes is long enough for a part on a slow connection and short
 * enough that a leaked batch is stale before it is useful.
 */
export const MAX_PART_UPLOAD_SECONDS = 900;

export type MultipartPlan = {
  byteSize: number;
  partBytes: number;
  partCount: number;
};

/**
 * How a file divides into parts.
 *
 * Every part but the last is exactly `partBytes`, which is what storage requires;
 * a plan whose parts differed would be refused at CompleteMultipartUpload, after
 * the bytes had already been transferred.
 */
export function planMultipartParts(
  byteSize: number,
  partBytes: number = MULTIPART_PART_BYTES,
): MultipartPlan {
  if (!Number.isInteger(byteSize) || byteSize < 1) {
    throw new R2RequestError('a multipart upload needs a whole number of bytes to divide');
  }
  if (!Number.isInteger(partBytes) || partBytes < MIN_MULTIPART_PART_BYTES) {
    throw new R2RequestError(
      `a part cannot be smaller than ${MIN_MULTIPART_PART_BYTES} bytes, which is storage's own minimum`,
    );
  }
  const partCount = Math.ceil(byteSize / partBytes);
  if (partCount > MAX_MULTIPART_PARTS) {
    throw new R2RequestError(
      `${byteSize} bytes at ${partBytes} per part is ${partCount} parts, and one upload takes at ` +
        `most ${MAX_MULTIPART_PARTS}`,
    );
  }
  return { byteSize, partBytes, partCount };
}

/** The byte range of one part, as `Blob.slice()` takes it: start inclusive, end exclusive. */
export function multipartPartRange(
  plan: MultipartPlan,
  partNumber: number,
): { start: number; end: number } {
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > plan.partCount) {
    throw new R2RequestError(
      `part ${String(partNumber)} is not one of the ${String(plan.partCount)} in this upload`,
    );
  }
  const start = (partNumber - 1) * plan.partBytes;
  return { start, end: Math.min(start + plan.partBytes, plan.byteSize) };
}

/** A presigned PUT for one part of a master's multipart upload. */
export function presignMasterPartUpload(
  config: R2Config,
  key: string,
  options: {
    uploadId: string;
    partNumber: number;
    plan: MultipartPlan;
    expiresInSeconds?: number;
    now?: Date;
  },
): PresignedUrl {
  const expires = options.expiresInSeconds ?? MAX_PART_UPLOAD_SECONDS;
  if (expires > MAX_PART_UPLOAD_SECONDS) {
    throw new R2RequestError(
      `a part URL cannot live longer than ${MAX_PART_UPLOAD_SECONDS} seconds; hundreds of them exist at once`,
    );
  }
  const uploadId = options.uploadId.trim();
  if (!uploadId) throw new R2RequestError('a part needs the upload it belongs to');
  // Checked against the plan rather than against the constant: part 7 of a
  // 3-part upload is a request for a slot that does not exist.
  if (
    !Number.isInteger(options.partNumber) ||
    options.partNumber < 1 ||
    options.partNumber > options.plan.partCount
  ) {
    throw new R2RequestError(
      `part ${String(options.partNumber)} is not one of the ${String(options.plan.partCount)} in this upload`,
    );
  }
  return presignUrl({
    config,
    method: 'PUT',
    bucket: config.mastersBucket,
    key: assertMasterKey(key),
    expiresInSeconds: expires,
    extraQuery: {
      partNumber: String(options.partNumber),
      uploadId,
    },
    now: options.now,
  });
}

/**
 * The XML body `CompleteMultipartUpload` takes.
 *
 * The part list is checked here rather than left to storage, because the failure
 * it prevents is the expensive kind: completing with a missing part produces a
 * shorter object, and the row still declares the size the whole file would have
 * been. Storage would accept it.
 */
export function completeMultipartUploadBody(
  parts: { partNumber: number; etag: string }[],
): string {
  if (parts.length === 0) throw new R2RequestError('an upload with no parts has nothing to complete');
  const xml = parts.map((part, index) => {
    if (!Number.isInteger(part.partNumber) || part.partNumber !== index + 1) {
      throw new R2RequestError(
        `the parts must be listed in order from 1 with no gaps; ${String(part.partNumber)} is at position ${String(index + 1)}`,
      );
    }
    const etag = part.etag.trim().replace(/^"|"$/g, '');
    if (!etag) throw new R2RequestError(`part ${String(part.partNumber)} has no ETag`);
    const escaped = etag
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return `<Part><PartNumber>${String(part.partNumber)}</PartNumber><ETag>&quot;${escaped}&quot;</ETag></Part>`;
  });
  return `<CompleteMultipartUpload>${xml.join('')}</CompleteMultipartUpload>`;
}

/**
 * The text of one XML element.
 *
 * Not an XML parser, and deliberately not one: the responses this reads are three
 * short documents from storage, and a dependency to pull two strings out of them
 * is worse than a function that refuses to guess. Zero matches and two matches
 * are both errors, because silently taking the first is how an upload id from
 * somebody else's response ends up in a request.
 */
export function xmlElementText(xml: string, tag: string): string {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(tag)) throw new R2RequestError('that is not an element name');
  const matches = [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))];
  if (matches.length === 0) throw new R2RequestError(`storage returned no <${tag}>`);
  if (matches.length > 1) {
    throw new R2RequestError(`storage returned ${String(matches.length)} <${tag}> elements, so which one is right is a guess`);
  }
  const text = String(matches[0]?.[1] ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
  if (!text) throw new R2RequestError(`storage returned an empty <${tag}>`);
  return text;
}

/** The host and path a server-side signed request to one master needs. */
export function masterRequestTarget(config: R2Config, key: string): { host: string; path: string } {
  return {
    host: `${config.accountId}.r2.cloudflarestorage.com`,
    path: `/${config.mastersBucket}/${assertMasterKey(key).split('/').map((segment) => uriEncode(segment)).join('/')}`,
  };
}

/** Playback of a rendition, short-lived by design. */
export function presignRenditionPlayback(
  config: R2Config,
  key: string,
  options: { expiresInSeconds?: number; now?: Date } = {},
): PresignedUrl {
  const expires = options.expiresInSeconds ?? MAX_PLAYBACK_SECONDS;
  if (expires > MAX_PLAYBACK_SECONDS) {
    throw new R2RequestError(
      `a playback window cannot exceed ${MAX_PLAYBACK_SECONDS} seconds; it is meant to outlive a lesson, not a term`,
    );
  }
  return presignUrl({
    config,
    method: 'GET',
    bucket: config.renditionsBucket,
    key: assertRenditionKey(key),
    expiresInSeconds: expires,
    now: options.now,
  });
}

// ---------------------------------------------------------------------------
// The worker's two ends. Neither is for a browser.
// ---------------------------------------------------------------------------

/**
 * Reading a master, for the transcode worker only.
 *
 * This is the one presigned URL in this file that points at the masters bucket,
 * and it must never reach a learner: a master is the archive, it may be an
 * unencoded 8 GiB original, and D8 is the reason delivery copies exist at all.
 * It is a GET rather than a streamed proxy because the worker pulls the bytes to
 * a local disk to run ffmpeg against, and routing them through the web server
 * would put the largest file in the system on the request path.
 */
export function presignMasterDownload(
  config: R2Config,
  key: string,
  options: { expiresInSeconds?: number; now?: Date } = {},
): PresignedUrl {
  const expires = options.expiresInSeconds ?? MAX_WORKER_SECONDS;
  if (expires > MAX_WORKER_SECONDS) {
    throw new R2RequestError(
      `a worker window cannot exceed ${MAX_WORKER_SECONDS} seconds; it covers one file, not one shift`,
    );
  }
  return presignUrl({
    config,
    method: 'GET',
    bucket: config.mastersBucket,
    key: assertMasterKey(key),
    expiresInSeconds: expires,
    now: options.now,
  });
}

/**
 * Writing an encoded profile, for the transcode worker only.
 *
 * The key comes from `register_media_rendition()`, which derives it from the
 * asset id and the master's own mime slug, so a rendition row cannot be pointed
 * at another asset's object. `assertRenditionKey` re-checks that here rather
 * than trusting the caller, because this function is what would upload the bytes
 * if the check were wrong.
 */
export function presignRenditionUpload(
  config: R2Config,
  key: string,
  options: { contentType: string; expiresInSeconds?: number; now?: Date },
): PresignedUrl {
  const expires = options.expiresInSeconds ?? MAX_WORKER_SECONDS;
  if (expires > MAX_WORKER_SECONDS) {
    throw new R2RequestError(
      `a worker window cannot exceed ${MAX_WORKER_SECONDS} seconds; it covers one file, not one shift`,
    );
  }
  if (!options.contentType.trim()) {
    throw new R2RequestError('an encoded profile must declare the type it was encoded to');
  }
  return presignUrl({
    config,
    method: 'PUT',
    bucket: config.renditionsBucket,
    key: assertRenditionKey(key),
    expiresInSeconds: expires,
    contentType: options.contentType,
    now: options.now,
  });
}

/**
 * Saving a rendition rather than playing it.
 *
 * Same object, same bucket, same short window as playback — the difference is
 * `response-content-disposition`, which makes the browser save the bytes instead
 * of opening them. Without it a "Save for offline" button would open a new tab
 * and play the lesson, which is not what the button says.
 *
 * The filename is quoted and escaped here rather than trusted: a display name on
 * this platform can be Arabic, can contain a double quote, and can contain a
 * slash, and any of those in a raw header would either break the response or let
 * a teacher choose the path a learner saves to.
 */
export function presignRenditionDownload(
  config: R2Config,
  key: string,
  options: { filename: string; contentType?: string; expiresInSeconds?: number; now?: Date },
): PresignedUrl {
  const filename = options.filename.trim();
  if (!filename) {
    throw new R2RequestError('a download needs a filename to save under');
  }
  const expires = options.expiresInSeconds ?? MAX_PLAYBACK_SECONDS;
  if (expires > MAX_PLAYBACK_SECONDS) {
    throw new R2RequestError(
      `a download window cannot exceed ${MAX_PLAYBACK_SECONDS} seconds; the bytes are meant to be saved, not the URL kept`,
    );
  }
  // RFC 6266: an ASCII fallback for old clients, and filename* carrying the real
  // name. A lesson title on this platform is as likely to be Arabic as English,
  // and the plain parameter cannot hold that.
  const ascii =
    filename
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/["\\]/g, '')
      .trim() || 'lesson';
  const overrides: Record<string, string> = {
    'response-content-disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${uriEncode(filename)}`,
  };
  if (options.contentType?.trim()) {
    overrides['response-content-type'] = options.contentType.trim();
  }
  return presignUrl({
    config,
    method: 'GET',
    bucket: config.renditionsBucket,
    key: assertRenditionKey(key),
    expiresInSeconds: expires,
    responseOverrides: overrides,
    now: options.now,
  });
}

/**
 * Looking at a master without downloading it, for verification only.
 *
 * A HEAD answers the one question that has to be answered before a file becomes
 * `available`: did the object actually arrive, and is it the size the uploader
 * declared? Both are answered from the response headers, so a verification costs
 * one request rather than a transfer of something that can be 8 GiB.
 *
 * It cannot answer whether the bytes are the bytes whose digest was declared —
 * that needs the file, and the only place the file is already local is the
 * transcode worker, which downloads it to encode it.
 */
export function presignMasterHead(
  config: R2Config,
  key: string,
  options: { expiresInSeconds?: number; now?: Date } = {},
): PresignedUrl {
  const expires = options.expiresInSeconds ?? MAX_VERIFY_SECONDS;
  if (expires > MAX_VERIFY_SECONDS) {
    throw new R2RequestError(
      `a verification window cannot exceed ${MAX_VERIFY_SECONDS} seconds; it covers one request`,
    );
  }
  return presignUrl({
    config,
    method: 'HEAD',
    bucket: config.mastersBucket,
    key: assertMasterKey(key),
    expiresInSeconds: expires,
    now: options.now,
  });
}
