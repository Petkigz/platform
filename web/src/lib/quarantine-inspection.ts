import { presignMasterHead, type R2Config } from './media-r2.ts';

export type QuarantineInspectionTarget = {
  asset_id: string; storage_backend: string; master_bucket: string; master_key: string; declared_bytes: number | string;
};
export type QuarantineInspectionResult =
  | { ok: true; matches: boolean; declaredBytes: number; reportedBytes: number }
  | { ok: false; message: string; status: number };

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
