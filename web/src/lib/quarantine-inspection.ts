import { presignMasterHead, type R2Config } from './media-r2.ts';

export type QuarantineInspectionTarget = {
  asset_id: string; storage_backend: string; master_bucket: string; master_key: string; declared_bytes: number | string;
};
export type QuarantineInspectionResult =
  | { ok: true; matches: boolean; declaredBytes: number; reportedBytes: number }
  | { ok: false; message: string; status: number };

/** Only one well-formed row for the requested file may be used for a storage check. */
export function parseQuarantineTarget(value: unknown, assetId: string): QuarantineInspectionTarget | null {
  if (!Array.isArray(value) || value.length !== 1 || !value[0] || typeof value[0] !== 'object' || Array.isArray(value[0])) return null;
  const row = value[0] as Record<string, unknown>;
  if (typeof row.asset_id !== 'string' || row.asset_id.toLowerCase() !== assetId.toLowerCase() ||
      typeof row.storage_backend !== 'string' || !row.storage_backend.trim() ||
      typeof row.master_bucket !== 'string' || !row.master_bucket.trim() ||
      typeof row.master_key !== 'string' || !row.master_key.trim() ||
      !((typeof row.declared_bytes === 'number' && Number.isSafeInteger(row.declared_bytes) && row.declared_bytes > 0) ||
        (typeof row.declared_bytes === 'string' && /^[1-9][0-9]*$/.test(row.declared_bytes) && Number.isSafeInteger(Number(row.declared_bytes))))) return null;
  return row as QuarantineInspectionTarget;
}

export function sameQuarantineTarget(a: QuarantineInspectionTarget, b: QuarantineInspectionTarget): boolean {
  return a.asset_id.toLowerCase() === b.asset_id.toLowerCase() && a.storage_backend === b.storage_backend &&
    a.master_bucket === b.master_bucket && a.master_key === b.master_key && Number(a.declared_bytes) === Number(b.declared_bytes);
}

/** A single HEAD checks reported size only; it does not inspect or scan content. */
export async function inspectQuarantinedObject(
  target: QuarantineInspectionTarget, config: R2Config, fetchImpl: typeof fetch = fetch,
): Promise<QuarantineInspectionResult> {
  if (target.storage_backend !== 'r2' || target.master_bucket !== config.mastersBucket)
    return { ok: false, message: 'This file is recorded in a different storage backend or bucket. Check it individually.', status: 409 };
  const declaredBytes = Number(target.declared_bytes);
  if (!Number.isSafeInteger(declaredBytes) || declaredBytes <= 0)
    return { ok: false, message: 'The recorded file size cannot be checked.', status: 409 };
  let response: Response;
  try {
    const signed = presignMasterHead(config, target.master_key);
    response = await fetchImpl(signed.url, { method: 'HEAD', signal: AbortSignal.timeout(10_000), cache: 'no-store' });
  } catch {
    return { ok: false, message: 'Storage could not be reached. The file presence is unknown.', status: 503 };
  }
  if (!response.ok)
    return { ok: false, message: 'Storage did not confirm the object. This does not prove it is absent.', status: 502 };
  const value = response.headers.get('content-length');
  const reportedBytes = value !== null && /^[0-9]+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(reportedBytes) || reportedBytes < 0)
    return { ok: false, message: 'Storage did not report a usable size. The file has not been checked.', status: 502 };
  return { ok: true, matches: declaredBytes === reportedBytes, declaredBytes, reportedBytes };
}
