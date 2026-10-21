import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  ALGORITHM,
  DEFAULT_MASTERS_BUCKET,
  MAX_MULTIPART_PARTS,
  MAX_PART_UPLOAD_SECONDS,
  MAX_PLAYBACK_SECONDS,
  MAX_UPLOAD_SECONDS,
  MAX_WORKER_SECONDS,
  MIN_MULTIPART_PART_BYTES,
  MULTIPART_PART_BYTES,
  R2NotConfiguredError,
  R2RequestError,
  amzDateParts,
  assertMasterKey,
  assertRenditionKey,
  canonicalQuery,
  completeMultipartUploadBody,
  isR2Configured,
  masterRequestTarget,
  multipartPartRange,
  planMultipartParts,
  presignMasterDownload,
  presignMasterPartUpload,
  presignMasterUpload,
  presignRenditionDownload,
  presignRenditionPlayback,
  presignRenditionUpload,
  presignUrl,
  r2Endpoint,
  readR2Config,
  requireR2Config,
  signRequest,
  uriEncode,
  xmlElementText,
  type R2Config,
} from './media-r2.ts';

const config: R2Config = {
  accountId: 'test-account',
  credentials: { accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key' },
  mastersBucket: DEFAULT_MASTERS_BUCKET,
  renditionsBucket: 'ayahspring-renditions',
};

const assetId = '4f30fd1d-6f2c-4c1e-9a5b-0d2f6c8a1b23';
const masterKey = `${assetId}/video-mp4`;
const renditionKey = `${assetId}/video-mp4/720p.mp4`;
const fixed = new Date('2026-10-20T09:00:00.000Z');

// ---------------------------------------------------------------------------
// The algorithm, checked against a vector written by somebody else
// ---------------------------------------------------------------------------

test('header signing reproduces AWS\'s published worked example exactly', () => {
  // The GET ListUsers example from the AWS Signature Version 4 documentation.
  // If this signature is right, the canonical request, the string to sign and
  // the derived key are all right, because a single byte out of place anywhere
  // in the chain produces a different hash.
  const signed = signRequest({
    method: 'GET',
    host: 'iam.amazonaws.com',
    path: '/',
    query: { Action: 'ListUsers', Version: '2010-05-08' },
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' },
    credentials: {
      accessKeyId: 'AKIDEXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
    },
    region: 'us-east-1',
    service: 'iam',
    now: new Date('2015-08-30T12:36:00.000Z'),
  });

  assert.equal(signed.signature, '5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7');
  assert.equal(signed.amzDate, '20150830T123600Z');
  assert.equal(signed.scope, '20150830/us-east-1/iam/aws4_request');
  assert.equal(signed.signedHeaders, 'content-type;host;x-amz-date');
  assert.equal(
    signed.canonicalRequest,
    [
      'GET',
      '/',
      'Action=ListUsers&Version=2010-05-08',
      'content-type:application/x-www-form-urlencoded; charset=utf-8',
      'host:iam.amazonaws.com',
      'x-amz-date:20150830T123600Z',
      '',
      'content-type;host;x-amz-date',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    ].join('\n'),
  );
  assert.match(signed.authorization, new RegExp(`^${ALGORITHM} Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, `));
  assert.match(signed.authorization, /SignedHeaders=content-type;host;x-amz-date, Signature=[0-9a-f]{64}$/);
});

test('the same request signed at a different second is a different signature', () => {
  const base = {
    method: 'GET' as const,
    host: 'iam.amazonaws.com',
    path: '/',
    credentials: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'secret' },
    region: 'us-east-1',
    service: 'iam',
  };
  const a = signRequest({ ...base, now: new Date('2026-10-20T09:00:00.000Z') });
  const b = signRequest({ ...base, now: new Date('2026-10-20T09:00:01.000Z') });
  assert.notEqual(a.signature, b.signature);
});

// ---------------------------------------------------------------------------
// The pieces the signature is made of
// ---------------------------------------------------------------------------

test('the timestamp format is basic ISO 8601, not the JS one', () => {
  assert.deepEqual(amzDateParts(new Date('2026-01-05T07:08:09.123Z')), {
    amzDate: '20260105T070809Z',
    dateStamp: '20260105',
  });
});

