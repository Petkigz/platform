'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONFIRM = 'I verified the class end and understand that coursework may become due';

export async function attestClassEnd(form: FormData) {
  const id = form.get('cohortId');
  const end = form.get('endsAt');
  const reason = form.get('reason');
  if (!isSupabaseConfigured() || typeof id !== 'string' || !UUID.test(id) ||
      typeof end !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(end) ||
      !Number.isFinite(Date.parse(`${end}:00Z`)) || typeof reason !== 'string' ||
      reason.trim().length < 3 || reason.trim().length > 1000 || form.get('verified') !== 'yes') {
    redirect('/admin/coursework?classEnd=invalid#missing-class-ends');
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/coursework');
  // Authorization, locking, date bounds and confirmation are enforced by the DB.
  const { error } = await supabase.rpc('attest_closed_cohort_end', {
    p_cohort_id: id, p_ends_at: `${end}:00Z`, p_reason: reason.trim(), p_confirm: CONFIRM,
  });
  revalidatePath('/admin/coursework');
  if (error) redirect('/admin/coursework?classEnd=failed#missing-class-ends');
  redirect('/admin/coursework?classEnd=recorded#missing-class-ends');
}
