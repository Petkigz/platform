import type { SupabaseClient } from '@supabase/supabase-js';

export const SOURCE_TYPES = [
  'quran', 'hadith', 'tafsir', 'fiqh_reference', 'book', 'article',
  'lecture', 'fatwa', 'manuscript', 'other',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export type LessonSource = {
  id: string;
  sourceType: SourceType;
  title: string;
  authorOrCompiler: string | null;
  editionOrVersion: string | null;
  referenceLocator: string | null;
  url: string | null;
  anchor: string | null;
};

type SourceRow = {
  id: string;
  source_type: string;
  title: string;
  author_or_compiler: string | null;
  edition_or_version: string | null;
  reference_locator: string | null;
  url: string | null;
};

export async function fetchVersionSources(
  supabase: SupabaseClient,
  versionId: string,
): Promise<Record<string, LessonSource[]>> {
  const { data, error } = await supabase
    .from('content_source_links')
    .select('lesson_id,anchor,content_sources!inner(id,source_type,title,author_or_compiler,edition_or_version,reference_locator,url,course_version_id)')
    .eq('content_sources.course_version_id', versionId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const result: Record<string, LessonSource[]> = {};
  for (const link of ((data ?? []) as unknown as {
    lesson_id: string;
    anchor: string | null;
    content_sources: SourceRow | SourceRow[] | null;
  }[])) {
    const source = Array.isArray(link.content_sources)
      ? link.content_sources[0]
      : link.content_sources;
    if (!source) continue;
    (result[link.lesson_id] ??= []).push({
      id: source.id,
      sourceType: source.source_type as SourceType,
      title: source.title,
      authorOrCompiler: source.author_or_compiler,
      editionOrVersion: source.edition_or_version,
      referenceLocator: source.reference_locator,
      url: source.url,
      anchor: link.anchor,
    });
  }
  return result;
}

export async function fetchLessonSources(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<LessonSource[]> {
  const { data, error } = await supabase
    .from('content_source_links')
    .select('anchor, content_sources(id,source_type,title,author_or_compiler,edition_or_version,reference_locator,url)')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as {
    anchor: string | null;
    content_sources: SourceRow | SourceRow[] | null;
  }[]).flatMap((link) => {
    const source = Array.isArray(link.content_sources)
      ? link.content_sources[0]
      : link.content_sources;
    if (!source) return [];
    return [{
      id: source.id,
      sourceType: source.source_type as SourceType,
      title: source.title,
      authorOrCompiler: source.author_or_compiler,
      editionOrVersion: source.edition_or_version,
      referenceLocator: source.reference_locator,
      url: source.url,
      anchor: link.anchor,
    }];
  });
}

export type SourceInput = {
  courseVersionId: string;
  lessonId: string;
  sourceType: SourceType;
  title: string;
  authorOrCompiler?: string;
  editionOrVersion?: string;
  referenceLocator?: string;
  url?: string;
  anchor?: string;
  notes?: string;
};

export type SourceResult = { ok: true; id: string } | { ok: false; message: string };

export async function removeLessonSource(
  supabase: SupabaseClient,
  sourceId: string,
): Promise<SourceResult> {
  if (!sourceId) return { ok: false, message: 'Choose a source first.' };
  const { data, error } = await supabase.rpc('remove_content_source', { p_source_id: sourceId });
  if (error) {
    const message = error.message;
    if (/only the course author/i.test(message))
      return { ok: false, message: 'Only the course author can remove sources.' };
    if (/locked with its course version/i.test(message))
      return { ok: false, message: 'This version is locked. Create a draft version to change its sources.' };
    return { ok: false, message };
  }
  return { ok: true, id: data === null ? '' : String(data) };
}

export async function addLessonSource(
  supabase: SupabaseClient,
  input: SourceInput,
): Promise<SourceResult> {
  if (!input.courseVersionId || !input.lessonId)
    return { ok: false, message: 'Choose the course version and lesson.' };
  if (!input.title.trim()) return { ok: false, message: 'A source needs a title.' };
  if (!SOURCE_TYPES.includes(input.sourceType))
    return { ok: false, message: 'Choose a supported source type.' };
  if (input.url?.trim()) {
    try {
      const url = new URL(input.url.trim());
      if (url.protocol !== 'https:') throw new Error('https');
    } catch {
      return { ok: false, message: 'Source links must use a valid HTTPS URL.' };
    }
  }

  const { data, error } = await supabase.rpc('add_content_source_for_lesson', {
    p_course_version_id: input.courseVersionId,
    p_lesson_id: input.lessonId,
    p_source_type: input.sourceType,
    p_title: input.title.trim(),
    p_author_or_compiler: input.authorOrCompiler?.trim() || null,
    p_edition_or_version: input.editionOrVersion?.trim() || null,
    p_reference_locator: input.referenceLocator?.trim() || null,
    p_url: input.url?.trim() || null,
    p_anchor: input.anchor?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });
  if (error) {
    const message = error.message;
    if (/only the course author/i.test(message))
      return { ok: false, message: 'Only the course author can add sources.' };
    if (/locked with its course version/i.test(message))
      return { ok: false, message: 'This version is locked. Create a draft version to add or correct sources.' };
    if (/lesson must belong/i.test(message))
      return { ok: false, message: 'Choose a lesson from this course version.' };
    return { ok: false, message };
  }
  return { ok: true, id: String(data) };
}
