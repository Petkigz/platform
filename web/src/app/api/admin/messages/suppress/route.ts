import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { suppressAddress } from '@/lib/outbox';

/**
 * POST /api/admin/messages/suppress — stop writing to one address.
 *
 * Same shape as the retry route, and the same division: this route checks the
 * caller for a useful message, `suppress_address()` checks them again because it
 * can be reached without this route.
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
    return NextResponse.json({ error: 'Sign in to change the do-not-send list.' }, { status: 401 });
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return NextResponse.json(
      { error: 'Only staff can stop mail to an address.' },
      { status: 403 },
    );
  }

  const result = await suppressAddress(supabase, input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    address: result.address,
    stoppedQueued: result.stoppedQueued,
  });
}
