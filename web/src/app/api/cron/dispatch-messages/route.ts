import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { checkScheduler } from '@/lib/cron';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/env';
import { describeReport } from '@/lib/email/dispatch';
import { runDispatch } from '@/lib/email/run';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/dispatch-messages — send what is due, unattended.
 *
 * **Why a worker account rather than the service role.** The database decides
 * what dispatch means: `claim_outbound_messages()` refuses anybody who is not
 * privileged, and `record_delivery_outcome()` refuses to settle a row nobody
 * claimed. The service role has no user, so it has no privileges here and
 * cannot call either — by design, and recorded as such in `DECISIONS.md`. A
 * worker with a real staff account is therefore subject to the same refusals a
 * person is, and every send is attributable to somebody.
 *
 * **Why a shared secret and not a session.** There is no browser in this path.
 * `CRON_SECRET` is compared against the bearer token in constant time by
 * `lib/cron.ts` — the same check the retention run uses — and the route answers
 * 503, not 401, when it is unset: a deployment with no secret has not configured
 * a scheduler, and "unauthorised" would send whoever set it up looking for the
 * wrong problem.
 *
 * Point a free scheduler at it (a GitHub Action on a public repository, or
 * cron-job.org) once a provider key exists. Until then it is inert: with no
 * `RESEND_API_KEY` it claims nothing and returns the reason.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  // One implementation of "is this a scheduler", shared with the retention run,
  // so the two routes cannot disagree about what a valid token is.
  const gate = checkScheduler(request.headers.get('authorization'), process.env.CRON_SECRET);
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const workerEmail = (process.env.EMAIL_WORKER_EMAIL ?? '').trim();
  const workerPassword = process.env.EMAIL_WORKER_PASSWORD ?? '';
  if (workerEmail === '' || workerPassword === '') {
    return NextResponse.json(
      {
        error:
          'EMAIL_WORKER_EMAIL and EMAIL_WORKER_PASSWORD are not set. The '
          + 'dispatcher signs in as a staff account, because the database only '
          + 'lets a privileged person claim or settle a message.',
        code: 'no_worker',
      },
      { status: 503 },
    );
  }

  const { url, anonKey } = getSupabaseEnv();
  const worker = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await worker.auth.signInWithPassword({
    email: workerEmail,
    password: workerPassword,
  });
  if (signInError) {
    return NextResponse.json(
      {
        error: `The worker account could not sign in: ${signInError.message}`,
        code: 'worker_sign_in_failed',
      },
      { status: 503 },
    );
  }

  try {
    const result = await runDispatch({ supabase: worker });
    return NextResponse.json({
      ok: true,
      provider: result.provider,
      blocked: result.blocked,
      summary: describeReport(result.report),
      report: result.report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        code: 'dispatch_failed',
      },
      { status: 500 },
    );
  } finally {
    // A machine session has no reason to outlive the run.
    await worker.auth.signOut().catch(() => {});
  }
}

/** A scheduler that probes with GET gets told what to do, not a 405. */
export async function GET() {
  return NextResponse.json(
    {
      error:
        'This route sends mail, so it answers POST only. Call it with '
        + '`Authorization: Bearer <CRON_SECRET>`.',
    },
    { status: 405 },
  );
}
