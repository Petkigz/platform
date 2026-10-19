import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  assignSupportCase,
  closeSupportCase,
  fetchSupportQueue,
  replyToSupportCase,
  resolveSupportCase,
  setSupportCasePriority,
} from '@/lib/support';

export const dynamic = 'force-dynamic';

type Body = {
  action?: unknown;
  caseId?: unknown;
  body?: unknown;
  isInternal?: unknown;
  assigneeId?: unknown;
  priority?: unknown;
  note?: unknown;
  reason?: unknown;
};

/**
 * GET /api/admin/support — the working queue.
 *
 * POST /api/admin/support — reply (optionally internally), assign, set
 * priority, resolve, close.
 *
 * The privilege check here is for the interface. The boundary is in the
 * functions: each of them re-checks `is_privileged()` against the session, so
 * calling the RPC directly without this route gains nothing.
 *
 * Staff actions are not gated on `platform.support`. That is deliberate — the
 * switch stops new cases arriving, and an admin who turns it off while cases
 * are open still has to be able to answer and finish them.
 */
type StaffGuard =
  | { ok: false; response: NextResponse }
  | { ok: true; supabase: SupabaseClient; user: User };

async function guardStaff(): Promise<StaffGuard> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Supabase is not configured on this deployment.' },
        { status: 503 },
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Sign in to work the support queue.' }, { status: 401 }),
    };
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Only staff can work the support queue.' }, { status: 403 }),
    };
  }

  return { ok: true, supabase, user };
}

export async function GET(request: Request) {
  const guard = await guardStaff();
  if (!guard.ok) return guard.response;

  const scope = new URL(request.url).searchParams.get('scope') === 'all' ? 'all' : 'unresolved';
  const cases = await fetchSupportQueue(guard.supabase, { scope });

  return NextResponse.json({ scope, cases });
}

export async function POST(request: Request) {
  const guard = await guardStaff();
  if (!guard.ok) return guard.response;

  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const supabase = guard.supabase;
  const caseId = typeof payload.caseId === 'string' && payload.caseId.length > 0
    ? payload.caseId
    : null;
  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required.' }, { status: 400 });
  }

  switch (payload.action) {
    case 'reply': {
      const result = await replyToSupportCase(supabase, {
        caseId,
        body: typeof payload.body === 'string' ? payload.body : '',
        isInternal: payload.isInternal === true,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true, id: result.value.id });
    }

    case 'assign': {
      // The queue is worked by whoever picks it up; the form offers "assign to
      // me" rather than a roster, so the assignee is the session user unless
      // the caller names somebody who exists.
      const assigneeId = typeof payload.assigneeId === 'string' && payload.assigneeId.length > 0
        ? payload.assigneeId
        : guard.user.id;
      const result = await assignSupportCase(supabase, { caseId, assigneeId });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true });
    }

    case 'priority': {
      const result = await setSupportCasePriority(supabase, {
        caseId,
        priority: typeof payload.priority === 'string' ? payload.priority : '',
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true });
    }

    case 'resolve': {
      const result = await resolveSupportCase(supabase, {
        caseId,
        note: typeof payload.note === 'string' ? payload.note : '',
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true });
    }

    case 'close': {
      const result = await closeSupportCase(supabase, {
        caseId,
        reason: typeof payload.reason === 'string' ? payload.reason : '',
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json(
        { error: 'Choose reply, assign, priority, resolve or close.' },
        { status: 400 },
      );
  }
}
