import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Record the adulthood declaration, or withdraw one already made.
 *
 * Both actions are wrapped in database functions rather than written as an
 * insert here: `declare_adult()` stamps the moment and the statement version and
 * writes the audit row, and `withdraw_adult_declaration()` sets a date instead
 * of deleting. A route that inserted the row itself would be a second definition
 * of what a declaration is.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }

  const action = (body as { action?: unknown })?.action;
  if (action !== 'declare' && action !== 'withdraw') {
    return NextResponse.json(
      { ok: false, message: 'Choose declare or withdraw.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }

  const { data, error } =
    action === 'declare'
      ? await supabase.rpc('declare_adult', { p_version: 1 })
      : await supabase.rpc('withdraw_adult_declaration');

  if (error) {
    // Withdrawing twice is refused by name. It is not an error the reader caused
    // by doing something wrong, so the page is told plainly rather than given a
    // stack of SQL.
    const message = /nothing_to_withdraw/.test(error.message)
      ? 'There is no declaration in force to withdraw.'
      : 'That could not be saved. Try again.';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, declaration: data });
}
