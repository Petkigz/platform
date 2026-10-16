import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { enrolInFreeCourse } from '@/lib/enrolment';

/**
 * Free enrolment.
 *
 * POST only, and it takes a course id and nothing else. In particular it does
 * not take a learner id, a price or a source: the learner is whoever is signed
 * in, the price is whatever the database says, and the source is always
 * 'free'. Every one of those would have been a way to lie.
 *
 * Paid courses are refused here rather than routed to a provider, because no
 * provider exists yet (P11). The refusal is a normal response, not an error —
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
  });

  if (!outcome.ok) {
    // 402 for payment_required is deliberate: it is the honest status, and it
    // lets the UI distinguish "go and pay" from "this is broken".
    const status = outcome.code === 'payment_required' ? 402 : 409;
    return NextResponse.json(outcome, { status });
  }

  return NextResponse.json(outcome, { status: 201 });
}
