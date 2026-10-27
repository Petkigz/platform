import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  decideGuardianConsent,
  type ConsentDecision,
} from '@/lib/guardian-consent';

export const dynamic = 'force-dynamic';

type Body = {
  caseId?: unknown;
  decision?: unknown;
  reason?: unknown;
  months?: unknown;
  canViewProgress?: unknown;
  canManageLearning?: unknown;
  canManageProfile?: unknown;
};

const DECISIONS: ConsentDecision[] = ['verified', 'rejected', 'needs_information'];

/**
 * POST /api/admin/guardians — decide a consent case.
 *
 * The reviewer is taken from the session. It is never accepted from the body,
 * because a consent record that lets the caller name the decider is not a record.
 *
 * No evidence reference is accepted here at all: the column is write-only, and
 * the person deciding is not the person who supplied the evidence. What they
 * write is the reason, and the parent reads it.
 *
 * Deliberately **not** gated on the flag. The flag decides whether a lapse is
 * enforced, not whether a consent can be recorded: turning enforcement on with an
 * empty queue would be worse than turning it on with a reviewed list.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';
  const decision = typeof body.decision === 'string' ? body.decision : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const months = Number.isInteger(body.months) ? (body.months as number) : 12;

  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required.' }, { status: 400 });
  }
  if (!DECISIONS.includes(decision as ConsentDecision)) {
    return NextResponse.json(
      { error: `decision must be one of: ${DECISIONS.join(', ')}.` },
      { status: 400 },
    );
  }
  if (reason.length < 5) {
    return NextResponse.json(
      { error: 'A written reason is required — the parent reads it.' },
      { status: 400 },
    );
  }
  if (months < 1 || months > 36) {
    return NextResponse.json(
      { error: 'A verification lasts between one and thirty-six months.' },
      { status: 400 },
    );
  }

  const result = await decideGuardianConsent(supabase, {
    caseId,
    decision: decision as ConsentDecision,
    reason,
    months,
    canViewProgress: body.canViewProgress === true,
    canManageLearning: body.canManageLearning === true,
    canManageProfile: body.canManageProfile === true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, caseId, decision });
}
