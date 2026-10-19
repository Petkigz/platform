import type { SupabaseClient } from '@supabase/supabase-js';

export type PathAudience = 'child' | 'adult' | 'both';
export type LearningPathActionResult = { ok: true; id: string } | { ok: false; message: string };

export function validatePath(title: string, slug: string, audience: string): LearningPathActionResult {
  if (!title.trim() || title.trim().length > 200)
    return { ok: false, message: 'A learning path needs a title under 200 characters.' };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.trim()))
    return { ok: false, message: 'Use a lowercase hyphenated slug.' };
  if (!['child', 'adult', 'both'].includes(audience))
    return { ok: false, message: 'Choose child, adult or both.' };
  return { ok: true, id: '' };
}

function explain(error: { message: string }): string {
  const m = error.message;
  if (/only the path author/i.test(m)) return 'Only the path author can make this change.';
  if (/active, published course/i.test(m)) return 'Only an active, published course can be added.';
  if (/at least one course/i.test(m)) return 'Add at least one course before publishing.';
  if (/no longer active and published/i.test(m)) return 'One or more courses are no longer active and published.';
  if (/draft path/i.test(m)) return 'Make changes on a draft path; active paths are read-only.';
  if (/unique|duplicate/i.test(m)) return 'That slug or course is already in use.';
  if (/written retirement reason/i.test(m)) return 'Give a written reason for retirement.';
  return m;
}

export async function createLearningPath(
  supabase: SupabaseClient,
  input: { title: string; slug: string; audience: PathAudience; description?: string },
): Promise<LearningPathActionResult> {
  const valid = validatePath(input.title, input.slug, input.audience);
  if (!valid.ok) return valid;
  const { data, error } = await supabase.rpc('create_learning_path', {
    p_title: input.title.trim(),
    p_slug: input.slug.trim(),
    p_audience: input.audience,
    p_description: input.description?.trim() || null,
  });
  if (error) return { ok: false, message: explain(error) };
  return { ok: true, id: data === null ? '' : String(data) };
}

export async function addLearningPathItem(
  supabase: SupabaseClient,
  input: { pathId: string; courseId: string; required: boolean },
): Promise<LearningPathActionResult> {
  if (!input.pathId || !input.courseId) return { ok: false, message: 'Choose a path and course.' };
  const { data, error } = await supabase.rpc('add_learning_path_item', {
    p_learning_path_id: input.pathId,
    p_course_id: input.courseId,
    p_required: input.required,
  });
  if (error) return { ok: false, message: explain(error) };
  return { ok: true, id: data === null ? '' : String(data) };
}

export async function removeLearningPathItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<LearningPathActionResult> {
  if (!itemId) return { ok: false, message: 'Choose a course item first.' };
  const { data, error } = await supabase.rpc('remove_learning_path_item', { p_item_id: itemId });
  if (error) return { ok: false, message: explain(error) };
  return { ok: true, id: data === null ? '' : String(data) };
}

export async function activateLearningPath(
  supabase: SupabaseClient,
  pathId: string,
): Promise<LearningPathActionResult> {
  if (!pathId) return { ok: false, message: 'Choose a learning path first.' };
  const { data, error } = await supabase.rpc('activate_learning_path', { p_learning_path_id: pathId });
  if (error) return { ok: false, message: explain(error) };
  return { ok: true, id: String(data) };
}

export async function retireLearningPath(
  supabase: SupabaseClient,
  pathId: string,
  reason: string,
): Promise<LearningPathActionResult> {
  if (!pathId) return { ok: false, message: 'Choose a learning path first.' };
  if (!reason.trim()) return { ok: false, message: 'Give a written reason for retirement.' };
  const { data, error } = await supabase.rpc('retire_learning_path', {
    p_learning_path_id: pathId,
    p_reason: reason.trim(),
  });
  if (error) return { ok: false, message: explain(error) };
  return { ok: true, id: String(data) };
}
