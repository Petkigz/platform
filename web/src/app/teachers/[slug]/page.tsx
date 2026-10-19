import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchInstructorProfile } from '@/lib/instructor-profiles';

export const dynamic = 'force-dynamic';

export default async function PublicTeacherPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
  const supabase = await createClient();
  if (!await isFlagEnabled(supabase, 'teaching.public_profile')) notFound();
  const profile = await fetchInstructorProfile(supabase, slug);
  if (!profile) notFound();

  const { data, error } = await supabase.from('course_versions')
    .select('id,version_number,language_code,courses!inner(id,slug,title,description)')
    .eq('version_status', 'published')
    .eq('courses.created_by', profile.userId)
    .eq('courses.status', 'active')
    .is('courses.deleted_at', null)
    .is('courses.suspended_at', null)
    .order('published_at', { ascending: false });
  if (error) throw new Error(error.message);
  const courses = ((data ?? []) as unknown as {
    id: string; version_number: number; language_code: string;
    courses: { id: string; slug: string; title: string; description: string | null }[] | null;
  }[]).flatMap((version) => {
    const course = version.courses?.[0];
    return course ? [{ ...course, versionId: version.id, language: version.language_code }] : [];
  });

  const socials = [
    ['Website', profile.websiteUrl], ['Instagram', profile.instagramUrl],
    ['YouTube', profile.youtubeUrl], ['TikTok', profile.tiktokUrl], ['Facebook', profile.facebookUrl],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <div className="container section">
      <p className="eyebrow">AyahSpring teacher</p>
      <header className="card">
        <h1 style={{ marginTop: 0 }}>{profile.displayName}</h1>
        {profile.headline && <p className="lede">{profile.headline}</p>}
        {profile.biography && <p style={{ whiteSpace: 'pre-wrap' }}>{profile.biography}</p>}
        {socials.length > 0 && (
          <nav aria-label="Teacher links" className="row" style={{ flexWrap: 'wrap', marginTop: '1rem' }}>
            {socials.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer" className="chip">{name}</a>)}
          </nav>
        )}
      </header>

      <section className="section">
        <h2>Courses by {profile.displayName}</h2>
        {courses.length === 0 ? (
          <p className="empty">No published courses yet.</p>
        ) : (
          <div className="grid cols-2">
            {courses.map((course) => (
              <article className="card" key={course.versionId}>
                <p className="eyebrow">{course.language}</p>
                <h3><Link href={`/courses/${course.slug}`}>{course.title}</Link></h3>
                {course.description && <p className="muted">{course.description}</p>}
                <Link href={`/courses/${course.slug}`} className="btn secondary">View course</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
