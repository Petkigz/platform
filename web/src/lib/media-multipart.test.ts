import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_MASTERS_BUCKET,
  MULTIPART_PART_BYTES,
  sha256Hex,
  type R2Config,
} from './media-r2.ts';
import {
  MAX_LISTING_PAGES,
  MAX_PARTS_PER_BATCH,
  abortMasterMultipart,
  abandonUnfinishedUpload,
  completeMasterMultipart,
  initiateMasterMultipart,
  listUnfinishedMasterUploads,
  resumeMasterMultipart,
  signMasterPartUploads,
  type MasterUploadRow,
} from './media-multipart.ts';

const assetId = '4f30fd1d-6f2c-4c1e-9a5b-0d2f6c8a1b23';
const masterKey = `${assetId}/video-mp4`;
const uploadId = '2~upload-id-from-storage';
const fixed = new Date('2026-10-20T09:00:00.000Z');

/** 33 MiB: three parts, the last one a megabyte short. */
const byteSize = 33 * 1024 * 1024;

const config: R2Config = {
  accountId: 'acct-123',
  credentials: { accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key' },
  mastersBucket: DEFAULT_MASTERS_BUCKET,
  renditionsBucket: 'ayahspring-renditions',
};

function row(over: Partial<MasterUploadRow> = {}): MasterUploadRow {
  return {
    id: assetId,
    master_bucket: DEFAULT_MASTERS_BUCKET,
    master_key: masterKey,
    byte_size: byteSize,
    mime_type: 'video/mp4',
    status: 'pending',
    ...over,
  };
}

type StubOptions = {
  row?: MasterUploadRow | null;
  selectError?: string;
  rpcError?: string;
};

/**
 * A client that answers one SELECT. The row is read fresh on every call rather
 * than held, and the stub keeps that property: mutating the row object between
 * calls changes what the next call sees.
 */
function stubClient(options: StubOptions = {}) {
  const calls: string[] = [];
  const theRow = options.row === undefined ? row() : options.row;
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
    maybeSingle: async () => {
      calls.push('maybeSingle');
      return options.selectError
        ? { data: null, error: { message: options.selectError } }
        : { data: theRow, error: null };
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
      return options.rpcError ? { error: { message: options.rpcError } } : { error: null };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, calls, row: theRow };
}

type StorageAnswer = {
  status?: number;
  xml?: string;
  throws?: boolean;
};

function stubStorage(answer: StorageAnswer = {}) {
  const requests: Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | undefined;
  }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchImpl = (async (url: string, init?: any) => {
    requests.push({
      url: String(url),
      method: String(init?.method ?? 'GET'),
      headers: { ...(init?.headers as Record<string, string>) },
      body: init?.body === undefined ? undefined : String(init.body),
    });
    if (answer.throws) throw new Error('network unreachable');
    const status = answer.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => answer.xml ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  return { fetchImpl, requests };
}

/**
 * Storage answering a script, one answer per request.
 *
 * A resume is two different documents — a listing of uploads and then a listing
 * of parts — so a single canned response cannot describe it.
 */
function scriptedStorage(script: StorageAnswer[]) {
  const requests: Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | undefined;
  }> = [];
  let index = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchImpl = (async (url: string, init?: any) => {
    requests.push({
      url: String(url),
      method: String(init?.method ?? 'GET'),
      headers: { ...(init?.headers as Record<string, string>) },
      body: init?.body === undefined ? undefined : String(init.body),
    });
    const answer = script[Math.min(index, script.length - 1)] ?? {};
    index += 1;
    if (answer.throws) throw new Error('network unreachable');
    const status = answer.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => answer.xml ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  return { fetchImpl, requests };
}

const initiateXml = `<InitiateMultipartUploadResult><Bucket>${DEFAULT_MASTERS_BUCKET}</Bucket><Key>${masterKey}</Key><UploadId>${uploadId}</UploadId></InitiateMultipartUploadResult>`;

// ---------------------------------------------------------------------------
// Opening the upload
// ---------------------------------------------------------------------------

test('opening an upload asks storage for the id and divides the declared size', async () => {
  const { client, calls } = stubClient();
  const storage = stubStorage({ xml: initiateXml });

  const outcome = await initiateMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
    now: fixed,
  });

  assert.deepEqual(outcome, {
    ok: true,
    value: { uploadId, partBytes: MULTIPART_PART_BYTES, partCount: 3 },
  });
  assert.equal(storage.requests.length, 1);
  const request = storage.requests[0];
  assert.equal(request?.method, 'POST');
  assert.ok(request?.url.endsWith(`?uploads=`), request?.url);
  assert.ok(request?.url.includes(`/${DEFAULT_MASTERS_BUCKET}/${masterKey}`), request?.url);
  // The declared type travels on the initiate call, which is where the object's
  // content type is recorded; parts carry bytes only.
  assert.equal(request?.headers['content-type'], 'video/mp4');
  assert.deepEqual(calls, [
    `from:media_assets`,
    'select:id, master_bucket, master_key, byte_size, mime_type, status',
    `eq:id=${assetId}`,
    'maybeSingle',
  ]);
});

test('the upload id comes from storage, never from the caller', async () => {
  // A client that claims a different id still gets storage's. Nothing downstream
  // trusts the browser to name the upload it is writing into.
  const { client } = stubClient();
  const storage = stubStorage({ xml: initiateXml });

  const outcome = await initiateMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
    now: fixed,
  });
  assert.ok(outcome.ok);
  assert.equal(outcome.value.uploadId, uploadId);
});

