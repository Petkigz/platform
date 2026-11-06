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
