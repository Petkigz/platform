import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchMoneyReport, validateWindowInput } from '@/lib/currency';

export const dynamic = 'force-dynamic';

/**
 * Money that moved in a window, in the one currency the owner reads.
 *
 * `from` and `to` are dates, and `to` is inclusive: "the 1st to the 31st" means
 * the whole of the 31st. `validateWindowInput()` turns that into the
 * half-open interval the database wants, so the last day of a period is never
 * silently dropped from a total.
 *
 * The report is finance-staff only. It is the one screen that shows what the
 * platform earned across every currency at once, which is not a support answer
 * to a question about one order.
 */

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  const [{ data: finance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (finance !== true && platform !== true) {
    return fail('Only a finance admin or platform admin may read the money report.', 403);
  }

  const params = new URL(request.url).searchParams;
  const window = validateWindowInput({ from: params.get('from'), to: params.get('to') });
  if (!window.ok) return fail(window.message, 422);

  const outcome = await fetchMoneyReport(supabase, window.value);
  if (!outcome.ok) {
    return fail(outcome.message, outcome.code === 'forbidden' ? 403 : 502);
  }
  return NextResponse.json({ ok: true, report: outcome.value });
}
