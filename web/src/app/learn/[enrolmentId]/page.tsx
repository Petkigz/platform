import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchCompletion, fetchProgress, fetchSummary } from '@/lib/progress';
import { fetchAssessmentsForVersion } from '@/lib/assessment';
import { isFlagEnabled } from '@/lib/flags';
import { MarkComplete } from './mark-complete';
import { CohortMemberships } from './cohort-memberships';
import type { CourseCohort } from '@/lib/cohorts';
import {
  assignmentDeadline,
  fetchAssignmentSubmissionsForLearner,
  fetchCourseAssignments,
  SUBMISSION_STATUS_LABEL,
} from '@/lib/course-assignments';

export const dynamic = 'force-dynamic';

type Section = {
  id: string;
  title: string;
  position: number;
  lessons: {
    id: string;
    title: string;
    position: number;
    is_preview: boolean;
  }[] | null;
};

type EnrolmentRow = {
  id: string;
  status: string;
  course_id: string;
  course_version_id: string;
  learner_profile_id: string;
  enrolled_at: string;
  courses: { title: string; slug: string }[] | null;
  course_versions: {
    version_number: number;
    language: string;
    course_sections: Section[] | null;
  }[] | null;
};

/**
 * The course view.
 *
 * Everything on this page is scoped to the enrolment's pinned version — the
 * join goes enrolment → version → sections → lessons, which is the same shape
 * the database uses. A learner who enrolled into v1 keeps seeing v1 even after
 * v2 is published (D5), and `enforce_progress_version_match` refuses progress
 * recorded against any other version.
 */
