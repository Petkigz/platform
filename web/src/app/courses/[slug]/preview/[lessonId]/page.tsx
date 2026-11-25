import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { coursePartsWords } from '@/lib/course-parts-words';
import { LOCALE_COOKIE, chooseLocale, languageShownFor } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type PreviewResource = {
  id: string;
  resource_type: string;
  display_name: string;
  external_url: string | null;
};

/** Public sample content is deliberately separate from the enrolled lesson
 * reader. It only fetches resources classified as public_preview; RLS remains
 * the final access gate, including for signed-in visitors.
 *
 * In the reader's language (`messages/course-parts.ts`); a language held for
 * review reads it in English, whole, under `lang="en"`. The course's title,
 * the lesson's title and the name of each piece of material are the author's
 * and are shown as written. The kind of a material is said in words
 * ("Worksheet"), not as the column's value. */
export default async function PublicLessonPreview({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const { slug, lessonId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();
  const supabase = await createClient();

  if (!(await isFlagEnabled(supabase, 'learning.previews').catch(() => false))) notFound();

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, slug, title, status, suspended_at, deleted_at')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  if (courseError) throw new Error(courseError.message);
  if (!course || course.status !== 'active' || course.suspended_at) notFound();

  const { data: versions, error: versionError } = await supabase
    .from('course_versions')
    .select('id, version_number')
    .eq('course_id', course.id)
    .eq('version_status', 'published')
    .order('version_number', { ascending: false });
  if (versionError) throw new Error(versionError.message);
  const currentVersion = versions?.[0];
  if (!currentVersion) notFound();

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, is_preview, section_id')
    .eq('id', lessonId)
    .eq('is_preview', true)
    .maybeSingle();
  if (lessonError) throw new Error(lessonError.message);
  if (!lesson) notFound();

  const { data: section, error: sectionError } = await supabase
    .from('course_sections')
    .select('course_version_id')
    .eq('id', lesson.section_id)
    .maybeSingle();
  if (sectionError) throw new Error(sectionError.message);
  if (!section || section.course_version_id !== currentVersion.id) notFound();

  const { data: rows, error: resourceError } = await supabase
    .from('lesson_resources')
    .select('id, resource_type, display_name, external_url')
    .eq('lesson_id', lesson.id)
    .eq('access_classification', 'public_preview')
    .order('position', { ascending: true });
  if (resourceError) throw new Error(resourceError.message);
  const resources = (rows ?? []) as unknown as PreviewResource[];

  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'cparts');
  const words = coursePartsWords(shown.code).preview;
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  return (
    <div className="container section" style={{ maxWidth: 820 }} {...frame}>
      <p className="eyebrow">
        <Link href={`/courses/${course.slug}`}><bdi>{course.title}</bdi></Link> · {words.free}
      </p>
      <h1 dir="auto">{lesson.title}</h1>
      <p className="muted">{words.sample(currentVersion.version_number)}</p>

      {resources.length === 0 ? (
        <div className="notice">{words.empty}</div>
      ) : (
        <section className="card" aria-label={words.content}>
          <h2 style={{ marginTop: 0 }}>{words.content}</h2>
          <ul className="lesson-list">
            {resources.map((resource) => (
              <li key={resource.id}>
                <span className="badge neutral">{words.kind(resource.resource_type)}</span>
                {resource.external_url ? (
                  <a href={resource.external_url} target="_blank" rel="noopener noreferrer">
                    <bdi>{resource.display_name}</bdi>
                  </a>
                ) : (
                  <bdi>{resource.display_name}</bdi>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/courses/${course.slug}`}>{words.back}</Link>
      </p>
    </div>
  );
}
