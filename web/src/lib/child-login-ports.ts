import type { SupabaseClient } from '@supabase/supabase-js';
import { CHILD_LOGIN_DOMAIN } from './child-login.ts';
import type { ChildLoginCreatePorts } from './child-login-create.ts';

/**
 * Server-only adapter. The session client reserves under the real guardian;
 * only the service client creates, looks up and completes a marked identity.
 * No credentials, metadata or database errors are returned to the browser.
 */
export function childLoginCreatePorts(session: SupabaseClient, service: SupabaseClient): ChildLoginCreatePorts {
  return {
    async prepare(learnerId, username) {
      const { data, error } = await session.rpc('prepare_child_login', {
        p_learner: learnerId, p_username: username,
      });
      if (error || typeof data !== 'string' || !data) throw new Error('reservation unavailable');
      return data;
    },
    async findIdentity(attemptId, guardianId) {
      const { data, error } = await service.rpc('child_login_attempt_identity', {
        p_attempt: attemptId, p_guardian: guardianId,
      });
      if (error || (data !== null && typeof data !== 'string')) throw new Error('identity lookup unavailable');
      return data;
    },
    async createIdentity({ username, password, attemptId }) {
      const { data, error } = await service.auth.admin.createUser({
        email: `${username}@${CHILD_LOGIN_DOMAIN}`,
        password,
        email_confirm: true,
        app_metadata: { ayahspring_child_attempt: attemptId },
        user_metadata: { child_login: true, username },
      });
      if (error || !data?.user?.id) throw new Error('identity creation uncertain');
      return data.user.id;
    },
    async complete(attemptId, guardianId, userId) {
      const { data, error } = await service.rpc('complete_child_login_attempt', {
        p_attempt: attemptId, p_guardian: guardianId, p_user: userId,
      });
      if (error || !data || typeof data !== 'object') throw new Error('link completion uncertain');
    },
  };
}
