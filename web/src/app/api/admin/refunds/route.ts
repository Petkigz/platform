import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { decideRefund } from '@/lib/refunds';

/**
 * POST /api/admin/refunds — approve or decline a refund request.
 *
 * The privilege check happens here *and* inside decide_refund_request(). The
 * redirect here is for the interface; the one in the function is the actual
 * boundary, because an RPC can be called without going through this route.
 *
 * Approving does not settle. It creates a pending refund transaction, and the
 * money moves only when complete_refund() runs against a verified provider
 * event or by a privileged actor.
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

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) {
    return NextResponse.json({ error: 'Only staff can decide refunds.' }, { status: 403 });
  }

  const result = await decideRefund(supabase, input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
