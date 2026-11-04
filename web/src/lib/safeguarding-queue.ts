/** A private queue view. Missing/malformed data is not an empty queue. */
export type SafeguardingConcern = {
  review_id: string;
  asset_id: string;
  note: string;
  reviewed_at: string;
  reviewer_name: string | null;
  learner_name: string | null;
  course_title: string | null;
  details_unavailable: boolean;
};

export function parseSafeguardingConcerns(value: unknown): SafeguardingConcern[] | null {
  if (!Array.isArray(value)) return null;
  const rows: SafeguardingConcern[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.review_id !== 'string' || typeof row.asset_id !== 'string' ||
        typeof row.note !== 'string' || typeof row.reviewed_at !== 'string' ||
        typeof row.details_unavailable !== 'boolean' ||
        !(row.reviewer_name === null || typeof row.reviewer_name === 'string') ||
        !(row.learner_name === null || typeof row.learner_name === 'string') ||
        !(row.course_title === null || typeof row.course_title === 'string')) return null;
    rows.push(row as SafeguardingConcern);
  }
  return rows;
}

export type AcknowledgedConcern = SafeguardingConcern & { acknowledged_at: string };
export function parseSafeguardingHistory(value: unknown): AcknowledgedConcern[] | null {
  const rows = parseSafeguardingConcerns(value);
  if (!rows || rows.some((row) => typeof (row as unknown as Record<string, unknown>).acknowledged_at !== 'string')) return null;
  return rows as AcknowledgedConcern[];
}
