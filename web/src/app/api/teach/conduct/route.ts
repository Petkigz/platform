import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Record that a teacher read and agreed to the safeguarding and conduct policy.
 *
 * The client sends no version. `acknowledge_conduct()` resolves the live one
 * itself, because a client that could name a version could acknowledge a draft,
 * or an old text it had already read — and the row would then say the person
 * agreed to something they never saw.
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('acknowledge_conduct');
  if (error) {
    const message = /no_published_policy/.test(error.message)
      ? 'The conduct policy has no version in force yet, so there is nothing to agree to.'
      : /not_a_teacher/.test(error.message)
        ? 'Only an appointed teacher acknowledges the teaching rules.'
        : 'That could not be saved. Try again.';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status: data });
}
