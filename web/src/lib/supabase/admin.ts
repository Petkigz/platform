import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabaseEnv } from '@/lib/env';

/**
 * A client that bypasses row level security.
 *
 * Two callers, both of which are creating something no user session can create:
 *
 *   1. The payment webhook, which cannot run as a user at all. See
 *      `getServiceRoleKey()` for why.
 *   2. `app/api/family/child-login`, which creates a child's auth account. A
 *      child has no email address and cannot complete Supabase's own sign-up, so
 *      the account has to be made server-side; the guardian's permission to make
 *      it is decided *first*, in the database (`reserve_child_login()`), which is
 *      what "only a guardian can create one" means. The route never reads
 *      anything with this client and deletes the account again if the link fails.
 *
 * Everything this can reach, it can reach as anyone. So the discipline is
 * narrow: this file exports one function, it is imported only from those two
 * route handlers, and it takes no cookies — there is no user identity to carry,
 * and inventing one would be a lie the rest of the code would believe.
 *
 * If you are about to import this from a page, a component, or another route,
 * stop. Use `createClient()` from `./server` instead and let RLS decide. The
 * whole point of the policy layer is that it applies to the request, and these
 * are the only two places where it must not.
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
