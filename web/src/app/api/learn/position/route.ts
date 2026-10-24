import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * POST /api/learn/position — remember where a learner stopped.
 *
 * The writer decides everything that matters: whose enrolment it is, whether the
 * lesson is in the version they are pinned to, and the bounds. This route adds
 * the session, because a player is a browser and the browser never holds the
 * credential the database is asked to trust.
 *
 * It answers with the position the database actually stored, so a player that
 * sent a negative or an absurd number finds out what was kept rather than
 * assuming its own value.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured on this deployment.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const enrolmentId = typeof input.enrolmentId === 'string' ? input.enrolmentId : '';
  const lessonId = typeof input.lessonId === 'string' ? input.lessonId : '';
  const seconds = typeof input.seconds === 'number' ? input.seconds : Number(input.seconds ?? NaN);

  if (!enrolmentId || !lessonId) {
    return NextResponse.json({ error: 'An enrolment and a lesson are both required.' }, { status: 400 });
  }
  if (!Number.isFinite(seconds)) {
    return NextResponse.json({ error: 'A position is a number of seconds.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to keep your place.' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('record_lesson_position', {
    p_enrolment_id: enrolmentId,
    p_lesson_id: lessonId,
    p_seconds: Math.floor(seconds),
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('not your learning')) {
      return NextResponse.json({ error: 'That is not your learning.' }, { status: 403 });
    }
    if (msg.includes('not in the version')) {
      return NextResponse.json({ error: 'That lesson is not in this course version.' }, { status: 409 });
    }
    if (msg.includes('no such enrolment')) {
      return NextResponse.json({ error: 'That enrolment does not exist.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const saved = (data ?? {}) as { seconds?: number; status?: string };
  return NextResponse.json({ ok: true, seconds: saved.seconds ?? 0, status: saved.status ?? null });
}
