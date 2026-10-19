import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import {
  closeSupportCase,
  fetchMyCases,
  openSupportCase,
  replyToSupportCase,
} from '@/lib/support';

export const dynamic = 'force-dynamic';

type Body = {
  action?: unknown;
  caseId?: unknown;
  category?: unknown;
  subject?: unknown;
  body?: unknown;
  learnerProfileId?: unknown;
  orderId?: unknown;
  reason?: unknown;
};

function requireCaseId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * GET /api/support — my cases, and whether the desk is accepting new ones.
 *
 * Existing cases stay readable while `platform.support` is off. Turning the
 * feature off stops new cases; it does not make a conversation somebody is
 * already having disappear from their own account.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured on this deployment.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to ask for help.' }, { status: 401 });
  }

  const accepting = await isFlagEnabled(supabase, 'platform.support').catch(() => false);
  const cases = await fetchMyCases(supabase);

  return NextResponse.json({
    accepting,
    cases: cases.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      category: c.category,
      subject: c.subject,
      status: c.status,
      priority: c.priority,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      resolutionNote: c.resolutionNote,
      closeReason: c.closeReason,
    })),
  });
}

/**
 * POST /api/support — open a case, reply to one, or withdraw one.
 *
 * No actor id is accepted: every function takes identity from the session, so
 * there is nothing here to spoof. The flag is checked for opening, which is the
 * only action the switch is meant to stop — a requester reply to a case that is
 * already open is refused by the database while the flag is off, and that
 * refusal is passed through rather than pre-empted, so the two stay in step.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured on this deployment.' }, { status: 503 });
  }

  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to ask for help.' }, { status: 401 });
  }

  if (payload.action === 'open') {
    const accepting = await isFlagEnabled(supabase, 'platform.support').catch(() => false);
    if (!accepting) {
      return NextResponse.json(
        { error: 'Support is not accepting new requests right now.', code: 'flag_disabled' },
        { status: 409 },
      );
    }
    const result = await openSupportCase(supabase, {
      category: payload.category,
      subject: payload.subject,
      body: payload.body,
      learnerProfileId: payload.learnerProfileId,
      orderId: payload.orderId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, id: result.value.id }, { status: 201 });
  }

  const caseId = requireCaseId(payload.caseId);
  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required.' }, { status: 400 });
  }

  if (payload.action === 'reply') {
    const result = await replyToSupportCase(supabase, {
      caseId,
      body: typeof payload.body === 'string' ? payload.body : '',
      // Always false on this route. Internal notes are staff-only and are sent
      // through /api/admin/support instead; the database refuses one from a
      // requester, so this is a second door rather than the only lock.
      isInternal: false,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, id: result.value.id });
  }

  if (payload.action === 'close') {
    const result = await closeSupportCase(supabase, {
      caseId,
      reason: typeof payload.reason === 'string' ? payload.reason : '',
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Choose open, reply or close.' }, { status: 400 });
}