test('a master that is not there, or not yours, is the same answer', async () => {
  // The SELECT runs on the caller's own client, so the policy has already hidden
  // somebody else's master. One message for both keeps "exists but not yours"
  // from being a thing a caller can discover.
  const { client } = stubClient({ row: null });
  const storage = stubStorage({ xml: initiateXml });

  const outcome = await initiateMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.deepEqual(outcome, {
    ok: false,
    message: 'That upload does not exist.',
    status: 404,
  });
  assert.equal(storage.requests.length, 0, 'nothing is sent to storage for a row that is not readable');
});

test('a master that is no longer pending cannot take more bytes', async () => {
  const { client } = stubClient({ row: row({ status: 'available' }) });
  const storage = stubStorage({ xml: initiateXml });

  const outcome = await initiateMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.deepEqual(outcome, {
    ok: false,
    message: 'That file is already available, so there is nothing left to upload.',
    status: 409,
  });
  assert.equal(storage.requests.length, 0);
});

test('a row whose bucket is not the one this deployment signs for is a 503', async () => {
  const { client } = stubClient({ row: row({ master_bucket: 'some-other-bucket' }) });
  const storage = stubStorage({ xml: initiateXml });

  const outcome = await initiateMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.status, 503);
    assert.match(outcome.message, /misconfigured/);
  }
  assert.equal(storage.requests.length, 0);
});

test('a size that cannot be divided is refused before anything is sent', async () => {
  for (const broken of [0, -1, 'abc', 1024.5]) {
    const { client } = stubClient({ row: row({ byte_size: broken as number }) });
    const storage = stubStorage({ xml: initiateXml });

    const outcome = await initiateMasterMultipart(client, assetId, {
      config,
      fetchImpl: storage.fetchImpl,
    });

    assert.equal(outcome.ok, false, `byte_size ${String(broken)}`);
    if (!outcome.ok) assert.equal(outcome.status, 409);
    assert.equal(storage.requests.length, 0);
  }
});

test('a size the database would never have registered is refused with the reason', async () => {
  // register_media_upload caps the declared size, so this is defence in depth:
  // a part list storage would reject at the last part is worse than a sentence.
  const { client } = stubClient({ row: row({ byte_size: 10_001 * MULTIPART_PART_BYTES }) });
  const storage = stubStorage({ xml: initiateXml });

  const outcome = await initiateMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.status, 409);
    assert.match(outcome.message, /at most/);
  }
});

test('a row that cannot be read is a 500, not a guess', async () => {
  const { client } = stubClient({ selectError: 'permission denied for table media_assets' });
  const storage = stubStorage({ xml: initiateXml });

  const outcome = await initiateMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.deepEqual(outcome, {
    ok: false,
    message: 'permission denied for table media_assets',
    status: 500,
  });
});

// ---------------------------------------------------------------------------
// What storage says when it refuses
// ---------------------------------------------------------------------------

test('storage refusing, failing, or being unreachable are three different answers', async () => {
  const cases: Array<{ answer: StorageAnswer; status: number; matches: RegExp }> = [
    { answer: { status: 403 }, status: 409, matches: /refused the POST \(403\)/ },
    { answer: { status: 404 }, status: 409, matches: /refused the POST \(404\)/ },
    { answer: { status: 500 }, status: 502, matches: /answered 500 to the POST/ },
    { answer: { throws: true }, status: 503, matches: /could not be reached/ },
  ];

  for (const item of cases) {
    const { client } = stubClient();
    const storage = stubStorage(item.answer);

    const outcome = await initiateMasterMultipart(client, assetId, {
      config,
      fetchImpl: storage.fetchImpl,
    });

    assert.equal(outcome.ok, false, JSON.stringify(item.answer));
    if (!outcome.ok) {
      assert.equal(outcome.status, item.status, JSON.stringify(item.answer));
      assert.match(outcome.message, item.matches);
      // Every refusal says the row is still pending, because it is: nothing here
      // writes to the database, so a failure leaves the teacher able to try again.
      assert.match(outcome.message, /still pending/);
    }
  }
});

