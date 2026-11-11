/** Private owner-only scheduled-cleanup hold data. It does not preserve all copies. */
export const SUPPORT_HOLD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SUPPORT_CASE_NUMBER = /^SC-[0-9]{6,}$/;
export type SupportCleanupHold = { caseId: string; caseNumber: string; reason: string; openedAt: string };

export function parseSupportCleanupHolds(data: unknown): SupportCleanupHold[] | null {
  if (!Array.isArray(data)) return null;
  const result: SupportCleanupHold[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.case_id !== 'string' || !SUPPORT_HOLD_ID.test(row.case_id) ||
        typeof row.case_number !== 'string' || !SUPPORT_CASE_NUMBER.test(row.case_number) ||
        typeof row.reason !== 'string' || typeof row.opened_at !== 'string' || !Number.isFinite(Date.parse(row.opened_at))) return null;
    result.push({ caseId: row.case_id, caseNumber: row.case_number, reason: row.reason, openedAt: row.opened_at });
  }
  return result;
}

export function parseSupportCleanupHoldStatus(data: unknown): { held: false } | { held: true; reason: string; openedAt: string } | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const row = data as Record<string, unknown>;
  if (row.held === false) return { held: false };
  if (row.held !== true || typeof row.reason !== 'string' || typeof row.openedAt !== 'string' || !Number.isFinite(Date.parse(row.openedAt))) return null;
  return { held: true, reason: row.reason, openedAt: row.openedAt };
}

export type SupportCleanupHoldEvent = { id: string; action: 'held' | 'released'; reason: string; occurredAt: string };
export function parseSupportCleanupHoldHistory(data: unknown): SupportCleanupHoldEvent[] | null {
  if (!Array.isArray(data)) return null;
  const result: SupportCleanupHoldEvent[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.event_id !== 'string' || !SUPPORT_HOLD_ID.test(row.event_id) ||
        (row.action !== 'held' && row.action !== 'released') || typeof row.reason !== 'string' ||
        typeof row.occurred_at !== 'string' || !Number.isFinite(Date.parse(row.occurred_at))) return null;
    result.push({ id: row.event_id, action: row.action, reason: row.reason, occurredAt: row.occurred_at });
  }
  return result;
}
