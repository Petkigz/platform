import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchCertificateAdminRecords,
  fetchCertificateCandidates,
  issueCertificate,
  revokeCertificate,
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
