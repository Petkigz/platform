import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { sponsorshipRefusal } from '@/lib/sponsorship';

/**
 * The five things anybody does about a sponsored seat, in one place.
 *
 * Every rule is the database's: who may ask, who may decide, what a seat costs,
 * what stops a pledge and when a payment may be recorded. This route chooses
 * the function and turns a refusal into a sentence.
 *
 * Deliberately no amount is ever accepted from the browser. A pledge is priced
 * by `pledge_sponsorship()` from the course and the sponsor's market, so a
 * tampered request cannot buy a seat for a penny — the same rule checkout
 * follows, for the same reason.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  const action = typeof body.action === 'string' ? body.action : '';
  const str = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value : null;

  const fail = (message: string, status = 400) =>
    NextResponse.json({ ok: false, ...sponsorshipRefusal(message) }, { status });

  if (action === 'apply') {
    const learnerId = str(body.learnerProfileId);
    const courseId = str(body.courseId);
    const reason = str(body.reason);
    if (!learnerId || !courseId) {
      return NextResponse.json(
        { ok: false, code: 'incomplete', message: 'Choose who the course is for, and which course.' },
        { status: 400 },
      );
    }
    const { data, error } = await supabase.rpc('apply_for_sponsorship', {
      p_learner_profile_id: learnerId,
      p_course_id: courseId,
      p_reason: reason,
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'decide') {
    const id = str(body.applicationId);
    if (!id || typeof body.approve !== 'boolean') {
      return NextResponse.json(
        { ok: false, message: 'Say which request, and whether it is approved.' },
        { status: 400 },
      );
    }
    const { data, error } = await supabase.rpc('decide_sponsorship_application', {
      p_application: id,
      p_approve: body.approve,
      p_reason: str(body.reason),
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'pledge') {
    const seatCode = str(body.seatCode);
    if (!seatCode) {
      return NextResponse.json({ ok: false, message: 'Choose a seat.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('pledge_sponsorship', {
      p_seat_code: seatCode,
      p_country: str(body.country),
      p_note: str(body.note),
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'withdraw') {
    const id = str(body.sponsorshipId);
    if (!id) {
      return NextResponse.json({ ok: false, message: 'That is not one of yours.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('withdraw_sponsorship', {
      p_sponsorship: id,
      p_reason: str(body.reason),
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'record') {
    const id = str(body.sponsorshipId);
    const reference = str(body.reference);
    if (!id) {
      return NextResponse.json({ ok: false, message: 'Say which sponsorship.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('record_sponsorship_payment', {
      p_sponsorship: id,
      p_reference: reference,
      p_evidence: str(body.evidence),
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  return NextResponse.json(
    { ok: false, message: 'That is not an action this page can take.' },
    { status: 400 },
  );
}
