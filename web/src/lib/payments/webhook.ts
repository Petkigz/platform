import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveOpenAttempts } from '@/lib/checkout.ts';
import { getPaymentProvider } from '@/lib/payments/registry';
import type { PaymentProvider, WebhookEvent } from '@/lib/payments/provider';
import { bindPayment, failureIsFor } from '@/lib/payments/binding';

/**
 * The webhook handler, shared by the generic route and the per-provider routes.
 *
 * It exists in one place because the two trust modes differ in a way that is
 * easy to get subtly wrong, and two copies would drift.
 *
 * THE TWO MODES
 *
 * A provider that signs (`webhookTrust: 'signature'`) is gated on the
 * signature: verify it against the raw bytes, and a failed check is a
 * rejection.
 *
 * A provider that does not sign (`webhookTrust: 'requery'` — MTN MoMo and
 * Airtel Money; and pawaPay, whose signature would not say whose payment it
 * is) cannot be gated that way, and rejecting it would silently
 * discard every real payment notification. So the callback is used only to
 * find the order, and the outcome is then fetched from the provider over an
 * authenticated call. **The notification's own claim about success is never
 * believed.** If it were, anyone who knows an order id could POST a forged
 * "SUCCESSFUL" and get the course for free.
 *
 * That distinction is why `signature_verified` is written true on both paths:
 * the column means "this event was confirmed by something only we and the
 * provider could produce". For a signed provider that is the signature; for a
 * requery provider it is the authenticated status response. The payload
 * records which, so the audit trail does not have to be guessed at later.
 *
 * **The order is confirmed too, not only the outcome** (`binding.ts`). The
 * order id in an unsigned notification is a claim like the rest of it. A
 * payment settles the order it names only when the provider's own answer
 * says it was started for that order and, where the answer has an amount,
 * that the amount is the order's total. Otherwise one real payment for a
 * cheap order could be presented as the payment for an expensive one.
 */
