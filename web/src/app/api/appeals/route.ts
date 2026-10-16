import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { appealDecision } from '@/lib/governance';

export const dynamic = 'force-dynamic';

/**
 * POST /api/appeals — contest a reviewer's rejection of a course version.
 *
 * Standing is decided in the database: only the author of the course version may
 * appeal a decision about it. Without that, an open appeal is work somebody does
 * on behalf of someone with no stake in the outcome.
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
    return NextResponse.json({ error: 'Sign in to appeal a decision.' }, { status: 401 });
  }

  const result = await appealDecision(supabase, (body ?? {}) as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, appealId: result.appealId }, { status: 201 });
}
