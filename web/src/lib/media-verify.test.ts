import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_MASTERS_BUCKET,
  MAX_VERIFY_SECONDS,
  presignMasterHead,
  type R2Config,
} from './media-r2.ts';
import { confirmMediaUpload, type MasterRow } from './media-verify.ts';

const assetId = '4f30fd1d-6f2c-4c1e-9a5b-0d2f6c8a1b23';
const masterKey = `${assetId}/video-mp4`;
const fixed = new Date('2026-10-20T09:00:00.000Z');

const config: R2Config = {
  accountId: 'acct-123',
  credentials: { accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key' },
  mastersBucket: DEFAULT_MASTERS_BUCKET,
  renditionsBucket: 'ayahspring-renditions',
};

function row(over: Partial<MasterRow> = {}): MasterRow {
  return {
    id: assetId,
    master_bucket: DEFAULT_MASTERS_BUCKET,
    master_key: masterKey,
    byte_size: 10_485_760,
    checksum: 'a'.repeat(64),
    status: 'pending',
    ...over,
  };
}

type StubOptions = {
  row?: MasterRow | null;
  selectError?: string;
  rpcError?: string;
  rpcResult?: unknown;
};

function stubClient(options: StubOptions = {}) {
  const calls: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    eq: (column: string, value: unknown) => {
      calls.push(`eq:${column}=${String(value)}`);
      return chain;
    },
    maybeSingle: async () => {
      calls.push('select');
      return options.selectError
        ? { data: null, error: { message: options.selectError } }
        : { data: options.row === undefined ? row() : options.row, error: null };
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    from: (table: string) => {
      calls.push(`from:${table}`);
      return chain;
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push(`rpc:${name}:${JSON.stringify(args)}`);
      if (options.rpcError) return { data: null, error: { message: options.rpcError } };
      return { data: options.rpcResult === undefined ? true : options.rpcResult, error: null };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls };
}

/** A storage double that records the request and answers from a script. */
function stubStorage(answer: {
  status?: number;
  contentLength?: number | null;
  throws?: boolean;
}) {
  const requests: Array<{ url: string; method: string }> = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    requests.push({ url: String(url), method: String(init?.method ?? 'GET') });
    if (answer.throws) throw new Error('network unreachable');
    const headers = new Headers();
    if (answer.contentLength !== null && answer.contentLength !== undefined) {
      headers.set('content-length', String(answer.contentLength));
    }
    const status = answer.status ?? 200;
    return { ok: status >= 200 && status < 300, status, headers } as unknown as Response;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  return { fetchImpl, requests };
}

// ---------------------------------------------------------------------------
// The HEAD itself
// ---------------------------------------------------------------------------

test('a verification is a short-lived HEAD against the masters bucket', () => {
  const signed = presignMasterHead(config, masterKey, { now: fixed });
  assert.equal(signed.method, 'HEAD');
  assert.equal(signed.bucket, DEFAULT_MASTERS_BUCKET);
  assert.equal(signed.key, masterKey);
  assert.equal(signed.expiresInSeconds, MAX_VERIFY_SECONDS);
  assert.ok(signed.url.includes(`/${DEFAULT_MASTERS_BUCKET}/${masterKey}?`));
  assert.match(signed.url, /X-Amz-Signature=/);
});

test('a verification window is the shortest here, and cannot be lengthened', () => {
  assert.ok(MAX_VERIFY_SECONDS < 3600, 'a HEAD does not need an hour');
  assert.throws(
    () => presignMasterHead(config, masterKey, { expiresInSeconds: MAX_VERIFY_SECONDS + 1 }),
    /cannot exceed/,
  );
});

test('a HEAD cannot be signed for a rendition key', () => {
  assert.throws(
    () => presignMasterHead(config, `${masterKey}/720p`, { now: fixed }),
    /not derived from a media asset/,
  );
});

// ---------------------------------------------------------------------------
// Confirming an upload
// ---------------------------------------------------------------------------

await test('an upload is confirmed once storage says the file is there at the declared size', async () => {
  const { client, calls } = stubClient({ row: row() });
  const storage = stubStorage({ status: 200, contentLength: 10_485_760 });

  const outcome = await confirmMediaUpload(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
    now: fixed,
  });

  assert.deepEqual(outcome, { ok: true, verifiedBytes: 10_485_760, assetId });
  assert.equal(storage.requests.length, 1);
  assert.equal(storage.requests[0]?.method, 'HEAD');
  assert.ok(
    storage.requests[0]?.url.includes(masterKey),
    'the object checked is the one the row points at',
  );
  assert.ok(
    calls.some((c) => c === `rpc:confirm_media_upload:{"p_asset_id":"${assetId}"}`),
    'the database was asked to confirm',
  );
});

await test('a file that never arrived is not confirmed', async () => {
  const { client, calls } = stubClient({ row: row() });
  const storage = stubStorage({ status: 404, contentLength: null });

  const outcome = await confirmMediaUpload(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok);
  assert.equal(outcome.status, 409, 'not a permissions problem and not our fault');
  assert.match(outcome.message, /never arrived/);
  assert.equal(calls.some((c) => c.startsWith('rpc:')), false, 'nothing was confirmed');
});

await test('a file whose size does not match is not confirmed', async () => {
  const { client, calls } = stubClient({ row: row({ byte_size: 10_485_760 }) });
  // A truncated or half-uploaded object. Publishing it would give learners a
  // file that stops in the middle of a lesson.
  const storage = stubStorage({ status: 200, contentLength: 4_000_000 });

  const outcome = await confirmMediaUpload(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok);
  assert.equal(outcome.status, 409);
  assert.match(outcome.message, /4000000/);
  assert.match(outcome.message, /10485760/);
  assert.equal(calls.some((c) => c.startsWith('rpc:')), false);
});

await test('a size that arrives as a string still compares correctly', async () => {
  const { client } = stubClient({ row: row({ byte_size: '10485760' }) });
  const storage = stubStorage({ status: 200, contentLength: 10_485_760 });

  const outcome = await confirmMediaUpload(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });
  assert.equal(outcome.ok, true, 'a bigint column can arrive as a string');
});

