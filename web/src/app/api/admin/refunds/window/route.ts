import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { setRefundWindow } from '@/lib/refunds';

/**
 * POST /api/admin/refunds/window — move the self-serve refund window.
 *
 * The privilege check is here for the interface and again inside
 * `set_refund_window()`, which is the actual boundary: an RPC can be called
 * without going through this route.
 *
 * The reason is not decoration. This number decides whether a family can get
 * their money back, and the audit row keeps the old value beside the new one, so
 * a change can be reviewed later by somebody who was not there when it was made.
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
    return NextResponse.json({ error: 'Sign in to change the refund window.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) {
    return NextResponse.json(
      { error: 'Only staff can change the refund window.' },
      { status: 403 },
    );
  }

  const result = await setRefundWindow(supabase, input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, hours: result.hours });
}