test('URI encoding is RFC 3986, which encodeURIComponent is not quite', () => {
  assert.equal(uriEncode('a b'), 'a%20b');
  assert.equal(uriEncode("~tilde"), '~tilde');
  assert.equal(uriEncode("!'()*"), '%21%27%28%29%2A');
  assert.equal(uriEncode('a/b'), 'a%2Fb');
  assert.equal(uriEncode('a/b', false), 'a/b');
});

test('canonical query parameters are sorted and encoded, because order is signed', () => {
  assert.equal(canonicalQuery({ b: '2', a: '1', c: 'x y' }), 'a=1&b=2&c=x%20y');
  assert.equal(canonicalQuery({}), '');
});

// ---------------------------------------------------------------------------
// Presigning
// ---------------------------------------------------------------------------

test('a presigned URL is deterministic for a fixed instant', () => {
  const a = presignUrl({ config, method: 'GET', bucket: config.renditionsBucket, key: renditionKey, expiresInSeconds: 600, now: fixed });
  const b = presignUrl({ config, method: 'GET', bucket: config.renditionsBucket, key: renditionKey, expiresInSeconds: 600, now: fixed });
  assert.equal(a.url, b.url);
  assert.equal(a.expiresAt, new Date(fixed.getTime() + 600_000).toISOString());
});

test('a presigned URL carries the whole credential in the query and signs nothing else', () => {
  const signed = presignUrl({ config, method: 'GET', bucket: config.renditionsBucket, key: renditionKey, expiresInSeconds: 600, now: fixed });
  const url = new URL(signed.url);
  assert.equal(url.host, 'test-account.r2.cloudflarestorage.com');
  assert.equal(url.pathname, `/${config.renditionsBucket}/${renditionKey}`);
  assert.equal(url.searchParams.get('X-Amz-Algorithm'), ALGORITHM);
  assert.equal(url.searchParams.get('X-Amz-Credential'), `test-access-key/20261020/auto/s3/aws4_request`);
  assert.equal(url.searchParams.get('X-Amz-Date'), '20261020T090000Z');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '600');
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'host');
  assert.match(url.searchParams.get('X-Amz-Signature') ?? '', /^[0-9a-f]{64}$/);
  assert.deepEqual(signed.requiredHeaders, {});
});

test('an upload signs the content type, so what arrives is what the database recorded', () => {
  const signed = presignMasterUpload(config, masterKey, { contentType: 'video/mp4', now: fixed });
  const url = new URL(signed.url);
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'content-type;host');
  assert.deepEqual(signed.requiredHeaders, { 'content-type': 'video/mp4' });
  assert.equal(signed.method, 'PUT');
  assert.equal(signed.bucket, DEFAULT_MASTERS_BUCKET);
});

test('masters and renditions are different buckets, and only renditions are served', () => {
  const upload = presignMasterUpload(config, masterKey, { contentType: 'video/mp4', now: fixed });
  const play = presignRenditionPlayback(config, renditionKey, { now: fixed });
  assert.equal(upload.bucket, config.mastersBucket);
  assert.equal(play.bucket, config.renditionsBucket);
  assert.notEqual(upload.bucket, play.bucket);
  assert.equal(upload.method, 'PUT');
  assert.equal(play.method, 'GET');
});

test('the default masters bucket is the one the database derives', () => {
  // Two places name this bucket: register_media_upload() in SQL and this
  // constant. If they drift, every signed URL points at a bucket no row
  // records. Pinned against the migration text rather than against a copy.
  const migration = readFileSync(
    new URL('../../../supabase/migrations/20261107000100_media_asset_writer.sql', import.meta.url),
    'utf8',
  );
  assert.ok(
    migration.includes(`when 'supabase' then 'masters'`) && migration.includes(DEFAULT_MASTERS_BUCKET),
    'the writer migration no longer derives the bucket this library signs for',
  );

  // Same check for the renditions bucket, which is derived in a different
  // migration by register_media_rendition().
  const renditions = readFileSync(
    new URL('../../../supabase/migrations/20261208000100_media_renditions.sql', import.meta.url),
    'utf8',
  );
  assert.ok(
    renditions.includes(`v_bucket text := '${config.renditionsBucket}'`),
    'the renditions migration no longer derives the bucket this library signs playback for',
  );
});

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

