import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/env';
import { getPaymentProvider } from '@/lib/payments/registry';
import type { WebhookEvent } from '@/lib/payments/provider';

export const dynamic = 'force-dynamic';

// The provider signs the exact bytes it sent. Any parsing before verification
// changes those bytes, so the raw text is read first and the signature is
// checked against it, not against a re-serialised object.
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const provider = getPaymentProvider();
  const raw = await request.text();

  // Providers differ on the header name; accept the common ones rather than
  // guessing one and silently failing verification for the other.
  const signature =
    request.headers.get('x-signature') ??
    request.headers.get('x-webhook-signature') ??
    request.headers.get('x-pay-signature') ??
    null;

  // UnconfiguredProvider returns false for everything, so an unconfigured
  // deployment refuses every callback rather than accepting unsigned ones.
  if (!provider.verifyWebhookSignature(raw, signature)) {
    // Deliberately terse. This endpoint is public and telling a caller why a
    // signature failed is telling them how to forge one.
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Verified but not JSON. Record nothing usable; a 400 is correct and the
    // provider should not retry a payload it sent malformed.
    return NextResponse.json({ error: 'malformed payload' }, { status: 400 });
  }

  const event = provider.parseWebhookEvent(payload);
  const admin = createAdminClient();

  // An unknown event type is a normal occurrence — providers add them. It must
  // not become a 500, or the provider retries forever and every retry is a
  // failed request in the logs.
  if (event.kind === 'ignored') {
    return NextResponse.json({ status: 'ignored', reason: event.reason });
  }

  const eventId = await recordEvent(admin, provider.id, event, payload);
  if (!eventId) {
    // Deduplicated: this exact provider event has been seen before. Acknowledge
    // so the provider stops sending it. Idempotency is a D4 requirement and
    // this is where it is honoured for deliveries that arrive twice.
    return NextResponse.json({ status: 'duplicate' });
  }

  if (event.kind !== 'payment.succeeded') {
    // payment.failed and refund.succeeded are recorded above and need no
    // further action here: a failed payment leaves the order pending, and a
    // refund's ledger effect is record_refund_in_ledger's job, not this route's.
    return NextResponse.json({ status: 'recorded', kind: event.kind });
  }

  const { data, error } = await admin.rpc('record_payment_success', {
    // No human actor. A provider callback has nobody behind it, and the
    // governance trail already represents system actions that way;
    // governance_audit_events.actor has always been nullable.
    p_actor_id: null,
    p_order_id: event.orderId,
    p_provider: provider.id,
    p_reference: event.providerReference,
    p_event_id: eventId,
    p_evidence: null,
  });

  if (error) {
    // The order is left pending and the event unprocessed, so a corrected
    // redelivery can still settle it. Marking the event processed here would
    // burn the one chance to apply it.
    await markEventFailed(admin, eventId, error.message);
    return NextResponse.json(
      { status: 'rejected', reason: error.message },
      { status: 422 },
    );
  }

  void data;
  return NextResponse.json({ status: 'processed', orderId: event.orderId });
}

type EventRow = { id: string; processing_status: string }[] | null;

/**
 * Persist the event before acting on it.
 *
 * The order matters. If the event were written after the payment was applied, a
 * crash in between would confirm a payment with no record of what confirmed it —
 * the exact thing payment_evidence exists to prevent.
 *
 * Returns null when the provider event id has already been seen, which is the
 * deduplication signal rather than an error.
 */
async function recordEvent(
  admin: ReturnType<typeof createAdminClient>,
  providerId: string,
  event: Extract<WebhookEvent, { eventId: string }>,
  payload: unknown,
): Promise<string | null> {
  const { data: existing, error: readErr } = await admin
    .from('payment_provider_events')
    .select('id, processing_status')
    .eq('provider', providerId)
    .eq('provider_event_id', event.eventId)
    .limit(1);

  if (readErr) throw new Error(readErr.message);

  const seen = existing as unknown as EventRow;
  if (seen && seen.length > 0) return null;

  const { data: inserted, error: insertErr } = await admin
    .from('payment_provider_events')
    .insert({
      provider: providerId,
      provider_event_id: event.eventId,
      event_type: event.kind,
      payload,
      // True only because verifyWebhookSignature passed above. This column is
      // what record_payment_success() checks before it will act, so writing
      // true here is the one place in the system that asserts a signature was
      // checked — which is why nothing else writes to this table.
      signature_verified: true,
      processing_status: 'received',
    })
    .select('id')
    .single();

  if (insertErr) {
    // A concurrent duplicate loses the race on the unique index. Treat it as a
    // duplicate rather than failing the delivery.
    if (insertErr.code === '23505') return null;
    throw new Error(insertErr.message);
  }

  return (inserted as { id: string } | null)?.id ?? null;
}

async function markEventFailed(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  reason: string,
): Promise<void> {
  await admin
    .from('payment_provider_events')
    .update({ processing_status: 'failed', processing_error: reason })
    .eq('id', eventId);
}
