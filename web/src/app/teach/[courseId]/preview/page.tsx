import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { createClient } from '@/lib/supabase/server';
import { VERSION_STATUS_LABEL, type VersionStatus } from '@/lib/authoring';
import { byAsset, parseDelivery } from '@/lib/media-encoding';
import {
  rehearseVersion,
  SEVERITY,
  type AuthoredRow,
  type PreviewLesson,
  type RehearsalLesson,
} from '@/lib/lesson-preview';
import type { ResourceType } from '@/lib/lessons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'The version a learner meets' };

/**
 * Every lesson in one version, the way a learner meets it.
 *
 * **Why this exists.** The single-lesson preview answers "what does this one look
 * like", which is the question you ask with one lesson open. The question before
 * submitting is a different one: *is anything in here empty, and is anything
 * attached that a learner cannot actually open?* Answering that one lesson at a
 * time is how a teacher submits forty lessons and fixes three.
 *
 * **It reads like the course.** Sections and lessons in the order they are taught,
 * because a course re-sorted by brokenness stops looking like the thing its author
 * wrote. The "fix this first" answer sits above the list rather than rearranging
 * it — the same conclusion as the translation claim board, for the same reason:
 * with forty rows the useful question is what to do next.
 *
 * **Notes, not a gate.** Nothing here refuses a submission, and the page says so.
 * The submission requirements are on the curriculum page and in the review panel;
 * this is the rehearsal, and a teacher may know exactly why a lesson looks thin.
 *
 * **It is the author's screen.** The ownership check is the same as the editor's.
 * Every read underneath it is already bounded by row level security — resource
 * rows on a draft are readable only through `can_author_version()` — so a stranger
 * who guessed this URL would get an empty page and a 404 from the check above it.
 */
