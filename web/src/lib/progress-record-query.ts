import type { SupabaseClient } from '@supabase/supabase-js';

import type { ProgressRecord } from '@/lib/progress-record';

/**
 * One learner's record, or the reason there is none.
 *
 * Four outcomes the page has to tell apart, because they look identical if it
 * does not: the feature is off for everybody, it is off for children, the caller
 * may not read this learner, and the record itself failed. A page that showed
 * "nothing yet" for all of them would be lying about at least three.
 *
 * The children's refusal is checked first, because its message also contains the
 * platform-wide one. A guardian told "streaks are not switched on" when streaks
 * are on everywhere but switched off for children would go looking for the wrong
 * switch.
 */
export type RecordOutcome =
  | { ok: true; record: ProgressRecord }
  | { ok: false; reason: 'disabled' }
  | { ok: false; reason: 'children_off' }
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
    if (/not enabled for children/i.test(error.message)) {
      return { ok: false, reason: 'children_off' };
    }
    if (/not enabled/i.test(error.message)) return { ok: false, reason: 'disabled' };
    if (/cannot read this learner/i.test(error.message)) return { ok: false, reason: 'forbidden' };
    return { ok: false, reason: 'failed', message: error.message };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'failed', message: 'The record came back empty.' };
  }

  return { ok: true, record: data as unknown as ProgressRecord };
}
