import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { requestGuardianAccess } from '@/lib/guardians';

export const dynamic = 'force-dynamic';

type Body = {
  learnerProfileId?: unknown;
  relationshipType?: unknown;
};

const TYPES = ['parent', 'guardian', 'other'] as const;
type RelationshipType = (typeof TYPES)[number];

/**
 * POST /api/family/guardians — ask to be recognised as a child's guardian.
 *
 * The guardian is always the caller. It is taken from the session and never
 * from the body, so this cannot be used to nominate somebody else and have
 * them inherit a pending consent case they never asked for.
 *
 * What this creates is a request, not access. The row lands at
 * `pending_verification`, and the table refuses an `active` relationship
 * without `verified_at`, so there is no path from this endpoint to access —
 * only from a reviewer's decision.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  // Off by default. Accepting requests while the review queue is closed would
  // pile up consent records nobody can action and nobody has agreed to retain.
  const enabled = await isFlagEnabled(supabase, 'family.guardian_verification');
  if (!enabled) {
    return NextResponse.json(
      {
        error:
          'Guardian verification is not open yet. Requests are not being ' +
          'accepted, because there is no one reviewing them.',
        code: 'flag_disabled',
      },
      { status: 409 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const learnerProfileId =
    typeof body.learnerProfileId === 'string' ? body.learnerProfileId.trim() : '';
  const relationshipType =
    typeof body.relationshipType === 'string' ? body.relationshipType : 'parent';

  if (!learnerProfileId) {
    return NextResponse.json(
      { error: 'learnerProfileId is required.' },
      { status: 400 },
    );
  }
  if (!TYPES.includes(relationshipType as RelationshipType)) {
    return NextResponse.json(
      { error: `relationshipType must be one of: ${TYPES.join(', ')}.` },
      { status: 400 },
    );
  }

  // Whether the caller may name this child at all is the table's decision, not
  // this route's: gr_insert permits the guardian to be yourself, a member of
  // the child's family, or privileged. Asking about a stranger's child is
  // refused there.
  const result = await requestGuardianAccess(supabase, {
    guardianUserId: user.id,
    learnerProfileId,
    relationshipType: relationshipType as RelationshipType,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
