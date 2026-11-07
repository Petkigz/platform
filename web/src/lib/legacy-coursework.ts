/** Owner-only legacy coursework register. Unknown data is not an empty queue. */
export type LegacyCourseworkRow = {
  asset_id: string;
  display_name: string | null;
  asset_status: 'pending' | 'available' | 'quarantined' | 'deleted';
  tombstoned: boolean;
  in_lesson: boolean;
  attached: boolean;
  in_revision: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseLegacyCoursework(value: unknown): LegacyCourseworkRow[] | null {
  if (!Array.isArray(value)) return null;
  const rows: LegacyCourseworkRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.asset_id !== 'string' || !UUID.test(r.asset_id) ||
        !(r.display_name === null || typeof r.display_name === 'string') ||
        typeof r.asset_status !== 'string' || !['pending', 'available', 'quarantined', 'deleted'].includes(r.asset_status) ||
        typeof r.tombstoned !== 'boolean' || typeof r.in_lesson !== 'boolean' ||
        typeof r.attached !== 'boolean' || typeof r.in_revision !== 'boolean') return null;
    rows.push(r as LegacyCourseworkRow);
  }
  return rows;
}

export type ErasureReviewRow = {
  asset_id: string; learner_id: string; display_name: string | null;
  reason: 'legacy_library' | 'shared_context'; recorded_at: string;
};
/** Do not turn malformed or unavailable review data into an empty list. */
export function parseErasureReviews(value: unknown): ErasureReviewRow[] | null {
  if (!Array.isArray(value)) return null;
  const rows: ErasureReviewRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.asset_id !== 'string' || !UUID.test(r.asset_id) ||
        typeof r.learner_id !== 'string' || !UUID.test(r.learner_id) ||
        !(r.display_name === null || typeof r.display_name === 'string') ||
        (r.reason !== 'legacy_library' && r.reason !== 'shared_context') ||
        typeof r.recorded_at !== 'string' || !Number.isFinite(Date.parse(r.recorded_at))) return null;
    rows.push(r as ErasureReviewRow);
  }
  return rows;
}

export type SharedRetentionReview = {
  asset_id: string; display_name: string | null; earliest_due: string;
  submission_contexts: number; in_lesson: boolean; erasure_review: boolean; held: boolean;
};
export function parseSharedRetentionReviews(value: unknown): SharedRetentionReview[] | null {
  if (!Array.isArray(value)) return null;
  const rows: SharedRetentionReview[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.asset_id !== 'string' || !UUID.test(r.asset_id) ||
        !(r.display_name === null || typeof r.display_name === 'string') ||
        typeof r.earliest_due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.earliest_due) || !Number.isFinite(Date.parse(r.earliest_due)) ||
        typeof r.submission_contexts !== 'number' || !Number.isSafeInteger(r.submission_contexts) || r.submission_contexts < 1 ||
        typeof r.in_lesson !== 'boolean' || typeof r.erasure_review !== 'boolean' || typeof r.held !== 'boolean') return null;
    rows.push(r as SharedRetentionReview);
  }
  return rows;
}
