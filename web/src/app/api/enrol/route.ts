import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { enrolInFreeCourse } from '@/lib/enrolment';

/**
 * Free enrolment.
 *
 * POST only. It takes a course id and, optionally, the learner profile the
 * enrolment is for. It still never takes a price or a source: the price is
 * whatever the database says and the source is always 'free', because either
 * one accepted from the client would have been a way to lie.
 *
 * The learner id is a change, and it is worth being precise about why it is
 * safe. A child is a `learner_profile` under a `family`, never a `user` (D2), so
 * a child cannot sign in and cannot enrol themselves — and before this, the
 * application always enrolled whoever was signed in, which meant no child could
 * ever be enrolled through the product at all. The database already permitted a
 * parent to do it: `course_enrolments_insert` is gated on
 * `can_access_learner(learner_profile_id)`, which covers family members.
 *
 * So the id is accepted and the decision is left where it already lives. This
 * route does not re-implement `can_access_learner` or guardian consent; the
 * database policy and enrolment trigger remain authoritative. An id for a
 * learner the caller may not act for, or an unverified child when the consent
 * flag is enabled, is refused below the application layer.
 *
 * Paid courses are refused here rather than routed to a provider, because no
 * provider exists yet (P12). The refusal is a normal response, not an error —
 * the UI has to explain it.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'not_available', message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'not_available', message: 'Malformed request.' },
      { status: 400 },
    );
  }

  const courseId = (body as { courseId?: unknown })?.courseId;
  if (typeof courseId !== 'string' || !/^[0-9a-f-]{36}$/i.test(courseId)) {
    return NextResponse.json(
      { ok: false, code: 'not_available', message: 'A course id is required.' },
      { status: 400 },
    );
  }

  const rawLearnerId = (body as { learnerProfileId?: unknown })?.learnerProfileId;
  const learnerProfileId =
    typeof rawLearnerId === 'string' && /^[0-9a-f-]{36}$/i.test(rawLearnerId)
      ? rawLearnerId
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'not_signed_in', message: 'Sign in first.' },
      { status: 401 },
    );
  }

  const outcome = await enrolInFreeCourse(supabase, {
    userId: user.id,
    courseId,
    learnerProfileId,
  });

  if (!outcome.ok) {
    // 402 for payment_required is deliberate: it is the honest status, and it
    // lets the UI distinguish "go and pay" from "this is broken".
    const status = outcome.code === 'payment_required' ? 402 : 409;
    return NextResponse.json(outcome, { status });
  }

  return NextResponse.json(outcome, { status: 201 });
}
