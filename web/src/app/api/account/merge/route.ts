import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { mergeAnswerOf, mergeCodeOf, mergeRefusal, mergeStatusOf, type MergeCode } from '@/lib/merge-outcome';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'no-store' };

/** A refusal, by name, with the status that name is always answered with. */
function refuse(code: MergeCode) {
  return NextResponse.json(mergeRefusal(code), { status: mergeStatusOf(code), headers: NO_STORE });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * The three things a person can do about a merge, in one place: ask for one,
 * withdraw the request, and answer one.
 *
 * Every decision is the database's: who may ask, who may answer, what may
 * move and what stops it. This route chooses the function, refuses a request
 * it cannot pass on without asking the database, and reads the reply for what
 * it says happened.
 *
 * Every refusal has a name (`lib/merge-outcome.ts`) and its own status. No
 * sentence the database wrote is forwarded, and nothing else from its reply
 * is either, except what a merge counted as moved. A reply that cannot be
 * read is `failed`: a merge cannot be undone, so nothing is claimed about it.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return refuse('malformed');
    }
    const body = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('signed_out');

    const action = body.action;

    if (action === 'request') {
      if (typeof body.email !== 'string' || body.email.length > 320) return refuse('malformed');
      if (body.email.trim() === '') return refuse('email');
      const { data, error } = await supabase.rpc('request_account_merge', { p_target_email: body.email });
      if (error) return refuse(mergeCodeOf(error));
      const answer = mergeAnswerOf('request', false, data);
      return answer.ok ? NextResponse.json(answer, { headers: NO_STORE }) : refuse(answer.code);
    }

    if (action === 'cancel') {
      if (typeof body.requestId !== 'string' || !UUID.test(body.requestId)) return refuse('malformed');
      const { data, error } = await supabase.rpc('cancel_account_merge', { p_request: body.requestId });
      if (error) return refuse(mergeCodeOf(error));
      const answer = mergeAnswerOf('cancel', false, data);
      return answer.ok ? NextResponse.json(answer, { headers: NO_STORE }) : refuse(answer.code);
    }

    if (action === 'decide') {
      if (typeof body.requestId !== 'string' || !UUID.test(body.requestId) || typeof body.accept !== 'boolean') {
        return refuse('malformed');
      }
      const confirm = typeof body.confirm === 'string' ? body.confirm : '';
      if (confirm.length > 200) return refuse('malformed');
      // An empty box is the name of an account that has none, as far as the
      // database is concerned. A merge is never confirmed by typing nothing.
      if (body.accept && confirm.trim() === '') return refuse('name');
      const { data, error } = await supabase.rpc('decide_account_merge', {
        p_request: body.requestId,
        p_accept: body.accept,
        p_confirm: confirm,
      });
      if (error) return refuse(mergeCodeOf(error));
      const answer = mergeAnswerOf('decide', body.accept, data);
      return answer.ok ? NextResponse.json(answer, { headers: NO_STORE }) : refuse(answer.code);
    }

    return refuse('malformed');
  } catch {
    // Nothing is known about what happened, so nothing is claimed.
    return refuse('failed');
  }
}
