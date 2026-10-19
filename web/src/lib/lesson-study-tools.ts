import type { SupabaseClient } from '@supabase/supabase-js';

export const MAX_LESSON_NOTE_LENGTH = 4000;

export function validateLessonNote(value: unknown): { ok: true; body: string } | { ok: false; message: string } {
  if (typeof value !== 'string') return { ok: false, message: 'Write a note before saving.' };
  const body = value.trim();
  if (!body) return { ok: false, message: 'Write a note before saving.' };
  if (body.length > MAX_LESSON_NOTE_LENGTH) {
    return { ok: false, message: `Keep notes under ${MAX_LESSON_NOTE_LENGTH} characters.` };
  }
  return { ok: true, body };
}

export type LessonStudyTools = { note: string; bookmarked: boolean };

/** Read the current user's private study tools; RLS scopes both rows. */
export async function fetchLessonStudyTools(
  supabase: SupabaseClient,
  args: { userId: string; enrolmentId: string; lessonId: string },
): Promise<LessonStudyTools> {
  const [noteResult, bookmarkResult] = await Promise.all([
    supabase
      .from('lesson_notes')
      .select('body')
      .eq('user_id', args.userId)
      .eq('course_enrolment_id', args.enrolmentId)
      .eq('lesson_id', args.lessonId)
      .maybeSingle(),
    supabase
      .from('lesson_bookmarks')
      .select('id')
      .eq('user_id', args.userId)
      .eq('course_enrolment_id', args.enrolmentId)
      .eq('lesson_id', args.lessonId)
      .maybeSingle(),
  ]);

  if (noteResult.error) throw new Error(noteResult.error.message);
  if (bookmarkResult.error) throw new Error(bookmarkResult.error.message);
  return {
    note: (noteResult.data as { body: string } | null)?.body ?? '',
    bookmarked: Boolean(bookmarkResult.data),
  };
}
