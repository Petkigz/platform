import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { describeReport } from '@/lib/email/dispatch';
import { runDispatch } from '@/lib/email/run';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/messages/dispatch — send what is due, on purpose.
 *
 * The whole reason this exists: a scheduler that silently stops is the failure
 * nobody notices until a parent says they never received a receipt. A person
 * looking at the queue can therefore run the same pass the scheduler would, with
 * their own session, and see what happened.
 *
 * It is the *same* code path — the database decides what dispatch means, so a
 * button cannot be more permissive than a cron job, and a machine cannot do
 * anything a person could not.
 *
 * No body is read, because there is nothing to choose. A limit and a filter
 * would be a way of sending only the messages somebody felt like sending.
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to send the queue.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return NextResponse.json({ error: 'Only staff can send the queue.' }, { status: 403 });
  }

  try {
    const result = await runDispatch({ supabase });
    return NextResponse.json({
      ok: true,
      provider: result.provider,
      blocked: result.blocked,
      summary: describeReport(result.report),
      report: result.report,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