test('an opened upload with no id in the response is a failure, not a blank id', async () => {
  const { client } = stubClient();
  const storage = stubStorage({ xml: '<InitiateMultipartUploadResult></InitiateMultipartUploadResult>' });

  const outcome = await initiateMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.status, 502);
    assert.match(outcome.message, /did not return an id/);
  }
});

// ---------------------------------------------------------------------------
// The request itself
// ---------------------------------------------------------------------------

test('host is signed but not sent, and the payload hash is of the bytes actually sent', async () => {
  const { client } = stubClient();
  const storage = stubStorage({ xml: '<CompleteMultipartUploadResult><ETag>&quot;final&quot;</ETag></CompleteMultipartUploadResult>' });
  const parts = [
    { partNumber: 1, etag: 'aaa' },
    { partNumber: 2, etag: 'bbb' },
    { partNumber: 3, etag: 'ccc' },
  ];

  const outcome = await completeMasterMultipart(client, assetId, uploadId, parts, {
    config,
    fetchImpl: storage.fetchImpl,
    now: fixed,
  });
  assert.equal(outcome.ok, true);

  const request = storage.requests[0];
  assert.ok(request, 'one request was made');
  // undici sets Host from the URL; sending a second one would sign a header the
  // request does not carry.
  assert.ok(!('host' in (request?.headers ?? {})), JSON.stringify(request?.headers));
  assert.ok(request?.headers['authorization']?.startsWith('AWS4-HMAC-SHA256'));
  assert.equal(request?.headers['x-amz-date'], '20261020T090000Z');
  assert.equal(request?.headers['x-amz-content-sha256'], sha256Hex(request?.body ?? ''));
});

// ---------------------------------------------------------------------------
// Signing parts
// ---------------------------------------------------------------------------

test('a batch of parts comes back signed, in order, with the bytes each one covers', async () => {
  const { client } = stubClient();

  const outcome = await signMasterPartUploads(client, assetId, uploadId, [2, 3], {
    config,
    now: fixed,
  });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.deepEqual(
    outcome.value.parts.map((part) => ({
      partNumber: part.partNumber,
      method: part.method,
      start: part.start,
      end: part.end,
      expiresInSeconds: part.expiresInSeconds,
    })),
    [
      {
        partNumber: 2,
        method: 'PUT',
        start: MULTIPART_PART_BYTES,
        end: 2 * MULTIPART_PART_BYTES,
        expiresInSeconds: 900,
      },
      {
        partNumber: 3,
        method: 'PUT',
        start: 2 * MULTIPART_PART_BYTES,
        end: byteSize,
        expiresInSeconds: 900,
      },
    ],
  );
  for (const part of outcome.value.parts) {
    const url = new URL(part.url);
    assert.equal(url.searchParams.get('uploadId'), uploadId);
    assert.equal(url.searchParams.get('partNumber'), String(part.partNumber));
    assert.ok(url.searchParams.get('X-Amz-Signature'), 'each part is signed on its own');
  }
});

test('a batch is capped, because the parts are signed again as the upload goes', async () => {
  const { client } = stubClient({ row: row({ byte_size: 200 * MULTIPART_PART_BYTES }) });
  const tooMany = Array.from({ length: MAX_PARTS_PER_BATCH + 1 }, (_, index) => index + 1);

  const outcome = await signMasterPartUploads(client, assetId, uploadId, tooMany, { config });

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.status, 400);
    assert.match(outcome.message, /At most 32 part URLs/);
  }
});

test('the obvious mistakes in a part request are refused', async () => {
  const refusals: Array<{ id: string; parts: number[]; matches: RegExp }> = [
    { id: uploadId, parts: [], matches: /at least one part/ },
    { id: '  ', parts: [1], matches: /no id/ },
    { id: uploadId, parts: [1, 1], matches: /asked for twice/ },
    { id: uploadId, parts: [4], matches: /is not one of the 3/ },
  ];

  for (const refusal of refusals) {
    const { client } = stubClient();
    const outcome = await signMasterPartUploads(client, assetId, refusal.id, refusal.parts, {
      config,
    });
    assert.equal(outcome.ok, false, JSON.stringify(refusal));
    if (!outcome.ok) {
      assert.equal(outcome.status, 400, JSON.stringify(refusal));
      assert.match(outcome.message, refusal.matches);
    }
  }
});

