export type ChildLoginPendingAttempt = {
  attempt_id: string;
  learner_name: string;
  guardian_name: string;
  username: string;
  created_at: string;
  marked_identity_present: boolean;
};

/** Null means the register could not be read, not that the queue is empty. */
export function parseChildLoginPendingAttempts(value: unknown): ChildLoginPendingAttempt[] | null {
  if (!Array.isArray(value)) return null;
  const rows: ChildLoginPendingAttempt[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.attempt_id !== 'string' || typeof row.learner_name !== 'string'
      || typeof row.guardian_name !== 'string' || typeof row.username !== 'string'
      || typeof row.created_at !== 'string' || Number.isNaN(Date.parse(row.created_at))
      || typeof row.marked_identity_present !== 'boolean') return null;
    rows.push(row as ChildLoginPendingAttempt);
  }
  return rows;
}

export type ChildLoginRemovalTask = {
  task_id: string;
  learner_name: string;
  username: string;
  child_user_id: string;
  created_at: string;
  identity_present: boolean;
  marker_matches: boolean;
};

/** As with attempts, an unreadable response must not be shown as an empty queue. */
export function parseChildLoginRemovalTasks(value: unknown): ChildLoginRemovalTask[] | null {
  if (!Array.isArray(value)) return null;
  const rows: ChildLoginRemovalTask[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.task_id !== 'string' || typeof row.learner_name !== 'string'
      || typeof row.username !== 'string' || typeof row.child_user_id !== 'string'
      || typeof row.created_at !== 'string' || Number.isNaN(Date.parse(row.created_at))
      || typeof row.identity_present !== 'boolean' || typeof row.marker_matches !== 'boolean') return null;
    rows.push(row as ChildLoginRemovalTask);
  }
  return rows;
}

export type ChildLoginErasureRecovery = {
  source_kind: 'attempt' | 'legacy_removal';
  source_id: string;
  identity_id: string | null;
  created_at: string;
  identity_present: boolean;
  trusted_marker_matches: boolean;
  matched_identity_ids: string[];
};

export function parseChildLoginErasureRecovery(value: unknown): ChildLoginErasureRecovery[] | null {
  if (!Array.isArray(value)) return null;
  const rows: ChildLoginErasureRecovery[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if ((row.source_kind !== 'attempt' && row.source_kind !== 'legacy_removal')
      || typeof row.source_id !== 'string'
      || (row.identity_id !== null && typeof row.identity_id !== 'string')
      || typeof row.created_at !== 'string' || Number.isNaN(Date.parse(row.created_at))
      || typeof row.identity_present !== 'boolean' || typeof row.trusted_marker_matches !== 'boolean'
      || !Array.isArray(row.matched_identity_ids) || !row.matched_identity_ids.every((id) => typeof id === 'string')) return null;
    rows.push(row as ChildLoginErasureRecovery);
  }
  return rows;
}

export type ChildLoginLegacyErasure = {
  learner_id: string;
  attempt_count: number;
  removal_task_count: number;
  coursework_held: boolean;
};

export function parseChildLoginLegacyErasure(value: unknown): ChildLoginLegacyErasure[] | null {
  if (!Array.isArray(value)) return null;
  const rows: ChildLoginLegacyErasure[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.learner_id !== 'string' || !Number.isSafeInteger(row.attempt_count)
      || Number(row.attempt_count) < 0 || !Number.isSafeInteger(row.removal_task_count)
      || Number(row.removal_task_count) < 0 || typeof row.coursework_held !== 'boolean') return null;
    rows.push(row as ChildLoginLegacyErasure);
  }
  return rows;
}
