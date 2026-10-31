import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ArabicInline } from '@/app/_shared/arabic-text';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { createClient } from '@/lib/supabase/server';
import { VERSION_STATUS_LABEL, type VersionStatus } from '@/lib/authoring';
import { durationLabel, previewOf, type AuthoredRow, type Playback } from '@/lib/lesson-preview';
import type { ResourceType } from '@/lib/lessons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lesson as a learner sees it' };

/**
 * One lesson, the way a learner meets it — before it reaches one.
 *
 * **Why this exists.** Every other part of authoring has something to look at: the
 * course, the curriculum, the requirements, the review state. The lesson itself —
 * the screen the learner actually spends their time on — was the one thing an
 * author could not see without publishing, enrolling, and becoming a different
 * person. That is the gap where a teacher adds a video, sees a tick, and learns
 * three weeks later from a student that the "video" was a page demanding a login
 * the teacher does not have.
 *
 * **It renders the learner's shapes, not a mock of them.** The eyebrow, the title
 * in its own direction, the description card, the Materials list with the
 * resource type beside each item — the same elements in the same order the lesson
 * page prints them. What it does not render is what needs an enrolment: progress,
 * notes, the discussion, the practice check, the download button. Those are named
 * in the banner rather than faked, because a preview that invented them would be a
 * preview of a page that does not exist.
 *
 * **The database decides who may look.** Resource rows on a draft are readable
 * only through `can_author_version()` in the read policy on `lesson_resources`.
 * The authorship check below turns a stranger's guessed URL into a 404 instead of
 * an empty page; it is a courtesy, not the boundary.
 *
 * **It says what will go wrong.** `previewOf()` returns the rows and the notes: an
 * empty lesson, a media item that will open as a link, a preview with no public
 * sample, a preview in an unpublished version.
 */
