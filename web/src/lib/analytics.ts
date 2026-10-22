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
} as const;

export type AnalyticsEventCode = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

const CODES: readonly string[] = Object.values(ANALYTICS_EVENTS);

/** True when the string is one of the seven codes the database will accept. */
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
};

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
