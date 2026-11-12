import { resolveEmailProvider, sendWithResend, type SendResult } from './email/provider.ts';

// Intentionally no names, case details, IDs or record-specific links in email.
const SUBJECT = 'AyahSpring: please check your dashboard';
const BODY = 'Please sign in to AyahSpring and check your owner dashboard. Do not reply with personal information.';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Lease = { reviewId: string; token: string; ownerId: string };
export type AlertPorts = {
  claim: () => Promise<unknown>;
  owner: (id: string) => Promise<{ id: string; email: string | null; verified: boolean } | null>;
  allowed: (lease: Lease) => Promise<boolean>;
  send: (to: string) => Promise<SendResult>;
  settle: (lease: Lease, outcome: 'not_sent' | 'address_unverified' | 'provider_uncertain' | 'sent', provider?: string, reference?: string) => Promise<boolean>;
};
export type AlertResult = 'disabled' | 'owner_unavailable' | 'empty' | 'sent' | 'recorded' | 'uncertain';

export async function dispatchSafeguardingAlert(ports: AlertPorts): Promise<AlertResult> {
  let value: unknown;
  try { value = await ports.claim(); } catch { return 'uncertain'; }
  if (!value || typeof value !== 'object') return 'uncertain';
  const row = value as Record<string, unknown>;
  if (row.state === 'disabled' || row.state === 'owner_unavailable' || row.state === 'empty') return row.state;
  if (row.state !== 'leased' || typeof row.reviewId !== 'string' || !UUID.test(row.reviewId)
      || typeof row.token !== 'string' || !UUID.test(row.token) || typeof row.ownerId !== 'string' || !UUID.test(row.ownerId)) return 'uncertain';
  const lease: Lease = { reviewId: row.reviewId, token: row.token, ownerId: row.ownerId };
  const settle = async (outcome: 'not_sent' | 'address_unverified' | 'provider_uncertain' | 'sent', provider?: string, reference?: string): Promise<AlertResult> => {
    try {
      if (!await ports.settle(lease, outcome, provider, reference)) return 'uncertain';
      return outcome === 'sent' ? 'sent' : 'recorded';
    } catch { return 'uncertain'; }
  };
  let owner: Awaited<ReturnType<AlertPorts['owner']>>;
  try { owner = await ports.owner(lease.ownerId); } catch { return settle('provider_uncertain'); }
  if (!owner || owner.id !== lease.ownerId || !owner.verified || !owner.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email)) return settle('address_unverified');
  try { if (!await ports.allowed(lease)) return settle('not_sent'); }
  catch { return settle('not_sent'); }
  let result: SendResult;
  try { result = await ports.send(owner.email); } catch { return settle('provider_uncertain'); }
  if (!result || result.outcome !== 'sent' || typeof result.reference !== 'string' || !result.reference.trim() ||
      typeof result.provider !== 'string' || !result.provider.trim()) return settle('provider_uncertain');
  return settle('sent', result.provider, result.reference);
}

/** Provider setup is checked before claiming, so no unconfigured attempts burn. */
export async function runSafeguardingAlert(options: {
  env: Record<string, string | undefined>;
  ports: Omit<AlertPorts, 'send'>;
  fetchImpl?: typeof fetch;
}): Promise<AlertResult | 'provider_unavailable'> {
  const provider = resolveEmailProvider(options.env);
  if (provider.kind === 'none') return 'provider_unavailable';
  return dispatchSafeguardingAlert({ ...options.ports, send: (to) => sendWithResend(provider, {
    id: 'safeguarding-alert', to, subject: SUBJECT, body: BODY, templateCode: 'private-alert', attempts: 0,
  }, options.fetchImpl) });
}

/** Only setup failures independent of private queue contents are exposed to the scheduler. */
export function safeguardingSchedulerStatus(outcome: AlertResult | 'provider_unavailable'): 200 | 503 {
  return outcome === 'provider_unavailable' ? 503 : 200;
}
