import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { loadRehearsal } from '@/lib/version-rehearsal';
import { isFlagEnabled } from '@/lib/flags';
import { SEVERITY, type RehearsalLesson } from '@/lib/lesson-preview';
import {
  ASSIGNMENT_STATUS_LABEL,
  SCOPE_LABEL,
  fetchAssignment,
  isAssignmentWatchable,
} from '@/lib/review';
import { fetchPlayableRenditions, groupByAsset, posterFor } from '@/lib/playback';
import { RenditionPlayer } from '@/app/_shared/rendition-player';
import { fetchVersionReviewState } from '@/lib/review-requirements';
import { RequirementPanel } from '@/app/_shared/requirement-panel';
import { VersionChecks } from '@/app/_shared/version-checks';
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

  // What the version needs before it can publish, what has been checked on it, and
  // how the change was classified. A reviewer reads this before deciding, and may add
  // a technical check of their own — that is the one thing here they may write, since
  // what a version requires and how a change is classified are not theirs to change
  // while they are judging it.
  const reviewState = await fetchVersionReviewState(supabase, assignment.courseVersionId);

  // The outline, and the answer to the question a reviewer actually has: what does
  // a learner get from this? One read, shared with the author's own rehearsal, so
  // the person judging and the person who wrote it cannot be looking at different
  // facts. `null` means the version is not readable at all, which for an assigned
  // reviewer should not happen.
  // Read before the rehearsal, not beside it: `previewsOn` decides whether a
  // free-preview lesson is annotated or warned about, and passing a guess would
  // put a warning on the reviewer's screen that is not true.
  const previewsOn = await isFlagEnabled(supabase, 'learning.previews').catch(() => false);
  const loaded = await loadRehearsal(supabase, assignment.courseVersionId, { previewsOn }).catch(
    () => null,
  );

  const rehearsal = loaded?.rehearsal ?? null;
  const sections = loaded?.version.sections ?? [];
  const lessonCount = sections.reduce((n, s) => n + s.lessons.length, 0);

  // What each lesson's rows say, keyed by lesson id — the same object the author's
  // preview page renders, so the reviewer's badges cannot mean something else.
  const rehearsalByLesson = new Map<string, RehearsalLesson>();
  for (const section of rehearsal?.sections ?? []) {
    for (const lesson of section.lessons) rehearsalByLesson.set(lesson.id, lesson);
  }

  // A reviewer judges what a learner will see, so the delivery copies of this
  // version's lessons are fetched here. `media_renditions_read` is
  // may_play_rendition(), which now answers yes for an active assignment, so a
  // closed one simply comes back empty rather than being filtered on this side.
  const watchable = isAssignmentWatchable(assignment.status);

  // Uploaded files, taken from the outline read above rather than from a second
  // query for the same rows. External links are not players and are not listed
  // here: this page shows what can be watched, and the rehearsal beside it is
  // where a link is described for what it is.
  const resourcesByLesson = new Map<string, typeof sections[number]['lessons'][number]['resources']>();
  for (const section of sections) {
    for (const lesson of section.lessons) {
      const media = lesson.resources.filter((resource) => resource.mediaAssetId !== null);
      if (media.length > 0) resourcesByLesson.set(lesson.id, media);
    }
  }

  const renditions = watchable
    ? await fetchPlayableRenditions(
        supabase,
        [...resourcesByLesson.values()]
          .flat()
          .map((resource) => resource.mediaAssetId ?? ''),
      ).catch(() => [])
    : [];
  const renditionsByAsset = groupByAsset(renditions);

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

      {rehearsal && rehearsal.lessonCount > 0 && (
        <section className="card" style={{ marginTop: '1.75rem' }}>
          <h2 style={{ marginTop: 0 }}>What a learner gets</h2>

          <p style={{ marginBottom: '0.5rem' }}>
            {rehearsal.withSomething === rehearsal.lessonCount ? (
              <>
                All {String(rehearsal.lessonCount)} lessons give a learner something to open.
              </>
            ) : (
              <>
                <strong>
                  {String(rehearsal.withSomething)} of {String(rehearsal.lessonCount)}
                </strong>{' '}
                lessons give a learner something to open
                {rehearsal.withNothing > 0 && (
                  <>
                    , and{' '}
                    <strong>
                      {String(rehearsal.withNothing)} {rehearsal.withNothing === 1 ? 'gives' : 'give'}
                    </strong>{' '}
                    them nothing at all
                  </>
                )}
                .
              </>
            )}{' '}
            {rehearsal.withTrouble > 0 && (
              <span className="muted">
                {String(rehearsal.withTrouble)} {rehearsal.withTrouble === 1 ? 'has' : 'have'}{' '}
                something worth knowing before this reaches a learner.
              </span>
            )}
          </p>

          {rehearsal.next && (
            <div className="notice" style={{ marginBottom: '0.75rem' }}>
              <strong>
                {rehearsal.next.severity === SEVERITY.empty
                  ? 'Worth opening first:'
                  : rehearsal.next.severity === SEVERITY.silent
                    ? 'Looks finished, and is not:'
                    : 'Worth a look:'}
              </strong>{' '}
              <em>{rehearsal.next.lessonTitle}</em> {rehearsal.next.sentence}.
              {rehearsal.nextAlso > 0 && (
                <span className="muted">
                  {' '}
                  {rehearsal.nextAlso === 1
                    ? 'One other lesson is at the same stage.'
                    : `${String(rehearsal.nextAlso)} other lessons are at the same stage.`}
                </span>
              )}{' '}
              {assignment.courseId && (
                <Link href={`/teach/${assignment.courseId}/preview/${rehearsal.next.lessonId}`}>
                  See it as a learner →
                </Link>
              )}
            </div>
          )}

          {loaded && !loaded.deliveryKnown && (
            <p className="muted" style={{ marginBottom: '0.5rem' }}>
              The encoding state of uploaded files could not be read just now, so a file shown
              without a player may be one nobody asked about rather than one that failed.
            </p>
          )}

          <p className="muted" style={{ marginBottom: 0, fontSize: '0.9rem' }}>
            This says what a learner would meet, not what to decide. The decision is yours, and
            nothing here is a reason to accept or decline on its own — a scholarly review is about
            what is taught, and this is about what arrives.
          </p>
        </section>
      )}

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
                      {/* The same badge the author sees, from the same object: a
                          reviewer and an author looking at one lesson must not be
                          told two different things about it. */}
                      {rehearsalByLesson.get(l.id) && (
                        <span className="badge neutral" style={{ flex: 'none' }}>
                          {badgeFor(rehearsalByLesson.get(l.id))}
                        </span>
                      )}
                      {resources.length > 0 && (
                        <span style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
                          {resources.map((r) => {
                            const playable = renditionsByAsset.get(r.mediaAssetId ?? '') ?? [];
                            return playable.length > 0 ? (
                              <RenditionPlayer
                                key={r.id}
                                displayName={r.resourceName}
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
                                {r.resourceName}: no delivery copy has been encoded yet, so
                                there is nothing to watch and a learner would get a sentence where
                                the player should be.
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
        <h3>What this version needs, and what has been checked</h3>
      </div>

      <RequirementPanel
        versionId={assignment.courseVersionId}
        requirements={reviewState.requirements}
        subjects={[]}
        blockedBecause={reviewState.blockedBecause}
        recountError={reviewState.recountError}
        canRequire={false}
        canWaive={false}
      />

      <div style={{ marginTop: '1rem' }}>
        <VersionChecks
          versionId={assignment.courseVersionId}
          latestChecks={reviewState.latestChecks}
          checks={reviewState.checks}
          assessments={reviewState.assessments}
          versions={[]}
          canCheck={assignment.status === 'accepted' || assignment.status === 'in_progress'}
          canAssess={false}
        />
      </div>

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

/**
 * A word for how a lesson reads, so a scan down a long outline finds the bad ones.
 *
 * Deliberately the same four words as the author's rehearsal page. Two screens
 * describing one lesson with two vocabularies is how a reviewer and an author end
 * up disagreeing about whether something is wrong.
 */
function badgeFor(lesson: RehearsalLesson | undefined): string {
  if (!lesson) return '';
  if (lesson.preview.rows.length === 0) return 'Nothing in it';
  if (lesson.severity === SEVERITY.silent) return 'Nothing to play';
  if (lesson.severity === SEVERITY.noted) return 'Worth a look';
  return 'Ready';
}
