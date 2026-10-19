import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { removeReview, writeReview } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

type Body = {
  action?: unknown;
  courseId?: unknown;
  rating?: unknown;
  body?: unknown;
  reviewId?: unknown;
};

/**
 * POST /api/reviews — write (or rewrite) your own review, or remove it.
 *
 * Whether the review is published or held is not decided here. The database
 * holds text until a person approves it and counts a bare rating immediately,
 * and this route reports that outcome rather than predicting it.
 *
 * The flag is checked first only so the caller gets a sentence instead of a
 * check-violation error; the same check is inside the function, which is the
 * one that matters, because the RPC is reachable without this route.
 */
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
    return NextResponse.json({ error: 'Sign in to review a course.' }, { status: 401 });
  }

  if (payload.action === 'remove') {
    const reviewId = typeof payload.reviewId === 'string' ? payload.reviewId : '';
    const result = await removeReview(supabase, reviewId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  }

  if (payload.action === 'write') {
    const open = await isFlagEnabled(supabase, 'learning.reviews').catch(() => false);
    if (!open) {
      return NextResponse.json(
        { error: 'Reviews are not open on this platform yet.', code: 'flag_disabled' },
        { status: 409 },
      );
    }

    const courseId = typeof payload.courseId === 'string' ? payload.courseId : '';
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required.' }, { status: 400 });
    }

    const result = await writeReview(supabase, {
      courseId,
      rating: payload.rating,
      body: payload.body,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(
      { ok: true, id: result.value.id, held: result.value.held },
      { status: 201 },
    );
  }

  return NextResponse.json({ error: 'Choose write or remove.' }, { status: 400 });
}
