/**
 * Sending email, without a vendor SDK and without lying about what happened.
 *
 * The database half of delivery has existed since 2026-12-70: a message is
 * queued, claimed for five minutes, sent, and settled with a provider's own
 * reference — or retried on a backoff, or dead-lettered, or suppressed because
 * the address hard-bounced. What was missing was the one call in the middle.
 *
 * This file is that call, written so that the vendor is a string in an
 * environment variable rather than an import. Two rules shaped it:
 *
 * **1. `sent` is a claim about the world, and only the provider can make it.**
 * Every path that does not end in a provider's reference ends in `retry` or
 * `bounce`, never in success. A 200 with no id is not a delivery.
 *
 * **2. Suppressing an address is irreversible in the ordinary flow, so it needs
 * a confident signal.** A hard bounce means the mailbox does not exist. A 401
 * means *our* API key is wrong — the address is perfectly good, and suppressing
 * it would silently cut a parent off from receipts for ever. So the only 4xx
 * that suppresss is one that names the recipient. Everything else retries, and
 * a persistent failure becomes a dead letter, which is a thing a person fixes.
 *
 * Nothing here is specific to Resend except `buildResendRequest()`; the
 * dispatcher takes a `send` function and the tests pass it a fake.
 */

export type OutboundEmail = {
  id: string;
  to: string;
  subject: string | null;
  body: string;
  templateCode: string;
  attempts: number;
};

/** What a provider said, reduced to the three things the database accepts. */
export type SendResult =
  | { outcome: 'sent'; reference: string; provider: string }
  | { outcome: 'retry'; error: string; misconfigured?: boolean }
  | { outcome: 'bounce'; error: string };

export type ProviderConfig =
  | {
      kind: 'resend';
      apiKey: string;
      from: string;
      replyTo: string | null;
    }
  | { kind: 'none'; reason: string };

export const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** The default sender. A deployment that has not set one is not configured. */
export const DEFAULT_FROM = 'no-reply@ayahspring.com';

type Env = Record<string, string | undefined>;

/**
 * Which provider this deployment can actually use, if any.
 *
 * Deliberately total: it never throws, and it answers `none` with a sentence
 * rather than leaving a caller to guess. A dispatcher that runs with no
 * credentials would burn every message's attempt budget against a 401 and
 * dead-letter the lot, so the decision to send is made here, before a claim.
 */
export function resolveEmailProvider(env: Env): ProviderConfig {
  const key = (env.RESEND_API_KEY ?? '').trim();
  const from = (env.EMAIL_FROM ?? '').trim();

  if (key === '') {
    return {
      kind: 'none',
      reason:
        'No email provider is configured. Set RESEND_API_KEY (the free tier sends '
        + '3,000 messages a month) and nothing will be claimed until you do.',
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from === '' ? DEFAULT_FROM : from)) {
    return {
      kind: 'none',
      reason: `EMAIL_FROM is not an address: ${from}`,
    };
  }

  const replyTo = (env.EMAIL_REPLY_TO ?? '').trim();
  return {
    kind: 'resend',
    apiKey: key,
    from: from === '' ? DEFAULT_FROM : from,
    replyTo: replyTo === '' ? null : replyTo,
  };
}

/** The request Resend expects. A plain object, so a test can read it. */
export function buildResendRequest(
  config: Extract<ProviderConfig, { kind: 'resend' }>,
  message: OutboundEmail,
): { url: string; headers: Record<string, string>; body: string } {
  const body: Record<string, unknown> = {
    from: config.from,
    to: [message.to],
    subject: message.subject ?? '',
    text: message.body,
  };
  if (config.replyTo) body.reply_to = config.replyTo;

  return {
    url: RESEND_ENDPOINT,
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

/**
 * A recipient-shaped refusal, which is the only one that may suppress.
 *
 * Matched narrowly on purpose. Resend answers 422 for a malformed request as
 * well as for a bad address, and a body that mentions `to` is the difference
 * between "this person cannot receive mail" and "we sent something the API did
 * not like". Getting this wrong in the other direction is cheap — the message
 * retries and dead-letters, a person looks. Getting it wrong in this direction
 * is a parent who never hears from the platform again.
 */
const RECIPIENT_FAULT =
  /invalid\s+[`"']?to[`"']?\s+field|invalid\s+(recipient|email|address)|recipient\s+(address\s+)?(is\s+)?invalid|not\s+a\s+valid\s+email|(recipient|address).{0,40}(rejected|unknown|does\s+not\s+exist|not\s+found|undeliverable)/i;

export function namesRecipient(body: string): boolean {
  return RECIPIENT_FAULT.test(body);
}

/**
 * Read a Resend answer.
 *
 * The interesting cases are the ones that are easy to get wrong:
 *   - 2xx with no `id` is **not** a delivery, because `record_delivery_outcome()`
 *     will refuse it without a reference and a caller that guessed would be
 *     writing fiction into an audit trail;
 *   - 401 and 403 are our mistake, never the address's;
 *   - 429 and 5xx are the provider asking us to come back.
 */
export function classifyResendResponse(status: number, body: string): SendResult {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }
  const record = (parsed ?? {}) as Record<string, unknown>;
  const message =
    typeof record.message === 'string' && record.message.trim() !== ''
      ? record.message
      : body.slice(0, 300);

  if (status >= 200 && status < 300) {
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    if (id === '') {
      return {
        outcome: 'retry',
        error: 'the provider accepted the message without a reference, so there is nothing to settle it against',
      };
    }
    return { outcome: 'sent', reference: id, provider: 'resend' };
  }

  if (status === 429) {
    return { outcome: 'retry', error: `resend rate-limited us: ${message}` };
  }
  if (status >= 500) {
    return { outcome: 'retry', error: `resend answered ${status}: ${message}` };
  }
  if (status === 401 || status === 403) {
    return {
      outcome: 'retry',
      misconfigured: true,
      error:
        `resend refused our credentials (${status}). The address is fine; the `
        + `configuration is not. ${message}`,
    };
  }
  if (namesRecipient(body)) {
    return { outcome: 'bounce', error: `the address is not usable: ${message}` };
  }
  return { outcome: 'retry', error: `resend answered ${status}: ${message}` };
}

/** A thrown request is a provider we could not reach, never a bad address. */
export function classifyTransportError(error: unknown): SendResult {
  const text = error instanceof Error ? error.message : String(error);
  return { outcome: 'retry', error: `could not reach the provider: ${text}` };
}

/**
 * The real transport.
 *
 * `fetch` is injected by the tests and defaulted here, so the classification
 * above is exercised against the exact code that runs in production rather than
 * against a copy of it.
 */
export async function sendWithResend(
  config: Extract<ProviderConfig, { kind: 'resend' }>,
  message: OutboundEmail,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  const request = buildResendRequest(config, message);
  try {
    const response = await fetchImpl(request.url, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
    });
    const text = await response.text();
    return classifyResendResponse(response.status, text);
  } catch (error) {
    return classifyTransportError(error);
  }
}
