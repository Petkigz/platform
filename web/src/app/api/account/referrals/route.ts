import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { parseReferralBoard, referralLookupError } from '@/lib/referrals';

/**
 * Reading your own invitation board.
 *
 * Two verbs, because there are two things a screen refetches: the board itself
 * (`GET`), and a fresh code when the first attempt failed (`POST`). Both are
 * the database's: the RPC refuses while the flag is off, refuses a caller with
 * no session, and decides what a person is allowed to see. This route only
 * turns a refusal into a sentence and a status.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  const { data, error } = await supabase.rpc('my_referrals');
  if (error) {
    return NextResponse.json(
      { ok: false, message: referralLookupError(error.message) },
      { status: 400 },
    );
  }

  const board = parseReferralBoard(data);
  if (!board) {
    return NextResponse.json(
      { ok: false, message: 'The invitation details came back in a shape this page does not read.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, board });
}

/** Mint the code if this account has never had one. Idempotent by design. */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  const { data, error } = await supabase.rpc('my_referral_code');
  if (error) {
    return NextResponse.json(
      { ok: false, message: referralLookupError(error.message) },
      { status: 400 },
    );
  }

  const row = (data ?? {}) as { code?: unknown };
  return NextResponse.json({
    ok: true,
    code: typeof row.code === 'string' ? row.code : null,
  });
}
