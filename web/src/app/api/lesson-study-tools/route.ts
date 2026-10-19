import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { validateLessonNote } from '@/lib/lesson-study-tools';

export const dynamic = 'force-dynamic';

type Payload = {
  action?: unknown;
  enrolmentId?: unknown;
  lessonId?: unknown;
  body?: unknown;
  saved?: unknown;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to save notes and bookmarks.' }, { status: 401 });

  let payload: Payload;
  try {
    payload = await request.json() as Payload;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const enrolmentId = typeof payload.enrolmentId === 'string' ? payload.enrolmentId : '';
  const lessonId = typeof payload.lessonId === 'string' ? payload.lessonId : '';
  if (!enrolmentId || !lessonId) {
    return NextResponse.json({ error: 'An enrolment and lesson are required.' }, { status: 400 });
  }

  let enabled = false;
  try {
    enabled = await isFlagEnabled(supabase, 'learning.notes_bookmarks');
  } catch {
    return NextResponse.json({ error: 'Could not check feature availability.' }, { status: 503 });
  }
  if (!enabled) {
    return NextResponse.json({ error: 'Notes and bookmarks are not available yet.' }, { status: 409 });
  }

  // Resolve the learner from the session-visible enrolment. Never accept a
  // learner_profile_id or acting user id from the browser.
  const { data: enrolment, error: enrolmentError } = await supabase
    .from('course_enrolments')
    .select('id,learner_profile_id')
    .eq('id', enrolmentId)
    .is('deleted_at', null)
    .maybeSingle();
  if (enrolmentError) return NextResponse.json({ error: 'Could not verify this enrolment.' }, { status: 500 });
  if (!enrolment) return NextResponse.json({ error: 'Enrolment not found.' }, { status: 404 });

  if (payload.action === 'save_note') {
    const note = validateLessonNote(payload.body);
    if (!note.ok) return NextResponse.json({ error: note.message }, { status: 400 });
    const { error } = await supabase.from('lesson_notes').upsert({
      user_id: user.id,
      learner_profile_id: enrolment.learner_profile_id,
      course_enrolment_id: enrolmentId,
      lesson_id: lessonId,
      body: note.body,
    }, { onConflict: 'user_id,course_enrolment_id,lesson_id' });
    if (error) return NextResponse.json({ error: 'Could not save the note. Check that you still have access to this lesson.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (payload.action === 'clear_note') {
    const { error } = await supabase.from('lesson_notes').delete()
      .eq('user_id', user.id)
      .eq('course_enrolment_id', enrolmentId)
      .eq('lesson_id', lessonId);
    if (error) return NextResponse.json({ error: 'Could not remove the note.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (payload.action === 'set_bookmark') {
    if (typeof payload.saved !== 'boolean') {
      return NextResponse.json({ error: 'Choose whether to save this bookmark.' }, { status: 400 });
    }
    const query = supabase.from('lesson_bookmarks');
    const result = payload.saved
      ? await query.upsert({
          user_id: user.id,
          learner_profile_id: enrolment.learner_profile_id,
          course_enrolment_id: enrolmentId,
          lesson_id: lessonId,
        }, { onConflict: 'user_id,course_enrolment_id,lesson_id' })
      : await query.delete()
          .eq('user_id', user.id)
          .eq('course_enrolment_id', enrolmentId)
          .eq('lesson_id', lessonId);
    if (result.error) return NextResponse.json({ error: 'Could not update the bookmark. Check that you still have access to this lesson.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Choose a supported study tool action.' }, { status: 400 });
}
