import { resolveEmailProvider, sendWithResend, type SendResult } from './email/provider.ts';

/**
 * The email that tells the owner something needs them.
 *
 * The register is private (`owner_alerts`, 20261281159000) and is worked only
 * by the server's service role. One run handles one alert: claim it, find the
 * owner's address, ask the database once more whether it should still go,
 * send, and settle. Whatever goes wrong is settled as what it was; nothing
 * says "sent" that the provider did not confirm.
 *
 * **What the email says.** That a post was reported and where the desk is.
 * Nothing about the post, who wrote it or who reported it: the email crosses
 * a provider and lands in an inbox, and neither is the place for that.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const OWNER_ALERT_KINDS = ['board_reported'] as const;
export type OwnerAlertKind = (typeof OWNER_ALERT_KINDS)[number];

/** The words of each kind. `desk` is the page the owner goes to, under the site's address when that is known. */
const WORDS: Record<OwnerAlertKind, { subject: string; lead: string; desk: string }> = {
  board_reported: {
    subject: 'AyahSpring: a discussion post was reported',
    lead: 'A post on a discussion board has been reported and is waiting for you.',
    desk: '/admin/boards',
  },
};

/** The subject and the body of an alert. No name, no words of a post, no identifier. */
export function ownerAlertMessage(kind: OwnerAlertKind, origin: string | null): { subject: string; body: string } {
  const words = WORDS[kind];
  const where = origin ? `Open ${origin}${words.desk} to deal with it.` : `Sign in to AyahSpring and open ${words.desk} to deal with it.`;
  return {
    subject: words.subject,
    body: `${words.lead}\n\n${where}\n\nThis message says nothing about the post or about anybody. Do not reply with personal information.`,
  };
}

type Lease = { alertId: string; token: string; ownerId: string; kind: OwnerAlertKind };
type Outcome = 'not_sent' | 'address_unverified' | 'provider_uncertain' | 'sent';
export type OwnerAlertPorts = {
  claim: () => Promise<unknown>;
  owner: (id: string) => Promise<{ id: string; email: string | null; verified: boolean } | null>;
  allowed: (lease: Lease) => Promise<boolean>;
  send: (to: string, kind: OwnerAlertKind) => Promise<SendResult>;
  settle: (lease: Lease, outcome: Outcome, provider?: string, reference?: string) => Promise<boolean>;
};
export type OwnerAlertResult = 'disabled' | 'empty' | 'sent' | 'recorded' | 'uncertain';

export async function dispatchOwnerAlert(ports: OwnerAlertPorts): Promise<OwnerAlertResult> {
  let value: unknown;
  try {
    value = await ports.claim();
  } catch {
    return 'uncertain';
  }
  if (!value || typeof value !== 'object') return 'uncertain';
  const row = value as Record<string, unknown>;
  if (row.state === 'disabled' || row.state === 'empty') return row.state;
  if (
    row.state !== 'leased' ||
    typeof row.alertId !== 'string' || !UUID.test(row.alertId) ||
    typeof row.token !== 'string' || !UUID.test(row.token) ||
    typeof row.ownerId !== 'string' || !UUID.test(row.ownerId) ||
    !(OWNER_ALERT_KINDS as readonly unknown[]).includes(row.kind)
  ) {
    // A lease this code cannot read is left to run out; nothing is sent for it.
    return 'uncertain';
  }
  const lease: Lease = { alertId: row.alertId, token: row.token, ownerId: row.ownerId, kind: row.kind as OwnerAlertKind };

  const settle = async (outcome: Outcome, provider?: string, reference?: string): Promise<OwnerAlertResult> => {
    try {
      if (!(await ports.settle(lease, outcome, provider, reference))) return 'uncertain';
      return outcome === 'sent' ? 'sent' : 'recorded';
    } catch {
      return 'uncertain';
    }
  };

  let owner: Awaited<ReturnType<OwnerAlertPorts['owner']>>;
  try {
    owner = await ports.owner(lease.ownerId);
  } catch {
    return settle('provider_uncertain');
  }
  // Only an address the owner has confirmed is theirs.
  if (!owner || owner.id !== lease.ownerId || !owner.verified || !owner.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email)) {
    return settle('address_unverified');
  }
  try {
    if (!(await ports.allowed(lease))) return settle('not_sent');
  } catch {
    return settle('not_sent');
  }

  let result: SendResult;
  try {
    result = await ports.send(owner.email, lease.kind);
  } catch {
    return settle('provider_uncertain');
  }
  if (
    !result || result.outcome !== 'sent' ||
    typeof result.reference !== 'string' || !result.reference.trim() ||
    typeof result.provider !== 'string' || !result.provider.trim()
  ) {
    return settle('provider_uncertain');
  }
  return settle('sent', result.provider, result.reference);
}

