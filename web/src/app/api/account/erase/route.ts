import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { eraseMyAccount } from '@/lib/account';

export const dynamic = 'force-dynamic';

/**
 * Close my account.
 *
 * The rules live in `erase_my_account()`, including the confirmation, because a
 * rule that exists only in a route handler is a rule that a second client can
 * skip. What this adds is the session: the erasure is done as the signed-in
 * person, and the session is ended afterwards, because a closed account has
 * nothing left to show.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'not configured' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'sign in first' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null;
  const confirm = typeof body?.confirm === 'string' ? body.confirm : '';
  if (!confirm.trim()) {
    return NextResponse.json(
      { ok: false, message: 'Type your name to confirm.' },
      { status: 400 },
    );
  }

  const result = await eraseMyAccount(supabase, confirm);
  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }

  // The account is closed; the session should not outlive it.
  await supabase.auth.signOut().catch(() => undefined);

  return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
}
