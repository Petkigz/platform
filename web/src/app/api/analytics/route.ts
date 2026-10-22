import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isAnalyticsEvent } from '@/lib/analytics';

/**
 * One event at a time, from a signed-in page.
 *
 * Every refusal that matters is the database's: whether the flag is on, whether
 * the code exists, whether the subject exists, whether the learner is yours. This
 * route only rejects a body that is not an event at all. It answers 202 because
 * "recorded" is not a promise the caller needs — a page should not wait on its own
 * instrumentation, and a dropped event is not a user-visible failure.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;
  if (!isAnalyticsEvent(body.code)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true, recorded: false, reason: 'signed_out' }, { status: 202 });

  const properties =
    typeof body.properties === 'object' && body.properties !== null && !Array.isArray(body.properties)
      ? (body.properties as Record<string, unknown>)
      : {};

  const { data, error } = await supabase.rpc('record_analytics_event', {
    p_code: body.code,
    p_subject_id: typeof body.subjectId === 'string' ? body.subjectId : null,
    p_learner_profile_id: typeof body.learnerProfileId === 'string' ? body.learnerProfileId : null,
    p_properties: properties,
  });

  if (error) {
    // A code, subject or learner the database refuses is a bug in a call site,
    // not a reason to break the page that sent it. The status is still 202 for
    // that reason; the body carries the sentence for anyone reading the network
    // tab.
    return NextResponse.json({ ok: false, message: error.message }, { status: 202 });
  }

  return NextResponse.json({ ok: true, result: data }, { status: 202 });
}
