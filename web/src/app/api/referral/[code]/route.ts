import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_DAYS,
  cleanReferralCode,
} from '@/lib/referrals';

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
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await context.params;
  const code = cleanReferralCode(decodeURIComponent(raw));

  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost'), 303);

  if (!code || !isSupabaseConfigured()) {
    return redirectTo('/catalogue');
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc('resolve_referral_code', { p_code: code });
  const resolved = (data ?? {}) as { found?: boolean };

  if (resolved.found !== true) return redirectTo('/catalogue');

  const jar = await cookies();
  jar.set(REFERRAL_COOKIE, code, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60,
  });

  return redirectTo('/catalogue');
}
