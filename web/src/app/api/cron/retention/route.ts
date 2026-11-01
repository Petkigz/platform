import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { checkScheduler } from '@/lib/cron';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/env';
import { describeRetentionRun, type RetentionRun } from '@/lib/retention';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/retention — delete what the clocks say is due, unattended.
 *
 * **Why this exists at all.** A retention period that depends on somebody
 * remembering to open a screen is not a period, it is an intention. The promise
 * in the privacy notice is that a case goes three years after it closes whether
 * or not anybody is looking.
 *
 * **Why a worker account rather than the service role.** The database only lets
 * a `platform_admin` run the cleanup, so the machine signs in as a person with
 * that role and is subject to the same refusal a human is. Every deletion is
 * attributable, which is the property that makes a retention job auditable
 * rather than merely convenient.
 *
 * **Why a shared secret.** There is no browser in this path. `CRON_SECRET` is
 * compared in constant time by `lib/cron.ts`, shared with the mail dispatcher so
 * the two cannot drift apart.
 *
 * **Why it is safe to run daily.** Each call takes a bounded batch and reports
 * what is left; a backlog drains over a few runs instead of holding a lock
 * behind a live support queue. The date is never taken from the request: a
 * scheduler cannot ask it to clean as of next decade.
 *
 * Until `CRON_SECRET`, `RETENTION_WORKER_EMAIL` and `RETENTION_WORKER_PASSWORD`
 * are set it answers 503 and deletes nothing — which is the honest state of a
 * deployment with no scheduler, and it is named in the runbook.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  const gate = checkScheduler(request.headers.get('authorization'), process.env.CRON_SECRET);
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const workerEmail = (process.env.RETENTION_WORKER_EMAIL ?? '').trim();
  const workerPassword = process.env.RETENTION_WORKER_PASSWORD ?? '';
  if (workerEmail === '' || workerPassword === '') {
    return NextResponse.json(
      {
        error:
          'RETENTION_WORKER_EMAIL and RETENTION_WORKER_PASSWORD are not set. The '
          + 'cleanup runs as a platform admin, because the database only lets the '
          + 'owner delete a record early — or at all. Give one account that role and '
          + 'put its credentials here, or run it from /admin/retention.',
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
        error: `The retention worker could not sign in: ${signInError.message}`,
        code: 'worker_sign_in_failed',
      },
      { status: 503 },
    );
  }

  try {
    const { data, error } = await worker.rpc('run_retention_jobs', {});
    if (error) {
      return NextResponse.json(
        { error: error.message, code: 'retention_failed' },
        { status: 500 },
      );
    }
    const run = data as RetentionRun;
    return NextResponse.json({ ok: true, summary: describeRetentionRun(run), run });
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
        'Deleting records needs a POST. Call it with `Authorization: Bearer '
        + '<CRON_SECRET>`.',
    },
    { status: 405 },
  );
}
