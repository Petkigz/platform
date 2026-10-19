import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Handles the email confirmation and magic links Supabase sends. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const requestedNext = searchParams.get('next');
  let next = '/learn';
  if (requestedNext?.startsWith('/') && !requestedNext.startsWith('//')) {
    try {
      const candidate = new URL(requestedNext, origin);
      if (candidate.origin === origin) next = `${candidate.pathname}${candidate.search}${candidate.hash}`;
    } catch {
      // Fall back to the learner dashboard for malformed destinations.
    }
  }

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=confirmation`);
}
