/**
 * Course authoring — the teacher's side of the platform.
 *
 * Three rules from the schema shape everything here:
 *
 * 1. `set_course_version_status()` is the **only** way a version changes
 *    state. Nothing writes `version_status` directly, and the transition
 *    table decides who may do what: the author may submit, a reviewer may
 *    approve, a platform admin may publish. An author cannot approve or
 *    publish their own course.
 *
 * 2. **D5 freezes the whole version subtree on publication** — sections,
 *    lessons and assessments included. A published version is not editable;
 *    you make a new version. The lock is a trigger, so no amount of client
 *    care is required and none would help.
 *
 * 3. A version with no lessons **cannot be published**. That check is in
 *    `set_course_version_status()`, which is why the UI offers "submit for
 *    review" only once there is content.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type VersionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'published'
  | 'retired'
  | 'rejected';

export const VERSION_STATUS_LABEL: Record<VersionStatus, string> = {
  draft: 'Draft',
  submitted: 'In review',
  approved: 'Approved',
  published: 'Published',
  retired: 'Retired',
  rejected: 'Rejected',
};

export type AuthoredLesson = {
  id: string;
  title: string;
  position: number;
  isPreview: boolean;
  /**
   * The two columns a lesson page prints and the editor never needed.
   *
   * They are here because the rehearsal does need them: a preview built without
   * a description warns every lesson about a missing one, which is a screen
   * telling an author to fix forty things that are already right.
   */
  description: string | null;
  durationSeconds: number | null;
  resources: AuthoredResource[];
};

export type AuthoredSection = {
  id: string;
  title: string;
  position: number;
  lessons: AuthoredLesson[];
};

export type AuthoredVersion = {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  sections: AuthoredSection[];
  lessonCount: number;
};

