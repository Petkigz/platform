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
    if (msg.includes('refund window closed')) {
      // The database's sentence carries the date the window closed, so it is
      // passed through rather than replaced with something vaguer. A stale tab
      // is the usual way a caller reaches this: the button was there when the
      // page was rendered and the clock ran out while it sat open.
      return {
        ok: false,
        status: 409,
        error: `${error.message.charAt(0).toUpperCase()}${error.message.slice(1)}.`,
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
    // `/may decide a refund/` covers both the old "only staff" wording and the
    // narrower rule the staff-day journey produced: support opens a refund, and
    // finance decides it.
    if (msg.includes('may decide a refund')) {
      return {
        ok: false,
        status: 403,
        error: 'Approving a refund belongs to finance. You can still open one on a customer’s behalf.',
      };
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


/**
 * Why a refund can, or cannot, be asked for on one order — the sentence and the
 * clock, from the database rather than from the browser.
 *
 * The page could subtract `paid_at` from `Date.now()` itself and usually agree.
 * Usually is the problem: the writer reads the server's clock, and a browser
 * with a wrong time zone, a daylight-saving edge or a laptop that has been
 * asleep would show a button for a window that is shut. The screen asks the
 * same function the writer uses.
 */
export type RefundStanding = {
  orderId: string;
  orderNumber: string | null;
  status: string;
  allowed: boolean;
  reason: 'allowed' | 'not_paid' | 'nothing_left' | 'window_closed' | string;
  message: string;
  windowHours: number;
  paidAt: string | null;
  closesAt: string | null;
  remainingHours: number | null;
  refundableMinor: string;
  currencyCode: string;
  asStaff: boolean;
};

export class RefundStandingError extends Error {}

/** Read one standing. Refuses on a malformed payload rather than rendering NaN. */
export function normaliseStanding(raw: unknown): RefundStanding {
  const row = (raw ?? {}) as Record<string, unknown>;
  if (typeof row.orderId !== 'string' || typeof row.allowed !== 'boolean') {
    throw new RefundStandingError('the refund standing came back malformed');
  }
  const minor = typeof row.refundableMinor === 'number'
    ? String(row.refundableMinor)
    : row.refundableMinor;
  if (typeof minor !== 'string' || !/^\d+$/.test(minor)) {
    throw new RefundStandingError('the refundable amount is not whole minor units');
  }
  return {
    orderId: row.orderId,
    orderNumber: typeof row.orderNumber === 'string' ? row.orderNumber : null,
    status: typeof row.status === 'string' ? row.status : 'unknown',
    allowed: row.allowed,
    reason: typeof row.reason === 'string' ? row.reason : 'unknown',
    message: typeof row.message === 'string' ? row.message : '',
    windowHours: Number(row.windowHours ?? 0),
    paidAt: typeof row.paidAt === 'string' ? row.paidAt : null,
    closesAt: typeof row.closesAt === 'string' ? row.closesAt : null,
    remainingHours: row.remainingHours === null || row.remainingHours === undefined
      ? null
      : Number(row.remainingHours),
    refundableMinor: minor,
    currencyCode: typeof row.currencyCode === 'string' ? row.currencyCode : 'XXX',
    asStaff: row.asStaff === true,
  };
}

export async function fetchRefundStanding(
  supabase: SupabaseClient,
  orderId: string,
): Promise<RefundStanding | null> {
  const { data, error } = await supabase.rpc('refund_standing', { p_order_id: orderId });
  // A standing the caller may not read is not a reason to fail the page: the
  // order list is still theirs to see, and the form simply does not appear.
  if (error) return null;
  try {
    return normaliseStanding(data);
  } catch {
    return null;
  }
}

/**
 * How long is left, in words a person reads quickly.
 *
 * `remainingHours` is computed by the database, so this only phrases it. It
 * never rounds a closed window into an open one: zero is "closed", not "less
 * than an hour".
 */
export function describeRemaining(hours: number | null): string {
  if (hours === null) return '';
  if (hours <= 0) return 'The window has closed.';
  if (hours < 1) return 'Less than an hour left.';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} left.`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return `${days} day${days === 1 ? '' : 's'}${rest > 0 ? ` and ${rest} hour${rest === 1 ? '' : 's'}` : ''} left.`;
}

export type OnBehalfInput = {
  orderNumber?: unknown;
  reason?: unknown;
};

export type OnBehalfResult =
  | { ok: true; requestId: string; amountMinor: string; currencyCode: string }
  | { ok: false; status: number; error: string };

/**
 * Staff open a refund request on a customer's behalf, after the window has closed.
 *
 * The window is a customer policy, not a lock on the platform: a course sold
 * wrong, a duplicate charge, a family who could not get to a phone inside three
 * days. So this path exists and is deliberately separate in the interface — it
 * is attributed to the member of staff who opened it, the two-person rule still
 * stops them approving it, and the database records the action as
 * `refund.requested_by_staff` rather than as a customer asking.
 *
 * The amount is **everything still refundable**, read from the database rather
 * than typed. A person filling this in from a support call does not want to
 * retype a figure in a currency they have to read off another screen, and a
 * mistyped amount on a goodwill refund is money that has to be chased.
 */
export async function openRefundOnBehalf(
  supabase: SupabaseClient,
  input: OnBehalfInput,
): Promise<OnBehalfResult> {
  const orderNumber = typeof input.orderNumber === 'string'
    ? input.orderNumber.trim().toUpperCase()
    : '';
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';

  if (!/^AS-\d{8}$/.test(orderNumber)) {
    return { ok: false, status: 400, error: 'An order number looks like AS-00001234.' };
  }
  if (!reason) {
    return { ok: false, status: 400, error: 'Say why this refund is being opened.' };
  }
  if (reason.length > REQUEST_REASON_MAX) {
    return {
      ok: false,
      status: 400,
      error: `Please keep it under ${REQUEST_REASON_MAX} characters.`,
    };
  }

  const { data: order, error: lookupError } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (lookupError) return { ok: false, status: 400, error: lookupError.message };
  if (!order) return { ok: false, status: 404, error: `No order ${orderNumber}.` };
  const orderId = (order as { id: string }).id;

  // The standing is the same function the customer's screen reads, so staff and
  // the customer can never disagree about whether a window is open.
  const { data: standingData, error: standingError } = await supabase.rpc('refund_standing', {
    p_order_id: orderId,
  });
  if (standingError) return { ok: false, status: 400, error: standingError.message };

  let standing: RefundStanding;
  try {
    standing = normaliseStanding(standingData);
  } catch {
    return { ok: false, status: 400, error: 'That order could not be read.' };
  }

  if (standing.reason === 'not_paid') {
    return { ok: false, status: 409, error: 'That order has not been paid, so there is nothing to refund.' };
  }
  if (standing.reason === 'nothing_left') {
    return { ok: false, status: 409, error: 'Everything paid on that order has already been returned.' };
  }

  const amountMinor = BigInt(standing.refundableMinor);
  if (amountMinor <= 0n) {
    return { ok: false, status: 409, error: 'There is nothing left to refund on that order.' };
  }

  const { data, error } = await supabase.rpc('request_refund', {
    p_order_id: orderId,
    p_amount_minor: Number(amountMinor),
    p_reason: reason,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('you are not on the billing account')) {
      return { ok: false, status: 403, error: 'Only staff can use this form.' };
    }
    if (msg.includes('exceeds the refundable balance')) {
      return { ok: false, status: 409, error: 'That is more than is left to refund on this order.' };
    }
    return { ok: false, status: 400, error: error.message };
  }

  return {
    ok: true,
    requestId: String(data),
    amountMinor: standing.refundableMinor,
    currencyCode: standing.currencyCode,
  };
}


export type WindowInput = { hours?: unknown; reason?: unknown };
export type WindowResult =
  | { ok: true; hours: number }
  | { ok: false; status: number; error: string };

const WINDOW_MAX_HOURS = 8760;

/**
 * Move the self-serve refund window, with a reason.
 *
 * The bounds are checked here so the form can say "that is longer than a year"
 * without a round trip — and again in the database, which is the boundary that
 * matters. A number that decides whether a family can get their money back
 * deserves both.
 */
export async function setRefundWindow(
  supabase: SupabaseClient,
  input: WindowInput,
): Promise<WindowResult> {
  const raw = typeof input.hours === 'number' ? String(input.hours) : String(input.hours ?? '').trim();
  if (!/^\d+$/.test(raw)) {
    return { ok: false, status: 400, error: 'The window is a whole number of hours.' };
  }
  const hours = Number(raw);
  if (hours > WINDOW_MAX_HOURS) {
    return { ok: false, status: 400, error: '8760 hours is a year — that is not a policy.' };
  }
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (reason.length < 4) {
    return { ok: false, status: 400, error: 'Say why the window is changing.' };
  }

  const { data, error } = await supabase.rpc('set_refund_window', {
    p_hours: hours,
    p_reason: reason,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('only platform staff')) {
      return { ok: false, status: 403, error: 'Only staff can change the refund window.' };
    }
    if (msg.includes('cannot be negative')) {
      return { ok: false, status: 400, error: 'Use 0 to close self-serve refunds entirely.' };
    }
    if (msg.includes('why the window')) {
      return { ok: false, status: 400, error: 'Say why the window is changing.' };
    }
    return { ok: false, status: 400, error: error.message };
  }

  return { ok: true, hours: Number(data ?? hours) };
}

export type ControlResult =
  | { ok: true; value: string; changed: boolean }
  | { ok: false; status: number; error: string };

/**
 * Save one control.
 *
 * The reader's bounds are checked here so the form can say "10 is the highest"
 * without a round trip; `set_platform_control()` refuses the same things again
 * with the same words. The database is the boundary — this is the pleasant way
 * in.
 */
export async function saveControl(
  supabase: SupabaseClient,
  input: { key?: unknown; value?: unknown; reason?: unknown },
): Promise<ControlResult> {
  const key = typeof input.key === 'string' ? input.key.trim() : '';
  const value = typeof input.value === 'string' ? input.value : String(input.value ?? '');
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';

  if (!key) return { ok: false, status: 400, error: 'Which control?' };
  if (reason.length < 4) {
    return { ok: false, status: 400, error: 'Say why this is changing.' };
  }

  const { data, error } = await supabase.rpc('set_platform_control', {
    p_key: key,
    p_value: value,
    p_reason: reason,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('only platform staff') || msg.includes('only a ')) {
      return { ok: false, status: 403, error: error.message };
    }
    if (msg.includes('is a feature switch')) {
      return { ok: false, status: 400, error: error.message };
    }
    return { ok: false, status: 400, error: error.message };
  }

  const row = (data ?? {}) as { value?: string; changed?: boolean };
  return {
    ok: true,
    value: typeof row.value === 'string' ? row.value : value,
    changed: row.changed === true,
  };
}
