/**
 * Environment validation at the boundary.
 *
 * A missing Supabase URL should fail loudly at startup, not produce a blank
 * page and a console error the user has to interpret.
 */

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export class MissingSupabaseEnvError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY in web/.env.local (see web/.env.example).',
    );
  }
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (process.env.NEXT_PUBLIC_ALLOW_MISSING_SUPABASE === '1') {
      // Build-time only. Any real request will fail with a clear message
      // rather than a null client.
      return { url: 'https://unconfigured.invalid', anonKey: 'unconfigured' };
    }
    throw new MissingSupabaseEnvError();
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * The service role key, for the payment webhook and nothing else.
 *
 * This is the one place in the app that must bypass row level security, and it
 * is worth being precise about why. `record_payment_success()` is revoked from
 * `anon` and granted to `authenticated`, and `payment_provider_events` has
 * `staff_only()` on both read and write. A provider callback arrives with no
 * user session, so through the anon-key client it is `anon` and both of those
 * refuse it.
 *
 * So the webhook cannot run as a user. That is correct — a provider is not a
 * user, and letting an unauthenticated caller act as one would be the hole. The
 * signature check is the authorisation for this route instead, and it happens
 * before anything is written.
 *
 * Deliberately not `NEXT_PUBLIC_`: this key bypasses every policy in the schema
 * and must never reach a browser bundle.
 */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. The payment webhook needs it, ' +
        'because record_payment_success() is not executable by anon and ' +
        'payment_provider_events is staff-only. Do not work around this by ' +
        'granting anon EXECUTE: the webhook must stay server-side.',
    );
  }
  return key;
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
