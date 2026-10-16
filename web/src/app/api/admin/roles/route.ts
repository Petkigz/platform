import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { assignRole, revokeRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/roles — grant or revoke a role.
 *
 * The writers read the actor from the session rather than from the body, so
 * there is nothing here to spoof: naming an admin as "the actor" gets nowhere.
 * The privilege check happens in SQL; the one below only saves a round trip and
 * gives a signed-out caller a sensible status.
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to change roles.' }, { status: 401 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const action = payload.action;

  if (action !== 'assign' && action !== 'revoke') {
    return NextResponse.json(
      { error: "action must be 'assign' or 'revoke'." },
      { status: 400 },
    );
  }

  const result =
    action === 'assign'
      ? await assignRole(supabase, payload)
      : await revokeRole(supabase, payload);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
