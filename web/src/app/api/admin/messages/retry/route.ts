import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { retryMessage } from '@/lib/outbox';

/**
 * POST /api/admin/messages/retry — put a dead letter back in the queue.
 *
 * The privilege check is repeated inside `retry_outbound_message()`, which is
 * the boundary that matters: an RPC can be called without coming through here.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured on this deployment.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to retry a message.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return NextResponse.json({ error: 'Only staff can retry a message.' }, { status: 403 });
  }

  const result = await retryMessage(supabase, input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