await test('storage that cannot be reached is our problem, not the teacher\'s', async () => {
  const { client, calls } = stubClient({ row: row() });
  const storage = stubStorage({ throws: true });

  const outcome = await confirmMediaUpload(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok);
  assert.equal(outcome.status, 503);
  assert.match(outcome.message, /still pending/);
  assert.equal(calls.some((c) => c.startsWith('rpc:')), false);
});

await test('a storage error and a missing size are each reported as a bad gateway', async () => {
  const boom = stubClient({ row: row() });
  const boomOutcome = await confirmMediaUpload(boom.client, assetId, {
    config,
    fetchImpl: stubStorage({ status: 500, contentLength: null }).fetchImpl,
  });
  assert.equal(boomOutcome.ok, false);
  assert.ok(!boomOutcome.ok);
  assert.equal(boomOutcome.status, 502);
  assert.match(boomOutcome.message, /500/);

  const silent = stubClient({ row: row() });
  const silentOutcome = await confirmMediaUpload(silent.client, assetId, {
    config,
    fetchImpl: stubStorage({ status: 200, contentLength: null }).fetchImpl,
  });
  assert.equal(silentOutcome.ok, false);
  assert.ok(!silentOutcome.ok);
  assert.equal(silentOutcome.status, 502);
  assert.match(silentOutcome.message, /did not report a size/);
});

await test('no request is made for a row that is not there, or is not pending', async () => {
  const missing = stubClient({ row: null });
  const missingStorage = stubStorage({ status: 200, contentLength: 1 });
  const missingOutcome = await confirmMediaUpload(missing.client, assetId, {
    config,
    fetchImpl: missingStorage.fetchImpl,
  });
  assert.equal(missingOutcome.ok, false);
  assert.ok(!missingOutcome.ok);
  assert.equal(missingOutcome.status, 404);
  assert.equal(missingStorage.requests.length, 0, 'nothing is asked of storage');

  for (const status of ['available', 'quarantined', 'deleted']) {
    const done = stubClient({ row: row({ status }) });
    const storage = stubStorage({ status: 200, contentLength: 10_485_760 });
    const outcome = await confirmMediaUpload(done.client, assetId, {
      config,
      fetchImpl: storage.fetchImpl,
    });
    assert.equal(outcome.ok, false, status);
    assert.ok(!outcome.ok);
    assert.equal(outcome.status, 409, status);
    assert.match(outcome.message, new RegExp(status));
    assert.equal(storage.requests.length, 0, `no HEAD for a ${status} master`);
  }
});

await test('a row pointing at another bucket is a configuration fault, not a refusal', async () => {
  const { client } = stubClient({ row: row({ master_bucket: 'some-other-bucket' }) });
  const storage = stubStorage({ status: 200, contentLength: 10_485_760 });

  const outcome = await confirmMediaUpload(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok);
  assert.equal(outcome.status, 503);
  assert.match(outcome.message, /misconfigured/);
  assert.equal(storage.requests.length, 0, 'signing a HEAD for the wrong bucket proves nothing');
});

await test('a permissions refusal from the database is a 403, whatever its wording', async () => {
  for (const message of [
    'only staff may confirm an upload',
    'only platform staff may confirm an upload',
    'insufficient privilege',
  ]) {
    const { client } = stubClient({ row: row(), rpcError: message });
    const outcome = await confirmMediaUpload(client, assetId, {
      config,
      fetchImpl: stubStorage({ status: 200, contentLength: 10_485_760 }).fetchImpl,
    });
    assert.equal(outcome.ok, false, message);
    assert.ok(!outcome.ok);
    assert.equal(outcome.status, 403, `${message} was not reported as a permissions problem`);
  }
});

await test('a database that confirms nothing is reported rather than treated as success', async () => {
  const { client } = stubClient({ row: row(), rpcResult: false });
  const outcome = await confirmMediaUpload(client, assetId, {
    config,
    fetchImpl: stubStorage({ status: 200, contentLength: 10_485_760 }).fetchImpl,
  });
  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok);
  assert.equal(outcome.status, 409);
  assert.match(outcome.message, /did not confirm/);
});

await test('a failed row read is an error, not a missing file', async () => {
  const { client } = stubClient({ selectError: 'permission denied for table media_assets' });
  const storage = stubStorage({ status: 200, contentLength: 1 });
  const outcome = await confirmMediaUpload(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });
  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok);
  assert.equal(outcome.status, 500);
  assert.equal(storage.requests.length, 0);
});

await test('a key that is not a master key is refused before any request', async () => {
  const { client } = stubClient({ row: row({ master_key: `${masterKey}/720p` }) });
  const storage = stubStorage({ status: 200, contentLength: 10_485_760 });
  const outcome = await confirmMediaUpload(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });
  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok);
  assert.equal(outcome.status, 503);
  assert.equal(storage.requests.length, 0);
});