test('a master withdrawn mid-upload stops being uploadable at the next batch', async () => {
  const { client, row: theRow } = stubClient();

  const first = await signMasterPartUploads(client, assetId, uploadId, [1], { config });
  assert.equal(first.ok, true);

  // Somebody quarantined the master while part one was in flight. The row is read
  // again rather than remembered, so the next batch is refused instead of
  // completing an upload that should not have finished.
  if (theRow) theRow.status = 'quarantined';

  const second = await signMasterPartUploads(client, assetId, uploadId, [2], { config });
  assert.equal(second.ok, false);
  if (!second.ok) {
    assert.equal(second.status, 409);
    assert.match(second.message, /already quarantined/);
  }
});

// ---------------------------------------------------------------------------
// Completing
// ---------------------------------------------------------------------------

test('completing sends the whole plan, as XML, and gets the object ETag back', async () => {
  const { client } = stubClient();
  const storage = stubStorage({
    xml: `<CompleteMultipartUploadResult><Location>https://x</Location><Bucket>${DEFAULT_MASTERS_BUCKET}</Bucket><Key>${masterKey}</Key><ETag>&quot;9b2cf535-3&quot;</ETag></CompleteMultipartUploadResult>`,
  });

  const outcome = await completeMasterMultipart(
    client,
    assetId,
    uploadId,
    [
      { partNumber: 1, etag: '"aaa"' },
      { partNumber: 2, etag: 'bbb' },
      { partNumber: 3, etag: 'ccc' },
    ],
    { config, fetchImpl: storage.fetchImpl, now: fixed },
  );

  assert.deepEqual(outcome, { ok: true, value: { etag: '9b2cf535-3', byteSize } });
  const request = storage.requests[0];
  assert.equal(request?.method, 'POST');
  // `~` is unreserved, so the id goes on the wire as it was signed.
  assert.ok(request?.url.includes(`uploadId=${uploadId}`), request?.url);
  assert.equal(request?.headers['content-type'], 'application/xml');
  assert.equal(
    request?.body,
    '<CompleteMultipartUpload>' +
      '<Part><PartNumber>1</PartNumber><ETag>&quot;aaa&quot;</ETag></Part>' +
      '<Part><PartNumber>2</PartNumber><ETag>&quot;bbb&quot;</ETag></Part>' +
      '<Part><PartNumber>3</PartNumber><ETag>&quot;ccc&quot;</ETag></Part>' +
      '</CompleteMultipartUpload>',
  );
});

test('completing with fewer parts than the plan is refused', async () => {
  // Storage would accept it and assemble a shorter object, while the row still
  // declares 33 MiB. That is a lesson that stops in the middle, found later by a
  // staff member comparing sizes rather than now by a sentence.
  const { client } = stubClient();
  const storage = stubStorage({ xml: '<CompleteMultipartUploadResult><ETag>x</ETag></CompleteMultipartUploadResult>' });

  const outcome = await completeMasterMultipart(
    client,
    assetId,
    uploadId,
    [
      { partNumber: 1, etag: 'aaa' },
      { partNumber: 2, etag: 'bbb' },
    ],
    { config, fetchImpl: storage.fetchImpl },
  );

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.status, 409);
    assert.match(outcome.message, /3 parts and 2 arrived/);
    assert.match(outcome.message, /still pending/);
  }
  assert.equal(storage.requests.length, 0, 'nothing is assembled from a short list');
});

test('a complete response that cannot be read is still a success', async () => {
  // The object exists whether or not its ETag is parseable. Reporting a failure
  // here would send the teacher back to upload 33 MiB again for a file that is
  // already whole; the staff verification step reads the real size from storage.
  const { client } = stubClient();
  const storage = stubStorage({ xml: '<CompleteMultipartUploadResult></CompleteMultipartUploadResult>' });

  const outcome = await completeMasterMultipart(
    client,
    assetId,
    uploadId,
    [
      { partNumber: 1, etag: 'aaa' },
      { partNumber: 2, etag: 'bbb' },
      { partNumber: 3, etag: 'ccc' },
    ],
    { config, fetchImpl: storage.fetchImpl },
  );

  assert.deepEqual(outcome, { ok: true, value: { etag: '', byteSize } });
});

test('completing needs an id', async () => {
  const { client } = stubClient();
  const outcome = await completeMasterMultipart(client, assetId, ' ', [], { config });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.status, 400);
});

// ---------------------------------------------------------------------------
// Aborting
// ---------------------------------------------------------------------------

