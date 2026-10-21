import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_PART_ATTEMPTS,
  PARTS_PER_SIGNATURE_BATCH,
  RETRY_DELAY_MS,
  uploadInParts,
  type MultipartProgress,
  type ResumedPart,
} from './multipart-upload.ts';

const assetId = '4f30fd1d-6f2c-4c1e-9a5b-0d2f6c8a1b23';
const uploadId = '2~from-storage';

/**
 * The world this uploader runs in: `/api/media` on one side and storage on the
 * other, both faked.
 *
 * The parts are two bytes each rather than sixteen mebibytes. The uploader takes
 * its ranges from the server's signed response instead of computing them, so a
 * small file exercises the same code — the flow, the batching, the retries — and
 * the suite does not allocate a gigabyte to prove that a loop counts correctly.
 */
type WorldOptions = {
  partCount: number;
  partBytes?: number;
  /** These parts fail once, then succeed against a freshly signed URL. */
  failOnce?: number[];
  /** These parts fail every attempt. */
  alwaysFail?: number[];
  /** Storage accepts the bytes but the browser cannot read the ETag. */
  omitEtag?: boolean;
  /** One API action refuses, with the sentence a teacher would see. */
  refuse?: { action: string; status: number; message: string };
  /** The API answers with something that is not JSON. */
  notJson?: boolean;
  /** The API cannot be reached at all. */
  unreachable?: boolean;
  /** Stop the upload after this many parts have been accepted. */
  stopAfter?: number;
};

