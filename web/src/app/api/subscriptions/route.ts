import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  SUBSCRIPTION_ENGLISH,
  UNPAID_CANCEL_REASON,
  subscriptionReasonOf,
  subscriptionStatusOf,
  type SubscriptionOutcome,
} from '@/lib/subscription-outcome';

export const dynamic = 'force-dynamic';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A refusal: its name, this route's own English beside it, and the name's
 * status. The database's sentence is never part of it. It used to be the
 * whole reply, with a plan version's id inside when a place was full, and
 * the status was chosen by looking for words in it.
 */
const refuse = (reason: SubscriptionOutcome) =>
  NextResponse.json(
    { ok: false, reason, message: SUBSCRIPTION_ENGLISH[reason] },
    { status: subscriptionStatusOf(reason) },
  );

/**
 * The two things a subscriber can do to a subscription: put a learner on
 * it, and cancel it. Both are decided by the database
 * (`allocate_subscription_learner()`, `cancel_subscription()`); this route
 * checks the shape of the request and names the answer.
 *
 * **Cancelling an order that was never paid asks for no reason.** The writer
 * requires one for every cancellation. A request to cancel with no reason is
 * taken only for a subscription that is still `pending`, and a fixed
 * sentence saying nobody was asked is recorded as the reason. A paid plan
 * still needs the subscriber's own words.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return refuse('refused');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse('malformed');
  }
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (b.action !== 'cancel' && b.action !== 'allocate') return refuse('malformed');
  if (typeof b.subscriptionId !== 'string' || !uuid.test(b.subscriptionId)) return refuse('malformed');
  if (b.action === 'allocate' && (typeof b.learnerProfileId !== 'string' || !uuid.test(b.learnerProfileId))) {
    return refuse('malformed');
  }
  if (b.action === 'cancel' && b.reason !== undefined && typeof b.reason !== 'string') return refuse('malformed');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return refuse('not_signed_in');

  if (b.action === 'allocate') {
    const { error } = await supabase.rpc('allocate_subscription_learner', {
      p_subscription_id: b.subscriptionId,
      p_learner_profile_id: b.learnerProfileId,
    } as never);
    if (error) {
      const reason = subscriptionReasonOf(error);
      if (reason === 'refused' || reason === 'unconfirmed') {
        console.error(`subscriptions: adding a learner was ${reason}:`, error.message);
      }
      return refuse(reason);
    }
    return NextResponse.json({ ok: true, changed: true });
  }

  let reason = typeof b.reason === 'string' ? b.reason.trim() : '';
  if (reason.length > 500) return refuse('reason_required');
  if (reason === '') {
    // No reason given: taken only for an order that was never paid. The row
    // policy decides whether this caller can see the subscription at all.
    const found = await supabase.from('subscriptions').select('status').eq('id', b.subscriptionId).maybeSingle();
    if (found.error) {
      // Nothing has been asked of the writer yet, so nothing was changed.
      console.error('subscriptions: a subscription could not be read before cancelling:', found.error.message);
      return refuse('refused');
    }
    if (!found.data) return refuse('not_yours');
    if ((found.data as { status?: unknown }).status !== 'pending') return refuse('reason_required');
    reason = UNPAID_CANCEL_REASON;
  }

  const { data, error } = await supabase.rpc('cancel_subscription', {
    p_subscription_id: b.subscriptionId,
    p_reason: reason,
  } as never);
  if (error) {
    const named = subscriptionReasonOf(error);
    if (named === 'refused' || named === 'unconfirmed') {
      console.error(`subscriptions: cancelling was ${named}:`, error.message);
    }
    return refuse(named);
  }
  // The writer answers false for a subscription that was cancelled already:
  // nothing was changed, and that is not a failure.
  return NextResponse.json({ ok: true, changed: data === true });
}
