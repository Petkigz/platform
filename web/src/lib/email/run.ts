/**
 * Wiring the loop to the database.
 *
 * Two callers run this and they run the same code: a scheduled run with a worker
 * account, and the "send what is due" button on `/admin/messages` with whoever
 * is looking at the queue. That is not a convenience. The database decides what
 * dispatch means, so a button and a cron job cannot disagree about it, and a
 * staff member pressing the button is subject to exactly the same refusals as a
 * machine.
 *
 * The provider is resolved **before** anything is claimed. A run with no
 * credentials must not claim a single row: claiming is what starts the attempt
 * counter, and a deployment that has not been configured would burn every
 * message's five attempts against a 401 and dead-letter the whole outbox in one
 * pass. That failure mode is silent, plausible-looking, and destroys records of
 * what people were owed — so the check is here, not in a comment.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { dispatchOnce, type Claim, type DispatchReport } from './dispatch.ts';
import {
  classifyTransportError,
  resolveEmailProvider,
  sendWithResend,
  type ProviderConfig,
  type SendResult,
} from './provider.ts';

export type RunResult = {
  report: DispatchReport;
  provider: 'resend' | 'none';
  /** Why nothing ran, when nothing ran. */
  blocked: string | null;
};

type RawClaim = {
  disabled?: unknown;
  claimed?: unknown;
  reason?: unknown;
  maxAttempts?: unknown;
};

function parseClaim(value: unknown): Claim {
  const raw = (value ?? {}) as RawClaim;
  const rows = Array.isArray(raw.claimed) ? raw.claimed : [];
  return {
    disabled: raw.disabled === true,
    reason: typeof raw.reason === 'string' ? raw.reason : undefined,
    maxAttempts: typeof raw.maxAttempts === 'number' ? raw.maxAttempts : undefined,
    claimed: rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        channel: (r.channel === 'sms' ? 'sms' : 'email') as 'email' | 'sms',
        to: String(r.to ?? ''),
        subject: typeof r.subject === 'string' ? r.subject : null,
        body: String(r.body ?? ''),
        templateCode: String(r.templateCode ?? ''),
        purpose: String(r.purpose ?? ''),
        attempts: typeof r.attempts === 'number' ? r.attempts : 0,
      };
    }),
  };
}

export async function runDispatch(options: {
  supabase: SupabaseClient;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  limit?: number;
}): Promise<RunResult> {
  const env = options.env ?? process.env;
  const config: ProviderConfig = resolveEmailProvider(env);

  if (config.kind === 'none') {
    // No claim, no attempt counter, no dead letters. Nothing is owed less than
    // it was a moment ago.
    return {
      provider: 'none',
      blocked: config.reason,
      report: {
        ran: false,
        disabledReason: config.reason,
        claimed: 0,
        sent: 0,
        retried: 0,
        bounced: 0,
        failures: [],
      },
    };
  }

  const send = async (message: {
    to: string;
    subject: string | null;
    body: string;
    id: string;
    templateCode: string;
    attempts: number;
  }): Promise<SendResult> => {
    try {
      return await sendWithResend(config, message, options.fetchImpl ?? fetch);
    } catch (error) {
      return classifyTransportError(error);
    }
  };

  const report = await dispatchOnce({
    limit: options.limit,
    claim: async (limit) => {
      const { data, error } = await options.supabase.rpc('claim_outbound_messages', {
        p_limit: limit,
      });
      if (error) throw new Error(error.message);
      return parseClaim(data);
    },
    send,
    settle: async (messageId, result) => {
      const args = result.outcome === 'sent'
        ? {
            p_outcome: 'sent',
            p_provider: result.provider,
            p_reference: result.reference,
            p_error: null,
          }
        : {
            p_outcome: result.outcome === 'bounce' ? 'bounce' : 'error',
            p_provider: null,
            p_reference: null,
            p_error: result.error,
          };

      const { error } = await options.supabase.rpc('record_delivery_outcome', {
        p_message_id: messageId,
        ...args,
      });
      if (error) throw new Error(error.message);
    },
  });

  return { report, provider: 'resend', blocked: null };
}