test('an upload window cannot outlive an hour', () => {
  assert.throws(
    () => presignMasterUpload(config, masterKey, { contentType: 'video/mp4', expiresInSeconds: MAX_UPLOAD_SECONDS + 1 }),
    (error: unknown) => error instanceof R2RequestError && /standing capability/.test(error.message),
  );
  // The limit itself is allowed.
  assert.equal(
    presignMasterUpload(config, masterKey, { contentType: 'video/mp4', expiresInSeconds: MAX_UPLOAD_SECONDS }).expiresInSeconds,
    MAX_UPLOAD_SECONDS,
  );
});

test('a playback window cannot outlive a term', () => {
  assert.throws(
    () => presignRenditionPlayback(config, renditionKey, { expiresInSeconds: MAX_PLAYBACK_SECONDS + 1 }),
    (error: unknown) => error instanceof R2RequestError && /outlive a lesson/.test(error.message),
  );
});

test('a nonsensical expiry is refused', () => {
  for (const expires of [0, -1, 1.5, Number.NaN]) {
    assert.throws(
      () => presignUrl({ config, method: 'GET', bucket: config.renditionsBucket, key: renditionKey, expiresInSeconds: expires, now: fixed }),
      (error: unknown) => error instanceof R2RequestError && /whole number of seconds/.test(error.message),
      `expiry ${expires} was accepted`,
    );
  }
});

test('an upload must declare a content type', () => {
  assert.throws(
    () => presignMasterUpload(config, masterKey, { contentType: '   ' }),
    (error: unknown) => error instanceof R2RequestError && /content type/.test(error.message),
  );
});

