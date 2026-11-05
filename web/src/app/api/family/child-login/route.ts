import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
// Creation is paused until the trusted linking and recovery workflow is safe.
// Detachment remains available below; it does not revoke the auth identity.

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

  void request;
  return NextResponse.json(
    { code: 'child_login_creation_paused' },
    { status: 503, headers: NO_STORE },
  );
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
