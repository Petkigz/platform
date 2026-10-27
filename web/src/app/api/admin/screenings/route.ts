import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { describeScreeningError } from '@/lib/screening';

/**
 * Recording a screening check.
 *
 * The gate here is `platform_admin` or `governance_admin` rather than
 * `is_privileged`: a support agent handles refunds and cases and must not be able to
 * say an adult passed a background check. The database refuses them too — this route
 * exists so the refusal is a sentence before the round trip, not the only defence.
 *
 * The actor is never sent from the client. `record_teacher_screening()` reads it from
 * the session, so a tampered request can change who was checked but not who checked
 * them.
 */
function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Malformed request.');
  }
  if (typeof raw !== 'object' || raw === null) return fail('Malformed request.');
  const body = raw as Record<string, unknown>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  const [{ data: platform }, { data: governance }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platform !== true && governance !== true) {
    return fail('Only the owner or governance staff record a check.', 403);
  }

  if (body.action !== 'record') return fail('Unknown action.');
  if (typeof body.userId !== 'string' || body.userId.length === 0) {
    return fail('Choose a teacher.');
  }
  if (typeof body.screeningType !== 'string') return fail('Say what kind of check it was.');
  if (typeof body.evidenceReference !== 'string') {
    return fail('Say where the document is held.');
  }
  const outcome = body.outcome === 'failed' ? 'failed' : body.outcome === 'passed' ? 'passed' : null;
  if (outcome === null) return fail('Say whether the check passed or failed.');
  const validUntil = typeof body.validUntil === 'string' && body.validUntil.trim()
    ? body.validUntil.trim()
    : null;
  const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;

  const { data, error } = await supabase.rpc('record_teacher_screening', {
    p_user_id: body.userId,
    p_screening_type: body.screeningType,
    p_evidence_reference: body.evidenceReference,
    p_outcome: outcome,
    p_valid_until: validUntil,
    p_notes: notes,
  });

  if (error) return fail(describeScreeningError(error.message, error.hint));
  return NextResponse.json({ ok: true, screening: data });
}