export default async function CourseViewPage({
  params,
}: {
  params: Promise<{ enrolmentId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { enrolmentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/learn/${enrolmentId}`);

  const { data, error } = await supabase
    .from('course_enrolments')
    .select(
      'id, status, course_id, course_version_id, learner_profile_id, enrolled_at, ' +
        'courses ( title, slug ), ' +
        'course_versions ( version_number, language, ' +
        'course_sections ( id, title, position, ' +
        'lessons ( id, title, position, is_preview ) ) )',
    )
    .eq('id', enrolmentId)
    .eq('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const enrolment = data as unknown as EnrolmentRow | null;

  // A missing enrolment and someone else's enrolment look identical here: RLS
  // returns nothing for both. That is the point, and it is why this is a
  // notFound rather than a permission error.
  if (!enrolment) notFound();

  const course = enrolment.courses?.[0];
  const version = enrolment.course_versions?.[0];

  const sections = (version?.course_sections ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  // Feature gates. Read through setting_bool(), which any role may call, so
  // this works for a learner as well as for staff.
  const [progressOn, assessmentsOn, previewsOn, progress, summary, completion, assessments, assignments] =
    await Promise.all([
      isFlagEnabled(supabase, 'learning.progress').catch(() => false),
      isFlagEnabled(supabase, 'learning.assessments').catch(() => false),
      isFlagEnabled(supabase, 'learning.previews').catch(() => false),
      fetchProgress(supabase, enrolment.id),
      fetchSummary(supabase, enrolment.id),
      fetchCompletion(supabase, enrolment.id).catch(() => null),
      fetchAssessmentsForVersion(supabase, enrolment.course_version_id).catch(() => []),
      fetchCourseAssignments(supabase, {
        courseId: enrolment.course_id,
        courseVersionId: enrolment.course_version_id,
      }),
    ]);
  const assignmentSubmissions = await fetchAssignmentSubmissionsForLearner(supabase, {
    assignmentIds: assignments.map((a) => a.id),
    learnerProfileId: enrolment.learner_profile_id,
  });
  const submissionByAssignment = new Map(assignmentSubmissions.map((s) => [s.assignmentId, s]));
  const cohortIds = assignments.flatMap((a) => a.cohortId ? [a.cohortId] : []);
  let activeCohortIds = new Set<string>();
  if (cohortIds.length > 0) {
    const { data: memberships, error: membershipError } = await supabase
      .from('cohort_members')
      .select('cohort_id')
      .in('cohort_id', cohortIds)
      .eq('learner_profile_id', enrolment.learner_profile_id)
      .eq('status', 'active');
    if (membershipError) throw new Error(membershipError.message);
    activeCohortIds = new Set(((memberships ?? []) as unknown as { cohort_id: string }[]).map((m) => m.cohort_id));
  }
  // The parent RLS policy may see more than one child's cohort data. Bind this
  // course page to the learner named by this enrolment, while retaining work
  // they already submitted if they later left the cohort.
  const visibleAssignments = assignments.filter((a) =>
    a.cohortId === null || activeCohortIds.has(a.cohortId) || submissionByAssignment.has(a.id),
  );

  const cohortsEnabled = await isFlagEnabled(supabase, 'learning.cohorts').catch(() => false);
  const { data: memberRows, error: memberRowsError } = await supabase
    .from('cohort_members')
    .select('cohort_id')
    .eq('learner_profile_id', enrolment.learner_profile_id)
    .eq('status', 'active');
  if (memberRowsError) throw new Error(memberRowsError.message);
  const memberCohortIds = ((memberRows ?? []) as unknown as { cohort_id: string }[]).map((m) => m.cohort_id);
  let learnerCohorts: CourseCohort[] = [];
  if (memberCohortIds.length > 0) {
    const { data: cohortRows, error: cohortRowsError } = await supabase
      .from('cohorts')
      .select('id,course_id,course_version_id,title,description,starts_at,ends_at,capacity,status,join_closes_at')
      .in('id', memberCohortIds)
      .eq('course_id', enrolment.course_id)
      .is('deleted_at', null);
    if (cohortRowsError) throw new Error(cohortRowsError.message);
    learnerCohorts = ((cohortRows ?? []) as unknown as {
      id: string; course_id: string; course_version_id: string; title: string;
      description: string | null; starts_at: string; ends_at: string | null;
      capacity: number | null; status: CourseCohort['status']; join_closes_at: string;
    }[]).map((c) => ({
      id: c.id, courseId: c.course_id, courseVersionId: c.course_version_id,
      title: c.title, description: c.description, startsAt: c.starts_at,
      endsAt: c.ends_at, capacity: c.capacity, status: c.status,
      joinClosesAt: c.join_closes_at,
    }));
  }

  const pct = Math.round(summary.percentComplete);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/learn">My learning</Link>
        {course ? ` · ${course.title}` : ''}
      </p>
      <h1>{course?.title ?? 'Course'}</h1>
      <p className="muted">
        Version {version?.version_number ?? '?'} · {(version?.language ?? '?').toUpperCase()}
      </p>

      {!progressOn && (
        <div className="notice warn">
          Progress tracking is not enabled yet. You can still read the course
          and play its lessons; nothing is being recorded.
        </div>
      )}

      {progressOn && (
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Course progress"
        >
          <span style={{ width: `${Math.min(100, Math.max(0, summary.percentComplete))}%` }} />
        </div>
        <div className="meta" style={{ marginTop: '0.6rem' }}>
          {summary.lessonsDone} of {summary.lessonsTotal} lessons complete · {pct}%
        </div>

        {completion && completion.isComplete && (
          <div className="notice" style={{ marginTop: '1rem' }}>
            <strong>Course complete.</strong> Certificates are issued by the
            platform once your completion has been reviewed.
          </div>
        )}

        {completion && !completion.isComplete && completion.blocking.length > 0 && (
          <div className="notice warn" style={{ marginTop: '1rem' }}>
            <strong>Still to do:</strong>
            <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem' }}>
              {completion.blocking.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      )}

      {learnerCohorts.length > 0 && (
        <CohortMemberships
          enabled={cohortsEnabled}
          cohorts={learnerCohorts}
          learnerProfileId={enrolment.learner_profile_id}
        />
      )}

      {sections.length === 0 ? (
        <p className="empty">This course has no published outline yet.</p>
      ) : (
        sections.map((s, i) => (
          <div key={s.id}>
            <div className="outline-h">
              <h3>
                {i + 1}. {s.title}
              </h3>
            </div>
            <div className="card">
              <ul className="lessons">
                {(s.lessons ?? [])
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((l, j) => {
                    const row = progress.get(l.id);
                    const done = row?.status === 'completed';
                    return (
                      <li key={l.id}>
                        <span className="n">{j + 1}</span>
                        <span className={`t ${done ? 'done' : ''}`}>
                          <Link href={`/learn/${enrolment.id}/lesson/${l.id}`}>
                            {l.title}
                          </Link>
                          {l.is_preview && previewsOn && (
                            <span className="badge neutral" style={{ marginLeft: '0.5rem' }}>
                              Preview
                            </span>
                          )}
                        </span>
                        {progressOn && (
                          <MarkComplete
                            enrolmentId={enrolment.id}
                            lessonId={l.id}
                            initiallyDone={done}
                          />
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        ))
      )}

      {assessmentsOn && assessments.length > 0 && (
        <div>
          <div className="outline-h">
            <h3>Assessments</h3>
          </div>
          <div className="card">
            <ul className="lessons">
              {assessments.map((a) => (
                <li key={a.id}>
                  <span className="t">{a.title}</span>
                  <span className="badge neutral">{a.type}</span>
                  <Link
                    href={`/learn/${enrolment.id}/assessment/${a.id}`}
                    className="btn tiny secondary"
                  >
                    {a.type === 'practice' ? 'Practise' : 'Take'}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {visibleAssignments.length > 0 && (
        <div>
          <div className="outline-h">
            <h3>Assignments</h3>
          </div>
          <div className="card">
            <ul className="lessons">
              {visibleAssignments.map((assignment) => {
                const submission = submissionByAssignment.get(assignment.id);
                const deadline = assignmentDeadline(assignment, enrolment.enrolled_at);
                return (
                  <li key={assignment.id}>
                    <span className="t">
                      <Link href={`/learn/${enrolment.id}/assignment/${assignment.id}`}>
                        {assignment.title}
                      </Link>
                      <span className="muted" style={{ display: 'block', fontSize: '.85rem' }}>
                        {deadline ? `Due ${deadline.toLocaleString()}` : 'No deadline'}
                        {submission?.isLate ? ' · submitted late' : ''}
                      </span>
                    </span>
                    <span className="badge neutral">
                      {submission ? SUBMISSION_STATUS_LABEL[submission.status] : 'Not started'}
                    </span>
                    {submission?.scoreEarned !== null && submission?.scoreEarned !== undefined && (
                      <span className="badge">{submission.scoreEarned}{assignment.pointsPossible ? ` / ${assignment.pointsPossible}` : ''}</span>
                    )}
                    <Link href={`/learn/${enrolment.id}/assignment/${assignment.id}`} className="btn tiny secondary">
                      {submission?.status === 'graded' ? 'View feedback' : submission?.status === 'submitted' ? 'View submission' : 'Open'}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
