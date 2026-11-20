import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { sponsorshipRefusal } from '@/lib/sponsorship';
import {
  askSeatReasonOf,
  pledgeSeatReasonOf,
  seatStatusOf,
  type SeatReason,
} from '@/lib/sponsor-pool-outcome';

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
 *
 * **Asking for a seat and taking one name their refusals** (`reason`, with a
 * status of its own: `lib/sponsor-pool-outcome.ts`). The two pages that do
 * those are in the reader's language and say their own sentence for each;
 * `message` is still sent, in English, for a caller with no words of its
 * own, and is never the database's sentence. The three staff actions keep
 * the shape the staff desk reads.
 */
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** A named refusal of asking or taking. The English is this route's, never the database's. */
const SEAT_SENTENCES: Record<SeatReason, string> = {
  gone: 'That seat has just been taken, or is no longer open. Choose another.',
  own_seat: 'That is the seat you asked for. You cannot sponsor your own request.',
  no_price: 'This course has no price where you are, so this seat cannot be taken from here.',
  off: 'Sponsoring a seat is switched off at the moment.',
  too_long: 'That is longer than this box holds.',
  not_signed_in: 'Sign in first.',
  malformed: 'Malformed request.',
  failed: 'That did not work. Nothing was charged and nothing changed.',
  unconfirmed: 'We could not confirm whether that was recorded. Look at your sponsored seats before trying again.',
  reason_required: 'Write a sentence about the situation. It is what the person deciding reads.',
  choose: 'Choose who the course is for, and which course.',
  learner_not_yours: 'That learner is not on your account.',
  no_course: 'That course is not on sale at the moment.',
  has_course: 'That learner already has this course, so there is nothing to ask for.',
  already_asked: 'There is already an open request for this course.',
};
const refuseSeat = (reason: SeatReason) =>
  NextResponse.json(
    { ok: false, reason, code: reason, message: SEAT_SENTENCES[reason] },
    { status: seatStatusOf(reason), headers: NO_STORE },
  );

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
  const action = typeof body.action === 'string' ? body.action : '';
  const named = action === 'apply' || action === 'pledge';
  if (!user) {
    return named
      ? refuseSeat('not_signed_in')
      : NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }
  const str = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value : null;

  const fail = (message: string, status = 400) =>
    NextResponse.json({ ok: false, ...sponsorshipRefusal(message) }, { status });

  if (action === 'apply') {
    const learnerId = str(body.learnerProfileId);
    const courseId = str(body.courseId);
    const reason = str(body.reason);
    if (!learnerId || !courseId) return refuseSeat('choose');
    try {
      const { data, error } = await supabase.rpc('apply_for_sponsorship', {
        p_learner_profile_id: learnerId,
        p_course_id: courseId,
        p_reason: reason,
      });
      if (error) {
        const why = askSeatReasonOf(error);
        // Kept for whoever runs the site; never sent to the reader.
        if (why === 'failed') console.error('sponsorship: a request refused with no name:', error.message);
        return refuseSeat(why);
      }
      return NextResponse.json({ ok: true, ...(data as object) }, { headers: NO_STORE });
    } catch {
      // No answer at all: a request may have been recorded.
      return refuseSeat('unconfirmed');
    }
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
    if (!seatCode) return refuseSeat('malformed');
    try {
      const { data, error } = await supabase.rpc('pledge_sponsorship', {
        p_seat_code: seatCode,
        p_country: str(body.country),
        p_note: str(body.note),
      });
      if (error) {
        const why = pledgeSeatReasonOf(error);
        if (why === 'failed') console.error('sponsorship: a pledge refused with no name:', error.message);
        return refuseSeat(why);
      }
      return NextResponse.json({ ok: true, ...(data as object) }, { headers: NO_STORE });
    } catch {
      // No answer at all: the seat may have been taken in this account's name.
      return refuseSeat('unconfirmed');
    }
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
