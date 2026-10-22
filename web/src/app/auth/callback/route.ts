import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/oauth';

/**
 * Where Google (or any OAuth provider) comes back to.
 *
 * Supabase hands back a code; this exchanges it for a session in a cookie and
 * forwards to wherever the person was going. The destination is sanitised here
 * rather than trusted, because a sign-in callback that forwards to an arbitrary
 * URL is a phishing kit's favourite component.
 *
 * A refusal is not an error page. It goes back to the sign-in screen with the
 * reason, because the next thing the person needs is the password form.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'), '/dashboard');
  const failure = searchParams.get('error_description') ?? searchParams.get('error');

  if (failure) {
    return NextResponse.redirect(
      `${origin}/sign-in?oauth=${encodeURIComponent(failure)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?oauth=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/sign-in?oauth=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
