import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNED_MINOR = /^-?[1-9][0-9]*$/;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 }); }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  const [{ data: platformAdmin }, { data: financeAdmin }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
  ]);
  if (platformAdmin !== true && financeAdmin !== true) {
    return NextResponse.json({ ok: false, message: 'Only a finance admin or platform admin may record adjustments.' }, { status: 403 });
  }

  let fn: string;
  let args: Record<string, unknown>;
  if (body.action === 'clawback') {
    if (typeof body.orderId !== 'string' || !UUID.test(body.orderId))
      return NextResponse.json({ ok: false, message: 'A valid order id is required.' }, { status: 400 });
    if (typeof body.reason !== 'string' || body.reason.trim().length === 0 || body.reason.length > 500)
      return NextResponse.json({ ok: false, message: 'Give a written reason under 500 characters.' }, { status: 400 });
    fn = 'record_earnings_clawback';
    args = { p_order_id: body.orderId, p_reason: body.reason.trim() };
  } else if (body.action === 'adjustment') {
    const orderId = typeof body.orderId === 'string' && body.orderId ? body.orderId : null;
    const transactionId = typeof body.financialTransactionId === 'string' && body.financialTransactionId
      ? body.financialTransactionId : null;
    if ((orderId && !UUID.test(orderId)) || (transactionId && !UUID.test(transactionId)))
      return NextResponse.json({ ok: false, message: 'Use valid order and transaction ids.' }, { status: 400 });
    if (!orderId && !transactionId)
      return NextResponse.json({ ok: false, message: 'Link the adjustment to an order or financial transaction.' }, { status: 400 });
    if (typeof body.type !== 'string' || !['correction','write_off','goodwill_credit','fee_reversal','other'].includes(body.type))
      return NextResponse.json({ ok: false, message: 'Choose a supported adjustment type.' }, { status: 400 });
    if (typeof body.amountMinor !== 'string' || !SIGNED_MINOR.test(body.amountMinor))
      return NextResponse.json({ ok: false, message: 'Enter a non-zero signed whole amount in minor units.' }, { status: 400 });
    if (typeof body.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(body.currencyCode))
      return NextResponse.json({ ok: false, message: 'Use a three-letter uppercase currency code.' }, { status: 400 });
    if (typeof body.reason !== 'string' || body.reason.trim().length === 0 || body.reason.length > 500)
      return NextResponse.json({ ok: false, message: 'Give a written reason under 500 characters.' }, { status: 400 });
    fn = 'record_financial_adjustment';
    args = {
      p_order_id: orderId,
      p_financial_transaction_id: transactionId,
      p_adjustment_type: body.type,
      // Decimal integer string, not Number(): bigint must stay exact under D4.
      p_amount_minor: body.amountMinor,
      p_currency_code: body.currencyCode,
      p_reason: body.reason.trim(),
    };
  } else {
    return NextResponse.json({ ok: false, message: 'Unsupported adjustment action.' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc(fn, args as never);
  if (error) {
    const message = error.message;
    const status = /only a finance admin/i.test(message) ? 403
      : /not found/i.test(message) ? 404
      : /duplicate key|already exists/i.test(message) ? 409
      : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
  return NextResponse.json({ ok: true, id: data }, { status: 201 });
}
