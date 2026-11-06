import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return NextResponse.json({ ok: false }, { status: 415, headers });
  }
  const body = await request.json().catch(() => null) as { attemptId?: unknown } | null;
  if (typeof body?.attemptId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.attemptId)) {
    return NextResponse.json({ ok: false }, { status: 400, headers });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers });
  const { data, error } = await supabase.rpc('reconcile_child_login_attempt', { p_attempt: body.attemptId });
  if (error || data?.reconciled !== true) {
    return NextResponse.json({ ok: false }, { status: 409, headers });
  }
  return NextResponse.json({ ok: true }, { headers });
}
