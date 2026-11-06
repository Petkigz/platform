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
