import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { joinFamilyAsLearner, leaveFamilyAsLearner } from '@/lib/family';

/**
 * An adult becoming (or ceasing to be) a learner inside a family.
 *
 * Two verbs, one address. The family is named by the caller but the permission
 * is not theirs to assert: `claim_family_adult_learner()` reads the actor from
 * the session and requires an active membership of that family, and
 * `release_family_adult_learner()` only ever touches the caller's own profile.
 * Neither takes a learner id, so there is nothing here to tamper with — the most
 * a forged request can do is ask to join a family it does not belong to, which
 * the writer refuses.
 */
const UUID = /^[0-9a-f-]{36}$/i;

async function familyIdFrom(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { familyId?: unknown };
    return typeof body.familyId === 'string' && UUID.test(body.familyId) ? body.familyId : null;
  } catch {
    return null;
  }
}

function unauth() {
  return NextResponse.json(
    { ok: false, code: 'rejected', message: 'Sign in first.' },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Accounts are not configured on this deployment.' },
      { status: 503 },
    );
  }

  const familyId = await familyIdFrom(request);
  if (!familyId) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'A family id is required.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauth();

  const outcome = await joinFamilyAsLearner(supabase, familyId);
  if (!outcome.ok) {
    return NextResponse.json(outcome, { status: outcome.code === 'no_family' ? 404 : 409 });
  }

  return NextResponse.json(outcome, { status: outcome.created ? 201 : 200 });
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Accounts are not configured on this deployment.' },
      { status: 503 },
    );
  }

  const familyId = await familyIdFrom(request);
  if (!familyId) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'A family id is required.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauth();

  const outcome = await leaveFamilyAsLearner(supabase, familyId);
  if (!outcome.ok) {
    return NextResponse.json(outcome, { status: 409 });
  }

  return NextResponse.json({ ok: true, released: true }, { status: 200 });
}
