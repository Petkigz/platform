export type SafeguardingAlertStatus = {
  review_id: string;
  status: 'pending' | 'leased' | 'sent' | 'failed';
  attempts: number;
  last_problem: 'address_unverified' | 'provider_uncertain' | null;
};
export function parseSafeguardingAlertStatus(value: unknown): SafeguardingAlertStatus[] | null {
  if (!Array.isArray(value)) return null;
  const result: SafeguardingAlertStatus[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.review_id !== 'string' || !['pending', 'leased', 'sent', 'failed'].includes(String(row.status)) ||
      !Number.isInteger(row.attempts) || (row.attempts as number) < 0 ||
      !(row.last_problem === null || row.last_problem === 'address_unverified' || row.last_problem === 'provider_uncertain')) return null;
    result.push(row as SafeguardingAlertStatus);
  }
  return result;
}
export function describeSafeguardingAlert(row: SafeguardingAlertStatus | undefined): string {
  if (!row) return 'Alert status is unavailable; do not assume an email was sent.';
  if (row.status === 'sent') return 'The email provider returned a reference. Delivery and receipt are not confirmed.';
  if (row.status === 'leased') return 'An email attempt is in progress or its lease has not expired. Receipt is not confirmed.';
  if (row.status === 'failed') return row.last_problem === 'address_unverified'
    ? 'Email attempts stopped: the owner address was missing or unverified. Fix the address and retry.'
    : 'Email attempts stopped after provider or network uncertainty. Review the setup before retrying.';
  return 'Email is waiting for delivery setup or the next attempt; receipt is not confirmed.';
}

export type SafeguardingAlertEvent = {
  review_id: string;
  status: 'pending' | 'leased' | 'sent' | 'failed';
  attempts: number;
  provider: string | null;
  provider_reference: string | null;
  problem: string | null;
  recorded_at: string;
};
export function parseSafeguardingAlertHistory(value: unknown): SafeguardingAlertEvent[] | null {
  if (!Array.isArray(value)) return null;
  const rows: SafeguardingAlertEvent[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.review_id !== 'string' || !['pending','leased','sent','failed'].includes(String(row.status)) ||
      !Number.isInteger(row.attempts) || (row.attempts as number) < 0 || typeof row.recorded_at !== 'string' ||
      !(row.provider === null || typeof row.provider === 'string') ||
      !(row.provider_reference === null || typeof row.provider_reference === 'string') ||
      !(row.problem === null || typeof row.problem === 'string')) return null;
    rows.push(row as SafeguardingAlertEvent);
  }
  return rows;
}

export type SafeguardingAlertHistoryEvent = Omit<SafeguardingAlertEvent, 'review_id'> & { event_id: string };
export function isAlertHistoryCursor(value: string): boolean {
  return /^[1-9][0-9]{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;
}
export function parseSafeguardingAlertFullHistory(value: unknown): SafeguardingAlertHistoryEvent[] | null {
  if (!Array.isArray(value)) return null;
  const entries: SafeguardingAlertHistoryEvent[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.event_id !== 'string' || !isAlertHistoryCursor(row.event_id)) return null;
    const valid = parseSafeguardingAlertHistory([{ ...row, review_id: 'validated-by-database' }]);
    if (!valid) return null;
    entries.push(row as SafeguardingAlertHistoryEvent);
  }
  return entries;
}