export type AuthoredCourse = {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'active' | 'retired';
  hasPublishedVersion: boolean;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

/**
 * Courses the caller created. `courses_read` also admits enrolled and
 * published ones, so the `created_by` filter is what makes this "mine".
 *
 * `hasPublishedVersion` is derived rather than read: `courses` has no such
 * column, and a denormalised copy of it would be exactly the sort of thing
 * that drifts out of step with the versions underneath.
 */
export async function fetchMyCourses(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuthoredCourse[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, slug, title, status')
    .eq('created_by', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as CourseRow[];

  const published = new Set<string>();
  if (rows.length > 0) {
    const { data: versions, error: vErr } = await supabase
      .from('course_versions')
      .select('course_id')
      .in('course_id', rows.map((r) => r.id))
      .eq('version_status', 'published');

    if (vErr) throw new Error(vErr.message);
    for (const v of ((versions ?? []) as unknown as { course_id: string }[])) {
      published.add(v.course_id);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: r.status as AuthoredCourse['status'],
    hasPublishedVersion: published.has(r.id),
  }));
}

export async function fetchVersions(
  supabase: SupabaseClient,
  courseId: string,
): Promise<AuthoredVersion[]> {
  const { data, error } = await supabase
    .from('course_versions')
    .select('id, version_number, version_status')
    .eq('course_id', courseId)
    .order('version_number', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = { id: string; version_number: number; version_status: string };
  const rows = (data ?? []) as unknown as Row[];

  const sections = await Promise.all(
    rows.map(async (v) => ({
      id: v.id,
      versionNumber: v.version_number,
      status: v.version_status as VersionStatus,
      sections: await fetchSections(supabase, v.id),
    })),
  );

  return sections.map((v) => ({
    ...v,
    lessonCount: v.sections.reduce((n, s) => n + s.lessons.length, 0),
  }));
}

/**
 * One version, with its sections and lessons.
 *
 * `fetchVersions()` asks for every version of a course, which is what the editor
 * wants and what a preview does not: the preview knows which version it is
 * showing, and reading the other four to display one is work nobody asked for.
 */
export async function fetchVersion(
  supabase: SupabaseClient,
  versionId: string,
): Promise<AuthoredVersion | null> {
  const { data, error } = await supabase
    .from('course_versions')
    .select('id, version_number, version_status')
    .eq('id', versionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as { id: string; version_number: number; version_status: string };
  const sections = await fetchSections(supabase, row.id);

  return {
    id: row.id,
    versionNumber: row.version_number,
    status: row.version_status as VersionStatus,
    sections,
    lessonCount: sections.reduce((n, section) => n + section.lessons.length, 0),
  };
}

export async function fetchSections(
  supabase: SupabaseClient,
  versionId: string,
): Promise<AuthoredSection[]> {
  const { data, error } = await supabase
    .from('course_sections')
    .select('id, title, position')
    .eq('course_version_id', versionId)
    .order('position', { ascending: true });

  if (error) throw new Error(error.message);

  type Row = { id: string; title: string; position: number };
  const rows = (data ?? []) as unknown as Row[];

  // Lessons for every section in one query, bucketed here rather than one
  // round trip per section — a course outline is exactly the shape where an
  // N+1 shows up.
  const { data: lessons, error: lErr } = await supabase
    .from('lessons')
    .select('id, section_id, title, position, is_preview, description, duration_seconds')
    .in(
      'section_id',
      rows.map((r) => r.id),
    )
    .order('position', { ascending: true });

  if (lErr) throw new Error(lErr.message);

  type LessonRow = {
    id: string;
    section_id: string;
    title: string;
    position: number;
    is_preview: boolean;
    description: string | null;
    duration_seconds: number | null;
  };
  const lessonRows = (lessons ?? []) as unknown as LessonRow[];

  // What each lesson actually contains. Batched for the whole version, for the
  // same reason lessons are: this is the N+1 shape. Without it the editor would
  // have to ask per lesson, and the whole point of showing it is that a lesson
  // with nothing attached is an empty page.
  const { data: resources, error: rErr } = await supabase
    .from('lesson_resources')
    .select('id, lesson_id, display_name, resource_type, external_url, media_asset_id, access_classification, position')
    .in(
      'lesson_id',
      lessonRows.map((l) => l.id),
    )
    .order('position', { ascending: true });

  if (rErr) throw new Error(rErr.message);

  type ResourceRow = {
    id: string;
    lesson_id: string;
    display_name: string;
    resource_type: string;
    external_url: string | null;
    media_asset_id: string | null;
    access_classification: ResourceAccess;
    position: number;
  };
  const resourceRows = (resources ?? []) as unknown as ResourceRow[];

  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    position: s.position,
    lessons: lessonRows
      .filter((l) => l.section_id === s.id)
      .map((l) => ({
        id: l.id,
        title: l.title,
        position: l.position,
        isPreview: l.is_preview,
        description: l.description,
        durationSeconds: l.duration_seconds,
        resources: resourceRows
          .filter((r) => r.lesson_id === l.id)
          .map((r) => ({
            id: r.id,
            resourceName: r.display_name,
            resourceType: r.resource_type as ResourceType,
            externalUrl: r.external_url,
            mediaAssetId: r.media_asset_id,
            access: r.access_classification,
            position: r.position,
          })),
      })),
  }));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type WriteOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; code: 'rejected' | 'duplicate' | 'locked'; message: string };

/** Classify a write error into something worth showing a person. */
function classify(error: { message: string }): WriteOutcome<never> {
  const m = error.message;
  if (/duplicate key|already exists/i.test(m)) {
    return { ok: false, code: 'duplicate', message: 'That name is already taken.' };
  }
  if (/cannot modify|locked|published/i.test(m)) {
    return {
      ok: false,
      code: 'locked',
      message: 'This version is published and can no longer be edited. Create a new version instead.',
    };
  }
  return { ok: false, code: 'rejected', message: m };
}

/** `slugify` because the slug is part of the public URL and is unique. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function createCourse(
  supabase: SupabaseClient,
  args: { title: string; userId: string },
): Promise<WriteOutcome<{ courseId: string; versionId: string }>> {
  const title = args.title.trim();
  if (title.length === 0) {
    return { ok: false, code: 'rejected', message: 'A title is required.' };
  }
  const slug = slugify(title);
  if (slug.length === 0) {
    return { ok: false, code: 'rejected', message: 'That title has no usable letters in it.' };
  }

  // The course and its first version are created together, because a course
  // with no version has nowhere to put content and nothing to publish.
  const { data: course, error: cErr } = await supabase
    .from('courses')
    .insert({ slug, title, created_by: args.userId })
    .select('id')
    .single();

  if (cErr) {
    if (/duplicate key/i.test(cErr.message)) {
      return {
        ok: false,
        code: 'duplicate',
        message: 'A course with that name already exists.',
      };
    }
    return classify(cErr);
  }

  const courseId = (course as unknown as { id: string }).id;

  const { data: version, error: vErr } = await supabase
    .from('course_versions')
    .insert({ course_id: courseId, version_number: 1, created_by: args.userId })
    .select('id')
    .single();

  if (vErr) return classify(vErr);

  return {
    ok: true,
    value: { courseId, versionId: (version as unknown as { id: string }).id },
  };
}

export type ReorderableContentType = 'section' | 'lesson' | 'resource';
export type MoveDirection = 'up' | 'down';

export async function moveCourseContent(
  client: SupabaseClient,
  args: { contentType: ReorderableContentType; contentId: string; direction: MoveDirection },
): Promise<WriteOutcome<{ position: number }>> {
  if (!args.contentId) {
    return { ok: false, code: 'rejected', message: 'Choose an item to reorder.' };
  }
  if (!['section', 'lesson', 'resource'].includes(args.contentType)) {
    return { ok: false, code: 'rejected', message: 'Choose a section, lesson or content item.' };
  }
  if (args.direction !== 'up' && args.direction !== 'down') {
    return { ok: false, code: 'rejected', message: 'Choose up or down.' };
  }
  const { data, error } = await client.rpc('move_course_content', {
    p_content_type: args.contentType,
    p_content_id: args.contentId,
    p_direction: args.direction,
  });
  if (error) {
    if (/already at the (start|end)/i.test(error.message)) {
      return { ok: false, code: 'rejected', message: 'That item is already at the edge of its list.' };
    }
    if (/only the course author/i.test(error.message)) {
      return { ok: false, code: 'rejected', message: 'Only the course author can reorder this content.' };
    }
    if (/only draft course content/i.test(error.message)) {
      return { ok: false, code: 'locked', message: 'Only draft content can be reordered.' };
    }
    return classify(error);
  }
  if (typeof data !== 'number') {
    return { ok: false, code: 'rejected', message: 'The new content position was not returned.' };
  }
  return { ok: true, value: { position: data } };
}

export async function createCourseVersionFrom(
  client: SupabaseClient,
  sourceVersionId: string,
): Promise<WriteOutcome<{ versionId: string; versionNumber: number }>> {
  if (!sourceVersionId) {
    return { ok: false, code: 'rejected', message: 'Choose a published version to copy.' };
  }
  const { data, error } = await client.rpc('create_course_version_from', {
    p_source_version_id: sourceVersionId,
  });
  if (error) {
    if (/only the course author/i.test(error.message)) {
      return { ok: false, code: 'rejected', message: 'Only the course author can start a new version.' };
    }
    if (/already has a draft or a version in review/i.test(error.message)) {
      return { ok: false, code: 'rejected', message: 'Finish or withdraw the current draft/review before starting another version.' };
    }
    return classify(error);
  }
  const row = (data as unknown as { version_id: string; version_number: number }[] | null)?.[0];
  if (!row) return { ok: false, code: 'rejected', message: 'The new version was not returned.' };
  return { ok: true, value: { versionId: row.version_id, versionNumber: Number(row.version_number) } };
}

export async function addSection(
  supabase: SupabaseClient,
  args: { versionId: string; title: string },
): Promise<WriteOutcome<{ sectionId: string }>> {
  const title = args.title.trim();
  if (title.length === 0) {
    return { ok: false, code: 'rejected', message: 'A section title is required.' };
  }

  // position is chosen rather than defaulted: the outline order is the
  // curriculum, and letting the database pick it would make reordering a
  // separate concern from creating.
  const { data: existing } = await supabase
    .from('course_sections')
    .select('position')
    .eq('course_version_id', args.versionId)
    .order('position', { ascending: false })
    .limit(1);

  const next = ((existing?.[0] as { position?: number } | undefined)?.position ?? 0) + 1;

  const { data, error } = await supabase
    .from('course_sections')
    .insert({ course_version_id: args.versionId, title, position: next })
    .select('id')
    .single();

  if (error) return classify(error);
  return { ok: true, value: { sectionId: (data as unknown as { id: string }).id } };
}

export async function addLesson(
  supabase: SupabaseClient,
  args: { sectionId: string; title: string; isPreview?: boolean },
): Promise<WriteOutcome<{ lessonId: string }>> {
  const title = args.title.trim();
  if (title.length === 0) {
    return { ok: false, code: 'rejected', message: 'A lesson title is required.' };
  }

  const { data: existing } = await supabase
    .from('lessons')
    .select('position')
    .eq('section_id', args.sectionId)
    .order('position', { ascending: false })
    .limit(1);

  const next = ((existing?.[0] as { position?: number } | undefined)?.position ?? 0) + 1;

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      section_id: args.sectionId,
      title,
      position: next,
      is_preview: args.isPreview === true,
    })
    .select('id')
    .single();

  if (error) return classify(error);
  return { ok: true, value: { lessonId: (data as unknown as { id: string }).id } };
}

/**
 * Import a whole outline into a draft, in one transaction.
 *
 * The parse happens before this is called (see `lib/csv-import.ts`) and the
 * database re-checks every title and every limit. That is not duplication for
 * its own sake: the browser is a place a request can be forged, so the rule that
 * matters — nothing is written unless the whole file is clean — has to hold
 * where the write happens.
 */
export async function importOutline(
  supabase: SupabaseClient,
  args: { versionId: string; sections: unknown },
): Promise<WriteOutcome<{ sections: number; lessons: number }>> {
  if (!args.versionId) {
    return { ok: false, code: 'rejected', message: 'That course version is missing.' };
  }

  const { data, error } = await supabase.rpc('import_course_outline', {
    p_version_id: args.versionId,
    p_sections: args.sections,
  });

  if (error) return classify(error);

  const row = data as unknown as { sections?: number; lessons?: number } | null;
  return {
    ok: true,
    value: { sections: Number(row?.sections ?? 0), lessons: Number(row?.lessons ?? 0) },
  };
}

export async function setLessonPreview(
  client: SupabaseClient,
  args: { lessonId: string; isPreview: boolean },
): Promise<WriteOutcome<{ changed: boolean }>> {
  if (!args.lessonId) {
    return { ok: false, code: 'rejected', message: 'That lesson is missing.' };
  }
  const { data, error } = await client.rpc('set_lesson_preview', {
    p_lesson_id: args.lessonId,
    p_is_preview: args.isPreview,
  });
  if (error) return classify(error);
  return { ok: true, value: { changed: data === true } };
}

export type Transition = 'submitted' | 'draft';

/**
 * Move a version between draft and submitted.
 *
 * Only these two are offered to an author. Approving and publishing belong to
 * a reviewer and an admin respectively, and the transition table refuses the
 * author regardless of what this function sends.
 */
export async function transitionVersion(
  supabase: SupabaseClient,
  args: { versionId: string; to: Transition; actorId: string },
): Promise<WriteOutcome<{ status: VersionStatus }>> {
  const { data, error } = await supabase.rpc('set_course_version_status', {
    p_version_id: args.versionId,
    p_new_status: args.to,
    p_actor_id: args.actorId,
    p_reason: args.to === 'submitted' ? 'Submitted for review' : 'Returned to draft',
  });

  if (error) {
    if (/no lessons/i.test(error.message)) {
      return {
        ok: false,
        code: 'rejected',
        message: 'A version needs at least one lesson before it can be submitted.',
      };
    }
    return classify(error);
  }

  return { ok: true, value: { status: (data as unknown as VersionStatus) ?? args.to } };
}

export type SubjectOption = {
  code: string;
  name: string;
  isTopLevel: boolean;
};

/**
 * The subject taxonomy, for the tagging control.
 *
 * Seeded, not user-created: the subjects are a fixed scholarly taxonomy, and
 * letting a teacher invent one would fragment the catalogue the filter depends
 * on.
 *
 * The parent column is `parent_subject_id`. It was asked for here as `parent_id`,
 * which does not exist, so this query could only ever come back
 * `column subject_areas.parent_id does not exist` — and since `/teach/[courseId]`
 * awaits it alongside the rest of the page's reads, the teacher's course page could
 * not render at all. A stub cannot catch that: it answers whatever columns are
 * asked for. The test beside this now asserts the select string against the real
 * column name.
 */
export async function fetchSubjects(
  supabase: SupabaseClient,
): Promise<SubjectOption[]> {
  const { data, error } = await supabase
    .from('subject_areas')
    .select('code, name, parent_subject_id')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);

  type Row = { code: string; name: string; parent_subject_id: string | null };

  return ((data ?? []) as unknown as Row[])
    .map((r) => ({ code: r.code, name: r.name, isTopLevel: r.parent_subject_id === null }));
}

