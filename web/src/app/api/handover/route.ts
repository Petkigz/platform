import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { handoverReasonOf } from '@/lib/handover';

export const dynamic = 'force-dynamic';

/**
 * POST /api/handover — the eighteenth-birthday handover.
 *
 * Thin on purpose, like every route here: the permission, the declaration and the
 * two transitions live in `request_learner_handover()`. The request carries no
 * actor — the function reads the session — and no date, because a handover that
 * could be given a date could be given a birth date, and there is not going to be
 * one.
 *
 * Every refusal carries a `code` beside its `error`. The form is written in
 * the reader's language and says the refusal by that name
 * (`handoverCodeOf`); `error` stays for a log and for a person reading the
 * reply by hand, and is never shown.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'This deployment is not configured.', code: 'unavailable' }, { status: 503 });
  }

  let body: { learnerId?: unknown; decision?: unknown; declaresAdult?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.', code: 'refused' }, { status: 400 });
  }

  const learnerId = typeof body.learnerId === 'string' ? body.learnerId.trim() : '';
  const decision = typeof body.decision === 'string' ? body.decision : '';
  if (!/^[0-9a-f-]{36}$/i.test(learnerId)) {
    return NextResponse.json({ error: 'handover:not_found', code: 'refused' }, { status: 400 });
  }
  if (decision !== 'keep' && decision !== 'delete') {
    return NextResponse.json({ error: 'handover:decision_invalid', code: 'refused' }, { status: 400 });
  }
  if (body.declaresAdult !== true) {
    return NextResponse.json({ error: 'handover:declaration_required', code: 'declaration_required' }, { status: 422 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'handover:not_signed_in', code: 'refused' }, { status: 401 });

  const { data, error } = await supabase.rpc('request_learner_handover', {
    p_learner_id: learnerId,
    p_decision: decision,
    p_declares_adult: true,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message, code: handoverReasonOf(error.message) },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true, outcome: data });
}