function stubWorld(options: WorldOptions) {
  const partBytes = options.partBytes ?? 2;
  const totalBytes = options.partCount * partBytes;
  const requests: string[] = [];
  const bodies: unknown[] = [];
  const failedOnce = new Set<number>();
  let accepted = 0;
  let stopped = false;

  const signal = { get aborted() { return stopped; } };

  const json = (value: unknown, status = 200) =>
    ({ ok: status < 300, status, json: async () => value, headers: new Headers() }) as unknown as Response;
  const empty = (status: number) =>
    ({ ok: status < 300, status, json: async () => null, headers: new Headers() }) as unknown as Response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchImpl = (async (url: string, init?: any) => {
    const raw = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
    bodies.push(raw);
    const target = String(url);

    if (target.startsWith('/api/media')) {
      if (options.unreachable) throw new Error('offline');
      if (options.notJson) return empty(500);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const action = String((raw as any)?.action);
      if (options.refuse?.action === action) {
        // Recorded under the same label as a success, so a test asserts one
        // sequence whatever the outcome of the call.
        requests.push(action.replace('_multipart', ''));
        return json({ ok: false, message: options.refuse.message }, options.refuse.status);
      }
      if (action === 'initiate_multipart') {
        requests.push('initiate');
        return json({
          ok: true,
          data: { assetId, uploadId, partBytes, partCount: options.partCount, partUrlSeconds: 900 },
        });
      }
      if (action === 'sign_parts') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const numbers = (raw as any).partNumbers as number[];
        requests.push(`sign:${numbers.join(',')}`);
        return json({
          ok: true,
          data: {
            assetId,
            uploadId,
            parts: numbers.map((partNumber) => ({
              partNumber,
              url: `https://storage.example/part/${String(partNumber)}?uploadId=${uploadId}`,
              method: 'PUT',
              start: (partNumber - 1) * partBytes,
              end: partNumber * partBytes,
              expiresInSeconds: 900,
            })),
          },
        });
      }
      if (action === 'complete_multipart') {
        requests.push('complete');
        return json({
          ok: true,
          data: { assetId, uploadId, etag: 'the-object-etag', byteSize: totalBytes },
        });
      }
      if (action === 'abort_multipart') {
        requests.push('abort');
        return json({ ok: true, data: { assetId, uploadId, aborted: true } });
      }
      requests.push(`unknown:${action}`);
      return json({ ok: false, message: 'Unknown media action.' }, 400);
    }

    const partNumber = Number(target.match(/\/part\/(\d+)/)?.[1]);
    requests.push(`put:${String(partNumber)}`);
    if (options.alwaysFail?.includes(partNumber)) return empty(500);
    if (options.failOnce?.includes(partNumber) && !failedOnce.has(partNumber)) {
      failedOnce.add(partNumber);
      return empty(500);
    }
    accepted += 1;
    if (options.stopAfter !== undefined && accepted >= options.stopAfter) stopped = true;
    const headers = new Headers();
    if (!options.omitEtag) headers.set('etag', `"etag-${String(partNumber)}"`);
    return { ok: true, status: 200, headers } as unknown as Response;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  const file = new Blob([new Uint8Array(totalBytes)]);
  const sleeps: number[] = [];
  const progress: MultipartProgress[] = [];

  return {
    fetchImpl,
    requests,
    bodies,
    file,
    signal,
    sleeps,
    progress,
    totalBytes,
    run: (
      over: {
        signal?: { aborted: boolean };
        resume?: { uploadId: string; partCount: number; parts: ResumedPart[] };
      } = {},
    ) =>
      uploadInParts({
        file,
        assetId,
        fetchImpl,
        retryDelayMs: RETRY_DELAY_MS,
        sleep: async (ms: number) => {
          sleeps.push(ms);
        },
        onProgress: (event) => progress.push(event),
        signal: over.signal ?? signal,
        resume: over.resume,
      }),
  };
}

// ---------------------------------------------------------------------------
// The flow that has to work
// ---------------------------------------------------------------------------

test('a file goes up in parts, in order, and is assembled from the ETags storage gave', async () => {
  const world = stubWorld({ partCount: 3 });

  const outcome = await world.run();

  assert.deepEqual(outcome, {
    ok: true,
    value: { assetId, uploadId, etag: 'the-object-etag', byteSize: 6 },
  });
  assert.deepEqual(world.requests, [
    'initiate',
    'sign:1,2,3',
    'put:1',
    'put:2',
    'put:3',
    'complete',
  ]);
  // The complete call carries the ETags in part order, each one the value storage
  // returned for that PUT and not a value invented here.
  const complete = world.bodies.at(-1) as { parts: { partNumber: number; etag: string }[] };
  assert.deepEqual(complete.parts, [
    { partNumber: 1, etag: '"etag-1"' },
    { partNumber: 2, etag: '"etag-2"' },
    { partNumber: 3, etag: '"etag-3"' },
  ]);
});

test('parts are signed in batches, because a URL only lives fifteen minutes', () => {
  assert.equal(PARTS_PER_SIGNATURE_BATCH, 8);
});

test('a long upload signs its parts as it goes, and the last batch is short', async () => {
  const world = stubWorld({ partCount: 20 });

  const outcome = await world.run();

  assert.equal(outcome.ok, true);
  assert.deepEqual(
    world.requests.filter((request) => request.startsWith('sign:')),
    ['sign:1,2,3,4,5,6,7,8', 'sign:9,10,11,12,13,14,15,16', 'sign:17,18,19,20'],
  );
  // One signing call per batch, not one per part.
  assert.equal(world.requests.length, 1 + 3 + 20 + 1);
});

test('progress moves forward only, and says which part is travelling', async () => {
  const world = stubWorld({ partCount: 3 });

  await world.run();

  const uploaded = world.progress
    .filter((event) => event.phase === 'uploading')
    .map((event) => event.uploadedBytes);
  assert.deepEqual(uploaded, [0, 2, 2, 4, 4, 6], 'reported before and after each part');
  for (let index = 1; index < uploaded.length; index += 1) {
    assert.ok(
      (uploaded[index] ?? 0) >= (uploaded[index - 1] ?? 0),
      'a progress bar that goes backwards reads as a broken upload',
    );
  }
  assert.deepEqual(
    world.progress.map((event) => event.phase),
    ['opening', 'signing', 'uploading', 'uploading', 'uploading', 'uploading', 'uploading', 'uploading', 'assembling'],
  );
  assert.equal(world.progress.at(-1)?.totalBytes, 6);
});

// ---------------------------------------------------------------------------
// Failure
// ---------------------------------------------------------------------------

test('a part that fails once is retried against a freshly signed URL', async () => {
  const world = stubWorld({ partCount: 3, failOnce: [2] });

  const outcome = await world.run();

  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.deepEqual(world.requests, [
    'initiate',
    'sign:1,2,3',
    'put:1',
    'put:2',
    'sign:2',
    'put:2',
    'put:3',
    'complete',
  ]);
  // The retry waited first. Retrying immediately against a connection that just
  // dropped usually fails again.
  assert.deepEqual(world.sleeps, [RETRY_DELAY_MS]);
  assert.equal(RETRY_DELAY_MS, 750);
});

test('a part that keeps failing stops the upload and deletes what was sent', async () => {
  const world = stubWorld({ partCount: 3, alwaysFail: [2] });

  const outcome = await world.run();

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.abandoned, true);
  assert.match(outcome.message, /Part 2 of 3 failed after 3 attempts/);
  assert.match(outcome.message, /storage answered 500/);
  assert.equal(MAX_PART_ATTEMPTS, 3);
  assert.deepEqual(world.requests, [
    'initiate',
    'sign:1,2,3',
    'put:1',
    'put:2',
    'sign:2',
    'put:2',
    'sign:2',
    'put:2',
    'abort',
  ]);
  assert.deepEqual(world.sleeps, [RETRY_DELAY_MS, RETRY_DELAY_MS * 2], 'the pause grows each attempt');
});

