import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_MASTERS_BUCKET, type R2Config } from './media-r2.ts';
import { inspectQuarantinedObject, type QuarantineInspectionTarget } from './quarantine-inspection.ts';

const config: R2Config = { accountId: 'acct-123', credentials: { accessKeyId: 'test', secretAccessKey: 'test-secret' }, mastersBucket: DEFAULT_MASTERS_BUCKET, renditionsBucket: 'renditions' };
const target: QuarantineInspectionTarget = { asset_id: '4f30fd1d-6f2c-4c1e-9a5b-0d2f6c8a1b23', storage_backend: 'r2', master_bucket: DEFAULT_MASTERS_BUCKET, master_key: '4f30fd1d-6f2c-4c1e-9a5b-0d2f6c8a1b23/image-png', declared_bytes: 42 };

test('quarantine inspection performs a HEAD and compares reported length only', async () => {
  let method = '';
  const fetcher: typeof fetch = async (_url, init) => { method = init?.method ?? ''; return new Response(null, { status: 200, headers: { 'content-length': '42' } }); };
  assert.deepEqual(await inspectQuarantinedObject(target, config, fetcher), { ok: true, matches: true, declaredBytes: 42, reportedBytes: 42 });
  assert.equal(method, 'HEAD');
  assert.deepEqual(await inspectQuarantinedObject(target, config, async () => new Response(null, { headers: { 'content-length': '41' } })), { ok: true, matches: false, declaredBytes: 42, reportedBytes: 41 });
});

test('quarantine inspection does not turn errors into evidence of absence or match', async () => {
  for (const fetcher of [async () => new Response(null, { status: 403 }), async () => new Response(null, { status: 404 }), async () => new Response(null), async () => { throw new Error('offline'); }]) {
    assert.equal((await inspectQuarantinedObject(target, config, fetcher)).ok, false);
  }
  let called = false;
  assert.equal((await inspectQuarantinedObject({ ...target, master_bucket: 'other' }, config, async () => { called = true; return new Response(); })).ok, false);
  assert.equal(called, false);
  assert.equal((await inspectQuarantinedObject({ ...target, declared_bytes: 0 }, config)).ok, false);
});
