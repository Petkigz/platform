'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { SUPPORT_CASE_NUMBER, SUPPORT_HOLD_ID } from '@/lib/support-case-cleanup-hold';

export async function changeCleanupHold(form: FormData) {
  const number = form.get('caseNumber');
  const caseId = form.get('caseId');
  const action = form.get('action');
  const reason = form.get('reason');
  if (typeof number !== 'string' || !SUPPORT_CASE_NUMBER.test(number)) redirect('/admin/retention');
  const back = (result: string) => `/support/${number}?${new URLSearchParams({ cleanupHold: result })}#cleanup-hold`;
  if (!isSupabaseConfigured() || typeof caseId !== 'string' || !SUPPORT_HOLD_ID.test(caseId) ||
      (action !== 'hold' && action !== 'release') || typeof reason !== 'string' ||
      reason.trim().length < 3 || reason.trim().length > 1000 || form.get('reviewed') !== 'yes') redirect(back('invalid'));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/support/${number}`)}`);
  const result = await Promise.resolve(supabase.rpc('change_support_case_cleanup_hold', {
    p_case_id: caseId, p_action: action, p_reason: reason.trim(),
  })).catch(() => null);
  revalidatePath(`/support/${number}`);
  revalidatePath('/admin/retention');
  if (!result || result.error || typeof result.data !== 'boolean') redirect(back('uncertain'));
  redirect(back(result.data ? (action === 'hold' ? 'held' : 'released') : 'already'));
}
