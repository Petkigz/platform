import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  assessContentChange,
  recordTechnicalCheck,
  recountRequirements,
  requireReview,
  waiveReviewRequirement,
} from '@/lib/review-requirements';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * What a version needs before it can publish.
 *
 * Who may do what is decided in the database and is different per action: the author
 * of a version and governance staff may write its requirements, record its technical
 * checks and classify what changed in it, while only governance staff may waive a
 * requirement. The waiver is checked here as well as there, because it is the one act
 * that lets a course publish without a review somebody asked for, and a route that
 * knows that should say so rather than wait for a refusal to come back.
 */

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function statusFor(outcome: { ok: boolean; code?: string }): number {
  if (outcome.ok) return 200;
  return outcome.code === 'forbidden' ? 403 : 422;
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

  const versionId = typeof body.courseVersionId === 'string' && UUID.test(body.courseVersionId)
    ? body.courseVersionId
    : null;

  if (body.action === 'waive') {
    const [{ data: governance }, { data: platform }] = await Promise.all([
      supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
      supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    ]);
    if (governance !== true && platform !== true) {
      return fail('Only a governance admin or platform admin may waive a review requirement.', 403);
    }
    if (typeof body.requirementId !== 'string' || !UUID.test(body.requirementId)) {
      return fail('A valid requirement id is required.', 400);
    }
    const outcome = await waiveReviewRequirement(supabase, {
      requirementId: body.requirementId,
      reason: body.reason,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (!versionId) return fail('A valid course version id is required.', 400);

  if (body.action === 'require') {
    const outcome = await requireReview(supabase, {
      courseVersionId: versionId,
      subjectAreaId: body.subjectAreaId,
      scope: body.scope,
      count: body.count,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'recount') {
    const outcome = await recountRequirements(supabase, versionId);
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'check') {
    const outcome = await recordTechnicalCheck(supabase, {
      courseVersionId: versionId,
      checkType: body.checkType,
      passed: body.passed,
      evidence: body.evidence,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'assess') {
    const outcome = await assessContentChange(supabase, {
      courseVersionId: versionId,
      changeClass: body.changeClass,
      riskLevel: body.riskLevel,
      requiresReReview: body.requiresReReview,
      rationale: body.rationale,
      fromVersionId: body.fromVersionId,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  return fail('Unsupported requirement action.', 400);
}