test('giving up deletes the parts, and says so', async () => {
  const { client } = stubClient();
  const storage = stubStorage({ status: 204, xml: '' });

  const outcome = await abortMasterMultipart(client, assetId, uploadId, {
    config,
    fetchImpl: storage.fetchImpl,
    now: fixed,
  });

  assert.deepEqual(outcome, { ok: true, value: { aborted: true } });
  const request = storage.requests[0];
  assert.equal(request?.method, 'DELETE');
  assert.ok(request?.url.includes(`uploadId=${uploadId}`), request?.url);
});

test('an abort that storage refuses is reported, and the row is untouched', async () => {
  // Storage also aborts an incomplete upload on its own lifecycle after seven
  // days, so a refusal here costs a week of storage for bytes nobody will
  // assemble. It is worth reporting and not worth retrying.
  const { client } = stubClient();
  const storage = stubStorage({ status: 500 });

  const outcome = await abortMasterMultipart(client, assetId, uploadId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.status, 502);
    assert.match(outcome.message, /still pending/);
  }
});

test('there is nothing to abort without an id', async () => {
  const { client } = stubClient();
  const outcome = await abortMasterMultipart(client, assetId, '', { config });
  assert.deepEqual(outcome, {
    ok: false,
    message: 'That upload has no id, so there is nothing to abort.',
    status: 400,
  });
});

// ---------------------------------------------------------------------------
// Finding an upload nobody finished
// ---------------------------------------------------------------------------

const MiB = 1024 * 1024;

/** 33 MiB over 16 MiB parts: three parts, the last one a megabyte. */
const plan = { partBytes: 16 * MiB, partCount: 3, lastPartBytes: 1 * MiB };

function listingOf(
  uploads: Array<{ key: string; id: string; initiated?: string }>,
  over: { truncated?: boolean; nextKey?: string; nextId?: string } = {},
): string {
  return (
    `<ListMultipartUploadsResult><Bucket>${DEFAULT_MASTERS_BUCKET}</Bucket>` +
    '<KeyMarker></KeyMarker><UploadIdMarker></UploadIdMarker>' +
    (over.truncated
      ? `<NextKeyMarker>${over.nextKey ?? ''}</NextKeyMarker><NextUploadIdMarker>${over.nextId ?? ''}</NextUploadIdMarker>`
      : '') +
    `<MaxUploads>1000</MaxUploads><IsTruncated>${over.truncated ? 'true' : 'false'}</IsTruncated>` +
    uploads
      .map(
        (upload) =>
          `<Upload><Key>${upload.key}</Key><UploadId>${upload.id}</UploadId>` +
          (upload.initiated ? `<Initiated>${upload.initiated}</Initiated>` : '') +
          '<StorageClass>STANDARD</StorageClass></Upload>',
      )
      .join('') +
    '</ListMultipartUploadsResult>'
  );
}

function partsOf(
  parts: Array<{ n: number; etag: string; size: number }>,
  over: { truncated?: boolean; next?: number } = {},
): string {
  return (
    `<ListPartsResult><Bucket>${DEFAULT_MASTERS_BUCKET}</Bucket><Key>${masterKey}</Key>` +
    '<UploadId>2~first</UploadId><PartNumberMarker>0</PartNumberMarker>' +
    (over.truncated ? `<NextPartNumberMarker>${String(over.next ?? 0)}</NextPartNumberMarker>` : '') +
    `<MaxParts>1000</MaxParts><IsTruncated>${over.truncated ? 'true' : 'false'}</IsTruncated>` +
    parts
      .map(
        (part) =>
          `<Part><PartNumber>${String(part.n)}</PartNumber>` +
          '<LastModified>2026-10-19T08:00:00.000Z</LastModified>' +
          `<ETag>&quot;${part.etag}&quot;</ETag><Size>${String(part.size)}</Size></Part>`,
      )
      .join('') +
    '</ListPartsResult>'
  );
}

const query = (url: string, name: string) => new URL(url).searchParams.get(name);

