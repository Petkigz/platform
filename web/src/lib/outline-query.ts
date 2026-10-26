import type { SupabaseClient } from '@supabase/supabase-js';

import { flattenOutline, type OutlineSectionRow, type OutlineStep } from './outline.ts';

/**
 * The ordered lesson list of one course version.
 *
 * One query: sections of the pinned version, with their lessons nested. The
 * ordering is `lib/outline.ts`'s job — combining two `position` columns is the
 * part with edge cases, and it is tested there — so this function only reads
 * and hands over.
 *
 * It is scoped by `course_version_id` rather than by course, because an
 * enrolment is pinned to a version and a learner must never be pointed at a
 * lesson in a version they cannot open. Row level security does the rest: a
 * learner sees their version's lessons, and a preview viewer sees only the
 * previews, which is why the caller only asks for this when the reader is
 * entitled to the whole course.
 *
 * A failure returns an empty outline rather than throwing. The next lesson is
 * a convenience on a page that already has everything else on it, and losing
 * the convenience is a better outcome than losing the lesson.
 */
export async function fetchOutline(
  supabase: SupabaseClient,
  courseVersionId: string,
): Promise<OutlineStep[]> {
  const { data, error } = await supabase
    .from('course_sections')
    .select('id, title, position, lessons ( id, title, position )')
    .eq('course_version_id', courseVersionId);

  if (error) return [];

  return flattenOutline((data ?? []) as unknown as OutlineSectionRow[]);
}
