import type { SupabaseClient } from '@supabase/supabase-js';

import type { SubjectRow } from '@/lib/subjects';

/**
 * Every subject, with how much of the catalogue is filed under it.
 *
 * Two reads rather than a query per row: the subjects, and every tag joined to
 * the version it belongs to. The counts the screen needs — "is this used at all"
 * and "is it used by something a reader can see" — come from the same small
 * table, and asking the database for both per row would be 37 round trips to
 * draw one list.
 *
 * A failed read is an empty list rather than an exception: this screen is opened
 * to fix the vocabulary, and a page that throws teaches the reader nothing about
 * how to fix it.
 */
export async function fetchSubjects(supabase: SupabaseClient): Promise<SubjectRow[]> {
  const [subjects, tags] = await Promise.all([
    supabase
      .from('subject_areas')
      .select('id, code, name, parent_subject_id, status, deleted_at')
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('course_version_subjects')
      .select('subject_area_id, course_versions!inner(version_status)'),
  ]);

  if (subjects.error || !subjects.data) return [];

  type Version = { version_status: string };
  type TagRow = { subject_area_id: string; course_versions: Version | Version[] };

  const uses = new Map<string, number>();
  const live = new Map<string, number>();

  for (const tag of (tags.data ?? []) as unknown as TagRow[]) {
    const version = Array.isArray(tag.course_versions) ? tag.course_versions[0] : tag.course_versions;
    const status = version?.version_status ?? '';

    uses.set(tag.subject_area_id, (uses.get(tag.subject_area_id) ?? 0) + 1);
    if (status === 'draft' || status === 'submitted' || status === 'approved' || status === 'published') {
      live.set(tag.subject_area_id, (live.get(tag.subject_area_id) ?? 0) + 1);
    }
  }

  return subjects.data.map((row) => ({
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    parentId: (row.parent_subject_id as string | null) ?? null,
    status: row.status === 'retired' ? 'retired' : 'active',
    uses: uses.get(row.id as string) ?? 0,
    liveUses: live.get(row.id as string) ?? 0,
  }));
}