test('a stalled upload is found in the bucket, and its parts come from storage', async () => {
  const { client } = stubClient();
  const storage = scriptedStorage([
    { xml: listingOf([{ key: masterKey, id: '2~first', initiated: '2026-10-19T08:00:00.000Z' }]) },
    {
      xml: partsOf([
        { n: 1, etag: 'aaa', size: plan.partBytes },
        { n: 2, etag: 'bbb', size: plan.partBytes },
      ]),
    },
  ]);

  const outcome = await resumeMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
    now: fixed,
  });

  assert.deepEqual(outcome, {
    ok: true,
    value: {
      uploadId: '2~first',
      partBytes: plan.partBytes,
      partCount: plan.partCount,
      uploadedParts: [
        { partNumber: 1, etag: '"aaa"', size: plan.partBytes },
        { partNumber: 2, etag: '"bbb"', size: plan.partBytes },
      ],
      uploadedBytes: 32 * MiB,
      note: null,
    },
  });

  assert.equal(storage.requests.length, 2);
  const listing = storage.requests[0];
  assert.equal(listing?.method, 'GET');
  assert.equal(query(String(listing?.url), 'prefix'), masterKey);
  assert.equal(query(String(listing?.url), 'max-uploads'), '1000');
  assert.ok(String(listing?.url).includes('uploads='), listing?.url);
  assert.ok(
    String(listing?.url).includes(`/ayahspring-masters?`),
    `the listing is of the bucket, not of one object: ${String(listing?.url)}`,
  );
  const parts = storage.requests[1];
  assert.equal(query(String(parts?.url), 'uploadId'), '2~first');
  assert.equal(query(String(parts?.url), 'max-parts'), '1000');
  assert.ok(String(parts?.url).includes(`/${DEFAULT_MASTERS_BUCKET}/${masterKey}?`), parts?.url);
});

test('a row with nothing in flight is reusable, and says nothing was found', async () => {
  const { client } = stubClient();
  const storage = scriptedStorage([{ xml: listingOf([]) }]);

  const outcome = await resumeMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.deepEqual(outcome, {
    ok: true,
    value: {
      uploadId: null,
      partBytes: plan.partBytes,
      partCount: plan.partCount,
      uploadedParts: [],
      uploadedBytes: 0,
      note: null,
    },
  });
  // No parts are listed for an upload that does not exist.
  assert.equal(storage.requests.length, 1);
});

test('the newest of several stalled uploads is the one continued', async () => {
  const { client } = stubClient();
  const storage = scriptedStorage([
    {
      xml: listingOf([
        { key: masterKey, id: '2~older', initiated: '2026-10-18T08:00:00.000Z' },
        { key: masterKey, id: '2~newer', initiated: '2026-10-20T08:00:00.000Z' },
      ]),
    },
    { xml: partsOf([{ n: 1, etag: 'aaa', size: plan.partBytes }]) },
  ]);

  const outcome = await resumeMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.value.uploadId, '2~newer');
  assert.equal(query(String(storage.requests[1]?.url), 'uploadId'), '2~newer');
});

test('a key that merely starts with this one is somebody else\u2019s upload', async () => {
  // Storage matches a prefix as a prefix. Continuing an upload of a different key
  // would write this file's parts into an object that is not this file.
  const { client } = stubClient();
  const storage = scriptedStorage([
    { xml: listingOf([{ key: `${masterKey}-extra`, id: '2~other', initiated: '2026-10-20T08:00:00.000Z' }]) },
  ]);

  const outcome = await resumeMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.value.uploadId, null);
  assert.equal(storage.requests.length, 1);
});

test('parts that do not fit the plan are left alone, and the reason is reported', async () => {
  const cases: Array<{ parts: Array<{ n: number; etag: string; size: number }>; matches: RegExp }> = [
    {
      // Opened by code that chose a different part size, or a row whose declared
      // size has since changed. Completing it would assemble an object whose
      // bytes do not line up with the row.
      parts: [{ n: 1, etag: 'aaa', size: 5 * MiB }],
      matches: /is 5242880 bytes and this plan makes it 16777216/,
    },
    {
      parts: [{ n: 4, etag: 'ddd', size: plan.partBytes }],
      matches: /divides into 3/,
    },
    {
      // The last part is a megabyte for this file, so a full-size one is wrong.
      parts: [{ n: 3, etag: 'ccc', size: plan.partBytes }],
      matches: /part 3 is 16777216 bytes and this plan makes it 1048576/,
    },
  ];

  for (const item of cases) {
    const { client } = stubClient();
    const storage = scriptedStorage([
      { xml: listingOf([{ key: masterKey, id: '2~first', initiated: '2026-10-19T08:00:00.000Z' }]) },
      { xml: partsOf(item.parts) },
    ]);

    const outcome = await resumeMasterMultipart(client, assetId, {
      config,
      fetchImpl: storage.fetchImpl,
    });

    assert.equal(outcome.ok, true, JSON.stringify(item.parts));
    if (!outcome.ok) continue;
    // Not resumable, but not an error either: the answer is "start again", and the
    // old parts are left to the cleanup that runs on unfinished uploads.
    assert.equal(outcome.value.uploadId, null, JSON.stringify(item.parts));
    assert.deepEqual(outcome.value.uploadedParts, []);
    assert.match(String(outcome.value.note), item.matches);
    assert.match(String(outcome.value.note), /a new one will start/);
  }
});

