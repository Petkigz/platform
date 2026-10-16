/**
 * Catalogue queries.
 *
 * One module so the landing page and the catalogue cannot drift into two
 * different ideas of what "visible in the catalogue" means.
 *
 * The filter on `version_status = 'published'` here is a *presentation*
 * filter, not a security one. Row level security already hides anything the
 * viewer is not allowed to read — this narrows to what belongs on a public
 * shelf. The distinction matters: if this line were deleted, RLS would still
 * protect unpublished content; if the RLS policy were deleted, this line
 * would not.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type CatalogueCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  audience: 'child' | 'adult' | 'both';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  course_versions: CatalogueVersion[] | null;
};

export type CatalogueVersion = {
  id: string;
  version_number: number;
  language: string;
  version_status: string;
  course_version_subjects:
    | { subject_areas: { code: string; name: string }[] | null }[]
    | null;
};

export type SubjectArea = {
  id: string;
  code: string;
  name: string;
  parent_subject_id: string | null;
};

const COURSE_COLUMNS =
  'id, slug, title, description, audience, difficulty, ' +
  'course_versions ( id, version_number, language, version_status, ' +
  'course_version_subjects ( subject_areas ( code, name ) ) )';

/** The published version a course should be presented by, or null. */
export function displayVersion(c: CatalogueCourse): CatalogueVersion | null {
  const published = (c.course_versions ?? []).filter(
    (v) => v.version_status === 'published',
  );
  if (published.length === 0) return null;
  return published.reduce((a, b) => (b.version_number > a.version_number ? b : a));
}

export function subjectNames(v: CatalogueVersion | null): string[] {
  if (!v) return [];
  const names = (v.course_version_subjects ?? [])
    .map((s) => s.subject_areas?.[0]?.name)
    .filter((n): n is string => Boolean(n));
  return [...new Set(names)];
}

export function languagesFor(c: CatalogueCourse): string[] {
  const ls = (c.course_versions ?? [])
    .filter((v) => v.version_status === 'published')
    .map((v) => v.language);
  return [...new Set(ls)];
}

export const AUDIENCE_LABEL: Record<string, string> = {
  child: 'Young learners',
  adult: 'Adults',
  both: 'All ages',
};

export const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export type CatalogueFilters = {
  q?: string;
  subject?: string;
  audience?: string;
};

/**
 * Courses for the public catalogue.
 *
 * No filter names the current user. What comes back is whatever the viewer's
 * own policies allow, which for an anonymous visitor is the published
 * catalogue and for a signed-in learner is the same plus nothing sensitive.
 */
export async function fetchCatalogue(
  supabase: SupabaseClient,
  { q, subject, audience }: CatalogueFilters,
  limit = 60,
): Promise<CatalogueCourse[]> {
  let query = supabase
    .from('courses')
    .select(COURSE_COLUMNS)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('title', { ascending: true })
    .limit(limit);

  if (audience && audience !== 'all') {
    query = query.in('audience', [audience, 'both']);
  }

  if (q && q.trim().length > 0) {
    // ilike rather than full-text search: no index dependency, and good
    // enough until there is a catalogue big enough to need ranking.
    const term = q.trim().replace(/[%_,]/g, ' ');
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  if (subject && subject !== 'all') {
    // Subject taxonomy hangs off the version, not the course, so filtering
    // server-side would need a join through two tables. Narrow here instead —
    // the catalogue is small and this keeps the query legible.
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    // The client is untyped (no generated Database schema yet), so PostgREST's
    // inferred row type is a placeholder. This cast is the boundary where that
    // gets asserted — it is the thing to revisit once `supabase gen types`
    // runs in CI.
    return ((data ?? []) as unknown as CatalogueCourse[]).filter((c) => {
      const v = displayVersion(c);
      return (
        v?.course_version_subjects?.some(
          (s) => s.subject_areas?.[0]?.code === subject,
        ) ?? false
      );
    });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CatalogueCourse[];
}

export async function fetchSubjectAreas(
  supabase: SupabaseClient,
): Promise<SubjectArea[]> {
  const { data, error } = await supabase
    .from('subject_areas')
    .select('id, code, name, parent_subject_id')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SubjectArea[];
}

/** Top-level disciplines only — the filter bar, not the whole tree. */
export function disciplines(subjects: SubjectArea[]): SubjectArea[] {
  return subjects.filter((s) => s.parent_subject_id === null);
}
