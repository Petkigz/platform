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
  const { data, error } = await supabase.rpc('release_coursework_quarantine', {
    p_asset_id: id, p_confirm: 'I reviewed this quarantine and its release',
  });
  revalidatePath('/admin/coursework');
  if (error || (data !== 'pending' && data !== 'available')) redirect(back('failed'));
  redirect(back(data));
}
