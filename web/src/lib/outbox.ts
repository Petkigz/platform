import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Reading the outbox.
 *
 * The shape comes from `outbox_standing()`, a single call rather than six
 * counts, because the numbers only mean anything together: "three dead letters"
 * next to "delivery is off" is a different situation to the same three next to
 * "delivery is on and three are due now".
 */
export type OutboxCounts = {
  queued: number;
  dueNow: number;
  inFlight: number;
  sent: number;
  failed: number;
  suppressed: number;
};

export type DeadLetter = {
  id: string;
  to: string;
  template: string;
  attempts: number;
  lastError: string | null;
  deadLetteredAt: string | null;
};

export type OutboxStanding = {
  deliveryEnabled: boolean;
  maxAttempts: number;
  counts: OutboxCounts;
  nextDueAt: string | null;
  oldestQueuedAt: string | null;
  suppressedAddresses: number;
  deadLetters: DeadLetter[];
};

export class OutboxError extends Error {}

function num(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  throw new OutboxError(`the standing has no ${field}`);
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Turn the RPC's JSON into the page's type, or refuse.
 *
 * Refusing matters more here than elsewhere: an empty dead-letter list and a
 * standing that failed to load look identical on screen, and one of them means
 * "nobody needs looking at" while the other means "you are looking at nothing".
 */
export function parseStanding(value: unknown): OutboxStanding {
  if (!value || typeof value !== 'object') throw new OutboxError('the outbox did not load');

  const raw = value as Record<string, unknown>;
  const counts = (raw.counts ?? {}) as Record<string, unknown>;
  const dead = Array.isArray(raw.deadLetters) ? raw.deadLetters : [];

  return {
    // Only the literal `true` means on. A missing flag is off, which is also
    // what the feature ships as.
    deliveryEnabled: raw.deliveryEnabled === true,
    maxAttempts: num(raw.maxAttempts, 'attempt ceiling'),
    counts: {
      queued: num(counts.queued, 'queued count'),
      dueNow: num(counts.dueNow, 'due count'),
      inFlight: num(counts.inFlight, 'in-flight count'),
      sent: num(counts.sent, 'sent count'),
      failed: num(counts.failed, 'failed count'),
      suppressed: num(counts.suppressed, 'suppressed count'),
    },
    nextDueAt: strOrNull(raw.nextDueAt),
    oldestQueuedAt: strOrNull(raw.oldestQueuedAt),
    suppressedAddresses: num(raw.suppressedAddresses, 'suppression count'),
    deadLetters: dead.map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      if (typeof row.id !== 'string') throw new OutboxError('a dead letter has no id');
      return {
        id: row.id,
        to: typeof row.to === 'string' ? row.to : '',
        template: typeof row.template === 'string' ? row.template : '',
        attempts: typeof row.attempts === 'number' ? row.attempts : 0,
        lastError: strOrNull(row.lastError),
        deadLetteredAt: strOrNull(row.deadLetteredAt),
      };
    }),
  };
}

/**
 * The one sentence the screen opens with.
 *
 * It is written here rather than in JSX so it can be tested: the difference
 * between "switched on but idle" and "switched off, nothing leaves" is the
 * whole reason the flag is checked in the claim function as well as here.
 */
export function deliveryNote(standing: Pick<OutboxStanding, 'deliveryEnabled' | 'counts'>): string {
  if (!standing.deliveryEnabled) {
    return 'Delivery is switched off, so nothing is claimed and nothing sends. '
      + 'The rows below are the record of what the platform would send.';
  }
  if (standing.counts.dueNow === 0) {
    return 'Delivery is switched on. Nothing is waiting to be sent right now.';
  }
  return `Delivery is switched on and ${standing.counts.dueNow} message`
    + `${standing.counts.dueNow === 1 ? ' is' : 's are'} waiting for a dispatcher.`;
}

export type RetryResult =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string };

/**
 * Put a dead letter back in the queue.
 *
 * Two refusals are translated rather than passed through, because both are
 * things a person can act on: a suppressed address needs the do-not-send list
 * lifted first, and a message that is not dead needs nothing doing to it.
 */
export async function retryMessage(
  supabase: SupabaseClient,
  input: { id?: unknown; reason?: unknown },
): Promise<RetryResult> {
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';

  if (!id) return { ok: false, status: 400, error: 'Which message?' };
  if (reason.length < 4) {
    return { ok: false, status: 400, error: 'Say why it is worth another try.' };
  }

  const { data, error } = await supabase.rpc('retry_outbound_message', {
    p_message_id: id,
    p_reason: reason,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('do-not-send list')) {
      return {
        ok: false,
        status: 409,
        error: 'That address is on the do-not-send list. Lift the suppression before retrying.',
      };
    }
    if (msg.includes('nothing to revive')) {
      return { ok: false, status: 409, error: 'That message is not a dead letter.' };
    }
    if (msg.includes('only platform staff')) {
      return { ok: false, status: 403, error: 'Only staff can retry a message.' };
    }
    return { ok: false, status: 400, error: error.message };
  }

  const row = (data ?? {}) as { id?: string };
  return { ok: true, id: typeof row.id === 'string' ? row.id : id };
}

export type SuppressResult =
  | { ok: true; address: string; stoppedQueued: number }
  | { ok: false; status: number; error: string };

/**
 * Add an address to the do-not-send list by hand.
 *
 * Staff need this for the case a provider cannot report: a family writing in to
 * say the mail is going to a stranger, or a complaint that arrived somewhere
 * else. Whatever is already queued for the address is stopped with it — a list
 * that only governed future messages would still deliver yesterday's queue.
 */
export async function suppressAddress(
  supabase: SupabaseClient,
  input: { channel?: unknown; address?: unknown; reason?: unknown },
): Promise<SuppressResult> {
  const channel = input.channel === 'sms' ? 'sms' : 'email';
  const address = typeof input.address === 'string' ? input.address.trim() : '';
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';

  if (address.length < 3) {
    return { ok: false, status: 400, error: 'That is not an address.' };
  }
  if (reason.length < 4) {
    return { ok: false, status: 400, error: 'Say why this address should not be written to.' };
  }

  const { data, error } = await supabase.rpc('suppress_address', {
    p_channel: channel,
    p_address: address,
    p_reason: reason,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('only platform staff')) {
      return { ok: false, status: 403, error: 'Only staff can stop mail to an address.' };
    }
    return { ok: false, status: 400, error: error.message };
  }

  const row = (data ?? {}) as { address?: string; stoppedQueued?: number };
  return {
    ok: true,
    address: typeof row.address === 'string' ? row.address : address.toLowerCase(),
    stoppedQueued: typeof row.stoppedQueued === 'number' ? row.stoppedQueued : 0,
  };
}
