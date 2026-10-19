import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  assignmentDeadline,
  fetchAssignmentFileReferences,
  fetchAssignmentRevisions,
  fetchAssignmentSubmission,
  fetchCourseAssignment,
} from '@/lib/course-assignments';
import { AssignmentWork } from './assignment-work';

export const dynamic = 'force-dynamic';

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ enrolmentId: string; assignmentId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');
  const { enrolmentId, assignmentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/learn/${enrolmentId}/assignment/${assignmentId}`);

  const { data, error } = await supabase
    .from('course_enrolments')
    .select('id,course_id,course_version_id,learner_profile_id,enrolled_at,courses(title)')
    .eq('id', enrolmentId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const enrolment = data as unknown as {
    id: string;
    course_id: string;
    course_version_id: string;
    learner_profile_id: string;
    enrolled_at: string;
    courses: { title: string }[] | null;
  } | null;
  if (!enrolment) notFound();

  const assignment = await fetchCourseAssignment(supabase, assignmentId);
  // RLS decides whether this actor may read the task; these checks bind the
  // supplied URL to the exact enrolment/version rather than trusting a second
  // client-supplied learner id.
  if (
    !assignment ||
    assignment.courseId !== enrolment.course_id ||
    assignment.courseVersionId !== enrolment.course_version_id
  ) notFound();

  const submission = await fetchAssignmentSubmission(supabase, {
    assignmentId,
    learnerProfileId: enrolment.learner_profile_id,
  });
  if (assignment.cohortId && !submission) {
    const { data: membership, error: membershipError } = await supabase
      .from('cohort_members')
      .select('id')
      .eq('cohort_id', assignment.cohortId)
      .eq('learner_profile_id', enrolment.learner_profile_id)
      .eq('status', 'active')
      .maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    if (!membership) notFound();
  }
  const files = submission
    ? await fetchAssignmentFileReferences(supabase, [submission.id])
    : [];
  // Marked versions the learner has already handed in. RLS keeps this to their
  // own submission, so it is safe to fetch without a second permission check.
  const history = submission
    ? await fetchAssignmentRevisions(supabase, [submission.id])
    : [];
  const deadline = assignmentDeadline(assignment, enrolment.enrolled_at);
  const courseTitle = enrolment.courses?.[0]?.title ?? 'Course';

  return (
    <div className="container section" style={{ display: 'grid', gap: '1rem' }}>
      <p className="eyebrow">
        <Link href={`/learn/${enrolment.id}`}>My learning · {courseTitle}</Link>
      </p>
      <h1>{assignment.title}</h1>
      {assignment.instructions && <p className="lede" style={{ whiteSpace: 'pre-wrap' }}>{assignment.instructions}</p>}
      <div className="badges">
        <span className="badge">{assignment.cohortId ? 'Cohort work' : 'Self-paced'}</span>
        {assignment.pointsPossible !== null && <span className="badge neutral">{assignment.pointsPossible} points</span>}
        {assignment.acceptLate && <span className="badge neutral">Late work accepted</span>}
      </div>
      <AssignmentWork
        assignmentId={assignment.id}
        learnerProfileId={enrolment.learner_profile_id}
        assignmentStatus={assignment.status}
        pointsPossible={assignment.pointsPossible}
        acceptLate={assignment.acceptLate}
        deadline={deadline?.toISOString() ?? null}
        initialSubmission={submission}
        fileCount={files.length}
        revisionsAllowed={assignment.revisionsAllowed}
        revisionLimit={assignment.revisionLimit}
        history={history}
      />
      <p><Link href={`/learn/${enrolment.id}`}>Back to {courseTitle}</Link></p>
    </div>
  );
}
