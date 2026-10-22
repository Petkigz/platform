import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchVersions } from '@/lib/authoring';
import { Curriculum } from './curriculum';
import { AssessmentManager } from './assessment-manager';
import { fetchAuthoredAssessments, fetchPendingManualResponses } from '@/lib/assessment';
import { fetchRejections } from '@/lib/governance';
import { AppealForm } from './appeal-form';
import { fetchSubjects, fetchVersionSubjects } from '@/lib/authoring';
import { fetchSubjectOptions } from '@/lib/review';
import { fetchVersionReviewState } from '@/lib/review-requirements';
import { RequirementPanel } from '@/app/_shared/requirement-panel';
import { VersionChecks } from '@/app/_shared/version-checks';
import { SubjectPicker } from './subject-picker';
import { fetchVersionSources } from '@/lib/provenance';
import { isFlagEnabled } from '@/lib/flags';

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

  // Rejections the author is allowed to contest. The page has already
  // established authorship above, which is the check that makes this safe to
  // show.
  const rejections = await fetchRejections(supabase, courseId);

  // Subject tagging, and the taxonomy it draws from. Tagging is what makes a
  // course findable in the catalogue.
  const [subjects, currentSubjects, sourcesByLesson, previewsEnabled, assessments, manualResponses, reviewState, subjectOptions] = await Promise.all([
    fetchSubjects(supabase),
    current ? fetchVersionSubjects(supabase, current.id) : Promise.resolve<string[]>([]),
    current ? fetchVersionSources(supabase, current.id) : Promise.resolve({}),
    isFlagEnabled(supabase, 'learning.previews').catch(() => false),
    current ? fetchAuthoredAssessments(supabase, current.id) : Promise.resolve([]),
    fetchPendingManualResponses(supabase, courseId),
    // What this version needs before it can publish, and what has been checked on it.
    // The author may write requirements and record checks here; waiving one is a
    // governance decision and lives on /admin/reviews.
    current ? fetchVersionReviewState(supabase, current.id) : Promise.resolve(null),
    fetchSubjectOptions(supabase),
  ]);

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
          <SubjectPicker
            version={current}
            subjects={subjects}
            initial={currentSubjects}
          />
          <Curriculum
            version={current}
            sourcesByLesson={sourcesByLesson}
            previewsEnabled={previewsEnabled}
            copyFromVersionId={!draft && current.status === 'published' ? current.id : null}
          />
          <AssessmentManager
            version={current}
            assessments={assessments}
            manualResponses={manualResponses}
          />

          {reviewState && (
            <section className="section" style={{ marginTop: '1.5rem' }}>
              <div className="outline-h" style={{ marginTop: 0 }}>
                <h2 style={{ margin: 0 }}>Before this can publish</h2>
              </div>
              <RequirementPanel
                versionId={current.id}
                requirements={reviewState.requirements}
                subjects={subjectOptions}
                blockedBecause={reviewState.blockedBecause}
                recountError={reviewState.recountError}
                canRequire
                canWaive={false}
              />
              <div style={{ marginTop: '1rem' }}>
                <VersionChecks
                  versionId={current.id}
                  latestChecks={reviewState.latestChecks}
                  checks={reviewState.checks}
                  assessments={reviewState.assessments}
                  versions={versions.map((v) => ({ id: v.id, versionNumber: v.versionNumber }))}
                  canCheck
                  canAssess
                />
              </div>
            </section>
          )}
        </>
      )}

      {rejections.length > 0 && (
        <section className="section" style={{ marginTop: '1.5rem' }}>
          <div className="outline-h">
            <h3>Rejected versions</h3>
          </div>
          <p className="muted">
            A rejection is not final. If the review missed something, appeal it
            — someone other than the reviewer who rejected it will decide.
          </p>
          <ul className="lessons" style={{ display: 'grid', gap: '1rem' }}>
            {rejections.map((r) => (
              <li key={r.decisionId}>
                <p style={{ margin: 0 }}>
                  <strong>
                    {r.version_number === null
                      ? 'A version'
                      : `Version ${r.version_number}`}
                  </strong>{' '}
                  · {r.review_scope} review ·{' '}
                  <span className="muted">
                    {new Date(r.decided_at).toLocaleDateString()}
                  </span>
                </p>
                {r.rationale && (
                  <p className="muted" style={{ margin: '0.25rem 0 0.5rem' }}>
                    {r.rationale}
                  </p>
                )}
                {r.hasOpenAppeal ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Appeal filed — waiting on a decision.
                  </p>
                ) : (
                  <AppealForm
                    decisionId={r.decisionId}
                    versionNumber={r.version_number}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/courses/${row.slug}`}>View the public page</Link>
        {' · '}
        <Link href={`/teach/${courseId}/assignments`}>Assignments</Link>
        {' · '}
        <Link href={`/teach/${courseId}/cohorts`}>Cohorts</Link>
        {' · '}
        <Link href={`/teach/${courseId}/live`}>Live classes</Link>
        {' · '}
        <Link href={`/teach/${courseId}/reports`}>Reports</Link>
        {' · '}
        <Link href="/teach">Back to my courses</Link>
      </p>
    </div>
  );
}
