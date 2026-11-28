import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, formatDay, formatNumber, languageShownFor, playerMessagesFor, translator } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages/en';
import { SEVERITY, rehearsalBadgeOf, type RehearsalLesson } from '@/lib/lesson-preview';
import { fetchPlayableRenditions, groupByAsset, posterFor, type PlayableRendition } from '@/lib/playback';
import { CONFLICT_DESCRIPTION_MAX, fetchAssignment, isAssignmentWatchable, type ReviewAssignment } from '@/lib/review';
import {
  ASSIGNMENT_REFUSAL_KEY,
  BADGE_KEY,
  DECISION_BUTTON_KEY,
  assignmentIsOpen,
  assignmentSeatOf,
  isAssignmentId,
  type AssignmentConflictWords,
  type AssignmentWords,
} from '@/lib/review-assignment';
import {
  ASSIGNMENT_STATUS_KEY,
  CONFLICT_TYPE_KEY,
  DECISION_MADE_KEY,
  REGISTER_LIMITS,
  REGISTER_REFUSAL_KEY,
  SCOPE_KEY,
} from '@/lib/review-register';
import { fetchVersionReviewState } from '@/lib/review-requirements';
import { fetchTranscripts } from '@/lib/transcripts';
import { loadRehearsal, type LoadedRehearsal } from '@/lib/version-rehearsal';
import { RenditionPlayer } from '@/app/_shared/rendition-player';
import { RequirementPanel } from '@/app/_shared/requirement-panel';
import { VersionChecks } from '@/app/_shared/version-checks';
import { ConflictForm } from './conflict-form';
import { ReviewActions } from './review-actions';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'ra') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('review.title') };
}

/** Every value of a table of keys, said. */
function said<K extends string>(t: (key: MessageKey) => string, keys: Record<K, MessageKey>): Record<K, string> {
  return Object.fromEntries((Object.keys(keys) as K[]).map((name) => [name, t(keys[name])])) as Record<K, string>;
}