/**
 * Set the subjects on a draft version.
 *
 * Replaces rather than merges, matching the database function: the caller sends
 * the whole list, so removing a mistagging is possible.
 *
 * Draft only. D5 freezes subject mapping at publication exactly as it does
 * sections and lessons, so this cannot be used to re-tag a live course — and
 * the UI must not offer it as though it could.
 */
export async function setSubjects(
  supabase: SupabaseClient,
  args: { versionId: string; codes: string[] },
): Promise<WriteOutcome<{ count: number }>> {
  if (args.codes.length === 0) {
    return {
      ok: false,
      code: 'rejected',
      message: 'Choose at least one subject, or the course can never be found.',
    };
  }

  const { data, error } = await supabase.rpc('set_version_subjects', {
    p_version_id: args.versionId,
    p_subject_codes: args.codes,
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('no such subject area')) {
      return { ok: false, code: 'rejected', message: error.message };
    }
    if (m.includes('only the author may tag')) {
      return { ok: false, code: 'rejected', message: 'Only the author can tag this course.' };
    }
    return classify(error);
  }

  return { ok: true, value: { count: Number(data) } };
}

/**
 * Say who a course is for — the audience and the age bands inside it.
 *
 * This lives on the **course**, not the version. D5 freezes a version and its
 * whole subtree on publication, but who a course is for is not part of what was
 * published: it is the fact that decides which door the course appears behind,
 * and it has to be fixable without cutting a new version because somebody
 * spotted the wrong band.
 *
 * The database is the authority on what is allowed. `set_course_audience()`
 * normalises the order, refuses a band the audience cannot claim, and audits
 * every real change with both sides, so this only forwards and reports.
 */