test('bytes storage accepted but could not describe are a deployment problem, and it is named', async () => {
  const world = stubWorld({ partCount: 2, omitEtag: true });

  const outcome = await world.run();

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.abandoned, true);
  assert.match(outcome.message, /ETag could not be read/);
  assert.match(outcome.message, /Access-Control-Expose-Headers: ETag/);
  assert.deepEqual(world.requests, ['initiate', 'sign:1,2', 'put:1', 'abort']);
});

test('stopping part-way abandons the parts instead of leaving them in storage', async () => {
  const world = stubWorld({ partCount: 4, stopAfter: 2 });

  const outcome = await world.run();

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.abandoned, true);
  assert.equal(outcome.message, 'The upload was stopped.');
  assert.deepEqual(world.requests, ['initiate', 'sign:1,2,3,4', 'put:1', 'put:2', 'abort']);
});

test('a refusal to assemble keeps the parts, because the object may already exist', async () => {
  const world = stubWorld({
    partCount: 2,
    refuse: {
      action: 'complete_multipart',
      status: 409,
      message: 'This upload is 2 parts and 1 arrived, so the file would be assembled short.',
    },
  });

  const outcome = await world.run();

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  // Not abandoned: deleting the parts would throw away a transfer that may well
  // have succeeded, to save a week of storage.
  assert.equal(outcome.abandoned, false);
  assert.match(outcome.message, /assembled short/);
  assert.deepEqual(world.requests, ['initiate', 'sign:1,2', 'put:1', 'put:2', 'complete']);
});

test('a refusal to open an upload is passed through, and nothing is sent to storage', async () => {
  const world = stubWorld({
    partCount: 2,
    refuse: {
      action: 'initiate_multipart',
      status: 409,
      message: 'That file is already available, so there is nothing left to upload.',
    },
  });

  const outcome = await world.run();

  assert.deepEqual(outcome, {
    ok: false,
    message: 'That file is already available, so there is nothing left to upload.',
    abandoned: false,
  });
  assert.deepEqual(world.requests, ['initiate']);
});

test('a server that cannot be reached, or that answers nonsense, says so', async () => {
  const offline = stubWorld({ partCount: 2, unreachable: true });
  const offlineOutcome = await offline.run();
  assert.equal(offlineOutcome.ok, false);
  if (!offlineOutcome.ok) {
    assert.match(offlineOutcome.message, /server could not be reached/);
    assert.equal(offlineOutcome.abandoned, false);
  }

  const nonsense = stubWorld({ partCount: 2, notJson: true });
  const nonsenseOutcome = await nonsense.run();
  assert.equal(nonsenseOutcome.ok, false);
  if (!nonsenseOutcome.ok) {
    assert.match(nonsenseOutcome.message, /answered 500 without saying why/);
    assert.equal(nonsenseOutcome.abandoned, false, 'nothing was uploaded, so there is nothing to delete');
  }
});

test('a plan the server cannot describe is refused rather than guessed', async () => {
  const world = stubWorld({ partCount: 3 });
  const outcome = await uploadInParts({
    file: world.file,
    assetId,
    // The initiate answer below is the only thing wrong: no part count.
    fetchImpl: (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: { assetId, uploadId, partBytes: 2 } }),
        headers: new Headers(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any) as any,
    sleep: async () => {},
  });

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.match(outcome.message, /did not say how many parts/);
    assert.equal(outcome.abandoned, false);
  }
});

