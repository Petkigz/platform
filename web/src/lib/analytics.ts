/**
 * The behavioural events this app records, mirroring `analytics_event_codes`.
 *
 * The list is closed in the database: `record_analytics_event()` refuses a code
 * that is not there. This file is the client's copy, and `isAnalyticsEvent()`
 * exists so a typo in a call site is caught by a test rather than by a silent
 * `recorded:false` in production.
 *
 * What this is not: analytics that runs before sign-in. Nothing is tracked for a
 * signed-out visitor, no cookie is set, and no identifier is generated. If you
 * cannot see a `user.id`, nothing is recorded — see `record_analytics_event()`.
 */

export const ANALYTICS_EVENTS = {
  lessonOpened: 'lesson.opened',
  courseViewed: 'course.viewed',
  searchPerformed: 'search.performed',
  planViewed: 'plan.viewed',
  checkoutStarted: 'checkout.started',
  downloadSaved: 'download.saved',
  liveJoined: 'live.joined',
  // The two that record a door, not a person. See `ENROL_REFUSALS` below: a
  // refusal leaves no row in any operational table, which is exactly why it is
  // the one thing worth adding to a store that keeps forever.
  enrolRefused: 'enrol.refused',
  lessonSaveRefused: 'lesson.save_refused',
} as const;

export type AnalyticsEventCode = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

const CODES: readonly string[] = Object.values(ANALYTICS_EVENTS);

/** True when the string is one of the nine codes the database will accept. */
export function isAnalyticsEvent(value: unknown): value is AnalyticsEventCode {
  return typeof value === 'string' && CODES.includes(value);
}

/**
 * The same `subject_type` the database pins per code. Sending a plan id for a
 * lesson event is refused by `record_analytics_event()`, so the client keeps the
 * expected one beside the label rather than guessing.
 */
export const ANALYTICS_SUBJECT_TYPE: Record<AnalyticsEventCode, string> = {
  'lesson.opened': 'lesson',
  'course.viewed': 'course_version',
  'search.performed': 'none',
  'plan.viewed': 'plan',
  'checkout.started': 'plan_version',
  'download.saved': 'lesson',
  'live.joined': 'live_session',
  'enrol.refused': 'course',
  'lesson.save_refused': 'lesson',
};

/** Which codes name a learner, mirroring `learner_scoped` in the database. */
export const ANALYTICS_LEARNER_SCOPED: readonly AnalyticsEventCode[] = [
  'lesson.opened',
  'checkout.started',
  'download.saved',
  'live.joined',
];

/** What each code means, in the words the admin report uses. */
export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEventCode, string> = {
  'lesson.opened': 'A learner opened a lesson',
  'course.viewed': 'Someone looked at a course page',
  'search.performed': 'A catalogue search ran',
  'plan.viewed': 'Someone looked at a subscription plan',
  'checkout.started': 'Checkout was opened for a plan',
  'download.saved': 'A lesson was saved inside the app',
  'live.joined': 'A learner entered a live class',
  'enrol.refused': 'Someone pressed enrol and the course did not open',
  'lesson.save_refused': 'Someone tried to keep a lesson and could not',
};

/**
 * The reasons an enrol attempt is worth counting.
 *
 * A refusal is a dead end: the person meant to start learning and the platform
 * said no. These five are the ways that happens. `already_enrolled` is the success
 * case wearing a button's clothes and `no_learner_profile` is a setup step — either
 * would dominate the count without telling anybody anything actionable, so neither
 * is a refusal as far as this module is concerned.
 */
export const ENROL_REFUSALS: Record<string, string> = {
  guardian_verification_required:
    'A verified parent or guardian had not completed the consent review',
  not_sold_here: 'The course is sold, but not yet in the buyer’s country',
  payment_required: 'The course is paid, and checkout is not open for it yet',
  no_published_version: 'The course exists but has no published version open for enrolment',
  not_available: 'The database refused the enrolment without saying which rule stopped it',
};

export function isEnrolRefusal(code: unknown): code is string {
  return typeof code === 'string' && code in ENROL_REFUSALS;
}

/**
 * The reasons a save attempt is worth counting.
 *
 * The vocabulary `lesson_download_standing()` already returns, so this is a copy of
 * a closed list rather than a second opinion. `needs_plus` is the one that earns the
 * event: it is a learner on Basic asking for something Plus exists to sell.
 */
export const SAVE_REFUSALS: Record<string, string> = {
  not_entitled: 'Watching the lesson does not include keeping it',
  needs_plus: 'Saving is a Plus feature and this plan does not carry it',
  no_media: 'The lesson has no verified media to keep',
  not_encoded: 'The media has no encoded copy to hand out yet',
  feature_off: 'Saving lessons is switched off on this deployment',
};

export function isSaveRefusal(reason: unknown): reason is string {
  return typeof reason === 'string' && reason in SAVE_REFUSALS;
}

export type AnalyticsEvent = {
  code: AnalyticsEventCode;
  subjectId?: string | null;
  learnerProfileId?: string | null;
  properties?: Record<string, unknown>;
};

/**
 * Send one event. Fire and forget, by design: an instrumentation call must never
 * be able to break the page it is watching, so every failure — offline, signed
 * out, flag off, server error — resolves quietly.
 */
export async function track(event: AnalyticsEvent): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsEvent(event.code)) return;
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // `keepalive` so a navigation away does not cancel the request — the
      // commonest thing a learner does straight after opening a lesson.
      keepalive: true,
      body: JSON.stringify({
        code: event.code,
        subjectId: event.subjectId ?? null,
        learnerProfileId: event.learnerProfileId ?? null,
        properties: event.properties ?? {},
      }),
    });
  } catch {
    // Nothing to do and nothing to log: a dropped event is not an error state
    // for the person who caused it.
  }
}
