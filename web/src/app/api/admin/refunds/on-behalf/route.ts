import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { openRefundOnBehalf, refundStandingForOrder } from '@/lib/refunds';

/**
 * GET /api/admin/refunds/on-behalf?order=AS-00001234 — what is left on an order.
 *
 * Added with the part-refund screen (2026-11-02). A person typing an amount needs
 * to see the ceiling before they type, not after the database refuses it; this
 * reads the same `refund_standing()` the customer sees, so the number on the form
 * and the number in the trigger are the same number.
 *
 * Reading is staff-only for the same reason writing is: the figure is somebody
 * else's order.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to look up an order.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) {
    return NextResponse.json(
      { error: 'Only staff can look up what is refundable.' },
      { status: 403 },
    );
  }

  const orderNumber = new URL(request.url).searchParams.get('order');
  const result = await refundStandingForOrder(supabase, orderNumber);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    orderNumber: result.standing.orderNumber,
    refundableMinor: result.standing.refundableMinor,
    currencyCode: result.standing.currencyCode,
  });
}

/**
 * POST /api/admin/refunds/on-behalf — open a refund request for a customer.
 *
 * The 72-hour window is a customer policy, not a lock on the platform. A course
 * sold wrong, a duplicate charge, a family who could not get to a phone inside
 * three days: support has to be able to make something right, or the rule gets
 * worked around in SQL where nothing is audited.
 *
 * Three things keep this from being a hole:
 *
 *   1. `is_privileged` is checked here and again inside `request_refund()`.
 *   2. The request is attributed to the member of staff, and
 *      `rr_not_self_approved` stops them approving their own — so a goodwill
 *      refund still needs a second person.
 *   3. The audit records it as `refund.requested_by_staff` with no window,
 *      because the window did not apply. A year from now, "was this inside the
 *      policy" is answerable.
 *
 * The amount is the caller's, and blank means everything still refundable —
 * read from the database, never from a figure the browser invented. A part
 * refund is allowed (2026-11-02) because the alternative was an act with no
 * screen, which happened in SQL where nothing is audited. Whatever is sent,
 * `refund_requests_ceiling` refuses more than the balance, and the order's
 * currency comes from the order rather than from the request.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to open a refund.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) {
    return NextResponse.json(
      { error: 'Only staff can open a refund on someone else’s behalf.' },
      { status: 403 },
    );
  }

  const result = await openRefundOnBehalf(supabase, input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      ok: true,
      requestId: result.requestId,
      amountMinor: result.amountMinor,
      currencyCode: result.currencyCode,
      refundableMinor: result.refundableMinor,
      partial: result.partial,
    },
    { status: 201 },
  );
}
