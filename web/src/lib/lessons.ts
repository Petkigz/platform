/**
 * Lessons and their resources.
 *
 * The rule this file is built around: **being signed in is not access.** A
 * lesson's resources are gated by entitlement, not by session, so this never
 * asks "is there a user?" and always lets the database answer. A learner who
 * has not bought the course gets only resources classified `public_preview`
 * on a preview lesson, and only while `learning.previews` is enabled. The
 * database keeps that sample separate from enrolled-only content, even though
 * the preview lesson itself has a free-entitlement bypass.
 *
 * `media_asset_id` is returned but not resolved to a playable URL here. D8
 * keeps masters in our own storage with Stream for delivery only, and signing
 * a delivery URL is a server-side act with its own credentials. Inventing one
 * client-side would put the storage keys somewhere they do not belong.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type ResourceType =
  | 'video'
  | 'audio'
  | 'document'
  | 'worksheet'
  | 'link'
  | 'quiz'
  | 'other';

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  worksheet: 'Worksheet',
  link: 'Link',
  quiz: 'Quiz',
  other: 'Resource',
};

export type AccessClassification =
  | 'public_preview'
  | 'enrolled'
  | 'guardian'
  | 'restricted';

export type LessonResource = {
  id: string;
  resourceType: ResourceType;
  displayName: string;
  position: number;
  externalUrl: string | null;
  mediaAssetId: string | null;
  accessClassification: AccessClassification;
};

/**
 * Identify direct, browser-playable HTTPS media URLs. Signed first-party media
 * assets are deliberately not treated as external URLs; their delivery remains
 * gated by the server-side asset signer.
 */
export function nativeMediaKind(
  resource: Pick<LessonResource, 'resourceType' | 'externalUrl'>,
): 'video' | 'audio' | null {
  if (!resource.externalUrl || (resource.resourceType !== 'video' && resource.resourceType !== 'audio')) return null;
  let url: URL;
  try { url = new URL(resource.externalUrl); }
  catch { return null; }
  if (url.protocol !== 'https:') return null;
  const path = url.pathname.toLowerCase();
  if (resource.resourceType === 'video' && /\.(mp4|webm|ogv)$/.test(path)) return 'video';
  if (resource.resourceType === 'audio' && /\.(mp3|m4a|aac|ogg|oga|wav|flac)$/.test(path)) return 'audio';
  return null;
}

export type Lesson = {
  id: string;
  title: string;
  description: string | null;
  type: 'video' | 'text' | 'audio' | 'interactive' | 'live';
  position: number;
  durationSeconds: number | null;
  isPreview: boolean;
  sectionId: string;
  sectionTitle: string;
  courseVersionId: string;
  resources: LessonResource[];
};

type LessonRow = {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  type: string;
  position: number;
  duration_seconds: number | null;
  is_preview: boolean;
  course_sections: {
    title: string;
    course_version_id: string;
  }[] | null;
};

type ResourceRow = {
  id: string;
  lesson_id: string;
  resource_type: string;
  display_name: string;
  position: number;
  external_url: string | null;
  media_asset_id: string | null;
  access_classification: string;
};

/**
 * One lesson, with whatever resources the caller is allowed to see.
 *
 * The lesson row itself is readable by anyone who can read the version — that
 * is what lets a course outline be shown before purchase. The resources are
 * the thing that is gated. So this can legitimately return a lesson with an
 * empty resource list, and the caller has to treat that as "not entitled"
 * rather than as an error.
 */
export async function fetchLesson(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from('lessons')
    .select(
      'id, section_id, title, description, type, position, duration_seconds, is_preview, course_sections ( title, course_version_id )',
    )
    .eq('id', lessonId)
    .single();

  if (error || !data) return null;

  const row = data as unknown as LessonRow;
  const section = row.course_sections?.[0];

  // No error handling that swallows the distinction: a failed resource query
  // is different from an empty one, and only the second means "you may not
  // see these".
  const { data: resources, error: rErr } = await supabase
    .from('lesson_resources')
    .select(
      'id, lesson_id, resource_type, display_name, position, external_url, media_asset_id, access_classification',
    )
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true });

  if (rErr) throw new Error(rErr.message);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as Lesson['type'],
    position: row.position,
    durationSeconds: row.duration_seconds,
    isPreview: row.is_preview,
    sectionId: row.section_id,
    sectionTitle: section?.title ?? '',
    courseVersionId: section?.course_version_id ?? '',
    resources: ((resources ?? []) as unknown as ResourceRow[]).map((r) => ({
      id: r.id,
      resourceType: r.resource_type as ResourceType,
      displayName: r.display_name,
      position: r.position,
      externalUrl: r.external_url,
      mediaAssetId: r.media_asset_id,
      accessClassification: r.access_classification as AccessClassification,
    })),
  };
}

/**
 * Whether the caller may access this lesson at all.
 *
 * Asked explicitly rather than inferred from the resource list, because the
 * two can disagree legitimately: a lesson with no resources attached yet is
 * still accessible, and a lesson the caller is not entitled to may still show
 * its public preview.
 */
export async function canAccessLesson(
  supabase: SupabaseClient,
  learnerProfileId: string,
  lessonId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_access_lesson', {
    p_learner_id: learnerProfileId,
    p_lesson_id: lessonId,
  });

  if (error) return false;
  return data === true;
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m} min` : `${m} min ${s}s`;
}
