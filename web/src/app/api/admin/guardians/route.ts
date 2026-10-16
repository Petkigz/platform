import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { decideGuardianCase, type Decision } from '@/lib/guardians';

export const dynamic = 'force-dynamic';

type Body = {
  relationshipId?: unknown;
  decision?: unknown;
  reason?: unknown;
  evidenceReference?: unknown;
};

const DECISIONS: Decision[] = ['verified', 'rejected', 'needs_information'];

/**
 * POST /api/admin/guardians — decide a guardian verification case.
 *
 * Two authorisation layers, and both are needed:
 *
 *   - this route checks that the caller is privileged, so the failure is a
 *     clean 403 rather than an RLS error a user would see as a bug
 *   - `gvc_admin` on the table independently restricts the write to
 *     governance_admin and platform_admin, so the route cannot be the only
 *     thing standing between a caller and a consent decision
 *
 * The reviewer is taken from the session. It is never accepted from the body,
 * because a decision record that lets the caller name the decider is not a
 * decision record.
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

  // The whole workflow is behind a flag that is off by default, because it is a
  // human review queue with a retention obligation attached. Deciding cases
  // while it is off would create records nobody agreed to keep.
  const enabled = await isFlagEnabled(supabase, 'family.guardian_verification');
  if (!enabled) {
    return NextResponse.json(
      {
        error:
          'Guardian verification is not enabled. Turn on ' +
          'family.guardian_verification first.',
        code: 'flag_disabled',
      },
      { status: 409 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const relationshipId =
    typeof body.relationshipId === 'string' ? body.relationshipId.trim() : '';
  const decision = typeof body.decision === 'string' ? body.decision : '';
  const reason = typeof body.reason === 'string' ? body.reason : '';

  if (!relationshipId) {
    return NextResponse.json(
      { error: 'relationshipId is required.' },
      { status: 400 },
    );
  }
  if (!DECISIONS.includes(decision as Decision)) {
    return NextResponse.json(
      { error: `decision must be one of: ${DECISIONS.join(', ')}.` },
      { status: 400 },
    );
  }

  const result = await decideGuardianCase(supabase, {
    relationshipId,
    reviewerId: user.id,
    decision: decision as Decision,
    reason,
    evidenceReference:
      typeof body.evidenceReference === 'string' ? body.evidenceReference : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, relationshipId, decision });
}
