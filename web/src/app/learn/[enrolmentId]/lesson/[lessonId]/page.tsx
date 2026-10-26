import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  canAccessLesson,
  fetchLesson,
  formatDuration,
  nativeMediaKind,
  RESOURCE_LABEL,
} from '@/lib/lessons';
import { MarkComplete } from '../../mark-complete';
import { fetchThread } from '@/lib/discussion';
import { isFlagEnabled } from '@/lib/flags';
import { Discussion } from './discussion';
import { ReportForm } from './report-form';
import { fetchLessonSources } from '@/lib/provenance';
import { fetchLessonStudyTools } from '@/lib/lesson-study-tools';
import { StudyTools } from './study-tools';
import { fetchPlayableRenditions, groupByAsset, posterFor } from '@/lib/playback';
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
  const steps = entitled ? await fetchOutline(supabase, lesson.courseVersionId) : [];
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

  const { data: progressData } = await supabase
    .from('lesson_progress')
    .select('lesson_id, status, progress_percent')
    .eq('course_enrolment_id', enrolmentId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  const progress = progressData as unknown as ProgressRow | null;
  const done = progress?.status === 'completed';

  // Where this learner stopped, for every lesson in the enrolment, in one call.
  // `last_video_position` has been in the schema since the first progress
  // migration and nothing wrote it until now, so every player used to start at
  // zero — including a forty-minute recitation reopened the next evening.
  const { data: positionsData } = await supabase.rpc('lesson_positions', {
    p_enrolment_id: enrolmentId,
  });
  const positions = (positionsData ?? {}) as Record<string, number>;
  const savedPosition = positions[lesson.id];
  const resumeAt: number | null = entitled && typeof savedPosition === 'number'
    ? savedPosition
    : null;

  // Discussion is behind a flag, off by default, because the moderation policy
  // behind it is a human queue with a retention obligation attached. The thread
  // is only fetched when it is on — no reason to query a table nobody can see.
  const [discussionOn, provenanceOn, previewsOn, studyToolsOn, practiceOn] = await Promise.all([
    isFlagEnabled(supabase, 'learning.discussion'),
    isFlagEnabled(supabase, 'learning.provenance'),
    isFlagEnabled(supabase, 'learning.previews').catch(() => false),
    isFlagEnabled(supabase, 'learning.notes_bookmarks').catch(() => false),
    isFlagEnabled(supabase, 'learning.assessments').catch(() => false),
  ]);
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

  const [renditions, offlineOn] = await Promise.all([
    hasMedia ? fetchPlayableRenditions(supabase, assetIds) : Promise.resolve([]),
    hasMedia
      ? isFlagEnabled(supabase, 'learning.offline').catch(() => false)
      : Promise.resolve(false),
  ]);
  const renditionsByAsset = groupByAsset(renditions);

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

  const courseTitle = enrolment.courses?.[0]?.title ?? 'the course';
  const duration = formatDuration(lesson.durationSeconds);

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/learn">Dashboard</Link>
        <span aria-hidden>›</span>
        <Link href={`/learn/${enrolmentId}`}>{courseTitle}</Link>
        <span aria-hidden>›</span>
        <span>{lesson.sectionTitle}</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">
          {lesson.sectionTitle}
          {duration ? ` · ${duration}` : ''}
        </p>
        <h1>{lesson.title}</h1>
        <div className="row" style={{ gap: '0.5rem', marginTop: '0.75rem' }}>
          {lesson.isPreview && previewsOn && (
            <span className="badge neutral">Preview lesson</span>
          )}
          {done ? (
            <span className="badge ok">Completed</span>
          ) : (
            <span className="badge neutral">Not started</span>
          )}
        </div>
      </div>

      {lesson.description && (
        <section className="card">
          <p>{lesson.description}</p>
        </section>
      )}

      <section className="card">
        <h2>Materials</h2>

        {lesson.resources.length === 0 ? (
          // The two cases that produce an empty list look identical in the
          // data and mean opposite things. Say which one this is.
          entitled ? (
            <p className="muted">
              No materials have been attached to this lesson yet.
            </p>
          ) : (
            <p className="muted">
              You do not have access to this lesson&rsquo;s materials. Enrol in{' '}
              {courseTitle} to open them.
            </p>
          )
        ) : (
          <ul className="lessons">
            {lesson.resources.map((r) => {
              const nativeKind = nativeMediaKind(r);
              return (
                <li key={r.id}>
                  <span className="n">{RESOURCE_LABEL[r.resourceType]}</span>
                  <span className="t" style={{ minWidth: 0, flex: 1 }}>
                    {r.externalUrl && nativeKind === 'video' ? (
                      <VideoWithResume
                        name={r.displayName}
                        src={r.externalUrl}
                        enrolmentId={enrolmentId}
                        lessonId={lesson.id}
                        resumeAt={resumeAt}
                      />
                    ) : r.externalUrl && nativeKind === 'audio' ? (
                      <AudioPlayer
                        name={r.displayName}
                        src={r.externalUrl}
                        enrolmentId={enrolmentId}
                        lessonId={lesson.id}
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
                        resumeAt={resumeAt}
                        saveNote={
                          saveStanding && !saveStanding.allowed && saveStanding.needsPlus
                            ? saveStanding.message
                            : null
                        }
                      />
                    ) : r.mediaAssetId ? (
                      // The master exists but nothing has encoded a delivery copy
                      // yet, and a master is never served to a learner, so there
                      // is nothing honest to put in a player.
                      <span className="muted">
                        {r.displayName} — uploaded, not yet encoded for playback
                      </span>
                    ) : (
                      <span className="muted">{r.displayName}</span>
                    )}
                  </span>
                  {r.accessClassification === 'public_preview' && previewsOn && (
                    <span className="badge neutral">Preview</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {entitled && practiceItems.length > 0 && (
        <PracticeCheck items={practiceItems} />
      )}

      {provenanceOn && (
        <section className="card">
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
        <StudyTools
          enrolmentId={enrolmentId}
          lessonId={lesson.id}
          initialNote={studyTools.note}
          initiallyBookmarked={studyTools.bookmarked}
        />
      )}

      {entitled && !done && (
        <section className="card">
          <div className="row">
            <MarkComplete
              enrolmentId={enrolment.id}
              lessonId={lesson.id}
              initiallyDone={false}
            />
            <Link className="btn secondary" href={`/learn/${enrolmentId}`}>
              Back to course
            </Link>
          </div>
        </section>
      )}

      {entitled && done && (
        <p className="muted" style={{ marginBottom: 0 }}>
          Marked complete.
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
          index={here.index}
          total={here.total}
        />
      )}

      {/*
        The community safeguard. A reviewer checks a course before it is
        published; they cannot foresee every mistranslation or misattributed
        hadith, and the people reading the lesson are the ones who notice. This
        is the door that was missing.
      */}
      {entitled && (
        <section className="section" style={{ borderTop: '1px solid var(--line, #e6e8e6)', paddingTop: '1rem' }}>
          <ReportForm lessonId={lesson.id} />
        </section>
      )}

      <Discussion
        lessonId={lesson.id}
        posts={thread}
        enabled={discussionOn}
        canPost={entitled}
      />
    </div>
  );
}
