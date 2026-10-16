import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { requestRefund } from '@/lib/refunds';

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
    return NextResponse.json({ error: 'Sign in to request a refund.' }, { status: 401 });
  }

  const result = await requestRefund(supabase, input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, requestId: result.requestId }, { status: 201 });
}
