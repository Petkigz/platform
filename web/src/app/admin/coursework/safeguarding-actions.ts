'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function acknowledgeConcern(form: FormData) {
  const after = form.get('concernAfter');
  const afterId = form.get('concernAfterId');
  const cursorValid = typeof after === 'string' && Number.isFinite(Date.parse(after)) &&
    typeof afterId === 'string' && UUID.test(afterId);
  const back = (status: string) => `/admin/coursework?${new URLSearchParams({
    concern: status, ...(cursorValid ? { concernAfter: after, concernAfterId: afterId } : {}),
  })}#open-concerns`;
  if (!isSupabaseConfigured()) redirect(back('failed'));
  const id = form.get('reviewId');
  if (typeof id !== 'string' || !UUID.test(id)) redirect(back('failed'));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');
  // This is not an authorization decision. The database checks the exact owner.
  const { data, error } = await supabase.rpc('acknowledge_safeguarding_concern', { p_review_id: id });
  revalidatePath('/admin/coursework');
  if (error || typeof data !== 'boolean') redirect(back('failed'));
  redirect(back(data ? 'recorded' : 'already'));
}

export async function reopenConcern(form: FormData) {
  if (!isSupabaseConfigured()) redirect('/admin/coursework?concern=failed');
  const id = form.get('reviewId');
  if (typeof id !== 'string' || !UUID.test(id)) redirect('/admin/coursework?concern=failed');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');
  const { data, error } = await supabase.rpc('reopen_safeguarding_concern', { p_review_id: id });
  revalidatePath('/admin/coursework');
  if (error || typeof data !== 'boolean') redirect('/admin/coursework?concern=failed');
  redirect(`/admin/coursework?concern=${data ? 'reopened' : 'already-open'}`);
}

export async function retrySafeguardingAlert(form: FormData) {
  const id = form.get('reviewId');
  const after = form.get('concernAfter');
  const afterId = form.get('concernAfterId');
  const cursorValid = typeof after === 'string' && Number.isFinite(Date.parse(after)) &&
    typeof afterId === 'string' && UUID.test(afterId);
  const back = (status: string) => `/admin/coursework?${new URLSearchParams({
    alert: status, ...(cursorValid ? { concernAfter: after, concernAfterId: afterId } : {}),
  })}#open-concerns`;
  if (!isSupabaseConfigured() || typeof id !== 'string' || !UUID.test(id)) redirect(back('failed'));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');
  const { data, error } = await supabase.rpc('retry_safeguarding_alert', { p_review_id: id });
  revalidatePath('/admin/coursework');
  if (error || data !== true) redirect(back('failed'));
  redirect(back('queued'));
}