export type AudienceValue = 'child' | 'adult' | 'both';

export type AudienceWrite = {
  courseId: string;
  audience: AudienceValue;
  ageBands: string[];
  changed: boolean;
};

export async function setAudience(
  supabase: SupabaseClient,
  args: { courseId: string; audience: string; ageBands: string[] },
): Promise<WriteOutcome<AudienceWrite>> {
  if (!['child', 'adult', 'both'].includes(args.audience)) {
    return {
      ok: false,
      code: 'rejected',
      message: 'Choose young learners, adults, or both.',
    };
  }

  const { data, error } = await supabase.rpc('set_course_audience', {
    p_course_id: args.courseId,
    p_audience: args.audience,
    p_age_bands: args.ageBands,
  });

  if (error) {
    const m = error.message.toLowerCase();
    // The function's own refusals name the band that is wrong, so they are
    // passed through rather than replaced with something vaguer.
    if (
      m.includes('no such course') ||
      m.includes('may change who a course is for') ||
      m.includes('is not a band the') ||
      m.includes('an audience is child, adult or both') ||
      m.includes('sign in to say who a course is for')
    ) {
      return { ok: false, code: 'rejected', message: error.message };
    }
    return classify(error);
  }

  const row = data as unknown as AudienceWrite | null;
  if (!row) {
    return { ok: false, code: 'rejected', message: 'Nothing came back from the database.' };
  }
  return { ok: true, value: row };
}

