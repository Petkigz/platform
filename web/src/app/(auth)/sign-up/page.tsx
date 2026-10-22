import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { SignUpForm } from './sign-up-form';

export const dynamic = 'force-dynamic';

/**
 * Create an account.
 *
 * With Google there is no separate sign-up: the provider creates the account on
 * first arrival, which is why the same button does the same thing on both
 * screens. It is only drawn when the provider is configured.
 */
export default async function SignUpPage() {
  let googleEnabled = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    googleEnabled = await isFlagEnabled(supabase, 'auth.google_sign_in').catch(() => false);
  }

  return <SignUpForm googleEnabled={googleEnabled} />;
}
