import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabaseEnv } from '@/lib/env';

/**
 * Server-only service-role client: it bypasses RLS and never carries a user session.
 * The payment webhook uses it after provider verification; child-login creation
 * uses it only after a verified guardian's durable reservation, to create or
 * find a marked identity and complete the attempt. The named owner may also
 * request deletion of a verified, guarded child identity; ambiguous outcomes are
 * checked against the database rather than blindly repeated. See
 * child-login-create.ts and child-login-auth-removal.ts. The scheduler uses it
 * for private, generic safeguarding alerts; the key never goes to the client.
 * Never expose this key to a browser or use it instead of a user's RLS client.
 */
export function createAdminClient(): SupabaseClient {
  const { url } = getSupabaseEnv();
  const key = getServiceRoleKey();

  return createClient(url, key, {
    auth: {
      // No session, no auto-refresh, nothing persisted. A service-role client
      // that tries to behave like a user session is how a service-role token
      // ends up in a cookie.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
