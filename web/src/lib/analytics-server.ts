import type { SupabaseClient } from '@supabase/supabase-js';
import { ANALYTICS_EVENTS, isAnalyticsEvent, type AnalyticsEventCode } from './analytics';

/**
 * Record an event from a server component.
 *
 * A page that is being rendered by a signed-out visitor sends nothing: the
 * database answers `recorded:false, signed_out`, and this helper never throws.
 * Using the caller's own client (not a service key) is deliberate — the event
 * belongs to the person whose request it was, and the write goes through the
 * same rules as any other.
 */
export async function recordEvent(
  supabase: SupabaseClient,
  code: AnalyticsEventCode,
  options: {
    subjectId?: string | null;
    learnerProfileId?: string | null;
    properties?: Record<string, unknown>;
  } = {},
): Promise<void> {
  if (!isAnalyticsEvent(code)) return;
  try {
    await supabase.rpc('record_analytics_event', {
      p_code: code,
      p_subject_id: options.subjectId ?? null,
      p_learner_profile_id: options.learnerProfileId ?? null,
      p_properties: options.properties ?? {},
    });
  } catch {
    // Instrumentation is not allowed to fail a page render.
  }
}

export { ANALYTICS_EVENTS };