test('a complete last part is recognised, so a stalled upload at the last part resumes', async () => {
  const { client } = stubClient();
  const storage = scriptedStorage([
    { xml: listingOf([{ key: masterKey, id: '2~first', initiated: '2026-10-19T08:00:00.000Z' }]) },
    {
      xml: partsOf([
        { n: 1, etag: 'aaa', size: plan.partBytes },
        { n: 2, etag: 'bbb', size: plan.partBytes },
        { n: 3, etag: 'ccc', size: plan.lastPartBytes },
      ]),
    },
  ]);

  const outcome = await resumeMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.value.uploadedParts.length, 3);
  assert.equal(outcome.value.uploadedBytes, byteSize, 'every byte has arrived; only the assembly is missing');
});

test('a truncated listing is followed, because the upload may be on the next page', async () => {
  const { client } = stubClient();
  const storage = scriptedStorage([
    {
      xml: listingOf([{ key: 'aaa/video-mp4', id: '2~unrelated' }], {
        truncated: true,
        nextKey: masterKey,
        nextId: '2~marker',
      }),
    },
    { xml: listingOf([{ key: masterKey, id: '2~first', initiated: '2026-10-19T08:00:00.000Z' }]) },
    { xml: partsOf([]) },
  ]);

  const outcome = await resumeMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.value.uploadId, '2~first');
  assert.equal(storage.requests.length, 3);
  const second = String(storage.requests[1]?.url);
  assert.equal(query(second, 'key-marker'), masterKey);
  assert.equal(query(second, 'upload-id-marker'), '2~marker');
});

test('a row that is no longer pending has nothing to resume', async () => {
  const { client } = stubClient({ row: row({ status: 'quarantined' }) });
  const storage = scriptedStorage([{ xml: listingOf([]) }]);

  const outcome = await resumeMasterMultipart(client, assetId, {
    config,
    fetchImpl: storage.fetchImpl,
  });

  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.status, 409);
  assert.equal(storage.requests.length, 0);
});

test('storage refusing or misdescribing a listing is reported, not guessed at', async () => {
  const cases: Array<{ answer: StorageAnswer; status: number; matches: RegExp }> = [
    { answer: { status: 403 }, status: 409, matches: /refused the GET/ },
    { answer: { throws: true }, status: 503, matches: /could not be reached/ },
    { answer: { xml: '<html>not storage</html>' }, status: 502, matches: /could not read/ },
  ];

  for (const item of cases) {
    const { client } = stubClient();
    const storage = scriptedStorage([item.answer]);

    const outcome = await resumeMasterMultipart(client, assetId, {
      config,
      fetchImpl: storage.fetchImpl,
    });

    assert.equal(outcome.ok, false, JSON.stringify(item.answer));
    if (!outcome.ok) {
      assert.equal(outcome.status, item.status, JSON.stringify(item.answer));
      assert.match(outcome.message, item.matches);
    }
  }
});

// ---------------------------------------------------------------------------
// The bucket-wide list staff can read
// ---------------------------------------------------------------------------

test('unfinished uploads are listed for the whole bucket, oldest first', async () => {
  const storage = scriptedStorage([
    {
      xml: listingOf([
        { key: masterKey, id: '2~newer', initiated: '2026-10-20T08:00:00.000Z' },
        { key: 'other/video-mp4', id: '2~older', initiated: '2026-10-18T08:00:00.000Z' },
      ]),
    },
  ]);

  const outcome = await listUnfinishedMasterUploads({ config, fetchImpl: storage.fetchImpl });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.value.capped, false);
  assert.deepEqual(
    outcome.value.uploads.map((upload) => upload.uploadId),
    ['2~older', '2~newer'],
    'the question an operator asks is what has been sitting there longest',
  );
  // No prefix: this is the bucket, not one file.
  assert.equal(query(String(storage.requests[0]?.url), 'prefix'), null);
});

test('a listing that stops early says so rather than looking complete', async () => {
  const storage = scriptedStorage([
    {
      xml: listingOf([{ key: masterKey, id: '2~first', initiated: '2026-10-19T08:00:00.000Z' }], {
        truncated: true,
        nextKey: masterKey,
        nextId: '2~marker',
      }),
    },
  ]);

  const outcome = await listUnfinishedMasterUploads({ config, fetchImpl: storage.fetchImpl });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.value.capped, true);
  assert.equal(storage.requests.length, MAX_LISTING_PAGES, 'it read the pages it said it would');
  assert.equal(MAX_LISTING_PAGES, 10);
});

