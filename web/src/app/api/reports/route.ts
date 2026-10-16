import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { reportContent } from '@/lib/governance';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reports — flag a problem with a lesson or a discussion post.
 *
 * Deliberately does not require a session: content_reports_insert admits anon,
 * because someone who will not sign in should still be able to flag a doctrinal
 * error. The database requires that whoever files it can see the content, which
 * is the check that actually matters here.
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
  const result = await reportContent(supabase, (body ?? {}) as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, reportId: result.reportId }, { status: 201 });
}
