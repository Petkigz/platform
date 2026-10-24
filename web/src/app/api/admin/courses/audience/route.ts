import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { setAudience } from '@/lib/authoring';

/**
 * POST /api/admin/courses/audience — say who a course is for, from the shelf.
 *
 * The same write the author makes from their own course page, offered to the
 * two roles that may make it for somebody else's course. The author's route is
 * `/api/teach`; this one exists so the staff surface does not have to pretend
 * to be a teacher to use its own power.
 *
 * The privilege check is here for the interface and again inside
 * `set_course_audience()`, which is the boundary that matters: an RPC can be
 * called without going through this route.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Expected a JSON body.' },
      { status: 400 },
    );
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const courseId = typeof input.courseId === 'string' ? input.courseId : '';
  const audience = typeof input.audience === 'string' ? input.audience : '';
  const ageBands = Array.isArray(input.ageBands)
    ? input.ageBands.filter((b): b is string => typeof b === 'string')
    : null;

  if (!courseId || !audience || ageBands === null) {
    return NextResponse.json(
      { ok: false, message: 'A course, an audience and a list of age bands are required.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in to change who a course is for.' }, { status: 401 });
  }

  const [{ data: platformRole }, { data: governanceRole }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platformRole !== true && governanceRole !== true) {
    return NextResponse.json(
      { ok: false, message: 'Only the platform admin or a governance admin may change who a course is for here.' },
      { status: 403 },
    );
  }

  const result = await setAudience(supabase, { courseId, audience, ageBands });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, value: result.value });
}
