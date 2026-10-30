import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Recording an ijazah, and withdrawing one.
 *
 * The route holds no permissions of its own: both functions inside are
 * `security definer` and refuse anybody who is not the platform owner, and
 * `record_ijazah()` refuses while the flag is off. This file only carries the
 * form and turns a refusal into a code the console can say in a sentence.
 *
 * No service-role client, no `auth.admin`: nothing here creates an account or
 * bypasses a policy. The evidence a person types goes into one column the holder
 * can never select, and never comes back out through this route.
 */

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function fail(code: string, status = 400) {
  return NextResponse.json({ code }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail('The form could not be read. Please try again.');
  }

  const str = (key: string) => (typeof body[key] === 'string' ? (body[key] as string) : '');
  const granteeUserId = str('granteeUserId');
  if (!/^[0-9a-f-]{36}$/i.test(granteeUserId)) return fail('ijazah:no_such_person');

  const grantedOn = str('grantedOn').trim();

  const { data, error } = await supabase.rpc('record_ijazah', {
    p_grantee_user_id: granteeUserId,
    p_granted_by: str('grantedBy').trim(),
    p_scope: str('scope').trim(),
    p_evidence: str('evidence').trim(),
    p_granted_on: grantedOn || null,
    p_chain: str('chain').trim() || null,
  });

  if (error) return fail(error.message);
  return NextResponse.json({ ok: true, record: data }, { headers: NO_STORE });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail('The form could not be read. Please try again.');
  }

  const id = typeof body.id === 'string' ? body.id : '';
  const reason = typeof body.reason === 'string' ? body.reason : '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail('ijazah:not_found');

  const { data, error } = await supabase.rpc('withdraw_ijazah', {
    p_id: id,
    p_reason: reason.trim(),
  });

  if (error) return fail(error.message);
  return NextResponse.json({ ok: true, record: data }, { headers: NO_STORE });
}
