import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  canAccessLesson,
  fetchLesson,
  formatDuration,
  RESOURCE_LABEL,
} from '@/lib/lessons';
import { MarkComplete } from '../../mark-complete';

export const dynamic = 'force-dynamic';

type EnrolmentRow = {
  id: string;
  learner_profile_id: string;
  status: string;
  source: string;
  course_version_id: string;
  courses: { id: string; title: string }[] | null;
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

  const { data: progressData } = await supabase
    .from('lesson_progress')
    .select('lesson_id, status, progress_percent')
    .eq('course_enrolment_id', enrolmentId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  const progress = progressData as unknown as ProgressRow | null;
  const done = progress?.status === 'completed';

  const courseTitle = enrolment.courses?.[0]?.title ?? 'the course';
  const duration = formatDuration(lesson.durationSeconds);

  return (
    <main className="page narrow">
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
          {lesson.isPreview && (
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
            {lesson.resources.map((r) => (
              <li key={r.id}>
                <span className="n">{RESOURCE_LABEL[r.resourceType]}</span>
                <span className="t">
                  {r.externalUrl ? (
                    <a href={r.externalUrl} target="_blank" rel="noreferrer">
                      {r.displayName}
                    </a>
                  ) : (
                    // A media asset has no public URL by design: D8 keeps
                    // masters in our own storage and Stream is delivery only,
                    // so the playable URL is signed server-side at the moment
                    // of playback. Until that signing exists, saying so is
                    // more useful than rendering a link that goes nowhere.
                    <span className="muted">
                      {r.displayName} — playback not wired up yet
                    </span>
                  )}
                </span>
                {r.accessClassification === 'public_preview' && (
                  <span className="badge neutral">Preview</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {entitled && !done && (
        <section className="card">
          <div className="row">
            <MarkComplete
              enrolmentId={enrolment.id}
              lessonId={lesson.id}
              initiallyDone={false}
            />
            <Link className="btn" href={`/learn/${enrolmentId}`}>
              Back to course
            </Link>
          </div>
        </section>
      )}

      {entitled && done && (
        <p className="muted">
          Marked complete.{' '}
          <Link href={`/learn/${enrolmentId}`}>Back to course</Link>
        </p>
      )}
    </main>
  );
}
