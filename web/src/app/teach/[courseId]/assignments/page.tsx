import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import {
  fetchAssignmentFileReferences,
  fetchAssignmentRevisions,
  fetchAssignmentSubmissions,
  fetchCourseAssignments,
} from '@/lib/course-assignments';
import { AssignmentManager, type AssignmentCohortOption, type AssignmentVersionOption } from './assignment-manager';

export const dynamic = 'force-dynamic';

export default async function TeachAssignmentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/teach/${courseId}/assignments`);

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id,title,slug,created_by')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle();
  if (courseError) throw new Error(courseError.message);
  const courseRow = course as unknown as { id: string; title: string; slug: string; created_by: string } | null;
  if (!courseRow || courseRow.created_by !== user.id) notFound();

  const [versionResult, cohortResult, assignments, enabled, cohortsEnabled] = await Promise.all([
    supabase.from('course_versions')
      .select('id,version_number,version_status')
      .eq('course_id', courseId)
      .order('version_number', { ascending: false }),
    supabase.from('cohorts')
      .select('id,title,course_version_id,status,starts_at,ends_at')
      .eq('course_id', courseId)
      .is('deleted_at', null)
      .order('starts_at', { ascending: true }),
    fetchCourseAssignments(supabase, { courseId }),
    isFlagEnabled(supabase, 'learning.assignments').catch(() => false),
    isFlagEnabled(supabase, 'learning.cohorts').catch(() => false),
  ]);
  if (versionResult.error) throw new Error(versionResult.error.message);
  if (cohortResult.error) throw new Error(cohortResult.error.message);

  const versions = ((versionResult.data ?? []) as unknown as {
    id: string; version_number: number; version_status: string;
  }[]).map((v): AssignmentVersionOption => ({
    id: v.id, versionNumber: v.version_number, status: v.version_status,
  }));
  const cohorts = ((cohortResult.data ?? []) as unknown as {
    id: string; title: string; course_version_id: string; status: string;
    starts_at: string; ends_at: string | null;
  }[]).map((c): AssignmentCohortOption => ({
    id: c.id,
    title: c.title,
    courseVersionId: c.course_version_id,
    status: c.status,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
  }));

  const submissions = await fetchAssignmentSubmissions(supabase, assignments.map((a) => a.id));
  const [files, revisions] = await Promise.all([
    fetchAssignmentFileReferences(supabase, submissions.map((s) => s.id)),
    // Earlier versions of work already marked, so a teacher marking a revision
    // can see what they asked for and whether the learner answered it.
    fetchAssignmentRevisions(supabase, submissions.map((s) => s.id)),
  ]);
  const fileCounts = files.reduce<Record<string, number>>((counts, file) => {
    counts[file.submissionId] = (counts[file.submissionId] ?? 0) + 1;
    return counts;
  }, {});
  const revisionsBySubmission = revisions.reduce<Record<string, typeof revisions>>((groups, revision) => {
    const group = groups[revision.submissionId] ?? [];
    group.push(revision);
    groups[revision.submissionId] = group;
    return groups;
  }, {});

  return (
    <div className="container section">
      <p className="eyebrow"><Link href={`/teach/${courseId}`}>Teaching · {courseRow.title}</Link></p>
      <h1>Assignments</h1>
      <p className="lede">
        Work outside the quiz system. A task is pinned to one published version;
        the deadline is per-enrolment for self-paced learners or shared for a cohort.
      </p>
      <AssignmentManager
        enabled={enabled}
        cohortsEnabled={cohortsEnabled}
        versions={versions}
        cohorts={cohorts}
        assignments={assignments}
        submissions={submissions}
        fileCounts={fileCounts}
        revisions={revisionsBySubmission}
      />
      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/courses/${courseRow.slug}`}>View course page</Link>{' · '}
        <Link href={`/teach/${courseId}`}>Back to curriculum</Link>
      </p>
    </div>
  );
}
