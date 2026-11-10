import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { privateNoStore } from '@/lib/private-response';

/**
 * Running the retention cleanup from a screen.
 *
 * The gate is `platform_admin` — the owner — and the database refuses anybody
 * else as well, so this route is a sentence before the round trip rather than
 * the defence. Deleting a record is deleting evidence: a screening register says
 * a check happened, and a support case says what was promised to whom.
 *
 * The actor is never sent from the client. `run_retention_jobs()` reads the
 * session, so the audit entry names who really ran it.
 *
 * No date is accepted from the request. The function takes one so it can be
 * replayed and tested, and a route that let a browser pass `2040` would be
 * handing the future to whoever asked. The run cleans as of today.
 */
const privateJson = (body: unknown, init?: ResponseInit) => privateNoStore(NextResponse.json(body, init));
function fail(message: string, status = 400) {
  return privateJson({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown = null;
  try {
    raw = await request.json();
  } catch {
    raw = null;
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  const { data: platform } = await supabase.rpc('has_role', {
    p_user_id: user.id,
    p_role_code: 'platform_admin',
  });
  if (platform !== true) {
    return fail('Only the platform admin runs the retention cleanup.', 403);
  }

  if (body.action !== 'run') return fail('Unknown action.');

  const { data, error } = await supabase.rpc('run_retention_jobs', {});
  if (error) {
    if (/retention:not_allowed/.test(error.message)) {
      return fail('Only the platform admin runs the retention cleanup.', 403);
    }
    return fail(error.message, 500);
  }

  return privateJson({ ok: true, run: data });
}
