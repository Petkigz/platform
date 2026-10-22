import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { describeOAuthFailure, safeNextPath } from '@/lib/oauth';
import { SignInForm } from './sign-in-form';

export const dynamic = 'force-dynamic';

/**
 * Sign in.
 *
 * The page is a server component so the Google button can be decided before it
 * is drawn: a provider that is not configured yet must not be offered, because
 * a button that fails is worse than no button. Everything else — password,
 * phone code — is the same form it was.
 *
 * No `next` means "wherever you belong", not the marketing page: a teacher who
 * signs in from the header should land in the teaching area.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; oauth?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, '/dashboard');
  const oauthError = params.oauth ? describeOAuthFailure(params.oauth) : null;

  let googleEnabled = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    // A failure to read the flag is not a reason to offer a button.
    googleEnabled = await isFlagEnabled(supabase, 'auth.google_sign_in').catch(() => false);
  }

  return (
    <>
      {oauthError && (
        <div className="narrow" style={{ marginBottom: '1rem' }}>
          <div className="notice warn" role="alert">
            {oauthError}{' '}
            <Link href="/forgot-password">Forgot your password?</Link>
          </div>
        </div>
      )}
      <Suspense fallback={<div className="narrow"><div className="card">Loading…</div></div>}>
        <SignInForm googleEnabled={googleEnabled} next={next} initialError={null} />
      </Suspense>
    </>
  );
}