export async function handleProviderWebhook(
  request: Request,
  providerId?: string,
): Promise<NextResponse> {
  const provider = getPaymentProvider(providerId);

  // If the caller named a provider we do not have an adapter for, say so
  // rather than falling through to the unconfigured provider and reporting a
  // confusing signature failure.
  if (providerId && provider.id === 'unconfigured') {
    return NextResponse.json({ error: 'unknown provider' }, { status: 404 });
  }

  // The provider signs the exact bytes it sent. Any parsing before verification
  // changes those bytes, so the raw text is read first and the signature is
  // checked against it, not against a re-serialised object.
  const raw = await request.text();

  // Providers differ on the header name; accept the common ones rather than
  // guessing one and silently failing verification for the other.
  const signature =
    request.headers.get('x-signature') ??
    request.headers.get('x-webhook-signature') ??
    request.headers.get('x-pay-signature') ??
    null;

  const signatureOk = provider.verifyWebhookSignature(raw, signature);

  if (!signatureOk && provider.webhookTrust === 'signature') {
    // Deliberately terse. This endpoint is public and telling a caller why a
    // signature failed is telling them how to forge one.
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Not JSON. Record nothing usable; a 400 is correct and the provider
    // should not retry a payload it sent malformed.
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

  // For a requery provider, replace the notification's claim with the
  // provider's authenticated answer before anything is recorded.
  //
  // Annotated rather than inferred: `let x = event` widens back to the full
  // WebhookEvent union even though the 'ignored' case returned above, and the
  // later branch on confirmed.kind then fails to narrow.
  let confirmed: ActionableEvent = event;
  let evidence: unknown = payload;

  if (!signatureOk && provider.webhookTrust === 'requery') {
    const checked = await confirmByQuery(admin, provider, event);
    if (checked.kind === 'defer') {
      // Two kinds of "not now". A payment the provider has not finished, or
      // could not be asked about, may well be confirmed in a minute: that is
      // answered 503, because a provider that redelivers (pawaPay does, eight
      // times over twenty-five minutes) stops as soon as it is told 200, and
      // nothing else here would ever look again. A payment that is real and
      // is not this order's will not become this order's by being sent
      // twice: that is answered 200.
      const again = checked.status === 'still_pending' || checked.status === 'unverified';
      return NextResponse.json(
        { status: checked.status, reason: checked.reason },
        again ? { status: 503, headers: { 'Retry-After': '60' } } : undefined,
      );
    }
    confirmed = checked.event;
    evidence = {
      // Keep both: what the provider posted, and what it said when we asked.
      notification: payload,
      status_query: checked.statusResponse,
      confirmed_by: 'authenticated status query',
      // Where the recorded amount came from: the provider's answer, or the
      // order's own total when the answer carries none.
      ...(checked.amountFrom ? { amount_from: checked.amountFrom } : {}),
    };
  }

  const eventId = await recordEvent(admin, provider.id, confirmed, evidence);
  if (!eventId) {
    // Deduplicated: this exact provider event has been seen before. Acknowledge
    // so the provider stops sending it. Idempotency is a D4 requirement and
    // this is where it is honoured for deliveries that arrive twice.
    return NextResponse.json({ status: 'duplicate' });
  }

  if (confirmed.kind !== 'payment.succeeded') {
    // A failed payment closes the attempt but leaves the order pending, so the
    // payer can try again. A refund's ledger effect is
    // record_refund_in_ledger's job, not this route's.
    if (confirmed.kind === 'payment.failed') {
      await resolveOpenAttempts(admin, {
        orderId: confirmed.orderId,
        status: 'failed',
        providerReference: confirmed.providerReference,
        safeErrorCode: confirmed.reason.slice(0, 80),
      });
    }
    return NextResponse.json({ status: 'recorded', kind: confirmed.kind });
  }

  const { data, error } = await admin.rpc('record_payment_success', {
    // No human actor. A provider callback has nobody behind it, and the
    // governance trail already represents system actions that way;
    // governance_audit_events.actor has always been nullable.
    p_actor_id: null,
    p_order_id: confirmed.orderId,
    p_provider: provider.id,
    p_reference: confirmed.providerReference,
    p_event_id: eventId,
    p_evidence: null,
  });

  if (error) {
    // The order is left pending and the event unprocessed, so a corrected
    // redelivery can still settle it. Marking the event processed here would
    // burn the one chance to apply it.
    await markEventFailed(admin, eventId, error.message);
    await resolveOpenAttempts(admin, {
      orderId: confirmed.orderId,
      status: 'failed',
      providerReference: confirmed.providerReference,
      safeErrorCode: error.code ?? null,
    });
    // The database's sentence is kept on the event (above) and in the log.
    // It is not sent to whoever posted here.
    console.error(`payment webhook (${provider.id}): order ${confirmed.orderId} was confirmed and could not be settled: ${error.message}`);
    return NextResponse.json(
      { status: 'rejected', reason: 'the payment was confirmed and could not be applied' },
      { status: 422 },
    );
  }

  // The attempt is only closed once the payment has actually settled. The
  // table enforces resolved_at exactly when the status is terminal, so both
  // move together or the CHECK refuses the row.
  await resolveOpenAttempts(admin, {
    orderId: confirmed.orderId,
    status: 'succeeded',
    providerReference: confirmed.providerReference,
  });

  void data;
  return NextResponse.json({ status: 'processed', orderId: confirmed.orderId });
}

/** An event we can act on — 'ignored' has already been handled and returned. */
type ActionableEvent = Exclude<WebhookEvent, { kind: 'ignored' }>;

type Confirmed =
  | { kind: 'confirmed'; event: ActionableEvent; statusResponse: unknown; amountFrom?: 'provider' | 'order' }
  | { kind: 'defer'; status: string; reason: string };

/**
 * A status as it can be stored. An amount is a bigint, which cannot be
 * written as JSON: storing the status as it came threw on every confirmed
 * payment, before anything was recorded.
 */
const printable = (status: unknown): unknown =>
  JSON.parse(JSON.stringify(status, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)));

/** The order a notification names, as this platform holds it. */
async function orderNamed(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
): Promise<{ totalMinor: bigint; currency: string } | null> {
  // An id that is not an id is not looked up: it is whatever a stranger sent.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(orderId)) return null;
  const { data, error } = await admin
    .from('orders')
    .select('total_minor, currency_code')
    .eq('id', orderId)
    .maybeSingle();
  const row = data as { total_minor?: string | number | null; currency_code?: string | null } | null;
  if (error || !row || row.total_minor === null || row.total_minor === undefined || !row.currency_code) return null;
  try {
    return { totalMinor: BigInt(row.total_minor), currency: row.currency_code };
  } catch {
    return null;
  }
}

/**
 * Ask the provider what actually happened, and translate the answer.
 *
 * Anything that is not a definite success defers the event rather than
 * recording it. Deferring is not the same as failing: the attempt stays open,
 * so a later notification or a reconciliation pass can still settle it. That
 * matters most for `unknown`, which means the provider was unreachable — and
 * treating an unreachable provider as a failed payment is how a customer who
 * paid gets told they did not, and then charged again when they retry.
 */
