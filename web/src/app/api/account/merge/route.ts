import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * The four things a person can do about a merge, in one place.
 *
 * Every decision is the database's — who may ask, who may answer, what may move
 * and what stops it. This route chooses the function and turns a refusal into a
 * sentence the screen can show.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'request') {
    if (typeof body.email !== 'string') {
      return NextResponse.json({ ok: false, message: 'Type the email address of the account you want to keep.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('request_account_merge', {
      p_target_email: body.email,
    });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'cancel') {
    if (typeof body.requestId !== 'string') {
      return NextResponse.json({ ok: false, message: 'That request is not one of yours.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('cancel_account_merge', {
      p_request: body.requestId,
    });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'decide') {
    if (typeof body.requestId !== 'string' || typeof body.accept !== 'boolean') {
      return NextResponse.json({ ok: false, message: 'That request cannot be answered as asked.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('decide_account_merge', {
      p_request: body.requestId,
      p_accept: body.accept,
      p_confirm: typeof body.confirm === 'string' ? body.confirm : '',
    });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

    const answer = (data ?? {}) as { merged?: unknown; status?: unknown; message?: unknown };
    if (answer.status === 'expired') {
      return NextResponse.json(
        { ok: false, message: typeof answer.message === 'string' ? answer.message : 'That request has expired.' },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  return NextResponse.json({ ok: false, message: 'Unknown action.' }, { status: 400 });
}