/** The provider is looked for before anything is claimed, so a missing key uses up no attempt. */
export async function runOwnerAlert(options: {
  env: Record<string, string | undefined>;
  origin: string | null;
  ports: Omit<OwnerAlertPorts, 'send'>;
  fetchImpl?: typeof fetch;
}): Promise<OwnerAlertResult | 'provider_unavailable'> {
  const provider = resolveEmailProvider(options.env);
  if (provider.kind === 'none') return 'provider_unavailable';
  return dispatchOwnerAlert({
    ...options.ports,
    send: (to, kind) => {
      const message = ownerAlertMessage(kind, options.origin);
      return sendWithResend(
        provider,
        { id: 'owner-alert', to, subject: message.subject, body: message.body, templateCode: 'private-alert', attempts: 0 },
        options.fetchImpl,
      );
    },
  });
}

/** The scheduler holds a shared secret and is not the owner: it learns whether email is set up, and nothing about the queue. */
export function ownerAlertSchedulerStatus(outcome: OwnerAlertResult | 'provider_unavailable'): 200 | 503 {
  return outcome === 'provider_unavailable' ? 503 : 200;
}

/** How the owner's own alerts stand, as `my_owner_alerts()` answers; null when the reply cannot be read. */
export type OwnerAlertStanding = {
  sending: boolean;
  waiting: number;
  failed: number;
  lastSentAt: string | null;
  lastProblem: 'address_unverified' | 'provider_uncertain' | null;
};

export function parseOwnerAlertStanding(value: unknown): OwnerAlertStanding | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const count = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
  if (typeof row.sending !== 'boolean' || !count(row.waiting) || !count(row.failed)) return null;
  const at = row.lastSentAt ?? null;
  if (at !== null && (typeof at !== 'string' || Number.isNaN(Date.parse(at)))) return null;
  const problem = row.lastProblem ?? null;
  if (problem !== null && problem !== 'address_unverified' && problem !== 'provider_uncertain') return null;
  return { sending: row.sending, waiting: row.waiting, failed: row.failed, lastSentAt: at, lastProblem: problem };
}

/** One English sentence for the staff desk. */
export function describeOwnerAlerts(standing: OwnerAlertStanding): string {
  if (!standing.sending) {
    return standing.waiting > 0
      ? 'Email is switched off (delivery.notifications), so no alert has been sent to you; one is waiting and will go when email is switched on, if a report is still waiting then.'
      : 'Email is switched off (delivery.notifications), so no alert is sent to you when a post is reported.';
  }
  if (standing.lastProblem === 'address_unverified') {
    return 'An alert could not be sent to you: the email address on your account has not been confirmed.';
  }
  if (standing.failed > 0 || standing.lastProblem === 'provider_uncertain') {
    return 'An alert to you may not have arrived: the email provider did not confirm it. Check the provider and this page.';
  }
  return standing.waiting > 0
    ? 'An email alert to you is waiting to go.'
    : 'You are sent an email when a post is reported, at most one every fifteen minutes.';
}