export default async function LessonPreviewPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { courseId, lessonId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(courseId) || !/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/teach/${courseId}/preview/${lessonId}`);

  const { data: courseRow } = await supabase
    .from('courses')
    .select('id, slug, title, created_by')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle();

  const course = courseRow as unknown as {
    id: string;
    slug: string;
    title: string;
    created_by: string;
  } | null;

  // `courses_read` admits any active course to any signed-in user, so the
  // ownership check is what makes this page the author's rather than everyone's.
  if (!course || course.created_by !== user.id) notFound();

  const { data: lessonRow } = await supabase
    .from('lessons')
    .select('id, title, description, type, duration_seconds, is_preview, section_id')
    .eq('id', lessonId)
    .maybeSingle();

  const lesson = lessonRow as unknown as {
    id: string;
    title: string;
    description: string | null;
    type: string;
    duration_seconds: number | null;
    is_preview: boolean;
    section_id: string;
  } | null;
  if (!lesson) notFound();

  const { data: sectionRow } = await supabase
    .from('course_sections')
    .select('id, title, course_version_id')
    .eq('id', lesson.section_id)
    .maybeSingle();

  const section = sectionRow as unknown as {
    id: string;
    title: string;
    course_version_id: string;
  } | null;
  if (!section) notFound();

  const { data: versionRow } = await supabase
    .from('course_versions')
    .select('id, version_number, version_status, course_id')
    .eq('id', section.course_version_id)
    .maybeSingle();

  const version = versionRow as unknown as {
    id: string;
    version_number: number;
    version_status: VersionStatus;
    course_id: string;
  } | null;
  // A lesson from another course's version is not this course's lesson, even
  // though the lesson id alone would still resolve.
  if (!version || version.course_id !== course.id) notFound();

  const [{ data: resourceRows }, previewsOn] = await Promise.all([
    supabase
      .from('lesson_resources')
      .select('id, display_name, resource_type, external_url, media_asset_id, access_classification')
      .eq('lesson_id', lesson.id)
      .order('position', { ascending: true }),
    isFlagEnabled(supabase, 'learning.previews').catch(() => false),
  ]);

  const resources: AuthoredRow[] = (resourceRows ?? []).map((row) => ({
    id: String(row.id),
    resourceName: String(row.display_name),
    resourceType: row.resource_type as ResourceType,
    externalUrl: row.external_url === null ? null : String(row.external_url),
    mediaAssetId: row.media_asset_id === null ? null : String(row.media_asset_id),
    access: row.access_classification as AuthoredRow['access'],
  }));

  const published = version.version_status === 'published';
  const preview = previewOf(
    {
      id: lesson.id,
      title: lesson.title,
      isPreview: lesson.is_preview,
      sectionTitle: section.title,
      description: lesson.description,
      durationSeconds: lesson.duration_seconds,
      resources,
    },
    { previewsOn, published },
  );

  const duration = durationLabel(lesson.duration_seconds);

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/teach">Teaching</Link>
        <span aria-hidden>›</span>
        <Link href={`/teach/${course.id}`}>{course.title}</Link>
        <span aria-hidden>›</span>
        <span>Preview</span>
      </nav>

      {/* The banner is the honesty of this page: what it is, who can reach the
          real thing, and what is missing because it needs an enrolment. */}
      <div className="notice" style={{ marginBottom: '1.25rem' }}>
        <strong>This is a rehearsal, not the live lesson.</strong>{' '}
        {published ? (
          <>
            Version {version.version_number} is published, so this is what a learner with access
            sees today.
          </>
        ) : (
          <>
            Version {version.version_number} is{' '}
            {VERSION_STATUS_LABEL[version.version_status].toLowerCase()} — nobody can open this
            lesson yet. What you see below is what will appear the day it goes live.
          </>
        )}{' '}
        <span className="muted">
          A learner with access also gets their progress, their own notes, the class discussion, a
          practice check and, where the course allows it, a download button. None of those are
          invented here, because a preview of a page that does not exist is worse than none.
        </span>
      </div>

      {preview.warnings.length > 0 && (
        <div className="notice" style={{ marginBottom: '1.25rem' }}>
          <strong>
            {published ? 'Worth fixing on this live lesson' : 'Before this reaches a learner'}
          </strong>
          <ul style={{ margin: '0.5rem 0 0', paddingInlineStart: '1.1rem' }}>
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="page-head">
        <p className="eyebrow">
          {section.title}
          {duration ? ` · ${duration}` : ''}
        </p>
        {/* A lesson may be named in Arabic — marking the run is what lets a
            screen reader switch voice instead of spelling the letters out. The
            learner page does exactly this. */}
        <h1>
          <ArabicInline text={lesson.title} />
        </h1>
        <div className="row" style={{ gap: '0.5rem', marginTop: '0.75rem' }}>
          {lesson.is_preview && previewsOn && <span className="badge neutral">Preview lesson</span>}
          {lesson.is_preview && !previewsOn && (
            <span className="badge neutral">Marked a preview, previews switched off</span>
          )}
          {/* Where the learner page prints "Not started", this page prints what
              it cannot print: nothing is recorded by looking. */}
          <span className="badge neutral">Preview — no progress recorded</span>
        </div>
      </div>

      {preview.hasDescription ? (
        <section className="card">
          <p style={{ margin: 0 }}>{lesson.description}</p>
        </section>
      ) : (
        // Not a learner-visible element: the learner page renders nothing here.
        // The dashed card exists so the author can see the gap, not so they
        // think a learner sees a box about it.
        <section className="card" style={{ borderStyle: 'dashed' }}>
          <p className="muted" style={{ margin: 0 }}>
            No description, so a learner goes straight from the title to the materials below.
          </p>
        </section>
      )}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Materials</h2>

        {preview.rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing has been attached to this lesson. This is what a learner would see: a title, and
            then this sentence.
          </p>
        ) : (
          <ul className="lessons">
            {preview.rows.map((row) => (
              <li key={row.id}>
                <span className="n">{row.label}</span>
                <span className="t" style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block' }}>{row.name}</span>
                  <span
                    className="muted"
                    style={{ display: 'block', fontSize: '0.85rem', marginTop: '0.15rem' }}
                  >
                    <Mark playback={row.playback} /> {row.sentence}
                  </span>
                  {row.url && (
                    // The learner's own address, opened the way the learner
                    // page opens it. Not an embedded player: this page must not
                    // pretend to be the thing it is describing, and an author
                    // clicking through wants to test the file, not the frame.
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.85rem' }}
                    >
                      Open the address a learner follows ↗
                    </a>
                  )}
                </span>
                {row.access === 'public_preview' && (
                  <span className="badge neutral" style={{ flex: 'none' }}>
                    Public preview
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="muted" style={{ marginBottom: 0, marginTop: '0.9rem', fontSize: '0.85rem' }}>
          {preview.rows.length === 0
            ? ''
            : preview.playable === 0
              ? 'None of these plays inside the page: every item opens somewhere else or not at all.'
              : `${preview.playable} of ${preview.rows.length} play inside the page, where a learner expects them.`}
        </p>
      </section>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/teach/${course.id}`}>Back to the curriculum</Link>
      </p>
    </div>
  );
}

/** A word before the sentence, so a scan down the list answers "what plays". */
function Mark({ playback }: { playback: Playback }) {
  const text =
    playback === 'video' || playback === 'audio'
      ? 'Player:'
      : playback === 'link'
        ? 'New tab:'
        : playback === 'download'
          ? 'File:'
          : playback === 'uploaded'
            ? 'Our file:'
            : 'Nothing:';
  return <strong>{text}</strong>;
}
