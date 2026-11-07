export type OfflineDevice = {
  device_id: string; learner_profile_id: string; learner_name: string; label: string | null;
  first_seen_at: string; last_seen_at: string; saved_count: number;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseOfflineDevices(value: unknown): OfflineDevice[] | null {
  if (!Array.isArray(value)) return null;
  const rows: OfflineDevice[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.device_id !== 'string' || !UUID.test(r.device_id) ||
        typeof r.learner_profile_id !== 'string' || !UUID.test(r.learner_profile_id) ||
        typeof r.learner_name !== 'string' || !(r.label === null || typeof r.label === 'string') ||
        typeof r.first_seen_at !== 'string' || !Number.isFinite(Date.parse(r.first_seen_at)) ||
        typeof r.last_seen_at !== 'string' || !Number.isFinite(Date.parse(r.last_seen_at)) ||
        typeof r.saved_count !== 'number' || !Number.isSafeInteger(r.saved_count) || r.saved_count < 0) return null;
    rows.push(r as OfflineDevice);
  }
  return rows;
}
export function isRemovedDevice(value: unknown, deviceId: string): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return r.removed === true && r.deviceId === deviceId;
}
