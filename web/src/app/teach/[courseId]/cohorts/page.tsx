import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchCohortMemberCounts, fetchCourseCohorts } from '@/lib/cohorts';
import { CohortManager, type CohortVersionOption } from './cohort-manager';

export const dynamic = 'force-dynamic';

export default async function TeachCohortsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/teach/${courseId}/cohorts`);

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id,title,slug,created_by')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle();
  if (courseError) throw new Error(courseError.message);
  const row = course as unknown as { id: string; title: string; slug: string; created_by: string } | null;
  if (!row || row.created_by !== user.id) notFound();

  const [versionResult, cohorts, enabled] = await Promise.all([
    supabase.from('course_versions')
      .select('id,version_number,version_status')
      .eq('course_id', courseId)
      .order('version_number', { ascending: false }),
    fetchCourseCohorts(supabase, { courseId }),
    isFlagEnabled(supabase, 'learning.cohorts').catch(() => false),
  ]);
  if (versionResult.error) throw new Error(versionResult.error.message);
  const versions = ((versionResult.data ?? []) as unknown as {
    id: string; version_number: number; version_status: string;
  }[]).map((v): CohortVersionOption => ({
    id: v.id, versionNumber: v.version_number, status: v.version_status,
  }));
  const counts = await fetchCohortMemberCounts(supabase, cohorts.map((c) => c.id));

  return (
    <div className="container section">
      <p className="eyebrow"><Link href={`/teach/${courseId}`}>Teaching · {row.title}</Link></p>
      <h1>Cohorts</h1>
      <p className="lede">
        A dated class takes one published course version together. The roster is
        private; this page shows counts, not learner names.
      </p>
      <CohortManager
        enabled={enabled}
        courseId={courseId}
        versions={versions}
        cohorts={cohorts}
        counts={counts}
      />
      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/courses/${row.slug}`}>View course page</Link>{' · '}
        <Link href={`/teach/${courseId}`}>Back to curriculum</Link>
      </p>
    </div>
  );
}
