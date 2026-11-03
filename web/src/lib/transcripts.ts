import type { SupabaseClient } from '@supabase/supabase-js';

/** RLS controls which transcripts the current session may read. */
export async function fetchTranscripts(
  supabase: SupabaseClient,
  lessonIds: readonly string[],
): Promise<Record<string, string>> {
  if (lessonIds.length === 0) return {};
  const { data, error } = await supabase.from('lesson_transcripts')
    .select('lesson_id, body').in('lesson_id', [...new Set(lessonIds)]);
  if (error) throw new Error(error.message);
  const result: Record<string, string> = {};
  for (const row of (data ?? []) as { lesson_id: string; body: string }[]) {
    result[row.lesson_id] = row.body;
  }
  return result;
}
