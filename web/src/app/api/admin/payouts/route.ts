import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { completePayout, failPayout, setPayoutPolicy } from '@/lib/payouts';

/**
 * The finance side of payouts: recording one, refusing one, and the hold period.
 *
 * The completion path is the only thing in the product that marks an earning
 * `paid`, and it demands the provider and reference that made it checkable.
 */
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
    return NextResponse.json({ ok: false, code: 'invalid', message: 'Malformed request.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: 'not_authorized', message: 'Sign in first.' }, { status: 401 });
  }

  const [{ data: platform }, { data: finance }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
  ]);
  if (platform !== true && finance !== true) {
    return NextResponse.json(
      { ok: false, code: 'not_authorized', message: 'Only a finance admin or platform admin can do that.' },
      { status: 403 },
    );
  }

  const b = body as Record<string, unknown>;
  const action = typeof b.action === 'string' ? b.action : '';
  const payoutId = typeof b.payoutId === 'string' ? b.payoutId : '';

  if (action === 'complete') {
    const result = await completePayout(supabase, {
      payoutId,
      provider: typeof b.provider === 'string' ? b.provider : '',
      reference: typeof b.reference === 'string' ? b.reference : '',
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (action === 'fail') {
    const result = await failPayout(supabase, {
      payoutId,
      reason: typeof b.reason === 'string' ? b.reason : '',
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (action === 'policy') {
    const result = await setPayoutPolicy(supabase, {
      holdDays: typeof b.holdDays === 'number' ? b.holdDays : Number.NaN,
      reason: typeof b.reason === 'string' ? b.reason : '',
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json({ ok: false, code: 'invalid', message: 'Unknown action.' }, { status: 400 });
}
