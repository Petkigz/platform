import { fetchTranscripts } from '@/lib/transcripts';
import { ArabicInline } from '@/app/_shared/arabic-text';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
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
  translator,
  type MessageKey,
} from '@/lib/i18n';
import { MarkComplete, type MarkCompleteWords } from '../../mark-complete';
import { fetchThread } from '@/lib/discussion';
import { isFlagEnabled } from '@/lib/flags';
import { Discussion } from './discussion';
import { ReportForm } from './report-form';
import { fetchLessonSources } from '@/lib/provenance';
import { fetchLessonStudyTools } from '@/lib/lesson-study-tools';
import { StudyTools } from './study-tools';
import { fetchPlayableRenditions, groupByAsset, posterFor } from '@/lib/playback';
import { lessonNote, noteFor, parseStanding } from '@/lib/playback-standing';
import { RenditionPlayer } from '@/app/_shared/rendition-player';
import { AudioPlayer, VideoWithResume } from '@/app/_shared/media-resume';
import { fetchAssessmentsForVersion, fetchQuestions } from '@/lib/assessment';
import { practiceForLesson } from '@/lib/practice';
import { PracticeCheck, type PracticeItem } from './practice-check';
import { recordEvent } from '@/lib/analytics-server';
import { fetchOutline } from '@/lib/outline-query';
import { lessonNeighbours } from '@/lib/outline';
import { LessonNav } from '@/app/_shared/lesson-nav';

export const dynamic = 'force-dynamic';

type EnrolmentRow = {
  id: string;
  learner_profile_id: string;
  status: string;
  source: string;
  course_version_id: string;
  courses: { id: string; title: string }[] | null;
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
 * English, marked as English, where it does not. Everything a client component
 * says is still English for everybody and is marked so here: the players and
 * their saved-place messages, the note for a recording that will not play, the
 * report form, practice questions, notes, sources and the discussion. What a
 * teacher wrote is shown as written.
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
  // For the parts of this page that are English whatever the reader chose.
  const english = shown.code === 'en' ? {} : ({ lang: 'en', dir: 'ltr' } as const);
  const markWords: MarkCompleteWords = {
    mark: t('course.markComplete'),
    undo: t('course.undo'),
    saving: t('course.saving'),
    unconfirmed: t('course.unconfirmed'),
    reload: t('course.reload'),
  };

  const { data: enrolmentData } = await supabase
    .from('course_enrolments')
    .select(
      'id, learner_profile_id, status, source, course_version_id, courses ( id, title )',
    )
    .eq('id', enrolmentId)
    .eq('deleted_at', null)
    .maybeSingle();

  const enrolment = enrolmentData as unknown as EnrolmentRow | null;
  if (!enrolment) notFound();

  // Not a permission check so much as a sanity check: RLS already hides
  // someone else's enrolment, so this fires when the id is stale or wrong.
  if (enrolment.learner_profile_id) {
    const { data: profile } = await supabase
      .from('learner_profiles')
      .select('id')
      .eq('id', enrolment.learner_profile_id)
      .maybeSingle();
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

  // A player, or the note that stands in for one, speaks English and is marked
  // as English on a page in another language. A plain name or link is the
  // teacher's and is left alone.
  const englishMaterials = new Set(
    lesson.resources
      .filter((r) =>
        r.externalUrl
          ? nativeMediaKind(r) !== null
          : Boolean(r.mediaAssetId) &&
            ((renditionsByAsset.get(r.mediaAssetId ?? '')?.length ?? 0) > 0 ||
              noteFor(standing.get(r.id) ?? null) !== null))
      .map((r) => r.id),
  );

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

  const namedCourse = enrolment.courses?.[0]?.title ?? null;
  // The players are English and are handed an English name for a course whose
  // title could not be read, as before.
  const courseTitle = namedCourse ?? 'the course';
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
        <div className="notice" style={{ marginBottom: '1rem' }} {...english}>
          <strong>{summary.heading}.</strong> {summary.sentence}
          {summary.tellSomeone && (
            <span style={{ display: 'block', marginTop: '0.5rem' }}>
              <ReportForm
                lessonId={lesson.id}
                label="Tell us about this recording"
                category="technical_fault"
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
          <ul className="lessons">
            {lesson.resources.map((r) => {
              const nativeKind = nativeMediaKind(r);
              const speaksEnglish = englishMaterials.has(r.id);
              return (
                <li key={r.id}>
                  <span className="n">{t(RESOURCE_KEY[r.resourceType])}</span>
                  <span className="t" {...(speaksEnglish ? english : {})}>
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
                            ? saveStanding.message
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
                        return (
                          <span className="muted">
                            <strong>{r.displayName}</strong> — {note.heading.toLowerCase()}.{' '}
                            {note.sentence}
                            {note.tellSomeone && (
                              <span style={{ display: 'block', marginTop: '0.35rem' }}>
                                <ReportForm
                                  lessonId={lesson.id}
                                  label="Tell us about this recording"
                                  category="technical_fault"
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
        )}
      </section>

      {entitled && practiceItems.length > 0 && (
        <div {...english}>
          <PracticeCheck items={practiceItems} />
        </div>
      )}

      {provenanceOn && (
        <section className="card" {...english}>
          <h2>Sources and references</h2>
          {sources.length === 0 ? (
            <p className="muted">No references are listed for this lesson yet.</p>
          ) : (
            <ol className="lessons">
              {sources.map((source) => (
                <li key={source.id}>
                  <div className="t">
                    <strong>{source.title}</strong>
                    {source.authorOrCompiler && <span> · {source.authorOrCompiler}</span>}
                    {source.editionOrVersion && <span> · {source.editionOrVersion}</span>}
                    {source.referenceLocator && <span> · {source.referenceLocator}</span>}
                    {source.anchor && <p className="muted" style={{ margin: '.2rem 0 0' }}>Used at: {source.anchor}</p>}
                    {source.url && <a href={source.url} target="_blank" rel="noreferrer">Open source</a>}
                  </div>
                  <span className="badge neutral">{source.sourceType.replaceAll('_', ' ')}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {studyTools && (
        <div {...english}>
          <StudyTools
            enrolmentId={enrolmentId}
            lessonId={lesson.id}
            initialNote={studyTools.note}
            initiallyBookmarked={studyTools.bookmarked}
          />
        </div>
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
          {...english}
        >
          <ReportForm lessonId={lesson.id} />
        </section>
      )}

      {discussionOn ? (
        <div {...english}>
          <Discussion
            lessonId={lesson.id}
            posts={thread}
            enabled={discussionOn}
            canPost={entitled}
          />
        </div>
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
