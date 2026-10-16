import type { SupabaseClient } from '@supabase/supabase-js';

export type RefundRequest = {
  id: string;
  order_id: string;
  requested_amount_minor: string | number;
  currency_code: string;
  reason: string;
  status: string;
  requested_by: string;
  created_at: string;
};

export type RefundTransaction = {
  id: string;
  refund_request_id: string | null;
  order_id: string;
  amount_minor: string | number;
  currency_code: string;
  status: string;
  refunded_at: string | null;
};

/** A queue row: the request joined to the order it belongs to. */
export type QueueItem = RefundRequest & {
  requester: { display_name: string | null } | null;
};

const REQUEST_REASON_MAX = 1000;

export type RequestInput = {
  orderId?: unknown;
  amountMinor?: unknown;
  reason?: unknown;
};

export type RequestResult =
  | { ok: true; requestId: string }
  | { ok: false; status: number; error: string };

/**
 * Ask for money back.
 *
 * Asking moves no money. `request_refund()` creates a request and stops; a
 * privileged person approves it, and only a settled transaction reaches the
 * ledger. That gap is D4, which is explicit that a refund request is not a
 * completed refund — and collapsing the two is how a platform ends up having
 * promised money it never sent.
 *
 * The amount is the caller's, the currency is not: the function takes it from
 * the order, so a refund cannot be recorded in a different currency to the
 * capture.
 */
export async function requestRefund(
  supabase: SupabaseClient,
  input: RequestInput,
): Promise<RequestResult> {
  const orderId = typeof input.orderId === 'string' ? input.orderId : '';
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';

  if (!orderId) return { ok: false, status: 400, error: 'orderId is required.' };
  if (!reason) {
    return { ok: false, status: 400, error: 'Say what the refund is for.' };
  }
  if (reason.length > REQUEST_REASON_MAX) {
    return {
      ok: false,
      status: 400,
      error: `Please keep it under ${REQUEST_REASON_MAX} characters.`,
    };
  }

  // D4: money is integer minor units, never floating point. A caller sending
  // "300.5" or a float is refused rather than rounded, because rounding here is
  // a silent disagreement with the ledger.
  const raw = typeof input.amountMinor === 'string'
    ? input.amountMinor.trim()
    : typeof input.amountMinor === 'number'
      ? String(input.amountMinor)
      : '';
  if (!/^\d+$/.test(raw)) {
    return {
      ok: false,
      status: 400,
      error: 'amountMinor must be a whole number of minor units.',
    };
  }
  const amountMinor = BigInt(raw);
  if (amountMinor <= 0n) {
    return { ok: false, status: 400, error: 'A refund has to be more than zero.' };
  }

  const { data, error } = await supabase.rpc('request_refund', {
    p_order_id: orderId,
    p_amount_minor: Number(amountMinor),
    p_reason: reason,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('not on the billing account')) {
      return { ok: false, status: 403, error: 'That order is not on your billing account.' };
    }
    if (msg.includes('nothing to refund')) {
      return { ok: false, status: 409, error: 'That order has not been paid, so there is nothing to refund.' };
    }
    if (msg.includes('exceeds the refundable balance')) {
      return {
        ok: false,
        status: 409,
        error: 'That is more than is left to refund on this order.',
      };
    }
    return { ok: false, status: 400, error: error.message };
  }

  return { ok: true, requestId: String(data) };
}

/**
 * The moderation-free, money version of a queue: refund requests waiting on a
 * decision.
 *
 * There is no filter by reviewer here. RLS decides what comes back — a caller
 * who is not privileged simply gets nothing, which is the same posture as every
 * other page in this app.
 */
export async function fetchRefundQueue(
  supabase: SupabaseClient,
): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from('refund_requests')
    .select(
      'id, order_id, requested_amount_minor, currency_code, reason, status,' +
        'requested_by, created_at, requested_by_profile:requested_by(display_name)',
    )
    .eq('status', 'requested')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as {
    id: string;
    order_id: string;
    requested_amount_minor: string | number;
    currency_code: string;
    reason: string;
    status: string;
    requested_by: string;
    created_at: string;
    requested_by_profile: { display_name: string | null }[] | null;
  }[]).map(({ requested_by_profile, ...row }) => ({
    ...row,
    requester: requested_by_profile?.[0] ?? null,
  }));
}

export type DecisionInput = {
  requestId?: unknown;
  approve?: unknown;
  notes?: unknown;
};

export type DecisionResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Approve or decline a refund request.
 *
 * Approving creates a *pending* refund transaction. It does not settle it. The
 * money moves when the provider confirms and `complete_refund()` runs, which is
 * what writes the ledger entry. Keeping those apart is the whole point: if
 * approving settled, a declined-after-approval mistake would already be in the
 * ledger and the ledger is append-only.
 */
export async function decideRefund(
  supabase: SupabaseClient,
  input: DecisionInput,
): Promise<DecisionResult> {
  const requestId = typeof input.requestId === 'string' ? input.requestId : '';
  if (!requestId) {
    return { ok: false, status: 400, error: 'requestId is required.' };
  }

  const approve = input.approve === true || input.approve === 'true';
  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';

  if (!approve && !notes) {
    return {
      ok: false,
      status: 400,
      error: 'Declining a refund needs a written reason.',
    };
  }

  const { error } = await supabase.rpc('decide_refund_request', {
    p_request_id: requestId,
    p_approve: approve,
    p_notes: notes || null,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('only staff may decide')) {
      return { ok: false, status: 403, error: 'Only staff can decide a refund.' };
    }
    if (msg.includes('you requested yourself')) {
      return {
        ok: false,
        status: 403,
        error: 'You cannot decide a refund you requested yourself.',
      };
    }
    if (msg.includes('already')) {
      return { ok: false, status: 409, error: 'That refund has already been decided.' };
    }
    return { ok: false, status: 400, error: error.message };
  }

  return { ok: true };
}
