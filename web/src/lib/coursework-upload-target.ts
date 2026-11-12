/** Coordinates returned by the database for one new or retried coursework upload.
 * This is response validation, not an authorization or object-integrity check. */
export function parseCourseworkUploadTarget(value: unknown, expectedAsset?: string): {
  assetId: string; bucket: string; key: string;
} | null {
  const item: unknown = Array.isArray(value) ? (value.length === 1 ? value[0] : null) : value;
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const row = item as Record<string, unknown>;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof row.asset_id !== 'string' || !uuid.test(row.asset_id) ||
      (expectedAsset !== undefined && row.asset_id.toLowerCase() !== expectedAsset.toLowerCase()) ||
      typeof row.master_bucket !== 'string' || !row.master_bucket.trim() ||
      typeof row.master_key !== 'string' || !row.master_key.startsWith(`${row.asset_id.toLowerCase()}/`)) return null;
  return { assetId: row.asset_id, bucket: row.master_bucket, key: row.master_key };
}
