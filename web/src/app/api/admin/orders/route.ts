import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  mapOrderAdjustmentError,
  validateAdjustmentInput,
  validateVoidInput,
} from '@/lib/order-adjustments';

export const dynamic = 'force-dynamic';

type Body = {
  action?: unknown;
  orderId?: unknown;
  adjustmentId?: unknown;
  adjustmentType?: unknown;
  amountMinor?: unknown;
  direction?: unknown;
  reason?: unknown;
  orderItemId?: unknown;
};

/**
 * POST /api/admin/orders — adjust an order that has not been paid yet.
 *
 * Both actions are thin: validate the shape, call the writer, pass its refusal
 * through. Every rule that matters is in `add_order_adjustment()` and
 * `void_order_adjustment()` — who may adjust, what a type implies about its
 * direction, that a paid order's total is history, that the total is derived
 * from the rows — and the database is the only place those rules can be
 * enforced once, for every caller.
 *
 * The role check here is a courtesy and a faster answer, not the gate. The
 * writers check the same pair themselves.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }

  const [{ data: platformAdmin }, { data: financeAdmin }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
  ]);
  if (platformAdmin !== true && financeAdmin !== true) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Only a finance admin or platform admin may adjust an order.',
      },
      { status: 403 },
    );
  }

  let fn: string;
  let args: Record<string, unknown>;
  let created = false;

  if (body.action === 'add_adjustment') {
    const input = validateAdjustmentInput(body);
    if (!input.ok) {
      return NextResponse.json({ ok: false, message: input.message }, { status: 400 });
    }
    fn = 'add_order_adjustment';
    args = {
      p_order_id: input.value.orderId,
      p_adjustment_type: input.value.adjustmentType,
      // A decimal integer string, not Number(): the amount is a bigint and this
      // is the one hop where it could stop being exact.
      p_amount_minor: input.value.amountMinor,
      p_direction: input.value.direction,
      p_reason: input.value.reason,
      p_order_item_id: input.value.orderItemId,
    };
    created = true;
  } else if (body.action === 'void_adjustment') {
    const input = validateVoidInput(body);
    if (!input.ok) {
      return NextResponse.json({ ok: false, message: input.message }, { status: 400 });
    }
    fn = 'void_order_adjustment';
    args = { p_adjustment_id: input.value.adjustmentId, p_reason: input.value.reason };
  } else {
    return NextResponse.json(
      { ok: false, message: 'Unsupported order action.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(fn, args as never);
  if (error) {
    const mapped = mapOrderAdjustmentError(error.message);
    return NextResponse.json(
      { ok: false, message: mapped.message, code: mapped.code },
      { status: mapped.status },
    );
  }

  // The writer returns the order's new totals, which is what the screen reads
  // back: "recorded" alone would leave the admin guessing what the total became.
  return NextResponse.json({ ok: true, totals: data ?? null }, { status: created ? 201 : 200 });
}
