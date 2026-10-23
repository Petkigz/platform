import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { saveControl } from '@/lib/refunds';

/**
 * POST /api/admin/controls — change one named control.
 *
 * The privilege check is here for the interface and again inside
 * `set_platform_control()`, which is the boundary that matters: an RPC can be
 * called without going through this route.
 *
 * The function decides what "control" means. This route does not carry a list of
 * allowed keys, deliberately — a key list in two places is a key list that
 * drifts, and the one that drifts is always the one nobody reads.
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
    return NextResponse.json({ error: 'Sign in to change a control.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return NextResponse.json({ error: 'Only platform staff can change a control.' }, { status: 403 });
  }

  const result = await saveControl(supabase, input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, value: result.value, changed: result.changed });
}
