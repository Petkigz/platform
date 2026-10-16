import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchVersions } from '@/lib/authoring';
import { Curriculum } from './curriculum';

export const dynamic = 'force-dynamic';

/**
 * One course's versions and their curricula.
 *
 * Versions are the unit of change here, not the course. A published version is
 * frozen (D5), so "edit this course" always means "edit its current draft" —
 * and when there is no draft, the honest answer is that there is nothing to
 * edit until a new version exists.
 */
export default async function TeachCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/sign-in?next=/teach/${courseId}`);

  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title, created_by')
    .eq('id', courseId)
    .is('deleted_at', null)
    .single();

  const row = course as unknown as { id: string; slug: string; title: string; created_by: string } | null;

  // `courses_read` admits any active course to any signed-in user, so this
  // checks authorship explicitly. Without it, /teach/<anyone's course> would
  // render the curriculum editor for a course you do not own.
  if (!row || row.created_by !== user.id) notFound();

  const versions = await fetchVersions(supabase, courseId);
  const draft = versions.find((v) => v.status === 'draft');
  const current = draft ?? versions[0];

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/teach">Teaching</Link>
      </p>
      <h1>{row.title}</h1>
      <p className="lede">
        {versions.length} version{versions.length === 1 ? '' : 's'} ·{' '}
        <span className="meta">/{row.slug}</span>
      </p>

      {versions.length === 0 ? (
        <div className="empty">
          This course has no version yet, so it has nowhere to hold content.
        </div>
      ) : !current ? (
        <div className="empty">Nothing to edit.</div>
      ) : (
        <>
          {!draft && (
            <div className="notice" style={{ marginBottom: '1rem' }}>
              There is no draft version. Creating one is how you make changes
              without touching what learners are already studying.
            </div>
          )}
          <Curriculum version={current} />
        </>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/courses/${row.slug}`}>View the public page</Link>
        {' · '}
        <Link href="/teach">Back to my courses</Link>
      </p>
    </div>
  );
}
