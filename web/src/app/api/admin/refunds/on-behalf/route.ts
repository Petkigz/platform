import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { openRefundOnBehalf } from '@/lib/refunds';

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
 * The amount is whatever is still refundable, read from the database. It is not
 * typed, because a mistyped figure on a goodwill refund is money to chase.
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
    },
    { status: 201 },
  );
}
