import { ArabicBlock, ArabicInline } from '@/app/_shared/arabic-text';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { languageName } from '@/lib/i18n/language-name';
import { fetchInstructorProfile } from '@/lib/instructor-profiles';
import { one, type Embedded } from '@/lib/embed';

export const dynamic = 'force-dynamic';

/**
 * A teacher's public page.
 *
 * **In the reader's language** since 2026-11-27 (`messages/teacher-page.ts`):
 * the seven things the page itself says. The name, the headline, the
 * biography and each course's title and description are the teacher's own
 * words and are shown as written, each in its own direction.
 *
 * Courses that could not be read are said to be unread. Until then a failed
 * read threw, and a visitor was shown the page that says the site broke
 * where only the list under the teacher was missing.
 */
export default async function PublicTeacherPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
  const supabase = await createClient();
  if (!await isFlagEnabled(supabase, 'teaching.public_profile')) notFound();
  const profile = await fetchInstructorProfile(supabase, slug);
  if (!profile) notFound();

  const { data, error } = await supabase.from('course_versions')
    .select('id,version_number,language,courses!inner(id,slug,title,description)')
    .eq('version_status', 'published')
    .eq('courses.created_by', profile.userId)
    .eq('courses.status', 'active')
    .is('courses.deleted_at', null)
    .is('courses.suspended_at', null)
    .order('published_at', { ascending: false });
  const unread = Boolean(error);
  if (error) console.error(`teacher page: the courses could not be read: ${error.message}`);
  const courses = ((data ?? []) as unknown as {
    id: string; version_number: number; language: string;
    // One course per version: PostgREST sends an object.
    courses: Embedded<{ id: string; slug: string; title: string; description: string | null }>;
  }[]).flatMap((version) => {
    const course = one(version.courses);
    return course ? [{ ...course, versionId: version.id, language: version.language }] : [];
  });

  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'tpub');
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const [byBefore = '', byAfter = ''] = t('tpub.coursesBy').split('{name}');

  const socials = [
    [t('tpub.website'), profile.websiteUrl], ['Instagram', profile.instagramUrl],
    ['YouTube', profile.youtubeUrl], ['TikTok', profile.tiktokUrl], ['Facebook', profile.facebookUrl],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">{t('tpub.eyebrow')}</p>
      <header className="card">
        <ArabicBlock as="h1" style={{ marginTop: 0 }} text={profile.displayName} />
        {profile.headline && <ArabicBlock className="lede" text={profile.headline} />}
        {profile.biography && (
          <ArabicBlock as="div" style={{ whiteSpace: 'pre-wrap' }} text={profile.biography} />
        )}
        {socials.length > 0 && (
          <nav aria-label={t('tpub.links')} className="row" style={{ flexWrap: 'wrap', marginTop: '1rem' }}>
            {socials.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer" className="chip">{name}</a>)}
          </nav>
        )}
      </header>

      <section className="section">
        <h2>
          {byBefore}<bdi><ArabicInline text={profile.displayName} /></bdi>{byAfter}
        </h2>
        {unread ? (
          <div className="notice error" role="alert" data-teacher-courses="unread">{t('tpub.unread')}</div>
        ) : courses.length === 0 ? (
          <p className="empty">{t('tpub.none')}</p>
        ) : (
          <div className="grid cols-2">
            {courses.map((course) => (
              <article className="card" key={course.versionId}>
                <p className="eyebrow">{languageName(shown.code, course.language)}</p>
                <h3 dir="auto"><Link href={`/courses/${course.slug}`}>{course.title}</Link></h3>
                {course.description && <p className="muted" dir="auto">{course.description}</p>}
                <Link href={`/courses/${course.slug}`} className="btn secondary">{t('tpub.view')}</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
