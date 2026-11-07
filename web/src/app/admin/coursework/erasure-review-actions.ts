'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isQuarantineCursor } from '@/lib/coursework-quarantine';

const QUEUE_CONFIRM = 'I reviewed all surviving uses and understand this only queues storage deletion';
const CLEAR_CONFIRM = 'I understand a storage statement is not verified deletion';

export async function reviewErasureFile(form: FormData) {
  const asset = form.get('assetId');
  const learner = form.get('learnerId');
  const action = form.get('action');
  const reason = form.get('reason');
  const afterAsset = form.get('afterAsset');
  const afterLearner = form.get('afterLearner');
  const cursor: Record<string, string> = typeof afterAsset === 'string' && isQuarantineCursor(afterAsset) &&
    typeof afterLearner === 'string' && isQuarantineCursor(afterLearner)
    ? { erasureAsset: afterAsset, erasureLearner: afterLearner } : {};
  const back = (status: string) => `/admin/coursework?${new URLSearchParams({ ...cursor, erasureReview: status })}#erasure-review`;
  if (!isSupabaseConfigured() || typeof asset !== 'string' || !isQuarantineCursor(asset) ||
      typeof learner !== 'string' || !isQuarantineCursor(learner) || form.get('confirmed') !== 'yes' ||
      (action !== 'queue' && action !== 'clear') ||
      (action === 'queue' && (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 1000))) {
    redirect(back('invalid'));
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');
  // A failed or lost response is not proof that no write occurred. The page
  // directs the owner to refresh both the review and storage queues.
  const result = action === 'queue'
    ? await Promise.resolve(supabase.rpc('queue_reviewed_coursework_erasure', { p_asset_id: asset, p_reason: (reason as string).trim(), p_confirm: QUEUE_CONFIRM })).catch(() => null)
    : await Promise.resolve(supabase.rpc('clear_coursework_erasure_review', { p_asset_id: asset, p_learner_id: learner, p_confirm: CLEAR_CONFIRM })).catch(() => null);
  revalidatePath('/admin/coursework');
  if (!result || result.error) redirect(back('uncertain'));
  if (action === 'queue' && (result.data === 'queued' || result.data === 'already_queued' || result.data === 'statement_recorded')) redirect(back(result.data));
  if (action === 'clear' && result.data === true) redirect(back('removed'));
  // A false clear can also mean an earlier request already removed the entry.
  redirect(back('uncertain'));
}
