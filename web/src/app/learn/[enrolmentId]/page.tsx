import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchCompletion, fetchProgress, fetchSummary } from '@/lib/progress';
import { flattenOutline } from '@/lib/outline';
import { carryOnHeading, continuePoint } from '@/lib/continue-point';
import { CarryOn } from '@/app/_shared/carry-on';
import { fetchAssessmentsForVersion } from '@/lib/assessment';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import { MarkComplete, type MarkCompleteWords } from './mark-complete';
import { LocalTime } from '@/components/local-time';
import { CohortMemberships } from './cohort-memberships';
import type { CourseCohort } from '@/lib/cohorts';
import {
  assignmentDeadline,
  fetchAssignmentSubmissionsForLearner,
  fetchCourseAssignments,
} from '@/lib/course-assignments';
import { one, type Embedded } from '@/lib/embed';

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
  // One course and one version per enrolment; read with one().
  courses: Embedded<{ title: string; slug: string }>;
  course_versions: Embedded<{
    version_number: number;
    language: string;
    course_sections: Section[] | null;
  }>;
};

/**
 * The course view.
 *
 * Everything on this page is scoped to the enrolment's pinned version — the
 * join goes enrolment → version → sections → lessons, which is the same shape
 * the database uses. A learner who enrolled into v1 keeps seeing v1 even after
 * v2 is published (D5), and `enforce_progress_version_match` refuses progress
 * recorded against any other version.
 *
 * **Language.** The page's own words — the heading line, the carry-on card, the
 * progress bar and its notices, the outline and the mark-complete control — are
 * in the reader's language where that language has this screen (`course.ts`),
 * and in English, marked as English, where it does not. Three things are
 * English for everybody and are marked so: the reasons a course is not yet
 * complete, which the database writes; and the assessment, assignment and
 * cohort lists, which are not translated yet. What a teacher wrote — titles of
 * the course, its sections and lessons — is shown as written.
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

  // The same choice the dashboard makes: the reader's cookie, then the device.
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'course');
  const t = translator(shown.code);
  const num = (value: number) => formatNumber(shown.code, value);
  const mismatch = shown.code !== locale;
  // For the parts of this page that are English whatever the reader chose.
  const english = shown.code === 'en' ? {} : ({ lang: 'en', dir: 'ltr' } as const);
  // Handed to the client control as props, so these sentences are not in the
  // catalogue every page carries.
  const markWords: MarkCompleteWords = {
    mark: t('course.markComplete'),
    undo: t('course.undo'),
    saving: t('course.saving'),
    unconfirmed: t('course.unconfirmed'),
    reload: t('course.reload'),
  };

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
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const enrolment = data as unknown as EnrolmentRow | null;

  // A missing enrolment and someone else's enrolment look identical here: RLS
  // returns nothing for both. That is the point, and it is why this is a
  // notFound rather than a permission error.
  if (!enrolment) notFound();

  // One course and one version per enrolment: an object from PostgREST.
  const course = one(enrolment.courses);
  const version = one(enrolment.course_versions);

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

  // Where to carry on from. Built from the sections this page already read, so
  // the answer is about the version the learner is pinned to and costs no extra
  // query; `continue-point.ts` owns the rule and the words.
  const outline = flattenOutline(sections);
  const progressRows = [...progress.values()];
  const carryOn = continuePoint(outline, progressRows);
  const carryCopy = carryOn
    ? carryOnHeading(carryOn, progressRows.length > 0, { t, number: num })
    : null;

  return (
    <div
      className="container section course-workspace"
      lang={mismatch ? shown.code : undefined}
      dir={mismatch ? shown.dir : undefined}
    >
      <header className="course-workspace-head">
        <p className="eyebrow">
          <Link href="/learn">{t('nav.learn')}</Link>
        </p>
        <h1>{course?.title ?? t('course.fallbackTitle')}</h1>
        <p className="muted">
          {t('course.version', {
            number: version ? num(version.version_number) : '?',
            language: (version?.language ?? '?').toUpperCase(),
          })}
        </p>
      </header>

      {!progressOn && <div className="notice warn">{t('course.progressOff')}</div>}

      {/* The question a returning learner arrives with is "where was I?", and
          the page answered it with a percentage and a list they had to scan.
          Above the progress bar, because it is the first thing to act on. */}
      {progressOn && carryOn && carryCopy && (
        <CarryOn enrolmentId={enrolmentId} point={carryOn} copy={carryCopy} />
      )}

      {progressOn && (
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('course.progressLabel')}
        >
          <span style={{ width: `${Math.min(100, Math.max(0, summary.percentComplete))}%` }} />
        </div>
        <div className="meta" style={{ marginTop: '0.6rem' }}>
          {t('course.lessonsComplete', {
            done: num(summary.lessonsDone),
            total: num(summary.lessonsTotal),
            percent: num(pct),
          })}
        </div>

        {completion && completion.isComplete && (
          <div className="notice" style={{ marginTop: '1rem' }}>
            <strong>{t('course.completeHeading')}</strong> {t('course.completeBody')}
          </div>
        )}

        {completion && !completion.isComplete && completion.blocking.length > 0 && (
          <div className="notice warn" style={{ marginTop: '1rem' }}>
            <strong>{t('course.stillToDo')}</strong>
            {/* The database writes these reasons, in English, for everyone. */}
            <ul style={{ margin: '0.4rem 0 0', paddingInlineStart: '1.1rem' }} {...english}>
              {completion.blocking.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      )}

      {learnerCohorts.length > 0 && (
        <div {...english}>
          <CohortMemberships
            enabled={cohortsEnabled}
            cohorts={learnerCohorts}
            learnerProfileId={enrolment.learner_profile_id}
          />
        </div>
      )}

      {sections.length === 0 ? (
        <p className="empty">{t('course.noOutline')}</p>
      ) : (
        sections.map((s, i) => (
          <div key={s.id}>
            <div className="outline-h">
              <h3>
                {num(i + 1)}. {s.title}
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
                        <span className="n">{num(j + 1)}</span>
                        <span className={`t ${done ? 'done' : ''}`}>
                          <Link href={`/learn/${enrolment.id}/lesson/${l.id}`}>
                            {l.title}
                          </Link>
                          {l.is_preview && previewsOn && (
                            <span className="badge neutral" style={{ marginInlineStart: '0.5rem' }}>
                              {t('course.preview')}
                            </span>
                          )}
                        </span>
                        {progressOn && (
                          <MarkComplete
                            enrolmentId={enrolment.id}
                            lessonId={l.id}
                            initiallyDone={done}
                            words={markWords}
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
            <h3>{t('assess.heading')}</h3>
          </div>
          <div className="card">
            <ul className="lessons">
              {assessments.map((a) => (
                <li key={a.id}>
                  <span className="t" dir="auto">{a.title}</span>
                  <span className="badge neutral">
                    {t(
                      a.type === 'practice'
                        ? 'assess.typePractice'
                        : a.type === 'final'
                          ? 'assess.typeFinal'
                          : 'assess.typeGraded',
                    )}
                  </span>
                  <Link
                    href={`/learn/${enrolment.id}/assessment/${a.id}`}
                    className="btn tiny secondary"
                  >
                    {t(a.type === 'practice' ? 'assess.practise' : 'assess.take')}
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
            <h3>{t('assign.heading')}</h3>
          </div>
          <div className="card">
            <ul className="lessons">
              {visibleAssignments.map((assignment) => {
                const submission = submissionByAssignment.get(assignment.id);
                const deadline = assignmentDeadline(assignment, enrolment.enrolled_at);
                const dueSentence = t('assign.due');
                const dueAt = dueSentence.indexOf('{date}');
                return (
                  <li key={assignment.id}>
                    <span className="t">
                      <Link href={`/learn/${enrolment.id}/assignment/${assignment.id}`} dir="auto">
                        {assignment.title}
                      </Link>
                      <span className="muted" style={{ display: 'block', fontSize: '.85rem' }}>
                        {deadline ? (
                          <>
                            {dueAt === -1 ? `${dueSentence} ` : dueSentence.slice(0, dueAt)}
                            <LocalTime iso={deadline.toISOString()} locale={shown.code} />
                            {dueAt === -1 ? '' : dueSentence.slice(dueAt + '{date}'.length)}
                          </>
                        ) : (
                          t('assign.noDeadline')
                        )}
                        {submission?.isLate ? ` · ${t('assign.submittedLate')}` : ''}
                      </span>
                    </span>
                    <span className="badge neutral">
                      {t(
                        !submission
                          ? 'assign.notStarted'
                          : submission.status === 'graded'
                            ? 'assign.marked'
                            : submission.status === 'submitted'
                              ? 'assign.statusSubmitted'
                              : 'assign.statusDraft',
                      )}
                    </span>
                    {submission?.scoreEarned !== null && submission?.scoreEarned !== undefined && (
                      <span className="badge">
                        {assignment.pointsPossible
                          ? t('assess.score', {
                              earned: num(submission.scoreEarned),
                              possible: num(assignment.pointsPossible),
                            })
                          : t('assign.score', { earned: num(submission.scoreEarned) })}
                      </span>
                    )}
                    <Link href={`/learn/${enrolment.id}/assignment/${assignment.id}`} className="btn tiny secondary">
                      {t(
                        submission?.status === 'graded'
                          ? 'assign.viewFeedback'
                          : submission?.status === 'submitted'
                            ? 'assign.viewSubmission'
                            : 'assign.open',
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">{t('course.back')}</Link>
      </p>
    </div>
  );
}