/**
 * Say which language the course is taught in.
 *
 * A language sits on the course, not on the version, so this is not blocked by
 * a published version the way a curriculum write is — a teacher correcting the
 * language of a live course is fixing a label, not rewriting what learners
 * already study. The database checks who may say and which languages are
 * available; this function only turns its refusals into sentences.
 */
export async function setLanguage(
  supabase: SupabaseClient,
  args: { courseId: string; languageCode: string },
): Promise<WriteOutcome<{ languageCode: string; changed?: boolean }>> {
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(args.languageCode)) {
    return { ok: false, code: 'rejected', message: 'Choose a language from the list.' };
  }

  const { data, error } = await supabase.rpc('set_course_language', {
    p_course_id: args.courseId,
    p_language: args.languageCode,
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('language:not_available')) {
      return {
        ok: false,
        code: 'rejected',
        message: 'That language is not one a course may be filed under here.',
      };
    }
    if (m.includes('language:not_yours')) {
      return { ok: false, code: 'rejected', message: 'Only this course’s author may say.' };
    }
    if (m.includes('language:course_not_found')) {
      return { ok: false, code: 'rejected', message: 'That course no longer exists.' };
    }
    if (m.includes('language:not_signed_in')) {
      return { ok: false, code: 'rejected', message: 'Sign in again and try once more.' };
    }
    return classify(error);
  }

  return { ok: true, value: data as unknown as { languageCode: string; changed?: boolean } };
}

