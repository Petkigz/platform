import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  submitGuardianConsent,
  revokeGuardianConsent,
  type ConsentMethod,
  type RelationshipType,
} from '@/lib/guardian-consent';
import {
  METHODS,
  REASON_MIN,
  RELATIONSHIPS,
  STATEMENT_MIN,
  guardianStatusOf,
  type GuardianCode,
} from '@/lib/guardian-outcome';

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

const TYPES: readonly string[] = RELATIONSHIPS;
const WAYS: readonly string[] = METHODS;

/**
 * A refusal: the reason by name, at the status that name is answered with.
 * The sentence is English and is for a log or a person reading the reply by
 * hand; the forms say the name in the reader's language and never print it.
 */
const refuse = (code: GuardianCode, error: string) =>
  NextResponse.json({ error, code }, { status: guardianStatusOf(code) });

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
 *
 * Every refusal names its reason (`code`), since 2026-11-25: the two forms are
 * written in the reader's language and say the refusal by that name. A
 * database error that is not the database's answer is `unconfirmed` at 502,
 * because the request may have been recorded.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not configured.', code: 'unavailable' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return refuse('signed_out', 'Sign in required.');
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.', code: 'refused' }, { status: 400 });
  }

  if (body.action === 'withdraw') {
    const relationshipId =
      typeof body.relationshipId === 'string' ? body.relationshipId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!relationshipId) {
      return NextResponse.json({ error: 'relationshipId is required.', code: 'refused' }, { status: 400 });
    }
    if (reason.length < REASON_MIN) {
      return refuse('reason_short', 'Say why you are withdrawing — the record keeps your reason.');
    }

    const result = await revokeGuardianConsent(supabase, { relationshipId, reason });
    if (!result.ok) return refuse(result.reason, result.message);
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
    return refuse('choose_child', 'learnerProfileId is required.');
  }
  if (!TYPES.includes(relationshipType)) {
    return refuse('relationship_invalid', `relationshipType must be one of: ${TYPES.join(', ')}.`);
  }
  if (!WAYS.includes(method)) {
    return refuse('method_invalid', `method must be one of: ${WAYS.join(', ')}.`);
  }
  if (statement.length < STATEMENT_MIN) {
    return refuse(
      'statement_short',
      'Write who this child is to you, in your own words — at least 20 characters. The reviewer reads it.',
    );
  }

  const result = await submitGuardianConsent(supabase, {
    learnerProfileId,
    relationshipType: relationshipType as RelationshipType,
    method: method as ConsentMethod,
    statement,
    evidenceReference: evidenceReference || null,
  });

  if (!result.ok) return refuse(result.reason, result.message);

  return NextResponse.json({
    ok: true,
    caseId: result.caseId,
    relationshipId: result.relationshipId,
  });
}
