import { fetchTranscripts } from '@/lib/transcripts';
import { ArabicInline } from '@/app/_shared/arabic-text';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { throwUnlessWrongAddress } from '@/lib/read-failed';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  canAccessLesson,
  fetchLesson,
  nativeMediaKind,
  type ResourceType,
} from '@/lib/lessons';
import {
  LOCALE_COOKIE,
  chooseLocale,
  countLabel,
  durationLabel,
  formatNumber,
  languageShownFor,
  playerMessagesFor,
  translator,
  type MessageKey,
} from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/client';
import { MarkComplete, type MarkCompleteWords } from '../../mark-complete';
import { fetchThread } from '@/lib/discussion';
import { isFlagEnabled } from '@/lib/flags';
import { Discussion, type DiscussionWords } from './discussion';
import { ReportForm, type ReportFormWords } from './report-form';
import { fetchLessonSources, type SourceType } from '@/lib/provenance';
import { fetchLessonStudyTools } from '@/lib/lesson-study-tools';
import { StudyTools, type StudyToolsWords } from './study-tools';
import { fetchPlayableRenditions, groupByAsset, posterFor } from '@/lib/playback';
import { lessonNote, noteFor, parseStanding } from '@/lib/playback-standing';
import { RenditionPlayer } from '@/app/_shared/rendition-player';
import { AudioPlayer, VideoWithResume } from '@/app/_shared/media-resume';
import { fetchAssessmentsForVersion, fetchQuestions } from '@/lib/assessment';
import { practiceForLesson } from '@/lib/practice';
import { PracticeCheck, type PracticeCheckWords, type PracticeItem } from './practice-check';
import { recordEvent } from '@/lib/analytics-server';
import { fetchOutline } from '@/lib/outline-query';
import { lessonNeighbours } from '@/lib/outline';
import { LessonNav } from '@/app/_shared/lesson-nav';
import { one } from '@/lib/embed';

export const dynamic = 'force-dynamic';

type EnrolmentRow = {
  id: string;
  learner_profile_id: string;
  status: string;
  source: string;
  course_version_id: string;
  courses: { id: string; title: string } | { id: string; title: string }[] | null;
};

/** Why a lesson can or cannot be saved, as `lesson_download_standing()` says it. */
type SaveStanding = {
  enabled: boolean;
  allowed: boolean;
  reason: 'allowed' | 'signed_out' | 'feature_off' | 'not_entitled' | 'needs_plus' | 'no_media' | 'no_lesson';
  needsPlus: boolean;
  message: string;
};

type ProgressRow = {
  lesson_id: string;
  status: string;
  progress_percent: number;
};

/** The kind of each material, as a sentence in the catalogue. */
const RESOURCE_KEY: Record<ResourceType, MessageKey> = {
  video: 'lesson.typeVideo',
  audio: 'lesson.typeAudio',
  document: 'lesson.typeDocument',
  worksheet: 'lesson.typeWorksheet',
  link: 'lesson.typeLink',
  quiz: 'lesson.typeQuiz',
  other: 'lesson.typeOther',
};

/**
 * The kind of each source, as the reader's language names it. The value in
 * the database (`fiqh_reference`) is a column's word, not a reader's.
 */
const SOURCE_KEY: Record<SourceType, MessageKey> = {
  quran: 'lesson.sourceQuran',
  hadith: 'lesson.sourceHadith',
  tafsir: 'lesson.sourceTafsir',
  fiqh_reference: 'lesson.sourceFiqh',
  book: 'lesson.sourceBook',
  article: 'lesson.sourceArticle',
  lecture: 'lesson.sourceLecture',
  fatwa: 'lesson.sourceFatwa',
  manuscript: 'lesson.sourceManuscript',
  other: 'lesson.sourceOther',
};

