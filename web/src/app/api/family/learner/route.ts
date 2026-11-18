import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { joinFamilyAsLearner, leaveFamilyAsLearner } from '@/lib/family';
import { familyRefusal, familyStatusOf, type FamilyCode } from '@/lib/family-outcome';

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
 *
 * **A refusal names its reason** (`lib/family-outcome.ts`), and the card says
 * the sentence in the reader's language. The database's own sentence is not
 * sent.
 */
const UUID = /^[0-9a-f-]{36}$/i;

async function familyIdFrom(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { familyId?: unknown } | null;
    return typeof body?.familyId === 'string' && UUID.test(body.familyId) ? body.familyId : null;
  } catch {
    return null;
  }
}

const refuse = (code: FamilyCode) =>
  NextResponse.json(familyRefusal(code), { status: familyStatusOf(code) });

const unconfigured = () =>
  NextResponse.json(
    { ok: false, message: 'Accounts are not configured on this deployment.' },
    { status: 503 },
  );

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return unconfigured();

  const familyId = await familyIdFrom(request);
  if (!familyId) return refuse('malformed');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return refuse('signed_out');

  const outcome = await joinFamilyAsLearner(supabase, familyId);
  if (!outcome.ok) {
    return NextResponse.json(outcome, { status: familyStatusOf(outcome.code) });
  }

  return NextResponse.json(outcome, { status: outcome.created ? 201 : 200 });
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) return unconfigured();

  const familyId = await familyIdFrom(request);
  if (!familyId) return refuse('malformed');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return refuse('signed_out');

  const outcome = await leaveFamilyAsLearner(supabase, familyId);
  if (!outcome.ok) {
    return NextResponse.json(outcome, { status: familyStatusOf(outcome.code) });
  }

  return NextResponse.json({ ok: true, released: true }, { status: 200 });
}
