import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from '@/lib/referrals';
import { referralCodeFromPath } from '@/lib/referral-outcome';

export const dynamic = 'force-dynamic';

/**
 * Where the visitor goes next, as a path on whatever host they are on.
 *
 * This used to build an absolute address from `NEXT_PUBLIC_SITE_URL`, falling
 * back to `http://localhost` when it was unset, which sent a visitor on a
 * preview host to their own machine. A path needs no host, and cannot point
 * anywhere else.
 */
function onward() {
  return new NextResponse(null, {
    status: 303,
    headers: { location: '/catalogue', 'cache-control': 'no-store' },
  });
}

/**
 * Keep an invitation while the visitor looks around, then send them shopping.
 *
 * A cookie is the only place a code can wait: the catalogue is browsable
 * without an account, and asking somebody to type a code from a chat message
 * into a form three pages later is how a working invitation gets abandoned.
 *
 * The code is checked before it is remembered, so a made-up link leaves nothing
 * behind. It is `httpOnly` — nothing in the browser needs to read it, the buy
 * page reads it on the server — and `lax`, because it travels on a link click
 * and on nothing else.
 *
 * Whatever goes wrong, the visitor still reaches the catalogue: a code that
 * could not be checked is not remembered, and they can type it at checkout.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code: raw } = await context.params;
    const code = referralCodeFromPath(raw);

    if (!code || !isSupabaseConfigured()) return onward();

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('resolve_referral_code', { p_code: code });
    const resolved = (data && typeof data === 'object' ? data : {}) as { found?: unknown };

    if (error || resolved.found !== true) return onward();

    const jar = await cookies();
    jar.set(REFERRAL_COOKIE, code, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60,
    });

    return onward();
  } catch {
    return onward();
  }
}
