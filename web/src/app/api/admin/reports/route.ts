import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { resolveReport } from '@/lib/governance';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reports — move a report through triage to closed.
 *
 * The privilege check happens here and inside resolve_content_report(); the
 * redirect here is for the interface, the one in the function is the boundary.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to triage reports.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return NextResponse.json({ error: 'Only staff can triage reports.' }, { status: 403 });
  }

  const result = await resolveReport(supabase, (body ?? {}) as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
