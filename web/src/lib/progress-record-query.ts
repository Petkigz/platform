import type { SupabaseClient } from '@supabase/supabase-js';

import type { ProgressRecord } from '@/lib/progress-record';

/**
 * One learner's record, or the reason there is none.
 *
 * Three outcomes the page has to tell apart, because they look identical if it
 * does not: the feature is off, the caller may not read this learner, and the
 * record itself failed. A page that showed "nothing yet" for all three would be
 * lying about at least two of them.
 */
export type RecordOutcome =
  | { ok: true; record: ProgressRecord }
  | { ok: false; reason: 'disabled' }
  | { ok: false; reason: 'forbidden' }
  | { ok: false; reason: 'failed'; message: string };

export async function fetchProgressRecord(
  supabase: SupabaseClient,
  learnerProfileId: string,
): Promise<RecordOutcome> {
  const { data, error } = await supabase.rpc('learner_progress_record', {
    p_learner_id: learnerProfileId,
  });

  if (error) {
    if (/not enabled/i.test(error.message)) return { ok: false, reason: 'disabled' };
    if (/cannot read this learner/i.test(error.message)) return { ok: false, reason: 'forbidden' };
    return { ok: false, reason: 'failed', message: error.message };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'failed', message: 'The record came back empty.' };
  }

  return { ok: true, record: data as unknown as ProgressRecord };
}
