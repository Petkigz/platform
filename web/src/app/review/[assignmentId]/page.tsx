import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchSections } from '@/lib/authoring';
import {
  ASSIGNMENT_STATUS_LABEL,
  SCOPE_LABEL,
  fetchAssignment,
  isAssignmentWatchable,
} from '@/lib/review';
import { fetchMediaResourcesForLessons, type LessonMediaResource } from '@/lib/lessons';
import { fetchPlayableRenditions, groupByAsset, posterFor } from '@/lib/playback';
import { RenditionPlayer } from '@/app/_shared/rendition-player';
import { ConflictForm } from './conflict-form';
import { ReviewActions } from './review-actions';

export const dynamic = 'force-dynamic';

/**
 * One assignment, with the content under review beside the controls.
 *
 * A reviewer is allowed to read what they were asked to review — that was a
 * real defect before `20261021000100_authz_fixes.sql`: `can_read_version()`
 * covers assigned reviewers, and `can_review_version()` is a SELECT-only
 * grant, so being asked to review something never lets you change it.
 *
 * `cra_read` decides whether this page renders at all. Someone who is neither
 * the assigned reviewer nor able to see the review gets a 404 rather than a
 * permission error, because the difference between "not yours" and "does not
 * exist" is not worth leaking.
 *
 * Reading the outline was never enough to review a lesson, though: until
 * `20261213000100_reviewer_media_access.sql` a reviewer could see the row naming
 * a lesson's media and could not be served a byte of it. While an assignment is
 * accepted or in progress, its lessons' delivery copies play here. The state is
 * the switch — somebody who finished or declined stops getting the media at that
 * moment, which is why this page says so rather than showing an empty player.
 */
export default async function ReviewAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { assignmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/sign-in?next=/review/${assignmentId}`);

  const assignment = await fetchAssignment(supabase, assignmentId);
  if (!assignment) notFound();

  const sections = await fetchSections(supabase, assignment.courseVersionId).catch(() => []);
  const lessonCount = sections.reduce((n, s) => n + s.lessons.length, 0);

  // A reviewer judges what a learner will see, so the delivery copies of this
  // version's lessons are fetched here. `media_renditions_read` is
  // may_play_rendition(), which now answers yes for an active assignment, so a
  // closed one simply comes back empty rather than being filtered on this side.
  const watchable = isAssignmentWatchable(assignment.status);
  const mediaResources = watchable
    ? await fetchMediaResourcesForLessons(
        supabase,
        sections.flatMap((s) => s.lessons.map((l) => l.id)),
      ).catch(() => [] as LessonMediaResource[])
    : [];
  const renditions = watchable
    ? await fetchPlayableRenditions(
        supabase,
        mediaResources.map((r) => r.mediaAssetId ?? ''),
      ).catch(() => [])
    : [];
  const renditionsByAsset = groupByAsset(renditions);
  const resourcesByLesson = new Map<string, LessonMediaResource[]>();
  for (const resource of mediaResources) {
    const list = resourcesByLesson.get(resource.lessonId) ?? [];
    list.push(resource);
    resourcesByLesson.set(resource.lessonId, list);
  }

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/review">Review queue</Link>
      </p>
      <h1>{assignment.courseTitle}</h1>
      <p className="lede">
        {SCOPE_LABEL[assignment.scope]} review ·{' '}
        {ASSIGNMENT_STATUS_LABEL[assignment.status]}
      </p>

      <div className="stats">
        <div>
          <div className="n">{sections.length}</div>
          <div className="l">Sections</div>
        </div>
        <div>
          <div className="n">{lessonCount}</div>
          <div className="l">Lessons</div>
        </div>
        <div>
          <div className="n">{assignment.decisions.length}</div>
          <div className="l">Decisions</div>
        </div>
      </div>

      <div className="outline-h" style={{ marginTop: '1.75rem' }}>
        <h3>Outline</h3>
      </div>

      {sections.length === 0 ? (
        <div className="empty">
          This version has no sections. There is nothing to review, and it
          cannot be published.
        </div>
      ) : (
        sections.map((s) => (
          <div className="card" key={s.id} style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>
              {s.position}. {s.title}
            </h3>
            {s.lessons.length === 0 ? (
              <p className="empty" style={{ marginBottom: 0 }}>
                No lessons.
              </p>
            ) : (
              <ul className="lessons">
                {s.lessons.map((l) => {
                  const resources = resourcesByLesson.get(l.id) ?? [];
                  return (
                    <li key={l.id}>
                      <span className="t">
                        {l.position}. {l.title}
                      </span>
                      {l.isPreview && (
                        <span className="badge" style={{ flex: 'none' }}>
                          Free preview
                        </span>
                      )}
                      {resources.length > 0 && (
                        <span style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
                          {resources.map((r) => {
                            const playable = renditionsByAsset.get(r.mediaAssetId ?? '') ?? [];
                            return playable.length > 0 ? (
                              <RenditionPlayer
                                key={r.id}
                                displayName={r.displayName}
                                lessonId={l.id}
                                resourceId={r.id}
                                renditions={playable}
                                posterRenditionId={posterFor(playable)?.id ?? null}
                                // Watching is not saving: offline copies are an
                                // entitlement a learner holds, and a reviewer has
                                // no entitlement to this version at all.
                                canDownload={false}
                              />
                            ) : (
                              <span className="muted" key={r.id} style={{ fontSize: '0.9rem' }}>
                                {r.displayName}: no delivery copy encoded yet, so there is
                                nothing to watch.
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))
      )}

      <p className="muted" style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
        {watchable
          ? 'You can watch the delivery copies of these lessons while this review is open. You cannot save them, and the file a teacher uploaded is not served to you: what is under review is what a learner will see.'
          : `This assignment is ${ASSIGNMENT_STATUS_LABEL[assignment.status].toLowerCase()}, so its lessons are not playable. Media is served while a review is open, and stops the moment it is not.`}
      </p>

      <div className="outline-h" style={{ marginTop: '1.75rem' }}>
        <h3>Your decision</h3>
      </div>

      <ReviewActions assignment={assignment} />

      <div style={{ marginTop: '1.5rem' }}>
        <ConflictForm courseVersionId={assignment.courseVersionId} />
      </div>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/review">Back to the queue</Link>
      </p>
    </div>
  );
}