/** A read that may fail: its value, or null with the failure logged under a name. */
async function attempt<T>(what: string, read: () => Promise<T>): Promise<{ value: T } | null> {
  try {
    return { value: await read() };
  } catch (error) {
    console.error(`review assignment: ${what} could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

const NEXT_KEY = {
  [SEVERITY.empty]: 'ra.nextEmpty',
  [SEVERITY.silent]: 'ra.nextSilent',
  [SEVERITY.noted]: 'ra.nextNoted',
} as Record<number, MessageKey>;

/**
 * One assignment, with the content under review beside the controls.
 *
 * A reviewer is allowed to read what they were asked to review: that was a
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
 * the switch: somebody who finished or declined stops getting the media at that
 * moment, which is why this page says so rather than showing an empty player.
 *
 * **In the reader's language** since 2026-11-28 (`messages/review-assignment.ts`),
 * except the two panels shared with the author's and the staff's pages
 * (what the version needs, and what has been checked), which are still
 * English and are marked as English. The two forms run in the browser and
 * are handed their words. A course's, a section's, a lesson's and a file's
 * name are shown as written, each in its own direction.
 *
 * **A read that failed is said to have failed** (same day). Until then an
 * assignment that could not be read was "not found"; an outline that could
 * not be read was "This version has no sections. There is nothing to review";
 * delivery copies that could not be read were each "not encoded yet"; and a
 * failed read of the transcripts or of the requirements was an error page.
 *
 * **The decision form is offered on a review that can take a decision**: one
 * accepted or in progress, with none recorded. Until then it was also shown
 * on a declined, a cancelled and a completed one.
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
  // Text that is not an id names no assignment; the database would refuse it
  // as malformed, which is not a read that failed.
  if (!isAssignmentId(assignmentId)) notFound();

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const n = (value: number) => formatNumber(shown.code, value);

  const queueLink = (
    <p className="eyebrow">
      <Link href="/review">{t('review.title')}</Link>
    </p>
  );
  const foot = (
    <p className="review-foot">
      <Link href="/review">{t('ra.backQueue')}</Link>
    </p>
  );

  const found = await attempt('the assignment', () => fetchAssignment(supabase, assignmentId));
  if (!found) {
    return (
      <div className="container section review-page assignment-page" {...frame}>
        {queueLink}
        <div className="notice error" role="alert" data-assign-state="unread">{t('ra.unread')}</div>
        {foot}
      </div>
    );
  }
  if (!found.value) notFound();
  const assignment: ReviewAssignment = found.value;

  // Each of these can fail on its own. What failed is named here and said on
  // the page; nothing that was not read is described as if it had been.
  const unread: string[] = [];

  // What the version needs before it can publish, what has been checked on it, and
  // how the change was classified. A reviewer reads this before deciding, and may add
  // a technical check of their own: that is the one thing here they may write, since
  // what a version requires and how a change is classified are not theirs to change
  // while they are judging it.
  const reviewState = (await attempt('what the version needs', () => fetchVersionReviewState(supabase, assignment.courseVersionId)))?.value ?? null;
  if (!reviewState) unread.push('needs');

  // The outline, and the answer to the question a reviewer actually has: what does
  // a learner get from this? One read, shared with the author's own rehearsal, so
  // the person judging and the person who wrote it cannot be looking at different
  // facts.
  // Read before the rehearsal, not beside it: `previewsOn` decides whether a
  // free-preview lesson is annotated or warned about. When the switch cannot be
  // read the outline is still shown, and what a learner gets is not: a guess
  // there would put a warning on the reviewer's screen that is not true.
  const previews = await attempt('the previews switch', () => isFlagEnabled(supabase, 'learning.previews'));
  if (!previews) unread.push('switch');
  // `null` is a version this reader could not be given: a read that failed
  // inside `loadRehearsal()`, or a version no longer readable. For the
  // reviewer it was assigned to, neither is "no sections".
  const loaded: LoadedRehearsal | null = await loadRehearsal(supabase, assignment.courseVersionId, { previewsOn: previews?.value ?? false });

  const rehearsal = loaded && previews ? loaded.rehearsal : null;
  const sections = loaded?.version.sections ?? [];
  const lessonCount = sections.reduce((count, s) => count + s.lessons.length, 0);
  const transcriptsRead = await attempt('the transcripts', () => fetchTranscripts(supabase, sections.flatMap((s) => s.lessons.map((l) => l.id))));
  if (!transcriptsRead) unread.push('transcripts');
  const transcripts = transcriptsRead?.value ?? {};

  // What each lesson's rows say, keyed by lesson id: the same object the author's
  // preview page renders, so the reviewer's badges cannot mean something else.
  const rehearsalByLesson = new Map<string, RehearsalLesson>();
  for (const section of rehearsal?.sections ?? []) {
    for (const lesson of section.lessons) rehearsalByLesson.set(lesson.id, lesson);
  }

  // A reviewer judges what a learner will see, so the delivery copies of this
  // version's lessons are fetched here. `media_renditions_read` is
  // may_play_rendition(), which answers yes for an active assignment, so a
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

  let renditions: PlayableRendition[] | null = [];
  if (watchable) {
    const read = await attempt('the delivery copies', () =>
      fetchPlayableRenditions(supabase, [...resourcesByLesson.values()].flat().map((resource) => resource.mediaAssetId ?? '')));
    renditions = read?.value ?? null;
    if (!read) unread.push('media');
  }
  const renditionsByAsset = groupByAsset(renditions ?? []);
  // The player is drawn in the browser and has its own sentences, which no
  // page carries unless it hands them over. Until 2026-11-28 this page did
  // not, so a reviewer's player was English in every language.
  const playerWords = renditionsByAsset.size > 0 && shown.code !== 'en' ? playerMessagesFor(shown.code) : {};

  const seat = assignmentSeatOf(assignment);
  const words: AssignmentWords = {
    offerHead: t('ra.offerHead'), offerNote: t('ra.offerNote'), accept: t('ra.accept'), decline: t('ra.decline'),
    working: t('review.working'),
    recordHead: t('ra.recordHead'), reason: t('ra.reason'), reasonHint: t('ra.reasonHint'), approveNote: t('ra.approveNote'),
    decided: t('ra.decided'), closedNote: t('ra.closedNote'), notMoved: t('ra.notMoved'),
    decisionButton: said(t, DECISION_BUTTON_KEY),
    decisionMade: said(t, DECISION_MADE_KEY),
    refusals: said(t, ASSIGNMENT_REFUSAL_KEY),
    days: Object.fromEntries(assignment.decisions.map((d) => [d.id, formatDay(shown.code, d.decidedAt) || ''])),
  };
  const conflictWords: AssignmentConflictWords = {
    standHead: t('ra.standHead'), declared: t('ra.declared'), declareOpen: t('ra.declareOpen'), declareNote: t('ra.declareNote'),
    conflictKind: t('review.conflictKind'), describe: t('review.describe'), describeHint: t('review.describeHint'),
    declareIt: t('review.declareIt'), working: t('review.working'),
    conflictType: said(t, CONFLICT_TYPE_KEY),
    refusals: said(t, REGISTER_REFUSAL_KEY),
    limits: Object.fromEntries([...REGISTER_LIMITS, CONFLICT_DESCRIPTION_MAX].map((max) => [String(max), n(max)])),
  };

  const next = rehearsal?.next ?? null;
  const [nextBefore, nextAfter] = next && NEXT_KEY[next.severity] ? t(NEXT_KEY[next.severity] as MessageKey).split('{lesson}') : ['', ''];
  const [copyBefore, copyAfter] = t('ra.noCopy').split('{name}');

  return (
    <div className="container section review-page assignment-page" data-assign-state={assignment.status} data-assign-seat={seat} {...frame}>
      {queueLink}
      {/* No slug is no course that could be read: the library's English stand-in is not printed. */}
      {assignment.courseSlug === ''
        ? <h1>{t('review.untitled')}</h1>
        : <h1 dir="auto">{assignment.courseTitle}</h1>}
      <div className="badges">
        {SCOPE_KEY[assignment.scope] ? <span className="badge neutral">{t(SCOPE_KEY[assignment.scope])}</span> : null}
        {ASSIGNMENT_STATUS_KEY[assignment.status] ? (
          <span className={`badge ${assignment.status === 'offered' ? '' : 'neutral'}`}>{t(ASSIGNMENT_STATUS_KEY[assignment.status])}</span>
        ) : null}
      </div>

      {unread.length > 0 && (
        <div className="notice error assignment-gap" role="alert" data-assign-unread={unread.join(' ')}>{t('ra.partUnread')}</div>
      )}

      <div className="stats">
        <div>
          <div className="n">{loaded ? n(sections.length) : '—'}</div>
          <div className="l">{t('cpage.sections')}</div>
        </div>
        <div>
          <div className="n">{loaded ? n(lessonCount) : '—'}</div>
          <div className="l">{t('cpage.lessons')}</div>
        </div>
        <div>
          <div className="n">{n(assignment.decisions.length)}</div>
          <div className="l">{t('ra.decisions')}</div>
        </div>
      </div>

      {rehearsal && rehearsal.lessonCount > 0 && (
        <section className="card assignment-gist" data-assign-gist>
          <h2>{t('ra.gistHead')}</h2>

          {rehearsal.withSomething === rehearsal.lessonCount ? (
            <p>{t('ra.allOpen', { n: n(rehearsal.lessonCount) })}</p>
          ) : (
            <>
              <p>{t('ra.someOpen', { some: n(rehearsal.withSomething), all: n(rehearsal.lessonCount) })}</p>
              {rehearsal.withNothing > 0 && <p>{t('ra.nothing', { n: n(rehearsal.withNothing) })}</p>}
            </>
          )}
          {rehearsal.withTrouble > 0 && <p className="muted">{t('ra.trouble', { n: n(rehearsal.withTrouble) })}</p>}

          {next && NEXT_KEY[next.severity] && (
            <div className="notice assignment-next" data-assign-next={next.severity}>
              {nextBefore}<em><bdi>{next.lessonTitle}</bdi></em>{nextAfter}
              {rehearsal.nextAlso > 0 && (
                <span className="muted"> {t('ra.nextAlso', { n: n(rehearsal.nextAlso) })}</span>
              )}{' '}
              {assignment.courseId && (
                <Link href={`/teach/${assignment.courseId}/preview/${next.lessonId}`}>
                  {t('ra.asLearner')} <span className="dir-flip" aria-hidden>→</span>
                </Link>
              )}
            </div>
          )}

          {loaded && !loaded.deliveryKnown && <p className="muted">{t('ra.deliveryUnknown')}</p>}

          <p className="muted assignment-small">{t('ra.notVerdict')}</p>
        </section>
      )}

      <div className="outline-h assignment-head">
        <h3>{t('ra.outline')}</h3>
      </div>

      {!loaded ? (
        <div className="notice error" role="alert" data-assign-outline="unread">{t('ra.outlineUnread')}</div>
      ) : sections.length === 0 ? (
        <div className="empty" data-assign-outline="none">{t('ra.noSections')}</div>
      ) : (
        sections.map((s) => (
          <div className="card assignment-section" key={s.id}>
            <h3 dir="auto">
              {n(s.position)}. {s.title}
            </h3>
            {s.lessons.length === 0 ? (
              <p className="empty">{t('ra.noLessons')}</p>
            ) : (
              <ul className="lessons">
                {s.lessons.map((l) => {
                  const resources = resourcesByLesson.get(l.id) ?? [];
                  const told = rehearsalByLesson.get(l.id);
                  return (
                    <li key={l.id}>
                      <span className="t" dir="auto">
                        {n(l.position)}. {l.title}
                      </span>
                      {l.isPreview && <span className="badge">{t('cparts.prevFree')}</span>}
                      {/* The same badge the author sees, from the same object: a
                          reviewer and an author looking at one lesson must not be
                          told two different things about it. */}
                      {told && <span className="badge neutral" data-assign-badge={rehearsalBadgeOf(told)}>{t(BADGE_KEY[rehearsalBadgeOf(told)])}</span>}
                      {transcripts[l.id] && (
                        <details className="assignment-wide">
                          <summary>{t('lesson.transcript')}</summary>
                          <p className="assignment-transcript" dir="auto">{transcripts[l.id]}</p>
                        </details>
                      )}
                      {resources.length > 0 && renditions && (
                        <I18nProvider locale={shown.code} messages={playerWords}>
                        <span className="assignment-media">
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
                            ) : watchable ? (
                              <span className="muted assignment-small" key={r.id} data-assign-copy="none">
                                {copyBefore}<bdi>{r.resourceName}</bdi>{copyAfter}
                              </span>
                            ) : null;
                          })}
                        </span>
                        </I18nProvider>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))
      )}

      <p className="muted assignment-small" data-assign-watchable={watchable ? 'yes' : 'no'}>
        {watchable ? t('ra.watchable') : t('ra.notWatchable')}
      </p>

      <div className="outline-h assignment-head">
        <h3>{t('ra.needsHead')}</h3>
      </div>

      {reviewState ? (
        <>
          {shown.code !== 'en' && <p className="muted assignment-small">{t('ra.english')}</p>}
          {/* Shared with the author's page and the staff's, and not yet translated:
              marked as what it is, so that a screen reader reads it as English and
              it is laid out left to right inside a right-to-left page. */}
          <div lang="en" dir="ltr" data-assign-english>
            <RequirementPanel
              versionId={assignment.courseVersionId}
              requirements={reviewState.requirements}
              subjects={[]}
              blockedBecause={reviewState.blockedBecause}
              recountError={reviewState.recountError}
              canRequire={false}
              canWaive={false}
            />

            <div className="assignment-checks">
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
          </div>
        </>
      ) : null}

      <div className="outline-h assignment-head">
        <h3>{t('ra.decisionHead')}</h3>
      </div>

      <ReviewActions
        assignmentId={assignment.id}
        seat={seat}
        decisions={assignment.decisions.map((d) => ({ id: d.id, decision: d.decision, rationale: d.rationale }))}
        words={words}
      />

      {assignmentIsOpen(assignment.status) && (
        <div className="assignment-stand">
          <ConflictForm courseVersionId={assignment.courseVersionId} words={conflictWords} />
        </div>
      )}

      {foot}
    </div>
  );
}
