/**
 * Signing in with Google.
 *
 * The flow belongs to Supabase Auth: the browser is sent to Google, Google
 * returns a code to Supabase, and Supabase returns to `/auth/callback` with a
 * code this deployment exchanges for a session. Nothing here handles a token or
 * a provider secret, and none belongs in this repository.
 *
 * What this module owns is the small amount of judgement around it: where to
 * come back to, and what to say when Google or Supabase says no.
 */

/** The `redirectTo` Supabase should return to, carrying the caller's destination. */
export function oauthRedirectUrl(origin: string, next: string): string {
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return `${origin.replace(/\/+$/, '')}/auth/callback?next=${encodeURIComponent(safe)}`;
}

/**
 * A destination that cannot be used to leave the site. Relative, single-slash,
 * and never a protocol-relative URL — an open redirect on a sign-in callback is
 * a phishing kit's favourite component.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  // Backslashes are normalised to slashes by some browsers; refuse them.
  if (raw.includes('\\')) return fallback;
  return raw;
}

/**
 * What to tell somebody when the provider refuses.
 *
 * Supabase's messages are technical and sometimes name the project or the
 * provider. The person reading this needs to know whether to try again, ask for
 * help, or use a password instead.
 */
export function describeOAuthFailure(raw: string | null | undefined): string {
  const message = (raw ?? '').toLowerCase();

  if (message.includes('access_denied') || message.includes('cancel')) {
    return 'Google sign-in was cancelled. Nothing changed — you can try again or use your email and password.';
  }
  if (message.includes('provider is not enabled') || message.includes('unsupported provider')) {
    return 'Google sign-in is not switched on for this deployment yet. Use your email and password.';
  }
  if (message.includes('redirect') || message.includes('url not allowed')) {
    return 'This site is not registered with the sign-in provider. The platform owner has to add it; until then, use your email and password.';
  }
  if (message.includes('email') && message.includes('exists')) {
    return 'An account already uses that address with a password. Sign in with your password, then link Google from your account page.';
  }
  if (message) {
    return `Google sign-in did not complete (${raw}). Try again, or use your email and password.`;
  }
  return 'Google sign-in did not complete. Try again, or use your email and password.';
}

/** A provider name as a sentence a person reads. */
export function describeProvider(provider: string): string {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'email':
      return 'Email and password';
    case 'phone':
      return 'Phone code';
    default:
      return provider;
  }
}

export type SignInMethods = {
  providers: string[];
  hasPassword: boolean;
  summary: string;
};
