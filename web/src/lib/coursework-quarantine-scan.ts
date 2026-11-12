import { createHash } from 'node:crypto';
import { masterKeyAssetId, presignMasterDownload, type R2Config } from './media-r2.ts';
import { COURSEWORK_SCAN_MAX_BYTES, scanCourseworkBytes, type CourseworkScanResult } from './coursework-clamav.ts';
import type { QuarantineInspectionTarget } from './quarantine-inspection.ts';

export type QuarantineScan =
  | { ok: true; outcome: 'clean' | 'infected'; bytes: number }
  | { ok: false; message: string; status: 409 | 502 | 503 };

/** Reads a single bounded object for an owner-initiated, local, non-mutating scan.
 * The result describes these downloaded bytes only; it does not release quarantine
 * or prove any later storage read returns the same bytes. */
export async function scanQuarantinedCoursework(input: {
  target: QuarantineInspectionTarget; config: R2Config; socketPath: string;
  fetchImpl?: typeof fetch; scan?: typeof scanCourseworkBytes;
}): Promise<QuarantineScan> {
  const {target,config}=input;
  let asset: string;
  try {asset=masterKeyAssetId(target.master_key);} catch {return {ok:false,status:409,message:'The file location cannot be checked.'};}
  if (asset.toLowerCase()!==target.asset_id.toLowerCase() || target.storage_backend!=='r2' || target.master_bucket!==config.mastersBucket)
    return {ok:false,status:409,message:'The file location cannot be checked.'};
  const declared=Number(target.declared_bytes);
  if (!Number.isSafeInteger(declared) || declared<1 || declared>COURSEWORK_SCAN_MAX_BYTES)
    return {ok:false,status:409,message:'The file size is not supported by the scanner.'};
  // Harmless EICAR test string, constructed at runtime. A daemon that cannot
  // detect this standard test sample must not produce a reassuring result.
  // This is a basic readiness check, not proof signatures are current or complete.
  const testBytes=Buffer.from(['X5O!P%@AP[4\\PZX54(P^)7CC)7}$','EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'].join(''));
  try {
    const test=await (input.scan ?? scanCourseworkBytes)({bytes:testBytes,socketPath:input.socketPath,timeoutMs:10_000});
    if (!test || test.outcome!=='infected' || test.bytes!==testBytes.length || test.sha256!==createHash('sha256').update(testBytes).digest('hex'))
      return {ok:false,status:503,message:'The local scanner failed its test. No file was scanned.'};
  } catch {return {ok:false,status:503,message:'The local scanner failed its test. No file was scanned.'};}
  let response:Response;
  try {
    const url=presignMasterDownload(config,target.master_key,{expiresInSeconds:60}).url;
    response=await (input.fetchImpl ?? fetch)(url,{method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20_000)});
  } catch {return {ok:false,status:503,message:'Storage could not be reached. No scan was completed.'};}
  if (!response.ok || !response.body) return {ok:false,status:502,message:'Storage did not provide the file. No scan was completed.'};
  const length=response.headers.get('content-length');
  if (length===null || !/^[1-9][0-9]*$/.test(length) || Number(length)!==declared) {
    await response.body.cancel().catch(()=>{});
    return {ok:false,status:409,message:'The reported file size does not match. No scan was completed.'};
  }
  const reader=response.body.getReader();const chunks:Buffer[]=[];let received=0;
  try {
    for (;;) {
      const part=await reader.read();if (part.done) break;
      received+=part.value.byteLength;
      if (received>declared || received>COURSEWORK_SCAN_MAX_BYTES) {await reader.cancel().catch(()=>{});return {ok:false,status:409,message:'The received file is too large. No scan was completed.'};}
      chunks.push(Buffer.from(part.value));
    }
  } catch {await reader.cancel().catch(()=>{});return {ok:false,status:503,message:'The file transfer was interrupted. No scan was completed.'};}
  if (received!==declared) return {ok:false,status:409,message:'The received file was incomplete. No scan was completed.'};
  const downloaded=Buffer.concat(chunks,received);
  const expectedHash=createHash('sha256').update(downloaded).digest('hex');
  let result:CourseworkScanResult;
  try {result=await (input.scan ?? scanCourseworkBytes)({bytes:downloaded,socketPath:input.socketPath});}
  catch {return {ok:false,status:503,message:'The local scanner failed. No scan was completed.'};}
  if (!result || (result.outcome!=='clean' && result.outcome!=='infected') || result.bytes!==received || result.sha256!==expectedHash)
    return {ok:false,status:503,message:'The local scanner did not return a usable result.'};
  return {ok:true,outcome:result.outcome,bytes:received};
}