async function confirmByQuery(
  admin: ReturnType<typeof createAdminClient>,
  provider: PaymentProvider,
  event: ActionableEvent,
): Promise<Confirmed> {
  // A refund event is passed through: its ledger effect belongs to
  // record_refund_in_ledger, not to this route.
  if (event.kind !== 'payment.succeeded' && event.kind !== 'payment.failed') {
    return { kind: 'confirmed', event, statusResponse: null };
  }

  if (!event.providerReference) {
    return {
      kind: 'defer',
      status: 'deferred',
      reason: 'notification carries no provider reference, so it cannot be verified',
    };
  }

  const status = await provider.fetchPaymentStatus(event.providerReference);

  // The order this is about. What the notification says is a claim, and is
  // only ever compared with the provider's own answer. A notification that
  // names no order at all (pawaPay's need not) claims nothing, so the answer
  // is the only word there is: the order is the one the provider says the
  // payment was started for, which still has to exist and to cost what was
  // paid. A notification never makes an order by being silent about it.
  const confirmedOrder = status.state === 'succeeded' || status.state === 'failed' ? status.orderId ?? null : null;
  const claimed = event.orderId.trim() !== '' ? event.orderId : confirmedOrder ?? '';

  if (status.state === 'succeeded') {
    // The payment is real. Whether it is the payment for the order this
    // notification names is a separate question, and the notification cannot
    // answer it.
    const bound = bindPayment({
      claimedOrderId: claimed,
      confirmedOrderId: status.orderId,
      confirmedAmount: status.amount,
      order: await orderNamed(admin, claimed),
    });
    if (!bound.ok) {
      // Kept for whoever runs the site: either a provider answering in a shape
      // nobody expected, or somebody presenting one order's payment as another's.
      console.error(
        `payment webhook (${provider.id}): reference ${event.providerReference} succeeded but does not settle order ${claimed || '(none named)'}: ${bound.why}`,
      );
      return {
        kind: 'defer',
        status: 'not_applied',
        reason: 'the payment the provider confirms is not a payment of this order',
      };
    }
    return {
      kind: 'confirmed',
      // The amount is the one the provider reported over an authenticated
      // call, or the order's own total when it reported none. Never the one
      // in the unsigned notification body.
      event: {
        kind: 'payment.succeeded',
        eventId: event.eventId,
        providerReference: event.providerReference,
        orderId: claimed,
        amount: bound.amount,
        raw: { notification: event.raw, financialTransactionId: status.financialTransactionId },
      },
      statusResponse: printable(status),
      amountFrom: bound.amountFrom,
    };
  }

  if (status.state === 'failed') {
    // A failure closes an order's open attempts, so it has to be this order's.
    if (!failureIsFor(claimed, status.orderId)) {
      return {
        kind: 'defer',
        status: 'not_applied',
        reason: 'the failure the provider confirms is not a failure of this order',
      };
    }
    return {
      kind: 'confirmed',
      event: {
        kind: 'payment.failed',
        eventId: event.eventId,
        providerReference: event.providerReference,
        orderId: claimed,
        reason: status.reason,
        raw: event.raw,
      },
      statusResponse: printable(status),
    };
  }

  // pending or unknown: leave it alone and let a later delivery settle it.
  if (status.state === 'unknown') {
    // Why, for whoever runs the site. This address is public, and whoever
    // posted here is not told what a provider said about a reference they
    // chose: an adapter's reason can quote the provider's own answer.
    console.error(`payment webhook (${provider.id}): reference ${event.providerReference} could not be confirmed: ${status.reason}`);
  }
  return {
    kind: 'defer',
    status: status.state === 'pending' ? 'still_pending' : 'unverified',
    reason:
      status.state === 'pending'
        ? 'the provider has not finished processing this payment'
        : 'the provider could not confirm this payment just now',
  };
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
  evidence: unknown,
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
      payload: evidence,
      // This column is what record_payment_success() checks before it will act,
      // so writing true here is the one place in the system that asserts the
      // event was confirmed by something only we and the provider could produce
      // — a signature for signing providers, an authenticated status query for
      // the ones that do not sign. Both happen above, before this write.
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
    .update({ processing_status: 'failed', processing_error: reason.slice(0, 500) })
    .eq('id', eventId);
}
