import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  declareReviewerConflict,
  recordReviewerQualification,
  registerAsReviewer,
} from '@/lib/review';
import {
  checkConflict,
  checkQualification,
  checkReviewerBio,
  registerRefusalOf,
  registerStatusOf,
  type RegisterFailure,
} from '@/lib/review-register';

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
 *
 * **A refusal travels by name** since 2026-11-27 (`code`), because `/review`
 * says it in the reader's language; the English `message` is still sent for
 * whoever reads the reply by hand. What was typed is checked here first, so
 * the database is not asked about something it would only refuse. And an
 * answer with no state (a gateway's page, a connection that went) is a 502
 * named `unsure`, not a refusal: nobody knows whether it was recorded, and a
 * declaration bars an assignment from the moment it exists.
 */

function fail(failure: RegisterFailure, message: string, status = registerStatusOf(failure.code)) {
  return NextResponse.json(
    { ok: false, code: failure.code, ...(failure.max === undefined ? {} : { max: failure.max }), message },
    { status },
  );
}

/** What a library call answered, as a reply. */
function refused(outcome: { message: string; state?: string | null }) {
  // No `state` at all is the library's own check: nothing was sent, so it is
  // a refusal. A `state` of null is the database's call answering without one.
  if (outcome.state === undefined) return fail({ ok: false, code: 'refused' }, outcome.message);
  const failure = registerRefusalOf(outcome);
  // A gateway's page is not sent on to the browser.
  return fail(failure, failure.code === 'unsure' ? 'The answer could not be read.' : outcome.message);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail({ ok: false, code: 'refused' }, 'Supabase is not configured.', 503);

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return fail({ ok: false, code: 'refused' }, 'Malformed request.', 400); }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail({ ok: false, code: 'signedOut' }, 'Sign in first.');

  if (body.action === 'register') {
    const checked = checkReviewerBio(body.bio);
    if (!checked.ok) return fail(checked, 'That biography was not accepted.');
    const outcome = await registerAsReviewer(supabase, { bio: checked.value });
    if (!outcome.ok) return refused(outcome);
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'qualification') {
    if (typeof body.reviewerProfileId !== 'string' || !UUID.test(body.reviewerProfileId)) {
      return fail({ ok: false, code: 'refused' }, 'A valid reviewer profile id is required.', 400);
    }
    const checked = checkQualification(body);
    if (!checked.ok) return fail(checked, 'That qualification was not accepted.');
    const outcome = await recordReviewerQualification(supabase, {
      reviewerProfileId: body.reviewerProfileId,
      ...checked.value,
    });
    if (!outcome.ok) return refused(outcome);
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  if (body.action === 'conflict') {
    const checked = checkConflict(body);
    if (!checked.ok) return fail(checked, 'That declaration was not accepted.');
    const outcome = await declareReviewerConflict(supabase, checked.value);
    if (!outcome.ok) return refused(outcome);
    return NextResponse.json({ ok: true, ...outcome.value });
  }

  return fail({ ok: false, code: 'refused' }, 'Unsupported register action.', 400);
}
