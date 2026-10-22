import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { cancelPayout, requestPayout } from '@/lib/payouts';

/**
 * The teacher's payout writes.
 *
 * Nothing here decides who may be paid. The database does: a request is refused
 * while `teaching.payouts` is off, and a payout is only marked paid by finance.
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

  const b = body as Record<string, unknown>;
  const action = typeof b.action === 'string' ? b.action : '';

  if (action === 'request') {
    const result = await requestPayout(supabase, {
      currency: typeof b.currency === 'string' ? b.currency : '',
      destination: typeof b.destination === 'string' ? b.destination : '',
      acknowledgeTax: b.acknowledgeTax === true,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : result.code === 'not_authorized' ? 403 : 400 });
  }

  if (action === 'cancel') {
    const result = await cancelPayout(supabase, typeof b.payoutId === 'string' ? b.payoutId : '');
    return NextResponse.json(result, { status: result.ok ? 200 : result.code === 'not_authorized' ? 403 : 400 });
  }

  return NextResponse.json({ ok: false, code: 'invalid', message: 'Unknown action.' }, { status: 400 });
}
