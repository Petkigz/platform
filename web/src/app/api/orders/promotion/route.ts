import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { applyPromotionToOrder, removePromotionFromOrder } from '@/lib/checkout';
import { ORDER_CODE_ENGLISH, orderCodeStatusOf, type OrderCodeReason } from '@/lib/orders-outcome';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/promotion — put a code on a pending order, or take one off.
 *
 * Both are corrections to an unpaid order. Neither takes an actor and neither decides
 * anything: `apply_promotion_to_order()` and `remove_promotion_from_order()` read the
 * session, check that the caller may pay for the order, and refuse once the order is
 * paid. A body carries an order id and, for an apply, a code — never an amount.
 *
 * **Every refusal is named** (`reason`, with a status of its own:
 * `lib/orders-outcome.ts`). The orders page is in the reader's language and says its
 * own sentence for each. `message` is still sent, in English, for a caller with no
 * words of its own; for a refusal nobody wrote a sentence for it is one fixed
 * sentence, and the database's own goes to the server's log. An order that is
 * somebody else's and an id that names no order are one answer, `not_yours`.
 */
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const FIXED: Partial<Record<OrderCodeReason, string>> = {
  not_yours: 'That order is not on your account.',
  malformed: 'Malformed request.',
  not_signed_in: 'Sign in first.',
  unconfirmed: 'We could not confirm whether that was recorded. Reload the page before trying again.',
};

const refuse = (reason: OrderCodeReason, message: string = ORDER_CODE_ENGLISH) =>
  NextResponse.json({ ok: false, reason, message }, { status: orderCodeStatusOf(reason), headers: NO_STORE });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Payments are not configured on this deployment.' },
      { status: 503, headers: NO_STORE },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return refuse('malformed', 'Malformed request.');
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('not_signed_in', 'Sign in first.');

    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    if (!orderId) return refuse('malformed', 'That order is missing.');

    const result =
      body.action === 'remove'
        ? await removePromotionFromOrder(supabase, orderId)
        : body.action === 'apply'
          ? await applyPromotionToOrder(supabase, {
              orderId,
              code: typeof body.code === 'string' ? body.code.slice(0, 32) : '',
            })
          : null;

    if (!result) return refuse('malformed', 'Unsupported action.');

    if (!result.ok) {
      const why = result.reason;
      // Kept for whoever runs the site; never sent to the reader.
      if (why === 'failed') console.error('orders: a code refused with no name:', result.message);
      // `promotion_refused` is a sentence `lib/checkout.ts` wrote for a
      // person about a code or an order's state. Anything else gets this
      // route's own, so the database's words never leave the server and an
      // order that is not the caller's reads the same as one that is not
      // there.
      if (result.code === 'promotion_refused' && why !== 'unconfirmed' && why !== 'failed') return refuse(why, result.message);
      return refuse(why, FIXED[why] ?? ORDER_CODE_ENGLISH);
    }

    return NextResponse.json(
      {
        ok: true,
        code: result.code,
        // Decimal strings, as everywhere money is sent: no amount is ever a JSON number.
        discountMinor: result.discount.amountMinor.toString(),
        totalMinor: result.total.amountMinor.toString(),
        currencyCode: result.total.currency,
      },
      { headers: NO_STORE },
    );
  } catch {
    // No answer at all: the order may have been re-priced.
    return refuse('unconfirmed');
  }
}
