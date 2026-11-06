export type CourseworkQuarantine = {
  asset_id: string;
  display_name: string | null;
  previous_status: 'pending' | 'available' | null;
  quarantined_at: string | null;
  recorded_reason: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isQuarantineCursor(value: string): boolean { return UUID.test(value); }
export function parseCourseworkQuarantines(value: unknown): CourseworkQuarantine[] | null {
  if (!Array.isArray(value)) return null;
  const rows: CourseworkQuarantine[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const r = entry as Record<string, unknown>;
    if (typeof r.asset_id !== 'string' || !UUID.test(r.asset_id) ||
      !(r.display_name === null || typeof r.display_name === 'string') ||
      !(r.previous_status === null || r.previous_status === 'pending' || r.previous_status === 'available') ||
      !(r.quarantined_at === null || typeof r.quarantined_at === 'string') ||
      !(r.recorded_reason === null || typeof r.recorded_reason === 'string')) return null;
    rows.push({ asset_id: r.asset_id, display_name: r.display_name, previous_status: r.previous_status, quarantined_at: r.quarantined_at, recorded_reason: r.recorded_reason });
  }
  return rows;
}
