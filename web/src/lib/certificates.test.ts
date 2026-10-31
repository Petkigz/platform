import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchCertificateAdminRecords,
  fetchCertificateCandidates,
  fetchCertificatePolicy,
  fetchCertificateShelfStanding,
  issueCertificate,
  revokeCertificate,
  setCertificatePolicy,
} from './certificates.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

function rpcClient(response: { data: unknown; error: { message: string } | null }) {
  const calls: { fn: string; args?: Record<string, unknown> }[] = [];
  const client = {
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      calls.push({ fn, args });
      return response;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

test('certificate candidate queue uses its staff-checked RPC', async () => {
  const candidates = [{ enrolment_id: 'enrol-1' }];
  const { client, calls } = rpcClient({ data: candidates, error: null });
  assert.deepEqual(await fetchCertificateCandidates(client), candidates);
  assert.deepEqual(calls, [{ fn: 'list_certificate_issuance_candidates', args: undefined }]);
});

test('admin certificate register uses its staff-checked RPC', async () => {
  const records = [{ certificate_id: 'cert-1', status: 'issued' }];
  const { client, calls } = rpcClient({ data: records, error: null });
  assert.deepEqual(await fetchCertificateAdminRecords(client), records);
  assert.deepEqual(calls, [{ fn: 'list_certificate_admin_records', args: undefined }]);
});

test('issuance passes enrolment only; it never sends an actor id', async () => {
  const { client, calls } = rpcClient({ data: 'AS-2026-00000001', error: null });
  const result = await issueCertificate(client, { enrolmentId: 'enrol-1' });
  assert.deepEqual(result, { ok: true, certificateNumber: 'AS-2026-00000001' });
  assert.deepEqual(calls, [{
    fn: 'issue_certificate_for_session',
    args: { p_enrolment_id: 'enrol-1' },
  }]);
});

test('revocation requires a reason before the RPC', async () => {
  const { client, calls } = rpcClient({ data: null, error: null });
  assert.equal((await revokeCertificate(client, { certificateId: 'cert-1', reason: '  ' })).ok, false);
  assert.equal(calls.length, 0);
});

test('revocation trims its reason and sends no actor id', async () => {
  const { client, calls } = rpcClient({ data: null, error: null });
  assert.deepEqual(await revokeCertificate(client, { certificateId: 'cert-1', reason: '  Issued in error  ' }), { ok: true });
  assert.deepEqual(calls, [{
    fn: 'revoke_certificate_for_session',
    args: { p_certificate_id: 'cert-1', p_reason: 'Issued in error' },
  }]);
});

test('the shelf standing is six numbers, and a missing one is zero', async () => {
  const { client, calls } = rpcClient({
    data: { publishedVersions: 2, issuingVersions: '1', waiting: 3, finishedWithout: 4, issued: 5 },
    error: null,
  });
  assert.deepEqual(await fetchCertificateShelfStanding(client), {
    publishedVersions: 2,
    issuingVersions: 1,
    waiting: 3,
    finishedWithout: 4,
    issued: 5,
    revoked: 0,
  });
  assert.deepEqual(calls, [{ fn: 'certificate_shelf_standing', args: undefined }]);
});

test('a shelf that cannot explain itself still lists what is there', async () => {
  const { client } = rpcClient({ data: null, error: { message: 'permission denied' } });
  assert.equal(await fetchCertificateShelfStanding(client), null);
});

test('an author turns certificates on for a version, and sends no actor id', async () => {
  const { client, calls } = rpcClient({
    data: { enabled: true, templateVersion: 'standard-v1', changed: true },
    error: null,
  });
  const result = await setCertificatePolicy(client, {
    versionId: 'version-1',
    enabled: true,
    templateVersion: '  standard-v1  ',
  });
  assert.deepEqual(result, {
    ok: true,
    enabled: true,
    templateVersion: 'standard-v1',
    changed: true,
  });
  assert.deepEqual(calls, [{
    fn: 'set_course_certificate_policy',
    args: { p_version_id: 'version-1', p_enabled: true, p_template_version: 'standard-v1' },
  }]);
});

test('turning it off sends no design name, and keeps the answer that nothing changed', async () => {
  const { client, calls } = rpcClient({
    data: { enabled: false, templateVersion: 'standard-v1', changed: false },
    error: null,
  });
  const result = await setCertificatePolicy(client, { versionId: 'version-1', enabled: false });
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.changed, false);
  assert.deepEqual(calls[0]?.args, {
    p_version_id: 'version-1',
    p_enabled: false,
    p_template_version: null,
  });
});

test('somebody else\'s version is refused in a sentence a person can read', async () => {
  const { client } = rpcClient({
    data: null,
    error: { message: 'only the author of this version may decide what it finishes with' },
  });
  const result = await setCertificatePolicy(client, { versionId: 'version-1', enabled: true });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, 'not_author');
});

test('withdrawing a certificate already held is refused with the database\'s own words', async () => {
  const message = '1 learner is already holding a certificate from this version; turning it off would withdraw what they were given';
  const { client } = rpcClient({ data: null, error: { message } });
  const result = await setCertificatePolicy(client, { versionId: 'version-1', enabled: false });
  assert.deepEqual(result, { ok: false, code: 'rejected', message });
});

test('a version that has never said anything promises nothing', async () => {
  const seen: { table?: string; versionId?: string } = {};
  const client = {
    from: (table: string) => {
      seen.table = table;
      const chain = {
        select: () => chain,
        eq: (_column: string, value: string) => {
          seen.versionId = value;
          return chain;
        },
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return chain;
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await fetchCertificatePolicy(client, 'version-1'), {
    enabled: false,
    templateVersion: null,
  });
  assert.equal(seen.table, 'course_completion_policies');
  assert.equal(seen.versionId, 'version-1');
});
