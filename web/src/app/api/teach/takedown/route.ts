import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { describeTakedownError } from '@/lib/takedowns';

/**
 * A teacher answering a claim about their own version.
 *
 * Gated on **being signed in**, and on nothing else — because the authority here is
 * ownership, not a role. `record_takedown_response()` resolves the session and
 * checks that the version is this person's, which is the only check that means
 * anything: a teacher is exactly the person who must be able to answer, and a role
 * gate would have excluded them while letting staff answer on their behalf.
 */
function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Malformed request.');
  }
  if (typeof raw !== 'object' || raw === null) return fail('Malformed request.');
  const body = raw as Record<string, unknown>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  if (typeof body.noticeId !== 'string' || typeof body.response !== 'string') {
    return fail('Say what the material is and why it may be used.');
  }

  const { data, error } = await supabase.rpc('record_takedown_response', {
    p_notice_id: body.noticeId,
    p_response: body.response,
  });
  if (error) return fail(describeTakedownError(error.message, error.hint));
  return NextResponse.json({ ok: true, answer: data });
}
