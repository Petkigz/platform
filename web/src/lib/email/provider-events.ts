import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * What the email provider says about a message after it accepted it.
 *
 * `sent` in the outbox means the provider took the message. Whether it arrived
 * is learned later, and only if the provider tells us: Resend does that by
 * calling a webhook. This file is everything about that call that needs no
 * database and no network: whether the call is really from the provider, what
 * it says, and what the route answers.
 *
 * **The signature.** Resend signs with Svix: an HMAC-SHA256 over
 * `<id>.<timestamp>.<raw body>`, keyed with the base64 part of the signing
 * secret (after `whsec_`), sent base64 in `svix-signature` as `v1,<signature>`
 * (several, separated by spaces, while a secret is being rotated). The body
 * must be the bytes that arrived; a parsed and re-written body does not verify.
 *
 * **The timestamp.** A captured call sent again later carries a valid
 * signature. A call older (or newer) than five minutes is refused.
 *
 * **What is trusted from the body.** The kind of event, the provider's
 * identifier of the message, and whether a bounce is permanent. Never an
 * address: the database suppresses the address the platform itself sent that
 * message to (`record_provider_event`, 20261281162000).
 */
export const RESEND_WEBHOOK_TOLERANCE_SECONDS = 5 * 60;
export const RESEND_WEBHOOK_MAX_BYTES = 256 * 1024;

export type SignatureCheck = 'ok' | 'not_configured' | 'malformed' | 'stale' | 'bad_signature';

export type SignedCall = {
  secret: string | undefined;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowSeconds: number;
};

/** The key bytes of a signing secret, or null when it is not one. */
function secretBytes(secret: string | undefined): Buffer | null {
  const text = (secret ?? '').trim();
  if (!text.startsWith('whsec_')) return null;
  const encoded = text.slice('whsec_'.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const bytes = Buffer.from(encoded, 'base64');
  // A key shorter than this is a mistyped secret, not a secret.
  return bytes.length >= 16 ? bytes : null;
}

/** Whether a webhook signing secret is set and has the shape of one. */
export function isResendWebhookConfigured(secret: string | undefined): boolean {
  return secretBytes(secret) !== null;
}

/** What the provider's signature over a call would be. Exported for the tests and the probe. */
export function signSvix(secret: string, id: string, timestamp: string, body: string): string | null {
  const key = secretBytes(secret);
  if (!key) return null;
  return createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
}

/** Is this call from the holder of the signing secret, and recent? */
export function verifySvix(call: SignedCall): SignatureCheck {
  const key = secretBytes(call.secret);
  if (!key) return 'not_configured';
  const id = (call.id ?? '').trim();
  const timestamp = (call.timestamp ?? '').trim();
  const signature = (call.signature ?? '').trim();
  if (!id || id.length > 200 || !/^\d{1,12}$/.test(timestamp) || !signature || signature.length > 2000) return 'malformed';
  const sentAt = Number(timestamp);
  if (!Number.isFinite(call.nowSeconds) || Math.abs(call.nowSeconds - sentAt) > RESEND_WEBHOOK_TOLERANCE_SECONDS) return 'stale';
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${call.body}`).digest();
  let matched = false;
  for (const part of signature.split(/\s+/)) {
    const comma = part.indexOf(',');
    if (comma < 0 || part.slice(0, comma) !== 'v1') continue;
    const given = Buffer.from(part.slice(comma + 1), 'base64');
    // Every candidate is compared, so the time taken does not say which one matched.
    if (given.length === expected.length && timingSafeEqual(given, expected)) matched = true;
  }
  return matched ? 'ok' : 'bad_signature';
}

export type ProviderEventKind = 'delivered' | 'delayed' | 'bounced' | 'complained' | 'failed';

export type ProviderEvent = {
  kind: ProviderEventKind;
  /** The provider's identifier of the message: what `sent` was settled with. */
  reference: string;
  /** Only a bounce the provider itself calls permanent. */
  permanent: boolean;
  occurredAt: string | null;
};

/**
 * The events that say what became of a message. Everything else Resend can
 * send (opened, clicked, sent, scheduled, domain and contact events) is
 * acknowledged and not kept: the platform does not track opens or clicks.
 *
 * `email.suppressed` means Resend itself declined to send, because the address
 * is on Resend's own list. It is kept as `failed`: the outbox then shows that
 * the message did not go, and the platform's own list is not changed by a
 * list the owner can edit in Resend's dashboard.
 */
const KINDS: Record<string, ProviderEventKind> = {
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
  'email.suppressed': 'failed',
};

/** What a verified body says, or null when it says nothing the platform keeps. */
export function readResendEvent(body: string): ProviderEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const root = parsed as Record<string, unknown>;
  const kind = typeof root.type === 'string' ? KINDS[root.type] : undefined;
  if (!kind) return null;
  const data = root.data && typeof root.data === 'object' && !Array.isArray(root.data) ? (root.data as Record<string, unknown>) : null;
  const reference = data && typeof data.email_id === 'string' ? data.email_id.trim() : '';
  if (!reference || reference.length > 200) return null;
  const bounce = data && data.bounce && typeof data.bounce === 'object' ? (data.bounce as Record<string, unknown>) : null;
  const permanent = kind === 'bounced' && typeof bounce?.type === 'string' && bounce.type.trim().toLowerCase() === 'permanent';
  const at = typeof root.created_at === 'string' && !Number.isNaN(Date.parse(root.created_at)) ? new Date(root.created_at).toISOString() : null;
  return { kind, reference, permanent, occurredAt: at };
}

export type WebhookAnswer = { status: 200 | 401 | 413 | 500 | 503; body: { ok: boolean; code?: string } };

export type WebhookCall = {
  secret: string | undefined;
  headers: { id: string | null; timestamp: string | null; signature: string | null };
  body: string;
  nowSeconds: number;
  /** Writes the event. Called only for a verified call that says something kept. Throws when the write did not happen. */
  record: (eventId: string, event: ProviderEvent) => Promise<void>;
};

/**
 * One call from the provider, start to finish.
 *
 * - 503 while no signing secret is set: the route exists before the account does.
 * - 413 for a body larger than any event the provider sends.
 * - 401 for a call that is not signed by the secret or is not recent.
 * - 200 for a verified call, whether or not it said something the platform
 *   keeps. A provider sends an unanswered event again for hours; an event the
 *   platform has no use for must not be asked for again.
 * - 500 when a verified event could not be written, so that it IS sent again.
 *
 * The answer never says what the event was or whether an address was
 * suppressed.
 */
export async function handleResendWebhook(call: WebhookCall): Promise<WebhookAnswer> {
  if (!isResendWebhookConfigured(call.secret)) return { status: 503, body: { ok: false, code: 'not_configured' } };
  if (Buffer.byteLength(call.body, 'utf8') > RESEND_WEBHOOK_MAX_BYTES) return { status: 413, body: { ok: false, code: 'too_large' } };
  const check = verifySvix({ secret: call.secret, ...call.headers, body: call.body, nowSeconds: call.nowSeconds });
  if (check !== 'ok') return { status: 401, body: { ok: false, code: check } };
  const event = readResendEvent(call.body);
  if (!event) return { status: 200, body: { ok: true } };
  try {
    await call.record((call.headers.id ?? '').trim(), event);
  } catch {
    return { status: 500, body: { ok: false, code: 'not_recorded' } };
  }
  return { status: 200, body: { ok: true } };
}
