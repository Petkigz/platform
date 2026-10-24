import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * POST /api/notifications/preferences — turn one kind of in-app message on or off.
 *
 * The database decides three things this route does not: which kinds exist,
 * that the two money-failure kinds cannot be silenced, and that the row is
 * always written for the caller and nobody else. A refusal comes back as the
 * sentence `set_notification_preference()` wrote, because every one of them is
 * already something a person can read.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Expected a JSON body.' }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  if (typeof input.kind !== 'string' || typeof input.enabled !== 'boolean') {
    return NextResponse.json(
      { ok: false, message: 'A kind and a true-or-false are required.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: 'Sign in to choose what you are told.' },
      { status: 401 },
    );
  }

  const { data, error } = await supabase.rpc('set_notification_preference', {
    p_kind: input.kind,
    p_enabled: input.enabled,
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, value: data });
}
