import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { recordLessonProgress, type LessonStatus } from '@/lib/progress';

const STATUSES: LessonStatus[] = ['not_started', 'in_progress', 'completed', 'skipped'];

/**
 * Record progress on one lesson.
 *
 * The learner is whoever is signed in — the body cannot name one. The
 * enrolment is looked up and checked, and the lesson is verified against the
 * enrolment's pinned version by a database trigger, so a stale page or a
 * hand-built request cannot write progress into the wrong course.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Malformed request.' },
      { status: 400 },
    );
  }

  const b = body as {
    enrolmentId?: unknown;
    lessonId?: unknown;
    status?: unknown;
    videoPosition?: unknown;
  };

  const uuid = /^[0-9a-f-]{36}$/i;
  if (typeof b.enrolmentId !== 'string' || !uuid.test(b.enrolmentId)) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'An enrolment id is required.' },
      { status: 400 },
    );
  }
  if (typeof b.lessonId !== 'string' || !uuid.test(b.lessonId)) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'A lesson id is required.' },
      { status: 400 },
    );
  }
  if (typeof b.status !== 'string' || !STATUSES.includes(b.status as LessonStatus)) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'An unknown status was sent.' },
      { status: 400 },
    );
  }

  const videoPosition =
    typeof b.videoPosition === 'number' && Number.isFinite(b.videoPosition)
      ? b.videoPosition
      : undefined;

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

  const outcome = await recordLessonProgress(supabase, {
    userId: user.id,
    enrolmentId: b.enrolmentId,
    lessonId: b.lessonId,
    status: b.status as LessonStatus,
    videoPosition,
  });

  if (!outcome.ok) {
    return NextResponse.json(outcome, { status: outcome.code === 'rejected' ? 500 : 409 });
  }

  return NextResponse.json(outcome, { status: 200 });
}
