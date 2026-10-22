import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { applyPromotionToOrder, removePromotionFromOrder } from '@/lib/checkout';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/promotion — put a code on a pending order, or take one off.
 *
 * Both are corrections to an unpaid order. Neither takes an actor and neither decides
 * anything: `apply_promotion_to_order()` and `remove_promotion_from_order()` read the
 * session, check that the caller may pay for the order, and refuse once the order is
 * paid. A body carries an order id and, for an apply, a code — never an amount.
 *
 * The refusal sentences come back as they are written, because they are written for a
 * person ("That code has ended", "This order has already been paid").
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Payments are not configured on this deployment.' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) {
    return NextResponse.json({ ok: false, message: 'That order is missing.' }, { status: 400 });
  }

  const result =
    body.action === 'remove'
      ? await removePromotionFromOrder(supabase, orderId)
      : body.action === 'apply'
        ? await applyPromotionToOrder(supabase, {
            orderId,
            code: typeof body.code === 'string' ? body.code.slice(0, 32) : '',
          })
        : null;

  if (!result) {
    return NextResponse.json(
      { ok: false, message: 'Unsupported action.' },
      { status: 400 },
    );
  }

  if (!result.ok) {
    const status =
      result.code === 'forbidden'
        ? 403
        : result.code === 'not_found'
          ? 404
          : result.code === 'error'
            ? 500
            : result.code === 'promotion_refused' || result.code === 'checkout_disabled'
              ? 409
              : 422;
    return NextResponse.json({ ok: false, message: result.message }, { status });
  }

  return NextResponse.json({
    ok: true,
    code: result.code,
    // Decimal strings, as everywhere money is sent: no amount is ever a JSON number.
    discountMinor: result.discount.amountMinor.toString(),
    totalMinor: result.total.amountMinor.toString(),
    currencyCode: result.total.currency,
  });
}