// ---------------------------------------------------------------------------
// Ending one
// ---------------------------------------------------------------------------

test('ending an unfinished upload records the decision, then deletes the parts', async () => {
  const { client, calls } = stubClient();
  const storage = scriptedStorage([{ status: 204, xml: '' }]);

  const outcome = await abandonUnfinishedUpload(
    client,
    { assetId, uploadId: '2~first', reason: 'stalled in June and nobody owns it' },
    { config, fetchImpl: storage.fetchImpl, now: fixed },
  );

  assert.deepEqual(outcome, {
    ok: true,
    value: { assetId, uploadId: '2~first', recorded: true, deleted: true, note: null },
  });
  // The audit entry is written before storage is asked, so a refusal leaves a
  // record of the decision rather than a deletion with no record.
  assert.equal(calls[0]?.startsWith('rpc:abandon_media_upload:'), true, calls.join(' '));
  assert.ok(calls[0]?.includes('stalled in June'), calls[0]);
  const request = storage.requests[0];
  assert.equal(request?.method, 'DELETE');
  assert.equal(query(String(request?.url), 'uploadId'), '2~first');
});

test('a refusal to record it stops before anything is deleted', async () => {
  const { client, calls } = stubClient({
    rpcError: 'only platform staff may abandon an unfinished upload',
  });
  const storage = scriptedStorage([{ status: 204, xml: '' }]);

  const outcome = await abandonUnfinishedUpload(
    client,
    { assetId, uploadId: '2~first', reason: 'let me tidy up' },
    { config, fetchImpl: storage.fetchImpl },
  );

  assert.deepEqual(outcome, {
    ok: false,
    message: 'Only platform staff can do that.',
    status: 403,
  });
  assert.equal(storage.requests.length, 0, 'bytes were deleted on a decision nobody was allowed to make');
  assert.equal(calls.filter((call) => call.startsWith('from:')).length, 0);
});

test('a row that is gone is a 404, and a reason that is missing is a 400', async () => {
  const gone = stubClient({ row: null });
  const goneOutcome = await abandonUnfinishedUpload(
    gone.client,
    { assetId, uploadId: '2~first', reason: 'cleanup' },
    { config, fetchImpl: scriptedStorage([]).fetchImpl },
  );
  assert.equal(goneOutcome.ok, false);
  if (!goneOutcome.ok) assert.equal(goneOutcome.status, 404);

  const reasonless = stubClient();
  const reasonlessOutcome = await abandonUnfinishedUpload(
    reasonless.client,
    { assetId, uploadId: '2~first', reason: '   ' },
    { config, fetchImpl: scriptedStorage([]).fetchImpl },
  );
  assert.equal(reasonlessOutcome.ok, false);
  if (!reasonlessOutcome.ok) assert.equal(reasonlessOutcome.status, 400);
});

test('storage refusing to delete is reported honestly, and the decision still stands', async () => {
  const { client } = stubClient();
  const storage = scriptedStorage([{ status: 500 }]);

  const outcome = await abandonUnfinishedUpload(
    client,
    { assetId, uploadId: '2~first', reason: 'cleanup' },
    { config, fetchImpl: storage.fetchImpl },
  );

  assert.equal(outcome.ok, true, 'the decision was recorded, so the call did not fail');
  if (!outcome.ok) return;
  assert.equal(outcome.value.recorded, true);
  assert.equal(outcome.value.deleted, false);
  assert.match(String(outcome.value.note), /seven days/);
  assert.match(String(outcome.value.note), /answered 500/);
});

test('an upload storage has no record of is already gone', async () => {
  const { client } = stubClient();
  const storage = scriptedStorage([{ status: 404 }]);

  const outcome = await abandonUnfinishedUpload(
    client,
    { assetId, uploadId: '2~first', reason: 'cleanup' },
    { config, fetchImpl: storage.fetchImpl },
  );

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.value.deleted, true);
  assert.match(String(outcome.value.note), /no record of that upload/);
});

test('the leftover parts of a file that already arrived may be ended too', async () => {
  // An earlier attempt stalled and a later one succeeded. The object exists; the
  // stalled upload's parts do not belong to it, and they are still being paid for.
  const { client } = stubClient({ row: row({ status: 'available' }) });
  const storage = scriptedStorage([{ status: 204, xml: '' }]);

  const outcome = await abandonUnfinishedUpload(
    client,
    { assetId, uploadId: '2~first', reason: 'the parts of an earlier attempt' },
    { config, fetchImpl: storage.fetchImpl },
  );

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.value.deleted, true);
  assert.equal(storage.requests[0]?.method, 'DELETE');
});