test('only a key the database derived can be signed', () => {
  assert.equal(assertMasterKey(masterKey), masterKey);
  assert.equal(assertRenditionKey(renditionKey), renditionKey);

  const refused = [
    '../etc/passwd',
    `${assetId}/../other-asset/video-mp4`,
    '/absolute/video-mp4',
    'not-a-uuid/video-mp4',
    `${assetId}/`,
    `${assetId}/VIDEO-MP4`,
    `${assetId}/video mp4`,
    '',
  ];
  for (const key of refused) {
    assert.throws(
      () => presignMasterUpload(config, key, { contentType: 'video/mp4' }),
      (error: unknown) => error instanceof R2RequestError && /not derived from a media asset/.test(error.message),
      `master key ${JSON.stringify(key)} was signed`,
    );
  }

  // A master key is not a rendition key: playback would otherwise be able to
  // point straight at the original, which is never served to a learner.
  assert.throws(
    () => presignRenditionPlayback(config, masterKey, {}),
    (error: unknown) => error instanceof R2RequestError && /not a rendition/.test(error.message),
  );
  assert.throws(
    () => presignMasterUpload(config, renditionKey, { contentType: 'video/mp4' }),
    (error: unknown) => error instanceof R2RequestError,
    'a rendition key was accepted as a master',
  );
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const env = {
  R2_ACCOUNT_ID: 'acct-123',
  R2_ACCESS_KEY_ID: 'key-id',
  R2_SECRET_ACCESS_KEY: 'secret',
};

test('R2 is unconfigured until all three credentials exist', () => {
  assert.equal(isR2Configured({}), false);
  assert.equal(readR2Config({}), null);
  assert.equal(readR2Config({ R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'b' }), null);
  assert.equal(isR2Configured(env), true);
  assert.equal(isR2Configured({ ...env, R2_SECRET_ACCESS_KEY: '   ' }), false);
});

test('buckets default to the derived names and can be overridden', () => {
  const read = readR2Config(env);
  assert.ok(read);
  assert.equal(read.mastersBucket, 'ayahspring-masters');
  assert.equal(read.renditionsBucket, 'ayahspring-renditions');
  assert.equal(r2Endpoint(read.accountId), 'https://acct-123.r2.cloudflarestorage.com');

  const custom = readR2Config({ ...env, R2_MASTERS_BUCKET: ' other-masters ', R2_RENDITIONS_BUCKET: 'other-renditions' });
  assert.ok(custom);
  assert.equal(custom.mastersBucket, 'other-masters');
  assert.equal(custom.renditionsBucket, 'other-renditions');
});

test('requiring configuration fails loudly rather than signing with nothing', () => {
  assert.throws(() => requireR2Config({}), R2NotConfiguredError);
  assert.equal(requireR2Config(env).accountId, 'acct-123');
});

// ---------------------------------------------------------------------------
// The worker's two ends
// ---------------------------------------------------------------------------

test('a master download is a GET against the masters bucket and nothing else', () => {
  const signed = presignMasterDownload(config, masterKey, { now: fixed });
  assert.equal(signed.method, 'GET');
  assert.equal(signed.bucket, DEFAULT_MASTERS_BUCKET);
  assert.equal(signed.key, masterKey);
  assert.equal(signed.expiresInSeconds, MAX_WORKER_SECONDS);
  assert.ok(signed.url.includes(`/${DEFAULT_MASTERS_BUCKET}/${assetId}/video-mp4?`));
  assert.deepEqual(signed.requiredHeaders, {}, 'a GET carries no content type to sign');
});

test('a rendition upload is a PUT against the renditions bucket, with its type signed', () => {
  const signed = presignRenditionUpload(config, renditionKey, {
    contentType: 'video/mp4',
    now: fixed,
  });
  assert.equal(signed.method, 'PUT');
  assert.equal(signed.bucket, 'ayahspring-renditions');
  assert.equal(signed.key, renditionKey);
  assert.equal(signed.expiresInSeconds, MAX_WORKER_SECONDS);
  // The signature covers the content type, so the request fails without the
  // header. That is what keeps the type in the database the type in the bucket.
  assert.deepEqual(signed.requiredHeaders, { 'content-type': 'video/mp4' });
  assert.ok(signed.url.includes('X-Amz-Signature='));
});

test('the worker cannot cross the two buckets over', () => {
  // A rendition key is not a master key and a master key is not a rendition key,
  // so the worker can neither read a delivery copy as if it were the archive nor
  // write an encoded profile over the master it came from.
  assert.throws(() => presignMasterDownload(config, renditionKey, { now: fixed }), R2RequestError);
  assert.throws(
    () => presignRenditionUpload(config, masterKey, { contentType: 'video/mp4', now: fixed }),
    R2RequestError,
  );
});

test('a worker window is capped, like every other window here', () => {
  assert.throws(
    () => presignMasterDownload(config, masterKey, { expiresInSeconds: MAX_WORKER_SECONDS + 1 }),
    /cannot exceed/,
  );
  assert.throws(
    () =>
      presignRenditionUpload(config, renditionKey, {
        contentType: 'video/mp4',
        expiresInSeconds: MAX_WORKER_SECONDS + 1,
      }),
    /cannot exceed/,
  );
  assert.equal(
    presignMasterDownload(config, masterKey, { expiresInSeconds: 60, now: fixed }).expiresInSeconds,
    60,
  );
});

test('an upload with no declared type is refused', () => {
  assert.throws(
    () => presignRenditionUpload(config, renditionKey, { contentType: '   ', now: fixed }),
    /must declare the type it was encoded to/,
  );
});

test('a learner playback URL and a worker master download are different things', () => {
  const play = presignRenditionPlayback(config, renditionKey, { now: fixed });
  const worker = presignMasterDownload(config, masterKey, { now: fixed });
  assert.notEqual(play.bucket, worker.bucket, 'the buckets are split so a player never reaches a master');
  assert.equal(play.method, 'GET');
  assert.equal(worker.method, 'GET');
  assert.notEqual(play.url, worker.url);
});

// ---------------------------------------------------------------------------
// Saving rather than playing
// ---------------------------------------------------------------------------

test('a download URL carries a signed attachment disposition', () => {
  const signed = presignRenditionDownload(config, renditionKey, {
    filename: 'Lesson One-720p.mp4',
    now: fixed,
  });
  assert.equal(signed.method, 'GET');
  assert.equal(signed.bucket, 'ayahspring-renditions');
  assert.equal(signed.expiresInSeconds, MAX_PLAYBACK_SECONDS);
  assert.match(signed.url, /response-content-disposition=/);
  assert.match(signed.url, /attachment/);
  assert.match(signed.url, /X-Amz-Signature=/);
});

test('the disposition is inside the signature, so it cannot be added later', () => {
  const play = presignRenditionPlayback(config, renditionKey, { now: fixed });
  const save = presignRenditionDownload(config, renditionKey, {
    filename: 'Lesson One-720p.mp4',
    now: fixed,
  });
  const signatureOf = (url: string) => url.split('X-Amz-Signature=')[1];
  assert.notEqual(signatureOf(play.url), signatureOf(save.url));
  // Same object, same instant, same window — the only difference is the
  // override, and it changes the signature. A playback URL cannot be edited
  // into a download one.
  assert.equal(play.expiresInSeconds, save.expiresInSeconds);
});

test('a non-ASCII filename gets an ASCII fallback and a real name in filename*', () => {
  const signed = presignRenditionDownload(config, renditionKey, {
    filename: 'درس التجويد-480p.mp4',
    now: fixed,
  });
  const disposition = decodeURIComponent(
    signed.url.split('response-content-disposition=')[1]?.split('&')[0] ?? '',
  );
  assert.match(disposition, /filename\*=UTF-8''/, 'RFC 6266 extended form carries the real name');
  assert.match(disposition, /%D8%AF%D8%B1%D8%B3/, 'the Arabic survives, percent-encoded');
  const plain = disposition.match(/filename="([^"]*)"/)?.[1] ?? '';
  assert.equal(/[^\x20-\x7e]/.test(plain), false, 'the fallback parameter is ASCII only');
  assert.ok(plain.length > 0, 'and it is not empty, so an old client still saves something');
});

test('a quote in the filename cannot close the header value', () => {
  const signed = presignRenditionDownload(config, renditionKey, {
    filename: 'lesson"-720p.mp4',
    now: fixed,
  });
  const disposition = decodeURIComponent(
    signed.url.split('response-content-disposition=')[1]?.split('&')[0] ?? '',
  );
  const quotes = (disposition.match(/"/g) ?? []).length;
  assert.equal(quotes, 2, `expected exactly the two quotes around the fallback, got ${String(quotes)}`);
});

test('a download with no filename, or of a master key, is refused', () => {
  assert.throws(
    () => presignRenditionDownload(config, renditionKey, { filename: '   ', now: fixed }),
    /needs a filename/,
  );
  assert.throws(
    () => presignRenditionDownload(config, masterKey, { filename: 'x.mp4', now: fixed }),
    R2RequestError,
    'a master is never handed to a learner, not even as a download',
  );
  assert.throws(
    () =>
      presignRenditionDownload(config, renditionKey, {
        filename: 'x.mp4',
        expiresInSeconds: MAX_PLAYBACK_SECONDS + 1,
        now: fixed,
      }),
    /cannot exceed/,
  );
});

test('a download can also override the type the object is served as', () => {
  const signed = presignRenditionDownload(config, renditionKey, {
    filename: 'lesson.m4a',
    contentType: 'audio/mp4',
    now: fixed,
  });
  assert.match(signed.url, /response-content-type=audio%2Fmp4/);
});


// ---------------------------------------------------------------------------
// Dividing a file into parts
// ---------------------------------------------------------------------------

test('a file divides into fixed parts, and the last one is whatever is left', () => {
  const plan = planMultipartParts(33 * 1024 * 1024);
  assert.equal(plan.partBytes, MULTIPART_PART_BYTES);
  assert.equal(plan.partCount, 3);

  assert.deepEqual(multipartPartRange(plan, 1), { start: 0, end: 16 * 1024 * 1024 });
  assert.deepEqual(multipartPartRange(plan, 2), {
    start: 16 * 1024 * 1024,
    end: 32 * 1024 * 1024,
  });
  // The short tail. A plan that padded this out would ask the browser for bytes
  // the file does not have.
  assert.deepEqual(multipartPartRange(plan, 3), {
    start: 32 * 1024 * 1024,
    end: 33 * 1024 * 1024,
  });
});

test('the ceiling the database allows divides into a legal number of parts', () => {
  // 8 GiB over 16 MiB parts. Both numbers are constants; this pins that they
  // still fit inside storage's 10 000-part budget.
  const plan = planMultipartParts(8 * 1024 * 1024 * 1024);
  assert.equal(plan.partCount, 512);
  assert.ok(plan.partCount <= MAX_MULTIPART_PARTS);
});

test('a file smaller than one part is still one part, and the range is its real size', () => {
  const plan = planMultipartParts(1);
  assert.equal(plan.partCount, 1);
  // The plan keeps the standard part size; what the browser sends is the range,
  // which is a single byte here. Storage's 5 MiB floor applies to every part but
  // the last, and a one-part upload has no other part.
  assert.equal(plan.partBytes, MULTIPART_PART_BYTES);
  assert.deepEqual(multipartPartRange(plan, 1), { start: 0, end: 1 });
});

test('a part smaller than storage will accept is refused, not signed', () => {
  assert.throws(
    () => planMultipartParts(33 * 1024 * 1024, 1024 * 1024),
    /storage's own minimum/,
    'a part under 5 MiB is rejected by storage at the last one',
  );
  assert.throws(() => planMultipartParts(0), /whole number of bytes/);
  assert.throws(() => planMultipartParts(1024.5), /whole number of bytes/);
});

test('a size that would need more parts than storage assembles is refused', () => {
  assert.throws(
    () => planMultipartParts((MAX_MULTIPART_PARTS + 1) * MULTIPART_PART_BYTES),
    /at most/,
  );
});

test('a part number outside the plan is refused', () => {
  const plan = planMultipartParts(33 * 1024 * 1024);
  assert.throws(() => multipartPartRange(plan, 4), /is not one of the 3/);
  assert.throws(() => multipartPartRange(plan, 0), /is not one of the 3/);
});

// ---------------------------------------------------------------------------
// Signing one part
// ---------------------------------------------------------------------------

test('a part URL is a PUT carrying the upload id and the part number, both signed', () => {
  const plan = planMultipartParts(33 * 1024 * 1024);
  const signed = presignMasterPartUpload(config, masterKey, {
    uploadId: '2~upload-id-abc',
    partNumber: 2,
    plan,
    now: fixed,
  });

  assert.equal(signed.method, 'PUT');
  assert.equal(signed.bucket, DEFAULT_MASTERS_BUCKET);
  assert.equal(signed.key, masterKey);
  assert.equal(signed.expiresInSeconds, MAX_PART_UPLOAD_SECONDS);

  const url = new URL(signed.url);
  assert.equal(url.searchParams.get('partNumber'), '2');
  assert.equal(url.searchParams.get('uploadId'), '2~upload-id-abc');
  assert.equal(url.searchParams.get('X-Amz-Expires'), String(MAX_PART_UPLOAD_SECONDS));
  // Pinned. A part URL is a credential for one slice of one key: if the canonical
  // request ever stops including partNumber or uploadId, the same URL would serve
  // any part of any upload, and this is the line that fails.
  assert.equal(
    url.searchParams.get('X-Amz-Signature'),
    '7e94fff7bb95bbdfc7c934637e2411d515050564e3e2b0cf6d5f3926e3ce6d24',
  );
});

test('the part number is inside the signature, not merely appended to the URL', () => {
  const plan = planMultipartParts(33 * 1024 * 1024);
  const first = presignMasterPartUpload(config, masterKey, {
    uploadId: '2~upload-id-abc',
    partNumber: 1,
    plan,
    now: fixed,
  });
  const second = presignMasterPartUpload(config, masterKey, {
    uploadId: '2~upload-id-abc',
    partNumber: 2,
    plan,
    now: fixed,
  });
  const whole = presignMasterUpload(config, masterKey, { contentType: 'video/mp4', now: fixed });

  const signatureOf = (url: string) => new URL(url).searchParams.get('X-Amz-Signature');
  assert.notEqual(signatureOf(first.url), signatureOf(second.url));
  assert.notEqual(signatureOf(second.url), signatureOf(whole.url));
});

test('a part URL cannot be given a longer life than a part needs', () => {
  const plan = planMultipartParts(33 * 1024 * 1024);
  assert.throws(
    () =>
      presignMasterPartUpload(config, masterKey, {
        uploadId: '2~upload-id-abc',
        partNumber: 1,
        plan,
        expiresInSeconds: MAX_PART_UPLOAD_SECONDS + 1,
        now: fixed,
      }),
    /cannot live longer/,
  );
  assert.throws(
    () => presignMasterPartUpload(config, masterKey, { uploadId: '  ', partNumber: 1, plan, now: fixed }),
    /needs the upload it belongs to/,
  );
  assert.throws(
    () => presignMasterPartUpload(config, masterKey, { uploadId: '2~x', partNumber: 4, plan, now: fixed }),
    /is not one of the 3/,
  );
});

// ---------------------------------------------------------------------------
// The XML the browser is never asked to build
// ---------------------------------------------------------------------------

test('completing an upload is a body the server writes, with the ETags quoted', () => {
  assert.equal(
    completeMultipartUploadBody([
      { partNumber: 1, etag: '"9b2cf535"' },
      { partNumber: 2, etag: 'a54357aff0' },
    ]),
    '<CompleteMultipartUpload>' +
      '<Part><PartNumber>1</PartNumber><ETag>&quot;9b2cf535&quot;</ETag></Part>' +
      '<Part><PartNumber>2</PartNumber><ETag>&quot;a54357aff0&quot;</ETag></Part>' +
      '</CompleteMultipartUpload>',
  );
});

test('a part list with a gap or a repeat is refused before it is sent', () => {
  assert.throws(() => completeMultipartUploadBody([]), /nothing to complete/);
  assert.throws(
    () => completeMultipartUploadBody([{ partNumber: 2, etag: 'a' }]),
    /in order from 1 with no gaps/,
    'starting at part 2 would assemble a file with its first slice missing',
  );
  assert.throws(
    () =>
      completeMultipartUploadBody([
        { partNumber: 1, etag: 'a' },
        { partNumber: 3, etag: 'c' },
      ]),
    /in order from 1 with no gaps/,
  );
  assert.throws(
    () =>
      completeMultipartUploadBody([
        { partNumber: 1, etag: 'a' },
        { partNumber: 1, etag: 'b' },
      ]),
    /in order from 1 with no gaps/,
  );
  assert.throws(
    () => completeMultipartUploadBody([{ partNumber: 1, etag: '   ' }]),
    /has no ETag/,
  );
});

test('an ETag cannot break out of the element it sits in', () => {
  // Real ETags are hex, so this is defensive: the value comes from storage's own
  // response, and a body built by concatenation should not trust it.
  const body = completeMultipartUploadBody([{ partNumber: 1, etag: 'a<b>&c' }]);
  assert.ok(body.includes('<ETag>&quot;a&lt;b&gt;&amp;c&quot;</ETag>'), body);
});

test('an element is read once, or not at all', () => {
  assert.equal(xmlElementText('<r><UploadId>2~abc</UploadId></r>', 'UploadId'), '2~abc');
  assert.equal(
    xmlElementText('<r><ETag>&quot;a&amp;b&quot;</ETag></r>', 'ETag'),
    '"a&b"',
    'entities come back as the characters storage meant',
  );
  assert.throws(() => xmlElementText('<r></r>', 'UploadId'), /returned no <UploadId>/);
  assert.throws(
    () => xmlElementText('<r><UploadId>a</UploadId><UploadId>b</UploadId></r>', 'UploadId'),
    /which one is right is a guess/,
  );
  assert.throws(() => xmlElementText('<r><UploadId>  </UploadId></r>', 'UploadId'), /empty/);
  assert.throws(() => xmlElementText('<r></r>', 'Upload Id'), /not an element name/);
});

test('a multipart call targets the master key in the masters bucket', () => {
  assert.deepEqual(masterRequestTarget(config, masterKey), {
    host: 'test-account.r2.cloudflarestorage.com',
    path: `/${DEFAULT_MASTERS_BUCKET}/${masterKey}`,
  });
  assert.throws(() => masterRequestTarget(config, 'not-a-master-key'), R2RequestError);
});
