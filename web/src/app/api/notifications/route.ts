import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Marking in-app messages read.
 *
 * The database function does the ownership check; this route only decides that
 * somebody is signed in and forwards the ids. Nothing here can write a
 * notification — those come from the events that cause them.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid', message: 'Malformed request.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'not_authorized', message: 'Sign in first.' },
      { status: 401 },
    );
  }

  const b = body as { ids?: unknown };
  const ids = Array.isArray(b.ids) && b.ids.every((id) => typeof id === 'string')
    ? (b.ids as string[])
    : null;

  const { data, error } = await supabase.rpc('mark_notifications_read', {
    p_ids: ids && ids.length > 0 ? ids : null,
  });
  if (error) {
    return NextResponse.json({ ok: false, code: 'rejected', message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, marked: Number(data ?? 0) });
}
