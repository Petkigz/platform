import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  submitGuardianConsent,
  revokeGuardianConsent,
  type ConsentMethod,
  type RelationshipType,
} from '@/lib/guardian-consent';

export const dynamic = 'force-dynamic';

type Body = {
  action?: unknown;
  learnerProfileId?: unknown;
  relationshipType?: unknown;
  method?: unknown;
  statement?: unknown;
  evidenceReference?: unknown;
  relationshipId?: unknown;
  reason?: unknown;
};

const TYPES: RelationshipType[] = ['parent', 'guardian', 'other'];
const METHODS: ConsentMethod[] = ['video_call', 'id_document', 'in_person', 'signed_declaration'];

/**
 * POST /api/family/guardians — ask for consent, or withdraw it.
 *
 * The guardian is always the caller, taken from the session and never the body,
 * so this cannot be used to nominate somebody else and land them with a consent
 * case they never asked for.
 *
 * What submission creates is a **request**: the database writes the relationship
 * at `pending_verification` and opens the case in one call, and the table refuses
 * an active relationship without `verified_at`. There is no path from here to
 * access — only from a reviewer's decision.
 *
 * Withdrawal is the same door in reverse. It is the parent's own act, it needs a
 * reason, and it clears the permissions without deleting anything.
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

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  if (body.action === 'withdraw') {
    const relationshipId =
      typeof body.relationshipId === 'string' ? body.relationshipId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!relationshipId) {
      return NextResponse.json({ error: 'relationshipId is required.' }, { status: 400 });
    }
    if (reason.length < 10) {
      return NextResponse.json(
        { error: 'Say why you are withdrawing — the record keeps your reason.' },
        { status: 400 },
      );
    }

    const result = await revokeGuardianConsent(supabase, { relationshipId, reason });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 409 });
    }
    return NextResponse.json({ ok: true, status: 'revoked' });
  }

  const learnerProfileId =
    typeof body.learnerProfileId === 'string' ? body.learnerProfileId.trim() : '';
  const relationshipType =
    typeof body.relationshipType === 'string' ? body.relationshipType : 'parent';
  const method = typeof body.method === 'string' ? body.method : 'video_call';
  const statement = typeof body.statement === 'string' ? body.statement.trim() : '';
  const evidenceReference =
    typeof body.evidenceReference === 'string' ? body.evidenceReference.trim() : '';

  if (!learnerProfileId) {
    return NextResponse.json({ error: 'learnerProfileId is required.' }, { status: 400 });
  }
  if (!TYPES.includes(relationshipType as RelationshipType)) {
    return NextResponse.json(
      { error: `relationshipType must be one of: ${TYPES.join(', ')}.` },
      { status: 400 },
    );
  }
  if (!METHODS.includes(method as ConsentMethod)) {
    return NextResponse.json(
      { error: `method must be one of: ${METHODS.join(', ')}.` },
      { status: 400 },
    );
  }
  if (statement.length < 20) {
    return NextResponse.json(
      {
        error:
          'Write who this child is to you, in your own words — at least 20 '
          + 'characters. The reviewer reads it.',
      },
      { status: 400 },
    );
  }

  const result = await submitGuardianConsent(supabase, {
    learnerProfileId,
    relationshipType: relationshipType as RelationshipType,
    method: method as ConsentMethod,
    statement,
    evidenceReference: evidenceReference || null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    caseId: result.caseId,
    relationshipId: result.relationshipId,
  });
}
