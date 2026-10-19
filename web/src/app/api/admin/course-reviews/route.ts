import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchReviewQueue, moderateReview } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

type Body = {
  reviewId?: unknown;
  state?: unknown;
  note?: unknown;
};

/**
 * GET  /api/admin/course-reviews — reviews waiting on a person.
 * POST /api/admin/course-reviews — publish one, or withdraw it with a reason.
 *
 * The privilege check here is for the interface; `moderate_course_review()`
 * re-checks it against the session, so calling the RPC directly gains nothing.
 *
 * Withdrawal is the only tool staff get. There is no edit: changing a learner's
 * words and leaving their name on them would make the review staff-authored
 * content presented as a learner's opinion.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to moderate reviews.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return NextResponse.json({ error: 'Only staff can moderate reviews.' }, { status: 403 });
  }

  const queue = await fetchReviewQueue(supabase);
  return NextResponse.json({ queue });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
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
    return NextResponse.json({ error: 'Sign in to moderate reviews.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return NextResponse.json({ error: 'Only staff can moderate reviews.' }, { status: 403 });
  }

  const state = payload.state;
  if (state !== 'visible' && state !== 'withdrawn') {
    return NextResponse.json(
      { error: 'A review is published or withdrawn.' },
      { status: 400 },
    );
  }

  const result = await moderateReview(supabase, {
    reviewId: typeof payload.reviewId === 'string' ? payload.reviewId : '',
    state,
    note: typeof payload.note === 'string' ? payload.note : '',
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
