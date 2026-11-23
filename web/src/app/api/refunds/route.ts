import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { requestRefund } from '@/lib/refunds';
import { REFUND_ASK_ENGLISH, refundAskStatusOf, type RefundAskReason } from '@/lib/orders-outcome';

/**
 * POST /api/refunds — ask for money back on an order.
 *
 * The route is thin on purpose. Whether the caller is allowed is decided by
 * `request_refund()`, which requires the order to belong to a billing account
 * the caller is on; that check lives in the database because a raw insert is
 * another path to the same table, and a check that only exists here would not
 * cover it.
 *
 * No money moves. This creates a request for a person to decide.
 *
 * **Every refusal is named** (`reason`, with a status of its own:
 * `lib/orders-outcome.ts`). The orders page is in the reader's language and
 * says its own sentence for each; `error` is still sent, in English, for a
 * caller with no words of its own, and is never the database's sentence. A
 * request that got no answer at all is `unconfirmed`: one may have been
 * recorded, and the form says to reload before trying again.
 */
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const refuse = (reason: RefundAskReason, error: string = REFUND_ASK_ENGLISH[reason]) =>
  NextResponse.json({ ok: false, reason, error }, { status: refundAskStatusOf(reason), headers: NO_STORE });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Supabase is not configured on this deployment.' },
      { status: 503, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse('malformed');
  }
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('not_signed_in');

    const result = await requestRefund(supabase, input);
    if (!result.ok) return refuse(result.reason, result.error);

    return NextResponse.json({ ok: true, requestId: result.requestId }, { status: 201, headers: NO_STORE });
  } catch {
    // No answer at all: a request may have been recorded.
    return refuse('unconfirmed');
  }
}
