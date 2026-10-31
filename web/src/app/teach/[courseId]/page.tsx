import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchVersions } from '@/lib/authoring';
import { Curriculum } from './curriculum';
import { ImportOutline } from './import-outline';
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
import { AudiencePicker } from './audience-picker';
import { LanguagePicker } from './language-picker';
import { CertificatePolicyCard } from './certificate-policy';
import { fetchCertificatePolicy } from '@/lib/certificates';
import { parseLanguages } from '@/lib/language';
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
    .select('id, slug, title, created_by, audience, age_bands, language_code')
    .eq('id', courseId)
    .is('deleted_at', null)
    .single();

  const row = course as unknown as {
    id: string;
    slug: string;
    title: string;
    created_by: string;
    audience: 'child' | 'adult' | 'both';
    age_bands: string[] | null;
    language_code: string | null;
  } | null;

  // `courses_read` admits any active course to any signed-in user, so this
  // checks authorship explicitly. Without it, /teach/<anyone's course> would
  // render the curriculum editor for a course you do not own.
  if (!row || row.created_by !== user.id) notFound();

  // The whole register for the picker: a teacher writing the first Arabic
  // course must be able to say so, so this is not the chip row's list of
  // languages somebody has already used.
  const languageRegister = parseLanguages(
    (await supabase.from('languages').select('code, native_name, english_name, direction')
      .eq('is_available', true).order('sort_order'))
      .data?.map((l) => ({
        code: l.code,
        nativeName: l.native_name,
        englishName: l.english_name,
        direction: l.direction,
        courses: 0,
      })) ?? [],
  );

  const versions = await fetchVersions(supabase, courseId);
  const draft = versions.find((v) => v.status === 'draft');
  const current = draft ?? versions[0];

  // Rejections the author is allowed to contest. The page has already
  // established authorship above, which is the check that makes this safe to
  // show.
  const rejections = await fetchRejections(supabase, courseId);

  // Subject tagging, and the taxonomy it draws from. Tagging is what makes a
  // course findable in the catalogue.
  const [subjects, currentSubjects, sourcesByLesson, previewsEnabled, assessments, manualResponses, reviewState, subjectOptions, certificatePolicy] = await Promise.all([
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
    // What this version promises whoever finishes it. Read from the version,
    // because a new draft may promise something different from the version
    // learners are already on.
    current ? fetchCertificatePolicy(supabase, current.id) : Promise.resolve({ enabled: false, templateVersion: null }),
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
          <div
            className="row"
            style={{ gap: '0.6rem', alignItems: 'baseline', marginBottom: '1rem', flexWrap: 'wrap' }}
          >
            <Link className="btn" href={`/teach/${row.id}/preview`}>
              Rehearse the whole version
            </Link>
            <span className="muted" style={{ fontSize: '0.9rem' }}>
              Every lesson, the way a learner meets it — what is empty, and what has nothing to
              play. Notes, not a gate; submitting is still this page&apos;s business.
            </span>
          </div>

          <AudiencePicker
            courseId={row.id}
            initialAudience={row.audience}
            initialBands={row.age_bands ?? []}
          />
          <LanguagePicker
            courseId={row.id}
            initialCode={row.language_code ?? 'en'}
            languages={languageRegister}
          />
          <SubjectPicker
            version={current}
            subjects={subjects}
            initial={currentSubjects}
          />
          <CertificatePolicyCard
            versionId={current.id}
            versionNumber={current.versionNumber}
            versionStatus={current.status}
            policy={certificatePolicy}
          />
          <Curriculum
            courseId={row.id}
            version={current}
            sourcesByLesson={sourcesByLesson}
            previewsEnabled={previewsEnabled}
            copyFromVersionId={!draft && current.status === 'published' ? current.id : null}
          />
          {/* Only on a draft. A published version is frozen (D5), and offering an
              import into one would be offering a button that can only fail — the
              database refuses it, and the teacher would have spent a minute
              preparing a file to find out. */}
          {current.status === 'draft' && <ImportOutline versionId={current.id} />}
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