/**
 * Open a lesson.
 *
 * This page is the reason the entitlement work matters in the UI. Everything
 * about what is shown here is decided by the database, not by whether there is
 * a session:
 *
 *   - the lesson row is readable by anyone who can read the version, so the
 *     title and description appear even before purchase — that is how a
 *     catalogue preview works
 *   - the resources are gated on entitlement, so a signed-in visitor who has
 *     not bought the course gets the ones classified `public_preview` and
 *     nothing else
 *
 * That distinction has to survive into the interface. Showing an empty
 * resource list as though the lesson simply had no materials would be a lie of
 * omission: the materials exist, the reader just may not see them. So the page
 * asks `can_access_lesson` explicitly and says which situation it is in.
 *
 * **Language.** The page's own frame — breadcrumb, badges, headings, the kind of
 * each material, the empty-list sentences and the row of buttons at the foot —
 * is in the reader's language where that language has it (`lesson.ts`), and in
 * English, marked as English, where it does not. The client components on it
 * are the reader's too: the report form, practice questions and notes are
 * handed their words, and the players ask for theirs through a provider put
 * round the materials (`player.ts`), saved-place messages and the notice
 * about keeping a place on this browser included. One is still English for
 * everybody and is marked so here: the open discussion. What a teacher wrote
 * is shown as written.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ enrolmentId: string; lessonId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { enrolmentId, lessonId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/learn/${enrolmentId}/lesson/${lessonId}`);

  // The same choice the dashboard and the course page make.
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'lesson');
  const t = translator(shown.code);
  const num = (value: number) => formatNumber(shown.code, value);
  const mismatch = shown.code !== locale;
  const markWords: MarkCompleteWords = {
    mark: t('course.markComplete'),
    undo: t('course.undo'),
    saving: t('course.saving'),
    unconfirmed: t('course.unconfirmed'),
    reload: t('course.reload'),
  };
  // The report form: at the foot of the lesson, beside a recording that
  // cannot be played, and under each post in the discussion.
  const reportWords: ReportFormWords = {
    open: t('lesson.reportOpen'),
    intro: t('lesson.reportIntro'),
    kind: t('lesson.reportKind'),
    categories: {
      doctrinal_error: t('lesson.reportKindDoctrinal'),
      translation_error: t('lesson.reportKindTranslation'),
      inappropriate_content: t('lesson.reportKindInappropriate'),
      misattribution: t('lesson.reportKindMisattribution'),
      copyright: t('lesson.reportKindCopyright'),
      technical_fault: t('lesson.reportKindTechnical'),
      other: t('lesson.reportKindOther'),
    },
    what: t('lesson.reportWhat'),
    placeholder: t('lesson.reportPlaceholder'),
    send: t('lesson.reportSend'),
    sending: t('lesson.reportSending'),
    cancel: t('lesson.reportCancel'),
    sent: t('lesson.reportSent'),
    tooLong: t('lesson.reportTooLong'),
    notVisible: t('lesson.reportNotVisible'),
    duplicate: t('lesson.reportDuplicate'),
    refused: t('lesson.reportRefused'),
    uncertain: t('lesson.reportUncertain'),
  };
  // The discussion, when its switch is on. "Sending…" and the sentence for a
  // post that is too long are the report form's.
  const discussionWords: DiscussionWords = {
    heading: t('lesson.discussion'),
    closed: t('lesson.discussionClosed'),
    intro: t('lesson.discussionIntro'),
    empty: t('lesson.discussionEmpty'),
    emptyAsk: t('lesson.discussionEmptyAsk'),
    teacher: t('lesson.discussionTeacher'),
    someone: t('lesson.discussionSomeone'),
    awaiting: t('lesson.discussionAwaiting'),
    withdrawn: t('lesson.discussionWithdrawn'),
    reply: t('lesson.discussionReply'),
    reportPost: t('lesson.discussionReportPost'),
    reportReply: t('lesson.discussionReportReply'),
    replyTo: t('lesson.discussionReplyTo'),
    send: t('lesson.discussionSend'),
    sending: t('lesson.reportSending'),
    ask: t('lesson.discussionAsk'),
    askPlaceholder: t('lesson.discussionAskPlaceholder'),
    cancelReply: t('lesson.discussionCancelReply'),
    held: t('lesson.discussionHeld'),
    posted: t('lesson.discussionPosted'),
    writeFirst: t('lesson.discussionWriteFirst'),
    tooLong: t('lesson.reportTooLong'),
    closedNow: t('lesson.discussionClosedNow'),
    replyGone: t('lesson.discussionReplyGone'),
    signIn: t('lesson.discussionSignIn'),
    refused: t('lesson.discussionRefused'),
    uncertain: t('lesson.discussionUncertain'),
  };
  // The questions at the foot of the lesson that are not the quiz. Four of
  // its words are the quiz's own.
  const practiceWords: PracticeCheckWords = {
    heading: t('lesson.practiceHeading'),
    intro: t('lesson.practiceIntro'),
    untitled: t('assess.untitledQuestion'),
    yourAnswer: t('assess.yourAnswer'),
    yes: t('assess.true'),
    no: t('assess.false'),
    check: t('lesson.practiceCheck'),
    checking: t('lesson.practiceChecking'),
    right: t('lesson.practiceRight'),
    wrong: t('lesson.practiceWrong'),
    retry: t('lesson.practiceRetry'),
    failed: t('lesson.practiceFailed'),
  };
  // The words before the place a source is used, and whatever follows it, which in every language
  // written so far is nothing. The place is the teacher's own words.
  const [usedBefore = '', usedAfter = ''] = t('lesson.sourcesUsedAt').split('{place}');
  // The learner's own note and bookmark.
  const studyWords: StudyToolsWords = {
    label: t('lesson.studyLabel'),
    heading: t('lesson.studyHeading'),
    bookmark: t('lesson.studyBookmark'),
    unbookmark: t('lesson.studyUnbookmark'),
    noteLabel: t('lesson.studyNoteLabel'),
    placeholder: t('lesson.studyPlaceholder'),
    save: t('lesson.studySave'),
    saving: t('course.saving'),
    clear: t('lesson.studyClear'),
    saved: t('lesson.studySaved'),
    cleared: t('lesson.studyCleared'),
    bookmarked: t('lesson.studyBookmarked'),
    unbookmarked: t('lesson.studyUnbookmarked'),
    privateNote: t('lesson.studyPrivate'),
    failed: t('lesson.studyFailed'),
    signIn: t('lesson.studySignIn'),
  };

  const { data: enrolmentData, error: enrolmentError } = await supabase
    .from('course_enrolments')
    .select(
      'id, learner_profile_id, status, source, course_version_id, courses ( id, title )',
    )
    .eq('id', enrolmentId)
    .is('deleted_at', null)
    .maybeSingle();
  // A read that failed is not a thing that does not exist: the site's error
  // page, not "not found" and not an empty list.
  throwUnlessWrongAddress(enrolmentError);

  const enrolment = enrolmentData as unknown as EnrolmentRow | null;
  if (!enrolment) notFound();

  // Not a permission check so much as a sanity check: RLS already hides
  // someone else's enrolment, so this fires when the id is stale or wrong.
  if (enrolment.learner_profile_id) {
    const { data: profile, error: profileError } = await supabase
      .from('learner_profiles')
      .select('id')
      .eq('id', enrolment.learner_profile_id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile) notFound();
  }

  const lesson = await fetchLesson(supabase, lessonId);
  if (!lesson) notFound();

  // A lesson from a different version than the one enrolled in is a broken
  // link, not a security event — but it should not render either.
  if (lesson.courseVersionId !== enrolment.course_version_id) notFound();

  const entitled = await canAccessLesson(
    supabase,
    enrolment.learner_profile_id,
    lesson.id,
  );

  // Where this lesson sits in the course, for the two buttons at the foot of
  // the page. Read from the version the enrolment is pinned to — the same
  // version `fetchLesson()` just checked the lesson belongs to — because a
  // learner on v1 must not be told the next lesson is a v2 lesson they cannot
  // open. Only asked when the reader may open the lessons at all: a preview
  // viewer sees a handful of them, and offering "next" would walk them into one
  // they are not entitled to.
  // Both reads are allowed only after the entitlement and pinned-version checks.
  // They are independent and use the same request-scoped client.
  const [transcripts, steps] = entitled
    ? await Promise.all([
        fetchTranscripts(supabase, [lesson.id]),
        fetchOutline(supabase, lesson.courseVersionId),
      ])
    : [Object.create(null) as Record<string, string>, []];
  const transcript = transcripts[lesson.id];
  const here = lessonNeighbours(steps, lesson.id);

  // An opened lesson, recorded against the learner it was opened for — not the
  // adult who is signed in, who may be a parent looking at a child's work. This
  // is also the only place the app learns that a lesson was *reached* rather
  // than merely completed, which progress alone cannot say.
  if (entitled) {
    await recordEvent(supabase, 'lesson.opened', {
      subjectId: lesson.id,
      learnerProfileId: enrolment.learner_profile_id,
    });
  }

  // Resume position, completion status and feature switches are independent.
  // Keep all of them behind the preceding enrolment/version checks and retain
  // the original fail-closed behavior of each flag.
  const [progressResult, positionsResult, discussionOn, provenanceOn, previewsOn, studyToolsOn, practiceOn] = await Promise.all([
    supabase.from('lesson_progress')
      .select('lesson_id, status, progress_percent')
      .eq('course_enrolment_id', enrolmentId)
      .eq('lesson_id', lessonId)
      .maybeSingle(),
    supabase.rpc('lesson_positions', { p_enrolment_id: enrolmentId }),
    isFlagEnabled(supabase, 'learning.discussion'),
    isFlagEnabled(supabase, 'learning.provenance'),
    isFlagEnabled(supabase, 'learning.previews').catch(() => false),
    isFlagEnabled(supabase, 'learning.notes_bookmarks').catch(() => false),
    isFlagEnabled(supabase, 'learning.assessments').catch(() => false),
  ]);
  const progress = progressResult.data as unknown as ProgressRow | null;
  const done = progress?.status === 'completed';
  const positions = (positionsResult.data ?? {}) as Record<string, number>;
  const savedPosition = positions[lesson.id];
  const resumeAt: number | null = entitled && typeof savedPosition === 'number'
    ? savedPosition
    : null;

  // A practice assessment attached to this lesson is the "interactive" half of
  // the lesson: a question you answer while you are still reading. Only
  // practice ones — a graded quiz has an attempt limit and its own sitting.
  const practiceItems: PracticeItem[] = practiceOn
    ? await Promise.all(
        practiceForLesson(
          await fetchAssessmentsForVersion(supabase, lesson.courseVersionId),
          lesson.id,
        ).map(async (a) => ({
          id: a.id,
          title: a.title,
          instructions: a.instructions,
          questions: await fetchQuestions(supabase, a.id).catch(() => []),
        })),
      ).then((items) => items.filter((i) => i.questions.length > 0))
    : [];

  const [thread, sources, studyTools] = await Promise.all([
    discussionOn ? fetchThread(supabase, { lessonId: lesson.id, myUserId: user.id }) : Promise.resolve([]),
    provenanceOn ? fetchLessonSources(supabase, lesson.id) : Promise.resolve([]),
    studyToolsOn && entitled
      ? fetchLessonStudyTools(supabase, { userId: user.id, enrolmentId, lessonId: lesson.id })
      : Promise.resolve(null),
  ]);

  // Delivery copies of any uploaded media in this lesson. The select is filtered
  // by row-level security — `may_play_rendition()` — so what comes back is
  // exactly what this learner may watch, and nothing here re-decides that. A
  // second check would be a second authority that could disagree with the first.
  const assetIds = lesson.resources
    .map((resource) => resource.mediaAssetId)
    .filter((id): id is string => Boolean(id));
  const hasMedia = assetIds.length > 0;

  const [renditions, offlineOn, standingData] = await Promise.all([
    hasMedia ? fetchPlayableRenditions(supabase, assetIds) : Promise.resolve([]),
    hasMedia
      ? isFlagEnabled(supabase, 'learning.offline').catch(() => false)
      : Promise.resolve(false),
    // Why a file has no player, in the learner's own three words. The rendition
    // read above can only see copies that are already available, so a file still
    // being prepared and a file that failed look identical to it — and to a
    // learner they are two different sentences, one of which asks for help.
    hasMedia
      ? supabase
          .rpc('lesson_playback_standing', { p_lesson_id: lesson.id })
          .then((result) => result.data, () => null)
      : Promise.resolve(null),
  ]);
  const renditionsByAsset = groupByAsset(renditions);
  const standing = parseStanding(standingData);

  // The players are client components with their own sentences, most of them
  // about the saved place. They are handed over here, in the language this
  // page is written in, and only when the lesson has a player to say them.
  // An English page hands over nothing: English is what a player says when
  // nobody tells it otherwise.
  const hasPlayer = lesson.resources.some((r) =>
    r.externalUrl
      ? nativeMediaKind(r) !== null
      : Boolean(r.mediaAssetId) && (renditionsByAsset.get(r.mediaAssetId ?? '')?.length ?? 0) > 0);
  const playerWords = hasPlayer && shown.code !== 'en' ? playerMessagesFor(shown.code) : {};

  // Said above the materials, and only when something in the lesson is not
  // playable: a learner who reads the first line and stops is the one who most
  // needs to know whether to wait or to tell somebody.
  const summary = entitled
    ? lessonNote(
        lesson.resources
          .filter((resource) => resource.mediaAssetId)
          .map((resource) => standing.get(resource.id) ?? null),
      )
    : null;

  // Saving is a paid feature with its own predicate, deliberately not
  // can_access_lesson(): a free preview may be watched but not kept. The
  // standing answers the same question with a reason attached, so a learner on
  // Basic is told what Plus is instead of seeing a button that is not there.
  let canDownload = false;
  let saveStanding: SaveStanding | null = null;
  if (offlineOn && hasMedia) {
    const { data } = await supabase.rpc('lesson_download_standing', {
      p_lesson_id: lesson.id,
    });
    saveStanding = (data ?? null) as SaveStanding | null;
    canDownload = saveStanding?.allowed === true;
  }

  const namedCourse = one(enrolment.courses)?.title ?? null;
  // A player keeps this name with a lesson saved on the device. The list of
  // saved lessons is in the reader's language since 2026-11-27, so a course
  // whose title could not be read is kept under the page's own word for one,
  // in the language the lesson was saved in.
  const courseTitle = namedCourse ?? t('course.fallbackTitle');
  const duration = durationLabel(shown.code, lesson.durationSeconds);

  return (
    <div
      className="page lesson-page"
      lang={mismatch ? shown.code : undefined}
      dir={mismatch ? shown.dir : undefined}
    >
      <nav className="crumbs" aria-label={t('lesson.crumbs')}>
        <Link href="/learn">{t('nav.learn')}</Link>
        <span aria-hidden>›</span>
        <Link href={`/learn/${enrolmentId}`}>{namedCourse ?? t('course.fallbackTitle')}</Link>
        <span aria-hidden>›</span>
        <span>{lesson.sectionTitle}</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">
          {lesson.sectionTitle}
          {duration ? ` · ${duration}` : ''}
        </p>
        {/* A lesson may be named in Arabic — the course language is a fact about
            the course, and the title takes it. Marking the run is what lets a
            screen reader switch voice instead of spelling the letters out. */}
        <h1>
          <ArabicInline text={lesson.title} />
        </h1>
        <div className="lesson-badges">
          {lesson.isPreview && previewsOn && (
            <span className="badge neutral">{t('lesson.previewLesson')}</span>
          )}
          {done ? (
            <span className="badge ok">{t('lesson.completed')}</span>
          ) : (
            <span className="badge neutral">{t('lesson.notStarted')}</span>
          )}
        </div>
      </div>

      {lesson.description && (
        <section className="card">
          {/* The teacher's words, in the teacher's direction. */}
          <p dir="auto">{lesson.description}</p>
        </section>
      )}

      {transcript && (
        <section className="card">
          <h2>{t('lesson.transcript')}</h2>
          <p style={{ whiteSpace: 'pre-wrap' }} dir="auto">{transcript}</p>
        </section>
      )}

      {summary && (
        // The heading has a line to itself: a full stop after it is not the
        // same mark in every script, and some have none.
        <div className="notice" style={{ marginBottom: '1rem' }}>
          <strong style={{ display: 'block' }}>{t(summary.headingKey)}</strong>
          {t(summary.sentenceKey)}
          {summary.tellSomeone && (
            <span style={{ display: 'block', marginTop: '0.5rem' }}>
              <ReportForm
                lessonId={lesson.id}
                label={t('lesson.recTell')}
                category="technical_fault"
                words={reportWords}
                locale={shown.code}
              />
            </span>
          )}
        </div>
      )}

      <section className="card">
        <h2>{t('lesson.materials')}</h2>
        {lesson.resources.length === 0 ? (
          // The two cases that produce an empty list look identical in the
          // data and mean opposite things. Say which one this is.
          entitled ? (
            <p className="muted">{t('lesson.noMaterials')}</p>
          ) : (
            <p className="muted">
              {namedCourse
                ? t('lesson.noAccess', { course: namedCourse })
                : t('lesson.noAccessUntitled')}
            </p>
          )
        ) : (
          <I18nProvider locale={shown.code} messages={playerWords}>
          <ul className="lessons">
            {lesson.resources.map((r) => {
              const nativeKind = nativeMediaKind(r);
              return (
                <li key={r.id}>
                  <span className="n">{t(RESOURCE_KEY[r.resourceType])}</span>
                  <span className="t">
                    {r.externalUrl && nativeKind === 'video' ? (
                      <VideoWithResume
                        name={r.displayName}
                        src={r.externalUrl}
                        enrolmentId={enrolmentId}
                        lessonId={lesson.id}
                        resourceId={r.id}
                        legacyActorId={user.id}
                        resumeAt={resumeAt}
                      />
                    ) : r.externalUrl && nativeKind === 'audio' ? (
                      <AudioPlayer
                        name={r.displayName}
                        src={r.externalUrl}
                        enrolmentId={enrolmentId}
                        lessonId={lesson.id}
                        resourceId={r.id}
                        legacyActorId={user.id}
                        resumeAt={resumeAt}
                      />
                    ) : r.externalUrl ? (
                      <a href={r.externalUrl} target="_blank" rel="noreferrer">
                        {r.displayName}
                      </a>
                    ) : r.mediaAssetId && (renditionsByAsset.get(r.mediaAssetId)?.length ?? 0) > 0 ? (
                      <RenditionPlayer
                        displayName={r.displayName}
                        lessonId={lesson.id}
                        resourceId={r.id}
                        renditions={renditionsByAsset.get(r.mediaAssetId) ?? []}
                        posterRenditionId={
                          posterFor(renditionsByAsset.get(r.mediaAssetId) ?? [])?.id ?? null
                        }
                        canDownload={canDownload}
                        courseTitle={courseTitle}
                        learnerProfileId={enrolment.learner_profile_id}
                        enrolmentId={enrolmentId}
                        legacyActorId={user.id}
                        resumeAt={resumeAt}
                        saveNote={
                          saveStanding && !saveStanding.allowed && saveStanding.needsPlus
                            ? // The database's sentence is English and says
                              // more; another language gets its own.
                              shown.code === 'en'
                              ? saveStanding.message
                              : t('player.plusNote')
                            : null
                        }
                      />
                    ) : r.mediaAssetId ? (
                      // A file with no player. What it says now depends on why —
                      // and the two why's ask the learner for opposite things:
                      // patience, or a report. The old copy was one sentence, in
                      // the voice of a database column, for six situations.
                      (() => {
                        const note = noteFor(standing.get(r.id) ?? null);
                        if (!note) {
                          // Never told: say nothing rather than guess. This is the
                          // page before the read existed, and it is not wrong, it
                          // is just quiet.
                          return <span className="muted">{r.displayName}</span>;
                        }
                        // The name is the teacher's; what follows is the
                        // reader's. The heading is not lower-cased into the
                        // sentence: that is an English habit, and wrong in
                        // scripts that have no case or use it differently.
                        return (
                          <span className="muted">
                            <strong><bdi>{r.displayName}</bdi></strong>
                            {' · '}
                            {t(note.headingKey)}
                            <span style={{ display: 'block' }}>{t(note.sentenceKey)}</span>
                            {note.tellSomeone && (
                              <span style={{ display: 'block', marginTop: '0.35rem' }}>
                                <ReportForm
                                  lessonId={lesson.id}
                                  label={t('lesson.recTell')}
                                  category="technical_fault"
                                  words={reportWords}
                                  locale={shown.code}
                                />
                              </span>
                            )}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="muted">{r.displayName}</span>
                    )}
                  </span>
                  {r.accessClassification === 'public_preview' && previewsOn && (
                    <span className="badge neutral">{t('course.preview')}</span>
                  )}
                </li>
              );
            })}
          </ul>
          </I18nProvider>
        )}
      </section>

      {entitled && practiceItems.length > 0 && (
        <PracticeCheck items={practiceItems} words={practiceWords} locale={shown.code} />
      )}

      {/* What the lesson rests on. The frame is the reader's; a source's title,
          author, edition and reference are the teacher's, shown as written and
          each finding its own direction. */}
      {provenanceOn && (
        <section className="card">
          <h2>{t('lesson.sourcesHeading')}</h2>
          {sources.length === 0 ? (
            <p className="muted">{t('lesson.sourcesNone')}</p>
          ) : (
            <ol className="lessons">
              {sources.map((source) => (
                <li key={source.id}>
                  <div className="t">
                    <strong id={`source-${source.id}`}><bdi>{source.title}</bdi></strong>
                    {source.authorOrCompiler && <span> · <bdi>{source.authorOrCompiler}</bdi></span>}
                    {source.editionOrVersion && <span> · <bdi>{source.editionOrVersion}</bdi></span>}
                    {source.referenceLocator && <span> · <bdi>{source.referenceLocator}</bdi></span>}
                    {source.anchor && (
                      <p className="muted" style={{ margin: '.2rem 0 0' }}>
                        {usedBefore}<bdi>{source.anchor}</bdi>{usedAfter}
                      </p>
                    )}
                    {/* On a line of its own: it used to run straight on from
                        the reference with no space between them. Every link
                        says the same words, so each is tied to its title. */}
                    {source.url && (
                      <p style={{ margin: '.2rem 0 0' }}>
                        <a href={source.url} target="_blank" rel="noreferrer" aria-describedby={`source-${source.id}`}>
                          {t('lesson.sourcesOpen')}
                        </a>
                      </p>
                    )}
                  </div>
                  <span className="badge neutral">{t(SOURCE_KEY[source.sourceType] ?? 'lesson.sourceOther')}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {studyTools && (
        <StudyTools
          enrolmentId={enrolmentId}
          lessonId={lesson.id}
          initialNote={studyTools.note}
          initiallyBookmarked={studyTools.bookmarked}
          words={studyWords}
          locale={shown.code}
        />
      )}

      {entitled && !done && (
        <section className="card">
          <div className="lesson-actions">
            <MarkComplete
              enrolmentId={enrolment.id}
              lessonId={lesson.id}
              initiallyDone={false}
              words={markWords}
            />
            <Link className="btn secondary" href={`/learn/${enrolmentId}`}>
              {t('lesson.backToCourse')}
            </Link>
          </div>
        </section>
      )}

      {entitled && done && (
        <p className="muted" style={{ marginBottom: 0 }}>
          {t('lesson.markedComplete')}
        </p>
      )}

      {/* The one thing a player must do is continue. A learner who has just
          finished lesson three of forty should not have to go back to a list to
          find lesson four. */}
      {entitled && steps.length > 0 && (
        <LessonNav
          enrolmentId={enrolmentId}
          previous={here.previous}
          next={here.next}
          words={{
            label: t('lesson.navLabel'),
            contents: t('lesson.contents'),
            back: t('lesson.backToCourse'),
            at:
              here.index > 0
                ? t('learn.carryMeta', { index: num(here.index), total: num(here.total) })
                : countLabel(shown.code, here.total, { one: 'card.lessonsOne', other: 'card.lessonsOther' }),
          }}
        />
      )}

      {/*
        The community safeguard. A reviewer checks a course before it is
        published; they cannot foresee every mistranslation or misattributed
        hadith, and the people reading the lesson are the ones who notice. This
        is the door that was missing.
      */}
      {entitled && (
        <section
          className="section"
          style={{ borderTop: '1px solid var(--line, #e6e8e6)', paddingTop: '1rem' }}
        >
          <ReportForm lessonId={lesson.id} words={reportWords} locale={shown.code} />
        </section>
      )}

      {discussionOn ? (
        <Discussion
          lessonId={lesson.id}
          posts={thread}
          enabled={discussionOn}
          canPost={entitled}
          words={discussionWords}
          reportWords={reportWords}
          locale={shown.code}
        />
      ) : (
        // What ships, since the switch is off: the same card the component
        // draws when it is closed, said in the reader's language.
        <section className="card">
          <h2>{t('lesson.discussion')}</h2>
          <p className="muted">{t('lesson.discussionClosed')}</p>
        </section>
      )}
    </div>
  );
}