/** The course and its published audience, as the author's editor needs them. */
export async function fetchCourseAudience(
  supabase: SupabaseClient,
  courseId: string,
): Promise<{ audience: AudienceValue; ageBands: string[] } | null> {
  const { data } = await supabase
    .from('courses')
    .select('audience, age_bands')
    .eq('id', courseId)
    .maybeSingle();

  const row = data as unknown as { audience: AudienceValue; age_bands: string[] | null } | null;
  if (!row) return null;
  return { audience: row.audience, ageBands: row.age_bands ?? [] };
}

/** The subject codes currently on a version. */
export async function fetchVersionSubjects(
  supabase: SupabaseClient,
  versionId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('course_version_subjects')
    .select('subject_area_id, subject:subject_area_id(code)')
    .eq('course_version_id', versionId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as { subject: { code: string }[] | null }[])
    .map((r) => r.subject?.[0]?.code ?? '')
    .filter((c) => c.length > 0);
}

// ---------------------------------------------------------------------------
// Lesson content
//
// A lesson without a resource is an empty page. These exist so the curriculum
// editor can actually put something in front of a learner.
// ---------------------------------------------------------------------------

export const RESOURCE_TYPES = [
  'video',
  'audio',
  'document',
  'worksheet',
  'link',
  'quiz',
  'other',
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  video: 'Video',
  audio: 'Audio',
  document: 'Reading',
  worksheet: 'Worksheet',
  link: 'Link',
  quiz: 'Quiz',
  other: 'Other',
};

export type ResourceAccess = 'public_preview' | 'enrolled' | 'guardian' | 'restricted';
export type AddResourceAccess = Extract<ResourceAccess, 'enrolled' | 'public_preview'>;