// ---------------------------------------------------------------------------
// Continuing an upload a closed tab left behind
// ---------------------------------------------------------------------------

/** Two-byte parts, so a resumed prefix is easy to read against the byte count. */
const resumedParts = (count: number, partBytes = 2): ResumedPart[] =>
  Array.from({ length: count }, (_, index) => ({
    partNumber: index + 1,
    etag: `"etag-${String(index + 1)}"`,
    size: partBytes,
  }));

test('a resumed upload sends only the parts storage does not already have', async () => {
  const world = stubWorld({ partCount: 3 });

  const outcome = await world.run({
    resume: { uploadId, partCount: 3, parts: resumedParts(2) },
  });

  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  // No initiate: the upload storage is holding is the one continued, so the parts
  // already there are not sent again.
  assert.deepEqual(world.requests, ['sign:3', 'put:3', 'complete']);

  const complete = world.bodies.at(-1) as { uploadId: string; parts: { partNumber: number; etag: string }[] };
  assert.equal(complete.uploadId, uploadId);
  assert.deepEqual(complete.parts, [
    { partNumber: 1, etag: '"etag-1"' },
    { partNumber: 2, etag: '"etag-2"' },
    { partNumber: 3, etag: '"etag-3"' },
  ], 'the ETags storage reported and the one this transfer produced arrive together, in order');
});

test('the progress bar starts part-way, because the bytes are already there', async () => {
  const world = stubWorld({ partCount: 3 });

  await world.run({ resume: { uploadId, partCount: 3, parts: resumedParts(2) } });

  assert.deepEqual(
    world.progress.map((event) => [event.phase, event.uploadedBytes]),
    [
      ['resuming', 0],
      ['resuming', 4],
      ['signing', 4],
      ['uploading', 4],
      ['uploading', 6],
      ['assembling', 6],
    ],
  );
});

test('a file whose parts have all arrived only needs assembling', async () => {
  const world = stubWorld({ partCount: 3 });

  const outcome = await world.run({
    resume: { uploadId, partCount: 3, parts: resumedParts(3) },
  });

  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.deepEqual(world.requests, ['complete']);
  assert.deepEqual(world.progress.map((event) => event.uploadedBytes), [0, 6, 6]);
});

test('a part that is not in this plan is dropped rather than assembled', async () => {
  const world = stubWorld({ partCount: 3 });

  const outcome = await world.run({
    resume: {
      uploadId,
      partCount: 3,
      // Part 9 of a three-part upload belongs to some other attempt at the same
      // key. Completing with it would produce an object the row cannot describe.
      parts: [...resumedParts(1), { partNumber: 9, etag: '"stale"', size: 2 }],
    },
  });

  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.deepEqual(world.requests, ['sign:2,3', 'put:2', 'put:3', 'complete']);
  const complete = world.bodies.at(-1) as { parts: { partNumber: number }[] };
  assert.deepEqual(complete.parts.map((part) => part.partNumber), [1, 2, 3]);
});

test('a resume the server cannot describe is refused before anything is sent', async () => {
  for (const resume of [
    { uploadId: '', partCount: 3, parts: [] },
    { uploadId, partCount: 0, parts: [] },
    { uploadId, partCount: 2.5, parts: [] },
  ]) {
    const world = stubWorld({ partCount: 3 });
    const outcome = await world.run({ resume });
    assert.equal(outcome.ok, false, JSON.stringify(resume));
    if (!outcome.ok) {
      assert.match(outcome.message, /did not say how many parts/);
      assert.equal(outcome.abandoned, false, 'nothing was opened here, so there is nothing to delete');
    }
    assert.deepEqual(world.requests, []);
  }
});

test('a resumed upload that fails still cleans up after itself', async () => {
  const world = stubWorld({ partCount: 3, alwaysFail: [3] });

  const outcome = await world.run({
    resume: { uploadId, partCount: 3, parts: resumedParts(2) },
  });

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.abandoned, true);
  assert.match(outcome.message, /Part 3 of 3 failed after 3 attempts/);
  assert.deepEqual(world.requests, [
    'sign:3',
    'put:3',
    'sign:3',
    'put:3',
    'sign:3',
    'put:3',
    'abort',
  ]);
});