export default async function VersionRehearsalPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { courseId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/teach/${courseId}/preview`);

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

  // `courses_read` admits any active course to any signed-in user, so this is the
  // check that makes the page the author's rather than everyone's.
  if (!course || course.created_by !== user.id) notFound();

  const { data: versionRows } = await supabase
    .from('course_versions')
    .select('id, version_number, version_status')
    .eq('course_id', course.id)
    .order('version_number', { ascending: false });

  const versions = (versionRows ?? []) as unknown as {
    id: string;
    version_number: number;
    version_status: VersionStatus;
  }[];

  // The draft, or the newest version when there is no draft — the same choice the
  // editor makes, so the rehearsal is of the thing the teacher is about to change.
  const draft = versions.find((one) => one.version_status === 'draft');
  const current = draft ?? versions[0] ?? null;

  if (!current) {
    return (
      <div className="page">
        <nav className="crumbs">
          <Link href="/teach">Teaching</Link>
          <span aria-hidden>›</span>
          <Link href={`/teach/${course.id}`}>{course.title}</Link>
          <span aria-hidden>›</span>
          <span>Rehearsal</span>
        </nav>
        <h1>{course.title}</h1>
        <div className="empty">
          This course has no version yet, so there is nothing for a learner to meet.
        </div>
      </div>
    );
  }

  const { data: sectionRows } = await supabase
    .from('course_sections')
    .select('id, title, position')
    .eq('course_version_id', current.id)
    .order('position', { ascending: true });

  const sections = (sectionRows ?? []) as unknown as {
    id: string;
    title: string;
    position: number;
  }[];

  // Lessons first: their ids are what the resources query needs, and one query
  // for the whole version is the difference between three round trips and forty.
  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('id, section_id, title, description, duration_seconds, is_preview, position')
    .in('section_id', sections.map((section) => section.id))
    .order('position', { ascending: true });

  const lessons = (lessonRows ?? []) as unknown as {
    id: string;
    section_id: string;
    title: string;
    description: string | null;
    duration_seconds: number | null;
    is_preview: boolean;
    position: number;
  }[];

  const lessonIds = lessons.map((lesson) => lesson.id);

  const [{ data: resourceRows }, previewsOn, { data: deliveryData }] = await Promise.all([
    lessonIds.length === 0
      ? Promise.resolve({ data: [] as unknown[] })
      : supabase
          .from('lesson_resources')
          .select('id, lesson_id, display_name, resource_type, external_url, media_asset_id, access_classification, position')
          .in('lesson_id', lessonIds)
          .order('position', { ascending: true }),
    isFlagEnabled(supabase, 'learning.previews').catch(() => false),
    // One call for the whole version. The screen that shows a single lesson calls
    // the same function and keeps the rows for its lesson, so the three-person
    // guard is written once.
    supabase.rpc('version_delivery_state', { p_version_id: current.id }),
  ]);

  const delivery = byAsset(parseDelivery(deliveryData));

  const resourcesByLesson = new Map<string, AuthoredRow[]>();
  for (const row of (resourceRows ?? []) as unknown as {
    id: string;
    lesson_id: string;
    display_name: string;
    resource_type: string;
    external_url: string | null;
    media_asset_id: string | null;
    access_classification: string;
  }[]) {
    const assetId = row.media_asset_id === null ? null : String(row.media_asset_id);
    const list = resourcesByLesson.get(row.lesson_id) ?? [];
    list.push({
      id: String(row.id),
      resourceName: String(row.display_name),
      resourceType: row.resource_type as ResourceType,
      externalUrl: row.external_url === null ? null : String(row.external_url),
      mediaAssetId: assetId,
      encoding: assetId === null ? null : (delivery.get(assetId) ?? null),
      access: row.access_classification as AuthoredRow['access'],
    });
    resourcesByLesson.set(row.lesson_id, list);
  }

  const rehearsal = rehearseVersion(
    sections.map((section) => ({
      id: section.id,
      title: section.title,
      lessons: lessons
        .filter((lesson) => lesson.section_id === section.id)
        .map(
          (lesson): PreviewLesson => ({
            id: lesson.id,
            title: lesson.title,
            isPreview: lesson.is_preview,
            sectionTitle: section.title,
            description: lesson.description,
            durationSeconds: lesson.duration_seconds,
            resources: resourcesByLesson.get(lesson.id) ?? [],
          }),
        ),
    })),
    { previewsOn, published: current.version_status === 'published' },
  );

  const clean = rehearsal.withTrouble === 0 && rehearsal.lessonCount > 0;

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/teach">Teaching</Link>
        <span aria-hidden>›</span>
        <Link href={`/teach/${course.id}`}>{course.title}</Link>
        <span aria-hidden>›</span>
        <span>Rehearsal</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">
          Version {current.version_number} · {VERSION_STATUS_LABEL[current.version_status]}
        </p>
        <h1>Every lesson, as a learner meets it</h1>
        <p className="muted">
          {rehearsal.lessonCount === 0
            ? 'This version has no lessons yet.'
            : clean
              ? `All ${String(rehearsal.lessonCount)} lessons give a learner something to open.`
              : `${String(rehearsal.withSomething)} of ${String(rehearsal.lessonCount)} lessons give a learner something to open; ${String(rehearsal.withTrouble)} ${rehearsal.withTrouble === 1 ? 'has' : 'have'} something worth fixing.`}{' '}
          Nothing here blocks anything — a submission is judged on the curriculum page.
          This is the rehearsal.
        </p>
      </div>

      {rehearsal.next && (
        <section className="card" style={{ marginBottom: '1.25rem' }}>
          <p className="eyebrow" style={{ marginBottom: '0.35rem' }}>
            {rehearsal.next.severity === SEVERITY.empty
              ? 'Start here'
              : rehearsal.next.severity === SEVERITY.silent
                ? 'The one that looks finished and is not'
                : 'Worth a look'}
          </p>
          <p style={{ margin: '0 0 0.75rem' }}>
            <strong>{rehearsal.next.lessonTitle}</strong> {rehearsal.next.sentence}.
            {rehearsal.nextAlso > 0 && (
              <span className="muted">
                {' '}
                {rehearsal.nextAlso === 1
                  ? 'One other lesson is at the same stage.'
                  : `${String(rehearsal.nextAlso)} other lessons are at the same stage.`}
              </span>
            )}
          </p>
          <Link className="btn" href={`/teach/${course.id}/preview/${rehearsal.next.lessonId}`}>
            Open it as a learner →
          </Link>
        </section>
      )}

      {rehearsal.lessonCount === 0 ? (
        <div className="empty">
          A version with no lessons cannot be published, and there is nothing here for a learner to
          meet yet. Add a section and a lesson on the curriculum page.
        </div>
      ) : (
        rehearsal.sections.map((section) => (
          <section className="card" key={section.id} style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>{section.title}</h2>
            {section.lessons.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No lessons in this section.
              </p>
            ) : (
              <ul className="lessons">
                {section.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <span className="n">
                      {lesson.preview.rows.length === 0 ? 0 : lesson.preview.rows.length}
                    </span>
                    <span className="t" style={{ minWidth: 0, flex: 1 }}>
                      <Link href={`/teach/${course.id}/preview/${lesson.id}`}>{lesson.title}</Link>
                      {lesson.trouble.length > 0 ? (
                        <ul
                          className="muted"
                          style={{
                            listStyle: 'none',
                            margin: '0.35rem 0 0',
                            padding: 0,
                            fontSize: '0.9rem',
                            display: 'grid',
                            gap: '0.2rem',
                          }}
                        >
                          {lesson.trouble.map((one) => (
                            <li key={one}>{one}</li>
                          ))}
                        </ul>
                      ) : (
                        <span
                          className="muted"
                          style={{ display: 'block', fontSize: '0.9rem', marginTop: '0.15rem' }}
                        >
                          {lesson.preview.playable > 0
                            ? `A learner gets ${String(lesson.preview.playable)} thing${lesson.preview.playable === 1 ? '' : 's'} to play.`
                            : 'Everything here opens somewhere else, which a learner expects for a file.'}
                        </span>
                      )}
                    </span>
                    <Badge lesson={lesson} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/teach/${course.id}`}>Back to the curriculum</Link>
      </p>
    </div>
  );
}

/** A word for how a lesson reads, so a scan down forty rows finds the bad ones. */
function Badge({ lesson }: { lesson: RehearsalLesson }) {
  if (lesson.preview.rows.length === 0) return <span className="badge neutral">Nothing in it</span>;
  if (lesson.severity === SEVERITY.silent) return <span className="badge neutral">Nothing to play</span>;
  if (lesson.severity === SEVERITY.noted) return <span className="badge neutral">Worth a look</span>;
  return <span className="badge ok">Ready</span>;
}
