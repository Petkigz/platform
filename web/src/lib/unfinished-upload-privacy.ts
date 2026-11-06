import type { ListedMultipartUpload } from './media-r2.ts';

/** The database is the authority; never infer library status from a key or RLS alone. */
export async function classifyUnfinishedUploads(
  uploads: ListedMultipartUpload[],
  classify: (keys: string[]) => Promise<unknown>,
): Promise<{ isOwner: boolean; libraryAssets: Map<string, string>; visible: ListedMultipartUpload[] } | null> {
  const keys = [...new Set(uploads.map((upload) => upload.key))];
  const batches = keys.length ? Array.from({ length: Math.ceil(keys.length / 500) }, (_, i) => keys.slice(i * 500, (i + 1) * 500)) : [[]];
  let isOwner = true;
  const libraryAssets = new Map<string, string>();
  for (const batch of batches) {
    const result = await classify(batch);
    if (!result || typeof result !== 'object') return null;
    const row = result as Record<string, unknown>;
    if (typeof row.is_owner !== 'boolean' || !Array.isArray(row.library_assets)) return null;
    const requested = new Set(batch);
    for (const entry of row.library_assets) {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Record<string, unknown>;
      if (typeof item.key !== 'string' || !requested.has(item.key) || typeof item.asset_id !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.asset_id) ||
          libraryAssets.has(item.key)) return null;
      libraryAssets.set(item.key, item.asset_id);
    }
    isOwner &&= row.is_owner;
  }
  return { isOwner, libraryAssets, visible: isOwner ? uploads : uploads.filter((upload) => libraryAssets.has(upload.key)) };
}
