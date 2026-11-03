import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { draftLocalQuiz, MAX_SOURCE_LENGTH } from '@/lib/local-quiz';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Drafts only. Nothing is persisted or published; the model runs on loopback. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'The platform is not configured.' }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!await isFlagEnabled(supabase, 'learning.ai_quiz_gen').catch(() => false)) {
    return NextResponse.json({ error: 'Quiz drafting is not switched on.' }, { status: 403 });
  }
  // Limit the actual request before parsing, even if Content-Length is missing.
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > 40_000) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
  let payload: unknown;
  try {
    const body = await request.text();
    if (body.length > 40_000) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!payload || typeof payload !== 'object' || !('courseId' in payload) || !('source' in payload) ||
      typeof payload.courseId !== 'string' || typeof payload.source !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.courseId) ||
      payload.source.length > MAX_SOURCE_LENGTH) {
    return NextResponse.json({ error: 'Choose your course and provide teaching material.' }, { status: 400 });
  }
  const { data: course, error } = await supabase.from('courses').select('created_by')
    .eq('id', payload.courseId).is('deleted_at', null).maybeSingle();
  if (error || !course || course.created_by !== user.id) {
    return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
  }
  const result = await draftLocalQuiz(payload.source);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 503 });
  return NextResponse.json({ questions: result.questions }, { headers: { 'cache-control': 'private, no-store' } });
}
