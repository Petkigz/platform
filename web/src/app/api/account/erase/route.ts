import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { eraseMyAccount } from '@/lib/account';
import { eraseRefusal, eraseStatusOf, type EraseCode } from '@/lib/erase-outcome';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'no-store' };

/** A refusal, by name, with the status that name is always answered with. */
function refuse(code: EraseCode) {
  return NextResponse.json(eraseRefusal(code), { status: eraseStatusOf(code), headers: NO_STORE });
}

/**
 * Close my account.
 *
 * The rules live in `erase_my_account()`, including the confirmation, because a
 * rule that exists only in a route handler is a rule that a second client can
 * skip. What this adds is the session: the erasure is done as the signed-in
 * person, and the session is ended afterwards, because a closed account has
 * nothing left to show.
 *
 * Every refusal has a name (`lib/erase-outcome.ts`) and is answered with that
 * name's own status. The database's sentence is not forwarded. Anything that
 * is not plainly a refusal is `unconfirmed`, a 502: the account may be closed,
 * and the page says so rather than inviting a second press.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'not configured' }, { status: 503 });
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let signedIn = false;
  try {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = user !== null;
  } catch {
    // Nothing has been asked of the database yet, but nothing is known about
    // who is asking either.
    return refuse('unconfirmed');
  }
  if (!signedIn) return refuse('signed_out');

  const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null;
  const confirm = typeof body?.confirm === 'string' ? body.confirm : '';
  if (!confirm.trim()) return refuse('name_missing');

  let result: Awaited<ReturnType<typeof eraseMyAccount>>;
  try {
    result = await eraseMyAccount(supabase, confirm);
  } catch {
    // The request left and no answer came back. It may have closed the account.
    return refuse('unconfirmed');
  }
  if (!result.ok) return refuse(result.code);

  // The account is closed; the session should not outlive it.
  await supabase.auth.signOut().catch(() => undefined);

  return NextResponse.json(result, { headers: NO_STORE });
}
