'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isQuarantineCursor } from '@/lib/coursework-quarantine';

const CONFIRM = 'I reviewed every context and understand this only queues storage deletion';
export async function reviewSharedRetention(form: FormData) {
  const asset = form.get('assetId');
  const reason = form.get('reason');
  const after = form.get('after');
  const cursor = typeof after === 'string' && isQuarantineCursor(after) ? after : '';
  const back = (status: string) => `/admin/coursework?${new URLSearchParams({ sharedReview: status, ...(cursor ? { sharedAfter: cursor } : {}) })}#shared-retention`;
  if (!isSupabaseConfigured() || typeof asset !== 'string' || !isQuarantineCursor(asset) ||
      typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 1000 || form.get('confirmed') !== 'yes') redirect(back('invalid'));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');
  const result = await Promise.resolve(supabase.rpc('queue_reviewed_shared_coursework', {
    p_asset_id: asset, p_reason: reason.trim(), p_confirm: CONFIRM,
  })).catch(() => null);
  revalidatePath('/admin/coursework');
  if (!result || result.error || result.data !== true) redirect(back('uncertain'));
  redirect(back('queued'));
}

const DETACHED_CONFIRM = 'I reviewed the surviving uses and understand this only queues storage deletion';
export async function reviewDetachedRetention(form: FormData) {
  const asset = form.get('assetId');
  const reason = form.get('reason');
  const after = form.get('after');
  const cursor = typeof after === 'string' && isQuarantineCursor(after) ? after : '';
  const back = (status: string) => `/admin/coursework?${new URLSearchParams({ detachedReview: status, ...(cursor ? { detachedAfter: cursor } : {}) })}#detached-review`;
  if (!isSupabaseConfigured() || typeof asset !== 'string' || !isQuarantineCursor(asset) ||
      typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 1000 || form.get('confirmed') !== 'yes') redirect(back('invalid'));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');
  const result = await Promise.resolve(supabase.rpc('queue_reviewed_detached_coursework', {
    p_asset_id: asset, p_reason: reason.trim(), p_confirm: DETACHED_CONFIRM,
  })).catch(() => null);
  revalidatePath('/admin/coursework');
  if (!result || result.error || result.data !== true) redirect(back('uncertain'));
  redirect(back('queued'));
}
