'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isQuarantineCursor } from '@/lib/coursework-quarantine';

export async function releaseQuarantine(form: FormData) {
  const id = form.get('assetId');
  const after = form.get('after');
  const cursor = typeof after === 'string' && isQuarantineCursor(after) ? after : '';
  const back = (status: string) => `/admin/coursework?${new URLSearchParams({ quarantine: status, ...(cursor ? { quarantineAfter: cursor } : {}) })}#coursework-quarantines`;
  if (!isSupabaseConfigured() || typeof id !== 'string' || !isQuarantineCursor(id) || form.get('reviewed') !== 'yes') redirect(back('invalid'));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');
  // A network error may occur after the write; do not report it as a refusal.
  const result = await Promise.resolve(supabase.rpc('release_coursework_quarantine', {
    p_asset_id: id, p_confirm: 'I reviewed this quarantine and its release',
  })).catch(() => null);
  revalidatePath('/admin/coursework');
  if (!result || result.error || (result.data !== 'pending' && result.data !== 'available')) redirect(back('failed'));
  redirect(back(result.data));
}

export async function reviewUnknownQuarantine(form: FormData) {
  const id = form.get('assetId');
  const after = form.get('after');
  const status = form.get('status');
  const reason = form.get('reason');
  const cursor = typeof after === 'string' && isQuarantineCursor(after) ? after : '';
  const back = (result: string) => `/admin/coursework?${new URLSearchParams({ quarantine: result, ...(cursor ? { quarantineAfter: cursor } : {}) })}#coursework-quarantines`;
  if (!isSupabaseConfigured() || typeof id !== 'string' || !isQuarantineCursor(id) ||
      (status !== 'pending' && status !== 'available') || typeof reason !== 'string' ||
      reason.trim().length < 3 || reason.trim().length > 1000 || form.get('reviewed') !== 'yes') redirect(back('invalid'));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');
  const confirm = status === 'pending'
    ? 'I understand the prior state is unknown and the upload still needs confirmation'
    : 'I checked upload completion and understand this is not a scan or storage verification';
  const result = await Promise.resolve(supabase.rpc('review_unknown_coursework_quarantine', {
    p_asset_id: id, p_new_status: status, p_reason: reason.trim(), p_confirm: confirm,
  })).catch(() => null);
  revalidatePath('/admin/coursework');
  if (!result || result.error || result.data !== status) redirect(back('failed'));
  redirect(back(status === 'pending' ? 'unknown_pending' : 'unknown_available'));
}
