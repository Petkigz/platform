import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { parseReferralBoard } from '@/lib/referrals';
import {
  referralCodeOf,
  referralRefusal,
  referralStatusOf,
  type ReferralCode,
} from '@/lib/referral-outcome';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'no-store' };

function refuse(code: ReferralCode) {
  return NextResponse.json(referralRefusal(code), { status: referralStatusOf(code), headers: NO_STORE });
}

/**
 * Reading your own invitation board.
 *
 * Two verbs, because there are two things a screen refetches: the board itself
 * (`GET`), and a fresh code when the first attempt failed (`POST`). Both are
 * the database's: the RPC refuses while the flag is off, refuses a caller with
 * no session, and decides what a person is allowed to see.
 *
 * **A refusal is a name.** `signed_out` (401), `off` (409) or `failed` (502),
 * each with this route's own English beside it. The sentence the database
 * raised is never passed on, and neither is anything thrown on the way.
 *
 * **Nothing is kept.** Every answer is `no-store`: a board is one account's.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('signed_out');

    const { data, error } = await supabase.rpc('my_referrals');
    if (error) return refuse(referralCodeOf(error));

    const board = parseReferralBoard(data);
    if (!board) return refuse('failed');

    return NextResponse.json({ ok: true, board }, { headers: NO_STORE });
  } catch {
    return refuse('failed');
  }
}

/** Mint the code if this account has never had one. Idempotent by design. */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('signed_out');

    const { data, error } = await supabase.rpc('my_referral_code');
    if (error) return refuse(referralCodeOf(error));

    const row = (data && typeof data === 'object' && !Array.isArray(data) ? data : {}) as { code?: unknown };
    if (typeof row.code !== 'string' || row.code === '') return refuse('failed');
    return NextResponse.json({ ok: true, code: row.code }, { headers: NO_STORE });
  } catch {
    return refuse('failed');
  }
}
