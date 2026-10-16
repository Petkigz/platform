import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { addChild, AGE_BANDS } from '@/lib/family';

/**
 * Add a child to a family.
 *
 * The family is named by the caller but the permission is not theirs to
 * assert: `lp_insert` requires `is_active_family_member` for a family-attached
 * profile, and the age band is validated against the closed list the schema
 * allows. A child is never given a `linked_user_id` here — D2 keeps children
 * off `auth.users` entirely, and `lp_no_child_login_yet` would refuse it.
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

  const b = body as { familyId?: unknown; displayName?: unknown; ageBand?: unknown };
  const uuid = /^[0-9a-f-]{36}$/i;

  if (typeof b.familyId !== 'string' || !uuid.test(b.familyId)) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'A family id is required.' },
      { status: 400 },
    );
  }
  if (typeof b.displayName !== 'string' || b.displayName.trim().length === 0) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'A name is required.' },
      { status: 400 },
    );
  }
  if (typeof b.ageBand !== 'string' || !AGE_BANDS.includes(b.ageBand as (typeof AGE_BANDS)[number])) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Choose an age band.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Sign in first.' },
      { status: 401 },
    );
  }

  const outcome = await addChild(supabase, {
    familyId: b.familyId,
    displayName: b.displayName,
    ageBand: b.ageBand,
  });

  if (!outcome.ok) {
    const status = outcome.code === 'not_owner' ? 403 : outcome.code === 'no_family' ? 404 : 400;
    return NextResponse.json(outcome, { status });
  }

  return NextResponse.json(outcome, { status: 201 });
}
