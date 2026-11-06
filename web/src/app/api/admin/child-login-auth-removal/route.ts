import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isServiceRoleConfigured } from '@/lib/env';
import { removeTrustedChildAuth } from '@/lib/child-login-auth-removal';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return NextResponse.json({ ok: false }, { status: 415, headers });
  }
  const body = await request.json().catch(() => null) as { taskId?: unknown } | null;
  if (typeof body?.taskId !== 'string') return NextResponse.json({ ok: false }, { status: 400, headers });
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers });
  if (!isServiceRoleConfigured()) return NextResponse.json({ ok: false }, { status: 503, headers });
  const service = createAdminClient();
  const result = await removeTrustedChildAuth({
    async authorize(taskId) {
      const { data, error } = await session.rpc('authorize_child_login_auth_deletion', { p_task: taskId });
      if (error || !data || typeof data.identityId !== 'string'
        || typeof data.attemptId !== 'string' || typeof data.email !== 'string') throw new Error('authorization unavailable');
      return { identityId: data.identityId, attemptId: data.attemptId, email: data.email };
    },
    async lookup(identityId) {
      const { data, error } = await service.auth.admin.getUserById(identityId);
      if (error || !data?.user) throw new Error('identity lookup unavailable');
      return { id: data.user.id, email: data.user.email ?? null, marker: data.user.app_metadata?.ayahspring_child_attempt };
    },
    async remove(identityId) {
      const { error } = await service.auth.admin.deleteUser(identityId);
      if (error) throw new Error('provider outcome uncertain');
    },
    async recordAbsence(taskId) {
      const { data, error } = await session.rpc('record_child_login_identity_removed', { p_task: taskId });
      if (error || data?.recorded !== true) throw new Error('identity absence unconfirmed');
    },
  }, body.taskId);
  return NextResponse.json(result, { status: result.ok ? 200 : 409, headers });
}
