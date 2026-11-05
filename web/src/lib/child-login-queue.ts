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
