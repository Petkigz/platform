import { masterKeyAssetId, presignMasterHead, type R2Config } from './media-r2.ts';

export type StoragePresenceTarget = {asset_id:string;storage_backend:string;master_bucket:string;master_key:string};
export function parseStoragePresenceTarget(value: unknown, assetId: string): StoragePresenceTarget | null {
  if (!Array.isArray(value) || value.length!==1 || !value[0] || typeof value[0]!=='object' || Array.isArray(value[0])) return null;
  const row=value[0] as Record<string,unknown>;
  if (typeof row.asset_id!=='string' || row.asset_id.toLowerCase()!==assetId.toLowerCase() ||
      typeof row.storage_backend!=='string' || typeof row.master_bucket!=='string' || !row.master_bucket.trim() || typeof row.master_key!=='string') return null;
  try {if (masterKeyAssetId(row.master_key).toLowerCase()!==assetId.toLowerCase()) return null;} catch {return null;}
  return row as StoragePresenceTarget;
}
export function sameStoragePresenceTarget(a: StoragePresenceTarget,b: StoragePresenceTarget): boolean {
  return a.asset_id.toLowerCase()===b.asset_id.toLowerCase() && a.storage_backend===b.storage_backend && a.master_bucket===b.master_bucket && a.master_key===b.master_key;
}
export type Presence = 'present' | 'not_found' | 'unknown';
/** A point-in-time report only, not verified deletion, or proof about other copies. */
export async function checkCourseworkStoragePresence(target: StoragePresenceTarget,config: R2Config,fetchImpl: typeof fetch=fetch):Promise<Presence> {
  if (target.storage_backend!=='r2' || target.master_bucket!==config.mastersBucket) return 'unknown';
  try {
    const signed=presignMasterHead(config,target.master_key);
    const response=await fetchImpl(signed.url,{method:'HEAD',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10_000)});
    if (response.ok) return 'present';
    if (response.status===404) return 'not_found';
  } catch { /* errors cannot establish absence */ }
  return 'unknown';
}
