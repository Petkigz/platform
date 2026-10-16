import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { setFlag } from '@/lib/flags';

/**
 * Flip a feature flag.
 *
 * Privileged only. The check here is for the message; the real gate is the
 * `is_privileged()` condition on the UPDATE policy, and behind that a trigger
 * that refuses to enable a CODE-gated flag at all. Two of those three would
 * still hold if this file were deleted.
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
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Malformed request.' },
      { status: 400 },
    );
  }

  const b = body as { key?: unknown; enabled?: unknown };

  if (typeof b.key !== 'string' || b.key.trim().length === 0) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'A flag key is required.' },
      { status: 400 },
    );
  }
  if (typeof b.enabled !== 'boolean') {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'enabled must be true or false.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'not_privileged', message: 'Sign in first.' },
      { status: 401 },
    );
  }

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) {
    return NextResponse.json(
      {
        ok: false,
        code: 'not_privileged',
        message: 'Only platform staff can change feature flags.',
      },
      { status: 403 },
    );
  }

  const outcome = await setFlag(supabase, { key: b.key.trim(), enabled: b.enabled });

  if (!outcome.ok) {
    const status =
      outcome.code === 'code_gated' ? 409
      : outcome.code === 'not_privileged' ? 403
      : outcome.code === 'unknown_flag' ? 404
      : 400;
    return NextResponse.json(outcome, { status });
  }

  return NextResponse.json(outcome, { status: 200 });
}
