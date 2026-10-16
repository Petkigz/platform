import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabaseEnv } from '@/lib/env';

/**
 * A client that bypasses row level security.
 *
 * Used by exactly one caller: the payment webhook. See `getServiceRoleKey()`
 * for why that route cannot run as a user.
 *
 * Everything this can reach, it can reach as anyone. So the discipline is
 * narrow: this file exports one function, it is only ever imported from a
 * route handler under `app/api/payments/`, and it takes no cookies — there is
 * no user identity to carry, and inventing one would be a lie the rest of the
 * code would believe.
 *
 * If you are about to import this from a page, a component, or a route that
 * serves a signed-in user, stop. Use `createClient()` from `./server` instead
 * and let RLS decide. The whole point of the policy layer is that it applies to
 * the request, and this is the one place where it must not.
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
