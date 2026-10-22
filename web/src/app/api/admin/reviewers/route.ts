import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  assessReviewerConflict,
  recordReviewerQualification,
  setReviewerAuthorization,
  setReviewerStatus,
  verifyReviewerQualification,
} from '@/lib/review';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Deciding who may review.
 *
 * The gate is `governance_admin` or `platform_admin`, not `is_privileged`. That is
 * deliberate and narrower than the other admin routes here: `is_privileged` also
 * admits a support agent, and a support agent should be able to read a case and
 * refund an order without thereby being able to appoint a scholar who signs off on
 * what the platform teaches. The same pair guards the functions this route calls,
 * so the route is a convenience, not the defence.
 */

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function statusFor(outcome: { ok: boolean; code?: string }): number {
  if (outcome.ok) return 200;
  return outcome.code === 'forbidden' ? 403 : 422;
}

async function isGovernanceStaff(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const [{ data: governance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: userId, p_role_code: 'governance_admin' }),
    supabase.rpc('has_role', { p_user_id: userId, p_role_code: 'platform_admin' }),
  ]);
  return governance === true || platform === true;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return fail('Malformed request.', 400); }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  // Governance staff run the register. A scholarly board member may reach one
  // action — checking a qualification — and only while the owner has convened
  // the board. The database enforces the same rule; this is the courtesy that
  // lets a board member use the screen at all.
  let allowed = await isGovernanceStaff(supabase, user.id);
  if (!allowed && body.action === 'verify-qualification') {
    const [{ data: boardMember }, { data: boardActive }] = await Promise.all([
      supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'scholarly_panel_member' }),
      supabase.rpc('setting_bool', { p_key: 'governance.scholar_board_active', p_default: false }),
    ]);
    allowed = boardMember === true && boardActive === true;
  }
  if (!allowed) {
    return fail('Only a governance admin, the platform owner, or a convened scholarly board may decide who reviews.', 403);
  }

  const idOf = (value: unknown) =>
    typeof value === 'string' && UUID.test(value) ? value : null;

  if (body.action === 'status') {
    const reviewerProfileId = idOf(body.reviewerProfileId);
    if (!reviewerProfileId) return fail('A valid reviewer profile id is required.', 400);
    const outcome = await setReviewerStatus(supabase, {
      reviewerProfileId,
      status: body.status,
      note: body.note,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'qualification') {
    const reviewerProfileId = idOf(body.reviewerProfileId);
    if (!reviewerProfileId) return fail('A valid reviewer profile id is required.', 400);
    const outcome = await recordReviewerQualification(supabase, {
      reviewerProfileId,
      qualificationType: body.qualificationType,
      title: body.title,
      institution: body.institution,
      subjectAreaId: body.subjectAreaId,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'verify-qualification') {
    const qualificationId = idOf(body.qualificationId);
    if (!qualificationId) return fail('A valid qualification id is required.', 400);
    const outcome = await verifyReviewerQualification(supabase, {
      qualificationId,
      decision: body.decision,
      validUntil: body.validUntil,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'authorization') {
    const reviewerProfileId = idOf(body.reviewerProfileId);
    if (!reviewerProfileId) return fail('A valid reviewer profile id is required.', 400);
    const outcome = await setReviewerAuthorization(supabase, {
      reviewerProfileId,
      subjectAreaId: body.subjectAreaId,
      scope: body.scope,
      status: body.status,
      effectiveUntil: body.effectiveUntil,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'assess-conflict') {
    const declarationId = idOf(body.declarationId);
    if (!declarationId) return fail('A valid declaration id is required.', 400);
    const outcome = await assessReviewerConflict(supabase, {
      declarationId,
      status: body.status,
      notes: body.notes,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  return fail('Unsupported reviewer action.', 400);
}
