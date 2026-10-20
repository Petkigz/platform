import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  ALGORITHM,
  DEFAULT_MASTERS_BUCKET,
  MAX_PLAYBACK_SECONDS,
  MAX_UPLOAD_SECONDS,
  R2NotConfiguredError,
  R2RequestError,
  amzDateParts,
  assertMasterKey,
  assertRenditionKey,
  canonicalQuery,
  isR2Configured,
  presignMasterUpload,
  presignRenditionPlayback,
  presignUrl,
  r2Endpoint,
  readR2Config,
  requireR2Config,
  signRequest,
  uriEncode,
  validateUploadRequest,
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
// The upload request
// ---------------------------------------------------------------------------

const checksum = 'a'.repeat(64);

test('a well-formed upload request is normalised, not just accepted', () => {
  const result = validateUploadRequest({ mimeType: ' VIDEO/MP4 ', byteSize: '1048576', checksum: checksum.toUpperCase(), durationSeconds: '600' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value, { mimeType: 'video/mp4', byteSize: 1048576, checksum, durationSeconds: 600 });
});

test('a duration may be absent, which is how a document arrives', () => {
  for (const durationSeconds of [null, undefined, '']) {
    const result = validateUploadRequest({ mimeType: 'application/pdf', byteSize: 2048, checksum, durationSeconds });
    assert.equal(result.ok, true, `duration ${String(durationSeconds)} was refused`);
    if (result.ok) assert.equal(result.value.durationSeconds, null);
  }
});

test('the same refusals the database makes are made first, in words', () => {
  const cases: Array<[unknown, string]> = [
    [{ byteSize: 10, checksum }, 'A file needs a type.'],
    [{ mimeType: 'not-a-type', byteSize: 10, checksum }, 'That is not a MIME type.'],
    [{ mimeType: 'video/mp4', byteSize: 0, checksum }, 'whole number of bytes'],
    [{ mimeType: 'video/mp4', byteSize: 1.5, checksum }, 'whole number of bytes'],
    [{ mimeType: 'video/mp4', byteSize: 'lots', checksum }, 'whole number of bytes'],
    [{ mimeType: 'video/mp4', byteSize: 10, checksum: 'abc' }, '64-character lowercase hex'],
    [{ mimeType: 'video/mp4', byteSize: 10, checksum: 'A'.repeat(63) }, '64-character lowercase hex'],
    [{ mimeType: 'video/mp4', byteSize: 10, checksum, durationSeconds: -1 }, 'whole number of seconds'],
    [{ mimeType: 'video/mp4', byteSize: 10, checksum, durationSeconds: 1.5 }, 'whole number of seconds'],
    [null, 'An upload request is missing.'],
  ];
  for (const [body, expected] of cases) {
    const result = validateUploadRequest(body);
    assert.equal(result.ok, false, `${JSON.stringify(body)} was accepted`);
    if (result.ok) continue;
    assert.match(result.message, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
