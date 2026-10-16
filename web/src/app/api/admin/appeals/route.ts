import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { decideAppeal } from '@/lib/governance';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/appeals — uphold, overturn or withdraw an appeal.
 *
 * The independence rule lives in decide_appeal(): the reviewer whose decision is
 * being appealed cannot decide the appeal. That is not enforceable here, because
 * this route cannot know which decision a given appeal concerns without asking
 * the database — which is exactly why the check belongs there.
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
    return NextResponse.json({ error: 'Sign in to decide an appeal.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return NextResponse.json({ error: 'Only staff can decide appeals.' }, { status: 403 });
  }

  const result = await decideAppeal(supabase, (body ?? {}) as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
