import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { setRevenueShare } from '@/lib/revenue-share';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'invalid', message: 'Malformed request.' },
      { status: 400 },
    );
  }

  const b = body as { percent?: unknown; reason?: unknown };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'not_authorized', message: 'Sign in first.' },
      { status: 401 },
    );
  }

  const [{ data: platformAdmin }, { data: financeAdmin }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
  ]);

  if (platformAdmin !== true && financeAdmin !== true) {
    return NextResponse.json(
      {
        ok: false,
        code: 'not_authorized',
        message: 'Only a finance admin or platform admin can change the revenue share.',
      },
      { status: 403 },
    );
  }

  const result = await setRevenueShare(
    supabase,
    b.percent as number,
    b.reason as string,
  );

  if (!result.ok) {
    const status = result.code === 'not_authorized' ? 403 : result.code === 'invalid' ? 400 : 409;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}
