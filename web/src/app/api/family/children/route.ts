import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { addChild, AGE_BANDS } from '@/lib/family';
import { familyRefusal, familyStatusOf, type FamilyCode } from '@/lib/family-outcome';

/**
 * Add a child to a family.
 *
 * The family is named by the caller but the permission is not theirs to
 * assert: `lp_insert` requires `is_active_family_member` for a family-attached
 * profile, and the age band is validated against the closed list the schema
 * allows. A child is never given a `linked_user_id` here — D2 keeps children
 * off `auth.users` entirely, and `lp_no_child_login_yet` would refuse it.
 *
 * **A refusal names its reason** (`lib/family-outcome.ts`). Every one of them
 * used to be `rejected` with a sentence, and the sentence was sometimes the
 * database's own. The form says its own sentence for each name now.
 */
const refuse = (code: FamilyCode) =>
  NextResponse.json(familyRefusal(code), { status: familyStatusOf(code) });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse('malformed');
  }

  const b = (body && typeof body === 'object' ? body : {}) as {
    familyId?: unknown;
    displayName?: unknown;
    ageBand?: unknown;
  };
  const uuid = /^[0-9a-f-]{36}$/i;

  if (typeof b.familyId !== 'string' || !uuid.test(b.familyId)) return refuse('malformed');
  if (typeof b.displayName !== 'string' || b.displayName.trim().length === 0) {
    return refuse('name_missing');
  }
  if (typeof b.ageBand !== 'string' || !AGE_BANDS.includes(b.ageBand as (typeof AGE_BANDS)[number])) {
    return refuse('band_invalid');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return refuse('signed_out');

  const outcome = await addChild(supabase, {
    familyId: b.familyId,
    displayName: b.displayName,
    ageBand: b.ageBand,
  });

  if (!outcome.ok) {
    return NextResponse.json(outcome, { status: familyStatusOf(outcome.code) });
  }

  return NextResponse.json(outcome, { status: 201 });
}
