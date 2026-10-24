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
import { PAGE_SIZE } from './paging.ts';

export type CatalogueCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  audience: 'child' | 'adult' | 'both';
  /** Empty means every band the audience allows. */
  age_bands: string[] | null;
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
  'id, slug, title, description, audience, age_bands, difficulty, ' +
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
  /** One age band, for the children's door. Absent means every age. */
  band?: string;
};

/**
 * Courses for the public catalogue — one page of them, with the true total.
 *
 * Everything is decided by `catalogue_page()`: which courses are on the shelf,
 * what a match is, what order they come in, and how many there are altogether.
 * This function's job is the boundary — send the filters, read the ranked ids
 * back defensively, then fetch the rows through the same select the rest of the
 * catalogue uses so a card cannot render differently because it arrived by a
 * different route.
 *
 * **Why the rows are fetched after the ids rather than returned by the
 * function.** The function answers "which courses, in what order"; the rows
 * carry nested versions, subjects and languages that PostgREST already knows
 * how to shape. Keeping the row shape in one place (COURSE_COLUMNS) is worth
 * one extra round trip on a page of twenty-four.
 */
export async function fetchCataloguePage(
  supabase: SupabaseClient,
  filters: CatalogueFilters,
  { limit = PAGE_SIZE, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<CataloguePageResult> {
  const q = filters.q?.trim() ?? '';

  const { data, error } = await supabase.rpc('catalogue_page', {
    p_query: q.length > 0 ? q : null,
    p_subject: filters.subject && filters.subject !== 'all' ? filters.subject : null,
    p_audience: filters.audience && filters.audience !== 'all' ? filters.audience : null,
    p_band: filters.band ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);

  const page = parseCataloguePage(data);
  if (page.hits.length === 0) {
    return { courses: [], total: page.total, shown: 0, offset: page.offset, limit: page.limit };
  }

  const { data: rows, error: readError } = await supabase
    .from('courses')
    .select(COURSE_COLUMNS)
    .in('id', page.hits.map((hit) => hit.courseId));
  if (readError) throw new Error(readError.message);

  return {
    courses: orderByIds(
      (rows ?? []) as unknown as CatalogueCourse[],
      page.hits.map((hit) => hit.courseId),
    ),
    total: page.total,
    shown: page.shown,
    offset: page.offset,
    limit: page.limit,
  };
}

/**
 * The courses on one page, without the envelope.
 *
 * Kept for the callers that only want the list, so the paging arithmetic lives
 * in exactly one place.
 */
export async function fetchCatalogue(
  supabase: SupabaseClient,
  filters: CatalogueFilters,
  limit = PAGE_SIZE,
): Promise<CatalogueCourse[]> {
  const page = await fetchCataloguePage(supabase, filters, { limit, offset: 0 });
  return page.courses;
}

export type CataloguePageResult = {
  courses: CatalogueCourse[];
  /** Everything on the shelf that matches — not the size of this page. */
  total: number;
  /** How many rows this page actually carries. */
  shown: number;
  offset: number;
  limit: number;
};

export type ParsedPage = {
  total: number;
  shown: number;
  offset: number;
  limit: number;
  hits: CatalogueHit[];
};

/**
 * Read the envelope.
 *
 * The client is untyped, so this is the boundary: counts that are not numbers
 * become zero, and `shown` is taken from the hits that survived parsing rather
 * than trusted from the payload — a page that says it carries twenty-four rows
 * and delivers twenty must describe what it delivered, or the range label lies
 * about which courses the reader is looking at.
 */
export function parseCataloguePage(value: unknown): ParsedPage {
  const raw = (value ?? {}) as Record<string, unknown>;
  const hits = parseSearchHits(raw.ordered);

  const count = (input: unknown, fallback: number): number =>
    typeof input === 'number' && Number.isFinite(input) && input >= 0
      ? Math.floor(input)
      : fallback;

  return {
    total: count(raw.total, hits.length),
    shown: hits.length,
    offset: count(raw.offset, 0),
    limit: count(raw.limit, hits.length),
    hits,
  };
}

export type CatalogueHit = { courseId: string; score: number };

/**
 * Read the search function's reply.
 *
 * The client is untyped, so this is the boundary: anything that is not
 * `{course_id, score}` is discarded rather than rendered, and a repeated id is
 * dropped — a course shown twice because it matched twice is still a defect.
 */
export function parseSearchHits(data: unknown): CatalogueHit[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const hits: CatalogueHit[] = [];

  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    // The ranked array comes from `catalogue_page()`'s envelope, which is
    // camelCase JSON; `search_catalogue()` still answers in its table's
    // snake_case. One parser, both spellings, because a second parser for the
    // same idea is where the two start to disagree.
    const raw = record.courseId ?? record.course_id;
    const courseId = typeof raw === 'string' ? raw : '';
    if (courseId.length === 0 || seen.has(courseId)) continue;
    seen.add(courseId);
    const score =
      typeof record.score === 'number' && Number.isFinite(record.score)
        ? record.score
        : 0;
    hits.push({ courseId, score });
  }

  return hits;
}

/** Put rows back in the order they were ranked. */
export function orderByIds<T extends { id: string }>(
  rows: T[],
  ids: string[],
): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

/**
 * Ranked ids for a query.
 *
 * Now a thin wrapper: `catalogue_page()` decides what matches and in what
 * order, for browsing and searching alike. It remains because "give me the
 * ranking, not a page of it" is a different question from "give me a page", and
 * because a caller reconciling search with a listing should be able to ask both
 * without re-implementing either.
 */
export async function searchCatalogue(
  supabase: SupabaseClient,
  filters: CatalogueFilters,
  limit = 60,
): Promise<CatalogueCourse[]> {
  const page = await fetchCataloguePage(
    supabase,
    { ...filters, band: filters.band },
    { limit, offset: 0 },
  );
  return page.courses;
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
