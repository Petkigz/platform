import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { claimOwnLearnerProfile } from '@/lib/enrolment';

export const dynamic = 'force-dynamic';

/**
 * POST /api/account/learner — become a learner on this account.
 *
 * No body and no actor: `claim_own_learner_profile()` reads the session, is idempotent,
 * and refuses to revive a profile that was archived or deleted. The route exists so the
 * button that every learner flow depends on has somewhere to go.
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Accounts are not configured on this deployment.' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }

  const result = await claimOwnLearnerProfile(supabase);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    learnerProfileId: result.learnerProfileId,
    created: result.created,
  });
}
