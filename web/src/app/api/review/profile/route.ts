import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  declareReviewerConflict,
  recordReviewerQualification,
  registerAsReviewer,
} from '@/lib/review';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The reviewer's own end of the register: put yourself forward, say what you are
 * qualified for, and stand aside from something you cannot review impartially.
 *
 * Nothing here takes an actor. Each function reads the session, so a caller can
 * only ever speak for themselves — `register_as_reviewer` will not make anybody
 * else a reviewer, and `declare_reviewer_conflict` has no reviewer parameter at
 * all, because a declaration about somebody else is not a declaration.
 *
 * Staff-only decisions (verifying, authorising a subject, assessing a conflict) are
 * on `/api/admin/reviewers`, behind a narrower gate than `is_privileged`.
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

  if (body.action === 'register') {
    const outcome = await registerAsReviewer(supabase, {
      bio: typeof body.bio === 'string' ? body.bio : null,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'qualification') {
    if (typeof body.reviewerProfileId !== 'string' || !UUID.test(body.reviewerProfileId)) {
      return fail('A valid reviewer profile id is required.', 400);
    }
    const outcome = await recordReviewerQualification(supabase, {
      reviewerProfileId: body.reviewerProfileId,
      qualificationType: body.qualificationType,
      title: body.title,
      institution: body.institution,
      subjectAreaId: body.subjectAreaId,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'conflict') {
    const outcome = await declareReviewerConflict(supabase, {
      conflictType: body.conflictType,
      description: body.description,
      courseVersionId: body.courseVersionId,
    });
    if (!outcome.ok) return fail(outcome.message, statusFor(outcome));
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  return fail('Unsupported register action.', 400);
}
