import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabaseEnv } from '@/lib/env';

/**
 * Server-only service-role client: it bypasses RLS and never carries a user session.
 * The payment webhook uses it after provider verification; child-login creation
 * uses it only after a verified guardian's durable reservation, to create or
 * find a marked identity and complete the attempt. Ambiguous outcomes are not
 * cleaned up by blindly deleting an account. See child-login-create.ts.
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
