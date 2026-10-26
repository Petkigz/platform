import type { SupabaseClient } from '@supabase/supabase-js';

import { LESSON_RESULT_LIMIT, type LessonHit } from '@/lib/lesson-search';

type Row = {
  lesson_id: string;
  lesson_title: string;
  section_title: string | null;
  course_id: string;
  course_slug: string;
  course_title: string;
  is_preview: boolean;
  snippet: string;
  matched_in: 'title' | 'description';
  rank: number;
};

/**
 * Lesson matches for a query, in the shape the screen renders.
 *
 * A failure is an empty list rather than an exception. This is a second list
 * under a shelf that already rendered; taking the whole catalogue page down
 * because the lesson search could not run would punish the reader for a feature
 * they did not ask for on that visit.
 *
 * Who may see what is decided in `search_lessons()` — titles for anyone who may
 * read the version, a lesson's introduction only for somebody who may study it.
 * Nothing here re-checks it, because a second authority is a second answer.
 */
export async function fetchLessonHits(
  supabase: SupabaseClient,
  query: string,
): Promise<LessonHit[]> {
  const term = query.trim();
  if (term === '') return [];

  const { data, error } = await supabase.rpc('search_lessons', {
    p_query: term,
    p_limit: LESSON_RESULT_LIMIT,
  });

  if (error || !data) return [];

  return (data as Row[]).map((row) => ({
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    sectionTitle: row.section_title,
    courseId: row.course_id,
    courseSlug: row.course_slug,
    courseTitle: row.course_title,
    isPreview: row.is_preview === true,
    snippet: row.snippet ?? '',
    matchedIn: row.matched_in === 'description' ? 'description' : 'title',
    rank: typeof row.rank === 'number' ? row.rank : 0,
  }));
}
