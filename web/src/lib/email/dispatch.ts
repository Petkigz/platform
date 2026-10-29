/**
 * The one loop a dispatcher runs: claim, send, settle.
 *
 * Deliberately small and deliberately dumb. The rules — the lease, the backoff,
 * the dead letter, the do-not-send list — all live in the database, where a
 * second client cannot skip them. What is here is the order of three calls and
 * the handling of the two ways it can go wrong:
 *
 *   - a message that fails to send must still be *settled*, or its five-minute
 *     lease expires and the next run tries it again with the attempt counter
 *     stuck at the same number, which is an infinite retry wearing a disguise;
 *   - a settlement that fails must not abort the run, because the other
 *     twenty-four messages are not responsible for it.
 *
 * Nothing here knows what a vendor is. `send` is a function.
 */

import type { SendResult } from './provider.ts';

export type ClaimedMessage = {
  id: string;
  channel: 'email' | 'sms';
  to: string;
  subject: string | null;
  body: string;
  templateCode: string;
  purpose: string;
  attempts: number;
};

export type Claim = {
  disabled: boolean;
  claimed: ClaimedMessage[];
  reason?: string;
  maxAttempts?: number;
};

export type DispatchReport = {
  /** False when delivery is switched off: nothing was claimed and nothing ran. */
  ran: boolean;
  disabledReason: string | null;
  claimed: number;
  sent: number;
  retried: number;
  bounced: number;
  /** Settlements the database refused, kept so a person can see them. */
  failures: { messageId: string; to: string; error: string }[];
};

export type DispatchDeps = {
  claim: (limit: number) => Promise<Claim>;
  send: (message: ClaimedMessage) => Promise<SendResult>;
  settle: (
    messageId: string,
    result: SendResult,
  ) => Promise<void>;
  limit?: number;
};

const EMPTY: DispatchReport = {
  ran: false,
  disabledReason: null,
  claimed: 0,
  sent: 0,
  retried: 0,
  bounced: 0,
  failures: [],
};

/**
 * Run one pass.
 *
 * A message whose settlement fails is counted as neither sent nor retried: it is
 * in an unknown state, and guessing at it is how a report starts disagreeing
 * with the table it describes.
 */
export async function dispatchOnce(deps: DispatchDeps): Promise<DispatchReport> {
  const claim = await deps.claim(deps.limit ?? 20);

  if (claim.disabled) {
    return {
      ...EMPTY,
      ran: false,
      disabledReason:
        claim.reason
        ?? 'delivery.notifications is off, so nothing is claimed and nothing sends',
    };
  }

  const report: DispatchReport = { ...EMPTY, ran: true, claimed: claim.claimed.length, failures: [] };
  if (claim.claimed.length === 0) return report;

  for (const message of claim.claimed) {
    let result: SendResult;
    if (message.channel !== 'email') {
      // The provider chosen first is email. An SMS row is left claimed and comes
      // back on its lease rather than being settled with a guess, because
      // "failed" would be a claim about a channel nothing has tried.
      result = {
        outcome: 'retry',
        error: 'no SMS provider is configured, so this is still waiting for one',
      };
    } else {
      try {
        result = await deps.send(message);
      } catch (error) {
        result = {
          outcome: 'retry',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    try {
      await deps.settle(message.id, result);
      if (result.outcome === 'sent') report.sent += 1;
      else if (result.outcome === 'bounce') report.bounced += 1;
      else report.retried += 1;
    } catch (error) {
      report.failures.push({
        messageId: message.id,
        to: message.to,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return report;
}

/** The parameter list `record_delivery_outcome()` expects, from a result. */
export function settleArgs(result: SendResult): {
  outcome: 'sent' | 'error' | 'bounce';
  provider: string | null;
  reference: string | null;
  error: string | null;
} {
  if (result.outcome === 'sent') {
    return {
      outcome: 'sent',
      provider: result.provider,
      reference: result.reference,
      error: null,
    };
  }
  return {
    outcome: result.outcome === 'bounce' ? 'bounce' : 'error',
    provider: null,
    reference: null,
    error: result.error,
  };
}

/** What the dispatcher should say about itself, on screen or in a log line. */
export function describeReport(report: DispatchReport): string {
  if (!report.ran) {
    return report.disabledReason ?? 'Delivery is switched off, so nothing was claimed.';
  }
  if (report.claimed === 0) {
    return 'Nothing was due. Every queued message is either sent, waiting on a backoff, or claimed by another run.';
  }
  const parts = [`${report.claimed} claimed`];
  if (report.sent > 0) parts.push(`${report.sent} sent`);
  if (report.retried > 0) parts.push(`${report.retried} back on the queue`);
  if (report.bounced > 0) parts.push(`${report.bounced} address${report.bounced === 1 ? '' : 'es'} suppressed`);
  if (report.failures.length > 0) {
    parts.push(`${report.failures.length} could not be settled`);
  }
  return `${parts.join(', ')}.`;
}
