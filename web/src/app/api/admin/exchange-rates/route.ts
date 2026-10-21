import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchRecentRates, recordExchangeRate } from '@/lib/currency';

export const dynamic = 'force-dynamic';

/**
 * Exchange rates: what one currency was worth in another, when, and who said so.
 *
 * The gate is `finance_admin` or `platform_admin` — the same pair that guards
 * `record_exchange_rate()` and every other money writer, and deliberately not
 * `is_privileged()`, which would also admit a support agent. A support agent can
 * read a case and refund an order; they should not be able to change the number
 * every total on the platform is converted with.
 *
 * Reads are gated here even though `cer_read` makes the table public. A rate is
 * market data, but the list of every rate this platform has been told to believe
 * is a finance screen, and the route is the place that says so.
 */

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

async function isFinanceStaff(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const [{ data: finance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: userId, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: userId, p_role_code: 'platform_admin' }),
  ]);
  return finance === true || platform === true;
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);
  if (!(await isFinanceStaff(supabase, user.id))) {
    return fail('Only a finance admin or platform admin may read the rate list.', 403);
  }

  const asked = Number(new URL(request.url).searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(asked) ? Math.min(Math.max(Math.trunc(asked), 1), 200) : 50;

  const outcome = await fetchRecentRates(supabase, limit);
  if (!outcome.ok) {
    return fail(outcome.message, outcome.code === 'forbidden' ? 403 : 502);
  }
  return NextResponse.json({ ok: true, rates: outcome.value });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Malformed request.', 400);
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);
  if (!(await isFinanceStaff(supabase, user.id))) {
    return fail('Only a finance admin or platform admin may record an exchange rate.', 403);
  }

  const outcome = await recordExchangeRate(supabase, body);
  if (!outcome.ok) {
    // 422 for a refusal with a reason a person can act on, which is every one
    // of them: a missing source, a self-pair, a move that needs explaining.
    return fail(outcome.message, outcome.code === 'forbidden' ? 403 : 422);
  }
  return NextResponse.json({ ok: true, id: outcome.value.id }, { status: 201 });
}
