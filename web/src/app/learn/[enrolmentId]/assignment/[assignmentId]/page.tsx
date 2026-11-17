import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  assignmentDeadline,
  fetchAssignmentRevisions,
  fetchAssignmentSubmission,
  fetchCourseAssignment,
} from '@/lib/course-assignments';
import { AssignmentWork, type AssignmentWords } from './assignment-work';
import { one } from '@/lib/embed';
import { chooseLocale, countLabel, languageShownFor, translator } from '@/lib/i18n';
import { LOCALE_COOKIE } from '@/lib/i18n/locales';

export const dynamic = 'force-dynamic';

/**
 * One assignment: the task, the learner's written answer, its mark and its
 * earlier versions.
 *
 * **Language.** The page's own words, the written-answer part and the files
 * part are in the reader's language where that language has them
 * (`assign.ts`), and in English, marked as English, where it does not. The
 * title, the instructions, the learner's answer, a file's name and the
 * teacher's comment are printed as written, with `dir="auto"` or `<bdi>`. A
 * file's size is printed the English way ("1.8 MB") in every language.
 *
 * **Times** are printed in UTC, labelled, by the server, and in the reader's
 * own zone once the page is running (`LocalTime`).
 */
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

  // The same choice the dashboard, the course page and the lesson page make.
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'assign');
  const t = translator(shown.code);
  const mismatch = shown.code !== locale;

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
    courses: { title: string } | { title: string }[] | null;
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
  // The named list, for the screen: `assignment_submission_assets` says a file is
  // attached and `media_assets` holds its name, whose own read policy is
  // uploader-or-staff. This function asks on the reader's behalf and returns no
  // object coordinates — opening a file still goes through the route that
  // re-checks `may_watch_master()`.
  const fileResult = submission
    ? await supabase.rpc('assignment_submission_files_page', { p_submission_id: submission.id, p_after: null, p_limit: 25 })
    : { data: {files: [], attachedCount: 0, pendingCount: 0, nextCursor: null}, error: null };
  // Marked versions the learner has already handed in. RLS keeps this to their
  // own submission, so it is safe to fetch without a second permission check.
  const history = submission
    ? await fetchAssignmentRevisions(supabase, [submission.id])
    : [];
  const deadline = assignmentDeadline(assignment, enrolment.enrolled_at);
  const courseTitle = one(enrolment.courses)?.title ?? t('course.fallbackTitle');

  // Handed to the client component as words: these sentences are not in what
  // a browser is sent (`SERVER_ONLY_PREFIXES`).
  const words: AssignmentWords = {
    yourWork: t('assign.yourWork'),
    version: t('assign.version'),
    due: t('assign.due'),
    dueLateOk: t('assign.dueLateOk'),
    deadlinePassed: t('assign.deadlinePassed'),
    submittedResponse: t('assign.submittedResponse'),
    marked: t('assign.marked'),
    score: t('assign.score'),
    scoreOf: t('assess.score'),
    waiting: t('assign.waiting'),
    written: t('assign.written'),
    placeholder: t('assign.placeholder'),
    draftSaved: t('assign.draftSaved'),
    saveDraft: t('assign.saveDraft'),
    saving: t('assign.saving'),
    submit: t('assign.submit'),
    submitRevision: t('assign.submitRevision'),
    submitting: t('assess.submitting'),
    revise: t('assign.revise'),
    working: t('assign.working'),
    reviseExplain: t('assign.reviseExplain'),
    revisionsLeftOne: t('assign.revisionsLeftOne'),
    revisionsLeftOther: t('assign.revisionsLeftOther'),
    blockedClosed: t('assign.blockedClosed'),
    blockedDeadline: t('assign.blockedDeadline'),
    blockedOnce: t('assign.blockedOnce'),
    blockedLimit: t('assign.blockedLimit'),
    earlierOne: t('assign.earlierOne'),
    earlierOther: t('assign.earlierOther'),
    markedOn: t('assign.markedOn'),
    late: t('assign.late'),
    closedDraft: t('assign.closedDraft'),
    msgDraftSaved: t('assign.msgDraftSaved'),
    msgSubmitted: t('assign.msgSubmitted'),
    msgSubmittedVersion: t('assign.msgSubmittedVersion'),
    msgReopened: t('assign.msgReopened'),
    errUnconfirmed: t('assign.errUnconfirmed'),
    errUnavailable: t('assign.errUnavailable'),
    errSignIn: t('assign.errSignIn'),
    errNotEnrolled: t('assign.errNotEnrolled'),
    errNotAllowed: t('assign.errNotAllowed'),
    errNotFound: t('assign.errNotFound'),
    errDeadline: t('assign.errDeadline'),
    errAlreadySubmitted: t('assign.errAlreadySubmitted'),
    errClosed: t('assign.errClosed'),
    errEmpty: t('assign.errEmpty'),
    errFileGone: t('assign.errFileGone'),
    errTooLong: t('assign.errTooLong'),
    errRejected: t('assign.errRejected'),
    files: {
      files: t('assign.files'),
      countUnknown: t('assign.fileCountUnknown'),
      attached: t('assign.filesAttached'),
      notAttached: t('assign.filesNotAttached'),
      listUnknown: t('assign.fileListUnknown'),
      unnamed: t('assign.fileUnnamed'),
      checkAgain: t('assign.fileCheckAgain'),
      resend: t('assign.fileResend'),
      remove: t('assign.fileRemove'),
      showing: t('assign.fileShowing'),
      showMore: t('assign.fileShowMore'),
      hint: t('assign.fileHint'),
      hintRemaining: t('assign.fileHintRemaining'),
      pendingExplain: t('assign.filePendingExplain'),
      resendLabel: t('assign.fileResendLabel'),
      none: t('assign.fileNone'),
      phaseReading: t('assign.filePhaseReading'),
      phaseAsking: t('assign.filePhaseAsking'),
      phaseSending: t('assign.filePhaseSending'),
      phaseChecking: t('assign.filePhaseChecking'),
      phaseDone: t('assign.filePhaseDone'),
      kindImage: t('assign.fileKindImage'),
      kindAudio: t('assign.fileKindAudio'),
      kindOther: t('assign.fileKindOther'),
      statusPending: t('assign.fileStatusPending'),
      statusHeld: t('assign.fileStatusHeld'),
      statusUnavailable: t('assign.fileStatusUnavailable'),
      errNoName: t('assign.fileErrNoName'),
      errEmpty: t('assign.fileErrEmpty'),
      errTooBig: t('assign.fileErrTooBig'),
      errKind: t('assign.fileErrKind'),
      errTooMany: t('assign.fileErrTooMany'),
      errDraft: t('assign.fileErrDraft'),
      errUnreadable: t('assign.fileErrUnreadable'),
      errUncertain: t('assign.fileErrUncertain'),
      errListAfterAttach: t('assign.fileErrListAfterAttach'),
      errListChanged: t('assign.fileErrListChanged'),
      msgAttached: t('assign.fileMsgAttached'),
      msgConfirmed: t('assign.fileMsgConfirmed'),
      msgRemoved: t('assign.fileMsgRemoved'),
      errRemove: t('assign.fileErrRemove'),
      errRemoveList: t('assign.fileErrRemoveList'),
    },
    revisionFiles: {
      note: t('assign.fileRevisionNote'),
      open: t('assign.fileRevisionOpen'),
      invalid: t('assign.fileRevisionInvalid'),
    },
  };

  return (
    <div
      className="container section"
      style={{ display: 'grid', gap: '1rem' }}
      lang={mismatch ? shown.code : undefined}
      dir={mismatch ? shown.dir : undefined}
    >
      <p className="eyebrow">
        <Link href={`/learn/${enrolment.id}`}>
          <bdi>{courseTitle}</bdi>
        </Link>
        {' · '}
        {t('assign.label')}
      </p>
      <h1 dir="auto">{assignment.title}</h1>
      {assignment.instructions && (
        <p className="lede" style={{ whiteSpace: 'pre-wrap' }} dir="auto">
          {assignment.instructions}
        </p>
      )}
      <div className="badges">
        <span className="badge">{t(assignment.cohortId ? 'assign.cohortWork' : 'assign.selfPaced')}</span>
        {assignment.pointsPossible !== null && (
          <span className="badge neutral">
            {countLabel(shown.code, assignment.pointsPossible, {
              one: 'assess.pointsOne',
              other: 'assess.pointsOther',
            })}
          </span>
        )}
        {assignment.acceptLate && <span className="badge neutral">{t('assign.lateAccepted')}</span>}
      </div>
      <AssignmentWork
        assignmentId={assignment.id}
        learnerProfileId={enrolment.learner_profile_id}
        assignmentStatus={assignment.status}
        pointsPossible={assignment.pointsPossible}
        acceptLate={assignment.acceptLate}
        deadline={deadline?.toISOString() ?? null}
        pastDue={deadline !== null && deadline.getTime() < Date.now()}
        initialSubmission={submission}
        files={fileResult.error ? null : fileResult.data}
        revisionsAllowed={assignment.revisionsAllowed}
        revisionLimit={assignment.revisionLimit}
        history={history}
        locale={shown.code}
        words={words}
      />
      <p>
        <Link href={`/learn/${enrolment.id}`}>{t('assess.back')}</Link>
      </p>
    </div>
  );
}
