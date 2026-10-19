import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';

export const dynamic = 'force-dynamic';

type PreviewResource = {
  id: string;
  resource_type: string;
  display_name: string;
  external_url: string | null;
};

/** Public sample content is deliberately separate from the enrolled lesson
 * reader. It only fetches resources classified as public_preview; RLS remains
 * the final access gate, including for signed-in visitors. */
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

  return (
    <main className="container section" style={{ maxWidth: 820 }}>
      <p className="eyebrow"><Link href={`/courses/${course.slug}`}>{course.title}</Link> · Free preview</p>
      <h1>{lesson.title}</h1>
      <p className="muted">A sample from version {currentVersion.version_number}.</p>

      {resources.length === 0 ? (
        <div className="notice">This lesson has been marked as a preview, but no public sample content has been added yet.</div>
      ) : (
        <section className="card" aria-label="Preview content">
          <h2 style={{ marginTop: 0 }}>Preview content</h2>
          <ul className="lesson-list">
            {resources.map((resource) => (
              <li key={resource.id}>
                <span className="badge neutral">{resource.resource_type}</span>
                {resource.external_url ? (
                  <a href={resource.external_url} target="_blank" rel="noopener noreferrer">
                    {resource.display_name}
                  </a>
                ) : (
                  <span>{resource.display_name}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/courses/${course.slug}`}>Back to course</Link>
      </p>
    </main>
  );
}
