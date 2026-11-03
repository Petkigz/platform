import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { decideRefund } from '@/lib/refunds';

/**
 * POST /api/admin/refunds — approve or decline a refund request.
 *
 * The check happens here *and* inside decide_refund_request(). The one here is
 * for the interface; the one in the function is the actual boundary, because an
 * RPC can be called without going through this route.
 *
 * The route allows finance and platform admins to reach the decision writer;
 * the database additionally requires the configured owner for approval.
 * Approval records a pending transaction and does not transfer money.
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
    return NextResponse.json({ error: 'Sign in to decide a refund.' }, { status: 401 });
  }

  const [{ data: financeAdmin }, { data: platformAdmin }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (financeAdmin !== true && platformAdmin !== true) {
    return NextResponse.json(
      { error: 'Only the configured owner can approve; finance or a platform administrator can decline.' },
      { status: 403 },
    );
  }

  const result = await decideRefund(supabase, input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