export type AuthoredResource = {
  id: string;
  resourceName: string;
  resourceType: ResourceType;
  externalUrl: string | null;
  /**
   * The other permitted source of a resource: a file we host.
   *
   * Carried here because a resource with no address is not a resource with no
   * content — it is one whose delivery copies decide whether a learner can play
   * it, and a shape that dropped the id could only ever call it empty.
   */
  mediaAssetId: string | null;
  access: ResourceAccess;
  position: number;
};

/**
 * What is already attached to one lesson.
 *
 * This is the author's view of the same table the lesson page reads. Before the
 * writer existed this list was always empty for every lesson, because nothing
 * could ever add to it.
 */
export async function fetchLessonResources(
  client: SupabaseClient,
  lessonId: string,
): Promise<AuthoredResource[]> {
  const { data, error } = await client
    .from('lesson_resources')
    .select('id, display_name, resource_type, external_url, media_asset_id, access_classification, position')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: String(r.id),
    resourceName: String(r.display_name),
    resourceType: r.resource_type as ResourceType,
    externalUrl: r.external_url === null ? null : String(r.external_url),
    mediaAssetId: r.media_asset_id === null ? null : String(r.media_asset_id),
    access: r.access_classification as ResourceAccess,
    position: Number(r.position),
  }));
}

export type AddResourceInput = {
  lessonId: string;
  resourceType: ResourceType;
  url: string;
  name: string;
  access?: AddResourceAccess;
};

export type AddResourceResult =
  | { ok: true; resourceId: string }
  | { ok: false; message: string };

export function validateAddResource(input: AddResourceInput): AddResourceResult {
  const name = input.name.trim();
  const url = input.url.trim();

  if (!input.lessonId) return { ok: false, message: 'That lesson is missing.' };
  if (name.length === 0)
    return { ok: false, message: 'Give it a name learners will see.' };
  if (name.length > 200)
    return { ok: false, message: 'Keep the name under 200 characters.' };

  // The column CHECK is `^https://`. Catching it here means the teacher reads
  // "must be https" instead of a constraint name.
  if (url.length === 0) return { ok: false, message: 'Paste the URL for it.' };
  if (!url.startsWith('https://'))
    return { ok: false, message: 'Content has to be served over https.' };

  if (!RESOURCE_TYPES.includes(input.resourceType))
    return { ok: false, message: 'That is not a kind of content we support.' };
  if (input.access !== undefined && input.access !== 'enrolled' && input.access !== 'public_preview')
    return { ok: false, message: 'Choose enrolled access or public preview.' };

  return { ok: true, resourceId: '' };
}

/**
 * Attach content to a lesson.
 *
 * The database appends it, so the teacher never picks a position: the
 * (lesson_id, position) key is unique, and guessing a free slot would collide.
 */
export async function addLessonResource(
  client: SupabaseClient,
  input: AddResourceInput,
): Promise<AddResourceResult> {
  const check = validateAddResource(input);
  if (!check.ok) return check;

  const { data, error } = await client.rpc('add_lesson_resource', {
    p_lesson_id: input.lessonId,
    p_resource_type: input.resourceType,
    p_external_url: input.url.trim(),
    p_display_name: input.name.trim(),
    p_access: input.access ?? 'enrolled',
  });

  if (error) {
    const m = error.message;
    if (/only the author/i.test(m))
      return { ok: false, message: 'Only the author can change this lesson.' };
    if (/locked \(D5\)/i.test(m))
      return {
        ok: false,
        message:
          'That version is published and frozen. Create a new version to change it.',
      };
    if (/https/i.test(m))
      return { ok: false, message: 'Content has to be served over https.' };
    if (/needs a name/i.test(m))
      return { ok: false, message: 'Give it a name learners will see.' };
    if (/needs a URL/i.test(m))
      return { ok: false, message: 'Paste the URL for it.' };
    if (/unsupported resource type/i.test(m))
      return { ok: false, message: 'That is not a kind of content we support.' };
    if (/not found/i.test(m))
      return { ok: false, message: 'That lesson no longer exists.' };
    return { ok: false, message: m };
  }

  return { ok: true, resourceId: data === null ? '' : String(data) };
}
