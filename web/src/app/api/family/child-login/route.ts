import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isServiceRoleConfigured } from '@/lib/env';
import { handleChildLoginCreation } from '@/lib/child-login-handler';
import { childLoginCreatePorts } from '@/lib/child-login-ports';
// Reservation enforces the dashboard flag and current guardian verification.
// Detachment does not revoke the auth identity or existing sessions.

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function fail(sentence: string, status = 400) {
  return NextResponse.json({ error: sentence }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to make a login for your child.', 401);

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ code: 'child_login_unavailable' }, { status: 503, headers: NO_STORE });
  }
  // Browser form posts cannot send application/json cross-origin without CORS
  // preflight. This is not a substitute for a broader deployment CSRF review.
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return NextResponse.json({ ok: false, message: 'A JSON request is required.' }, { status: 415, headers: NO_STORE });
  }
  const body = await request.json().catch(() => null);
  const result = await handleChildLoginCreation(childLoginCreatePorts(supabase, createAdminClient()), user.id, body);
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}

/** Removing a login. Deletes no learning; see `remove_child_login()`. */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to change your child’s login.', 401);

  let body: { learnerId?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail('The form could not be read. Please try again.');
  }

  const learnerId = typeof body.learnerId === 'string' ? body.learnerId : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(learnerId)) return fail('That is not a child we can find.');

  const { data, error } = await supabase.rpc('remove_child_login', {
    p_learner_id: learnerId,
    p_reason: reason || null,
  });

  if (error) {
    return NextResponse.json({ code: error.message }, { status: 400, headers: NO_STORE });
  }

  return NextResponse.json({ ok: true, removed: data }, { headers: NO_STORE });
}
